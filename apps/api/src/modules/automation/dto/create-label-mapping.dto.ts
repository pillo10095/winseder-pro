import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLabelMappingDto {
  @IsString()
  @IsNotEmpty()
  whatsapp_label!: string;

  @IsUUID()
  pipeline_stage_id!: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
