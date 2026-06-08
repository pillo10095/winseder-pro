import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
