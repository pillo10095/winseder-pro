import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AiAgentService } from '@/modules/ai/services/ai-agent.service';
import { AiAgentRepository } from '@/modules/ai/repositories/ai-agent.repository';
import { AiLogRepository } from '@/modules/ai/repositories/ai-log.repository';
import { AiProviderService } from '@/modules/ai/services/ai-provider.service';
import { AiAgent } from '@/modules/ai/entities/ai-agent.entity';

describe('AiAgentService', () => {
  let service: AiAgentService;
  let agentRepo: jest.Mocked<AiAgentRepository>;
  let logRepo: jest.Mocked<AiLogRepository>;
  let provider: jest.Mocked<AiProviderService>;

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
  } as AiAgent;

  beforeEach(async () => {
    agentRepo = {
      findByCompanyId: jest.fn(),
      findActiveByCompanyId: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    logRepo = {
      save: jest.fn(),
    } as any;

    provider = {
      chat: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        { provide: AiAgentRepository, useValue: agentRepo },
        { provide: AiLogRepository, useValue: logRepo },
        { provide: AiProviderService, useValue: provider },
        { provide: getDataSourceToken(), useValue: {} as DataSource },
      ],
    }).compile();

    service = module.get<AiAgentService>(AiAgentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreate', () => {
    it('should return existing agent when found', async () => {
      agentRepo.findByCompanyId.mockResolvedValue(mockAgent);

      const result = await service.getOrCreate('company-1');

      expect(result).toBe(mockAgent);
      expect(agentRepo.create).not.toHaveBeenCalled();
    });

    it('should create a new agent when not found', async () => {
      agentRepo.findByCompanyId.mockResolvedValue(null);
      agentRepo.create.mockReturnValue({ company_id: 'company-1' } as AiAgent);
      agentRepo.save.mockResolvedValue(mockAgent);

      const result = await service.getOrCreate('company-1');

      expect(agentRepo.create).toHaveBeenCalledWith({ company_id: 'company-1' });
      expect(agentRepo.save).toHaveBeenCalled();
      expect(result).toBe(mockAgent);
    });
  });

  describe('update', () => {
    it('should update and return agent', async () => {
      agentRepo.findByCompanyId.mockResolvedValue(mockAgent);
      agentRepo.save.mockResolvedValue({ ...mockAgent, model: 'gpt-4' });

      const result = await service.update('company-1', { model: 'gpt-4' });

      expect(result.model).toBe('gpt-4');
      expect(agentRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when agent does not exist', async () => {
      agentRepo.findByCompanyId.mockResolvedValue(null);

      await expect(
        service.update('company-1', { model: 'gpt-4' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('chat', () => {
    it('should return reply from provider', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.chat.mockResolvedValue({
        content: 'Hello! How can I help?',
        tokensUsed: 30,
        durationMs: 200,
      });
      logRepo.save.mockResolvedValue({} as any);

      const result = await service.chat('company-1', 'Hi');

      expect(result).toEqual({ reply: 'Hello! How can I help?' });
      expect(provider.chat).toHaveBeenCalled();
      expect(logRepo.save).toHaveBeenCalled();
    });

    it('should include system_prompt as system message when present', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.chat.mockResolvedValue({
        content: 'Reply',
        tokensUsed: 10,
        durationMs: 100,
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.chat('company-1', 'Hi');

      const [, messages] = (provider.chat as jest.Mock).mock.calls[0];
      expect(messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant',
      });
    });

    it('should include conversation context when provided', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.chat.mockResolvedValue({
        content: 'Reply',
        tokensUsed: 10,
        durationMs: 100,
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.chat('company-1', 'Hi', 'Previous context');

      const [, messages] = (provider.chat as jest.Mock).mock.calls[0];
      expect(messages).toHaveLength(3);
      expect(messages[1].content).toContain('Previous context');
    });

    it('should throw BadRequestException when no active agent', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(null);

      await expect(
        service.chat('company-1', 'Hi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when api_key is missing', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue({
        ...mockAgent,
        api_key: null,
      });

      await expect(
        service.chat('company-1', 'Hi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log chat to AiLogRepository', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.chat.mockResolvedValue({
        content: 'Reply',
        tokensUsed: 15,
        durationMs: 300,
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.chat('company-1', 'Hello');

      expect(logRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-1',
          agent_id: 'agent-1',
          type: 'chat',
          prompt: 'Hello',
          response: 'Reply',
          tokens_used: 15,
        }),
      );
    });
  });
});
