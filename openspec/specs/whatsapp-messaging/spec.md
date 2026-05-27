# Spec: WhatsApp Messaging

## Overview
Send and receive WhatsApp messages in real-time. Inbound messages arrive via Baileys events and are persisted to the database, then relayed via Socket.io. Outbound messages are sent via REST API through the active Baileys socket.

## Dependencies
- `@whiskeysockets/baileys` — WhatsApp message events
- `socket.io` — Real-time message push to frontend
- Redis — Optional: message deduplication cache

## Functional Requirements

### FR-M1: Receive inbound message
- Baileys emits `messages.upsert` event → handler processes it
- Filter: only process `notify` type (new messages)
- Extract: messageId, from, to, content, timestamp, message type (text/image/document)
- Ignore own messages (sent from same session)
- Upsert conversation (create if new, update last_message if existing)
- Save message to `messages` table
- Emit `message:new` via WebSocket to company room
- Return acknowledgment to Baileys

### FR-M2: Send outbound message
- `POST /api/whatsapp/messages` with `{ conversationId, content, type }`
- Validate session is `connected` for this company
- If no conversationId provided, resolve or create conversation from `to` number
- Send via Baileys `sendMessage(jid, content)`
- Save sent message to `messages` table
- Update conversation `last_message`
- Emit `message:sent` via WebSocket
- Return `{ messageId, timestamp, status: "sent" }`

### FR-M3: List conversations
- `GET /api/whatsapp/conversations` — Paginated list
- Filter by company (from tenancy middleware)
- Support search by contact name or phone number
- Include last message preview + unread count per conversation
- Sort by most recent message (desc)
- Pagination: 20 per page, cursor-based

### FR-M4: Get conversation messages
- `GET /api/whatsapp/conversations/:id/messages` — Paginated
- Filter by conversation + company
- Order by timestamp (asc — oldest first)
- Pagination: 50 per page, cursor-based
- Include status indicators (sent/delivered/read/failed)

### FR-M5: Message status tracking
- Track message delivery status: `sent` → `delivered` → `read`
- Baileys emits status updates via `messages.update` event
- Update `status` column in `messages` table
- Emit `message:status` via WebSocket to update UI
- Handle failed messages with error reason

### FR-M6: Incoming media message
- On `messages.upsert` with image/document/audio type
- Extract media key and download from WhatsApp servers via Baileys
- Save media URL (local path) and media type in message record
- For MVP: save to local filesystem (`uploads/whatsapp/media/`)
- Emit `message:new` with media placeholder URL

## Non-Functional Requirements
- NFR-M1: Inbound message to UI must be < 3 seconds
- NFR-M2: Outbound message send must be < 2 seconds (excluding WhatsApp delivery)
- NFR-M3: Messages are immutable after save (no editing)

## Scenarios

### Scenario M1: Inbound message flow
```
1. Phone receives message from contact
2. Baileys emits messages.upsert (notify)
3. Handler extracts content, resolves/creates conversation
4. Message saved to messages table
5. WS emits message:new → ChatMessages component appends bubble
6. Unread badge increments on conversation list item
```

### Scenario M2: Outbound message flow
```
1. User types message in chat-input, presses send
2. POST /whatsapp/messages with content and conversationId
3. Backend validates session, sends via Baileys sendMessage
4. Message saved to DB, WS emits message:sent
5. ChatMessages shows sending bubble → delivered → read
6. On failure: bubble shows error icon with retry option
```
