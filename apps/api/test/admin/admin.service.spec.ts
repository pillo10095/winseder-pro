import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { SuperAdminService } from '@/modules/admin/services/superadmin.service';
import { AuditLogService } from '@/modules/admin/services/audit-log.service';
import { SubscriptionService } from '@/modules/admin/services/subscription.service';
import { User, UserRole } from '@/modules/auth/entities/user.entity';
import { Company } from '@/modules/tenancy/entities/company.entity';
import { Plan } from '@/modules/tenancy/entities/plan.entity';
import { Subscription } from '@/modules/tenancy/entities/subscription.entity';
import { Session } from '@/modules/whatsapp/entities/session.entity';
import { Message } from '@/modules/whatsapp/entities/message.entity';
import { AuditLog } from '@/modules/admin/entities/audit-log.entity';

describe('Admin E2E', () => {
  let superAdmin: SuperAdminService;
  let subscriptionService: SubscriptionService;

  const mockUserRepo = { count: jest.fn(), findOne: jest.fn(), update: jest.fn(), findAndCount: jest.fn() };
  const mockCompanyRepo = { count: jest.fn(), findOne: jest.fn(), update: jest.fn(), createQueryBuilder: jest.fn() };
  const mockPlanRepo = { count: jest.fn(), findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() };
  const mockSubscriptionRepo = { count: jest.fn(), findOne: jest.fn(), findAndCount: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn() };
  const mockSessionRepo = { count: jest.fn() };
  const mockMessageRepo = { count: jest.fn() };
  const mockAuditLogRepo = { create: jest.fn(), save: jest.fn(), findAndCount: jest.fn(), find: jest.fn(), delete: jest.fn() };

  beforeEach(async () => {
    mockCompanyRepo.count.mockResolvedValue(5);
    mockCompanyRepo.findOne.mockResolvedValue({ id: 'company-1', name: 'Test Co', is_active: true, subscriptions: [] });
    mockCompanyRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'c1', name: 'Co' }], 1]),
    });
    mockUserRepo.count.mockResolvedValue(10);
    mockUserRepo.findAndCount.mockResolvedValue([[{ id: 'u1', name: 'Admin', email: 'admin@test.com', role: UserRole.ADMIN, company: { name: 'Co' } }], 1]);
    mockSessionRepo.count.mockResolvedValue(3);
    mockMessageRepo.count.mockResolvedValue(1000);
    mockPlanRepo.count.mockResolvedValue(2);
    mockPlanRepo.find.mockResolvedValue([
      { id: 'p1', name: 'Free', price_mxn: 0 },
      { id: 'p2', name: 'Pro', code: 'pro', price_mxn: 9900, max_whatsapp: 5, max_messages: 10000 },
    ]);
    mockSubscriptionRepo.count.mockResolvedValue(3);
    mockAuditLogRepo.findAndCount.mockResolvedValue([[{ id: 'log-1', action: 'user.login', created_at: new Date() }], 1]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        SubscriptionService,
        AuditLogService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepo },
        { provide: getRepositoryToken(Plan), useValue: mockPlanRepo },
        { provide: getRepositoryToken(Subscription), useValue: mockSubscriptionRepo },
        { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
      ],
    }).compile();

    superAdmin = module.get<SuperAdminService>(SuperAdminService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);

    // Mock audit log's record method
    jest.spyOn(module.get<AuditLogService>(AuditLogService), 'record').mockResolvedValue({} as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('System Stats', () => {
    it('should return aggregate statistics', async () => {
      const stats = await superAdmin.getSystemStats();

      expect(stats.companies.total).toBe(5);
      expect(stats.users.total).toBe(10);
      expect(stats.sessions.total).toBe(3);
      expect(stats.messages.total).toBe(1000);
      expect(stats.plans.total).toBe(2);
    });
  });

  describe('Companies', () => {
    it('should list companies with search', async () => {
      const result = await superAdmin.listCompanies({ search: 'test', limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should toggle company active state', async () => {
      mockCompanyRepo.findOne.mockResolvedValue({ id: 'c1', name: 'Co', is_active: true });

      const result = await superAdmin.toggleCompany('c1', false, 'admin-1');

      expect(result.is_active).toBe(false);
      expect(mockCompanyRepo.update).toHaveBeenCalledWith('c1', { is_active: false });
    });
  });

  describe('Plans', () => {
    it('should list active plans', async () => {
      const plans = await subscriptionService.listPlans();

      expect(plans).toHaveLength(2);
    });

    it('should create a new plan', async () => {
      mockPlanRepo.create.mockReturnValue({ id: 'new', name: 'Pro', code: 'pro', price_mxn: 9900 });
      mockPlanRepo.save.mockResolvedValue({ id: 'new', name: 'Pro', code: 'pro', price_mxn: 9900 });

      const plan = await subscriptionService.createPlan({
        name: 'Pro',
        code: 'pro',
        price_mxn: 9900,
      }, 'admin-1');

      expect(plan.name).toBe('Pro');
      expect(mockPlanRepo.create).toHaveBeenCalled();
    });
  });
});
