import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';

// Entities
import { Contact } from './entities/contact.entity';
import { Deal } from './entities/deal.entity';
import { Activity } from './entities/activity.entity';
import { Label } from './entities/label.entity';
import { PipelineStage } from './entities/pipeline-stage.entity';

// Repositories
import { ContactRepository } from './repositories/contact.repository';
import { DealRepository } from './repositories/deal.repository';
import { ActivityRepository } from './repositories/activity.repository';
import { LabelRepository } from './repositories/label.repository';
import { PipelineStageRepository } from './repositories/pipeline-stage.repository';

// Services
import { ContactService } from './services/contact.service';
import { DealService } from './services/deal.service';
import { ActivityService } from './services/activity.service';
import { LabelService } from './services/label.service';
import { PipelineService } from './services/pipeline.service';
import { StageTransitionService } from './services/stage-transition.service';

// Controllers
import { ContactController } from './controllers/contact.controller';
import { DealController } from './controllers/deal.controller';
import { ActivityController } from './controllers/activity.controller';
import { LabelController } from './controllers/label.controller';
import { PipelineController } from './controllers/pipeline.controller';
import { PipelineLeadsController } from './controllers/pipeline-leads.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contact,
      Deal,
      Activity,
      Label,
      PipelineStage,
    ]),
    AuthModule,
  ],
  controllers: [
    ContactController,
    DealController,
    ActivityController,
    LabelController,
    PipelineController,
    PipelineLeadsController,
  ],
  providers: [
    // Repositories
    ContactRepository,
    DealRepository,
    ActivityRepository,
    LabelRepository,
    PipelineStageRepository,

    // Services
    ContactService,
    DealService,
    ActivityService,
    LabelService,
    PipelineService,
    StageTransitionService,
  ],
  exports: [
    ContactRepository,
    DealRepository,
    LabelRepository,
    PipelineStageRepository,
  ],
})
export class CrmModule {}
