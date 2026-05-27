import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { AutomationRuleRepository } from '../repositories/automation-rule.repository';
import { CreateAutomationRuleDto } from '../dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from '../dto/update-automation-rule.dto';

@Controller('automation-rules')
export class AutomationRuleController {
  constructor(private readonly ruleRepo: AutomationRuleRepository) {}

  @Get()
  async findAll(@CompanyId() companyId: string) {
    return this.ruleRepo.find({
      where: { company_id: companyId },
      order: { priority: 'ASC' },
    });
  }

  @Get(':id')
  async findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.ruleRepo.findByIdAndCompany(id, companyId);
  }

  @Post()
  async create(@CompanyId() companyId: string, @Body() dto: CreateAutomationRuleDto) {
    return this.ruleRepo.save(
      this.ruleRepo.create({ ...dto, company_id: companyId }),
    );
  }

  @Patch(':id')
  async update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationRuleDto,
  ) {
    await this.ruleRepo.update({ id, company_id: companyId }, dto);
    return this.ruleRepo.findByIdAndCompany(id, companyId);
  }

  @Patch(':id/toggle')
  async toggle(@CompanyId() companyId: string, @Param('id') id: string) {
    const rule = await this.ruleRepo.findByIdAndCompany(id, companyId);
    if (!rule) return { success: false, message: 'Rule not found' };

    await this.ruleRepo.update(id, { is_active: !rule.is_active });
    return this.ruleRepo.findByIdAndCompany(id, companyId);
  }

  @Delete(':id')
  async remove(@CompanyId() companyId: string, @Param('id') id: string) {
    await this.ruleRepo.delete({ id, company_id: companyId });
  }
}
