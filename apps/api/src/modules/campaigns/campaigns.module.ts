import { Module } from '@nestjs/common';
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

import { TemplateController } from './controllers/template.controller';
import { CampaignController } from './controllers/campaign.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Template, Campaign, CampaignContact]),
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
  ],
  exports: [
    CampaignService,
    CampaignRepository,
  ],
})
export class CampaignsModule {}
