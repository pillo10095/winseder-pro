import { Injectable, Logger } from '@nestjs/common';

import { ContactRepository } from '../../crm/repositories/contact.repository';
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
    private readonly contactRepo: ContactRepository,
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

    const individuals = contacts.filter(
      (c) =>
        c.id &&
        (c.id.endsWith('@s.whatsapp.net') || c.id.endsWith('@lid')),
    );
    if (individuals.length === 0) return { created, skipped };

    const phones = individuals
      .map((c) => c.id.split('@')[0])
      .filter(Boolean);
    if (phones.length === 0) return { created, skipped };

    const existingPhones = new Set(
      (
        await this.contactRepo.find({
          where: phones.map((p) => ({ phone: p, company_id: companyId })),
          select: ['phone'],
        })
      ).map((c) => c.phone),
    );

    const toCreate = individuals.filter(
      (c) => !existingPhones.has(c.id.split('@')[0]),
    );

    if (toCreate.length > 0) {
      await this.contactRepo.save(
        toCreate.map((c) => {
          const phone = c.id.split('@')[0];
          return this.contactRepo.create({
            name: c.name || phone,
            phone,
            wa_id: c.id,
            source: 'whatsapp',
            company_id: companyId,
          });
        }),
      );
      created = toCreate.length;
    }
    skipped = individuals.length - created;

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
    let updated = 0;
    let skipped = 0;

    const individuals = contacts.filter(
      (c) =>
        c.id &&
        (c.id.endsWith('@s.whatsapp.net') || c.id.endsWith('@lid')),
    );
    if (individuals.length === 0) return { created, skipped };

    const waIds = individuals.map((c) => c.id);
    const phones = individuals.map((c) => c.id.split('@')[0]).filter(Boolean);

    const existingContacts = await this.contactRepo.find({
      where: [
        ...waIds.map((id) => ({ wa_id: id, company_id: companyId })),
        ...phones.map((p) => ({ phone: p, company_id: companyId })),
      ],
    });

    const existingByWaId = new Map(existingContacts.filter((c) => c.wa_id).map((c) => [c.wa_id, c]));
    const existingByPhone = new Map(existingContacts.filter((c) => c.phone).map((c) => [c.phone, c]));

    const toUpdate: Contact[] = [];
    const toCreate: Array<{ name: string; phone: string; wa_id: string }> = [];

    for (const entry of individuals) {
      const phone = entry.id.split('@')[0];
      const existing = existingByWaId.get(entry.id) || existingByPhone.get(phone);

      if (existing) {
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
          toUpdate.push(existing);
        } else {
          skipped++;
        }
        continue;
      }

      toCreate.push({ name: entry.name || phone, phone, wa_id: entry.id });
    }

    if (toUpdate.length > 0) {
      await this.contactRepo.save(toUpdate);
      updated = toUpdate.length;
    }
    if (toCreate.length > 0) {
      await this.contactRepo.save(
        toCreate.map((c) =>
          this.contactRepo.create({
            name: c.name,
            phone: c.phone,
            wa_id: c.wa_id,
            source: 'whatsapp',
            company_id: companyId,
          }),
        ),
      );
      created = toCreate.length;
    }

    this.logger.log(
      `[${sessionId}] JID sync: ${created} created, ${updated} updated, ${skipped} skipped`,
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
   * Get ALL contacts that have ever been synced from WhatsApp for a company.
   * Used as fallback when in-memory knownContacts is empty (after restart).
   */
  async getExistingWaContacts(companyId: string): Promise<WaContactEntry[]> {
    // Use the same query builder that the CRM module uses (proven to work)
    const [contacts] = await this.contactRepo.findByCompanyId(companyId);

    if (contacts.length === 0) {
      this.logger.log(`[getExistingWaContacts] 0 contacts for company ${companyId}`);
      return [];
    }

    const withWaId = contacts.filter((c) => !!c.wa_id);
    this.logger.log(
      `[getExistingWaContacts] ${contacts.length} total, ${withWaId.length} with wa_id`,
    );

    // Use wa_id if available, otherwise construct JID from phone number.
    // syncByWaIds matches by both wa_id AND phone, so either will work.
    return contacts.map((c) => ({
      id: c.wa_id || `${c.phone}@s.whatsapp.net`,
      name: c.name ?? undefined,
    }));
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
