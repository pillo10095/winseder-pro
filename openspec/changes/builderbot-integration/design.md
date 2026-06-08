# Design: BuilderBot Provider Integration

## Architecture

### Class Hierarchy

```
EventEmitterClass<ProviderEventTypes>  (@builderbot/bot)
    │
    ├── ProviderClass<WASocket>         (@builderbot/bot)
    │       │
    │       ├── BaileysProvider          (@builderbot/provider-baileys)
    │       │       │
    │       │       └── CustomBaileysProvider  (NUEVO - subclass en wisender)
    │       │               ├── initVendor() override
    │       │               ├── constructor() override (sin signal handlers)
    │       │               └── cleanup() override (sin logStream)
    │       │
    │       └── (other providers...)
    │
    └── CoreClass (NO USADO)
```

### Module Structure

```
whatsapp/
  services/
    builderbot-provider.service.ts    (NUEVO - wrapper NestJS)
    custom-baileys-provider.ts        (NUEVO - subclass)
    baileys-auth.service.ts           (EXISTENTE - sin cambios)
    baileys-client.service.ts         (EXISTENTE - se eliminará en Fase 4)
    baileys-reconnect.service.ts      (EXISTENTE - se eliminará en Fase 4)
    session-manager.service.ts        (EXISTENTE - modificado)
    contact-sync.service.ts           (EXISTENTE - sin cambios)
    message-handler.service.ts        (EXISTENTE - sin cambios)
    qr.service.ts                     (EXISTENTE - sin cambios)
    qr-events.service.ts              (EXISTENTE - sin cambios)
```

## Detailed Design

### 1. CustomBaileysProvider (custom-baileys-provider.ts)

```typescript
import { BaileysProvider } from '@builderbot/provider-baileys';
import { makeWASocket, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Logger } from '@nestjs/common';
import NodeCache from 'node-cache';
import type { BaileyGlobalVendorArgs } from '@builderbot/provider-baileys/dist/type';

export class CustomBaileysProvider extends BaileysProvider {
  private readonly logger = new Logger(CustomBaileysProvider.name);

  constructor(
    args: Partial<BaileyGlobalVendorArgs>,
    private readonly getAuthState: () => Promise<{
      state: AuthenticationState;
      saveCreds: () => Promise<void>;
    }>,
    private readonly sessionId: string,
  ) {
    // Llamar al constructor del padre que configura:
    // - msgRetryCounterCache, userDevicesCache, messageCache
    // - lidCache (lo QUEREMOS)
    // - setupCleanupHandlers (lo NEUTRALIZAMOS)
    // - setupPeriodicCleanup (lo NEUTRALIZAMOS)
    super(args);

    // Neutralizar signal handlers del padre
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    // NestJS manejará shutdown via onApplicationShutdown
  }

  /**
   * Override: usa auth en DB en vez de useMultiFileAuthState
   */
  protected async initVendor() {
    const { state, saveCreds } = await this.getAuthState();

    const baileysLogger = {
      trace: () => {},
      debug: (msg: unknown) => this.logger.debug(typeof msg === 'string' ? msg : ''),
      info: (msg: unknown) => this.logger.log(typeof msg === 'string' ? msg : ''),
      warn: (msg: unknown) => this.logger.warn(typeof msg === 'string' ? msg : ''),
      error: (msg: unknown) => this.logger.error(typeof msg === 'string' ? msg : ''),
      fatal: (msg: unknown) => this.logger.error(typeof msg === 'string' ? msg : ''),
      child: () => baileysLogger,
    };

    this.saveCredsGlobal = saveCreds;

    const sock = makeWASocket({
      version: [2, 3000, 1015191526], // Última versión conocida
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
      getMessage: this.getMessage,
      shouldIgnoreJid: (jid) => {
        if (this.globalVendorArgs.groupsIgnore) {
          return isJidGroup(jid) || isJidBroadcast(jid);
        }
        return false;
      },
    });

    this.vendor = sock;

    // Pairing code support
    if (this.globalVendorArgs.usePairingCode && !sock.authState.creds.registered) {
      if (this.globalVendorArgs.phoneNumber) {
        const code = await sock.requestPairingCode(this.globalVendorArgs.phoneNumber);
        this.emit('require_action', { /* ... */ });
      }
    }

    // Connection update handler
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !this.globalVendorArgs.usePairingCode) {
        this.emit('require_action', { payload: { qr } });
      }

      if (connection === 'open') {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        const phone = `${sock.user?.id}`.split(':').shift();
        this.globalVendorArgs.host = { ...sock.user, phone };
        this.emit('ready', true);
        this.emit('host', { phone });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          this.emit('auth_failure', ['Logged out']);
          return;
        }
        if (this.shouldReconnect(statusCode)) {
          await this.delayedReconnect();
          return;
        }
        this.emit('auth_failure', ['Critical error']);
      }
    });

    // Creds update handler
    sock.ev.on('creds.update', async () => {
      if (this.saveCredsGlobal) {
        await this.saveCredsGlobal();
      }
    });

    return sock.ev;
  }
}
```

