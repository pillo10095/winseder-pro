import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Activity } from '../entities/activity.entity';

@Injectable()
export class ActivityRepository extends Repository<Activity> {
  constructor(private dataSource: DataSource) {
    super(Activity, dataSource.createEntityManager());
  }

  async findByCompanyId(
    companyId: string,
    type?: string,
    contactId?: string,
    dealId?: string,
    limit = 50,
  ): Promise<Activity[]> {
    const qb = this.createQueryBuilder('a')
      .leftJoinAndSelect('a.contact', 'contact')
      .leftJoinAndSelect('a.deal', 'deal')
      .leftJoinAndSelect('a.logged_by_user', 'user')
      .where('a.company_id = :companyId', { companyId })
      .orderBy('a.activity_date', 'DESC')
      .take(limit);

    if (type) {
      qb.andWhere('a.type = :type', { type });
    }

    if (contactId) {
      qb.andWhere('a.contact_id = :contactId', { contactId });
    }

    if (dealId) {
      qb.andWhere('a.deal_id = :dealId', { dealId });
    }

    return qb.getMany();
  }
}
