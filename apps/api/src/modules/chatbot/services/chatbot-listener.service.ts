import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MESSAGE_EVENTS, MessageEventPayload } from '../../whatsapp/services/message-relay.service';
import { AutomationRuleRepository } from '../repositories/automation-rule.repository';
import { RuleEvaluatorService } from './rule-evaluator.service';
import { AutoReplyService } from './auto-reply.service';
import { WebhookConfigRepository } from '../../webhooks/repositories/webhook-config.repository';

@Injectable()
export class ChatbotListenerService {
  private readonly logger = new Logger(ChatbotListenerService.name);

  constructor(
    private readonly ruleRepo: AutomationRuleRepository,
    private readonly webhookRepo: WebhookConfigRepository,
    private readonly evaluator: RuleEvaluatorService,
    private readonly autoReply: AutoReplyService,
  ) {}

  @OnEvent(MESSAGE_EVENTS.INBOUND)
  async handleInboundMessage(payload: MessageEventPayload): Promise<void> {
    try {
      // Only evaluate rules for inbound messages (not our own replies)
      if (payload.fromMe) return;

      const rules = await this.ruleRepo.findActiveByCompanyId(payload.sessionId);

      if (rules.length === 0) return;

      const matched = this.evaluator.evaluate(rules, {
        content: payload.content,
        senderJid: payload.conversationId,
        type: payload.type,
      });

      for (const rule of matched) {
        for (const action of rule.actions) {
          if (action.type === 'webhook') {
            // Dispatch to webhooks that subscribe to 'message.inbound'
            const webhooks = await this.webhookRepo.findActiveByEvent('message.inbound');
            // Fire and forget
            webhooks.forEach((wh) => {
              const url = action.config.url || wh.url;
              if (url) {
                fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ event: 'message.inbound', data: payload }),
                }).catch(() => {
                  // silent
                });
              }
            });
          } else {
            await this.autoReply.execute({
              sessionId: payload.sessionId,
              remoteJid: payload.conversationId,
              content: payload.content,
              action,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Chatbot listener error: ${(error as Error).message}`);
    }
  }
}
