import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { RagService } from '@/modules/ai/services/rag.service';
import { AiAgentRepository } from '@/modules/ai/repositories/ai-agent.repository';
import { AiTrainingDocRepository } from '@/modules/ai/repositories/ai-training-doc.repository';
import { AiLogRepository } from '@/modules/ai/repositories/ai-log.repository';
import { AiProviderService } from '@/modules/ai/services/ai-provider.service';
import { AiAgent } from '@/modules/ai/entities/ai-agent.entity';
import { AiTrainingDoc } from '@/modules/ai/entities/ai-training-doc.entity';

describe('RagService', () => {
  let service: RagService;
  let agentRepo: jest.Mocked<AiAgentRepository>;
  let docRepo: jest.Mocked<AiTrainingDocRepository>;
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

    docRepo = {
      findByCompanyId: jest.fn(),
    } as any;

    logRepo = {
      save: jest.fn(),
    } as any;

    provider = {
      answerWithContext: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: AiAgentRepository, useValue: agentRepo },
        { provide: AiTrainingDocRepository, useValue: docRepo },
        { provide: AiLogRepository, useValue: logRepo },
        { provide: AiProviderService, useValue: provider },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('answer', () => {
    it('should return answer from provider with relevant chunks', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      docRepo.findByCompanyId.mockResolvedValue([
        {
          id: 'doc-1',
          company_id: 'company-1',
          title: 'Pricing',
          content: 'Our premium plan costs $99 per month with full support.',
          chunks: [
            'Our premium plan costs $99 per month with full support.',
            'Basic plan is $49.',
          ],
          content_type: 'text',
          created_at: new Date(),
        } as AiTrainingDoc,
      ]);
      provider.answerWithContext.mockResolvedValue(
        'The premium plan costs $99 per month.',
      );
      logRepo.save.mockResolvedValue({} as any);

      const result = await service.answer('company-1', 'Tell me about premium');

      expect(result).toEqual({ answer: 'The premium plan costs $99 per month.' });
      expect(provider.answerWithContext).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'sk-test' }),
        'Tell me about premium',
        expect.arrayContaining([expect.stringContaining('premium')]),
      );
    });

    it('should use doc.content when chunks is null', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      docRepo.findByCompanyId.mockResolvedValue([
        {
          id: 'doc-1',
          company_id: 'company-1',
          title: 'Pricing',
          content: 'Our premium plan costs $99.',
          chunks: null,
          content_type: 'text',
          created_at: new Date(),
        } as AiTrainingDoc,
      ]);
      provider.answerWithContext.mockResolvedValue('Yes.');
      logRepo.save.mockResolvedValue({} as any);

      const result = await service.answer('company-1', 'premium');

      expect(result).toEqual({ answer: 'Yes.' });
    });

    it('should return fallback when no relevant chunks found', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      docRepo.findByCompanyId.mockResolvedValue([
        {
          id: 'doc-1',
          company_id: 'company-1',
          title: 'Pricing',
          content: 'Only basic plans available.',
          chunks: ['Only basic plans available.'],
          content_type: 'text',
          created_at: new Date(),
        } as AiTrainingDoc,
      ]);

      const result = await service.answer('company-1', 'How to configure DNS?');

      expect(result).toEqual({
        answer:
          'No encontré información relevante en los documentos de entrenamiento.',
      });
      expect(provider.answerWithContext).not.toHaveBeenCalled();
    });

    it('should filter chunks by keyword matching (>3 char words)', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      docRepo.findByCompanyId.mockResolvedValue([
        {
          id: 'doc-1',
          company_id: 'company-1',
          title: 'Doc',
          content: 'Refund policy is 30 days.',
          chunks: ['Refund policy is 30 days.'],
          content_type: 'text',
          created_at: new Date(),
        } as AiTrainingDoc,
      ]);
      provider.answerWithContext.mockResolvedValue('30 day refund.');
      logRepo.save.mockResolvedValue({} as any);

      const result = await service.answer('company-1', 'what is the refund policy?');

      expect(result).toEqual({ answer: '30 day refund.' });
      expect(provider.answerWithContext).toHaveBeenCalled();
    });

    it('should limit to top 5 chunks', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      const chunks = Array.from({ length: 10 }, (_, i) => `Chunk number ${i + 1} about refund.`);
      docRepo.findByCompanyId.mockResolvedValue([
        {
          id: 'doc-1',
          company_id: 'company-1',
          title: 'Doc',
          content: 'x',
          chunks,
          content_type: 'text',
          created_at: new Date(),
        } as AiTrainingDoc,
      ]);
      provider.answerWithContext.mockResolvedValue('Answer.');
      logRepo.save.mockResolvedValue({} as any);

      await service.answer('company-1', 'Tell me about refund');

      const [, , contextChunks] = provider.answerWithContext.mock.calls[0];
      expect(contextChunks).toHaveLength(5);
    });

    it('should throw BadRequestException when no active agent', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(null);

      await expect(
        service.answer('company-1', 'question'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when api_key is missing', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue({
        ...mockAgent,
        api_key: null,
      });

      await expect(
        service.answer('company-1', 'question'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log the rag call', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      docRepo.findByCompanyId.mockResolvedValue([
        {
          id: 'doc-1',
          company_id: 'company-1',
          title: 'Doc',
          content: 'Support hours are 9-5.',
          chunks: ['Support hours are 9-5.'],
          content_type: 'text',
          created_at: new Date(),
        } as AiTrainingDoc,
      ]);
      provider.answerWithContext.mockResolvedValue('9 to 5.');
      logRepo.save.mockResolvedValue({} as any);

      await service.answer('company-1', 'What are support hours?');

      expect(logRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-1',
          agent_id: 'agent-1',
          type: 'rag',
          prompt: 'What are support hours?',
          response: '9 to 5.',
        }),
      );
    });
  });
});
