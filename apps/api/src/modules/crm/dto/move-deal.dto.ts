import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MoveDealDto {
  @IsString()
  @IsNotEmpty()
  pipeline_stage_id!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