### 2. BuilderbotProviderService (builderbot-provider.service.ts)

```typescript
@Injectable()
export class BuilderbotProviderService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(BuilderbotProviderService.name);
  private readonly sessions = new Map<string, CustomBaileysProvider>();
  private readonly manualDisconnect = new Set<string>();

  constructor(
    private readonly authService: BaileysAuthService,
    private readonly sessionRepo: SessionRepository,
    private readonly qrService: QrService,
    private readonly qrEvents: QrEventsService,
    private readonly messageHandler: MessageHandlerService,
    private readonly contactSync: ContactSyncService,
    private readonly conversationRepo: ConversationRepository,
  ) {}

  async createSession(sessionId: string, companyId: string): Promise<void> {
    // Cerrar sesión existente si hay
    this.closeSession(sessionId);

    const provider = new CustomBaileysProvider(
      {
        name: sessionId,
        usePairingCode: false,
        groupsIgnore: true,
        readStatus: false,
        writeMyself: 'none',
      },
      () => this.authService.getAuthState(sessionId),
      sessionId,
    );

    // Registrar eventos
    provider.on('require_action', async (data) => {
      if (data.payload?.qr) {
        const qrDataUrl = await this.qrService.generateQrDataUrl(data.payload.qr);
        this.qrEvents.emitQrGenerated(sessionId, companyId, qrDataUrl);
        await this.sessionRepo.update(sessionId, { status: SessionStatus.QR_CODE });
      }
    });

    provider.on('ready', async () => {
      this.logger.log(`Session ${sessionId} connected`);
      await this.sessionRepo.update(sessionId, {
        status: SessionStatus.CONNECTED,
        phone_number: provider.globalVendorArgs.host?.phone ?? null,
        last_seen: new Date(),
      });
    });

    provider.on('auth_failure', async ([reason]) => {
      this.logger.warn(`Session ${sessionId} auth failure: ${reason}`);
      if (!this.manualDisconnect.has(sessionId)) {
        await this.sessionRepo.update(sessionId, { status: SessionStatus.EXPIRED });
      }
    });

    // Iniciar vendor (llama initVendor → nuestro override)
    await provider['initVendor']();
    const events = await provider['listenOnEvents'](provider.vendor.ev);

    // Eventos NO cubiertos por busEvents: suscribir directo a sock.ev
    this.registerDirectEvents(sessionId, companyId, provider);

    this.sessions.set(sessionId, provider);
    await this.sessionRepo.update(sessionId, { status: SessionStatus.CONNECTING });
  }

  private registerDirectEvents(sessionId: string, companyId: string, provider: CustomBaileysProvider) {
    const sock = provider.vendor;

    // contacts.upsert — no cubierto por busEvents
    sock.ev.on('contacts.upsert', async (contacts) => {
      const individual = contacts.filter(c => isIndividualJid(c.id));
      if (individual.length > 0) {
        await this.contactSync.syncContacts(sessionId, companyId, individual);
      }
    });

    // chats.upsert — no cubierto por busEvents
    sock.ev.on('chats.upsert', async (chats) => {
      const individual = chats.filter(c => isIndividualJid(c.id) && !c.id?.endsWith('@g.us'));
      if (individual.length > 0) {
        await this.contactSync.syncContacts(sessionId, companyId, 
          individual.map(c => ({ id: c.id!, name: c.name })));
      }
    });

    // labels.edit — no cubierto por busEvents
    sock.ev.on('labels.edit', async (label) => {
      if (label?.id && label?.name) {
        // caching logic igual que hoy
      }
    });

    // labels.association — no cubierto por busEvents
    sock.ev.on('labels.association', async (assoc) => {
      if (assoc?.association?.type === 'label_jid') {
        // aplicar/remover label igual que hoy
      }
    });
  }

  // Manejar message event de busEvents
  private setupMessageHandler() {
    // El evento 'message' es emitido por busEvents después de procesar
    // messages.upsert (LID resolution, dedup, filtrado)
    // Lo escuchamos en createSession
  }

  async endSession(sessionId: string): Promise<void> {
    this.manualDisconnect.add(sessionId);
    this.closeSession(sessionId);
  }

  private closeSession(sessionId: string): void {
    const provider = this.sessions.get(sessionId);
    if (provider) {
      provider.vendor?.end(undefined);
      provider.removeAllListeners();
      this.sessions.delete(sessionId);
    }
  }

  getSocket(sessionId: string): WASocket | undefined {
    return this.sessions.get(sessionId)?.vendor;
  }

  async onApplicationShutdown(): Promise<void> {
    for (const [id] of this.sessions) {
      this.closeSession(id);
    }
  }
}
```

