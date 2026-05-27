import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';

@Injectable()
export class WebhookSignatureService {
  /**
   * Sign a JSON payload with HMAC-SHA256 using the webhook secret.
   * Returns the hex-encoded signature.
   */
  sign(payload: unknown, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Verify an incoming signature against a payload.
   */
  verify(payload: unknown, secret: string, signature: string): boolean {
    const expected = this.sign(payload, secret);
    return expected === signature;
  }
}
