jest.mock('@whiskeysockets/baileys', () => ({}));

import { Test, TestingModule } from '@nestjs/testing';
import { AutoReplyService } from '@/modules/chatbot/services/auto-reply.service';
import { AiActionService } from '@/modules/chatbot/services/ai-action.service';
import { AiHookService } from '@/modules/chatbot/services/ai-hook.service';
import { BaileysClientService } from '@/modules/whatsapp/services/baileys-client.service';
import { RuleAction } from '@/modules/chatbot/entities/automation-rule.entity';

describe('AutoReplyService', () => {
  let service: AutoReplyService;
  let baileysClient: jest.Mocked<BaileysClientService>;
  let aiHook: jest.Mocked<AiHookService>;

  const mockSocket = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    baileysClient = {
      getSocket: jest.fn().mockReturnValue(mockSocket),
    } as any;

    aiHook = {
      forwardToAi: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoReplyService,
        { provide: BaileysClientService, useValue: baileysClient },
        { provide: AiHookService, useValue: aiHook },
        { provide: AiActionService, useValue: { executeAction: jest.fn() } },
      ],
    }).compile();

    service = module.get<AutoReplyService>(AutoReplyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const baseRequest = {
    sessionId: 'session-1',
    remoteJid: '5511999999999@s.whatsapp.net',
    content: 'Hello',
  };

  describe('reply.text', () => {
    it('should send text message', async () => {
      mockSocket.sendMessage.mockResolvedValue(undefined);

      const result = await service.execute({
        ...baseRequest,
        action: { type: 'reply.text', config: { text: 'Hi there!' } },
      });

      expect(result).toBe(true);
      expect(mockSocket.sendMessage).toHaveBeenCalledWith(baseRequest.remoteJid, {
        text: 'Hi there!',
      });
    });

    it('should support config.message alias', async () => {
      mockSocket.sendMessage.mockResolvedValue(undefined);

      await service.execute({
        ...baseRequest,
        action: { type: 'reply.text', config: { message: 'Hello back' } },
      });

      expect(mockSocket.sendMessage).toHaveBeenCalledWith(baseRequest.remoteJid, {
        text: 'Hello back',
      });
    });

    it('should return false if no text content', async () => {
      const result = await service.execute({
        ...baseRequest,
        action: { type: 'reply.text', config: {} },
      });

      expect(result).toBe(false);
      expect(mockSocket.sendMessage).not.toHaveBeenCalled();
    });

    it('should return false if socket not found', async () => {
      baileysClient.getSocket.mockReturnValue(undefined);

      const result = await service.execute({
        ...baseRequest,
        action: { type: 'reply.text', config: { text: 'Hi' } },
      });

      expect(result).toBe(false);
    });
  });

  describe('reply.image', () => {
    it('should send image message', async () => {
      const mockBuffer = Buffer.from('fake-image');
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(mockBuffer),
      });
      mockSocket.sendMessage.mockResolvedValue(undefined);

      const result = await service.execute({
        ...baseRequest,
        action: { type: 'reply.image', config: { url: 'https://example.com/img.jpg', caption: 'Look!' } },
      });

      expect(result).toBe(true);
      expect(mockSocket.sendMessage).toHaveBeenCalledWith(baseRequest.remoteJid, {
        image: mockBuffer,
        caption: 'Look!',
      });
    });

    it('should return false if no image URL', async () => {
      const result = await service.execute({
        ...baseRequest,
        action: { type: 'reply.image', config: {} },
      });

      expect(result).toBe(false);
    });
  });

  describe('ai_hook', () => {
    it('should forward to AI endpoint', async () => {
      const result = await service.execute({
        ...baseRequest,
        action: { type: 'ai_hook', config: { endpoint: 'https://ai.example.com/webhook' } },
      });

      expect(result).toBe(true);
      expect(aiHook.forwardToAi).toHaveBeenCalledWith('https://ai.example.com/webhook', {
        sessionId: 'session-1',
        remoteJid: '5511999999999@s.whatsapp.net',
        message: 'Hello',
        config: { endpoint: 'https://ai.example.com/webhook' },
      });
    });

    it('should return false if no endpoint', async () => {
      const result = await service.execute({
        ...baseRequest,
        action: { type: 'ai_hook', config: {} },
      });

      expect(result).toBe(false);
      expect(aiHook.forwardToAi).not.toHaveBeenCalled();
    });
  });

  describe('webhook', () => {
    it('should return true (dispatched elsewhere)', async () => {
      const result = await service.execute({
        ...baseRequest,
        action: { type: 'webhook', config: {} },
      });

      expect(result).toBe(true);
    });
  });

  describe('unknown action', () => {
    it('should return false gracefully', async () => {
      const result = await service.execute({
        ...baseRequest,
        action: { type: 'unknown_type' as any, config: {} },
      });

      expect(result).toBe(false);
    });
  });
});
