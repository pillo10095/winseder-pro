import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { AiAgent } from '../entities/ai-agent.entity';

@Injectable()
export class AiAgentRepository extends Repository<AiAgent> {
  constructor(private dataSource: DataSource) {
    super(AiAgent, dataSource.createEntityManager());
  }

  async findByCompanyId(companyId: string): Promise<AiAgent | null> {
    return this.findOne({ where: { company_id: companyId } });
  }

  async findActiveByCompanyId(companyId: string): Promise<AiAgent | null> {
    return this.findOne({ where: { company_id: companyId, is_active: true } });
  }
}
