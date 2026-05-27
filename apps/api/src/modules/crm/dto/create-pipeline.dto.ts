import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePipelineStageDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  sort_order?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  default_probability?: number;
}
