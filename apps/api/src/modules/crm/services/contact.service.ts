import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Contact } from '../entities/contact.entity';
import { ContactRepository } from '../repositories/contact.repository';
import { CreateContactDto } from '../dto/create-contact.dto';
import { Label } from '../entities/label.entity';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly contactRepo: ContactRepository,
    @InjectRepository(Label)
    private readonly labelRepo: Repository<Label>,
  ) {}

  async create(companyId: string, dto: CreateContactDto): Promise<Contact> {
    const { labelIds, ...fields } = dto;
    const contact = this.contactRepo.create({ ...fields, company_id: companyId });

    if (labelIds && labelIds.length > 0) {
      contact.labels = await this.labelRepo.findBy({ id: In(labelIds) });
    }

    return this.contactRepo.save(contact);
  }

  async findByCompanyId(
    companyId: string,
    search?: string,
    limit = 20,
    cursor?: string,
    labelIds?: string[],
  ): Promise<[Contact[], number]> {
    return this.contactRepo.findByCompanyId(companyId, search, limit, cursor, labelIds);
  }

  async findById(id: string): Promise<Contact | null> {
    return this.contactRepo.findOne({ where: { id }, relations: ['labels'] });
  }

  async update(id: string, dto: Partial<CreateContactDto>): Promise<Contact | null> {
    const { labelIds, ...fields } = dto;

    await this.contactRepo.update(id, fields);

    if (labelIds !== undefined) {
      const contact = await this.contactRepo.findOne({
        where: { id },
        relations: ['labels'],
      });
      if (contact) {
        contact.labels = await this.labelRepo.findBy({ id: In(labelIds) });
        await this.contactRepo.save(contact);
      }
    }

    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.contactRepo.delete(id);
  }
}
