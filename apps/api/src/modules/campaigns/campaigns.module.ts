import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Template } from './entities/template.entity';
import { Campaign } from './entities/campaign.entity';
import { CampaignContact } from './entities/campaign-contact.entity';

import { TemplateRepository } from './repositories/template.repository';
import { CampaignRepository } from './repositories/campaign.repository';
import { CampaignContactRepository } from './repositories/campaign-contact.repository';

import { TemplateService } from './services/template.service';
import { CampaignService } from './services/campaign.service';
import { CsvImportService } from './services/csv-import.service';
import { CampaignDispatcherListener } from './listeners/campaign-dispatcher.listener';

import { TemplateController } from './controllers/template.controller';
import { CampaignController } from './controllers/campaign.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Template, Campaign, CampaignContact]),
    BullModule.registerQueue({ name: 'campaign-dispatch' }),
  ],
  controllers: [
    TemplateController,
    CampaignController,
  ],
  providers: [
    TemplateRepository,
    CampaignRepository,
    CampaignContactRepository,
    TemplateService,
    CampaignService,
    CsvImportService,
    CampaignDispatcherListener,
  ],
  exports: [
    CampaignService,
    CampaignRepository,
    CampaignContactRepository,
  ],
})
export class CampaignsModule {}
