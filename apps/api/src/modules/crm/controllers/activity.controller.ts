import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';

import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ActivityService } from '../services/activity.service';
import { CreateActivityDto } from '../dto/create-activity.dto';

@Controller('crm/activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async findAll(
    @CompanyId() companyId: string,
    @Query('type') type?: string,
    @Query('contact_id') contactId?: string,
    @Query('deal_id') dealId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.findByCompanyId(
      companyId,
      type,
      contactId,
      dealId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post()
  async create(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activityService.create(companyId, userId, dto);
  }
}
