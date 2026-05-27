import { Injectable, Logger } from '@nestjs/common';

import { Contact } from '../entities/contact.entity';
import { ContactRepository } from '../repositories/contact.repository';
import { CreateContactDto } from '../dto/create-contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly contactRepo: ContactRepository) {}

  async create(companyId: string, dto: CreateContactDto): Promise<Contact> {
    return this.contactRepo.save(this.contactRepo.create({ ...dto, company_id: companyId }));
  }

  async findByCompanyId(
    companyId: string,
    search?: string,
    limit = 20,
    cursor?: string,
  ): Promise<[Contact[], number]> {
    return this.contactRepo.findByCompanyId(companyId, search, limit, cursor);
  }

  async findById(id: string): Promise<Contact | null> {
    return this.contactRepo.findOne({ where: { id } });
  }

  async update(id: string, dto: Partial<CreateContactDto>): Promise<Contact | null> {
    await this.contactRepo.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.contactRepo.delete(id);
  }
}
