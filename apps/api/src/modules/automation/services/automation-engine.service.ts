import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AutomationRuleRepository } from '../repositories/automation-rule.repository';
import { LabelMappingRepository } from '../repositories/label-mapping.repository';
import { RuleEvent } from '../entities/automation-rule.entity';
import { DealRepository } from '../../crm/repositories/deal.repository';
import { CampaignRepository } from '../../campaigns/repositories/campaign.repository';
import { CampaignContactRepository } from '../../campaigns/repositories/campaign-contact.repository';

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private readonly ruleRepo: AutomationRuleRepository,
    private readonly mappingRepo: LabelMappingRepository,
    private readonly dealRepo: DealRepository,
    private readonly campaignRepo: CampaignRepository,
    private readonly campaignContactRepo: CampaignContactRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('whatsapp.label_added')
  async handleLabelAdded(payload: { contactId: string; labelName: string; companyId: string }) {
    await this.evaluateLabelAdded(payload.companyId, payload.contactId, payload.labelName);
  }

  @OnEvent('whatsapp.first_message')
  async handleFirstMessage(payload: { contactId: string; dealId: string; companyId: string }) {
    await this.evaluateRules(payload.companyId, 'whatsapp.first_message', payload);
  }

  @OnEvent('deal.stage_changed')
  async handleDealStageChanged(payload: { dealId: string; fromStageId: string; toStageId: string; companyId: string }) {
    await this.evaluateDealStageChanged(payload.companyId, payload.dealId, payload.fromStageId, payload.toStageId);
  }

  /**
   * Evaluate label mappings first (direct label→stage), then general rules.
   */
  async evaluateLabelAdded(companyId: string, contactId: string, labelName: string): Promise<void> {
    // 1. Check direct label→stage mapping
    const mapping = await this.mappingRepo.findEnabledByLabel(companyId, labelName);
    if (mapping) {
      const deal = await this.dealRepo.findOne({ where: { contact_id: contactId } });
      if (deal) {
        await this.dealRepo.update(deal.id, { pipeline_stage_id: mapping.pipeline_stage_id });
        this.logger.log(`Deal ${deal.id} moved to stage ${mapping.pipeline_stage_id} by label "${labelName}"`);
      }
    }

    // 2. Evaluate general rules for this event
    await this.evaluateRules(companyId, 'whatsapp.label_added', { contactId, labelName });
  }

  /**
   * Evaluate rules for a given event with payload.
   */
  async evaluateRules(companyId: string, event: RuleEvent, payload: Record<string, unknown>): Promise<void> {
    const rules = await this.ruleRepo.findEnabledByEvent(companyId, event);

    for (const rule of rules) {
      try {
        await this.executeAction(companyId, rule.action, payload);
      } catch (err) {
        this.logger.error(`Rule ${rule.id} failed: ${(err as Error).message}`);
      }
    }
  }

  private async executeAction(companyId: string, action: { type: string; params: Record<string, unknown> }, payload: Record<string, unknown>): Promise<void> {
    switch (action.type) {
      case 'pipeline.move': {
        const deal = await this.dealRepo.findOne({ where: { contact_id: payload.contactId as string, company_id: companyId } });
        if (deal) {
          await this.dealRepo.update(deal.id, { pipeline_stage_id: action.params.stage_id as string });
        }
        break;
      }
      case 'campaign.trigger': {
        const campaignId = action.params.campaign_id as string;
        const contactId = payload.contactId as string;
        if (campaignId && contactId) {
          const existing = await this.campaignContactRepo.findOne({ where: { campaign_id: campaignId, contact_id: contactId } });
          if (!existing) {
            await this.campaignContactRepo.save(this.campaignContactRepo.create({ campaign_id: campaignId, contact_id: contactId }));
          }
          const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
          if (campaign && campaign.status === 'draft') {
            this.logger.log(`Contact ${contactId} queued for campaign ${campaignId}`);
          }
        }
        break;
      }
      case 'contact.assign': {
        // Future work: assign contact to user
        this.logger.debug('contact.assign action not yet implemented');
        break;
      }
      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  async evaluateDealStageChanged(companyId: string, dealId: string, fromStageId: string, toStageId: string): Promise<void> {
    // Check campaigns with trigger_event matching this stage
    const campaigns = await this.campaignRepo.find({ where: { company_id: companyId } });

    for (const campaign of campaigns) {
      const trigger = (campaign as any).trigger_event as { type?: string; stage_id?: string } | null;
      if (trigger && trigger.type === 'deal.stage_changed' && trigger.stage_id === toStageId) {
        const deal = await this.dealRepo.findOne({ where: { id: dealId }, relations: ['contact'] });
        if (deal && deal.contact_id) {
          const existing = await this.campaignContactRepo.findOne({ where: { campaign_id: campaign.id, contact_id: deal.contact_id } });
          if (!existing) {
            await this.campaignContactRepo.save(this.campaignContactRepo.create({ campaign_id: campaign.id, contact_id: deal.contact_id }));
            this.logger.log(`Contact ${deal.contact_id} added to campaign ${campaign.id} via stage trigger`);
          }
        }
      }
    }

    // Evaluate general deal.stage_changed rules
    await this.evaluateRules(companyId, 'deal.stage_changed', { dealId, fromStageId, toStageId });
  }
}
