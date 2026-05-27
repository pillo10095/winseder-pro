import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';

import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { TemplateService } from '../services/template.service';
import { CreateTemplateDto } from '../dto/create-template.dto';

@Controller('campaigns/templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async findAll(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
  ) {
    const templates = await this.templateService.findByCompanyId(companyId, search);
    return { data: templates };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templateService.findById(id);
  }

  @Post()
  async create(@CompanyId() companyId: string, @Body() dto: CreateTemplateDto) {
    return this.templateService.create(companyId, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.templateService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.templateService.remove(id);
    return { success: true };
  }
}
