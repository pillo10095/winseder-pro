import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DealService } from './deal.service';
import type { Deal } from '../entities/deal.entity';

@Injectable()
export class StageTransitionService {
  private readonly logger = new Logger(StageTransitionService.name);

  constructor(
    private readonly dealService: DealService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async moveDeal(
    dealId: string,
    targetStageId: string,
    userId: string,
    reason?: string,
  ): Promise<Deal | null> {
    const deal = await this.dealService.findById(dealId);
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    const updated = await this.dealService.moveStage(dealId, targetStageId, userId, reason);

    this.logger.log(`Deal ${dealId} moved to stage ${targetStageId}`);

    if (updated) {
      this.eventEmitter.emit('deal.stage_changed', {
        dealId: updated.id,
        fromStageId: deal.pipeline_stage_id,
        toStageId: targetStageId,
        companyId: updated.company_id,
      });
    }

    return updated;
  }
}
