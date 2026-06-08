import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AutoDealCreatorService } from '../services/auto-deal-creator.service';
import { AutomationEngineService } from '../services/automation-engine.service';
import { LabelSyncService } from '../services/label-sync.service';

@Injectable()
export class WhatsappEventListener {
  private readonly logger = new Logger(WhatsappEventListener.name);

  constructor(
    private readonly autoDealCreator: AutoDealCreatorService,
    private readonly automationEngine: AutomationEngineService,
    private readonly labelSync: LabelSyncService,
  ) {}

  @OnEvent('whatsapp.message.received')
  async handleMessageReceived(payload: { companyId: string; waId: string; name?: string }) {
    try {
      await this.autoDealCreator.ensureContactAndDeal(payload.companyId, payload.waId, payload.name);
    } catch (err) {
      this.logger.error(`Auto deal creation failed: ${(err as Error).message}`);
    }
  }

  @OnEvent('whatsapp.label.added')
  async handleLabelAdded(payload: { companyId: string; waId: string; labelName: string }) {
    try {
      await this.labelSync.syncLabel(payload.companyId, payload.waId, payload.labelName, 'added');
    } catch (err) {
      this.logger.error(`Label sync (added) failed: ${(err as Error).message}`);
    }
  }

  @OnEvent('whatsapp.label.removed')
  async handleLabelRemoved(payload: { companyId: string; waId: string; labelName: string }) {
    try {
      await this.labelSync.syncLabel(payload.companyId, payload.waId, payload.labelName, 'removed');
    } catch (err) {
      this.logger.error(`Label sync (removed) failed: ${(err as Error).message}`);
    }
  }
}
