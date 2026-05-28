import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';

import { AuditLog, AuditAction } from '../entities/audit-log.entity';

export interface AuditEntry {
  action: AuditAction | string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  companyId?: string;
  targetId?: string;
  targetType?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async record(entry: AuditEntry): Promise<AuditLog> {
    const log = this.auditRepo.create({
      action: entry.action,
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      actor_role: entry.actorRole,
      company_id: entry.companyId,
      target_id: entry.targetId,
      target_type: entry.targetType,
      description: entry.description,
      metadata: entry.metadata as Record<string, any> | undefined,
      ip_address: entry.ipAddress,
    });

    const saved = await this.auditRepo.save(log);
    this.logger.debug(`[Audit] ${entry.action} — ${entry.description ?? ''}`);
    return saved;
  }

  async findByCompany(
    companyId: string,
    options: { limit?: number; offset?: number; action?: string } = {},
  ) {
    const where: any = { company_id: companyId };
    if (options.action) where.action = options.action;

    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });

    return { items, total };
  }

  async findAll(options: {
    limit?: number;
    offset?: number;
    action?: string;
    companyId?: string;
    actorId?: string;
  } = {}) {
    const where: any = {};
    if (options.action) where.action = options.action;
    if (options.companyId) where.company_id = options.companyId;
    if (options.actorId) where.actor_id = options.actorId;

    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });

    return { items, total };
  }

  async getStats(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.auditRepo.find({
      where: { created_at: MoreThan(since) },
      select: ['action', 'created_at'],
    });

    const byAction: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] ?? 0) + 1;
      const day = log.created_at.toISOString().split('T')[0];
      byDay[day] = (byDay[day] ?? 0) + 1;
    }

    return { total: logs.length, byAction, byDay };
  }

  async cleanup(olderThanDays: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.auditRepo.delete({ created_at: LessThan(cutoff) });
    this.logger.log(`Cleaned up ${result.affected} audit logs older than ${olderThanDays} days`);
    return result.affected ?? 0;
  }
}
