import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SubscriptionService, CreatePlanDto, UpdatePlanDto } from '@/modules/admin/services/subscription.service';
import { AuditLogService } from '@/modules/admin/services/audit-log.service';
import { Plan } from '@/modules/tenancy/entities/plan.entity';
import { Subscription, SubscriptionStatus } from '@/modules/tenancy/entities/subscription.entity';
import { Company } from '@/modules/tenancy/entities/company.entity';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let planRepo: Repository<Plan>;
  let subscriptionRepo: Repository<Subscription>;
  let companyRepo: Repository<Company>;
  let auditLog: AuditLogService;

  const mockPlanRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockSubscriptionRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockCompanyRepo = {
    findOne: jest.fn(),
  };

  const mockAuditLog = {
    record: jest.fn().mockResolvedValue({}),
  };

  const mockPlan: Partial<Plan> = {
    id: 'plan-1',
    name: 'Free',
    code: 'free',
    description: 'Free plan',
    price_mxn: 0,
    max_contacts: 100,
    max_whatsapp_sessions: 1,
    max_campaigns_per_month: 0,
    features: ['basic'],
    is_active: true,
  };

  const mockCompany: Partial<Company> = {
    id: 'company-1',
    name: 'Test Co',
    slug: 'test-co',
    is_active: true,
  };

  const mockSubscription: Partial<Subscription> = {
    id: 'sub-1',
    company_id: 'company-1',
    plan_id: 'plan-1',
    status: SubscriptionStatus.ACTIVE,
    company: mockCompany as Company,
    plan: mockPlan as Plan,
    starts_at: new Date(),
    ends_at: new Date(),
    created_at: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: getRepositoryToken(Plan), useValue: mockPlanRepo },
        { provide: getRepositoryToken(Subscription), useValue: mockSubscriptionRepo },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepo },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    planRepo = module.get<Repository<Plan>>(getRepositoryToken(Plan));
    subscriptionRepo = module.get<Repository<Subscription>>(getRepositoryToken(Subscription));
    companyRepo = module.get<Repository<Company>>(getRepositoryToken(Company));
    auditLog = module.get<AuditLogService>(AuditLogService);
  });

  describe('listPlans', () => {
    it('should return only active plans by default', async () => {
      mockPlanRepo.find.mockResolvedValue([mockPlan]);

      const result = await service.listPlans();

      expect(mockPlanRepo.find).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { price_mxn: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });

    it('should return all plans when includeInactive is true', async () => {
      mockPlanRepo.find.mockResolvedValue([mockPlan, { ...mockPlan, id: 'plan-2', is_active: false }]);

      const result = await service.listPlans(true);

      expect(mockPlanRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { price_mxn: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no plans exist', async () => {
      mockPlanRepo.find.mockResolvedValue([]);

      const result = await service.listPlans();

      expect(result).toEqual([]);
    });
  });

  describe('getPlan', () => {
    it('should return a plan by id', async () => {
      mockPlanRepo.findOne.mockResolvedValue(mockPlan);

      const result = await service.getPlan('plan-1');

      expect(mockPlanRepo.findOne).toHaveBeenCalledWith({ where: { id: 'plan-1' } });
      expect(result).toEqual(mockPlan);
    });

    it('should throw NotFoundException when plan not found', async () => {
      mockPlanRepo.findOne.mockResolvedValue(null);

      await expect(service.getPlan('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPlan', () => {
    const createDto: CreatePlanDto = {
      name: 'Pro',
      code: 'pro',
      description: 'Pro plan',
      price_mxn: 9900,
      max_contacts: 500,
      max_whatsapp_sessions: 3,
      max_campaigns_per_month: 50,
      features: ['advanced', 'api'],
    };

    it('should create a plan and record audit log', async () => {
      const createdPlan = { id: 'plan-new', ...createDto, is_active: true };
      mockPlanRepo.create.mockReturnValue(createdPlan);
      mockPlanRepo.save.mockResolvedValue(createdPlan);

      const result = await service.createPlan(createDto, 'actor-1');

      expect(mockPlanRepo.create).toHaveBeenCalledWith({
        name: 'Pro',
        code: 'pro',
        description: 'Pro plan',
        price_mxn: 9900,
        max_contacts: 500,
        max_whatsapp_sessions: 3,
        max_campaigns_per_month: 50,
        features: ['advanced', 'api'],
        is_active: true,
      });
      expect(mockPlanRepo.save).toHaveBeenCalledWith(createdPlan);
      expect(mockAuditLog.record).toHaveBeenCalledWith({
        action: 'plan.created',
        actorId: 'actor-1',
        targetId: 'plan-new',
        targetType: 'plan',
        description: 'Plan created: Pro ($9900)',
      });
      expect(result).toEqual(createdPlan);
    });

    it('should use defaults for optional fields', async () => {
      const minimalDto: CreatePlanDto = { name: 'Basic', code: 'basic', price_mxn: 0 };
      const created = { id: 'plan-basic', name: 'Basic', code: 'basic', price_mxn: 0 };
      mockPlanRepo.create.mockReturnValue(created);
      mockPlanRepo.save.mockResolvedValue(created);

      await service.createPlan(minimalDto, 'actor-1');

      expect(mockPlanRepo.create).toHaveBeenCalledWith({
        name: 'Basic',
        code: 'basic',
        description: '',
        price_mxn: 0,
        max_contacts: 100,
        max_whatsapp_sessions: 1,
        max_campaigns_per_month: 0,
        features: [],
        is_active: true,
      });
    });
  });

  describe('updatePlan', () => {
    const updateDto: UpdatePlanDto = { name: 'Pro Plus', price_mxn: 14900 };

    it('should update a plan and record audit log', async () => {
      const updated = { ...mockPlan, name: 'Pro Plus', price_mxn: 14900 };
      mockPlanRepo.findOne.mockResolvedValueOnce(mockPlan);
      mockPlanRepo.update.mockResolvedValue({} as any);
      mockPlanRepo.findOne.mockResolvedValueOnce(updated);

      const result = await service.updatePlan('plan-1', updateDto, 'actor-1');

      expect(mockPlanRepo.update).toHaveBeenCalledWith('plan-1', { ...updateDto, features: mockPlan.features });
      expect(mockAuditLog.record).toHaveBeenCalledWith({
        action: 'plan.updated',
        actorId: 'actor-1',
        targetId: 'plan-1',
        targetType: 'plan',
        description: 'Plan updated: Free',
      });
      expect(result).toEqual(updated);
    });

    it('should record plan.disabled when is_active is set to false', async () => {
      mockPlanRepo.findOne.mockResolvedValue(mockPlan);
      mockPlanRepo.update.mockResolvedValue({} as any);
      mockPlanRepo.findOne.mockResolvedValue({ ...mockPlan, is_active: false });

      await service.updatePlan('plan-1', { is_active: false }, 'actor-1');

      expect(mockAuditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'plan.disabled' }),
      );
    });

    it('should throw NotFoundException when plan not found', async () => {
      mockPlanRepo.findOne.mockResolvedValue(null);

      await expect(service.updatePlan('nonexistent', updateDto, 'actor-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listSubscriptions', () => {
    it('should return mapped subscriptions with pagination', async () => {
      mockSubscriptionRepo.findAndCount.mockResolvedValue([[mockSubscription], 1]);

      const result = await service.listSubscriptions({ limit: 10, offset: 0 });

      expect(mockSubscriptionRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: ['plan', 'company'],
        order: { created_at: 'DESC' },
        take: 10,
        skip: 0,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].company_name).toBe('Test Co');
      expect(result.items[0].plan_name).toBe('Free');
      expect(result.items[0].plan_price).toBe(0);
    });

    it('should filter by status and companyId', async () => {
      mockSubscriptionRepo.findAndCount.mockResolvedValue([[mockSubscription], 1]);

      await service.listSubscriptions({ status: SubscriptionStatus.ACTIVE, companyId: 'company-1' });

      expect(mockSubscriptionRepo.findAndCount).toHaveBeenCalledWith({
        where: { status: SubscriptionStatus.ACTIVE, company_id: 'company-1' },
        relations: ['plan', 'company'],
        order: { created_at: 'DESC' },
        take: 50,
        skip: 0,
      });
    });

    it('should handle null relations gracefully', async () => {
      const subWithoutRelations = {
        ...mockSubscription,
        company: undefined,
        plan: undefined,
      };
      mockSubscriptionRepo.findAndCount.mockResolvedValue([[subWithoutRelations], 1]);

      const result = await service.listSubscriptions({});

      expect(result.items[0].company_name).toBeUndefined();
      expect(result.items[0].plan_name).toBeUndefined();
      expect(result.items[0].plan_price).toBeUndefined();
    });
  });

  describe('assignPlan', () => {
    it('should assign a plan to a company (active)', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockCompany);
      mockPlanRepo.findOne.mockResolvedValue(mockPlan);
      mockSubscriptionRepo.update.mockResolvedValue({} as any);
      const createdSub = { ...mockSubscription, id: 'sub-new' };
      mockSubscriptionRepo.create.mockReturnValue(createdSub);
      mockSubscriptionRepo.save.mockResolvedValue(createdSub);

      const result = await service.assignPlan(
        { company_id: 'company-1', plan_id: 'plan-1', status: SubscriptionStatus.ACTIVE },
        'actor-1',
      );

      expect(mockSubscriptionRepo.update).toHaveBeenCalledWith(
        { company_id: 'company-1', status: SubscriptionStatus.ACTIVE },
        { status: SubscriptionStatus.CANCELLED, cancelled_at: expect.any(Date) },
      );
      expect(mockSubscriptionRepo.create).toHaveBeenCalled();
      expect(mockSubscriptionRepo.save).toHaveBeenCalled();
      expect(mockAuditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'subscription.created' }),
      );
      expect(result).toEqual(createdSub);
    });

    it('should set trial_ends_at when status is TRIAL', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockCompany);
      mockPlanRepo.findOne.mockResolvedValue(mockPlan);
      mockSubscriptionRepo.update.mockResolvedValue({} as any);
      mockSubscriptionRepo.create.mockReturnValue(mockSubscription);
      mockSubscriptionRepo.save.mockResolvedValue(mockSubscription as Subscription);

      await service.assignPlan(
        { company_id: 'company-1', plan_id: 'plan-1', status: SubscriptionStatus.TRIAL, trial_days: 30 },
        'actor-1',
      );

      expect(mockSubscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SubscriptionStatus.TRIAL,
          trial_ends_at: expect.any(Date),
        }),
      );
    });

    it('should set trial when trial_days provided without explicit status', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockCompany);
      mockPlanRepo.findOne.mockResolvedValue(mockPlan);
      mockSubscriptionRepo.update.mockResolvedValue({} as any);
      mockSubscriptionRepo.create.mockReturnValue(mockSubscription);
      mockSubscriptionRepo.save.mockResolvedValue(mockSubscription as Subscription);

      await service.assignPlan(
        { company_id: 'company-1', plan_id: 'plan-1', trial_days: 14 },
        'actor-1',
      );

      expect(mockSubscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SubscriptionStatus.TRIAL,
          trial_ends_at: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException when company not found', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assignPlan({ company_id: 'unknown', plan_id: 'plan-1' }, 'actor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when plan not found', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockCompany);
      mockPlanRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assignPlan({ company_id: 'company-1', plan_id: 'unknown' }, 'actor-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a subscription and record audit log', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription as Subscription);
      mockSubscriptionRepo.update.mockResolvedValue({} as any);

      const result = await service.cancelSubscription('sub-1', 'actor-1');

      expect(mockSubscriptionRepo.update).toHaveBeenCalledWith('sub-1', {
        status: SubscriptionStatus.CANCELLED,
        cancelled_at: expect.any(Date),
      });
      expect(mockAuditLog.record).toHaveBeenCalledWith({
        action: 'subscription.cancelled',
        actorId: 'actor-1',
        companyId: 'company-1',
        targetId: 'sub-1',
        targetType: 'subscription',
        description: 'Subscription cancelled: Free for Test Co',
      });
      expect(result).toEqual({ id: 'sub-1', status: SubscriptionStatus.CANCELLED });
    });

    it('should throw NotFoundException when subscription not found', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelSubscription('nonexistent', 'actor-1')).rejects.toThrow(NotFoundException);
    });
  });
});
