/**
 * WebSocket event names for WhatsApp module.
 *
 * Backend → Frontend (server emits)
 * Prefix: 'wa:'
 */
export const WS_EVENTS = {
  /** QR code generated for scanning */
  QR_GENERATED: 'wa:qr:generated',
  /** QR code expired */
  QR_EXPIRED: 'wa:qr:expired',
  /** Session status changed */
  SESSION_STATUS: 'wa:session:status',
  /** Session health update */
  SESSION_HEALTH: 'wa:session:health',
  /** New message received */
  MESSAGE_NEW: 'wa:message:new',
  /** Message status changed (sent → delivered → read → failed) */
  MESSAGE_STATUS: 'wa:message:status',
} as const;

/**
 * Frontend → Backend (client emits)
 * Prefix: 'wa:'
 */
export const WS_CLIENT_EVENTS = {
  /** Request QR regeneration */
  REQUEST_QR: 'wa:request:qr',
  /** Request session status */
  REQUEST_STATUS: 'wa:request:status',
} as const;

export interface WsQrGeneratedPayload {
  sessionId: string;
  qrDataUrl: string;
  expiresAt: string;
}

export interface WsSessionStatusPayload {
  sessionId: string;
  status: string;
  phoneNumber?: string;
  lastSeen?: string;
}

export interface WsMessageNewPayload {
  sessionId: string;
  conversationId: string;
  messageId: string;
  content: string;
  type: string;
  fromMe: boolean;
  timestamp: string;
}

export interface WsMessageStatusPayload {
  sessionId: string;
  messageId: string;
  status: string;
  timestamp: string;
}
