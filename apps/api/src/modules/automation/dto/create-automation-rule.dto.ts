import { IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

const VALID_EVENTS = ['whatsapp.first_message', 'whatsapp.label_added', 'whatsapp.label_removed', 'deal.stage_changed', 'deal.won', 'deal.lost'] as const;

export class CreateAutomationRuleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsIn(VALID_EVENTS)
  event!: string;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, unknown>;

  @IsObject()
  action!: { type: string; params: Record<string, unknown> };

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
