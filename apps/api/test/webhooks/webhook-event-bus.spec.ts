import { Test, TestingModule } from '@nestjs/testing';
import { WebhookEventBusService } from '@/modules/webhooks/services/webhook-event-bus.service';
import { WebhookDeliveryService } from '@/modules/webhooks/services/webhook-delivery.service';
import { WebhookConfigRepository } from '@/modules/webhooks/repositories/webhook-config.repository';
import { MESSAGE_EVENTS } from '@/modules/whatsapp/services/message-relay.service';
import { WebhookConfig } from '@/modules/webhooks/entities/webhook-config.entity';

describe('WebhookEventBusService', () => {
  let service: WebhookEventBusService;
  let webhookRepo: jest.Mocked<WebhookConfigRepository>;
  let delivery: jest.Mocked<WebhookDeliveryService>;

  const mockPayload = {
    sessionId: 'session-1',
    conversationId: 'conv-1',
    messageId: 'msg-1',
    content: 'Hello',
    type: 'TEXT',
    fromMe: false,
    timestamp: new Date(),
  };

  const mockConfig = {
    id: 'wh-1',
    url: 'https://example.com/webhook',
    events: ['message.inbound'],
    is_active: true,
    secret: null,
  } as WebhookConfig;

  beforeEach(async () => {
    webhookRepo = {
      findActiveByEvent: jest.fn(),
    } as any;

    delivery = {
      deliver: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookEventBusService,
        { provide: WebhookConfigRepository, useValue: webhookRepo },
        { provide: WebhookDeliveryService, useValue: delivery },
      ],
    }).compile();

    service = module.get<WebhookEventBusService>(WebhookEventBusService);
  });

  describe('handleInboundMessage', () => {
    it('should dispatch to matching webhooks', async () => {
      webhookRepo.findActiveByEvent.mockResolvedValue([mockConfig]);
      delivery.deliver.mockResolvedValue({ success: true, statusCode: 200 });

      await service.handleInboundMessage(mockPayload);

      expect(webhookRepo.findActiveByEvent).toHaveBeenCalledWith('message.inbound');
      expect(delivery.deliver).toHaveBeenCalledWith(
        mockConfig,
        'message.inbound',
        mockPayload,
      );
    });

    it('should skip when no webhooks are configured', async () => {
      webhookRepo.findActiveByEvent.mockResolvedValue([]);

      await service.handleInboundMessage(mockPayload);

      expect(delivery.deliver).not.toHaveBeenCalled();
    });

    it('should handle delivery errors gracefully', async () => {
      webhookRepo.findActiveByEvent.mockResolvedValue([mockConfig]);
      delivery.deliver.mockRejectedValue(new Error('Network error'));

      await expect(service.handleInboundMessage(mockPayload)).resolves.not.toThrow();
    });
  });

  describe('handleOutboundMessage', () => {
    it('should dispatch to matching webhooks', async () => {
      webhookRepo.findActiveByEvent.mockResolvedValue([mockConfig]);
      delivery.deliver.mockResolvedValue({ success: true, statusCode: 200 });

      await service.handleOutboundMessage(mockPayload);

      expect(webhookRepo.findActiveByEvent).toHaveBeenCalledWith('message.outbound');
    });
  });
});
