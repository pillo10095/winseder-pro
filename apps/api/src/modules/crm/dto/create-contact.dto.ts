import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  company_name?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  labelIds?: string[];
}
