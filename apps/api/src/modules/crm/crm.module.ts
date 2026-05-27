import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Contact } from './entities/contact.entity';
import { Deal } from './entities/deal.entity';
import { Activity } from './entities/activity.entity';
import { PipelineStage } from './entities/pipeline-stage.entity';

// Repositories
import { ContactRepository } from './repositories/contact.repository';
import { DealRepository } from './repositories/deal.repository';
import { ActivityRepository } from './repositories/activity.repository';
import { PipelineStageRepository } from './repositories/pipeline-stage.repository';

// Services
import { ContactService } from './services/contact.service';
import { DealService } from './services/deal.service';
import { ActivityService } from './services/activity.service';
import { PipelineService } from './services/pipeline.service';
import { StageTransitionService } from './services/stage-transition.service';

// Controllers
import { ContactController } from './controllers/contact.controller';
import { DealController } from './controllers/deal.controller';
import { ActivityController } from './controllers/activity.controller';
import { PipelineController } from './controllers/pipeline.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contact,
      Deal,
      Activity,
      PipelineStage,
    ]),
  ],
  controllers: [
    ContactController,
    DealController,
    ActivityController,
    PipelineController,
  ],
  providers: [
    // Repositories
    ContactRepository,
    DealRepository,
    ActivityRepository,
    PipelineStageRepository,

    // Services
    ContactService,
    DealService,
    ActivityService,
    PipelineService,
    StageTransitionService,
  ],
  exports: [],
})
export class CrmModule {}
