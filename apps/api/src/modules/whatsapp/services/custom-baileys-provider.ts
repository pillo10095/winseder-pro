import { Logger } from '@nestjs/common';
import {
  AuthenticationState,
  BaileysEventEmitter,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  makeWASocket,
  WASocket,
  isJidGroup,
  isJidBroadcast,
  proto,
} from '@whiskeysockets/baileys';
import {
  MemoryLidCache,
  LidCache,
} from '@builderbot/provider-baileys';
import NodeCache from 'node-cache';
import type { Boom } from '@hapi/boom';
import { EventEmitter } from 'node:events';

/**
 * Shape of the 'message' event emitted by BaileysProvider's busEvents.
 */
export interface ProviderMessagePayload {
  from: string;
  body?: string;
  name?: string;
  key?: unknown;
  message?: proto.IMessage;
  [key: string]: unknown;
}

/**
 * Wraps a Baileys WASocket together with a LID cache and event emitter,
 * providing the core WhatsApp connectivity layer used by BuilderbotProviderService.
 *
 * This is a composition-based alternative to subclassing BaileysProvider,
 * avoiding type incompatibilities between baileys rc.9 (BuilderBot's compile target)
 * and rc13 (the actual runtime version).
 */
export class CustomBaileysProvider {
  private readonly logger = new Logger(CustomBaileysProvider.name);

  /** Raw Baileys socket (public so downstream can access sock.ev directly) */
  public vendor: WASocket | null = null;

  /** Event emitter for high-level provider events */
  public readonly events = new EventEmitter();

  /** Reconnection state */
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  /** LID (Local Identifier) cache for resolving @lid JIDs to phone numbers */
  public readonly lidCache: LidCache = new MemoryLidCache(86400 * 30); // 30-day TTL

  /** Caches */
  public readonly msgRetryCounterCache = new NodeCache({
    stdTTL: 1800,
    checkperiod: 300,
    maxKeys: 50000,
    useClones: false,
  });

  public readonly userDevicesCache = new NodeCache({
    stdTTL: 7200,
    checkperiod: 600,
    maxKeys: 5000,
    useClones: false,
  });

  public readonly messageCache = new NodeCache({
    stdTTL: 43200,
    checkperiod: 1800,
    maxKeys: 20000,
    useClones: false,
  });

  /** Callback to persist Baileys credentials to the database */
  private saveCreds: (() => Promise<void>) | null = null;

  constructor(
    private readonly getAuthState: () => Promise<{
      state: AuthenticationState;
      saveCreds: () => Promise<void>;
    }>,
    public readonly name: string,
    public readonly groupsIgnore = true,
    public readonly usePairingCode = false,
    public readonly phoneNumber: string | null = null,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────────

  /**
   * Initialise the WASocket with database-backed auth.
   * Emits events on the `.events` emitter:
   *  - 'require_action'  → { qr: string } | { code: string }
   *  - 'ready'           → void
   *  - 'auth_failure'    → string[]
   */
  async init(): Promise<void> {
    const { state, saveCreds } = await this.getAuthState();
    this.saveCreds = saveCreds;

    const baileysLogger = this.makeLogger();

    try {
      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
        },
        logger: baileysLogger,
        printQRInTerminal: false,
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
        msgRetryCounterCache: this.msgRetryCounterCache as any,
        userDevicesCache: this.userDevicesCache as any,
        getMessage: this.getMessage.bind(this),
        shouldIgnoreJid: (jid: string) => {
          if (this.groupsIgnore) {
            return isJidGroup(jid) || isJidBroadcast(jid);
          }
          return false;
        },
      });

      this.vendor = sock;

      // --- Credentials persistence ------------------------------------------------
      sock.ev.on('creds.update', async () => {
        if (this.saveCreds) {
          try {
            await this.saveCreds();
          } catch (err) {
            this.logger.error('Failed to persist credentials', err);
          }
        }
      });

