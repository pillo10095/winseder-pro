import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Activity } from '../entities/activity.entity';
import { ActivityRepository } from '../repositories/activity.repository';
import { CreateActivityDto } from '../dto/create-activity.dto';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: ActivityRepository,
  ) {}

  async create(companyId: string, userId: string, dto: CreateActivityDto): Promise<Activity> {
    return this.activityRepo.save(
      this.activityRepo.create({
        ...dto,
        company_id: companyId,
        logged_by: userId,
        activity_date: dto.activity_date ? new Date(dto.activity_date) : new Date(),
      }),
    );
  }

  async findByCompanyId(
    companyId: string,
    type?: string,
    contactId?: string,
    dealId?: string,
    limit = 50,
    cursor?: string,
  ): Promise<[Activity[], number]> {
    return this.activityRepo.findByCompanyId(companyId, type, contactId, dealId, limit, cursor);
  }

  async findByCalendarRange(
    companyId: string,
    from: Date,
    to: Date,
  ): Promise<Activity[]> {
    return this.activityRepo.findByDateRange(companyId, from, to);
  }

  async complete(id: string, companyId: string, userId: string): Promise<Activity> {
    const activity = await this.activityRepo.findOne({
      where: { id, company_id: companyId },
    });
    if (!activity) {
      throw new Error('Activity not found');
    }
    // Toggle: si ya está completada, la desmarca; si no, la marca
    activity.completed_at = activity.completed_at ? null : new Date();
    activity.completed_by = activity.completed_at ? userId : null;
    return this.activityRepo.save(activity);
  }

  async updateDate(id: string, companyId: string, activityDate: Date): Promise<Activity> {
    const activity = await this.activityRepo.findOne({
      where: { id, company_id: companyId },
    });
    if (!activity) {
      throw new Error('Activity not found');
    }
    activity.activity_date = activityDate;
    return this.activityRepo.save(activity);
  }
}
