import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ImportCsvDto {
  @IsUUID()
  @IsNotEmpty()
  campaign_id!: string;

  @IsString()
  @IsNotEmpty()
  file_path!: string;
}
