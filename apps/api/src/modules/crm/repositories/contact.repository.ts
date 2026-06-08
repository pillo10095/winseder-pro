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
    labelIds?: string[],
  ): Promise<[Contact[], number]> {
    const qb = this.createQueryBuilder('c')
      .leftJoinAndSelect('c.labels', 'labels')
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

    if (labelIds && labelIds.length > 0) {
      qb.innerJoin('contact_labels', 'cl', 'cl.contact_id = c.id')
        .andWhere('cl.label_id IN (:...labelIds)', { labelIds });
    }

    return qb.getManyAndCount();
  }
}
