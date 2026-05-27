import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWebhookConfigDto {
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url!: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  events!: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  secret?: string;
}
