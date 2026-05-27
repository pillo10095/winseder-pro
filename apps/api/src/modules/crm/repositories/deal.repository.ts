import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Deal } from '../entities/deal.entity';

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

  async findByStageIds(stageIds: string[]): Promise<Deal[]> {
    return this.find({
      where: stageIds.map((id) => ({ pipeline_stage_id: id })),
      relations: ['pipeline_stage', 'contact', 'assigned_user'],
      order: { created_at: 'DESC' },
    });
  }
}
