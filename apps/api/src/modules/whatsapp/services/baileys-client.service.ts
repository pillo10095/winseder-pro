import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeWASocket,
  WASocket,
} from '@whiskeysockets/baileys';
import NodeCache from '@cacheable/node-cache';

import { SessionStatus } from '../entities/session.entity';
import { SessionRepository } from '../repositories/session.repository';
import { BaileysAuthService } from './baileys-auth.service';
import { BaileysReconnectService } from './baileys-reconnect.service';
import { ContactSyncService } from './contact-sync.service';
import { QrEventsService } from './qr-events.service';
import { QrService } from './qr.service';

interface PendingLabelAssociation {
  chatId: string;
  labelName: string;
  action: 'add' | 'remove';
}

export interface BaileysSession {
  socket: WASocket;
  companyId: string;
  connectedAt?: Date;
  saveCreds: () => Promise<void>;
}

@Injectable()
export class BaileysClientService implements OnApplicationShutdown {
  private readonly logger = new Logger(BaileysClientService.name);

  /** Active Baileys sockets keyed by session ID */
  private readonly sockets = new Map<string, BaileysSession>();

  /** Sessions manually disconnected — prevents reconnect on clean socket end */
  private readonly manualDisconnect = new Set<string>();

  /** Shared message retry cache (prevents infinite retry loops across restarts) */
  private readonly msgRetryCache = new NodeCache();

  /** Buffer for contacts arriving via contacts.upsert during initial sync */
  private readonly contactSyncBuffers = new Map<string, { id: string; name?: string }[]>();

  /** Timers for delayed catch-up contact sync after connect */
  private readonly contactSyncTimers = new Map<string, NodeJS.Timeout>();

  // ── Label sync state ──────────────────────────────────────────────

  /** Label definition cache: sessionId → Map<labelId, labelName> */
  private readonly labelCache = new Map<string, Map<string, string>>();

  /** Pending label associations buffered during initial sync */
  private readonly pendingLabelAssociations = new Map<string, PendingLabelAssociation[]>();

  /** Timers for delayed label-association processing after connect */
  private readonly labelSyncTimers = new Map<string, NodeJS.Timeout>();

