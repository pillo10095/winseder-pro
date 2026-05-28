import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { AiAgentService } from '@/modules/ai/services/ai-agent.service';
import { AiAgent } from '@/modules/ai/entities/ai-agent.entity';
import { AiLog } from '@/modules/ai/entities/ai-log.entity';
import { AiTrainingDoc } from '@/modules/ai/entities/ai-training-doc.entity';
import { AiAgentRepository } from '@/modules/ai/repositories/ai-agent.repository';
import { AiLogRepository } from '@/modules/ai/repositories/ai-log.repository';
import { AiTrainingDocRepository } from '@/modules/ai/repositories/ai-training-doc.repository';
import { AiProviderService } from '@/modules/ai/services/ai-provider.service';

describe('AI E2E', () => {
  let agentService: AiAgentService;

  const mockAgent: Partial<AiAgent> = {
    id: 'agent-1',
    company_id: 'company-1',
    provider: 'openai',
    model: 'gpt-4o-mini',
    system_prompt: 'You are a helpful assistant',
    temperature: 0.7,
    max_tokens: 500,
    is_active: true,
    base_url: null,
  };

  const mockAgentRepo = {
    findByCompanyId: jest.fn(),
    findActiveByCompanyId: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockReturnValue(mockAgent),
    save: jest.fn().mockResolvedValue(mockAgent),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockLogRepo = {
    findByCompanyId: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDocRepo = {
    findByCompanyId: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        AiProviderService,
        { provide: AiAgentRepository, useValue: mockAgentRepo },
        { provide: AiLogRepository, useValue: mockLogRepo },
        { provide: AiTrainingDocRepository, useValue: mockDocRepo },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
        { provide: DataSource, useValue: { createQueryRunner: jest.fn(), manager: {} } },
      ],
    }).compile();

    agentService = module.get<AiAgentService>(AiAgentService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Agent Config', () => {
    it('should get or create agent for company', async () => {
      mockAgentRepo.findByCompanyId.mockResolvedValue(null);

      const agent = await agentService.getOrCreate('company-1');

      expect(agent).toBeDefined();
      expect(mockAgentRepo.create).toHaveBeenCalled();
    });

    it('should return existing agent', async () => {
      mockAgentRepo.findByCompanyId.mockResolvedValue(mockAgent);

      const agent = await agentService.getOrCreate('company-1');

      expect(agent).toEqual(mockAgent);
      expect(mockAgentRepo.create).not.toHaveBeenCalled();
    });

    it('should update agent configuration', async () => {
      mockAgentRepo.findByCompanyId.mockResolvedValue(mockAgent);

      await agentService.update('company-1', {
        model: 'gpt-4',
        temperature: 0.5,
      });

      expect(mockAgentRepo.save).toHaveBeenCalled();
    });

    it('should support deepseek provider via base_url', async () => {
      // First create agent, then update with deepseek base_url
      mockAgentRepo.findByCompanyId.mockResolvedValue(null);
      const agent = await agentService.getOrCreate('company-1');

      mockAgentRepo.findByCompanyId.mockResolvedValue({ ...agent, base_url: null });

      await agentService.update('company-1', {
        provider: 'openai',
        model: 'deepseek-chat',
        base_url: 'https://api.deepseek.com/v1',
      });

      const savedCall = mockAgentRepo.save.mock.calls[mockAgentRepo.save.mock.calls.length - 1][0];
      expect(savedCall.base_url).toBe('https://api.deepseek.com/v1');
    });
  });

  describe('Agent Chat', () => {
    it('should require an active agent for chat', async () => {
      mockAgentRepo.findActiveByCompanyId.mockResolvedValue(null);

      await expect(
        agentService.chat('company-1', 'Hello'),
      ).rejects.toThrow();
    });
  });
});
