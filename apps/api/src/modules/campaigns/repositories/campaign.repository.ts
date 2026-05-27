import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Campaign } from '../entities/campaign.entity';

@Injectable()
export class CampaignRepository extends Repository<Campaign> {
  constructor(private dataSource: DataSource) {
    super(Campaign, dataSource.createEntityManager());
  }

  async findByCompanyId(
    companyId: string,
    limit = 20,
    cursor?: string,
  ): Promise<[Campaign[], number]> {
    const qb = this.createQueryBuilder('c')
      .leftJoinAndSelect('c.template', 'template')
      .where('c.company_id = :companyId', { companyId })
      .orderBy('c.created_at', 'DESC')
      .take(limit);

    if (cursor) {
      qb.andWhere('c.created_at < :cursor', { cursor });
    }

    return qb.getManyAndCount();
  }

  async findScheduledDue(): Promise<Campaign[]> {
    return this.createQueryBuilder('c')
      .where('c.status = :status', { status: 'scheduled' })
      .andWhere('c.scheduled_at <= NOW()')
      .getMany();
  }
}
