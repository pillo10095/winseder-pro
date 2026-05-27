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
import { DealService } from '../services/deal.service';
import { CreateDealDto } from '../dto/create-deal.dto';
import { UpdateDealDto } from '../dto/update-deal.dto';
import { MoveDealDto } from '../dto/move-deal.dto';
import { StageTransitionService } from '../services/stage-transition.service';

@Controller('crm/deals')
export class DealController {
  constructor(
    private readonly dealService: DealService,
    private readonly stageTransitionService: StageTransitionService,
  ) {}

  @Get()
  async findAll(
    @CompanyId() companyId: string,
    @Query('stage_id') stageId?: string,
    @Query('assigned_to') assignedTo?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const [deals, total] = await this.dealService.findByCompanyId(
      companyId,
      stageId,
      assignedTo,
      search,
      limit ? parseInt(limit, 10) : 20,
      cursor,
    );
    return { data: deals, total };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.dealService.findById(id);
  }

  @Post()
  async create(@CompanyId() companyId: string, @Body() dto: CreateDealDto) {
    return this.dealService.create(companyId, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealService.update(id, dto);
  }

  @Put(':id/stage')
  async moveStage(@Param('id') id: string, @Body() dto: MoveDealDto) {
    return this.stageTransitionService.moveDeal(id, dto.pipeline_stage_id, dto.reason);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.dealService.remove(id);
    return { success: true };
  }
}
