import { Injectable, Logger } from '@nestjs/common';
import type { DeepPartial } from 'typeorm';

import { Deal } from '../entities/deal.entity';
import { DealRepository } from '../repositories/deal.repository';
import { ActivityService } from './activity.service';
import { CreateDealDto } from '../dto/create-deal.dto';
import { UpdateDealDto } from '../dto/update-deal.dto';
import type { QueryPipelineDto } from '../dto/query-pipeline.dto';

@Injectable()
export class DealService {
  private readonly logger = new Logger(DealService.name);

  constructor(
    private readonly dealRepo: DealRepository,
    private readonly activityService: ActivityService,
  ) {}

  async create(companyId: string, dto: CreateDealDto): Promise<Deal> {
    return this.dealRepo.save(
      this.dealRepo.create({ ...dto, company_id: companyId }),
    );
  }

  async findByCompanyId(
    companyId: string,
    stageId?: string,
    assignedTo?: string,
    search?: string,
    limit = 20,
    cursor?: string,
  ): Promise<[Deal[], number]> {
    return this.dealRepo.findByCompanyId(companyId, stageId, assignedTo, search, limit, cursor);
  }

  async findWithFilters(companyId: string, filters: QueryPipelineDto): Promise<[Deal[], number]> {
    return this.dealRepo.findWithFilters(companyId, filters);
  }

  async findById(id: string): Promise<Deal | null> {
    return this.dealRepo.findOne({
      where: { id },
      relations: ['pipeline_stage', 'contact', 'assigned_user'],
    });
  }

  async update(id: string, dto: UpdateDealDto): Promise<Deal | null> {
    await this.dealRepo.update(id, dto as unknown as DeepPartial<Deal>);
    return this.findById(id);
  }

  async moveStage(id: string, stageId: string, userId: string, reason?: string): Promise<Deal | null> {
    const deal = await this.dealRepo.findOne({ where: { id } });
    if (!deal) return null;

    const oldStageId = deal.pipeline_stage_id;
    const update: DeepPartial<Deal> = {
      pipeline_stage_id: stageId,
      last_activity_at: new Date(),
    };
    if (reason) update.won_lost_reason = reason;
    await this.dealRepo.update(id, update);

    // Auto-create system activity on stage change
    if (oldStageId !== stageId) {
      try {
        await this.activityService.create(deal.company_id, userId, {
          deal_id: id,
          type: 'system' as any,
          description: reason
            ? `Movido a nueva etapa: ${reason}`
            : 'Etapa actualizada',
          activity_date: new Date().toISOString(),
        });
      } catch (err) {
        this.logger.warn(`Failed to create system activity for deal ${id}: ${err}`);
      }
    }

    return this.findById(id);
  }

  async getStats(companyId: string): Promise<{
    total_deals: number;
    total_value: number;
    avg_value: number;
    conversion_rate: number;
    by_stage: { stage_name: string; stage_color: string; count: number; value: number }[];
  }> {
    const totalsQb = this.dealRepo.createQueryBuilder('deal')
      .leftJoin('deal.pipeline_stage', 'stage')
      .where('deal.company_id = :companyId', { companyId })
      .select([
        'COUNT(deal.id) as total_deals',
        'COALESCE(SUM(deal.value), 0) as total_value',
        'COALESCE(AVG(deal.value), 0) as avg_value',
      ]);

    const totals = await totalsQb.getRawOne();
    const totalDeals = Number(totals?.total_deals) || 0;
    const totalValue = Number(totals?.total_value) || 0;

    // Count won deals (cerrado_ganado or similar)
    const allStages = await this.dealRepo.createQueryBuilder('deal')
      .leftJoin('deal.pipeline_stage', 'stage')
      .where('deal.company_id = :companyId', { companyId })
      .select(['stage.name as stage_name', 'COUNT(deal.id) as cnt'])
      .groupBy('stage.name')
      .getRawMany();

    const wonCounts = allStages.filter(
      (s: any) => s.stage_name?.toLowerCase().includes('ganado') || s.stage_name?.toLowerCase().includes('won'),
    );
    const wonTotal = wonCounts.reduce((sum: number, s: any) => sum + Number(s.cnt || 0), 0);
    const conversionRate = totalDeals > 0 ? (wonTotal / totalDeals) * 100 : 0;

    // Stats by stage
    const byStage = await this.dealRepo.createQueryBuilder('deal')
      .leftJoin('deal.pipeline_stage', 'stage')
      .where('deal.company_id = :companyId', { companyId })
      .select([
        'stage.name as stage_name',
        'stage.color as stage_color',
        'COUNT(deal.id) as count',
        'COALESCE(SUM(deal.value), 0) as value',
      ])
      .groupBy('stage.name')
      .addGroupBy('stage.color')
      .orderBy('stage.sort_order', 'ASC')
      .getRawMany();

    return {
      total_deals: totalDeals,
      total_value: totalValue,
      avg_value: totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      by_stage: byStage.map((s: any) => ({
        stage_name: s.stage_name,
        stage_color: s.stage_color,
        count: Number(s.count) || 0,
        value: Number(s.value) || 0,
      })),
    };
  }

  async remove(id: string): Promise<void> {
    await this.dealRepo.delete(id);
  }
}
