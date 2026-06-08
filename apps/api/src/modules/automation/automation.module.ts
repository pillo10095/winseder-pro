import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AutomationRule } from './entities/automation-rule.entity';
import { WhatsappLabelMapping } from './entities/whatsapp-label-mapping.entity';
import { AutomationRuleRepository } from './repositories/automation-rule.repository';
import { LabelMappingRepository } from './repositories/label-mapping.repository';
import { AutomationRuleController } from './controllers/automation-rule.controller';
import { LabelMappingController } from './controllers/label-mapping.controller';
import { AutomationRuleService } from './services/automation-rule.service';
import { LabelMappingService } from './services/label-mapping.service';
import { AutomationEngineService } from './services/automation-engine.service';
import { LabelSyncService } from './services/label-sync.service';
import { AutoDealCreatorService } from './services/auto-deal-creator.service';
import { AutomationWorker } from './workers/automation-worker';
import { WhatsappEventListener } from './listeners/whatsapp-event.listener';
import { CrmModule } from '../crm/crm.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationRule, WhatsappLabelMapping]),
    BullModule.registerQueue({ name: 'automation' }),
    CrmModule,
    CampaignsModule,
  ],
  controllers: [AutomationRuleController, LabelMappingController],
  providers: [
    AutomationRuleRepository,
    LabelMappingRepository,
    AutomationRuleService,
    LabelMappingService,
    AutomationEngineService,
    LabelSyncService,
    AutoDealCreatorService,
    AutomationWorker,
    WhatsappEventListener,
  ],
  exports: [AutomationEngineService, LabelSyncService, AutoDealCreatorService],
})
export class AutomationModule {}
