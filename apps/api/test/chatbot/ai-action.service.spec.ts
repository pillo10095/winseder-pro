jest.mock('@whiskeysockets/baileys', () => ({}));

import { Test, TestingModule } from '@nestjs/testing';
import { AiActionService } from '@/modules/chatbot/services/ai-action.service';
import { BaileysClientService } from '@/modules/whatsapp/services/baileys-client.service';
import { AiAgentService } from '@/modules/ai/services/ai-agent.service';
import { IntentClassifierService } from '@/modules/ai/services/intent-classifier.service';
import { HotLeadDetectorService } from '@/modules/ai/services/hot-lead-detector.service';
import { AiLogRepository } from '@/modules/ai/repositories/ai-log.repository';

describe('AiActionService', () => {
  let service: AiActionService;
  let baileysClient: jest.Mocked<BaileysClientService>;
  let aiAgent: jest.Mocked<AiAgentService>;
  let classifier: jest.Mocked<IntentClassifierService>;
  let hotLead: jest.Mocked<HotLeadDetectorService>;
  let logRepo: jest.Mocked<AiLogRepository>;

  const mockSocket = {
    sendMessage: jest.fn(),
  };

  const baseRequest = {
    companyId: 'company-1',
    sessionId: 'session-1',
    remoteJid: '5511999999999@s.whatsapp.net',
    content: 'Hello',
    action: { type: '', config: {} },
  };

  beforeEach(async () => {
    baileysClient = {
      getSocket: jest.fn().mockReturnValue(mockSocket),
    } as any;

    aiAgent = {
      chat: jest.fn(),
    } as any;

    classifier = {
      classify: jest.fn(),
    } as any;

    hotLead = {
      detect: jest.fn(),
    } as any;

    logRepo = {
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiActionService,
        { provide: BaileysClientService, useValue: baileysClient },
        { provide: AiAgentService, useValue: aiAgent },
        { provide: IntentClassifierService, useValue: classifier },
        { provide: HotLeadDetectorService, useValue: hotLead },
        { provide: AiLogRepository, useValue: logRepo },
      ],
    }).compile();

    service = module.get<AiActionService>(AiActionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('ai_reply', () => {
      it('should send AI reply via socket', async () => {
        aiAgent.chat.mockResolvedValue({ reply: 'AI response text' });
        mockSocket.sendMessage.mockResolvedValue(undefined);

        const result = await service.execute({
          ...baseRequest,
          action: { type: 'ai_reply', config: {} },
        });

        expect(result).toBe(true);
        expect(aiAgent.chat).toHaveBeenCalledWith('company-1', 'Hello', undefined);
        expect(mockSocket.sendMessage).toHaveBeenCalledWith(
          '5511999999999@s.whatsapp.net',
          { text: 'AI response text' },
        );
      });

      it('should pass system prompt from config', async () => {
        aiAgent.chat.mockResolvedValue({ reply: 'Reply' });
        mockSocket.sendMessage.mockResolvedValue(undefined);

        await service.execute({
          ...baseRequest,
          action: { type: 'ai_reply', config: { system_prompt: 'Be polite' } },
        });

        expect(aiAgent.chat).toHaveBeenCalledWith('company-1', 'Hello', 'Be polite');
      });

      it('should return false when socket is not found', async () => {
        baileysClient.getSocket.mockReturnValue(undefined);
        aiAgent.chat.mockResolvedValue({ reply: 'Reply' });

        const result = await service.execute({
          ...baseRequest,
          action: { type: 'ai_reply', config: {} },
        });

        expect(result).toBe(false);
        expect(mockSocket.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('ai_classify', () => {
      it('should classify intent and log result', async () => {
        classifier.classify.mockResolvedValue({ intent: 'compra', confidence: 0.95 });
        logRepo.save.mockResolvedValue(undefined as any);

        const result = await service.execute({
          ...baseRequest,
          action: { type: 'ai_classify', config: {} },
        });

        expect(result).toBe(true);
        expect(classifier.classify).toHaveBeenCalledWith('company-1', 'Hello');
        expect(logRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            company_id: 'company-1',
            type: 'automation_classify',
            prompt: 'Hello',
          }),
        );
      });
    });

    describe('ai_hot_lead', () => {
      it('should detect hot lead', async () => {
        hotLead.detect.mockResolvedValue({
          isHot: true,
          score: 0.85,
          reason: 'Buying intent detected',
        });

        const result = await service.execute({
          ...baseRequest,
          action: { type: 'ai_hot_lead', config: {} },
        });

        expect(result).toBe(true);
        expect(hotLead.detect).toHaveBeenCalledWith('company-1', 'Hello', {
          sessionId: 'session-1',
          conversationId: '5511999999999@s.whatsapp.net',
        });
      });
    });

    describe('unknown action', () => {
      it('should return false for unknown action type', async () => {
        const result = await service.execute({
          ...baseRequest,
          action: { type: 'unknown_type' as any, config: {} },
        });

        expect(result).toBe(false);
      });
    });

    describe('error states due to return-vs-return-await pattern', () => {
      it('should reject when sendMessage fails (not caught by try/catch)', async () => {
        aiAgent.chat.mockResolvedValue({ reply: 'Reply' });
        mockSocket.sendMessage.mockRejectedValue(new Error('Send failed'));

        await expect(
          service.execute({
            ...baseRequest,
            action: { type: 'ai_reply', config: {} },
          }),
        ).rejects.toThrow('Send failed');
      });

      it('should reject when aiAgent.chat throws', async () => {
        aiAgent.chat.mockRejectedValue(new Error('Chat error'));

        await expect(
          service.execute({
            ...baseRequest,
            action: { type: 'ai_reply', config: {} },
          }),
        ).rejects.toThrow('Chat error');
      });

      it('should reject when classify fails', async () => {
        classifier.classify.mockRejectedValue(new Error('Classification failed'));

        await expect(
          service.execute({
            ...baseRequest,
            action: { type: 'ai_classify', config: {} },
          }),
        ).rejects.toThrow('Classification failed');
      });

      it('should reject when hot lead detection fails', async () => {
        hotLead.detect.mockRejectedValue(new Error('Detection failed'));

        await expect(
          service.execute({
            ...baseRequest,
            action: { type: 'ai_hot_lead', config: {} },
          }),
        ).rejects.toThrow('Detection failed');
      });
    });
  });
});
