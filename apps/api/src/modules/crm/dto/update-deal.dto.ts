import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateDealDto } from './create-deal.dto';

export class UpdateDealDto extends PartialType(CreateDealDto) {
  @IsString()
  @IsOptional()
  won_lost_reason?: string;
}
