import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Template } from '../entities/template.entity';

@Injectable()
export class TemplateRepository extends Repository<Template> {
  constructor(private dataSource: DataSource) {
    super(Template, dataSource.createEntityManager());
  }

  async findByCompanyId(
    companyId: string,
    search?: string,
    limit = 20,
    cursor?: string,
  ): Promise<[Template[], number]> {
    const qb = this.createQueryBuilder('t')
      .where('t.company_id = :companyId', { companyId })
      .orderBy('t.created_at', 'DESC')
      .take(limit);

    if (search) {
      qb.andWhere('t.name LIKE :search', { search: `%${search}%` });
    }

    if (cursor) {
      qb.andWhere('t.created_at < :cursor', { cursor });
    }

    return qb.getManyAndCount();
  }
}
