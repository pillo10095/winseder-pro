import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { AiLog } from '../entities/ai-log.entity';

@Injectable()
export class AiLogRepository extends Repository<AiLog> {
  constructor(private dataSource: DataSource) {
    super(AiLog, dataSource.createEntityManager());
  }

  async findByCompanyId(
    companyId: string,
    limit = 50,
  ): Promise<AiLog[]> {
    return this.find({
      where: { company_id: companyId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
