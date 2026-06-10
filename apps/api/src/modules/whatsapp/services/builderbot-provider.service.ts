import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { SessionStatus } from '../entities/session.entity';
import { SessionRepository } from '../repositories/session.repository';
import { BaileysAuthService } from './baileys-auth.service';
import { ContactSyncService } from './contact-sync.service';
import { ConversationRepository } from '../repositories/conversation.repository';
import { QrEventsService } from './qr-events.service';
import { QrService } from './qr.service';
import { MessageHandlerService } from './message-handler.service';
import { extractAndCacheLidFromMessage } from '@builderbot/provider-baileys';
import { CustomBaileysProvider } from './custom-baileys-provider';
import { ContactRepository } from '../../crm/repositories/contact.repository';
import { LabelRepository } from '../../crm/repositories/label.repository';
import { In } from 'typeorm';

/** Baileys WASocket internal properties not in the public type. */
interface InternalSock {
  resyncAppState?(collections: readonly string[], isInitialSync: boolean): Promise<void>;
  authState?: { keys?: { set?(data: Record<string, unknown>): Promise<void> } };
  ev?: { flush?(): void };
}

const toInternal = (sock: unknown): InternalSock => sock as InternalSock;

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

  /**
   * Accumulator of ALL JIDs that have at least one WhatsApp label,
   * mapped to the label names they carry.
   * Populated from labels.association events.
   * sessionId → Map<chatId, Set<labelName>>
   *
   * Used in extractContacts to find labeled contacts and to sync
   * WhatsApp labels into the CRM label system.
   */
  private readonly labelContacts = new Map<string, Map<string, Set<string>>>();

  constructor(
    private readonly authService: BaileysAuthService,
    private readonly sessionRepo: SessionRepository,
    private readonly qrService: QrService,
    private readonly qrEvents: QrEventsService,
    private readonly messageHandler: MessageHandlerService,
    private readonly contactSyncService: ContactSyncService,
    private readonly conversationRepo: ConversationRepository,
    private readonly contactRepo: ContactRepository,
    private readonly labelRepo: LabelRepository,
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
    provider.events.on('require_action', async (data: { payload?: { qr?: string; code?: string } }) => {
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

    // Register raw events BEFORE init so they catch the initial app-state sync
    provider.setOnVendorReady((sock) => {
      this.registerRawEvents(sessionId, companyId, provider, sock);
    });

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

    await this.sessionRepo.update(sessionId, { status: SessionStatus.CONNECTING });
  }

  /**
   * Register Baileys event handlers that are NOT covered by CustomBaileysProvider's
   * built-in event emitter (contacts, labels, messages).
   * Accepts an optional socket; falls back to provider.ev.
   */
  private registerRawEvents(
    sessionId: string,
    companyId: string,
    provider: CustomBaileysProvider,
    sock?: import('@whiskeysockets/baileys').WASocket,
  ): void {
    const sockEv = sock?.ev ?? provider.ev;
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

        // Extract LID→PN mapping from each incoming message and cache it
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @builderbot/provider-baileys type mismatch
          await extractAndCacheLidFromMessage(provider.lidCache, msg as any);
        } catch {
          // Silently ignore — LID caching is best-effort
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

      // Always maintain the labelContacts accumulator regardless of sync state
      // or whether the labelName is known yet (associations can arrive before labels.edit).
      let labeled = this.labelContacts.get(sessionId);
      if (!labeled) {
        labeled = new Map();
        this.labelContacts.set(sessionId, labeled);
      }
      if (assoc.type === 'add') {
        if (labelName) {
          const labels = labeled.get(chatId) ?? new Set();
          labels.add(labelName);
          labeled.set(chatId, labels);
        }
        // Ensure at least the JID is tracked even if labelName is unknown yet
        if (!labeled.has(chatId)) {
          labeled.set(chatId, new Set());
        }
      } else {
        // Remove: either remove the specific label, or the whole entry if last label
        if (labelName && labeled.has(chatId)) {
          const labels = labeled.get(chatId)!;
          labels.delete(labelName);
          if (labels.size === 0) labeled.delete(chatId);
        }
      }

      // If we don't have the label name yet we can't process the association further,
      // but we already recorded the JID above — that's the key fix.
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
    this.labelContacts.delete(sessionId);

    const entry = this.sessions.get(sessionId);
    if (entry) {
      entry.provider.lidCache.close?.();
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

  // ── Message sending ─────────────────────────────────────────────────

  /**
   * Send a text message through a session, resolving @lid JIDs automatically.
   */
  async sendMessage(sessionId: string, jid: string, content: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error(`Session ${sessionId} not found`);
    await entry.provider.sendMessage(jid, content);
  }

  // ── Contact extraction ───────────────────────────────────────────────

  /**
   * Actively query WhatsApp's label associations via Baileys app-state re-sync.
   * Falls back to the in-memory labelContacts accumulator if re-sync is not
   * possible (e.g. socket not available).
   *
   * This populates `labelContacts` even for sessions that were already connected
   * before the labelContacts accumulator was introduced, because label events
   * only fire during the initial app-state sync.
   */
  private async syncLabelAssociations(sessionId: string, _companyId: string): Promise<void> {
    // Already have data — no need to re-sync
    const current = this.labelContacts.get(sessionId);
    if (current && current.size > 0) {
      this.logger.log(`[${sessionId}] syncLabelAssociations: already have ${current.size} labeled JIDs, skipping re-sync`);
      return;
    }

    const sock = this.getSocket(sessionId);
    if (!sock) {
      this.logger.warn(`[${sessionId}] syncLabelAssociations: no socket available`);
      return;
    }

    const resyncFn = toInternal(sock).resyncAppState;

    if (!resyncFn) {
      this.logger.warn(`[${sessionId}] resyncAppState not available on socket`);
      return;
    }

    this.logger.log(`[${sessionId}] Syncing label associations via regular-collection re-sync...`);
    try {
      // Labels (label_edit, addChatLabel, etc.) are in the "regular" collection
      // per chat-utils.js:590. Like phonebook contacts, after the initial sync
      // the version is current and resync produces no events.
      // Reset version to 0 to force a full snapshot from WhatsApp.
      const keys = toInternal(sock).authState?.keys;
      if (keys?.set) {
        await keys.set({
          'app-state-sync-version': {
            regular: { version: 0, hash: Buffer.alloc(128), indexValueMap: {} },
          },
        });
      }

      this.logger.log(`[${sessionId}] Calling resyncAppState(['regular'], true)...`);
      await resyncFn(['regular'], true);
      this.logger.log(`[${sessionId}] resyncAppState completed without throw`);

      const labelMap = this.labelContacts.get(sessionId);
      const count = labelMap?.size ?? 0;
      this.logger.log(`[${sessionId}] Regular re-sync done, ${count} labeled JIDs in accumulator`);
    } catch (err) {
      this.logger.error(`[${sessionId}] Failed to re-sync label associations`, err);
    }
  }

  /**
   * Force a re-sync of phonebook contacts from the critical_unblock_low collection.
   *
   * Contacts (contactAction mutations) are stored in the "critical_unblock_low"
   * app-state collection per chat-utils.js:500-509. After server restart, the
   * app-state version is already current, so contacts.upsert events don't fire
   * again. This method resets the version to 0 and re-syncs, forcing WhatsApp
   * to re-deliver the ENTIRE phonebook via contacts.upsert events.
   *
   * contacts.upsert IS in BUFFERABLE_EVENT, so during resyncAppState the events
   * are buffered. We call ev.flush() after the resync to process them immediately.
   */
  private async syncPhonebookContacts(sessionId: string): Promise<void> {
    const sock = this.getSocket(sessionId);
    if (!sock) {
      this.logger.warn(`[${sessionId}] syncPhonebookContacts: no socket`);
      return;
    }

    const resyncFn = toInternal(sock).resyncAppState;
    if (!resyncFn) {
      this.logger.warn(`[${sessionId}] syncPhonebookContacts: resyncAppState not available`);
      return;
    }

    // Check if critical_unblock_low already has contacts in labelContacts or knownContacts
    // If knownContacts already has entries, we might skip — but always sync to be safe.
    this.logger.log(`[${sessionId}] Syncing phonebook contacts via critical_unblock_low re-sync...`);

    try {
      // Force a full snapshot by resetting the stored version.
      // With version=0, resyncAppState requests return_snapshot=true from WhatsApp,
      // which re-delivers ALL contactAction mutations — including the full phonebook.
      const keys = toInternal(sock).authState?.keys;
      if (keys?.set) {
        await keys.set({
          'app-state-sync-version': {
            critical_unblock_low: { version: 0, hash: Buffer.alloc(128), indexValueMap: {} },
          },
        });
      }

      // Call resync — with version=0, requests a full snapshot
      await resyncFn(['critical_unblock_low'], true);

      // contacts.upsert is BUFFERABLE, so events were buffered. Flush now.
      const ev = toInternal(sock).ev;
      if (ev?.flush) {
        ev.flush();
      }

      const known = this.knownContacts.get(sessionId) ?? [];
      this.logger.log(`[${sessionId}] Phonebook sync done, ${known.length} contacts in knownContacts`);
    } catch (err) {
      this.logger.error(`[${sessionId}] Failed to sync phonebook contacts`, err);
    }
  }

  /**
   * Manually extract ALL known WhatsApp contacts and sync them to CRM.
   *
   * Collects from EVERY available source (in-memory, conversations, labels)
   * and UNIONS them — no more fallback chains that stop at the first hit.
   */
  async extractContacts(sessionId: string, companyId: string): Promise<{ created: number; skipped: number }> {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      this.logger.warn(`[${sessionId}] extractContacts: session not found in memory`);
      return { created: 0, skipped: 0 };
    }

    // Ensure labelContacts is populated by querying WhatsApp if needed
    await this.syncLabelAssociations(sessionId, companyId);

    // Force a re-sync of phonebook contacts (critical_unblock_low collection)
    // After server restart, no contacts.upsert events fire because the version
    // is already current — so knownContacts stays empty.
    // This forces WhatsApp to re-deliver ALL contactAction mutations.
    await this.syncPhonebookContacts(sessionId);

    // Collect JIDs from ALL available sources — UNION, not fallback
    const allJids = new Set<string>();

    // 1. In-memory known contacts (phonebook + chats captured via events)
    //    After syncPhonebookContacts above, this should contain ALL phonebook contacts.
    const known = this.knownContacts.get(sessionId) ?? this.contactSyncBuffers.get(sessionId) ?? [];
    for (const c of known) {
      if (c.id && isIndividualJid(c.id)) allJids.add(c.id);
    }
    this.logger.log(`[${sessionId}] Source 1 (knownContacts): ${known.length} entries, ${allJids.size} valid JIDs`);

    // 2. Contacts with active conversations in the DB
    const [conversations] = await this.conversationRepo.findBySessionId(sessionId, undefined, 9999);
    const convBefore = allJids.size;
    for (const c of conversations) {
      if (c.contact_jid && isIndividualJid(c.contact_jid)) allJids.add(c.contact_jid);
    }
    const convAdded = allJids.size - convBefore;
    const sampleJid = conversations.length > 0 ? conversations[0].contact_jid : '(no conversations)';
    this.logger.log(`[${sessionId}] Source 2 (conversations): ${conversations.length} total, ${convAdded} new JIDs. Sample JID: ${sampleJid}`);

    // 3. Labeled contacts (accumulated from labels.association events)
    const labeled = this.labelContacts.get(sessionId);
    const labelBefore = allJids.size;
    if (labeled) {
      for (const jid of labeled.keys()) {
        if (isIndividualJid(jid)) allJids.add(jid);
      }
    }
    const labelAdded = allJids.size - labelBefore;
    const labelCount = labeled?.size ?? -1;
    this.logger.log(`[${sessionId}] Source 3 (labelContacts): ${labelCount} entries, ${labelAdded} new JIDs`);

    if (allJids.size === 0) {
      this.logger.warn(`[${sessionId}] No known contacts to extract. Known=${known.length}, Conversations=${conversations.length}, Labels=${labelCount}`);
      return { created: 0, skipped: 0 };
    }

    this.logger.log(`[${sessionId}] Extracting ${allJids.size} unique JIDs (union of known + conversations + labels)`);

    const contacts = [...allJids].map((id) => ({ id }));
    const result = await this.contactSyncService.syncByWaIds(sessionId, companyId, contacts);

    // After importing contacts, sync WhatsApp labels → CRM labels
    await this.syncWhatsAppLabelsToCRM(sessionId, companyId);

    return result;
  }

  /**
   * Sync WhatsApp labels → CRM labels.
   *
   * For each JID in labelContacts, creates CRM labels for any WhatsApp
   * label names that don't exist yet, and associates the contact with
   * those labels via the contact_labels junction table.
   *
   * This is called from extractContacts after syncByWaIds so that newly
   * created contacts also get their WhatsApp labels in the CRM label system
   * and appear on the /crm/labels page.
   */
  private async syncWhatsAppLabelsToCRM(sessionId: string, companyId: string): Promise<void> {
    const labeled = this.labelContacts.get(sessionId);
    if (!labeled || labeled.size === 0) return;

    this.logger.log(`[${sessionId}] Syncing ${labeled.size} labeled contacts to CRM labels...`);

    // 1. Collect all unique label names across all labeled JIDs
    const allLabelNames = new Set<string>();
    for (const labels of labeled.values()) {
      for (const name of labels) allLabelNames.add(name);
    }
    if (allLabelNames.size === 0) return;

    // 2. Get existing CRM labels for this company
    const existingLabels = await this.labelRepo.find({
      where: { company_id: companyId, name: In([...allLabelNames]) },
    });
    const existingByName = new Map(existingLabels.map((l) => [l.name, l]));

    // 3. Create CRM labels for any that don't exist yet
    const toCreate = [...allLabelNames]
      .filter((name) => !existingByName.has(name))
      .map((name) =>
        this.labelRepo.create({ company_id: companyId, name }),
      );
    const createdLabels = toCreate.length > 0 ? await this.labelRepo.save(toCreate) : [];

    // 4. Build a full map of labelName → Label entity
    const allLabels = new Map<string, typeof existingLabels[0]>();
    for (const l of existingLabels) allLabels.set(l.name, l);
    for (const l of createdLabels) allLabels.set(l.name, l);

    // 5. For each labeled JID, find the CRM contact and associate the labels
    for (const [jid, labelNames] of labeled) {
      if (labelNames.size === 0) continue;

      const contact = await this.contactRepo.findOne({
        where: [
          { wa_id: jid, company_id: companyId },
          { phone: jid.split('@')[0], company_id: companyId },
        ],
        relations: ['labels'],
      });
      if (!contact) continue;

      const existingLabelIds = new Set(contact.labels?.map((l) => l.id) ?? []);
      const newLabels = [...labelNames]
        .map((name) => allLabels.get(name))
        .filter((l): l is NonNullable<typeof l> => !!l && !existingLabelIds.has(l.id));

      if (newLabels.length > 0) {
        contact.labels = [...(contact.labels ?? []), ...newLabels];
        await this.contactRepo.save(contact);
      }
    }

    this.logger.log(`[${sessionId}] Synced ${allLabelNames.size} WhatsApp labels to CRM (${createdLabels.length} new)`);
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
