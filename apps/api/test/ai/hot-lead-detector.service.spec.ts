import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { HotLeadDetectorService } from '@/modules/ai/services/hot-lead-detector.service';
import { AiAgentRepository } from '@/modules/ai/repositories/ai-agent.repository';
import { AiLogRepository } from '@/modules/ai/repositories/ai-log.repository';
import { AiProviderService } from '@/modules/ai/services/ai-provider.service';
import { AI_EVENTS } from '@/modules/ai/ai.events';
import { AiAgent } from '@/modules/ai/entities/ai-agent.entity';

describe('HotLeadDetectorService', () => {
  let service: HotLeadDetectorService;
  let agentRepo: jest.Mocked<AiAgentRepository>;
  let logRepo: jest.Mocked<AiLogRepository>;
  let provider: jest.Mocked<AiProviderService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

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
      detectHotLead: jest.fn(),
    } as any;

    eventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HotLeadDetectorService,
        { provide: AiAgentRepository, useValue: agentRepo },
        { provide: AiLogRepository, useValue: logRepo },
        { provide: AiProviderService, useValue: provider },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<HotLeadDetectorService>(HotLeadDetectorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detect', () => {
    const conversationText = 'I am very interested in your premium plan';

    it('should return hot lead detection result', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.detectHotLead.mockResolvedValue({
        isHot: true,
        score: 90,
        reason: 'Strong purchase intent',
      });
      logRepo.save.mockResolvedValue({} as any);

      const result = await service.detect('company-1', conversationText);

      expect(result).toEqual({
        isHot: true,
        score: 90,
        reason: 'Strong purchase intent',
      });
    });

    it('should emit HOT_LEAD_DETECTED event when lead is hot', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.detectHotLead.mockResolvedValue({
        isHot: true,
        score: 85,
        reason: 'Budget discussed',
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.detect('company-1', conversationText);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AI_EVENTS.HOT_LEAD_DETECTED,
        expect.objectContaining({
          companyId: 'company-1',
          score: 85,
          reason: 'Budget discussed',
          content: conversationText,
        }),
      );
    });

    it('should NOT emit event when lead is not hot', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.detectHotLead.mockResolvedValue({
        isHot: false,
        score: 20,
        reason: 'Casual inquiry',
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.detect('company-1', conversationText);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should include context in the emitted event', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.detectHotLead.mockResolvedValue({
        isHot: true,
        score: 75,
        reason: 'Interested',
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.detect('company-1', conversationText, {
        sessionId: 'session-1',
        conversationId: 'conv-1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AI_EVENTS.HOT_LEAD_DETECTED,
        expect.objectContaining({
          sessionId: 'session-1',
          conversationId: 'conv-1',
        }),
      );
    });

    it('should throw BadRequestException when no active agent', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(null);

      await expect(
        service.detect('company-1', conversationText),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when api_key is missing', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue({
        ...mockAgent,
        api_key: null,
      });

      await expect(
        service.detect('company-1', conversationText),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log the detection call', async () => {
      agentRepo.findActiveByCompanyId.mockResolvedValue(mockAgent);
      provider.detectHotLead.mockResolvedValue({
        isHot: false,
        score: 10,
        reason: 'Not interested',
      });
      logRepo.save.mockResolvedValue({} as any);

      await service.detect('company-1', conversationText);

      expect(logRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-1',
          agent_id: 'agent-1',
          type: 'hot_lead',
          prompt: conversationText,
        }),
      );
    });
  });
});
