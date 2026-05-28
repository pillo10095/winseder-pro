import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Plan } from '../../tenancy/entities/plan.entity';
import { Subscription, SubscriptionStatus } from '../../tenancy/entities/subscription.entity';
import { Company } from '../../tenancy/entities/company.entity';
import { AuditLogService } from './audit-log.service';

export interface CreatePlanDto {
  name: string;
  code: string;
  description?: string;
  price_mxn: number;
  max_contacts?: number;
  max_whatsapp_sessions?: number;
  max_campaigns_per_month?: number;
  features?: string[];
}

export interface UpdatePlanDto extends Partial<CreatePlanDto> {
  is_active?: boolean;
}

export interface CreateSubscriptionDto {
  company_id: string;
  plan_id: string;
  status?: SubscriptionStatus;
  trial_days?: number;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly auditLog: AuditLogService,
  ) {}

  /* ───── Plans ───── */

  async listPlans(includeInactive = false) {
    const where = includeInactive ? {} : { is_active: true };
    return this.planRepo.find({ where, order: { price_mxn: 'ASC' } });
  }

  async getPlan(planId: string) {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async createPlan(dto: CreatePlanDto, actorId: string) {
    const plan = this.planRepo.create({
      name: dto.name,
      code: dto.code,
      description: dto.description ?? '',
      price_mxn: dto.price_mxn,
      max_contacts: dto.max_contacts ?? 100,
      max_whatsapp_sessions: dto.max_whatsapp_sessions ?? 1,
      max_campaigns_per_month: dto.max_campaigns_per_month ?? 0,
      features: dto.features ?? [],
      is_active: true,
    });

    const saved = await this.planRepo.save(plan);

    await this.auditLog.record({
      action: 'plan.created',
      actorId,
      targetId: saved.id,
      targetType: 'plan',
      description: `Plan created: ${saved.name} ($${saved.price_mxn})`,
    });

    return saved;
  }

  async updatePlan(planId: string, dto: UpdatePlanDto, actorId: string) {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    await this.planRepo.update(planId, {
      ...dto,
      features: dto.features ?? plan.features,
    });

    const updated = await this.planRepo.findOne({ where: { id: planId } });

    await this.auditLog.record({
      action: dto.is_active === false ? 'plan.disabled' : 'plan.updated',
      actorId,
      targetId: planId,
      targetType: 'plan',
      description: `Plan updated: ${plan.name}`,
    });

    return updated;
  }

  /* ───── Subscriptions ───── */

  async listSubscriptions(options: {
    limit?: number;
    offset?: number;
    status?: SubscriptionStatus;
    companyId?: string;
  }) {
    const where: any = {};
    if (options.status) where.status = options.status;
    if (options.companyId) where.company_id = options.companyId;

    const [items, total] = await this.subscriptionRepo.findAndCount({
      where,
      relations: ['plan', 'company'],
      order: { created_at: 'DESC' },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });

    return {
      items: items.map((s) => ({
        id: s.id,
        company_id: s.company_id,
        company_name: s.company?.name,
        plan_id: s.plan_id,
        plan_name: s.plan?.name,
        plan_price: s.plan?.price_mxn,
        status: s.status,
        trial_ends_at: s.trial_ends_at,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        cancelled_at: s.cancelled_at,
        created_at: s.created_at,
      })),
      total,
    };
  }

  async assignPlan(dto: CreateSubscriptionDto, actorId: string) {
    const company = await this.companyRepo.findOne({ where: { id: dto.company_id } });
    if (!company) throw new NotFoundException('Company not found');

    const plan = await this.planRepo.findOne({ where: { id: dto.plan_id } });
    if (!plan) throw new NotFoundException('Plan not found');

    // Cancel any active subscriptions
    await this.subscriptionRepo.update(
      { company_id: dto.company_id, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.CANCELLED, cancelled_at: new Date() },
    );

    const startsAt = new Date();
    let trialEndsAt: Date | undefined;
    let endsAt: Date | undefined;

    if (dto.status === SubscriptionStatus.TRIAL || (!dto.status && dto.trial_days)) {
      trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + (dto.trial_days ?? 14));
    }

    if (dto.status === SubscriptionStatus.ACTIVE) {
      endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + 1); // 1 month
    }

    const subscription = this.subscriptionRepo.create({
      company_id: dto.company_id,
      plan_id: dto.plan_id,
      status: dto.status ?? SubscriptionStatus.TRIAL,
      trial_ends_at: trialEndsAt,
      starts_at: startsAt,
      ends_at: endsAt,
    });

    const saved = await this.subscriptionRepo.save(subscription);

    await this.auditLog.record({
      action: 'subscription.created',
      actorId,
      companyId: dto.company_id,
      targetId: saved.id,
      targetType: 'subscription',
      description: `Plan ${plan.name} assigned to ${company.name}`,
    });

    return saved;
  }

  async cancelSubscription(subscriptionId: string, actorId: string) {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: ['plan', 'company'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    await this.subscriptionRepo.update(subscriptionId, {
      status: SubscriptionStatus.CANCELLED,
      cancelled_at: new Date(),
    });

    await this.auditLog.record({
      action: 'subscription.cancelled',
      actorId,
      companyId: sub.company_id,
      targetId: subscriptionId,
      targetType: 'subscription',
      description: `Subscription cancelled: ${sub.plan?.name} for ${sub.company?.name}`,
    });

    return { id: subscriptionId, status: SubscriptionStatus.CANCELLED };
  }
}
