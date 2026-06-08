# Proposal: Integrar BuilderBot como Provider de WhatsApp

## Intent

Reemplazar el `BaileysClientService` actual (basado en `@whiskeysockets/baileys` directo) por
`@builderbot/provider-baileys` como capa de conexión WhatsApp, obteniendo:

- **LID cache persistente** (mapeo LID→PN con respaldo a disco)
- **Reconexión automática** con exponential backoff built-in
- **Base para futuras features**: flows, conversaciones, BotContext
- **Mantenimiento delegado**: la comunidad BuilderBot mantiene la integración con Baileys

## Scope

### Incluye

| Componente | Acción |
|---|---|
| Conexión WhatsApp (socket management) | Reemplazar por BaileysProvider (subclass) |
| Auth (credenciales en DB) | Override de `initVendor` |
| Manejo de eventos (messages.upsert, etc.) | Usar `busEvents()` de BaileysProvider |
| QR generation | Adaptar evento `require_action` → QrService |
| Reconexión | Delegar a BaileysProvider (exponential backoff) |
| LID cache | Usar built-in (hybrid file+memory) |
| Contact sync | Mantener ContactSyncService actual |
| Labels sync | Mantener lógica actual sobre eventos del bus |
| Message handling | Mantener MessageHandlerService actual |

### No incluye

- NO se usará `createBot()` ni `CoreClass` (sin flows, sin bot framework)
- NO se usará el servidor HTTP de BuilderBot (Polka)
- NO se migrarán sesiones existentes (se mantiene formato de auth en DB)
- NO se agregarán features nuevas (flows, conversation, etc.) — solo reemplazo del provider
- NO se tocarán controllers, gateways WebSocket, CRON jobs, ni módulo CRM

## Approach

### Estrategia general

```
Subclase de BaileysProvider con override de initVendor
         ↓
  Wrapper NestJS (@Injectable)
         ↓
  Inyectado en SessionManagerService
         ↓
  Reemplazo de BaileysClientService
```

No se usa `createBot()` porque no necesitamos el CoreClass (flows, DB, cola de mensajes).
Usamos `createProvider()` (o new directo) para instanciar el provider standalone.

### Arquitectura

```
┌──────────────────────────────────────────────────┐
│  BuilderbotProviderService (NestJS @Injectable)   │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  CustomBaileysProvider extends BaileysProvider│  │
│  │                                              │   │
│  │  - initVendor() override → auth en DB       │   │
│  │  - busEvents() → heredado (LID, msgs, etc)  │   │
│  │  - sendMessage() → heredado (con LID→PN)    │   │
│  │  - vendor: WASocket (expuesto)              │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  Eventos emitidos por ProviderClass:              │
│  - 'message' → MessageHandlerService              │
│  - 'ready' → SessionManagerService                │
│  - 'require_action' → QrService + WS              │
│  - 'auth_failure' → SessionManagerService         │
└──────────────────────────────────────────────────┘
```

### Override de initVendor

El método `initVendor` de BaileysProvider (protected) actualmente:
1. Llama `useMultiFileAuthState(NAME_DIR_SESSION)` → archivos
2. Configura logger pino → `baileys.log`
3. Crea `makeWASocketOther()` con auth de archivos
4. Registra handlers de `connection.update` y `creds.update`
5. Retorna `sock.ev` (event emitter de Baileys)

Nuestro override:
1. Usa `BaileysAuthService.getAuthState(sessionId)` → auth en DB
2. Usa `Logger` de NestJS en vez de pino
3. Crea `makeWASocket()` con auth de DB
4. Registra handlers de `connection.update` y `creds.update` (mismos que el original)
5. Asigna `this.saveCredsGlobal` para que `creds.update` guarde en DB
6. Retorna `sock.ev`

## Dependencies

### Nuevas (package.json)

```json
"dependencies": {
  "@builderbot/bot": "^1.4.2",
  "@builderbot/provider-baileys": "^1.4.2"
}
```

### Overrides necesarios (package.json)

```json
"overrides": {
  "sharp": "$sharp",
  "baileys": "7.0.0-rc13"
}
```

Esto fuerza a BuilderBot a usar nuestra versión de sharp (0.34.5→0.33.3 no hay conflicto)
y nuestra versión de Baileys (rc13 en vez de rc.9 vulnerable).

### Dependencias transitivas que se instalarán (no usadas)

