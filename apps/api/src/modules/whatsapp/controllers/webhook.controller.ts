import { Controller, Logger, Post, Req } from '@nestjs/common';
import { Request } from 'express';

/**
 * Webhook endpoint for Baileys events.
 * Used as a fallback/alternative to WebSocket for receiving events.
 *
 * Intentionally public — Meta/WhatsApp callbacks cannot carry a JWT.
 * TODO: Add IP allow-list (Meta published IP ranges) and HMAC signature
 * validation once the upstream sender is confirmed and documented.
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
