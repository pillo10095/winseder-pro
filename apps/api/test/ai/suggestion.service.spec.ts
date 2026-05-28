import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { SuggestionService } from '@/modules/ai/services/suggestion.service';
import { AiAgentRepository } from '@/modules/ai/repositories/ai-agent.repository';
import { AiLogRepository } from '@/modules/ai/repositories/ai-log.repository';
import { AiProviderService } from '@/modules/ai/services/ai-provider.service';
import { AiAgent } from '@/modules/ai/entities/ai-agent.entity';

describe('SuggestionService', () => {
  let service: SuggestionService;
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
    system_prompt: 'You are a support agent',
  } as AiAgent;

  beforeEach(async () => {
    agentRepo = {
      findActiveByCompanyId: jest.fn(),
    } as any;

    logRepo = {
      save: jest.fn(),
    } as any;

    provider = {
      generateSuggestions: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestionService,
        { provide: AiAgentRepository, useValue: agentRepo },
        { provide: AiLogRepository, useValue: logRepo },
        { provide: AiProviderService, useValue: provider },
      ],
    }).compile();

    service = module.get<SuggestionService>(SuggestionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('suggest', () => {
    it('should return suggestions from provider', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.generateSuggestions.mockResolvedValue([
        'Can you tell me more?',
        'Let me check that for you.',
        'I will transfer you to sales.',
      ]);
      logRepo.save.mockResolvedValue({} as any);

      const result = await service.suggest('company-1', 'I need help');

      expect(result).toEqual({
        suggestions: [
          'Can you tell me more?',
          'Let me check that for you.',
          'I will transfer you to sales.',
        ],
      });
    });

    it('should include system_prompt in context messages when present', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.generateSuggestions.mockResolvedValue(['Sure!']);
      logRepo.save.mockResolvedValue({} as any);

      await service.suggest('company-1', 'I need help');

      const [, contextMessages] = (provider.generateSuggestions as jest.Mock).mock.calls[0];
      expect(contextMessages[0]).toEqual({
        role: 'system',
        content: 'You are a support agent',
      });
      expect(contextMessages).toHaveLength(2);
    });

    it('should include conversation context when provided', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.generateSuggestions.mockResolvedValue(['Got it!']);
      logRepo.save.mockResolvedValue({} as any);

      await service.suggest(
        'company-1',
        'I need help',
        'Previous conversation: user asked about pricing',
      );

      const [, contextMessages] = (provider.generateSuggestions as jest.Mock).mock.calls[0];
      expect(contextMessages).toHaveLength(3);
      expect(contextMessages[1].content).toContain('Previous conversation');
    });

    it('should work without system_prompt', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue({
        ...mockAgent,
        system_prompt: null,
      });
      provider.generateSuggestions.mockResolvedValue(['OK']);
      logRepo.save.mockResolvedValue({} as any);

      await service.suggest('company-1', 'Hi');

      const [, contextMessages] = (provider.generateSuggestions as jest.Mock).mock.calls[0];
      expect(contextMessages).toHaveLength(1);
    });

    it('should throw BadRequestException when no active agent', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(null);

      await expect(
        service.suggest('company-1', 'Hi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when api_key is missing', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue({
        ...mockAgent,
        api_key: null,
      });

      await expect(
        service.suggest('company-1', 'Hi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log the suggest call', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.generateSuggestions.mockResolvedValue(['Reply A', 'Reply B']);
      logRepo.save.mockResolvedValue({} as any);

      await service.suggest('company-1', 'Hello');

      expect(logRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-1',
          agent_id: 'agent-1',
          type: 'suggest',
          prompt: 'Hello',
          response: JSON.stringify(['Reply A', 'Reply B']),
        }),
      );
    });
  });
});
