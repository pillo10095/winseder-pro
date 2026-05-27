# Proposal: WhatsApp Integration

## Intent
Connect WhatsApp Business API (via Baileys) to the platform so users can receive and reply to messages in real-time. Multi-session, one session per company, with automatic reconnection and basic anti-ban protection.

## Scope

### In Scope
- WhatsApp multi-session management (connect/disconnect/reconnect)
- QR code scanning flow via WebSocket
- Real-time message ingestion (inbound via Baileys events)
- Real-time message sending (outbound via REST → Baileys)
- In-app chat UI: conversation list, message bubbles, send input, auto-scroll
- Basic anti-ban: rate limiting, humanizer delays, health monitoring

### Out of Scope
- WhatsApp template messages (Fase 3 — Campaigns)
- Broadcast/mass messaging
- Media upload/download to CDN (MinIO deferred)
- Advanced anti-ban (session rotation, fingerprint) — covered in SA-6

## Capabilities

### New Capabilities
- `whatsapp-sessions`: Connect, disconnect, and manage WhatsApp sessions
- `whatsapp-messaging`: Send and receive WhatsApp messages in real-time
- `whatsapp-chat-ui`: Real-time chat interface in the dashboard panel

### Modified Capabilities
- None — all new capabilities

## Approach
- 6 Super-Agentes (SA) en paralelo: DB, Baileys Engine, API, WS Gateway, Frontend, Anti-Ban
- Research-first for Baileys API (delegate investigation)
- Execution in 5 sequential batches with parallel micro-agentes inside each batch
- Socket.io for real-time QR + message delivery to frontend

## Risks
- Baileys API changes: Med — pin version in package.json
- WhatsApp account ban: Med — anti-ban layer mitigates
- Socket.io scaling: Low — single-server MVP

## Rollback Plan
- Remove `whatsapp` module from NestJS imports
- Delete `whatsapp_sessions`, `messages`, `conversations` tables
- Remove WhatsApp pages from dashboard layout

## Success Criteria
- [ ] User scans QR → session connects in < 30s
- [ ] Message sent from phone → appears in chat UI in < 5s
- [ ] User sends reply from UI → contact receives it
- [ ] Session auto-reconnects on network drop
- [ ] Build passes with zero errors
