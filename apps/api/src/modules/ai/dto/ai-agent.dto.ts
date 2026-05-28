import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAiAgentDto {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  api_key?: string;

  @IsOptional()
  @IsString()
  base_url?: string;

  @IsOptional()
  @IsString()
  system_prompt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  @Type(() => Number)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4096)
  @Type(() => Number)
  max_tokens?: number;
}

export class ChatDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  conversation_id?: string;
}

export class ClassifyDto {
  @IsString()
  message!: string;
}

export class SuggestDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  conversation_context?: string;
}
