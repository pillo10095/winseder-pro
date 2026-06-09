import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { CreateLabelDto } from '../dtos/create-label.dto';
import { UpdateLabelDto } from '../dtos/update-label.dto';
import { LabelService } from '../services/label.service';

@Controller('crm/labels')
@UseGuards(JwtAuthGuard)
export class LabelController {
  constructor(private readonly labelService: LabelService) {}

  @Get()
  findAll(@CompanyId() companyId: string) {
    return this.labelService.findAll(companyId);
  }

  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.labelService.findOne(companyId, id);
  }

  @Post()
  create(@CompanyId() companyId: string, @Body() dto: CreateLabelDto) {
    return this.labelService.create(companyId, dto);
  }

  @Put(':id')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLabelDto,
  ) {
    return this.labelService.update(companyId, id, dto);
  }

  @Delete(':id')
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.labelService.remove(companyId, id);
  }
}
