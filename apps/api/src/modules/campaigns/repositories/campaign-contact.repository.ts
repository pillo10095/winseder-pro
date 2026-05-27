import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { CampaignContact } from '../entities/campaign-contact.entity';

@Injectable()
export class CampaignContactRepository extends Repository<CampaignContact> {
  constructor(private dataSource: DataSource) {
    super(CampaignContact, dataSource.createEntityManager());
  }

  async findByCampaignId(campaignId: string): Promise<CampaignContact[]> {
    return this.createQueryBuilder('cc')
      .leftJoinAndSelect('cc.contact', 'contact')
      .where('cc.campaign_id = :campaignId', { campaignId })
      .orderBy('cc.created_at', 'ASC')
      .getMany();
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
