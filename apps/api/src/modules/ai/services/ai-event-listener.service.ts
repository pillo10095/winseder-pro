import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AI_EVENTS, HotLeadEventPayload } from '../ai.events';
import { WebhookConfigRepository } from '../../webhooks/repositories/webhook-config.repository';

@Injectable()
export class AiEventListenerService {
  private readonly logger = new Logger(AiEventListenerService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(
    private readonly webhookRepo: WebhookConfigRepository,
  ) {}

  @OnEvent(AI_EVENTS.HOT_LEAD_DETECTED)
  async onHotLeadDetected(payload: HotLeadEventPayload): Promise<void> {
    this.logger.warn(
      `Hot lead detected (score: ${payload.score}): ${payload.reason}`,
    );

    const webhooks = await this.webhookRepo.findActiveByEvent('ai.hot_lead');
    await Promise.allSettled(
      webhooks.map((wh) => this.dispatchWithRetry(wh.url, payload)),
    );
  }

  private async dispatchWithRetry(url: string, payload: HotLeadEventPayload, attempt = 1): Promise<void> {
    try {
      const response = await fetch(url, {
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
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        this.logger.warn(`Webhook dispatch failed (attempt ${attempt}), retrying in ${this.RETRY_DELAY_MS}ms: ${url}`);
        await new Promise((r) => setTimeout(r, this.RETRY_DELAY_MS));
        return this.dispatchWithRetry(url, payload, attempt + 1);
      }
      this.logger.error(`Webhook dispatch failed after ${this.MAX_RETRIES} attempts: ${url} — ${(error as Error).message}`);
    }
  }
}
