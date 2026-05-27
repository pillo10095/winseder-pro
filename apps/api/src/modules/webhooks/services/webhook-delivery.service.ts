import { Injectable, Logger } from '@nestjs/common';

import { WebhookConfig } from '../entities/webhook-config.entity';
import { WebhookSignatureService } from './webhook-signature.service';

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 10_000;

  constructor(private readonly signature: WebhookSignatureService) {}

  /**
   * Deliver an event to a single webhook endpoint with retries.
   */
  async deliver(config: WebhookConfig, event: string, payload: unknown): Promise<DeliveryResult> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      const result = await this.tryDeliver(config, event, payload);
      if (result.success) return result;

      this.logger.warn(
        `Webhook delivery attempt ${attempt}/${this.MAX_RETRIES} failed for ${config.url}: ${result.error}`,
      );

      if (attempt < this.MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  private async tryDeliver(
    config: WebhookConfig,
    event: string,
    payload: unknown,
  ): Promise<DeliveryResult> {
    try {
      const body = { event, data: payload };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Wisender-Webhook/1.0',
      };

      // Sign payload if secret is configured
      if (config.secret) {
        headers['X-Wisender-Signature'] = this.signature.sign(body, config.secret);
        headers['X-Wisender-Timestamp'] = String(Math.floor(Date.now() / 1000));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return { success: true, statusCode: response.status };
      }

      return { success: false, statusCode: response.status, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
