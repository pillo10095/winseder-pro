import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Contact } from '../../crm/entities/contact.entity';

export interface SyncResult {
  created: number;
  skipped: number;
}

export interface WaContactEntry {
  id: string;
  name?: string;
}

@Injectable()
export class ContactSyncService {
  private readonly logger = new Logger(ContactSyncService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  /**
   * Sync phonebook contacts — matches by phone number.
   * Does NOT overwrite existing contacts.
   */
  async syncContacts(
    sessionId: string,
    companyId: string,
    contacts: WaContactEntry[],
  ): Promise<SyncResult> {
    let created = 0;
    let skipped = 0;

    for (const entry of contacts) {
      if (!entry.id || !entry.id.endsWith('@s.whatsapp.net')) continue;

      const phone = entry.id.split('@')[0];
      if (!phone) continue;

      const existing = await this.contactRepo.findOne({
        where: { phone, company_id: companyId },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await this.contactRepo.save(
        this.contactRepo.create({
          name: entry.name || phone,
          phone,
          wa_id: entry.id,
          source: 'whatsapp',
          company_id: companyId,
        }),
      );
      created++;
    }

    this.logger.log(
      `[${sessionId}] Phonebook sync: ${created} created, ${skipped} skipped`,
    );

    return { created, skipped };
  }

  /**
   * Sync ALL WhatsApp contacts by JID (wa_id), including chat-only contacts.
   * Creates the contact if it doesn't exist; updates name if it does.
   * _Unlike_ syncContacts, this also matches on wa_id and updates existing
   * records so labels applied later have a contact to attach to.
   */
  async syncByWaIds(
    sessionId: string,
    companyId: string,
    contacts: WaContactEntry[],
  ): Promise<SyncResult> {
    let created = 0;
    let skipped = 0;

    for (const entry of contacts) {
      if (!entry.id || !entry.id.endsWith('@s.whatsapp.net')) continue;

      const phone = entry.id.split('@')[0];
      if (!phone) continue;

      const existing = await this.contactRepo.findOne({
        where: [
          { wa_id: entry.id, company_id: companyId },
          { phone, company_id: companyId },
        ],
      });

      if (existing) {
        // Update wa_id if it was missing and update name
        let changed = false;
        if (!existing.wa_id) {
          existing.wa_id = entry.id;
          changed = true;
        }
        if (entry.name && existing.name !== entry.name) {
          existing.name = entry.name;
          changed = true;
        }
        if (changed) {
          await this.contactRepo.save(existing);
        }
        skipped++;
        continue;
      }

      await this.contactRepo.save(
        this.contactRepo.create({
          name: entry.name || phone,
          phone,
          wa_id: entry.id,
          source: 'whatsapp',
          company_id: companyId,
        }),
      );
      created++;
    }

    this.logger.log(
      `[${sessionId}] JID sync: ${created} created, ${skipped} updated/skipped`,
    );

    return { created, skipped };
  }

  /**
   * Apply a WhatsApp label to a contact looked up by wa_id.
   * Creates the contact if it doesn't exist yet.
   * Returns the updated contact or null if no wa_id.
   */
  async applyLabel(
    companyId: string,
    waId: string,
    labelName: string,
  ): Promise<Contact | null> {
    if (!waId) return null;

    const phone = waId.split('@')[0] || waId;
    let contact = await this.contactRepo.findOne({
      where: [
        { wa_id: waId, company_id: companyId },
        { phone, company_id: companyId },
      ],
    });

    if (!contact) {
      contact = await this.contactRepo.save(
        this.contactRepo.create({
          name: phone,
          phone,
          wa_id: waId,
          source: 'whatsapp',
          company_id: companyId,
          whatsapp_labels: [],
        }),
      );
    }

    const labels: string[] = (contact.whatsapp_labels ?? []) as string[];
    if (!labels.includes(labelName)) {
      labels.push(labelName);
      await this.contactRepo.update(contact.id, {
        whatsapp_labels: labels,
      } as any);
      (contact as any).whatsapp_labels = labels;
    }

    return contact;
  }

  /**
   * Remove a WhatsApp label from a contact looked up by wa_id.
   */
  async removeLabel(
    companyId: string,
    waId: string,
    labelName: string,
  ): Promise<void> {
    if (!waId) return;

    const phone = waId.split('@')[0] || waId;
    const contact = await this.contactRepo.findOne({
      where: [
        { wa_id: waId, company_id: companyId },
        { phone, company_id: companyId },
      ],
    });
    if (!contact) return;

    const labels: string[] = (contact.whatsapp_labels ?? []) as string[];
    const idx = labels.indexOf(labelName);
    if (idx !== -1) {
      labels.splice(idx, 1);
      await this.contactRepo.update(contact.id, {
        whatsapp_labels: labels,
      } as any);
    }
  }
}
