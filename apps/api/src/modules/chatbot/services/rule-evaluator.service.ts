import { Injectable } from '@nestjs/common';

import { AutomationRule, RuleCondition } from '../entities/automation-rule.entity';

export interface EvaluationContext {
  content: string;
  senderJid: string;
  type: string;
}

@Injectable()
export class RuleEvaluatorService {
  /**
   * Evaluate all active rules against an incoming message context.
   * Returns rules whose ALL conditions match, ordered by priority.
   */
  evaluate(rules: AutomationRule[], context: EvaluationContext): AutomationRule[] {
    return rules
      .filter((rule) => this.matchesAll(rule.conditions, context))
      .sort((a, b) => a.priority - b.priority);
  }

  private matchesAll(conditions: RuleCondition[], context: EvaluationContext): boolean {
    return conditions.every((cond) => this.matchesOne(cond, context));
  }

  private matchesOne(cond: RuleCondition, ctx: EvaluationContext): boolean {
    const fieldValue = this.resolveField(cond.field, ctx);
    if (fieldValue === undefined) return false;

    switch (cond.operator) {
      case 'equals':
        return fieldValue === cond.value;
      case 'contains':
        return fieldValue.includes(cond.value);
      case 'starts_with':
        return fieldValue.startsWith(cond.value);
      case 'regex':
        try {
          return new RegExp(cond.value, 'i').test(fieldValue);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private resolveField(field: RuleCondition['field'], ctx: EvaluationContext): string | undefined {
    switch (field) {
      case 'message.content':
        return ctx.content;
      case 'message.sender_jid':
        return ctx.senderJid;
      case 'message.type':
        return ctx.type;
      default:
        return undefined;
    }
  }
}
