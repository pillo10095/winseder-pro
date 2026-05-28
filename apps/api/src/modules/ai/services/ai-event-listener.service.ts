import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AI_EVENTS, HotLeadEventPayload } from '../ai.events';
import { WebhookConfigRepository } from '../../webhooks/repositories/webhook-config.repository';
import { IntentClassifierService } from './intent-classifier.service';

@Injectable()
export class AiEventListenerService {
  private readonly logger = new Logger(AiEventListenerService.name);

  constructor(
    private readonly webhookRepo: WebhookConfigRepository,
  ) {}

  @OnEvent(AI_EVENTS.HOT_LEAD_DETECTED)
  async onHotLeadDetected(payload: HotLeadEventPayload): Promise<void> {
    this.logger.warn(
      `🔥 Hot lead detected (score: ${payload.score}): ${payload.reason}`,
    );

    // Dispatch to webhooks that subscribe to 'ai.hot_lead'
    const webhooks = await this.webhookRepo.findActiveByEvent('ai.hot_lead');
    for (const wh of webhooks) {
      fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'ai.hot_lead',
          data: {
            company_id: payload.companyId,
            score: payload.score,
            reason: payload.reason,
            content: payload.content,
            session_id: payload.sessionId,
            conversation_id: payload.conversationId,
          },
        }),
      }).catch(() => {
        // silent
      });
    }
  }
}
