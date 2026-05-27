import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Contact } from '../entities/contact.entity';

@Injectable()
export class ContactRepository extends Repository<Contact> {
  constructor(private dataSource: DataSource) {
    super(Contact, dataSource.createEntityManager());
  }

  async findByCompanyId(
    companyId: string,
    search?: string,
    limit = 20,
    cursor?: string,
  ): Promise<[Contact[], number]> {
    const qb = this.createQueryBuilder('c')
      .where('c.company_id = :companyId', { companyId })
      .orderBy('c.created_at', 'DESC')
      .take(limit);

    if (search) {
      qb.andWhere(
        '(c.name LIKE :search OR c.email LIKE :search OR c.company_name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (cursor) {
      qb.andWhere('c.created_at < :cursor', { cursor });
    }

    return qb.getManyAndCount();
  }
}
