# Spec: WhatsApp Chat UI

## Overview
Real-time chat interface in the dashboard panel. Two main views: QR Connection screen (for first-time setup) and Chat view (inbox + thread panel). Built with shadcn components, Socket.io for real-time updates, and Zustand for state management.

## Dependencies
- `socket.io-client` — Real-time event subscription
- Zustand stores — Client-side state for sessions and chats
- shadcn/ui components — Layout, buttons, inputs, cards

## Functional Requirements

### FR-U1: QR Connect Page
- Route: `/dashboard/whatsapp/connect`
- Display QR code as image (regenerated every 30s if not scanned)
- Connection status indicator: `Connecting...` → `Scan this QR` → `Connected!` / `Expired`
- Animated pulse while waiting for scan
- Fallback: manual refresh button if QR expired
- Auto-redirect to `/dashboard/chats` on successful connection

### FR-U2: WhatsApp Settings Page
- Route: `/dashboard/whatsapp`
- Grid of session cards (one per company = usually one)
- Each card shows: status badge, phone number, last seen, device info
- Actions per card: Disconnect, View QR (if connecting)
- Empty state: "No WhatsApp connected. Connect now." → CTA button

### FR-U3: Conversation List (Sidebar)
- Left sidebar in `/dashboard/chats`
- List of conversations with: contact name, last message preview, timestamp, unread badge
- Search/filter by contact name or number
- Active conversation highlighted
- Loading skeleton while fetching
- Empty state: "No conversations yet. Send a message to get started."

### FR-U4: Chat Messages View
- Right panel in `/dashboard/chats` — selected conversation
- Message bubbles: right-aligned (sent), left-aligned (received)
- Each bubble shows: message text, timestamp, status icon (✓ ✓✓ ✓✓✓)
- Sender name/avatar (for group chats, future)
- Scroll-to-bottom on new message
- Auto-scroll unless user scrolled up (show "New messages" button)
- Date separators between days
- Loading spinner for history

### FR-U5: Chat Input
- Bottom of chat panel
- Text input with placeholder "Type a message..."
- Send button (Enter or click)
- Character counter (optional, MVP)
- Enter sends, Shift+Enter = new line
- Disabled while sending
- Error handling: show toast on failed send, retry option

### FR-U6: WebSocket Connection
- useEffect in layout connects to Socket.io on mount
- Automatic reconnection with exponential backoff
- Join company-specific room on connection
- Handle events: `qr:code`, `session:status`, `message:new`, `message:status`
- Disconnect on unmount (cleanup)
- Connection status indicator (green dot / red dot)

### FR-U7: Session Store (Zustand)
```typescript
interface SessionStore {
  sessions: Session[];
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;
  fetchSessions: () => Promise<void>;
  disconnectSession: (id: string) => Promise<void>;
  // WS-driven updates
  updateSessionStatus: (id: string, status: SessionStatus) => void;
}
```

### FR-U8: Chat Store (Zustand)
```typescript
interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (conversationId: string) => void;
  // WS-driven updates
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: string) => void;
}
```

## Non-Functional Requirements
- NFR-U1: Chat initialization (load conversations) < 2 seconds
- NFR-U2: Inbound message → bubble visible < 1 second after WS event
- NFR-U3: Offline indicator shown within 3 seconds of disconnection
- NFR-U4: Mobile-responsive (sidebar collapses, full-width chat)

## Scenarios

### Scenario U1: First-time user
```
1. User navigates to /dashboard/whatsapp
2. Empty state: "No WhatsApp connected"
3. Clicks "Connect WhatsApp"
4. QR page renders, WS pushes QR code
5. User scans with phone
6. Status changes: "Connected!" → auto-redirect to /dashboard/chats
7. Chat view shows empty state: "No conversations yet"
```

### Scenario U2: Returning user with messages
```
1. User navigates to /dashboard/chats
2. Sidebar shows conversation list with unread badges
3. Clicks conversation → messages load (oldest first)
4. Scrolls to bottom → sees latest messages
5. New message arrives via WS → bubble appears, auto-scroll
6. Types reply → sends → bubble appears with ✓
7. After delivery → ✓✓
8. After read → ✓✓✓ (blue)
```

### Scenario U3: Disconnection
```
1. User is viewing a conversation
2. Connection drops → red dot appears in corner
3. Auto-reconnect tries → "Reconnecting..." toast
4. Reconnect succeeds → green dot returns
5. If reconnection fails → session marked expired
6. User redirected to /dashboard/whatsapp to reconnect
```
