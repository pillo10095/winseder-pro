import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { SessionStatus } from '../entities/session.entity';
import { SessionRepository } from '../repositories/session.repository';
import { BaileysAuthService } from './baileys-auth.service';
import { ContactSyncService } from './contact-sync.service';
import { ConversationRepository } from '../repositories/conversation.repository';
import { QrEventsService, QrGeneratedEvent } from './qr-events.service';
import { QrService } from './qr.service';
import { MessageHandlerService } from './message-handler.service';
import { CustomBaileysProvider } from './custom-baileys-provider';

/** Check if a JID belongs to an individual contact (not a group or broadcast) */
const isIndividualJid = (jid?: string | null): boolean =>
  !!jid && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid'));

export interface ConnectedSession {
  sessionId: string;
  companyId: string;
}

/**
 * NestJS wrapper around CustomBaileysProvider.
 *
 * Manages multiple WhatsApp sessions, each backed by its own
 * CustomBaileysProvider instance with database-backed auth.
 *
 * Events handled:
 *  - require_action  → QR / pairing code generation
 *  - ready           → session status update + contact sync scheduling
 *  - auth_failure    → session expiry
 *
 * Raw Baileys events registered directly on vendor.ev:
 *  - creds.update    → auth persistence
 *  - messages.upsert → message handling
 *  - contacts.upsert → CRM contact sync
 *  - labels.edit     → label cache
 *  - labels.association → label apply/remove
 *  - chats.upsert    → contact discovery from chats
 */
interface SessionEntry {
  provider: CustomBaileysProvider;
  companyId: string;
}

@Injectable()
export class BuilderbotProviderService implements OnApplicationShutdown {
  private readonly logger = new Logger(BuilderbotProviderService.name);

  /** Active provider sessions keyed by session ID */
  private readonly sessions = new Map<string, SessionEntry>();

  /** Sessions manually disconnected — prevents reconnect attempts */
  private readonly manualDisconnect = new Set<string>();

  /** Buffer for contacts arriving via contacts.upsert during initial sync */
  private readonly contactSyncBuffers = new Map<string, { id: string; name?: string }[]>();

  /** Persistent store of all known WhatsApp contacts for manual re-sync */
  private readonly knownContacts = new Map<string, { id: string; name?: string }[]>();

  /** Contact sync timers */
  private readonly contactSyncTimers = new Map<string, NodeJS.Timeout>();

  /** Label definition cache: sessionId → Map<labelId, labelName> */
  private readonly labelCache = new Map<string, Map<string, string>>();

  /** Pending label associations buffered during initial sync */
  private readonly pendingLabelAssociations = new Map<
    string,
    { chatId: string; labelName: string; action: 'add' | 'remove' }[]
  >();

  /** Timers for delayed label-association processing */
  private readonly labelSyncTimers = new Map<string, NodeJS.Timeout>();

  /** Whether initial-sync label buffer has been flushed for a session */
  private readonly labelInitialSyncDone = new Set<string>();

  constructor(
    private readonly authService: BaileysAuthService,
    private readonly sessionRepo: SessionRepository,
    private readonly qrService: QrService,
    private readonly qrEvents: QrEventsService,
    private readonly messageHandler: MessageHandlerService,
    private readonly contactSyncService: ContactSyncService,
    private readonly conversationRepo: ConversationRepository,
  ) {}

  // ── Session management ───────────────────────────────────────────────

  /**
   * Initialise a new WhatsApp session.
   */
  async createSession(sessionId: string, companyId: string): Promise<void> {
    this.closeSession(sessionId);

    const provider = new CustomBaileysProvider(
      () => this.authService.getAuthState(sessionId),
      sessionId,
    );

    // --- High-level events from CustomBaileysProvider ---
    provider.events.on('require_action', async (data: any) => {
      if (data.payload?.qr) {
        this.logger.log(`QR received for session ${sessionId}`);
        const qrDataUrl = await this.qrService.generateQrDataUrl(data.payload.qr);
        this.qrEvents.emitQrGenerated(sessionId, companyId, qrDataUrl);
        await this.sessionRepo.update(sessionId, { status: SessionStatus.QR_CODE });
      }
      if (data.payload?.code) {
        this.logger.log(`Pairing code received for session ${sessionId}`);
        // Pairing code is handled differently — for now just log
        await this.sessionRepo.update(sessionId, { status: SessionStatus.QR_CODE });
      }
    });

    provider.events.on('ready', async () => {
      this.logger.log(`Session ${sessionId} connected`);
      this.manualDisconnect.delete(sessionId);
      const phone = provider.vendor?.user?.id?.split(':')[0] ?? null;
      await this.sessionRepo.update(sessionId, {
        status: SessionStatus.CONNECTED,
        phone_number: phone,
        last_seen: new Date(),
      });
      this.scheduleInitialContactSync(sessionId, companyId);
      this.scheduleInitialLabelSync(sessionId, companyId);
    });

    provider.events.on('auth_failure', async (args: string[]) => {
      const reason = args?.[0] || 'Unknown';
      this.logger.warn(`Session ${sessionId} auth failure: ${reason}`);

      if (!this.manualDisconnect.has(sessionId)) {
        await this.sessionRepo.update(sessionId, { status: SessionStatus.EXPIRED });
      }
      this.closeSession(sessionId);
    });

    // Store before init so events can be wired
    this.sessions.set(sessionId, { provider, companyId });

    // --- Raw Baileys events (not covered by provider's event emitter) ---
    const sock = provider.vendor;

    // creds.update handled inside CustomBaileysProvider.init()

    // Wait for vendor to be ready (init() is async)
    await provider.init();

    if (!provider.vendor) {
      this.logger.error(`Session ${sessionId} failed to initialise vendor`);
      this.sessions.delete(sessionId);
      await this.sessionRepo.update(sessionId, { status: SessionStatus.EXPIRED });
      return;
    }

    // Re-set now that provider is fully initialised
    this.sessions.set(sessionId, { provider, companyId });

    // Register raw events AFTER init so vendor is available
    this.registerRawEvents(sessionId, companyId, provider);

    await this.sessionRepo.update(sessionId, { status: SessionStatus.CONNECTING });
  }

