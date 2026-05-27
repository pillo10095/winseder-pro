import { IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  session_name?: string;
}
