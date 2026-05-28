import { Test, TestingModule } from '@nestjs/testing';

import { DealService } from '@/modules/crm/services/deal.service';
import { Deal } from '@/modules/crm/entities/deal.entity';
import { DealRepository } from '@/modules/crm/repositories/deal.repository';

describe('CRM E2E — Deals', () => {
  let service: DealService;
  let dealRepo: jest.Mocked<DealRepository>;

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
    assigned_to: null,
    won_lost_reason: null,
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
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealService,
        { provide: DealRepository, useValue: dealRepo },
      ],
    }).compile();

    service = module.get<DealService>(DealService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create a deal', async () => {
    const dto = {
      pipeline_stage_id: 'stage-1',
      name: 'Enterprise Plan',
      value: 50000,
      contact_id: 'contact-1',
    };

    const result = await service.create('company-1', dto);
    expect(result).toEqual(mockDeal);
  });

  it('should list deals with pagination', async () => {
    const [deals, total] = await service.findByCompanyId('company-1');
    expect(deals).toHaveLength(1);
    expect(total).toBe(1);
  });

  it('should move deal to another stage', async () => {
    const result = await service.moveStage('deal-1', 'stage-2');
    expect(result).toBeDefined();
    expect(dealRepo.update).toHaveBeenCalledWith('deal-1', { pipeline_stage_id: 'stage-2' });
  });

  it('should include reason when closing deal', async () => {
    await service.moveStage('deal-1', 'stage-3', 'Customer signed contract');
    expect(dealRepo.update).toHaveBeenCalledWith('deal-1', {
      pipeline_stage_id: 'stage-3',
      won_lost_reason: 'Customer signed contract',
    });
  });

  it('should delete a deal', async () => {
    await service.remove('deal-1');
    expect(dealRepo.delete).toHaveBeenCalledWith('deal-1');
  });
});