| Paquete | Tamaño estimado | Por qué viene |
|---|---|---|
| polka | ~50KB | Server HTTP (no usado) |
| cors | ~20KB | Middleware (no usado) |
| body-parser | ~100KB | Middleware (no usado) |
| fluent-ffmpeg | ~200KB | Procesar audios (no usado) |
| @ffmpeg-installer/ffmpeg | ~30MB** | Binario FFmpeg (no usado) |
| jimp | ~1.5MB | Procesar imágenes (no usado) |
| cheerio | ~500KB | Parsear HTML (no usado) |
| wa-sticker-formatter | ~200KB | Crear stickers (no usado) |
| mime-types | ~50KB | Detectar MIME (usado parcialmente) |
| qr-image | ~100KB | QR alternativo (no usado) |

**\* ffmpeg-installer descarga un binario ~30MB**

## Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Baileys rc.9 vulnerable (spoofing) | Alta | Alto | Override `baileys` → rc13 en package.json |
| R2 | Override de initVendor se rompe con updates de BuilderBot | Media | Alto | Tests de integración + PR review |
| R3 | Dual Baileys instalado (rc9 + rc13) si override no funciona | Media | Medio | Verificar node_modules post-install |
| R4 | sharp 0.33.3 + 0.34.5 duplicados | Alta | Bajo | Override en package.json |
| R5 | Eventos de BaileysProvider no cubren todos nuestros casos (labels, chats.upsert, contacts.upsert) | Media | Alto | Suscribirse directamente a sock.ev para eventos no cubiertos |
| R6 | Pérdida de sesiones activas durante migración | Baja | Alto | Migración phased: nuevo provider corre en paralelo, luego se corta |
| R7 | ~30MB extras en node_modules por ffmpeg | Alta | Bajo | Aceptar; se puede limpiar con .npmrc o postinstall |
| R8 | Process signal handlers de BaileysProvider (SIGINT/SIGTERM) conflictúan con NestJS | Alta | Medio | Override del constructor o cleanup en onApplicationShutdown |

## Estimated Effort

### Por fase

| Fase | Archivos nuevos | Archivos modificados | Archivos eliminados | Líneas estimadas |
|---|---|---|---|---|
| 1. Install + Provider standalone | 1 | 1 | 0 | ~80 |
| 2. Auth override (subclass) | 1 | 0 | 0 | ~120 |
| 3. Event wiring + LID | 0 | 3 | 0 | ~100 |
| 4. Replace old service | 0 | 2 | 2 | ~50 |
| **Total** | **2** | **6** | **2** | **~350** |

### Estimación temporal
- **Desarrollo**: 1-2 días
- **Testing + fixes**: 1 día
- **Rollout**: 2-3 días con monitoreo

## Phases (Implementation Order)

### Phase 1: Install + Provider Standalone
- Agregar dependencias con overrides
- Crear `BuilderbotProviderService` con `createProvider()` standalone
- Verificar que `getPNForLID()` funciona
- NO iniciar conexión todavía

### Phase 2: Auth Override
- Crear subclase `CustomBaileysProvider extends BaileysProvider`
- Override `initVendor()` para usar `BaileysAuthService`
- Verificar conexión con sesión nueva (QR)
- Verificar reconexión con sesión existente

### Phase 3: Event Wiring + LID Cache
- Mapear eventos `message`, `ready`, `require_action`, `auth_failure`
- Integrar con `MessageHandlerService`, `QrService`, etc.
- Probar LID resolution con contactos @lid
- Soportar eventos no cubiertos por busEvents (labels, contacts.upsert)

### Phase 4: Replace Old Service
- Actualizar `SessionManagerService` para usar BuilderbotProviderService
- Mantener ambos providers ejecutándose en paralelo durante migración
- Monitorear estabilidad
- Eliminar `BaileysClientService` y `BaileysReconnectService`
- Actualizar `WhatsAppModule` y exports

## Exit Criteria

1. ✅ Sesión nueva se conecta vía QR
2. ✅ Sesión existente se reconecta con auth en DB
3. ✅ Mensajes entrantes se procesan (→ DB + WebSocket)
4. ✅ Mensajes salientes se envían (con resolución LID→PN)
5. ✅ Contactos se sync al CRM (incluyendo @lid)
6. ✅ Labels se aplican
7. ✅ Reconexión automática tras caída de red
8. ✅ Logout manual → QR rescan
9. ✅ `turbo test` pasa sin regresiones
