import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDealDto {
  @IsString()
  @IsNotEmpty()
  pipeline_stage_id!: string;

  @IsString()
  @IsOptional()
  contact_id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsString()
  @IsOptional()
  company_name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  probability?: number;

  @IsString()
  @IsOptional()
  close_date?: string;

  @IsString()
  @IsOptional()
  assigned_to?: string;
}
