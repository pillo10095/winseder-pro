# Spec: WhatsApp Sessions

## Overview
Manage WhatsApp Web sessions per company. One active session per company. Connect via QR code, disconnect, auto-reconnect on network drop, and health monitoring to detect stale sessions.

## Dependencies
- `@whiskeysockets/baileys` — WhatsApp Web/Multi-Device client
- `socket.io` — Real-time event delivery for QR codes
- Redis — Session token persistence for Baileys auth state

## Functional Requirements

### FR-S1: Create session
- `POST /api/whatsapp/sessions` — Request a new WhatsApp session
- Validate the requesting company doesn't already have an active session
- Initialize a new Baileys socket instance for this company
- Return `session_id` immediately; QR code is delivered via WebSocket
- Store session metadata in `whatsapp_sessions` table

### FR-S2: Get QR code
- `POST /api/whatsapp/sessions/:id/qr` — Regenerate or get current QR
- If session already connecting, return existing QR
- If session is connected, return 409 Conflict
- QR is also pushed via WebSocket (room = companyId)

### FR-S3: Get session status
- `GET /api/whatsapp/sessions/:id` — Return session status
- Statuses: `connecting`, `connected`, `disconnected`, `expired`
- Include `phone_number`, `last_seen`, `device_info` when connected

### FR-S4: List sessions
- `GET /api/whatsapp/sessions` — List all sessions for the company
- Return all sessions with status, paginated

### FR-S5: Disconnect session
- `DELETE /api/whatsapp/sessions/:id` — Disconnect and close session
- Kill Baileys socket, clear auth state from Redis
- Mark session as `disconnected` in DB
- Emit `session:disconnected` event via WebSocket

### FR-S6: Auto-reconnect
- On unexpected disconnect, automatically attempt reconnection up to 3 times
- Exponential backoff: 5s, 15s, 45s
- After 3 failures, mark as `expired` and notify via WebSocket
- Store last disconnect reason for diagnostics

### FR-S7: Session health check
- Internal cron every 5 minutes checks all `connected` sessions
- Ping Baileys socket; if unresponsive, trigger reconnect flow
- Log health results to `session_health_log` (future: monitoring dashboard)

## Non-Functional Requirements
- NFR-S1: QR code must render within 5 seconds of session creation
- NFR-S2: Session reconnect must complete within 60 seconds
- NFR-S3: One session per company limit enforced at application layer

## Scenarios

### Scenario S1: Happy path — Connect WhatsApp
```
1. User clicks "Connect WhatsApp" → POST /whatsapp/sessions
2. System creates session (status: connecting), connects to WebSocket room
3. Baileys emits QR → pushed via WS → QR component renders
4. User scans QR with phone
5. WS receives connection event → status changes to "connected"
6. UI shows green checkmark + phone number
```

### Scenario S2: Network drop + reconnect
```
1. Connected session loses network
2. Baileys emits "connection.update" with connection state "close"
3. Reconnect service waits 5s → retries
4. Connection restored → status stays "connected"
5. UI briefly shows "Reconnecting..." then returns to green
6. If 3 retries fail → status → "expired", user notified
```

### Scenario S3: Duplicate session attempt
```
1. User has active session, clicks "Connect WhatsApp" again
2. POST /whatsapp/sessions returns 409 Conflict
3. UI shows "You already have an active session. Disconnect first."
```
