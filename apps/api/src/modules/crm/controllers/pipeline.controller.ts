import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';

import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { PipelineService } from '../services/pipeline.service';
import { CreatePipelineStageDto } from '../dto/create-pipeline.dto';

@Controller('crm/pipeline-stages')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get()
  async findAll(@CompanyId() companyId: string) {
    return this.pipelineService.findByCompanyId(companyId);
  }

  @Post('seed')
  async seed(@CompanyId() companyId: string) {
    return this.pipelineService.seedDefaults(companyId);
  }

  @Post()
  async create(@CompanyId() companyId: string, @Body() dto: CreatePipelineStageDto) {
    return this.pipelineService.create(companyId, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreatePipelineStageDto>) {
    return this.pipelineService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.pipelineService.remove(id);
    return { success: true };
  }
}
