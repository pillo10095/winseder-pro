import { Test, TestingModule } from '@nestjs/testing';
import { AiEventListenerService } from '@/modules/ai/services/ai-event-listener.service';
import { WebhookConfigRepository } from '@/modules/webhooks/repositories/webhook-config.repository';
import { HotLeadEventPayload } from '@/modules/ai/ai.events';

describe('AiEventListenerService', () => {
  let service: AiEventListenerService;
  let webhookRepo: jest.Mocked<WebhookConfigRepository>;

  const payload: HotLeadEventPayload = {
    companyId: 'company-1',
    content: 'I want to buy everything',
    score: 95,
    reason: 'High buying intent detected',
    sessionId: 'session-1',
    conversationId: 'conv-1',
  };

  beforeEach(async () => {
    webhookRepo = {
      findActiveByEvent: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiEventListenerService,
        { provide: WebhookConfigRepository, useValue: webhookRepo },
      ],
    }).compile();

    service = module.get<AiEventListenerService>(AiEventListenerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onHotLeadDetected', () => {
    it('should dispatch to active webhooks', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      webhookRepo.findActiveByEvent.mockResolvedValue([
        { id: 'wh-1', url: 'https://hook.example.com/a', events: ['ai.hot_lead'], is_active: true } as any,
        { id: 'wh-2', url: 'https://hook.example.com/b', events: ['ai.hot_lead'], is_active: true } as any,
      ]);

      await service.onHotLeadDetected(payload);

      expect(webhookRepo.findActiveByEvent).toHaveBeenCalledWith('ai.hot_lead');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hook.example.com/a',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should send correct payload structure', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      webhookRepo.findActiveByEvent.mockResolvedValue([
        { id: 'wh-1', url: 'https://hook.example.com/a', events: ['ai.hot_lead'], is_active: true } as any,
      ]);

      await service.onHotLeadDetected(payload);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({
        event: 'ai.hot_lead',
        data: {
          company_id: 'company-1',
          score: 95,
          reason: 'High buying intent detected',
          content: 'I want to buy everything',
          session_id: 'session-1',
          conversation_id: 'conv-1',
        },
      });
    });

    it('should handle no webhooks gracefully', async () => {
      webhookRepo.findActiveByEvent.mockResolvedValue([]);

      await expect(
        service.onHotLeadDetected(payload),
      ).resolves.not.toThrow();
    });

    it('should not throw when a webhook fetch fails (silent catch)', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'));

      webhookRepo.findActiveByEvent.mockResolvedValue([
        { id: 'wh-1', url: 'https://hook.example.com/a', events: ['ai.hot_lead'], is_active: true } as any,
      ]);

      await expect(
        service.onHotLeadDetected(payload),
      ).resolves.not.toThrow();
    });

    it('should include optional fields when present', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      webhookRepo.findActiveByEvent.mockResolvedValue([
        { id: 'wh-1', url: 'https://hook.example.com/a', events: ['ai.hot_lead'], is_active: true } as any,
      ]);

      const minimalPayload: HotLeadEventPayload = {
        companyId: 'company-1',
        content: 'test',
        score: 50,
        reason: 'maybe',
      };

      await service.onHotLeadDetected(minimalPayload);

      const sent = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(sent.data.session_id).toBeUndefined();
      expect(sent.data.conversation_id).toBeUndefined();
    });
  });
});
