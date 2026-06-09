import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { LabelMappingService } from '../services/label-mapping.service';
import { CreateLabelMappingDto } from '../dto/create-label-mapping.dto';

@Controller('crm/label-mappings')
@UseGuards(JwtAuthGuard)
export class LabelMappingController {
  constructor(private readonly mappingService: LabelMappingService) {}

  @Get()
  async findAll(@CompanyId() companyId: string) {
    return this.mappingService.findByCompanyId(companyId);
  }

  @Post()
  async create(@CompanyId() companyId: string, @Body() dto: CreateLabelMappingDto) {
    return this.mappingService.create(companyId, dto);
  }

  @Put(':id')
  async update(@CompanyId() companyId: string, @Param('id') id: string, @Body() dto: CreateLabelMappingDto) {
    return this.mappingService.update(id, dto, companyId);
  }

  @Delete(':id')
  async remove(@CompanyId() companyId: string, @Param('id') id: string) {
    await this.mappingService.remove(id, companyId);
    return { success: true };
  }
}
