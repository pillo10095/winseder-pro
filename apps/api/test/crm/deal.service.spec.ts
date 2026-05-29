import { Test, TestingModule } from '@nestjs/testing';

import { DealService } from '@/modules/crm/services/deal.service';
import { Deal } from '@/modules/crm/entities/deal.entity';
import { DealRepository } from '@/modules/crm/repositories/deal.repository';
import { ActivityService } from '@/modules/crm/services/activity.service';

describe('DealService', () => {
  let service: DealService;
  let dealRepo: jest.Mocked<DealRepository>;
  let activityService: jest.Mocked<ActivityService>;

  const mockDeal: Deal = {
    id: 'deal-1',
    company_id: 'company-1',
    pipeline_stage_id: 'stage-1',
    name: 'Enterprise Plan',
    value: 50000,
    contact_id: 'contact-1',
    company_name: 'Acme Inc',
    probability: 80,
    close_date: null,
    assigned_to: 'user-1',
    won_lost_reason: null,
    tags: null,
    last_activity_at: null,
    next_action: null,
    next_action_date: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as Deal;

  beforeEach(async () => {
    dealRepo = {
      create: jest.fn().mockReturnValue(mockDeal),
      save: jest.fn().mockResolvedValue(mockDeal),
      findOne: jest.fn().mockResolvedValue(mockDeal),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      findByCompanyId: jest.fn().mockResolvedValue([[mockDeal], 1]),
      findWithFilters: jest.fn().mockResolvedValue([[mockDeal], 1]),
      createQueryBuilder: jest.fn(),
    } as any;

    activityService = {
      create: jest.fn().mockResolvedValue({}),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealService,
        { provide: DealRepository, useValue: dealRepo },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get<DealService>(DealService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a deal', async () => {
      const dto = {
        pipeline_stage_id: 'stage-1',
        name: 'Enterprise Plan',
        value: 50000,
        contact_id: 'contact-1',
      };

      const result = await service.create('company-1', dto);

      expect(result).toEqual(mockDeal);
      expect(dealRepo.create).toHaveBeenCalledWith({ ...dto, company_id: 'company-1' });
    });
  });

  describe('findByCompanyId', () => {
    it('should return deals for company', async () => {
      const [deals, total] = await service.findByCompanyId('company-1');

      expect(deals).toHaveLength(1);
      expect(total).toBe(1);
    });

    it('should filter by stage', async () => {
      await service.findByCompanyId('company-1', 'stage-2');

      expect(dealRepo.findByCompanyId).toHaveBeenCalledWith('company-1', 'stage-2', undefined, undefined, 20, undefined);
    });
  });

  describe('findWithFilters', () => {
    it('should apply filters and return paginated results', async () => {
      const filters = {
        stage: 'stage-1',
        search: 'Enterprise',
        source: 'whatsapp',
        page: 1,
        limit: 20,
      };

      const [deals, total] = await service.findWithFilters('company-1', filters);

      expect(dealRepo.findWithFilters).toHaveBeenCalledWith('company-1', filters);
      expect(deals).toHaveLength(1);
      expect(total).toBe(1);
    });

    it('should return all deals when no filters', async () => {
      const [deals, total] = await service.findWithFilters('company-1', {} as any);

      expect(dealRepo.findWithFilters).toHaveBeenCalledWith('company-1', {});
      expect(deals).toHaveLength(1);
      expect(total).toBe(1);
    });
  });

  describe('moveStage', () => {
    it('should move deal to new stage with userId and create system activity', async () => {
      const result = await service.moveStage('deal-1', 'stage-2', 'user-1');

      expect(dealRepo.update).toHaveBeenCalledWith('deal-1', {
        pipeline_stage_id: 'stage-2',
        last_activity_at: expect.any(Date),
      });
      expect(activityService.create).toHaveBeenCalledWith('company-1', 'user-1', {
        deal_id: 'deal-1',
        type: 'system',
        description: 'Etapa actualizada',
        activity_date: expect.any(String),
      });
      expect(result).toEqual(mockDeal);
    });

    it('should record reason and include in activity description', async () => {
      await service.moveStage('deal-1', 'stage-6', 'user-1', 'Budget too low');

      expect(dealRepo.update).toHaveBeenCalledWith('deal-1', {
        pipeline_stage_id: 'stage-6',
        won_lost_reason: 'Budget too low',
        last_activity_at: expect.any(Date),
      });
      expect(activityService.create).toHaveBeenCalledWith('company-1', 'user-1', {
        deal_id: 'deal-1',
        type: 'system',
        description: 'Movido a nueva etapa: Budget too low',
        activity_date: expect.any(String),
      });
    });

    it('should not create activity when stage is the same', async () => {
      dealRepo.findOne = jest.fn().mockResolvedValue({ ...mockDeal, pipeline_stage_id: 'stage-2' });

      await service.moveStage('deal-1', 'stage-2', 'user-1');

      expect(activityService.create).not.toHaveBeenCalled();
    });

    it('should return null if deal not found', async () => {
      dealRepo.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.moveStage('deal-none', 'stage-2', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total_deals: 10,
          total_value: '500000',
          avg_value: '50000',
        }),
        getRawMany: jest.fn()
          .mockResolvedValueOnce([
            { stage_name: 'Lead', cnt: '5' },
            { stage_name: 'Won', cnt: '3' },
            { stage_name: 'Lost', cnt: '2' },
          ])
          .mockResolvedValue([
            { stage_name: 'Lead', stage_color: '#6B7280', count: '5', value: '100000' },
            { stage_name: 'Won', stage_color: '#22C55E', count: '3', value: '300000' },
            { stage_name: 'Lost', stage_color: '#EF4444', count: '2', value: '100000' },
          ]),
      };
      dealRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
    });

    it('should return aggregated pipeline stats', async () => {
      const stats = await service.getStats('company-1');

      expect(stats).toEqual({
        total_deals: 10,
        total_value: 500000,
        avg_value: 50000,
        conversion_rate: 30,
        by_stage: [
          { stage_name: 'Lead', stage_color: '#6B7280', count: 5, value: 100000 },
          { stage_name: 'Won', stage_color: '#22C55E', count: 3, value: 300000 },
          { stage_name: 'Lost', stage_color: '#EF4444', count: 2, value: 100000 },
        ],
      });
    });
  });

  describe('remove', () => {
    it('should delete a deal', async () => {
      await service.remove('deal-1');

      expect(dealRepo.delete).toHaveBeenCalledWith('deal-1');
    });
  });
});
