import { Test, TestingModule } from '@nestjs/testing';
import { WebhookDeliveryService } from '@/modules/webhooks/services/webhook-delivery.service';
import { WebhookSignatureService } from '@/modules/webhooks/services/webhook-signature.service';
import { WebhookConfig } from '@/modules/webhooks/entities/webhook-config.entity';

describe('WebhookDeliveryService', () => {
  let service: WebhookDeliveryService;
  let signatureService: jest.Mocked<WebhookSignatureService>;

  const mockConfig = {
    id: 'wh-1',
    company_id: 'company-1',
    url: 'https://example.com/webhook',
    events: ['message.inbound'],
    is_active: true,
    secret: 'my-secret',
  } as WebhookConfig;

  beforeEach(async () => {
    signatureService = {
      sign: jest.fn().mockReturnValue('mocked-signature'),
      verify: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeliveryService,
        { provide: WebhookSignatureService, useValue: signatureService },
      ],
    }).compile();

    service = module.get<WebhookDeliveryService>(WebhookDeliveryService);
  });

  describe('deliver', () => {
    it('should deliver successfully with 200 response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const result = await service.deliver(mockConfig, 'message.inbound', { text: 'Hello' });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('should sign payload when secret is configured', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      await service.deliver(mockConfig, 'message.inbound', { text: 'Hello' });

      expect(signatureService.sign).toHaveBeenCalled();
    });

    it('should not sign payload when no secret', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      await service.deliver(
        { ...mockConfig, secret: null },
        'message.inbound',
        { text: 'Hello' },
      );

      expect(signatureService.sign).not.toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await service.deliver(mockConfig, 'message.inbound', { text: 'Hello' });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.deliver(mockConfig, 'message.inbound', { text: 'Hello' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Max retries exceeded');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should include X-Wisender headers when signed', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      await service.deliver(mockConfig, 'message.inbound', { text: 'Hello' });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers;

      expect(headers['X-Wisender-Signature']).toBe('mocked-signature');
      expect(headers['X-Wisender-Timestamp']).toBeDefined();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});
