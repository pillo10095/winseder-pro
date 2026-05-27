import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { AutomationRuleRepository } from '../repositories/automation-rule.repository';
import { CreateAutomationRuleDto } from '../dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from '../dto/update-automation-rule.dto';

@Controller('automation-rules')
export class AutomationRuleController {
  constructor(private readonly ruleRepo: AutomationRuleRepository) {}

  @Get()
  async findAll(): Promise<unknown[]> {
    return this.ruleRepo.find({ order: { priority: 'ASC' } });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<unknown> {
    return this.ruleRepo.findOneOrFail({ where: { id } });
  }

  @Post()
  async create(@Body() dto: CreateAutomationRuleDto): Promise<unknown> {
    return this.ruleRepo.save(this.ruleRepo.create(dto));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAutomationRuleDto): Promise<unknown> {
    await this.ruleRepo.update(id, dto);
    return this.ruleRepo.findOneOrFail({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.ruleRepo.delete(id);
  }
}
