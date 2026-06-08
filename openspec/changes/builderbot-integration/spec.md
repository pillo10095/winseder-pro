# Spec: BuilderBot Provider Integration

## Overview

Replace the direct `@whiskeysockets/baileys` usage in `BaileysClientService` with
`@builderbot/provider-baileys` as the WhatsApp connection layer. The existing auth,
message handling, contact sync, and label sync stay unchanged — only the socket
management and event processing layer is replaced.

## Dependencies

- `@builderbot/bot@^1.4.2` — Core framework (ProviderClass, EventEmitterClass)
- `@builderbot/provider-baileys@^1.4.2` — Baileys provider + LID cache
- Override: `baileys` → `7.0.0-rc13` (evita rc.9 deprecado)
- Override: `sharp` → `$sharp` (evita duplicación)

## Functional Requirements

### FR-BB1: Initialize provider with DB auth
- `BuilderbotProviderService` must subclass `BaileysProvider` and override `initVendor()`
- Override must use `BaileysAuthService.getAuthState()` instead of `useMultiFileAuthState()`
- Override must use NestJS `Logger` instead of pino → `baileys.log`
- `saveCredsGlobal` must persist to DB via `BaileysAuthService`
- The Polka HTTP server must NOT be started (no `start()` or `initAll()`)
- Process signal handlers (SIGINT/SIGTERM) from parent constructor must be neutralized

### FR-BB2: Multi-session support
- `BuilderbotProviderService` must manage a `Map<sessionId, CustomBaileysProvider>`
- Each session has its own provider instance with its own auth state
- Provider instances are isolated (separate WASocket, separate LID cache)

### FR-BB3: QR code delivery
- On `require_action` event from provider, generate QR data URL via `QrService`
- Emit `QrGeneratedEvent` via `QrEventsService` (existing flow)
- Support both QR scan and pairing code flows

### FR-BB4: Message processing
- On `message` event from provider, delegate to `MessageHandlerService`
- Message payload must include: `from` (clean number), `body` (text), `name` (pushName)
- Media messages, location, polls, calls must be handled (provider does this via `busEvents()`)
- LID→PN resolution must be applied to `from` field

### FR-BB5: Connection lifecycle
- On `ready` event: update session status to CONNECTED, store phone number, schedule contact sync
- On `close`/disconnect: evaluate reason, reconnect or mark as EXPIRED
- On `auth_failure`: mark session as EXPIRED, notify via WebSocket
- Reconnection uses BaileysProvider's built-in exponential backoff (max 10 attempts, 30s ceiling)

### FR-BB6: LID cache persistence
- Provider initializes LID cache automatically (hybrid file+memory)
- Cache auto-populates from incoming messages via `busEvents()` handler
- `getPNForLID()` method must be available and functional for CRM contact resolution
- LID→PN mappings must survive server restarts (file persistence)

### FR-BB7: Contact and label sync
- Events NOT covered by BaileysProvider's `busEvents()` must be handled via direct `sock.ev` subscription
- Specifically: `contacts.upsert`, `chats.upsert`, `labels.edit`, `labels.association`
- These must be forwarded to existing `ContactSyncService` and label processing logic

### FR-BB8: Graceful shutdown
- `onApplicationShutdown()` must close all active provider connections
- Each provider's WASocket must be ended cleanly (`vendor.end()`)
- LID cache must flush to disk before shutdown
- Manual disconnect (`endSocket()`) must skip auto-reconnect

### FR-BB9: Coexistence during migration
- Old `BaileysClientService` and new `BuilderbotProviderService` can run simultaneously
- Different sessions can use different providers
- No shared state between providers (each session is independent)

## Non-Functional Requirements

- NFR-BB1: Session connect must complete within 10 seconds (QR generation or auth restore)
- NFR-BB2: Message processing latency must not increase compared to current implementation
- NFR-BB3: Memory per session must not exceed 50MB
- NFR-BB4: LID resolution must complete within 500ms
- NFR-BB5: All existing `turbo test` tests must pass without modification

## Scenarios

### Scenario S1: Happy path — Connect new session via QR

```
Given: Company has no active WhatsApp session
When:  User requests new session via POST /api/whatsapp/sessions
Then:  Session is created with status CONNECTING
And:   BaileysProvider.initVendor() is called with DB auth
And:   QR code is generated and emitted via WebSocket within 10s
When:  User scans QR code on phone
Then:  Session status becomes CONNECTED
And:   Phone number is stored in DB
And:   Contact sync is scheduled
```

### Scenario S2: Reconnect existing session after server restart

