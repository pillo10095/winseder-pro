import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationRuleRepository } from './repositories/automation-rule.repository';
import { RuleEvaluatorService } from './services/rule-evaluator.service';
import { AutoReplyService } from './services/auto-reply.service';
import { AiHookService } from './services/ai-hook.service';
import { ChatbotListenerService } from './services/chatbot-listener.service';
import { AutomationRuleController } from './controllers/automation-rule.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationRule]),
    WhatsAppModule,
    WebhooksModule,
  ],
  controllers: [AutomationRuleController],
  providers: [
    AutomationRuleRepository,
    RuleEvaluatorService,
    AutoReplyService,
    AiHookService,
    ChatbotListenerService,
  ],
  exports: [AutomationRuleRepository],
})
export class ChatbotModule {}
