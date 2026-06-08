import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { CampaignService } from '../services/campaign.service';
import { CampaignContactRepository } from '../repositories/campaign-contact.repository';

interface CampaignStartEvent {
  campaignId: string;
}

@Injectable()
export class CampaignDispatcherListener {
  private readonly logger = new Logger(CampaignDispatcherListener.name);

  constructor(
    private readonly campaignService: CampaignService,
    private readonly campaignContactRepo: CampaignContactRepository,
    @InjectQueue('campaign-dispatch')
    private readonly campaignQueue: Queue,
  ) {}

  @OnEvent('campaign.start')
  async handleCampaignStart({ campaignId }: CampaignStartEvent): Promise<void> {
    this.logger.log(`[Dispatcher] Campaña ${campaignId} iniciada — preparando encoleado`);

    try {
      const campaign = await this.campaignService.findById(campaignId);
      if (!campaign) {
        this.logger.error(`[Dispatcher] Campaña ${campaignId} no encontrada`);
        return;
      }

      if (campaign.status !== 'sending') {
        this.logger.warn(
          `[Dispatcher] Campaña ${campaignId} no está en estado 'sending' (estado: ${campaign.status}) — se omite`,
        );
        return;
      }

      // Fetch contacts with their phone numbers
      const campaignContacts = await this.campaignContactRepo.findByCampaignId(campaignId);

      if (campaignContacts.length === 0) {
        this.logger.warn(`[Dispatcher] Campaña ${campaignId} no tiene contactos — cancelando`);
        await this.campaignService.updateStatus(campaignId, 'cancelled');
        return;
      }

      // Filter contacts that have a phone number
      const validContacts = campaignContacts.filter((cc) => cc.contact?.phone);

      if (validContacts.length === 0) {
        this.logger.warn(
          `[Dispatcher] Campaña ${campaignId}: ningún contacto tiene teléfono — cancelando`,
        );
        await this.campaignService.updateStatus(campaignId, 'cancelled');
        return;
      }

      const skippedCount = campaignContacts.length - validContacts.length;
      if (skippedCount > 0) {
        this.logger.warn(
          `[Dispatcher] Campaña ${campaignId}: ${skippedCount} contactos sin teléfono serán omitidos`,
        );
      }

      // Build template data
      const templateBody = campaign.template?.body ?? '';
      const templateVariables = campaign.template?.variables ?? [];

      // Build contacts array and variables map for the worker
      const contacts = validContacts.map((cc) => ({
        id: cc.contact_id,
        phone: cc.contact!.phone!,
        name: cc.contact!.name,
      }));

      const variablesMap: Record<string, Record<string, string>> = {};
      for (const cc of validContacts) {
        const vars: Record<string, string> = {};
        for (const variableName of templateVariables) {
          // Map template variables to contact fields
          // e.g. {{name}} -> contact.name, {{phone}} -> contact.phone
          const value = (cc.contact as any)?.[variableName];
          if (value != null) {
            vars[variableName] = String(value);
          }
        }
        if (Object.keys(vars).length > 0) {
          variablesMap[cc.contact_id] = vars;
        }
      }

      // Enqueue the job to the campaign-dispatch queue
      const job = await this.campaignQueue.add(
        'dispatch',
        {
          campaignId,
          companyId: campaign.company_id,
          contacts,
          templateBody,
          variablesMap,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(
        `[Dispatcher] Campaña ${campaignId}: ${validContacts.length} contactos encolados (job ${job.id})`,
      );
    } catch (error) {
      this.logger.error(
        `[Dispatcher] Error al encolar campaña ${campaignId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
