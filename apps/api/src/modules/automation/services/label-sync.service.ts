import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContactRepository } from '../../crm/repositories/contact.repository';

export interface WhatsAppLabelEvent {
  companyId: string;
  waId: string;
  labelName: string;
  action: 'added' | 'removed';
}

@Injectable()
export class LabelSyncService {
  private readonly logger = new Logger(LabelSyncService.name);

  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async syncLabel(companyId: string, waId: string, labelName: string, action: 'added' | 'removed'): Promise<void> {
    const contact = await this.contactRepo.findOne({ where: { company_id: companyId, wa_id: waId } });
    if (!contact) {
      this.logger.warn(`Contact not found for waId ${waId}, skipping label sync`);
      return;
    }

    const currentLabels: string[] = contact.whatsapp_labels ?? [];

    if (action === 'added') {
      if (!currentLabels.includes(labelName)) {
        currentLabels.push(labelName);
      }
    } else {
      const idx = currentLabels.indexOf(labelName);
      if (idx !== -1) currentLabels.splice(idx, 1);
    }

    await this.contactRepo.update(contact.id, { whatsapp_labels: currentLabels });

    if (action === 'added') {
      this.eventEmitter.emit('whatsapp.label_added', { contactId: contact.id, labelName, companyId, waId });
    } else {
      this.eventEmitter.emit('whatsapp.label_removed', { contactId: contact.id, labelName, companyId, waId });
    }

    this.logger.debug(`Label "${labelName}" ${action} for contact ${contact.id}`);
  }
}
