import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { DealService } from './deal.service';

@Injectable()
export class StageTransitionService {
  private readonly logger = new Logger(StageTransitionService.name);

  constructor(private readonly dealService: DealService) {}

  async moveDeal(
    dealId: string,
    targetStageId: string,
    reason?: string,
  ): Promise<any> {
    const deal = await this.dealService.findById(dealId);
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    const updated = await this.dealService.moveStage(dealId, targetStageId, reason);

    this.logger.log(`Deal ${dealId} moved to stage ${targetStageId}`);

    // TODO: Emit event for automations/hooks
    // this.eventEmitter.emit('crm.deal.stage_changed', { dealId, from: deal.pipeline_stage_id, to: targetStageId });

    return updated;
  }
}
