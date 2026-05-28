import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SuperAdminService } from '@/modules/admin/services/superadmin.service';
import { AuditLogService } from '@/modules/admin/services/audit-log.service';
import { User, UserRole } from '@/modules/auth/entities/user.entity';
import { Company } from '@/modules/tenancy/entities/company.entity';
import { Plan } from '@/modules/tenancy/entities/plan.entity';
import { Subscription, SubscriptionStatus } from '@/modules/tenancy/entities/subscription.entity';
import { Session, SessionStatus } from '@/modules/whatsapp/entities/session.entity';
import { Message } from '@/modules/whatsapp/entities/message.entity';

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let userRepo: Repository<User>;
  let companyRepo: Repository<Company>;
  let sessionRepo: Repository<Session>;
  let messageRepo: Repository<Message>;

  const mockUserRepo = {
    count: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  const mockCompanyRepo = {
    count: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPlanRepo = {
    count: jest.fn(),
  };

  const mockSubscriptionRepo = {
    count: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSessionRepo = {
    count: jest.fn(),
    find: jest.fn(),
  };

  const mockMessageRepo = {
    count: jest.fn(),
  };

  const mockAuditLog = {
    record: jest.fn().mockResolvedValue({}),
  };

  const mockCompany: Partial<Company> = {
    id: 'company-1',
    name: 'Test Co',
    slug: 'test-co',
    logo_url: 'https://logo.url',
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-05-27'),
  };

  const mockUser: Partial<User> = {
    id: 'user-1',
    name: 'John',
    email: 'john@test.com',
    role: UserRole.ADMIN,
    is_active: true,
    company_id: 'company-1',
    company: { name: 'Test Co' } as Company,
    last_login_at: new Date(),
    created_at: new Date(),
  };

  const mockActiveSub: Partial<Subscription> = {
    id: 'sub-1',
    company_id: 'company-1',
    status: SubscriptionStatus.ACTIVE,
    plan: { name: 'Pro' } as Plan,
    ends_at: new Date(),
    created_at: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepo },
        { provide: getRepositoryToken(Plan), useValue: mockPlanRepo },
        { provide: getRepositoryToken(Subscription), useValue: mockSubscriptionRepo },
        { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();

    service = module.get<SuperAdminService>(SuperAdminService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    companyRepo = module.get<Repository<Company>>(getRepositoryToken(Company));
    sessionRepo = module.get<Repository<Session>>(getRepositoryToken(Session));
    messageRepo = module.get<Repository<Message>>(getRepositoryToken(Message));
  });

  describe('listCompanies', () => {
    const queryBuilderMock = {
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    beforeEach(() => {
      mockCompanyRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);
    });

    it('should list companies with pagination', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[mockCompany], 1]);

      const result = await service.listCompanies({ limit: 20, offset: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Test Co');
      expect(result.total).toBe(1);
    });

    it('should filter by search term', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[mockCompany], 1]);

      await service.listCompanies({ search: 'Test' });

      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'c.name LIKE :search OR c.slug LIKE :search',
        { search: '%Test%' },
      );
    });

    it('should filter by isActive', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[mockCompany], 1]);

      await service.listCompanies({ isActive: true });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'c.is_active = :isActive',
        { isActive: true },
      );
    });

    it('should combine search and isActive filters', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.listCompanies({ search: 'Co', isActive: true });

      expect(queryBuilderMock.where).toHaveBeenCalled();
      expect(queryBuilderMock.andWhere).toHaveBeenCalled();
    });
  });

  describe('getCompanyDetail', () => {
    it('should return company detail with stats and subscription', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockCompany);
      mockUserRepo.count.mockResolvedValue(3);
      mockSessionRepo.count.mockResolvedValue(2);
      mockSessionRepo.find.mockResolvedValue([{ id: 'sess-1' }, { id: 'sess-2' }] as Session[]);
      mockMessageRepo.count.mockResolvedValue(50);
      mockSubscriptionRepo.findOne.mockResolvedValue(mockActiveSub);

      const result = await service.getCompanyDetail('company-1');

      expect(result.id).toBe('company-1');
      expect(result.stats).toEqual({ users: 3, sessions: 2, messages: 50 });
      expect(result.subscription).toEqual({
        id: 'sub-1',
        plan: 'Pro',
        status: SubscriptionStatus.ACTIVE,
        ends_at: expect.any(Date),
      });
    });

    it('should return null subscription when no active/trial sub exists', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockCompany);
      mockUserRepo.count.mockResolvedValue(0);
      mockSessionRepo.count.mockResolvedValue(0);
      mockSessionRepo.find.mockResolvedValue([]);
      mockMessageRepo.count.mockResolvedValue(0);
      mockSubscriptionRepo.findOne.mockResolvedValue(null);

      const result = await service.getCompanyDetail('company-1');

      expect(result.subscription).toBeNull();
    });

    it('should handle zero messages when no sessions exist', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockCompany);
      mockUserRepo.count.mockResolvedValue(0);
      mockSessionRepo.count.mockResolvedValue(0);
      mockSessionRepo.find.mockResolvedValue([]);
      mockSubscriptionRepo.findOne.mockResolvedValue(null);

      const result = await service.getCompanyDetail('company-1');

      expect(result.stats.messages).toBe(0);
    });

    it('should throw NotFoundException when company not found', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);

      await expect(service.getCompanyDetail('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleCompany', () => {
    it('should enable a company and record audit', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockCompany);
      mockCompanyRepo.update.mockResolvedValue({} as any);
      mockUserRepo.update.mockResolvedValue({} as any);

      const result = await service.toggleCompany('company-1', true, 'admin-1');

      expect(mockCompanyRepo.update).toHaveBeenCalledWith('company-1', { is_active: true });
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        { company_id: 'company-1' },
        { is_active: true },
      );
      expect(mockAuditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'company.updated' }),
      );
      expect(result).toEqual({ id: 'company-1', is_active: true });
    });

    it('should disable a company and all its users', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(mockCompany);
      mockCompanyRepo.update.mockResolvedValue({} as any);
      mockUserRepo.update.mockResolvedValue({} as any);

      const result = await service.toggleCompany('company-1', false, 'admin-1');

      expect(mockCompanyRepo.update).toHaveBeenCalledWith('company-1', { is_active: false });
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        { company_id: 'company-1' },
        { is_active: false },
      );
      expect(mockAuditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'company.disabled' }),
      );
      expect(result).toEqual({ id: 'company-1', is_active: false });
    });

    it('should throw NotFoundException when company not found', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleCompany('nonexistent', true, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listUsers', () => {
    it('should return users with company relation', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[mockUser], 1]);

      const result = await service.listUsers({});

      expect(mockUserRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: ['company'],
        order: { created_at: 'DESC' },
        take: 50,
        skip: 0,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].company_name).toBe('Test Co');
    });

    it('should filter by companyId and role', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[mockUser], 1]);

      await service.listUsers({ companyId: 'company-1', role: UserRole.ADMIN });

      expect(mockUserRepo.findAndCount).toHaveBeenCalledWith({
        where: { company_id: 'company-1', role: UserRole.ADMIN },
        relations: ['company'],
        order: { created_at: 'DESC' },
        take: 50,
        skip: 0,
      });
    });

    it('should handle missing company relation', async () => {
      const userWithoutCompany = { ...mockUser, company: undefined };
      mockUserRepo.findAndCount.mockResolvedValue([[userWithoutCompany], 1]);

      const result = await service.listUsers({});

      expect(result.items[0].company_name).toBeUndefined();
    });
  });

  describe('toggleUser', () => {
    it('should enable a user and record audit', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue({} as any);

      const result = await service.toggleUser('user-1', true, 'admin-1');

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { is_active: true });
      expect(mockAuditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.updated', description: 'User john@test.com enabled' }),
      );
      expect(result).toEqual({ id: 'user-1', is_active: true });
    });

    it('should disable a user and record audit', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue({} as any);

      const result = await service.toggleUser('user-1', false, 'admin-1');

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { is_active: false });
      expect(mockAuditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.disabled', description: 'User john@test.com disabled' }),
      );
      expect(result).toEqual({ id: 'user-1', is_active: false });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleUser('nonexistent', true, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSystemStats', () => {
    it('should return all aggregate statistics', async () => {
      mockCompanyRepo.count.mockResolvedValueOnce(10);
      mockCompanyRepo.count.mockResolvedValueOnce(8);
      mockUserRepo.count.mockResolvedValueOnce(100);
      mockSessionRepo.count.mockResolvedValueOnce(20);
      mockSessionRepo.count.mockResolvedValueOnce(15);
      mockMessageRepo.count.mockResolvedValueOnce(5000);
      mockPlanRepo.count.mockResolvedValueOnce(3);
      mockSubscriptionRepo.count.mockResolvedValueOnce(5);
      mockSubscriptionRepo.count.mockResolvedValueOnce(3);
      mockUserRepo.count.mockResolvedValueOnce(2);
      mockUserRepo.count.mockResolvedValueOnce(90);
      mockUserRepo.count.mockResolvedValueOnce(1);

      const stats = await service.getSystemStats();

      expect(stats.companies).toEqual({ total: 10, active: 8 });
      expect(stats.users).toEqual({ total: 100, admins: 2, agents: 90, superadmins: 1 });
      expect(stats.sessions).toEqual({ total: 20, connected: 15 });
      expect(stats.messages).toEqual({ total: 5000 });
      expect(stats.plans).toEqual({ total: 3 });
      expect(stats.subscriptions).toEqual({ active: 5, trial: 3 });
    });

    it('should return zeros when no data exists', async () => {
      mockCompanyRepo.count.mockResolvedValue(0);
      mockCompanyRepo.count.mockResolvedValue(0);
      mockUserRepo.count.mockResolvedValue(0);
      mockSessionRepo.count.mockResolvedValue(0);
      mockSessionRepo.count.mockResolvedValue(0);
      mockMessageRepo.count.mockResolvedValue(0);
      mockPlanRepo.count.mockResolvedValue(0);
      mockSubscriptionRepo.count.mockResolvedValue(0);
      mockSubscriptionRepo.count.mockResolvedValue(0);
      mockUserRepo.count.mockResolvedValue(0);
      mockUserRepo.count.mockResolvedValue(0);
      mockUserRepo.count.mockResolvedValue(0);

      const stats = await service.getSystemStats();

      expect(stats.companies.total).toBe(0);
      expect(stats.users.total).toBe(0);
      expect(stats.sessions.total).toBe(0);
      expect(stats.messages.total).toBe(0);
    });
  });
});