  /**
   * Register Baileys event handlers that are NOT covered by CustomBaileysProvider's
   * built-in event emitter (contacts, labels, messages).
   */
  private registerRawEvents(sessionId: string, companyId: string, provider: CustomBaileysProvider): void {
    const sockEv = provider.ev;
    if (!sockEv) return;

    // --- Messages → MessageHandlerService ---
    sockEv.on('messages.upsert', async ({ messages }) => {
      // Cache messages for getMessage (used to resolve "this message can take a while")
      for (const msg of messages) {
        if (msg.key?.id && msg.message) {
          provider.messageCache.set(`msg:${msg.key.id}`, msg.message);
        }
      }

      // Extract contacts from message senders
      for (const msg of messages) {
        const jid = msg.key.remoteJid;
        if (jid && isIndividualJid(jid)) {
          const known = this.knownContacts.get(sessionId) || [];
          if (!known.some((c) => c.id === jid)) {
            known.push({ id: jid });
            this.knownContacts.set(sessionId, known);
          }
        }
      }

      // Delegate to MessageHandlerService for processing
      for (const msg of messages) {
        try {
          await this.messageHandler.processMessage(msg, sessionId, companyId);
        } catch (err) {
          this.logger.error(`[${sessionId}] Error handling message`, err);
        }
      }
    });

    // --- Contact list from phonebook ---
    sockEv.on('contacts.upsert', async (contacts) => {
      const individual = contacts.filter((c) => isIndividualJid(c.id));
      if (individual.length === 0) return;

      const buf = this.contactSyncBuffers.get(sessionId) || [];
      this.contactSyncBuffers.set(sessionId, [...buf, ...individual]);

      const known = this.knownContacts.get(sessionId) || [];
      this.knownContacts.set(sessionId, [...known, ...individual]);

      await this.contactSyncService.syncContacts(sessionId, companyId, individual);
    });

    // --- Contact discovery from chats ---
    sockEv.on('chats.upsert', async (chats) => {
      const individual = chats.filter((c) => isIndividualJid(c.id) && !c.id?.endsWith('@g.us'));
      if (individual.length === 0) return;

      const chatContacts = individual.map((c) => ({ id: c.id!, name: c.name || undefined }));
      const known = this.knownContacts.get(sessionId) || [];
      const existingIds = new Set(known.map((k) => k.id));
      const newContacts = chatContacts.filter((c) => !existingIds.has(c.id));

      if (newContacts.length > 0) {
        this.knownContacts.set(sessionId, [...known, ...newContacts]);
        await this.contactSyncService.syncContacts(sessionId, companyId, newContacts);
      }
    });

    // --- Label definitions ---
    sockEv.on('labels.edit', async (label) => {
      if (label?.id && label?.name) {
        let cache = this.labelCache.get(sessionId);
        if (!cache) {
          cache = new Map();
          this.labelCache.set(sessionId, cache);
        }
        if (label.deleted) {
          cache.delete(label.id);
        } else {
          cache.set(label.id, label.name);
        }
      }
    });

    // --- Label→chat associations ---
    sockEv.on('labels.association', async (assoc) => {
      if (!assoc?.association || assoc.association.type !== 'label_jid') return;

      const chatId = assoc.association.chatId;
      const labelId = assoc.association.labelId;
      const cache = this.labelCache.get(sessionId);
      const labelName = cache?.get(labelId);

      if (!labelName) return;

      const pending = { chatId, labelName, action: assoc.type === 'add' ? 'add' as const : 'remove' as const };

      if (this.labelInitialSyncDone.has(sessionId)) {
        await this.processLabelAssociation(companyId, pending);
      } else {
        const buf = this.pendingLabelAssociations.get(sessionId) || [];
        buf.push(pending);
        this.pendingLabelAssociations.set(sessionId, buf);
      }
    });
  }

  /**
   * Gracefully end a session (user-initiated disconnect).
   */
  async endSession(sessionId: string): Promise<void> {
    this.manualDisconnect.add(sessionId);
    this.closeSession(sessionId);
  }