      // --- Connection state -------------------------------------------------------
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !this.usePairingCode) {
          this.logger.debug('QR code received');
          this.events.emit('require_action', { payload: { qr } });
        }

        if (connection === 'open') {
          this.logger.log('WhatsApp connected');
          this.reconnectAttempts = 0;
          this.events.emit('ready');
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const reason = lastDisconnect?.error?.message;
          this.logger.warn(`Connection closed: status=${statusCode} reason=${reason}`);

          if (statusCode === DisconnectReason.loggedOut) {
            this.logger.log('Logged out');
            this.events.emit('auth_failure', ['Logged out from WhatsApp']);
            return;
          }

          if (this.shouldReconnect(statusCode)) {
            await this.delayedReconnect();
            return;
          }

          this.events.emit('auth_failure', [`Unrecoverable: ${reason || 'Unknown'}`]);
        }
      });

      // --- Pairing code -----------------------------------------------------------
      if (this.usePairingCode && !sock.authState.creds.registered) {
        if (this.phoneNumber) {
          const code = await sock.requestPairingCode(this.phoneNumber);
          this.events.emit('require_action', { payload: { code } });
        } else {
          this.events.emit('auth_failure', ['usePairingCode=true but phoneNumber is not set']);
          return;
        }
      }
    } catch (err) {
      this.logger.error('init() failed', err);
      this.events.emit('auth_failure', [`Init error: ${(err as Error).message}`]);
    }
  }

  /**
   * Gracefully close the socket.
   */
  async dispose(): Promise<void> {
    this.vendor?.ws?.close();
    this.vendor?.end(new Error('Disposed'));
    this.vendor = null;
    this.msgRetryCounterCache.close();
    this.userDevicesCache.close();
    this.messageCache.close();
    this.lidCache.close?.();
    this.events.removeAllListeners();
  }

  /**
   * Get the Baileys event emitter (sock.ev) for registering raw event handlers.
   */
  get ev(): BaileysEventEmitter | null {
    return this.vendor?.ev ?? null;
  }

  // ── Message helpers ──────────────────────────────────────────────────

  /**
   * Send a text message, resolving @lid JIDs automatically.
   */
  async sendMessage(jid: string, content: string): Promise<void> {
    if (!this.vendor) throw new Error('Provider not initialised');
    const resolved = await this.resolveJid(jid);
    await this.vendor.sendMessage(resolved, { text: content });
  }

  /**
   * Resolve a JID: if it ends in @lid, try to convert to @s.whatsapp.net.
   */
  async resolveJid(jid: string): Promise<string> {
    if (!jid.includes('@lid')) return jid;
    try {
      const pn = await this.getPNForLID(jid);
      return pn || jid;
    } catch {
      return jid;
    }
  }

  /**
   * Try to resolve a LID to a phone number JID.
   * Checks the BuilderBot LID cache first, then falls back to
   * the signal repository's lidMapping if available.
   */
  async getPNForLID(lid: string): Promise<string | null> {
    // 1. Check BuilderBot LID cache (populated from incoming messages)
    try {
      const cached = await this.lidCache.get(lid);
      if (cached) return cached;
    } catch {
      // cache may be closed or unavailable
    }

    // 2. Fall back to signal repository lidMapping
    try {
      const mapping = (this.vendor as any)?.signalRepository?.lidMapping;
      if (mapping?.getPNForLID) {
        const pn = await mapping.getPNForLID(lid);
        return pn || null;
      }
    } catch {
      // lidMapping may not be available in older rc13 builds
    }
    return null;
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private getMessage = async (key: { remoteJid?: string | null; id?: string | null }): Promise<proto.IMessage | undefined> => {
    if (!key.id) return {};
    const cached = this.messageCache.get<proto.IMessage>(`msg:${key.id}`);
    return cached ?? {};
  };

  private shouldReconnect(statusCode: number | undefined): boolean {
    const codes = [
      DisconnectReason.connectionClosed,
      DisconnectReason.connectionLost,
      DisconnectReason.connectionReplaced,
      DisconnectReason.timedOut,
      DisconnectReason.badSession,
      DisconnectReason.restartRequired,
      429, 500, 502, 503, 504,
    ];
    return statusCode !== undefined && codes.includes(statusCode) && this.reconnectAttempts < this.maxReconnectAttempts;
  }

  private async delayedReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.warn('Max reconnection attempts reached');
      this.events.emit('auth_failure', ['Max reconnection attempts reached']);
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    this.logger.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    await new Promise((r) => setTimeout(r, delay));
    try {
      this.vendor?.ws?.close();
      this.vendor?.end(new Error('Reconnecting'));
      await this.init();
    } catch (err) {
      this.logger.error('Reconnect failed', err);
    }
  }

  private makeLogger() {
    const logger = this.logger;
    const bridge: any = {
      trace: () => {},
      debug: (msg: unknown) => { if (typeof msg === 'string') logger.debug(msg); },
      info: (msg: unknown) => { if (typeof msg === 'string') logger.log(msg); },
      warn: (msg: unknown) => { if (typeof msg === 'string') logger.warn(msg); },
      error: (msg: unknown) => { if (typeof msg === 'string') logger.error(msg); },
      fatal: (msg: unknown) => { if (typeof msg === 'string') logger.error(msg); },
      child: () => bridge,
    };
    return bridge;
  }
}
