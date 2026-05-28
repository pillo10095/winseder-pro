jest.mock('@whiskeysockets/baileys', () => ({}));

import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotListenerService } from '@/modules/chatbot/services/chatbot-listener.service';
import { RuleEvaluatorService } from '@/modules/chatbot/services/rule-evaluator.service';
import { AutoReplyService } from '@/modules/chatbot/services/auto-reply.service';
import { AutomationRuleRepository } from '@/modules/chatbot/repositories/automation-rule.repository';
import { WebhookConfigRepository } from '@/modules/webhooks/repositories/webhook-config.repository';
import { SessionRepository } from '@/modules/whatsapp/repositories/session.repository';
import { MessageEventPayload } from '@/modules/whatsapp/services/message-relay.service';

describe('ChatbotListenerService', () => {
  let listener: ChatbotListenerService;
  let ruleRepo: jest.Mocked<AutomationRuleRepository>;
  let webhookRepo: jest.Mocked<WebhookConfigRepository>;
  let evaluator: jest.Mocked<RuleEvaluatorService>;
  let autoReply: jest.Mocked<AutoReplyService>;
  let sessionRepo: jest.Mocked<SessionRepository>;

  const payload: MessageEventPayload = {
    sessionId: 'session-1',
    conversationId: '5511999999999@s.whatsapp.net',
    messageId: 'msg-1',
    content: 'Hello',
    type: 'TEXT',
    fromMe: false,
    timestamp: new Date(),
  };

  beforeEach(async () => {
    ruleRepo = {
      findActiveByCompanyId: jest.fn(),
    } as any;

    webhookRepo = {
      findActiveByEvent: jest.fn().mockResolvedValue([]),
    } as any;

    evaluator = {
      evaluate: jest.fn(),
    } as any;

    autoReply = {
      execute: jest.fn(),
    } as any;

    sessionRepo = {
      findOne: jest.fn().mockResolvedValue({ company_id: 'company-1' }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotListenerService,
        { provide: AutomationRuleRepository, useValue: ruleRepo },
        { provide: WebhookConfigRepository, useValue: webhookRepo },
        { provide: RuleEvaluatorService, useValue: evaluator },
        { provide: AutoReplyService, useValue: autoReply },
        { provide: SessionRepository, useValue: sessionRepo },
      ],
    }).compile();

    listener = module.get<ChatbotListenerService>(ChatbotListenerService);
  });

  it('should skip messages from self', async () => {
    await listener.handleInboundMessage({ ...payload, fromMe: true });
    expect(ruleRepo.findActiveByCompanyId).not.toHaveBeenCalled();
  });

  it('should skip when no rules configured', async () => {
    ruleRepo.findActiveByCompanyId.mockResolvedValue([]);
    await listener.handleInboundMessage(payload);
    expect(evaluator.evaluate).not.toHaveBeenCalled();
  });

  it('should evaluate rules and execute auto-replies', async () => {
    const mockRule = {
      id: 'rule-1',
      company_id: 'company-1',
      name: 'Test',
      is_active: true,
      conditions: [],
      actions: [{ type: 'reply.text', config: { text: 'Auto reply' } }],
      priority: 0,
    } as any;

    ruleRepo.findActiveByCompanyId.mockResolvedValue([mockRule]);
    evaluator.evaluate.mockReturnValue([mockRule]);

    await listener.handleInboundMessage(payload);

    expect(evaluator.evaluate).toHaveBeenCalledWith([mockRule], {
      content: 'Hello',
      senderJid: '5511999999999@s.whatsapp.net',
      type: 'TEXT',
    });
    expect(autoReply.execute).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'session-1',
      remoteJid: '5511999999999@s.whatsapp.net',
      content: 'Hello',
      companyId: 'company-1',
      action: { type: 'reply.text', config: { text: 'Auto reply' } },
    }));
  });

  it('should handle multiple actions per rule', async () => {
    const mockRule = {
      id: 'rule-1',
      company_id: 'company-1',
      name: 'Test',
      is_active: true,
      conditions: [],
      actions: [
        { type: 'reply.text', config: { text: 'Reply 1' } },
        { type: 'reply.text', config: { text: 'Reply 2' } },
      ],
      priority: 0,
    } as any;

    ruleRepo.findActiveByCompanyId.mockResolvedValue([mockRule]);
    evaluator.evaluate.mockReturnValue([mockRule]);

    await listener.handleInboundMessage(payload);

    expect(autoReply.execute).toHaveBeenCalledTimes(2);
  });

  it('should handle errors gracefully', async () => {
    ruleRepo.findActiveByCompanyId.mockRejectedValue(new Error('DB error'));
    await expect(listener.handleInboundMessage(payload)).resolves.not.toThrow();
  });
});
