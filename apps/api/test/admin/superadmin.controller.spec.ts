import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { SuperAdminController } from '@/modules/admin/controllers/superadmin.controller';
import { SuperAdminService } from '@/modules/admin/services/superadmin.service';
import { AuditLogService } from '@/modules/admin/services/audit-log.service';

function mockRequest(overrides?: Partial<Request>): Request {
  return {
    user: { id: 'admin-1' },
    ...overrides,
  } as unknown as Request;
}

const mockSystemStats = {
  companies: { total: 10, active: 8 },
  users: { total: 100, admins: 2, agents: 90, superadmins: 1 },
  sessions: { total: 20, connected: 15 },
  messages: { total: 5000 },
  plans: { total: 3 },
  subscriptions: { active: 5, trial: 3 },
};

const mockCompanyList = {
  items: [
    { id: 'company-1', name: 'Test Co', slug: 'test-co', is_active: true, created_at: new Date(), updated_at: new Date() },
  ],
  total: 1,
};

const mockCompanyDetail = {
  id: 'company-1',
  name: 'Test Co',
  slug: 'test-co',
  is_active: true,
  created_at: new Date(),
  stats: { users: 3, sessions: 2, messages: 50 },
  subscription: { id: 'sub-1', plan: 'Pro', status: 'active', ends_at: new Date() },
};

const mockUserList = {
  items: [
    { id: 'user-1', name: 'John', email: 'john@test.com', role: 'admin', is_active: true, company_id: 'company-1', company_name: 'Test Co', last_login_at: new Date(), created_at: new Date() },
  ],
  total: 1,
};

const mockAuditResult = {
  items: [{ id: 'log-1', action: 'company.updated', description: 'Company updated' }],
  total: 1,
};

const mockAuditStats = { total: 50, byAction: { 'company.updated': 10 }, byDay: { '2026-05-27': 5 } };

