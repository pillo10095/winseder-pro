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
  ): Promise<Template[]> {
    const qb = this.createQueryBuilder('t')
      .where('t.company_id = :companyId', { companyId })
      .orderBy('t.created_at', 'DESC');

    if (search) {
      qb.andWhere('t.name LIKE :search', { search: `%${search}%` });
    }

    return qb.getMany();
  }
}
