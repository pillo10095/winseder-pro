import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];
}
