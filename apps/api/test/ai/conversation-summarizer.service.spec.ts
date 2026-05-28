import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { ConversationSummarizerService } from '@/modules/ai/services/conversation-summarizer.service';
import { AiAgentRepository } from '@/modules/ai/repositories/ai-agent.repository';
import { AiLogRepository } from '@/modules/ai/repositories/ai-log.repository';
import { AiProviderService } from '@/modules/ai/services/ai-provider.service';
import { AiAgent } from '@/modules/ai/entities/ai-agent.entity';

describe('ConversationSummarizerService', () => {
  let service: ConversationSummarizerService;
  let agentRepo: jest.Mocked<AiAgentRepository>;
  let logRepo: jest.Mocked<AiLogRepository>;
  let provider: jest.Mocked<AiProviderService>;

  const mockAgent = {
    id: 'agent-1',
    company_id: 'company-1',
    is_active: true,
    model: 'gpt-4o-mini',
    api_key: 'sk-test',
    base_url: null,
  } as AiAgent;

  beforeEach(async () => {
    agentRepo = {
      findActiveByCompanyId: jest.fn(),
    } as any;

    logRepo = {
      save: jest.fn(),
    } as any;

    provider = {
      summarize: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationSummarizerService,
        { provide: AiAgentRepository, useValue: agentRepo },
        { provide: AiLogRepository, useValue: logRepo },
        { provide: AiProviderService, useValue: provider },
      ],
    }).compile();

    service = module.get<ConversationSummarizerService>(ConversationSummarizerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('summarize', () => {
    const conversationText = 'Customer said A, agent replied B';

    it('should return summary and keyPoints from provider', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.summarize.mockResolvedValue({
        summary: 'Customer asked about pricing',
        keyPoints: ['Point 1', 'Point 2'],
      });
      logRepo.save.mockResolvedValue({} as any);

      const result = await service.summarize('company-1', conversationText);

      expect(result).toEqual({
        summary: 'Customer asked about pricing',
        keyPoints: ['Point 1', 'Point 2'],
      });
    });

    it('should call provider.summarize with the config and text', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.summarize.mockResolvedValue({
        summary: 'S',
        keyPoints: [],
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.summarize('company-1', conversationText);

      expect(provider.summarize).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'sk-test',
          model: 'gpt-4o-mini',
          temperature: 0.3,
          maxTokens: 500,
        }),
        conversationText,
      );
    });

    it('should throw BadRequestException when no active agent', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(null);

      await expect(
        service.summarize('company-1', conversationText),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when api_key is missing', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue({
        ...mockAgent,
        api_key: null,
      });

      await expect(
        service.summarize('company-1', conversationText),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log the summarize call', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.summarize.mockResolvedValue({
        summary: 'S',
        keyPoints: ['K1'],
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.summarize('company-1', conversationText);

      expect(logRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-1',
          agent_id: 'agent-1',
          type: 'summarize',
          prompt: conversationText,
        }),
      );
    });
  });
});
