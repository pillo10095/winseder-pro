import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DealService } from '../services/deal.service';
import { CreateDealDto } from '../dto/create-deal.dto';
import { UpdateDealDto } from '../dto/update-deal.dto';
import { MoveDealDto } from '../dto/move-deal.dto';
import type { QueryPipelineDto } from '../dto/query-pipeline.dto';

@Controller('crm/pipeline')
@UseGuards(JwtAuthGuard)
export class PipelineLeadsController {
  constructor(private readonly dealService: DealService) {}

  @Get()
  async findAll(
    @CompanyId() companyId: string,
    @Query() filters: QueryPipelineDto,
  ) {
    const [data, total] = await this.dealService.findWithFilters(companyId, filters);
    return { data, total, page: filters.page ?? 1, limit: filters.limit ?? 20 };
  }

  @Get('stats')
  async getStats(@CompanyId() companyId: string) {
    return this.dealService.getStats(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.dealService.findById(id);
  }

  @Post()
  async create(
    @CompanyId() companyId: string,
    @Body() dto: CreateDealDto,
  ) {
    return this.dealService.create(companyId, dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealService.update(id, dto);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body() dto: MoveDealDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dealService.moveStage(id, dto.pipeline_stage_id, userId, dto.reason);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.dealService.remove(id);
    return { success: true };
  }
}
