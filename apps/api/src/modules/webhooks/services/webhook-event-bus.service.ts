import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MESSAGE_EVENTS, MessageEventPayload } from '../../whatsapp/services/message-relay.service';
import { WebhookConfigRepository } from '../repositories/webhook-config.repository';
import { WebhookDeliveryService } from './webhook-delivery.service';

export const WEBHOOK_EVENTS = {
  MESSAGE_INBOUND: 'message.inbound',
  MESSAGE_OUTBOUND: 'message.outbound',
} as const;

@Injectable()
export class WebhookEventBusService {
  private readonly logger = new Logger(WebhookEventBusService.name);

  constructor(
    private readonly webhookRepo: WebhookConfigRepository,
    private readonly delivery: WebhookDeliveryService,
  ) {}

  @OnEvent(MESSAGE_EVENTS.INBOUND)
  async handleInboundMessage(payload: MessageEventPayload): Promise<void> {
    await this.dispatch(WEBHOOK_EVENTS.MESSAGE_INBOUND, payload);
  }

  @OnEvent(MESSAGE_EVENTS.OUTBOUND)
  async handleOutboundMessage(payload: MessageEventPayload): Promise<void> {
    await this.dispatch(WEBHOOK_EVENTS.MESSAGE_OUTBOUND, payload);
  }

  private async dispatch(event: string, payload: unknown): Promise<void> {
    try {
      const configs = await this.webhookRepo.findActiveByEvent(event);

      if (configs.length === 0) return;

      await Promise.allSettled(
        configs.map((config) =>
          this.delivery.deliver(config, event, payload).catch((err) => {
            this.logger.error(`Webhook delivery error for ${config.url}: ${err.message}`);
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to dispatch webhook event ${event}: ${(error as Error).message}`);
    }
  }
}
