import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { AiAgentController } from './controllers/ai-agent.controller';
import { AiTrainingController } from './controllers/ai-training.controller';
import { AiAgent } from './entities/ai-agent.entity';
import { AiLog } from './entities/ai-log.entity';
import { AiTrainingDoc } from './entities/ai-training-doc.entity';
import { AiAgentRepository } from './repositories/ai-agent.repository';
import { AiLogRepository } from './repositories/ai-log.repository';
import { AiTrainingDocRepository } from './repositories/ai-training-doc.repository';
import { AiAgentService } from './services/ai-agent.service';
import { AiProviderService } from './services/ai-provider.service';
import { ConversationSummarizerService } from './services/conversation-summarizer.service';
import { HotLeadDetectorService } from './services/hot-lead-detector.service';
import { IntentClassifierService } from './services/intent-classifier.service';
import { RagService } from './services/rag.service';
import { SuggestionService } from './services/suggestion.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([AiAgent, AiLog, AiTrainingDoc]), WebhooksModule],
  controllers: [AiAgentController, AiTrainingController],
  providers: [
    AiAgentRepository,
    AiLogRepository,
    AiTrainingDocRepository,
    AiProviderService,
    AiAgentService,
    IntentClassifierService,
    SuggestionService,
    ConversationSummarizerService,
    HotLeadDetectorService,
    RagService,
  ],
  exports: [
    AiProviderService,
    AiAgentService,
    AiLogRepository,
    IntentClassifierService,
    SuggestionService,
    HotLeadDetectorService,
    RagService,
  ],
})
export class AiModule {}
