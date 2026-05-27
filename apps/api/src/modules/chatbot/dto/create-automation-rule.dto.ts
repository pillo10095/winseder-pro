import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { RuleAction, RuleCondition } from '../entities/automation-rule.entity';

class ConditionDto implements RuleCondition {
  @IsString()
  @IsNotEmpty()
  field!: 'message.content' | 'message.sender_jid' | 'message.type';

  @IsString()
  @IsNotEmpty()
  operator!: 'contains' | 'equals' | 'starts_with' | 'regex';

  @IsString()
  @IsNotEmpty()
  value!: string;
}

class ActionDto implements RuleAction {
  @IsString()
  @IsNotEmpty()
  type!: 'reply.text' | 'reply.image' | 'webhook' | 'ai_hook';

  @IsArray()
  config!: Record<string, string>;
}

export class CreateAutomationRuleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions!: ConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions!: ActionDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
