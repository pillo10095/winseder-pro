import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { DealController } from '@/modules/crm/controllers/deal.controller';
import { DealService } from '@/modules/crm/services/deal.service';
import { StageTransitionService } from '@/modules/crm/services/stage-transition.service';

describe('DealController', () => {
  let controller: DealController;
  let dealService: DealService;
  let stageTransitionService: StageTransitionService;

  const mockDealService = {
    findByCompanyId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockStageTransitionService = {
    moveDeal: jest.fn(),
  };

  const companyId = 'company-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DealController],
      providers: [
        { provide: DealService, useValue: mockDealService },
        { provide: StageTransitionService, useValue: mockStageTransitionService },
      ],
    }).compile();

    controller = module.get<DealController>(DealController);
    dealService = module.get<DealService>(DealService);
    stageTransitionService = module.get<StageTransitionService>(StageTransitionService);

    jest.clearAllMocks();
  });

  describe('GET /crm/deals', () => {
    it('should return deals list with total', async () => {
      const deals = [{ id: 'deal-1', name: 'Big Deal', value: 1000 }];
      mockDealService.findByCompanyId.mockResolvedValue([deals, 1]);

      const result = await controller.findAll(companyId, undefined, undefined, undefined, '20', undefined);

      expect(dealService.findByCompanyId).toHaveBeenCalledWith(companyId, undefined, undefined, undefined, 20, undefined);
      expect(result).toEqual({ data: deals, total: 1 });
    });

    it('should filter by stage_id, assigned_to, and search', async () => {
      const deals = [{ id: 'deal-2', pipeline_stage_id: 'stage-1', assigned_to: 'user-1' }];
      mockDealService.findByCompanyId.mockResolvedValue([deals, 1]);

      const result = await controller.findAll(companyId, 'stage-1', 'user-1', 'search-term', '10', 'cursor-abc');

      expect(dealService.findByCompanyId).toHaveBeenCalledWith(companyId, 'stage-1', 'user-1', 'search-term', 10, 'cursor-abc');
      expect(result).toEqual({ data: deals, total: 1 });
    });

    it('should use default limit when not provided', async () => {
      mockDealService.findByCompanyId.mockResolvedValue([[], 0]);

      await controller.findAll(companyId, undefined, undefined, undefined, undefined, undefined);

      expect(dealService.findByCompanyId).toHaveBeenCalledWith(companyId, undefined, undefined, undefined, 20, undefined);
    });

    it('should return empty list when no deals', async () => {
      mockDealService.findByCompanyId.mockResolvedValue([[], 0]);

      const result = await controller.findAll(companyId, undefined, undefined, undefined, undefined, undefined);

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('GET /crm/deals/:id', () => {
    it('should return a deal by id', async () => {
      const deal = { id: 'deal-1', name: 'Big Deal', value: 1000 };
      mockDealService.findById.mockResolvedValue(deal);

      const result = await controller.findOne('deal-1');

      expect(dealService.findById).toHaveBeenCalledWith('deal-1');
      expect(result).toEqual(deal);
    });

    it('should return null when not found', async () => {
      mockDealService.findById.mockResolvedValue(null);

      const result = await controller.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('POST /crm/deals', () => {
    it('should create a deal', async () => {
      const dto = { name: 'New Deal', value: 5000, pipeline_stage_id: 'stage-1' };
      const created = { id: 'deal-3', ...dto, company_id: companyId };
      mockDealService.create.mockResolvedValue(created);

      const result = await controller.create(companyId, dto as any);

      expect(dealService.create).toHaveBeenCalledWith(companyId, dto);
      expect(result).toEqual(created);
    });
  });

  describe('PUT /crm/deals/:id', () => {
    it('should update a deal', async () => {
      const dto = { name: 'Updated Deal', value: 6000 };
      const updated = { id: 'deal-1', name: 'Updated Deal', value: 6000 };
      mockDealService.update.mockResolvedValue(updated);

      const result = await controller.update('deal-1', dto as any);

      expect(dealService.update).toHaveBeenCalledWith('deal-1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('PUT /crm/deals/:id/stage', () => {
    it('should move deal to another stage', async () => {
      const dto = { pipeline_stage_id: 'stage-2', reason: 'Qualified' };
      const moved = { id: 'deal-1', pipeline_stage_id: 'stage-2' };
      mockStageTransitionService.moveDeal.mockResolvedValue(moved);

      const result = await controller.moveStage('deal-1', dto as any);

      expect(stageTransitionService.moveDeal).toHaveBeenCalledWith('deal-1', dto.pipeline_stage_id, dto.reason);
      expect(result).toEqual(moved);
    });

    it('should throw NotFoundException when deal not found', async () => {
      const dto = { pipeline_stage_id: 'stage-2' };
      mockStageTransitionService.moveDeal.mockRejectedValue(new NotFoundException('Deal not found'));

      await expect(controller.moveStage('non-existent', dto as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /crm/deals/:id', () => {
    it('should remove a deal', async () => {
      mockDealService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('deal-1');

      expect(dealService.remove).toHaveBeenCalledWith('deal-1');
      expect(result).toEqual({ success: true });
    });
  });
});
