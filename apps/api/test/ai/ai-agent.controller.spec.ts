import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AiAgentController } from '@/modules/ai/controllers/ai-agent.controller';
import { AiAgentService } from '@/modules/ai/services/ai-agent.service';
import { IntentClassifierService } from '@/modules/ai/services/intent-classifier.service';
import { SuggestionService } from '@/modules/ai/services/suggestion.service';
import { ConversationSummarizerService } from '@/modules/ai/services/conversation-summarizer.service';
import { HotLeadDetectorService } from '@/modules/ai/services/hot-lead-detector.service';
import { RagService } from '@/modules/ai/services/rag.service';
import { AiLogRepository } from '@/modules/ai/repositories/ai-log.repository';

const mockAgent = {
  id: 'agent-1',
  company_id: 'company-1',
  is_active: true,
  provider: 'openai',
  model: 'gpt-4o-mini',
  api_key: 'sk-test',
  base_url: null,
  system_prompt: 'You are a helpful assistant',
  temperature: 0.7,
  max_tokens: 500,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('AiAgentController', () => {
  let controller: AiAgentController;

  const mockAgentService = {
    getOrCreate: jest.fn(),
    update: jest.fn(),
    chat: jest.fn(),
  };

  const mockClassifier = {
    classify: jest.fn(),
  };

  const mockSuggestion = {
    suggest: jest.fn(),
  };

  const mockSummarizer = {
    summarize: jest.fn(),
  };

  const mockHotLeadDetector = {
    detect: jest.fn(),
  };

  const mockRagService = {
    answer: jest.fn(),
  };

  const mockLogRepo = {
    findByCompanyId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiAgentController],
      providers: [
        { provide: AiAgentService, useValue: mockAgentService },
        { provide: IntentClassifierService, useValue: mockClassifier },
        { provide: SuggestionService, useValue: mockSuggestion },
        { provide: ConversationSummarizerService, useValue: mockSummarizer },
        { provide: HotLeadDetectorService, useValue: mockHotLeadDetector },
        { provide: RagService, useValue: mockRagService },
        { provide: AiLogRepository, useValue: mockLogRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<AiAgentController>(AiAgentController);
  });

  const companyId = 'company-1';

  describe('getAgent', () => {
    it('should return the agent for the company', async () => {
      mockAgentService.getOrCreate.mockResolvedValue(mockAgent);

      const result = await controller.getAgent(companyId);

      expect(result).toEqual({ data: mockAgent });
      expect(mockAgentService.getOrCreate).toHaveBeenCalledWith(companyId);
    });

    it('should propagate errors from service', async () => {
      mockAgentService.getOrCreate.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAgent(companyId)).rejects.toThrow('DB error');
    });
  });

  describe('updateAgent', () => {
    const dto = { model: 'gpt-4', temperature: 0.5 };

    it('should update and return the agent', async () => {
      const updated = { ...mockAgent, ...dto };
      mockAgentService.update.mockResolvedValue(updated);

      const result = await controller.updateAgent(companyId, dto);

      expect(result).toEqual({ data: updated });
      expect(mockAgentService.update).toHaveBeenCalledWith(companyId, dto);
    });

    it('should propagate errors from service', async () => {
      mockAgentService.update.mockRejectedValue(new Error('Not found'));

      await expect(controller.updateAgent(companyId, dto)).rejects.toThrow('Not found');
    });
  });

  describe('chat', () => {
    const dto = { message: 'Hello', conversation_id: 'conv-1' };

    it('should return chat reply', async () => {
      mockAgentService.chat.mockResolvedValue({ reply: 'Hi there!' });

      const result = await controller.chat(companyId, dto);

      expect(result).toEqual({ data: { reply: 'Hi there!' } });
      expect(mockAgentService.chat).toHaveBeenCalledWith(companyId, dto.message, dto.conversation_id);
    });

    it('should work without conversation_id', async () => {
      mockAgentService.chat.mockResolvedValue({ reply: 'Hi' });

      await controller.chat(companyId, { message: 'Hello' });

      expect(mockAgentService.chat).toHaveBeenCalledWith(companyId, 'Hello', undefined);
    });
  });

  describe('classify', () => {
    const dto = { message: 'Quiero comprar' };

    it('should return classification', async () => {
      mockClassifier.classify.mockResolvedValue({ intent: 'compra', confidence: 0.95 });

      const result = await controller.classify(companyId, dto);

      expect(result).toEqual({ data: { intent: 'compra', confidence: 0.95 } });
      expect(mockClassifier.classify).toHaveBeenCalledWith(companyId, dto.message);
    });
  });

  describe('suggest', () => {
    const dto = { message: 'Cliente dice hola', conversation_context: 'prev chat' };

    it('should return suggestions', async () => {
      mockSuggestion.suggest.mockResolvedValue({ suggestions: ['Responde saludo', 'Pregunta nombre'] });

      const result = await controller.suggest(companyId, dto);

      expect(result).toEqual({ data: { suggestions: ['Responde saludo', 'Pregunta nombre'] } });
      expect(mockSuggestion.suggest).toHaveBeenCalledWith(companyId, dto.message, dto.conversation_context);
    });

    it('should work without conversation_context', async () => {
      mockSuggestion.suggest.mockResolvedValue({ suggestions: [] });

      await controller.suggest(companyId, { message: 'test' });

      expect(mockSuggestion.suggest).toHaveBeenCalledWith(companyId, 'test', undefined);
    });
  });

  describe('summarize', () => {
    it('should return summary', async () => {
      mockSummarizer.summarize.mockResolvedValue({
        summary: 'Resumen',
        keyPoints: ['Point 1'],
      });

      const result = await controller.summarize(companyId, 'long conversation');

      expect(result).toEqual({ data: { summary: 'Resumen', keyPoints: ['Point 1'] } });
      expect(mockSummarizer.summarize).toHaveBeenCalledWith(companyId, 'long conversation');
    });
  });

  describe('detectHotLead', () => {
    it('should return hot lead detection', async () => {
      mockHotLeadDetector.detect.mockResolvedValue({
        isHot: true,
        score: 0.85,
        reason: 'Buying intent detected',
      });

      const result = await controller.detectHotLead(companyId, 'Quiero comprar ahora');

      expect(result).toEqual({
        data: { isHot: true, score: 0.85, reason: 'Buying intent detected' },
      });
      expect(mockHotLeadDetector.detect).toHaveBeenCalledWith(companyId, 'Quiero comprar ahora');
    });

    it('should return not hot for neutral conversation', async () => {
      mockHotLeadDetector.detect.mockResolvedValue({
        isHot: false,
        score: 0.1,
        reason: 'No buying intent',
      });

      const result = await controller.detectHotLead(companyId, 'Gracias');

      expect(result.data.isHot).toBe(false);
    });
  });

  describe('answerWithRag', () => {
    it('should return RAG answer', async () => {
      mockRagService.answer.mockResolvedValue({ answer: 'Respuesta basada en docs' });

      const result = await controller.answerWithRag(companyId, '¿Cómo configuro?');

      expect(result).toEqual({ data: { answer: 'Respuesta basada en docs' } });
      expect(mockRagService.answer).toHaveBeenCalledWith(companyId, '¿Cómo configuro?');
    });
  });

  describe('logs', () => {
    it('should return logs with default limit', async () => {
      const logs = [{ id: 'log-1', type: 'chat' }];
      mockLogRepo.findByCompanyId.mockResolvedValue(logs);

      const result = await controller.logs(companyId);

      expect(result).toEqual({ data: logs });
      expect(mockLogRepo.findByCompanyId).toHaveBeenCalledWith(companyId, 50);
    });

    it('should accept custom limit', async () => {
      mockLogRepo.findByCompanyId.mockResolvedValue([]);

      await controller.logs(companyId, '10');

      expect(mockLogRepo.findByCompanyId).toHaveBeenCalledWith(companyId, 10);
    });

    it('should return empty array when no logs exist', async () => {
      mockLogRepo.findByCompanyId.mockResolvedValue([]);

      const result = await controller.logs(companyId);

      expect(result.data).toEqual([]);
    });
  });
});
