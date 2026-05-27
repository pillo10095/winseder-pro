import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { AutomationRule } from '../entities/automation-rule.entity';

@Injectable()
export class AutomationRuleRepository extends Repository<AutomationRule> {
  constructor(private dataSource: DataSource) {
    super(AutomationRule, dataSource.createEntityManager());
  }

  async findActiveByCompanyId(companyId: string): Promise<AutomationRule[]> {
    return this.find({
      where: { company_id: companyId, is_active: true },
      order: { priority: 'ASC' },
    });
  }

  async findByIdAndCompany(id: string, companyId: string): Promise<AutomationRule | null> {
    return this.findOne({ where: { id, company_id: companyId } });
  }
}
