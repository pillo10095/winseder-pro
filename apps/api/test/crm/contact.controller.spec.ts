import { Test, type TestingModule } from '@nestjs/testing';

import { ContactController } from '@/modules/crm/controllers/contact.controller';
import { ContactService } from '@/modules/crm/services/contact.service';

describe('ContactController', () => {
  let controller: ContactController;
  let contactService: ContactService;

  const mockContactService = {
    findByCompanyId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const companyId = 'company-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        { provide: ContactService, useValue: mockContactService },
      ],
    }).compile();

    controller = module.get<ContactController>(ContactController);
    contactService = module.get<ContactService>(ContactService);

    jest.clearAllMocks();
  });

  describe('GET /crm/contacts', () => {
    it('should return contacts list with total', async () => {
      const contacts = [{ id: 'contact-1', name: 'John Doe' }];
      mockContactService.findByCompanyId.mockResolvedValue([contacts, 1]);

      const result = await controller.findAll(companyId, undefined, '20', undefined);

      expect(contactService.findByCompanyId).toHaveBeenCalledWith(companyId, undefined, 20, undefined);
      expect(result).toEqual({ data: contacts, total: 1 });
    });

    it('should use default limit when not provided', async () => {
      mockContactService.findByCompanyId.mockResolvedValue([[], 0]);

      await controller.findAll(companyId, undefined, undefined, undefined);

      expect(contactService.findByCompanyId).toHaveBeenCalledWith(companyId, undefined, 20, undefined);
    });

    it('should search by term and use cursor', async () => {
      const contacts = [{ id: 'contact-2', name: 'Jane' }];
      mockContactService.findByCompanyId.mockResolvedValue([contacts, 1]);

      const result = await controller.findAll(companyId, 'Jane', '10', 'cursor-abc');

      expect(contactService.findByCompanyId).toHaveBeenCalledWith(companyId, 'Jane', 10, 'cursor-abc');
      expect(result).toEqual({ data: contacts, total: 1 });
    });

    it('should return empty list when no contacts', async () => {
      mockContactService.findByCompanyId.mockResolvedValue([[], 0]);

      const result = await controller.findAll(companyId, undefined, undefined, undefined);

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('GET /crm/contacts/:id', () => {
    it('should return a contact by id', async () => {
      const contact = { id: 'contact-1', name: 'John Doe' };
      mockContactService.findById.mockResolvedValue(contact);

      const result = await controller.findOne('contact-1');

      expect(contactService.findById).toHaveBeenCalledWith('contact-1');
      expect(result).toEqual(contact);
    });

    it('should return null when not found', async () => {
      mockContactService.findById.mockResolvedValue(null);

      const result = await controller.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('POST /crm/contacts', () => {
    it('should create a contact', async () => {
      const dto = { name: 'New Contact', email: 'test@example.com' };
      const created = { id: 'contact-3', ...dto, company_id: companyId };
      mockContactService.create.mockResolvedValue(created);

      const result = await controller.create(companyId, dto as any);

      expect(contactService.create).toHaveBeenCalledWith(companyId, dto);
      expect(result).toEqual(created);
    });
  });

  describe('PUT /crm/contacts/:id', () => {
    it('should update a contact', async () => {
      const dto = { name: 'Updated Name' };
      const updated = { id: 'contact-1', name: 'Updated Name', email: 'test@example.com' };
      mockContactService.update.mockResolvedValue(updated);

      const result = await controller.update('contact-1', dto as any);

      expect(contactService.update).toHaveBeenCalledWith('contact-1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('DELETE /crm/contacts/:id', () => {
    it('should remove a contact', async () => {
      mockContactService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('contact-1');

      expect(contactService.remove).toHaveBeenCalledWith('contact-1');
      expect(result).toEqual({ success: true });
    });
  });
});
