import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Deal } from '../entities/deal.entity';
import type { QueryPipelineDto } from '../dto/query-pipeline.dto';

@Injectable()
export class DealRepository extends Repository<Deal> {
  constructor(private dataSource: DataSource) {
    super(Deal, dataSource.createEntityManager());
  }

  async findByCompanyId(
    companyId: string,
    stageId?: string,
    assignedTo?: string,
    search?: string,
    limit = 20,
    cursor?: string,
  ): Promise<[Deal[], number]> {
    const qb = this.createQueryBuilder('d')
      .leftJoinAndSelect('d.pipeline_stage', 'stage')
      .leftJoinAndSelect('d.contact', 'contact')
      .leftJoinAndSelect('d.assigned_user', 'assigned')
      .where('d.company_id = :companyId', { companyId })
      .orderBy('d.created_at', 'DESC')
      .take(limit);

    if (stageId) {
      qb.andWhere('d.pipeline_stage_id = :stageId', { stageId });
    }

    if (assignedTo) {
      qb.andWhere('d.assigned_to = :assignedTo', { assignedTo });
    }

    if (search) {
      qb.andWhere('(d.name LIKE :search OR d.company_name LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (cursor) {
      qb.andWhere('d.created_at < :cursor', { cursor });
    }

    return qb.getManyAndCount();
  }

  async findWithFilters(companyId: string, filters: QueryPipelineDto): Promise<[Deal[], number]> {
    const qb = this.createQueryBuilder('deal')
      .leftJoinAndSelect('deal.pipeline_stage', 'pipeline_stage')
      .leftJoinAndSelect('deal.contact', 'contact')
      .leftJoinAndSelect('deal.assigned_user', 'assigned_user')
      .where('deal.company_id = :companyId', { companyId });

    if (filters.stage) {
      qb.andWhere('pipeline_stage.name = :stage', { stage: filters.stage });
    }

    if (filters.search) {
      qb.andWhere(
        '(deal.name LIKE :search OR contact.name LIKE :search OR contact.email LIKE :search OR contact.phone LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.label) {
      qb.innerJoin('deal.labels', 'label_filter')
        .andWhere('label_filter.id = :labelId', { labelId: filters.label });
    }

    if (filters.assigned) {
      qb.andWhere('deal.assigned_to = :assigned', { assigned: filters.assigned });
    }

    if (filters.source) {
      qb.andWhere('contact.source = :source', { source: filters.source });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    qb.orderBy('deal.last_activity_at', 'DESC')
      .addOrderBy('deal.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async findByStageIds(stageIds: string[]): Promise<Deal[]> {
    return this.find({
      where: stageIds.map((id) => ({ pipeline_stage_id: id })),
      relations: ['pipeline_stage', 'contact', 'assigned_user'],
      order: { created_at: 'DESC' },
    });
  }
}
