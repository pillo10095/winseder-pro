# Tasks: BuilderBot Provider Integration

## Review Workload Forecast

| Métrica | Valor |
|---|---|
| Archivos nuevos | 2 |
| Archivos modificados | 3 |
| Archivos eliminados (Fase 4) | 2 |
| Líneas nuevas | ~350 |
| Líneas modificadas | ~65 |
| Líneas eliminadas | ~719 |
| **Total changed lines** | **~415** |
| **400-line budget risk** | **⚠️ High (sobrepasa por ~15 líneas)** |
| **Chained PRs recommended** | **Sí** |

## Delivery Strategy

Según la sesión preflight (C1 = Ask me): el forecast excede las 400 líneas.
Se necesita decisión antes de `sdd-apply`.

---

## Task List

### Phase 1: Dependencies + CustomBaileysProvider

#### T1.1: Install dependencies
- **Archivo**: `apps/api/package.json`
- **Acción**: Agregar `@builderbot/bot@^1.4.2` y `@builderbot/provider-baileys@^1.4.2`
- **Acción**: Agregar overrides para `baileys` → `7.0.0-rc13` y `sharp` → `$sharp`
- **Verificación**: `npm install` sin errores, verificar que `node_modules/baileys` sea rc13

#### T1.2: Create CustomBaileysProvider class
- **Archivo nuevo**: `apps/api/src/modules/whatsapp/services/custom-baileys-provider.ts`
- **Acción**: Subclase de `BaileysProvider` con constructor que:
  - Acepta `getAuthState` callback y `sessionId`
  - Neutraliza signal handlers del padre (SIGINT/SIGTERM)
  - No escribe a `baileys.log` (usa NestJS Logger)
- **Acción**: Override `initVendor()`:
  - Usa `getAuthState()` en vez de `useMultiFileAuthState()`
  - Usa NestJS Logger en vez de pino
  - Crea `makeWASocket()` con auth de DB
  - Registra handlers `connection.update` y `creds.update`
  - Soporta pairing code
- **Verificación**: `npm run build` compila sin errores

### Phase 2: BuilderbotProviderService (wrapper NestJS)

#### T2.1: Create BuilderbotProviderService
- **Archivo nuevo**: `apps/api/src/modules/whatsapp/services/builderbot-provider.service.ts`
- **Acción**: Servicio `@Injectable()` con:
  - `Map<sessionId, CustomBaileysProvider>`
  - `manualDisconnect: Set<string>`
  - Método `createSession(sessionId, companyId)`
  - Método `endSession(sessionId)`
  - Método `getSocket(sessionId)`
  - `onApplicationShutdown()` que cierra todos los providers
- **Acción**: En `createSession()`:
  - Instancia `CustomBaileysProvider` con callback auth
  - Escucha eventos: `require_action`, `ready`, `auth_failure`
  - Llama `initVendor()` + `listenOnEvents()` via bracket notation
  - Registra handlers directos para eventos no cubiertos por busEvents
- **Verificación**: Sesión se crea sin errores y emite QR

#### T2.2: Wire events to existing services
- **Archivo**: `builderbot-provider.service.ts` (agregar handlers)
- **Acción**: Conectar mensajes entrantes:
  - `provider.on('message', payload)` → `MessageHandlerService`
- **Acción**: Conectar QR:
  - `provider.on('require_action', data)` → `QrService` + `QrEventsService`
- **Acción**: Conectar ready:
  - `provider.on('ready')` → actualizar DB status, scheduled contact sync
- **Acción**: Conectar auth_failure:
  - `provider.on('auth_failure')` → marcar EXPIRED en DB
- **Acción**: Registrar eventos directos en `sock.ev`:
  - `contacts.upsert` → `ContactSyncService`
  - `chats.upsert` → `ContactSyncService`
  - `labels.edit` → cache local
  - `labels.association` → aplicar/remover labels
- **Verificación**: Mensajes entrantes se guardan en DB, contactos se sync, labels funcionan