  /** Whether initial-sync label buffer has been flushed for a session */
  private readonly labelInitialSyncDone = new Set<string>();

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly authService: BaileysAuthService,
    private readonly reconnectService: BaileysReconnectService,
    private readonly qrService: QrService,
    private readonly qrEvents: QrEventsService,
    private readonly contactSyncService: ContactSyncService,
  ) {}

  /**
   * Register event handlers on a socket. Called after creation.
   */
  private registerHandlers(sessionId: string, sock: WASocket, companyId: string): void {
    sock.ev.process(
      async (events) => {
        // --- Connection state ---
        if (events['connection.update']) {
          const update = events['connection.update'];
          const { connection, lastDisconnect, qr } = update;

          this.logger.debug(
            `Connection update for ${sessionId}: connection=${connection}, hasQr=${!!qr}, hasError=${!!lastDisconnect?.error}`,
            lastDisconnect?.error?.message,
          );

          if (qr) {
            this.logger.log(`QR received for session ${sessionId}`);
            const qrDataUrl = await this.qrService.generateQrDataUrl(qr);
            this.qrEvents.emitQrGenerated(sessionId, companyId, qrDataUrl);
            await this.sessionRepository.update(sessionId, {
              status: SessionStatus.QR_CODE,
            });
          }

          if (connection === 'open') {
            this.logger.log(`Session ${sessionId} connected successfully`);
            this.reconnectService.onReconnectSuccess(sessionId);
            const entry = this.sockets.get(sessionId);
            if (entry) {
              entry.connectedAt = new Date();
            }
            await this.sessionRepository.update(sessionId, {
              status: SessionStatus.CONNECTED,
              phone_number: sock.user?.id?.split(':')[0] ?? null,
              last_seen: new Date(),
            });

            // Schedule catch-up contact + label sync once initial sync finishes
            this.scheduleInitialContactSync(sessionId, companyId);
            this.scheduleInitialLabelSync(sessionId, companyId);
          }

          if (connection === 'close') {
            // If manually disconnected, skip reconnect entirely
            if (this.manualDisconnect.has(sessionId)) {
              this.logger.log(`Session ${sessionId} manually disconnected — not reconnecting`);
              this.manualDisconnect.delete(sessionId);
              await this.sessionRepository.update(sessionId, {
                status: SessionStatus.DISCONNECTED,
                auth_state: null,
              });
              this.sockets.delete(sessionId);
              return;
            }

            const { shouldReconnect, reason } = this.reconnectService.evaluateDisconnect(
              sessionId,
              lastDisconnect,
            );

            this.logger.warn(`Session ${sessionId} closed: ${reason}`);

            if (shouldReconnect) {
              this.logger.log(`Reconnecting session ${sessionId}...`);
              await this.sessionRepository.update(sessionId, {
                status: SessionStatus.CONNECTING,
              });
              this.reconnectService.scheduleReconnect(sessionId, async () => {
                await this.createSocket(sessionId, companyId);
              });
            } else {
              this.logger.error(`Session ${sessionId} expired (won't reconnect): ${reason}`);
              await this.sessionRepository.update(sessionId, {
                status: SessionStatus.EXPIRED,
              });
              this.sockets.delete(sessionId);
            }
          }
        }

        // --- Credentials updated ---
        if (events['creds.update']) {
          const entry = this.sockets.get(sessionId);
          if (entry?.saveCreds) {
            await entry.saveCreds();
          } else {
            this.logger.warn(`No saveCreds found for session ${sessionId}, falling back`);
            const { saveCreds } = await this.authService.getAuthState(sessionId);
            await saveCreds();
          }
        }

        // --- WhatsApp label definitions (id → name) ---
        if (events['labels.edit']) {
          const label = events['labels.edit'];
          if (label && label.id && label.name) {
            let cache = this.labelCache.get(sessionId);
            if (!cache) {
              cache = new Map<string, string>();
              this.labelCache.set(sessionId, cache);
            }
            if (label.deleted) {
              cache.delete(label.id);
              this.logger.debug(`[${sessionId}] Label "${label.name}" deleted`);
            } else {
              cache.set(label.id, label.name);
              this.logger.debug(`[${sessionId}] Label cached: ${label.id} → "${label.name}"`);
            }
          }
        }

        // --- WhatsApp label→chat associations ---
        if (events['labels.association']) {
          const assoc = events['labels.association'];
          if (assoc && assoc.association && assoc.association.type === 'label_jid') {
            const chatId = assoc.association.chatId;
            const labelId = assoc.association.labelId;
            const cache = this.labelCache.get(sessionId);
            const labelName = cache?.get(labelId);

            if (!labelName) {
              this.logger.warn(`[${sessionId}] Unknown labelId ${labelId}, can't apply association`);
              return;
            }

            const pending: PendingLabelAssociation = {
              chatId,
              labelName,
              action: assoc.type === 'add' ? 'add' : 'remove',
            };

            if (this.labelInitialSyncDone.has(sessionId)) {
              // Post-sync — process immediately
              await this.processLabelAssociation(sessionId, companyId, pending);
            } else {
              // During initial sync — buffer for later processing
              const buf = this.pendingLabelAssociations.get(sessionId) || [];
              buf.push(pending);
              this.pendingLabelAssociations.set(sessionId, buf);
            }
          }
        }

        // --- New messages ---
        if (events['messages.upsert']) {
          const upsert = events['messages.upsert'];
          if (upsert.type === 'notify') {
            for (const msg of upsert.messages) {
              this.logger.debug(
                `Message ${msg.key.id} from ${msg.key.remoteJid}`,
              );
            }
          }
        }

        // --- Contact list from phone ---
        if (events['contacts.upsert']) {
          const contacts = events['contacts.upsert'];
          const individualContacts = contacts.filter(
            (c) => c.id && c.id.endsWith('@s.whatsapp.net'),
          );
          if (individualContacts.length > 0) {
            // Buffer for catch-up sync on connection
            const buf = this.contactSyncBuffers.get(sessionId) || [];
            this.contactSyncBuffers.set(sessionId, [...buf, ...individualContacts]);

            // Sync immediately so contacts appear in CRM as soon as they arrive
            await this.contactSyncService.syncContacts(
              sessionId,
              companyId,
              individualContacts,
            );
          }
        }
      },
    );
  }

  /**
   * Create a new Baileys socket for a session.
   * If already exists, it will be replaced (old one should be ended first).
   */
  async createSocket(sessionId: string, companyId: string): Promise<WASocket> {
    // Close existing socket if any (no manualDisconnect flag — this is internal)
    this.closeSocket(sessionId);

    const { state, saveCreds } = await this.authService.getAuthState(sessionId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        keys: makeCacheableSignalKeyStore(state.keys, this.logger as any),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      msgRetryCounterCache: this.msgRetryCache as any,
      generateHighQualityLinkPreview: false,
      printQRInTerminal: false,
      syncFullHistory: false,
    });

    this.sockets.set(sessionId, { socket: sock, companyId, saveCreds });
    this.registerHandlers(sessionId, sock, companyId);

    await this.sessionRepository.update(sessionId, {
      status: SessionStatus.CONNECTING,
    });

    return sock;
  }

  /**
   * Get an active socket for a session.
   */
  getSocket(sessionId: string): WASocket | undefined {
    return this.sockets.get(sessionId)?.socket;
  }

  /**
   * Check if a session has an active socket.
   */
  hasActiveSocket(sessionId: string): boolean {
    return this.sockets.has(sessionId);
  }

  /**
   * Schedule a catch-up contact sync after initial Baileys sync completes.
   * The initial app state sync emits contacts.upsert events (already handled
   * above), but this ensures we capture any stragglers and provides a
   * safety net. Contacts already synced immediately via contacts.upsert
   * will be skipped (existing check in ContactSyncService).
   */
  private scheduleInitialContactSync(sessionId: string, companyId: string): void {
    const existing = this.contactSyncTimers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
      this.contactSyncTimers.delete(sessionId);
      const buf = this.contactSyncBuffers.get(sessionId);
      this.contactSyncBuffers.delete(sessionId);

      if (buf && buf.length > 0) {
        const result = await this.contactSyncService.syncContacts(
          sessionId,
          companyId,
          buf,
        );
        this.logger.log(
          `[${sessionId}] Initial contact sync complete: ${result.created} created, ${result.skipped} already in CRM`,
        );
      } else {
        this.logger.warn(
          `[${sessionId}] No contacts received during initial sync — WhatsApp may not have synced contacts yet`,
        );
      }
    }, 6_000);

    this.contactSyncTimers.set(sessionId, timer);
  }

  /**
   * Schedule delayed label-association processing after initial sync.
   * Labels and associations arrive during the app-state sync that runs
   * shortly after connection opens. We give it a few seconds to settle,
   * then flush all buffered associations and mark initial sync as done.
   */
  private scheduleInitialLabelSync(sessionId: string, companyId: string): void {
    const existing = this.labelSyncTimers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
    }

    // Run slightly after contact sync so contacts exist when we apply labels
    const timer = setTimeout(async () => {
      this.labelSyncTimers.delete(sessionId);
      await this.flushLabelAssociations(sessionId, companyId);
      this.labelInitialSyncDone.add(sessionId);
    }, 10_000);

    this.labelSyncTimers.set(sessionId, timer);
  }

  /**
   * Flush all buffered label associations for a session.
   */
  private async flushLabelAssociations(
    sessionId: string,
    companyId: string,
  ): Promise<void> {
    const buf = this.pendingLabelAssociations.get(sessionId);
    this.pendingLabelAssociations.delete(sessionId);

    if (!buf || buf.length === 0) {
      this.logger.log(`[${sessionId}] No label associations to process`);
      return;
    }

    this.logger.log(
      `[${sessionId}] Processing ${buf.length} buffered label associations...`,
    );

    let applied = 0;
    for (const pending of buf) {
      try {
        await this.processLabelAssociation(sessionId, companyId, pending);
        applied++;
      } catch (err) {
        this.logger.error(
          `[${sessionId}] Failed to process label association for ${pending.chatId}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `[${sessionId}] Label sync complete: ${applied}/${buf.length} processed`,
    );
  }

  /**
   * Apply or remove a WhatsApp label on a CRM contact.
   * The contact is created on-the-fly if it doesn't exist yet.
   */
  private async processLabelAssociation(
    sessionId: string,
    companyId: string,
    pending: PendingLabelAssociation,
  ): Promise<void> {
    const { chatId, labelName, action } = pending;

    if (action === 'add') {
      await this.contactSyncService.applyLabel(companyId, chatId, labelName);
    } else {
      await this.contactSyncService.removeLabel(companyId, chatId, labelName);
    }
  }

  /**
   * Clean up contact sync buffers and timers for a session.
   */
  private cleanupContactSync(sessionId: string): void {
    const timer = this.contactSyncTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.contactSyncTimers.delete(sessionId);
    }
    this.contactSyncBuffers.delete(sessionId);
  }

  /**
   * Clean up label sync state for a session.
   */
  private cleanupLabelSync(sessionId: string): void {
    const timer = this.labelSyncTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.labelSyncTimers.delete(sessionId);
    }
    this.labelCache.delete(sessionId);
    this.pendingLabelAssociations.delete(sessionId);
    this.labelInitialSyncDone.delete(sessionId);
  }

  /**
   * Close the underlying socket without marking as manual disconnect.
   * Used internally when recreating sockets (e.g. restoreSessions).
   */
  private closeSocket(sessionId: string): void {
    this.reconnectService.clearRetries(sessionId);
    this.cleanupContactSync(sessionId);
    this.cleanupLabelSync(sessionId);
    const entry = this.sockets.get(sessionId);
    if (entry?.socket) {
      try {
        entry.socket.end(undefined);
      } catch (err) {
        this.logger.warn(`Error closing socket for session ${sessionId}`, err);
      }
    }
    this.sockets.delete(sessionId);
  }

  /**
   * End a socket connection cleanly (user-initiated disconnect).
   * Marks the session as manual disconnect so auto-reconnect is skipped.
   */
  async endSocket(sessionId: string): Promise<void> {
    this.manualDisconnect.add(sessionId);
    this.closeSocket(sessionId);
  }

  /**
   * End all active sockets (called on application shutdown).
   */
  async endAllSockets(): Promise<void> {
    const ids = Array.from(this.sockets.keys());
    for (const id of ids) {
      await this.endSocket(id);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.reconnectService.onApplicationShutdown();
    await this.endAllSockets();
  }
}
