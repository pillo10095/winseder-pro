import { Test, type TestingModule } from '@nestjs/testing';

import { PipelineLeadsController } from '@/modules/crm/controllers/pipeline-leads.controller';
import { DealService } from '@/modules/crm/services/deal.service';

describe('PipelineLeadsController', () => {
  let controller: PipelineLeadsController;
  let dealService: jest.Mocked<DealService>;

  const mockDeal = {
    id: 'deal-1',
    company_id: 'company-1',
    pipeline_stage_id: 'stage-1',
    name: 'Enterprise Plan',
    value: 50000,
    contact_id: 'contact-1',
    created_at: new Date(),
  };

  const mockDealService = {
    findWithFilters: jest.fn(),
    getStats: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    moveStage: jest.fn(),
    remove: jest.fn(),
  };

  const companyId = 'company-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipelineLeadsController],
      providers: [
        { provide: DealService, useValue: mockDealService },
      ],
    }).compile();

    controller = module.get<PipelineLeadsController>(PipelineLeadsController);
    dealService = module.get(DealService);

    jest.clearAllMocks();
  });

  describe('GET /crm/pipeline', () => {
    it('should return paginated pipeline leads with filters', async () => {
      mockDealService.findWithFilters.mockResolvedValue([[mockDeal], 1]);

      const result = await controller.findAll(companyId, {
        stage: 'stage-1',
        search: 'Enterprise',
        page: 1,
        limit: 20,
      } as any);

      expect(dealService.findWithFilters).toHaveBeenCalledWith(companyId, {
        stage: 'stage-1',
        search: 'Enterprise',
        page: 1,
        limit: 20,
      });
      expect(result).toEqual({
        data: [mockDeal],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('should return empty list when no results', async () => {
      mockDealService.findWithFilters.mockResolvedValue([[], 0]);

      const result = await controller.findAll(companyId, {} as any);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });

    it('should use default pagination when not provided', async () => {
      mockDealService.findWithFilters.mockResolvedValue([[mockDeal], 1]);

      const result = await controller.findAll(companyId, {} as any);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('GET /crm/pipeline/stats', () => {
    it('should return pipeline stats', async () => {
      const stats = {
        total_deals: 10,
        total_value: 500000,
        avg_value: 50000,
        conversion_rate: 30,
        by_stage: [],
      };
      mockDealService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats(companyId);

      expect(dealService.getStats).toHaveBeenCalledWith(companyId);
      expect(result).toEqual(stats);
    });
  });

  describe('GET /crm/pipeline/:id', () => {
    it('should return a single lead', async () => {
      mockDealService.findById.mockResolvedValue(mockDeal);

      const result = await controller.findOne('deal-1');

      expect(dealService.findById).toHaveBeenCalledWith('deal-1');
      expect(result).toEqual(mockDeal);
    });

    it('should return null when lead not found', async () => {
      mockDealService.findById.mockResolvedValue(null);

      const result = await controller.findOne('deal-none');

      expect(result).toBeNull();
    });
  });

  describe('POST /crm/pipeline', () => {
    it('should create a new lead', async () => {
      const dto = { name: 'New Lead', value: 10000, pipeline_stage_id: 'stage-1' };
      mockDealService.create.mockResolvedValue(mockDeal);

      const result = await controller.create(companyId, dto as any);

      expect(dealService.create).toHaveBeenCalledWith(companyId, dto);
      expect(result).toEqual(mockDeal);
    });
  });

  describe('PATCH /crm/pipeline/:id', () => {
    it('should update a lead', async () => {
      const dto = { name: 'Updated Lead', value: 60000 };
      const updated = { ...mockDeal, ...dto };
      mockDealService.update.mockResolvedValue(updated);

      const result = await controller.update('deal-1', dto as any);

      expect(dealService.update).toHaveBeenCalledWith('deal-1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('PATCH /crm/pipeline/:id/move', () => {
    it('should move lead to another stage', async () => {
      const dto = { pipeline_stage_id: 'stage-2', reason: 'Qualified' };
      const moved = { ...mockDeal, pipeline_stage_id: 'stage-2' };
      mockDealService.moveStage.mockResolvedValue(moved);

      const result = await controller.move('deal-1', dto, 'user-1');

      expect(dealService.moveStage).toHaveBeenCalledWith('deal-1', 'stage-2', 'user-1', 'Qualified');
      expect(result).toEqual(moved);
    });

    it('should move without reason', async () => {
      const dto = { pipeline_stage_id: 'stage-2' };
      mockDealService.moveStage.mockResolvedValue({ ...mockDeal, pipeline_stage_id: 'stage-2' });

      await controller.move('deal-1', dto, 'user-1');

      expect(dealService.moveStage).toHaveBeenCalledWith('deal-1', 'stage-2', 'user-1', undefined);
    });
  });

  describe('DELETE /crm/pipeline/:id', () => {
    it('should remove a lead', async () => {
      mockDealService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('deal-1');

      expect(dealService.remove).toHaveBeenCalledWith('deal-1');
      expect(result).toEqual({ success: true });
    });
  });
});
