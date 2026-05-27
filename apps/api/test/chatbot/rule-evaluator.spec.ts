import { RuleEvaluatorService, EvaluationContext } from '@/modules/chatbot/services/rule-evaluator.service';
import { AutomationRule, RuleCondition, RuleAction } from '@/modules/chatbot/entities/automation-rule.entity';

describe('RuleEvaluatorService', () => {
  let evaluator: RuleEvaluatorService;

  beforeEach(() => {
    evaluator = new RuleEvaluatorService();
  });

  const makeRule = (conditions: RuleCondition[], priority = 0): AutomationRule =>
    ({
      id: 'rule-1',
      company_id: 'company-1',
      name: 'Test rule',
      is_active: true,
      conditions,
      actions: [{ type: 'reply.text', config: { text: 'Hello!' } }],
      priority,
      created_at: new Date(),
      updated_at: new Date(),
    }) as AutomationRule;

  const ctx: EvaluationContext = {
    content: 'hello world, how are you?',
    senderJid: '5511999999999@s.whatsapp.net',
    type: 'TEXT',
  };

  describe('evaluate', () => {
    it('should return matching rules sorted by priority', () => {
      const rule1 = makeRule(
        [{ field: 'message.content', operator: 'contains', value: 'hello' }],
        10,
      );
      const rule2 = makeRule(
        [{ field: 'message.content', operator: 'contains', value: 'hello' }],
        5,
      );

      const result = evaluator.evaluate([rule1, rule2], ctx);
      expect(result).toHaveLength(2);
      expect(result[0].priority).toBe(5);
      expect(result[1].priority).toBe(10);
    });

    it('should return empty array when no rules match', () => {
      const rule = makeRule([
        { field: 'message.content', operator: 'equals', value: 'nonexistent' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(0);
    });

    it('should require ALL conditions to match', () => {
      const rule = makeRule([
        { field: 'message.content', operator: 'contains', value: 'hello' },
        { field: 'message.type', operator: 'equals', value: 'IMAGE' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(0);
    });
  });

  describe('operator: equals', () => {
    it('should match exact content', () => {
      const rule = makeRule([
        { field: 'message.content', operator: 'equals', value: 'hello world, how are you?' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(1);
    });

    it('should not match partial content', () => {
      const rule = makeRule([
        { field: 'message.content', operator: 'equals', value: 'Hello' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(0);
    });
  });

  describe('operator: contains', () => {
    it('should match when value is found in content', () => {
      const rule = makeRule([
        { field: 'message.content', operator: 'contains', value: 'world' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(1);
    });

    it('should not match when value is absent', () => {
      const rule = makeRule([
        { field: 'message.content', operator: 'contains', value: 'banana' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(0);
    });
  });

  describe('operator: starts_with', () => {
    it('should match when content starts with value', () => {
      const rule = makeRule([
        { field: 'message.content', operator: 'starts_with', value: 'hello' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(1);
    });

    it('should not match when content does not start with value', () => {
      const rule = makeRule([
        { field: 'message.content', operator: 'starts_with', value: 'world' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(0);
    });
  });

  describe('operator: regex', () => {
    it('should match valid regex pattern', () => {
      const rule = makeRule([
        { field: 'message.content', operator: 'regex', value: 'how.*you' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(1);
    });

    it('should not match invalid pattern gracefully', () => {
      const rule = makeRule([
        { field: 'message.content', operator: 'regex', value: '[invalid' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(0);
    });
  });

  describe('field: message.sender_jid', () => {
    it('should match sender JID', () => {
      const rule = makeRule([
        { field: 'message.sender_jid', operator: 'contains', value: '@s.whatsapp.net' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(1);
    });
  });

  describe('field: message.type', () => {
    it('should match message type', () => {
      const rule = makeRule([
        { field: 'message.type', operator: 'equals', value: 'TEXT' },
      ]);
      expect(evaluator.evaluate([rule], ctx)).toHaveLength(1);
    });
  });
});
