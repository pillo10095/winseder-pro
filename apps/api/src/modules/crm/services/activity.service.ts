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
  ): Promise<Activity[]> {
    return this.activityRepo.findByCompanyId(companyId, type, contactId, dealId, limit);
  }
}
