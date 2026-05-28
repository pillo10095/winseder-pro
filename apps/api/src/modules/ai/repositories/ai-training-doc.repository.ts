import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { AiTrainingDoc } from '../entities/ai-training-doc.entity';

@Injectable()
export class AiTrainingDocRepository extends Repository<AiTrainingDoc> {
  constructor(private dataSource: DataSource) {
    super(AiTrainingDoc, dataSource.createEntityManager());
  }

  async findByCompanyId(companyId: string): Promise<AiTrainingDoc[]> {
    return this.find({
      where: { company_id: companyId },
      order: { created_at: 'DESC' },
    });
  }
}
