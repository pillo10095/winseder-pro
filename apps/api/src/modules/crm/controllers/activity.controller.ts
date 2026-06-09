import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ActivityService } from '../services/activity.service';
import { CreateActivityDto } from '../dto/create-activity.dto';

@Controller('crm/activities')
@UseGuards(JwtAuthGuard)
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

  @Get('calendar')
  async getCalendar(
    @CompanyId() companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date();
    toDate.setDate(toDate.getDate() + 30);
    return this.activityService.findByCalendarRange(companyId, fromDate, toDate);
  }

  @Patch(':id/complete')
  async complete(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.activityService.complete(id, companyId, userId);
  }

  @Patch(':id')
  async updateDate(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body('activity_date') activityDate: string,
  ) {
    return this.activityService.updateDate(id, companyId, new Date(activityDate));
  }
}
