import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { AutomationRuleService } from '../services/automation-rule.service';
import { CreateAutomationRuleDto } from '../dto/create-automation-rule.dto';

@Controller('crm/automation-rules')
@UseGuards(JwtAuthGuard)
export class AutomationRuleController {
  constructor(private readonly ruleService: AutomationRuleService) {}

  @Get()
  async findAll(@CompanyId() companyId: string) {
    return this.ruleService.findByCompanyId(companyId);
  }

  @Post()
  async create(@CompanyId() companyId: string, @Body() dto: CreateAutomationRuleDto) {
    return this.ruleService.create(companyId, dto);
  }

  @Put(':id')
  async update(@CompanyId() companyId: string, @Param('id') id: string, @Body() dto: CreateAutomationRuleDto) {
    return this.ruleService.update(id, dto, companyId);
  }

  @Delete(':id')
  async remove(@CompanyId() companyId: string, @Param('id') id: string) {
    await this.ruleService.remove(id, companyId);
    return { success: true };
  }

  @Patch(':id/toggle')
  async toggle(@CompanyId() companyId: string, @Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.ruleService.toggle(id, enabled, companyId);
  }
}