describe('SuperAdminController', () => {
  let controller: SuperAdminController;

  const mockSuperAdmin = {
    getSystemStats: jest.fn(),
    listCompanies: jest.fn(),
    getCompanyDetail: jest.fn(),
    toggleCompany: jest.fn(),
    listUsers: jest.fn(),
    toggleUser: jest.fn(),
  };

  const mockAuditLog = {
    findAll: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminController],
      providers: [
        { provide: SuperAdminService, useValue: mockSuperAdmin },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<SuperAdminController>(SuperAdminController);
  });

  describe('getStats', () => {
    it('should return system stats', async () => {
      mockSuperAdmin.getSystemStats.mockResolvedValue(mockSystemStats);

      const result = await controller.getStats();

      expect(result).toEqual({ data: mockSystemStats });
    });

    it('should return zeroed stats when no data exists', async () => {
      const emptyStats = {
        companies: { total: 0, active: 0 },
        users: { total: 0, admins: 0, agents: 0, superadmins: 0 },
        sessions: { total: 0, connected: 0 },
        messages: { total: 0 },
        plans: { total: 0 },
        subscriptions: { active: 0, trial: 0 },
      };
      mockSuperAdmin.getSystemStats.mockResolvedValue(emptyStats);

      const result = await controller.getStats();

      expect(result.data.companies.total).toBe(0);
    });
  });

  describe('listCompanies', () => {
    it('should list companies with all query params', async () => {
      mockSuperAdmin.listCompanies.mockResolvedValue(mockCompanyList);

      const result = await controller.listCompanies('20', '0', 'Test', 'true');

      expect(result).toEqual({ data: mockCompanyList });
      expect(mockSuperAdmin.listCompanies).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        search: 'Test',
        isActive: true,
      });
    });

    it('should handle undefined query params', async () => {
      mockSuperAdmin.listCompanies.mockResolvedValue(mockCompanyList);

      await controller.listCompanies();

      expect(mockSuperAdmin.listCompanies).toHaveBeenCalledWith({
        limit: undefined,
        offset: undefined,
        search: undefined,
        isActive: undefined,
      });
    });

    it('should parse isActive correctly', async () => {
      mockSuperAdmin.listCompanies.mockResolvedValue(mockCompanyList);

      await controller.listCompanies(undefined, undefined, undefined, 'false');

      expect(mockSuperAdmin.listCompanies).toHaveBeenCalledWith({
        limit: undefined,
        offset: undefined,
        search: undefined,
        isActive: false,
      });
    });
  });

  describe('getCompany', () => {
    it('should return company detail', async () => {
      mockSuperAdmin.getCompanyDetail.mockResolvedValue(mockCompanyDetail);

      const result = await controller.getCompany('company-1');

      expect(result).toEqual({ data: mockCompanyDetail });
      expect(mockSuperAdmin.getCompanyDetail).toHaveBeenCalledWith('company-1');
    });
  });

  describe('toggleCompany', () => {
    const body = { is_active: false };
    const req = mockRequest();

    it('should toggle company active state', async () => {
      mockSuperAdmin.toggleCompany.mockResolvedValue({ id: 'company-1', is_active: false });

      const result = await controller.toggleCompany('company-1', body, req);

      expect(result).toEqual({ data: { id: 'company-1', is_active: false } });
      expect(mockSuperAdmin.toggleCompany).toHaveBeenCalledWith('company-1', false, 'admin-1');
    });

    it('should enable company', async () => {
      mockSuperAdmin.toggleCompany.mockResolvedValue({ id: 'company-1', is_active: true });

      await controller.toggleCompany('company-1', { is_active: true }, req);

      expect(mockSuperAdmin.toggleCompany).toHaveBeenCalledWith('company-1', true, 'admin-1');
    });
  });

  describe('listUsers', () => {
    it('should list users with all filters', async () => {
      mockSuperAdmin.listUsers.mockResolvedValue(mockUserList);

      const result = await controller.listUsers('50', '0', 'company-1', 'admin');

      expect(result).toEqual({ data: mockUserList });
      expect(mockSuperAdmin.listUsers).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        companyId: 'company-1',
        role: 'admin',
      });
    });

    it('should handle missing query params', async () => {
      mockSuperAdmin.listUsers.mockResolvedValue(mockUserList);

      await controller.listUsers();

      expect(mockSuperAdmin.listUsers).toHaveBeenCalledWith({
        limit: undefined,
        offset: undefined,
        companyId: undefined,
        role: undefined,
      });
    });
  });

  describe('toggleUser', () => {
    const body = { is_active: false };
    const req = mockRequest();

    it('should toggle user active state', async () => {
      mockSuperAdmin.toggleUser.mockResolvedValue({ id: 'user-1', is_active: false });

      const result = await controller.toggleUser('user-1', body, req);

      expect(result).toEqual({ data: { id: 'user-1', is_active: false } });
      expect(mockSuperAdmin.toggleUser).toHaveBeenCalledWith('user-1', false, 'admin-1');
    });
  });

  describe('getAuditLog', () => {
    it('should return audit logs with filters', async () => {
      mockAuditLog.findAll.mockResolvedValue(mockAuditResult);

      const result = await controller.getAuditLog('20', '0', 'company.updated', 'company-1', 'admin-1');

      expect(result).toEqual({ data: mockAuditResult });
      expect(mockAuditLog.findAll).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        action: 'company.updated',
        companyId: 'company-1',
        actorId: 'admin-1',
      });
    });

    it('should handle missing query params', async () => {
      mockAuditLog.findAll.mockResolvedValue({ items: [], total: 0 });

      await controller.getAuditLog();

      expect(mockAuditLog.findAll).toHaveBeenCalledWith({
        limit: undefined,
        offset: undefined,
        action: undefined,
        companyId: undefined,
        actorId: undefined,
      });
    });

    it('should return empty array when no logs', async () => {
      mockAuditLog.findAll.mockResolvedValue({ items: [], total: 0 });

      const result = await controller.getAuditLog();

      expect(result.data.items).toEqual([]);
      expect(result.data.total).toBe(0);
    });
  });

  describe('getAuditStats', () => {
    it('should return audit stats with default days', async () => {
      mockAuditLog.getStats.mockResolvedValue(mockAuditStats);

      const result = await controller.getAuditStats();

      expect(result).toEqual({ data: mockAuditStats });
      expect(mockAuditLog.getStats).toHaveBeenCalledWith(30);
    });

    it('should accept custom days param', async () => {
      mockAuditLog.getStats.mockResolvedValue({ total: 10, byAction: {}, byDay: {} });

      await controller.getAuditStats('7');

      expect(mockAuditLog.getStats).toHaveBeenCalledWith(7);
    });
  });
});
