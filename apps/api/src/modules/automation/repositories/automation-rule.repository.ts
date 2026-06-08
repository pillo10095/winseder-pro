import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AutomationRule, RuleEvent } from '../entities/automation-rule.entity';

@Injectable()
export class AutomationRuleRepository extends Repository<AutomationRule> {
  constructor(private dataSource: DataSource) {
    super(AutomationRule, dataSource.createEntityManager());
  }

  async findByCompanyId(companyId: string): Promise<AutomationRule[]> {
    return this.find({ where: { company_id: companyId }, order: { created_at: 'DESC' } });
  }

  async findEnabledByEvent(companyId: string, event: RuleEvent): Promise<AutomationRule[]> {
    return this.find({ where: { company_id: companyId, event, enabled: true } });
  }
}
