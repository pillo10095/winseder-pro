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
import { QrService } from './qr.service';
import { QrEventsService } from './qr-events.service';

export interface BaileysSession {
  socket: WASocket;
  companyId: string;
  connectedAt?: Date;
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

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly authService: BaileysAuthService,
    private readonly reconnectService: BaileysReconnectService,
    private readonly qrService: QrService,
    private readonly qrEvents: QrEventsService,
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
          const { saveCreds } = await this.authService.getAuthState(sessionId);
          await saveCreds();
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
      },
    );
  }

  /**
   * Create a new Baileys socket for a session.
   * If already exists, it will be replaced (old one should be ended first).
   */
  async createSocket(sessionId: string, companyId: string): Promise<WASocket> {
    // End existing socket if any
    await this.endSocket(sessionId);

    const { state } = await this.authService.getAuthState(sessionId);
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

    this.sockets.set(sessionId, { socket: sock, companyId });
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
   * End a socket connection cleanly.
   */
  async endSocket(sessionId: string): Promise<void> {
    this.reconnectService.clearRetries(sessionId);
    this.manualDisconnect.add(sessionId);
    const entry = this.sockets.get(sessionId);
    if (entry?.socket) {
      try {
        entry.socket.end(undefined);
      } catch (err) {
        this.logger.warn(`Error ending socket for session ${sessionId}`, err);
      }
    }
    this.sockets.delete(sessionId);
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

  /**
   * Get the count of active sockets.
   */
  getActiveCount(): number {
    return this.sockets.size;
  }

  async onApplicationShutdown(): Promise<void> {
    this.reconnectService.onApplicationShutdown();
    await this.endAllSockets();
  }
}
