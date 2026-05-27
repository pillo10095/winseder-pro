import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { PipelineStage } from '../entities/pipeline-stage.entity';

@Injectable()
export class PipelineStageRepository extends Repository<PipelineStage> {
  constructor(private dataSource: DataSource) {
    super(PipelineStage, dataSource.createEntityManager());
  }

  async findByCompanyId(companyId: string): Promise<PipelineStage[]> {
    return this.find({
      where: { company_id: companyId },
      order: { sort_order: 'ASC' },
    });
  }
}
