import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Label } from '../entities/label.entity';

@Injectable()
export class LabelRepository extends Repository<Label> {
  constructor(private dataSource: DataSource) {
    super(Label, dataSource.createEntityManager());
  }

  async findByCompanyId(companyId: string): Promise<Label[]> {
    return this.find({
      where: { company_id: companyId },
      order: { name: 'ASC' },
    });
  }
}
