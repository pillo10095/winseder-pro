import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserRole } from '../../auth/entities/user.entity';
import { Company } from '../../tenancy/entities/company.entity';
import { Plan } from '../../tenancy/entities/plan.entity';
import { Subscription, SubscriptionStatus } from '../../tenancy/entities/subscription.entity';
import { Session, SessionStatus } from '../../whatsapp/entities/session.entity';
import { Message } from '../../whatsapp/entities/message.entity';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly auditLog: AuditLogService,
  ) {}

  /* ───── Companies ───── */

  async listCompanies(options: {
    limit?: number;
    offset?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const query = this.companyRepo.createQueryBuilder('c')
      .orderBy('c.created_at', 'DESC');

    if (options.search) {
      query.where('c.name LIKE :search OR c.slug LIKE :search', {
        search: `%${options.search}%`,
      });
    }

    if (options.isActive !== undefined) {
      query.andWhere('c.is_active = :isActive', { isActive: options.isActive });
    }

    const [companies, total] = await query
      .skip(options.offset ?? 0)
      .take(options.limit ?? 20)
      .getManyAndCount();

    return {
      items: companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        logo_url: c.logo_url,
        is_active: c.is_active,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      total,
    };
  }

  async getCompanyDetail(companyId: string) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });

    if (!company) throw new NotFoundException('Company not found');

    const users = await this.userRepo.count({ where: { company_id: companyId } });
    const sessions = await this.sessionRepo.count({ where: { company_id: companyId } });
    // Use a simpler query — count all messages via session join
    const sessionIds = (await this.sessionRepo.find({
      where: { company_id: companyId },
      select: ['id'],
    })).map((s) => s.id);

    const messages = sessionIds.length > 0
      ? await this.messageRepo.count({ where: { session_id: sessionIds.length === 1 ? sessionIds[0] : undefined } })
      : 0;

    // Find active subscription
    const activeSubscription = await this.subscriptionRepo.findOne({
      where: [
        { company_id: companyId, status: SubscriptionStatus.ACTIVE },
        { company_id: companyId, status: SubscriptionStatus.TRIAL },
      ],
      relations: ['plan'],
      order: { created_at: 'DESC' },
    });

    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      is_active: company.is_active,
      created_at: company.created_at,
      stats: { users, sessions, messages },
      subscription: activeSubscription
        ? {
            id: activeSubscription.id,
            plan: activeSubscription.plan?.name,
            status: activeSubscription.status,
            ends_at: activeSubscription.ends_at,
          }
        : null,
    };
  }

  async toggleCompany(companyId: string, isActive: boolean, actorId: string) {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    await this.companyRepo.update(companyId, { is_active: isActive });

    // Also disable/enable all users
    await this.userRepo.update(
      { company_id: companyId },
      { is_active: isActive },
    );

    await this.auditLog.record({
      action: isActive ? 'company.updated' : 'company.disabled',
      actorId,
      companyId,
      targetId: companyId,
      targetType: 'company',
      description: `Company ${company.name} ${isActive ? 'enabled' : 'disabled'}`,
    });

    return { id: companyId, is_active: isActive };
  }

  /* ───── Users ───── */

  async listUsers(options: {
    limit?: number;
    offset?: number;
    companyId?: string;
    role?: UserRole;
  }) {
    const where: Partial<Record<string, unknown>> = {};
    if (options.companyId) where.company_id = options.companyId;
    if (options.role) where.role = options.role;

    const [users, total] = await this.userRepo.findAndCount({
      where,
      relations: ['company'],
      order: { created_at: 'DESC' },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });

    return {
      items: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        is_active: u.is_active,
        company_id: u.company_id,
        company_name: u.company?.name,
        last_login_at: u.last_login_at,
        created_at: u.created_at,
      })),
      total,
    };
  }

  async toggleUser(userId: string, isActive: boolean, actorId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.userRepo.update(userId, { is_active: isActive });

    await this.auditLog.record({
      action: isActive ? 'user.updated' : 'user.disabled',
      actorId,
      targetId: userId,
      targetType: 'user',
      description: `User ${user.email} ${isActive ? 'enabled' : 'disabled'}`,
    });

    return { id: userId, is_active: isActive };
  }

  /* ───── System Stats ───── */

  async getSystemStats() {
    const totalCompanies = await this.companyRepo.count();
    const activeCompanies = await this.companyRepo.count({ where: { is_active: true } });
    const totalUsers = await this.userRepo.count();
    const totalSessions = await this.sessionRepo.count();
    const connectedSessions = await this.sessionRepo.count({
      where: { status: SessionStatus.CONNECTED },
    });
    const totalMessages = await this.messageRepo.count();
    const totalPlans = await this.planRepo.count({ where: { is_active: true } });
    const activeSubscriptions = await this.subscriptionRepo.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });
    const trialSubscriptions = await this.subscriptionRepo.count({
      where: { status: SubscriptionStatus.TRIAL },
    });

    // Users by role
    const admins = await this.userRepo.count({ where: { role: UserRole.ADMIN } });
    const agents = await this.userRepo.count({ where: { role: UserRole.AGENT } });
    const superadmins = await this.userRepo.count({ where: { role: UserRole.SUPERADMIN } });

    return {
      companies: { total: totalCompanies, active: activeCompanies },
      users: { total: totalUsers, admins, agents, superadmins },
      sessions: { total: totalSessions, connected: connectedSessions },
      messages: { total: totalMessages },
      plans: { total: totalPlans },
      subscriptions: { active: activeSubscriptions, trial: trialSubscriptions },
    };
  }
}
