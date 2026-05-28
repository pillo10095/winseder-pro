export const AI_EVENTS = {
  HOT_LEAD_DETECTED: 'ai.hot_lead.detected',
  CLASSIFY_RESULT: 'ai.classify.result',
} as const;

export interface HotLeadEventPayload {
  companyId: string;
  sessionId?: string;
  conversationId?: string;
  content: string;
  score: number;
  reason: string;
}

export interface ClassifyEventPayload {
  companyId: string;
  content: string;
  intent: string;
  confidence: number;
}
