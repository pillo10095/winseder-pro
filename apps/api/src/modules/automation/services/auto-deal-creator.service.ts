import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Contact } from '../../crm/entities/contact.entity';
import type { Deal } from '../../crm/entities/deal.entity';
import { ContactRepository } from '../../crm/repositories/contact.repository';
import { DealRepository } from '../../crm/repositories/deal.repository';
import { PipelineStageRepository } from '../../crm/repositories/pipeline-stage.repository';

@Injectable()
export class AutoDealCreatorService {
  private readonly logger = new Logger(AutoDealCreatorService.name);

  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly dealRepo: DealRepository,
    private readonly stageRepo: PipelineStageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Find or create a contact from WhatsApp data, then create a deal if none exists.
   */
  async ensureContactAndDeal(companyId: string, waId: string, name?: string): Promise<{ contact: Contact; deal: Deal }> {
    const contact = await this.findOrCreateContact(companyId, waId, name);

    // Find existing open deal for this contact
    const existingDeal = await this.dealRepo.findOne({
      where: { contact_id: contact.id },
      relations: ['pipeline_stage'],
    });
    if (existingDeal && existingDeal.pipeline_stage?.name !== 'Perdido' && existingDeal.pipeline_stage?.name !== 'Closed Lost') {
      return { contact, deal: existingDeal };
    }

    const stages = await this.stageRepo.find({ where: { company_id: companyId }, order: { sort_order: 'ASC' } });
    const firstStage = stages[0];
    if (!firstStage) {
      throw new Error('No pipeline stages defined for this company');
    }

    const deal = await this.dealRepo.save(
      this.dealRepo.create({
        company_id: companyId,
        contact_id: contact.id,
        pipeline_stage_id: firstStage.id,
        name: `Deal de ${contact.name}`,
        value: 0,
        source: 'whatsapp',
        triggered_by_automation: true,
      } as any),
    ) as unknown as Deal;

    this.logger.log(`Created deal ${deal.id} for contact ${contact.id}`);

    this.eventEmitter.emit('whatsapp.first_message', { contactId: contact.id, dealId: deal.id, companyId, waId });

    return { contact, deal };
  }

  private async findOrCreateContact(companyId: string, waId: string, name?: string): Promise<Contact> {
    const existing = await this.contactRepo.findOne({ where: { company_id: companyId, wa_id: waId } });
    if (existing) return existing;

    const phone = waId.split('@')[0];
    const contact = await this.contactRepo.save(
      this.contactRepo.create({
        company_id: companyId,
        wa_id: waId,
        name: name || phone || 'Unknown',
        phone: phone || null,
        source: 'whatsapp',
        whatsapp_labels: [],
      } as any),
    ) as unknown as Contact;
    this.logger.log(`Created contact ${contact.id} from WhatsApp ${waId}`);
    return contact;
  }
}
