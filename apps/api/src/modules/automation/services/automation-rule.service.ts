import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import { AutomationRule } from '../entities/automation-rule.entity';
import { AutomationRuleRepository } from '../repositories/automation-rule.repository';
import { CreateAutomationRuleDto } from '../dto/create-automation-rule.dto';

@Injectable()
export class AutomationRuleService {
  private readonly logger = new Logger(AutomationRuleService.name);

  constructor(private readonly repo: AutomationRuleRepository) {}

  async findByCompanyId(companyId: string): Promise<AutomationRule[]> {
    return this.repo.findByCompanyId(companyId);
  }

  async create(companyId: string, dto: CreateAutomationRuleDto): Promise<AutomationRule> {
    const rule = this.repo.create({ ...dto, company_id: companyId } as DeepPartial<AutomationRule>);
    return this.repo.save(rule);
  }

  async update(id: string, dto: Partial<CreateAutomationRuleDto>, companyId: string): Promise<AutomationRule> {
    const rule = await this.repo.findOne({ where: { id, company_id: companyId } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    Object.assign(rule, dto);
    return this.repo.save(rule);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const rule = await this.repo.findOne({ where: { id, company_id: companyId } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    await this.repo.remove(rule);
  }

  async toggle(id: string, enabled: boolean, companyId: string): Promise<AutomationRule> {
    const rule = await this.repo.findOne({ where: { id, company_id: companyId } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    rule.enabled = enabled;
    return this.repo.save(rule);
  }
}
