import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
