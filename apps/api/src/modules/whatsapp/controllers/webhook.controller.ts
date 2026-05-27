import { Controller, Logger, Post, Req } from '@nestjs/common';
import { Request } from 'express';

/**
 * Webhook endpoint for Baileys events.
 * Used as a fallback/alternative to WebSocket for receiving events.
 */
@Controller('whatsapp/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  @Post()
  async handleWebhook(@Req() req: Request) {
    const body = req.body;
    this.logger.debug('Webhook received:', body);

    // TODO: Process webhook event based on type
    // - message: new message received
    // - status: message status update
    // - connection: connection state change

    return { status: 'ok' };
  }
}