  /**
   * Close session resources without marking as manual disconnect.
   */
  private closeSession(sessionId: string): void {
    this.cleanupSyncState(sessionId);
    this.knownContacts.delete(sessionId);

    const entry = this.sessions.get(sessionId);
    if (entry) {
      entry.provider.dispose().catch((err) => this.logger.warn(`Error disposing provider ${sessionId}`, err));
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get the underlying Baileys socket for a session.
   */
  getSocket(sessionId: string): import('@whiskeysockets/baileys').WASocket | undefined {
    return this.sessions.get(sessionId)?.provider.vendor ?? undefined;
  }

  /**
   * Check if a session has an active socket.
   */
  hasActiveSocket(sessionId: string): boolean {
    const entry = this.sessions.get(sessionId);
    return !!entry && entry.provider.vendor !== null;
  }

  /**
   * Get all connected sessions.
   */
  getConnectedSessions(): ConnectedSession[] {
    return Array.from(this.sessions.entries()).map(([sessionId, entry]) => ({
      sessionId,
      companyId: entry.companyId,
    }));
  }

  // ── Contact extraction ───────────────────────────────────────────────

  /**
   * Manually extract all known WhatsApp contacts and sync them to CRM.
   */
  async extractContacts(sessionId: string, companyId: string): Promise<{ created: number; skipped: number }> {
    const entry = this.sessions.get(sessionId);
    if (!entry) return { created: 0, skipped: 0 };
    const provider = entry.provider;

    // Try in-memory first
    let contacts = this.knownContacts.get(sessionId) ?? this.contactSyncBuffers.get(sessionId) ?? [];

    // Fallback: query DB for contacts already synced
    if (contacts.length === 0) {
      const dbContacts = await this.contactSyncService.getExistingWaContacts(companyId);
      if (dbContacts.length > 0) {
        contacts = dbContacts;
      }
    }

    // Fallback: query conversations
    if (contacts.length === 0) {
      const [conversations] = await this.conversationRepo.findBySessionId(sessionId, undefined, 9999);
      const jids = conversations
        .map((c) => c.contact_jid)
        .filter((jid) => jid && isIndividualJid(jid))
        .map((jid) => ({ id: jid! }));
      if (jids.length > 0) {
        contacts = jids;
      }
    }

    if (contacts.length === 0) {
      this.logger.warn(`[${sessionId}] No known contacts to extract`);
      return { created: 0, skipped: 0 };
    }

    return this.contactSyncService.syncByWaIds(sessionId, companyId, contacts);
  }

  // ── Label processing ─────────────────────────────────────────────────

  private async processLabelAssociation(
    companyId: string,
    pending: { chatId: string; labelName: string; action: 'add' | 'remove' },
  ): Promise<void> {
    if (pending.action === 'add') {
      await this.contactSyncService.applyLabel(companyId, pending.chatId, pending.labelName);
    } else {
      await this.contactSyncService.removeLabel(companyId, pending.chatId, pending.labelName);
    }
  }

  // ── Sync scheduling ──────────────────────────────────────────────────

  private scheduleInitialContactSync(sessionId: string, companyId: string): void {
    const existing = this.contactSyncTimers.get(sessionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.contactSyncTimers.delete(sessionId);
      const buf = this.contactSyncBuffers.get(sessionId);
      this.contactSyncBuffers.delete(sessionId);
      if (buf && buf.length > 0) {
        const result = await this.contactSyncService.syncContacts(sessionId, companyId, buf);
        this.logger.log(`[${sessionId}] Initial contact sync: ${result.created} created, ${result.skipped} skipped`);
      }
    }, 6_000);
    this.contactSyncTimers.set(sessionId, timer);
  }

  private scheduleInitialLabelSync(sessionId: string, companyId: string): void {
    const existing = this.labelSyncTimers.get(sessionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.labelSyncTimers.delete(sessionId);
      const buf = this.pendingLabelAssociations.get(sessionId);
      this.pendingLabelAssociations.delete(sessionId);
      this.labelInitialSyncDone.add(sessionId);
      if (buf && buf.length > 0) {
        for (const p of buf) {
          await this.processLabelAssociation(companyId, p);
        }
      }
    }, 10_000);
    this.labelSyncTimers.set(sessionId, timer);
  }

  private cleanupSyncState(sessionId: string): void {
    const ct = this.contactSyncTimers.get(sessionId);
    if (ct) clearTimeout(ct);
    this.contactSyncTimers.delete(sessionId);
    this.contactSyncBuffers.delete(sessionId);

    const lt = this.labelSyncTimers.get(sessionId);
    if (lt) clearTimeout(lt);
    this.labelSyncTimers.delete(sessionId);
    this.labelCache.delete(sessionId);
    this.pendingLabelAssociations.delete(sessionId);
    this.labelInitialSyncDone.delete(sessionId);
  }

  // ── Shutdown ─────────────────────────────────────────────────────────

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Shutting down all WhatsApp provider sessions...');
    const ids = Array.from(this.sessions.keys());
    for (const id of ids) {
      this.manualDisconnect.add(id);
      this.closeSession(id);
    }
  }
}