#### T2.3: Wire SessionManagerService
- **Archivo**: `apps/api/src/modules/whatsapp/services/session-manager.service.ts`
- **Acción**: Agregar `BuilderbotProviderService` como dependencia opcional
- **Acción**: En `createSession()`, llamar a `builderbotProvider.createSession()` en vez de `baileysClient.createSocket()`
- **Acción**: En `disconnectSession()`, llamar a `builderbotProvider.endSession()`
- **Acción**: En `restoreSessions()`, usar nuevo provider
- **Acción**: En `extractContacts()`, usar nuevo provider
- **Verificación**: CRUD de sesiones funciona con nuevo provider

### Phase 3: LID Cache + Message Sending

#### T3.1: LID resolution in message sending
- **Archivo**: `builderbot-provider.service.ts` (agregar método)
- **Acción**: Implementar `sendMessage(sessionId, jid, content)` que:
  - Si `jid` termina en `@lid`, usa `provider.getPNForLID(jid)` para resolver
  - Delega a `provider.vendor.sendMessage()` con el JID resuelto
- **Verificación**: Mensajes a contactos @lid se entregan correctamente

#### T3.2: LID cache auto-population verification
- **Archivo**: (sin cambios de código, verificación manual)
- **Acción**: Verificar que `cacheLidFromMessage()` se llama para cada mensaje entrante
- **Acción**: Verificar que el cache persiste entre reinicios (archivo `{sessionId}_lid_cache.json`)
- **Acción**: Verificar que `getPNForLID()` resuelve contactos conocidos
- **Verificación**: Contactos @lid se resuelven correctamente en CRM

### Phase 4: Replace Old Service (Post-Migration)

#### T4.1: Keep both providers in parallel
- **Acción**: NO eliminar `BaileysClientService` todavía
- **Acción**: Ambos providers registrados en `WhatsAppModule`
- **Acción**: Sesiones nuevas usan BuilderBot, sesiones existentes siguen con old provider
- **Verificación**: Ambos conviven sin conflictos de estado

#### T4.2: Remove old provider (after stabilization)
- **Archivos**: Eliminar `baileys-client.service.ts`, `baileys-reconnect.service.ts`
- **Archivo**: Modificar `whatsapp.module.ts` — sacar providers eliminados
- **Archivo**: Modificar `whatsapp/index.ts` — sacar exports eliminados
- **Verificación**: `turbo test` pasa, app arranca sin errores

---

## Dependencies Between Tasks

```
T1.1 (install)
   ↓
T1.2 (subclass) ──────────────────────┐
   ↓                                   │
T2.1 (wrapper NestJS) ←────────────────┤
   ↓                                   │
T2.2 (event wiring) ←─────────────────┤
   ↓                                   │
T2.3 (session manager) ←──────────────┤
   ↓                                   │
T3.1 (LID send) ←─────────────────────┤
   ↓                                   │
T3.2 (LID verify) ←───────────────────┤
   ↓                                   │
T4.1 (parallel) ←─────────────────────┘
   ↓
T4.2 (cleanup)
```

## Risk per Task

| Task | Risk | Mitigation |
|---|---|---|
| T1.2 | High — override initVendor fragile | Test coverage + manual verify |
| T2.1 | Medium — bracket notation to access protected methods | TypeScript `// @ts-expect-error` |
| T2.2 | Medium — event payload shape may differ from expected | Log raw payload in dev |
| T2.3 | Medium — session-manager must handle both providers | Conditional injection |
| T3.1 | Low — LID resolution is well-defined | Unit test with mock lidCache |
| T4.2 | Medium — removing BaileysClientService may miss references | Grep toda la codebase |

## Effort per Task

| Task | Archivos | Líneas nuevas | Líneas modificadas |
|---|---|---|---|
| T1.1 | 1 | 0 | ~5 |
| T1.2 | 1 | ~120 | 0 |
| T2.1 | 1 | ~150 | 0 |
| T2.2 | 0 | ~40 | ~30 |
| T2.3 | 1 | 0 | ~30 |
| T3.1 | 0 | ~15 | ~5 |
| T3.2 | 0 | 0 | 0 |
| T4.1 | 0 | 0 | 0 |
| T4.2 | 3 | 0 | ~20 (+ ~719 deleted) |
| **Total** | **7** | **~325** | **~90** |
