import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  @IsOptional()
  template_id?: string;

  @IsDateString()
  @IsOptional()
  scheduled_at?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  contact_ids?: string[];
}
