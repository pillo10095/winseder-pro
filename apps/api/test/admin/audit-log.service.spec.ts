import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLogService, AuditEntry } from '@/modules/admin/services/audit-log.service';
import { AuditLog, AuditAction } from '@/modules/admin/entities/audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let auditRepo: Repository<AuditLog>;

  const mockAuditLogRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const baseEntry: AuditEntry = {
    action: AuditAction.USER_LOGIN,
    actorId: 'actor-1',
    actorEmail: 'admin@test.com',
    actorRole: 'admin',
    companyId: 'company-1',
    targetId: 'target-1',
    targetType: 'user',
    description: 'User login',
    ipAddress: '127.0.0.1',
  };

  const mockLog: Partial<AuditLog> = {
    id: 'log-1',
    action: AuditAction.USER_LOGIN,
    actor_id: 'actor-1',
    actor_email: 'admin@test.com',
    actor_role: 'admin',
    company_id: 'company-1',
    target_id: 'target-1',
    target_type: 'user',
    description: 'User login',
    ip_address: '127.0.0.1',
    created_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    auditRepo = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
    jest.clearAllMocks();
  });

  describe('record', () => {
    it('should create and save an audit log entry with all fields', async () => {
      mockAuditLogRepo.create.mockReturnValue(mockLog);
      mockAuditLogRepo.save.mockResolvedValue(mockLog);

      const result = await service.record(baseEntry);

      expect(mockAuditLogRepo.create).toHaveBeenCalledWith({
        action: baseEntry.action,
        actor_id: baseEntry.actorId,
        actor_email: baseEntry.actorEmail,
        actor_role: baseEntry.actorRole,
        company_id: baseEntry.companyId,
        target_id: baseEntry.targetId,
        target_type: baseEntry.targetType,
        description: baseEntry.description,
        metadata: undefined,
        ip_address: baseEntry.ipAddress,
      });
      expect(mockAuditLogRepo.save).toHaveBeenCalledWith(mockLog);
      expect(result).toEqual(mockLog);
    });

    it('should create and save with minimal fields', async () => {
      const minimalEntry: AuditEntry = { action: AuditAction.SYSTEM_CONFIG_CHANGED };
      const minimalLog: Partial<AuditLog> = { id: 'log-2', action: AuditAction.SYSTEM_CONFIG_CHANGED };
      mockAuditLogRepo.create.mockReturnValue(minimalLog);
      mockAuditLogRepo.save.mockResolvedValue(minimalLog);

      const result = await service.record(minimalEntry);

      expect(mockAuditLogRepo.create).toHaveBeenCalledWith({
        action: 'system.config.changed',
        actor_id: undefined,
        actor_email: undefined,
        actor_role: undefined,
        company_id: undefined,
        target_id: undefined,
        target_type: undefined,
        description: undefined,
        metadata: undefined,
        ip_address: undefined,
      });
      expect(result).toEqual(minimalLog);
    });

    it('should pass metadata as-is when provided', async () => {
      const entryWithMeta: AuditEntry = {
        ...baseEntry,
        metadata: { browser: 'Chrome', ip_country: 'MX' },
      };
      const logWithMeta = { ...mockLog, metadata: { browser: 'Chrome', ip_country: 'MX' } };
      mockAuditLogRepo.create.mockReturnValue(logWithMeta);
      mockAuditLogRepo.save.mockResolvedValue(logWithMeta);

      const result = await service.record(entryWithMeta);

      expect(mockAuditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { browser: 'Chrome', ip_country: 'MX' } }),
      );
      expect(result).toEqual(logWithMeta);
    });
  });

  describe('findByCompany', () => {
    it('should return logs for a company with default pagination', async () => {
      mockAuditLogRepo.findAndCount.mockResolvedValue([[mockLog], 1]);

      const result = await service.findByCompany('company-1');

      expect(mockAuditLogRepo.findAndCount).toHaveBeenCalledWith({
        where: { company_id: 'company-1' },
        order: { created_at: 'DESC' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual({ items: [mockLog], total: 1 });
    });

    it('should filter by action when provided', async () => {
      mockAuditLogRepo.findAndCount.mockResolvedValue([[mockLog], 1]);

      const result = await service.findByCompany('company-1', { action: AuditAction.USER_LOGIN, limit: 10, offset: 5 });

      expect(mockAuditLogRepo.findAndCount).toHaveBeenCalledWith({
        where: { company_id: 'company-1', action: AuditAction.USER_LOGIN },
        order: { created_at: 'DESC' },
        take: 10,
        skip: 5,
      });
      expect(result.items).toHaveLength(1);
    });

    it('should return empty array when no logs exist', async () => {
      mockAuditLogRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findByCompany('nonexistent');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return all logs with no filters', async () => {
      mockAuditLogRepo.findAndCount.mockResolvedValue([[mockLog], 1]);

      const result = await service.findAll();

      expect(mockAuditLogRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { created_at: 'DESC' },
        take: 50,
        skip: 0,
      });
      expect(result.items).toHaveLength(1);
    });

    it('should filter by action, companyId, and actorId', async () => {
      mockAuditLogRepo.findAndCount.mockResolvedValue([[mockLog], 1]);

      const result = await service.findAll({
        action: AuditAction.USER_LOGIN,
        companyId: 'company-1',
        actorId: 'actor-1',
      });

      expect(mockAuditLogRepo.findAndCount).toHaveBeenCalledWith({
        where: { action: AuditAction.USER_LOGIN, company_id: 'company-1', actor_id: 'actor-1' },
        order: { created_at: 'DESC' },
        take: 50,
        skip: 0,
      });
    });

    it('should apply custom limit and offset', async () => {
      mockAuditLogRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ limit: 5, offset: 100 });

      expect(mockAuditLogRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { created_at: 'DESC' },
        take: 5,
        skip: 100,
      });
    });
  });

  describe('getStats', () => {
    it('should return aggregated stats for default 30 days', async () => {
      const now = new Date();
      const logs = [
        { action: AuditAction.USER_LOGIN, created_at: now },
        { action: AuditAction.USER_LOGIN, created_at: now },
        { action: AuditAction.USER_CREATED, created_at: now },
      ];
      mockAuditLogRepo.find.mockResolvedValue(logs);

      const result = await service.getStats();

      expect(mockAuditLogRepo.find).toHaveBeenCalledWith({
        where: { created_at: expect.anything() },
        select: ['action', 'created_at'],
      });
      expect(result.total).toBe(3);
      expect(result.byAction).toEqual({ 'user.login': 2, 'user.created': 1 });
    });

    it('should return per-day breakdown', async () => {
      const dayStr = '2026-05-27';
      const logs = [
        { action: AuditAction.USER_LOGIN, created_at: new Date(`${dayStr}T10:00:00Z`) },
        { action: AuditAction.USER_LOGIN, created_at: new Date(`${dayStr}T11:00:00Z`) },
      ];
      mockAuditLogRepo.find.mockResolvedValue(logs);

      const result = await service.getStats(7);

      expect(result.byDay[dayStr]).toBe(2);
    });

    it('should return empty stats when no logs exist', async () => {
      mockAuditLogRepo.find.mockResolvedValue([]);

      const result = await service.getStats(30);

      expect(result.total).toBe(0);
      expect(result.byAction).toEqual({});
      expect(result.byDay).toEqual({});
    });
  });

  describe('cleanup', () => {
    it('should delete logs older than specified days and return count', async () => {
      mockAuditLogRepo.delete.mockResolvedValue({ affected: 10 });

      const result = await service.cleanup(90);

      expect(mockAuditLogRepo.delete).toHaveBeenCalledWith({
        created_at: expect.anything(),
      });
      expect(result).toBe(10);
    });

    it('should return 0 when no old logs exist', async () => {
      mockAuditLogRepo.delete.mockResolvedValue({ affected: 0 });

      const result = await service.cleanup(90);

      expect(result).toBe(0);
    });

    it('should use default 90 days when not specified', async () => {
      mockAuditLogRepo.delete.mockResolvedValue({ affected: 5 });

      const result = await service.cleanup();

      expect(result).toBe(5);
    });
  });
});
