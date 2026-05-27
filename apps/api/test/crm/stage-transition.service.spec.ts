import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { StageTransitionService } from '@/modules/crm/services/stage-transition.service';
import { DealService } from '@/modules/crm/services/deal.service';
import { Deal } from '@/modules/crm/entities/deal.entity';

describe('StageTransitionService', () => {
  let service: StageTransitionService;
  let dealService: jest.Mocked<DealService>;

  const mockDeal: Deal = {
    id: 'deal-1',
    company_id: 'company-1',
    pipeline_stage_id: 'stage-1',
    name: 'Enterprise Plan',
    value: 50000,
  } as Deal;

  beforeEach(async () => {
    dealService = {
      findById: jest.fn(),
      moveStage: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageTransitionService,
        { provide: DealService, useValue: dealService },
      ],
    }).compile();

    service = module.get<StageTransitionService>(StageTransitionService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('moveDeal', () => {
    it('should move a deal to a new stage', async () => {
      dealService.findById.mockResolvedValue(mockDeal);
      dealService.moveStage.mockResolvedValue({ ...mockDeal, pipeline_stage_id: 'stage-2' });

      const result = await service.moveDeal('deal-1', 'stage-2');

      expect(result).toBeDefined();
      expect(dealService.moveStage).toHaveBeenCalledWith('deal-1', 'stage-2', undefined);
    });

    it('should pass the reason when moving', async () => {
      dealService.findById.mockResolvedValue(mockDeal);

      await service.moveDeal('deal-1', 'stage-6', 'Closed');

      expect(dealService.moveStage).toHaveBeenCalledWith('deal-1', 'stage-6', 'Closed');
    });

    it('should throw NotFoundException if deal does not exist', async () => {
      dealService.findById.mockResolvedValue(null);

      await expect(service.moveDeal('nonexistent', 'stage-2')).rejects.toThrow(NotFoundException);
    });
  });
});
