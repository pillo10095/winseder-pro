import { WebhookSignatureService } from '@/modules/webhooks/services/webhook-signature.service';

describe('WebhookSignatureService', () => {
  let service: WebhookSignatureService;

  beforeEach(() => {
    service = new WebhookSignatureService();
  });

  it('should sign a payload and return hex string', () => {
    const payload = { event: 'message.inbound', data: { text: 'Hello' } };
    const signature = service.sign(payload, 'my-secret');

    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(64); // SHA-256 hex = 64 chars
  });

  it('should produce deterministic signatures', () => {
    const payload = { foo: 'bar' };
    const sig1 = service.sign(payload, 'secret');
    const sig2 = service.sign(payload, 'secret');

    expect(sig1).toBe(sig2);
  });

  it('should produce different signatures for different secrets', () => {
    const payload = { foo: 'bar' };
    const sig1 = service.sign(payload, 'secret-1');
    const sig2 = service.sign(payload, 'secret-2');

    expect(sig1).not.toBe(sig2);
  });

  it('should verify a valid signature', () => {
    const payload = { event: 'test' };
    const signature = service.sign(payload, 'secret');

    expect(service.verify(payload, 'secret', signature)).toBe(true);
  });

  it('should reject an invalid signature', () => {
    const payload = { event: 'test' };

    expect(service.verify(payload, 'secret', 'invalid-signature')).toBe(false);
  });
});
