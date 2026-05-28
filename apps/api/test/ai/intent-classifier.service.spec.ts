import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { IntentClassifierService } from '@/modules/ai/services/intent-classifier.service';
import { AiAgentRepository } from '@/modules/ai/repositories/ai-agent.repository';
import { AiLogRepository } from '@/modules/ai/repositories/ai-log.repository';
import { AiProviderService } from '@/modules/ai/services/ai-provider.service';
import { AiAgent } from '@/modules/ai/entities/ai-agent.entity';

describe('IntentClassifierService', () => {
  let service: IntentClassifierService;
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
      classify: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntentClassifierService,
        { provide: AiAgentRepository, useValue: agentRepo },
        { provide: AiLogRepository, useValue: logRepo },
        { provide: AiProviderService, useValue: provider },
      ],
    }).compile();

    service = module.get<IntentClassifierService>(IntentClassifierService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('classify', () => {
    it('should return intent and confidence', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.classify.mockResolvedValue({
        label: 'compra',
        confidence: 0.95,
      });
      logRepo.save.mockResolvedValue({} as any);

      const result = await service.classify('company-1', 'Quiero comprar');

      expect(result).toEqual({ intent: 'compra', confidence: 0.95 });
    });

    it('should call provider.classify with default labels', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.classify.mockResolvedValue({
        label: 'soporte',
        confidence: 0.8,
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.classify('company-1', 'Necesito ayuda');

      expect(provider.classify).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'sk-test',
          temperature: 0,
          maxTokens: 100,
        }),
        'Necesito ayuda',
        ['compra', 'soporte', 'reclamo', 'consulta', 'otro'],
      );
    });

    it('should throw BadRequestException when no active agent', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(null);

      await expect(
        service.classify('company-1', 'Hola'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when api_key is missing', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue({
        ...mockAgent,
        api_key: null,
      });

      await expect(
        service.classify('company-1', 'Hola'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log the classify call', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.classify.mockResolvedValue({
        label: 'consulta',
        confidence: 0.7,
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.classify('company-1', 'Tengo una duda');

      expect(logRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-1',
          agent_id: 'agent-1',
          type: 'classify',
          prompt: 'Tengo una duda',
          response: JSON.stringify({ label: 'consulta', confidence: 0.7 }),
        }),
      );
    });
  });
});
