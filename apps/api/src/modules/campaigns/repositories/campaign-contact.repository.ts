import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { CampaignContact } from '../entities/campaign-contact.entity';

@Injectable()
export class CampaignContactRepository extends Repository<CampaignContact> {
  constructor(private dataSource: DataSource) {
    super(CampaignContact, dataSource.createEntityManager());
  }

  async findByCampaignId(
    campaignId: string,
    limit = 50,
    cursor?: string,
  ): Promise<[CampaignContact[], number]> {
    const qb = this.createQueryBuilder('cc')
      .leftJoinAndSelect('cc.contact', 'contact')
      .where('cc.campaign_id = :campaignId', { campaignId })
      .orderBy('cc.created_at', 'ASC')
      .take(limit);

    if (cursor) {
      qb.andWhere('cc.created_at > :cursor', { cursor });
    }

    return qb.getManyAndCount();
  }

  async countByCampaignIdAndStatus(
    campaignId: string,
    status: string,
  ): Promise<number> {
    return this.count({
      where: { campaign_id: campaignId, status },
    });
  }
}