```
Given: Session was CONNECTED before server restart
When:  Server starts and SessionManagerService.restoreSessions() runs
Then:  BuilderbotProviderService recreates provider with saved auth state
And:   initVendor() uses BaileysAuthService.getAuthState() to restore creds
And:   Connection is established without QR scan
And:   Session status becomes CONNECTED
```

### Scenario S3: Network drop and auto-reconnect

```
Given: Session is CONNECTED
When:  Network connection drops
Then:  BaileysProvider detects disconnect (connection.update → 'close')
And:   Exponential backoff starts (1s, 2s, 4s, 8s... up to 30s max)
When:  Network is restored
Then:  Provider reconnects automatically
And:   Session status remains CONNECTED
And:   Retry counter resets
```

### Scenario S4: Max reconnection attempts exceeded

```
Given: Session is CONNECTED
When:  Network remains down for extended period
And:   All 10 reconnection attempts fail
Then:  Provider emits 'auth_failure' event
And:   Session status becomes EXPIRED
And:   WebSocket notification is sent to frontend
```

### Scenario S5: Logged out from phone

```
Given: Session is CONNECTED
When:  User logs out from WhatsApp phone app
Then:  DisconnectReason is 'loggedOut'
And:   Provider emits 'auth_failure'
And:   Session is marked EXPIRED in DB
And:   Auth state is cleared
And:   No auto-reconnect is attempted
```

### Scenario S6: Incoming message from @lid contact

```
Given: Session is CONNECTED
When:  Message arrives from remoteJid ending in @lid
And:   Provider's busEvents handler processes messages.upsert
Then:  LID→PN mapping is extracted and cached (cacheLidFromMessage)
And:   'message' event is emitted with 'from' as clean phone number
And:   MessageHandlerService processes it normally
```

### Scenario S7: Send message to @lid contact

```
Given: Session is CONNECTED
When:  System sends a message to a contact identified by @lid JID
Then:  provider.sendMessage() resolves LID→PN via getPNForLID()
And:   Message is sent to the resolved phone number JID
```

### Scenario S8: Contact sync from phonebook

```
Given: Session is CONNECTED
When:  WhatsApp sends contacts.upsert event
Then:  Handler (direct on sock.ev, not via busEvents) processes contacts
And:   ContactSyncService.syncContacts() is called for each batch
And:   CRM contacts are created/updated
```

### Scenario S9: Graceful shutdown

```
Given: Multiple sessions are CONNECTED
When:  Application is shutting down (SIGTERM)
Then:  BuilderbotProviderService.onApplicationShutdown() is called
And:   Each provider's vendor.end() is called
And:   LID cache is flushed to disk
And:   All sockets are closed within 5 seconds
```

### Scenario S10: Dual provider coexistence

```
Given: Old BaileysClientService is still registered
And:   New BuilderbotProviderService is also registered
When:  Session A is created via old provider
And:   Session B is created via new provider
Then:  Both sessions operate independently
And:   No shared state conflicts
And:   Both emit events through their respective channels
```

### Scenario S11: Pairing code flow

```
Given: Company has usePairingCode=true configured
When:  New session is created
Then:  Provider initVendor uses pairing code instead of QR
And:   'require_action' event includes pairing code
And:   Code is delivered to frontend via WebSocket
```

## Edge Cases

### EC-BB1: initVendor throws during initialization
- Provider must catch error, emit `auth_failure`, and not leave dangling socket
- Session status must be set to EXPIRED

### EC-BB2: saveCreds fails during creds.update
- Must log error but NOT crash the connection
- Next creds.update will retry

### EC-BB3: LID cache file is corrupted on startup
- Provider must initialize empty cache and log warning
- Must not prevent connection

### EC-BB4: Two sessions for same company (race condition)
- Application layer must prevent (existing check in SessionManagerService)
- Provider layer must handle gracefully if it happens (second init replaces first)

## Acceptance Criteria

- AC1: All scenarios S1–S11 pass manual testing
- AC2: `turbo test` passes with zero regressions
- AC3: Existing sessions reconnect without QR after server restart
- AC4: New sessions connect via QR
- AC5: Messages flow end-to-end (receive → DB → WebSocket → CRM)
- AC6: LID→PN resolution works for both incoming and outgoing messages
- AC7: Contacts sync to CRM for both @s.whatsapp.net and @lid JIDs
- AC8: Labels apply and remove correctly
- AC9: Provider survives 3 consecutive network drops without EXPIRING
- AC10: Graceful shutdown completes within 5 seconds