### 3. Data Flow: Incoming Message

```
WhatsApp → WASocket
    ↓
sock.ev → 'messages.upsert'
    ↓
busEvents handler (en BaileysProvider):
  - Deduplica (idsDuplicates)
  - Extrae LID→PN y cachea (cacheLidFromMessage)
  - Clasifica tipo (text, image, video, audio, etc.)
  - Limpia número (from)
  - Filtra (writeMyself, groupsIgnore)
    ↓
provider.emit('message', payload)
    ↓
BuilderbotProviderService escucha 'message'
    ↓
MessageHandlerService.handleMessage(payload)
    ↓
Guarda en DB + Emite vía WebSocket + Dispara eventos internos
```

### 4. Data Flow: Contact Sync

```
WhatsApp → WASocket
    ↓
sock.ev → 'contacts.upsert' (NO pasa por busEvents)
    ↓
Direct handler en BuilderbotProviderService
    ↓
ContactSyncService.syncContacts()
    ↓
CRM: Contact table upsert
```

### 5. Session Lifecycle

```
createSession()
    ↓
new CustomBaileysProvider(auth, sessionId)
    ↓
provider.initVendor()
    ↓
makeWASocket(auth: DB creds)
    ↓
sock.ev 'connection.update' → QR | open | close
    ↓
provider.listenOnEvents(sock.ev) → registra busEvents
    ↓
registerDirectEvents(sock.ev) → contacts, labels, chats
    ↓
Provider listo para enviar/recibir mensajes
```

### 6. LID Cache Integration

BaileysProvider constructor inicializa `this.lidCache` automáticamente.

El busEvents handler de `messages.upsert` llama a `this.cacheLidFromMessage(messageCtx)`
que a su vez llama a `extractAndCacheLidFromMessage(this.lidCache, messageCtx)`.

Esto significa que el LID cache se alimenta solo con los mensajes entrantes,
sin necesidad de código adicional.

Para resolver LID→PN en envío de mensajes:
- `provider.sendMessage()` ya llama internamente a `this.resolveNumber()` que usa `getPNForLID()`
- Si enviamos directo por `vendor.sendMessage()`, debemos resolver manualmente:
  ```typescript
  const jid = await provider.getPNForLID(lidJid) ?? lidJid;
  await provider.vendor.sendMessage(jid, { text: message });
  ```

## Configuration

### package.json overrides

```json
{
  "overrides": {
    "sharp": "$sharp",
    "baileys": "7.0.0-rc13"
  }
}
```

### BuilderbotProviderService options

| Option | Default | Description |
|---|---|---|
| `name` | sessionId | Directorio de sesión (LID cache file) |
| `groupsIgnore` | true | Ignorar mensajes de grupos |
| `readStatus` | false | No marcar mensajes como leídos |
| `writeMyself` | 'none' | No procesar mensajes propios |
| `usePairingCode` | false | Usar pairing code en vez de QR |
| `phoneNumber` | null | Número para pairing code |

## Migration Strategy

### Phase 1-3 (Paralelo)

```
Session A → BaileysClientService (old)
Session B → BuilderbotProviderService (new)

Ambos conviven, diferentes sesiones, sin estado compartido.
```

### Phase 4 (Corte)

```
1. Deploy nuevo código con ambos providers
2. Monitorear sessions nuevas funcionando con BuilderBot
3. Migrar sessions existentes una por una (reconectar)
4. Verificar estabilidad durante 24h
5. Eliminar BaileysClientService + BaileysReconnectService
6. Eliminar imports y providers del módulo
```

## Testing Strategy

### Unit tests
- CustomBaileysProvider.initVendor(): verify auth override, logger, event registration
- LID resolution: mock lidCache, verify getPNForLID returns correct values

### Integration tests
- Session create → QR generation → connect → message flow
- Session restore from DB auth state
- Network drop → auto-reconnect

### E2E tests (manual)
- S1-S11 from spec
- All existing WhatsApp functionality

## Security Considerations

- Auth credentials stored in DB (existing, unchanged)
- LID cache on disk (new): contains phone→LID mappings, no credentials
- Baileys rc.9 vulnerability mitigated by override to rc13
- Process signal handlers neutralized to avoid NestJS interference
