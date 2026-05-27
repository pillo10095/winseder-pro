import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ActivityType } from '../entities/activity.entity';

export class CreateActivityDto {
  @IsEnum(ActivityType)
  @IsNotEmpty()
  type!: ActivityType;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  contact_id?: string;

  @IsString()
  @IsOptional()
  deal_id?: string;

  @IsString()
  @IsOptional()
  activity_date?: string;
}
