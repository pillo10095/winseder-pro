import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContactService } from '@/modules/crm/services/contact.service';
import { Contact } from '@/modules/crm/entities/contact.entity';
import { ContactRepository } from '@/modules/crm/repositories/contact.repository';

describe('ContactService', () => {
  let service: ContactService;
  let contactRepo: jest.Mocked<ContactRepository>;

  const mockContact: Contact = {
    id: 'contact-1',
    company_id: 'company-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+5511999999999',
    company_name: 'Acme Inc',
    source: 'website',
    role: 'CEO',
    notes: 'Hot lead',
    created_at: new Date(),
    updated_at: new Date(),
  } as Contact;

  beforeEach(async () => {
    contactRepo = {
      create: jest.fn().mockReturnValue(mockContact),
      save: jest.fn().mockResolvedValue(mockContact),
      findOne: jest.fn().mockResolvedValue(mockContact),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      findByCompanyId: jest.fn().mockResolvedValue([[mockContact], 1]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: ContactRepository, useValue: contactRepo },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a contact', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+5511999999999',
        company_name: 'Acme Inc',
      };

      const result = await service.create('company-1', dto);

      expect(result).toEqual(mockContact);
      expect(contactRepo.create).toHaveBeenCalledWith({
        ...dto,
        company_id: 'company-1',
      });
      expect(contactRepo.save).toHaveBeenCalled();
    });
  });

  describe('findByCompanyId', () => {
    it('should return contacts scoped to company', async () => {
      const [contacts, total] = await service.findByCompanyId('company-1');

      expect(contacts).toHaveLength(1);
      expect(total).toBe(1);
      expect(contactRepo.findByCompanyId).toHaveBeenCalledWith('company-1', undefined, 20, undefined);
    });

    it('should support search, limit, and cursor', async () => {
      await service.findByCompanyId('company-1', 'john', 10, 'cursor-1');

      expect(contactRepo.findByCompanyId).toHaveBeenCalledWith('company-1', 'john', 10, 'cursor-1');
    });
  });

  describe('findById', () => {
    it('should return a contact by id', async () => {
      const result = await service.findById('contact-1');

      expect(result).toEqual(mockContact);
      expect(contactRepo.findOne).toHaveBeenCalledWith({ where: { id: 'contact-1' } });
    });

    it('should return null if not found', async () => {
      contactRepo.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the contact', async () => {
      const result = await service.update('contact-1', { name: 'Jane Doe' });

      expect(result).toEqual(mockContact);
      expect(contactRepo.update).toHaveBeenCalledWith('contact-1', { name: 'Jane Doe' });
    });
  });

  describe('remove', () => {
    it('should delete a contact', async () => {
      await service.remove('contact-1');

      expect(contactRepo.delete).toHaveBeenCalledWith('contact-1');
    });
  });
});
