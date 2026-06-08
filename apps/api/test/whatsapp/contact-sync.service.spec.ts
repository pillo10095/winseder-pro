import { Test, TestingModule } from '@nestjs/testing';

import { ContactSyncService } from '@/modules/whatsapp/services/contact-sync.service';
import { ContactRepository } from '@/modules/crm/repositories/contact.repository';
import { Contact } from '@/modules/crm/entities/contact.entity';

describe('ContactSyncService', () => {
  let service: ContactSyncService;
  let contactRepo: jest.Mocked<Pick<ContactRepository, 'findOne' | 'create' | 'save' | 'findByCompanyId'>>;

  const companyId = 'company-1';
  const sessionId = 'session-1';

  beforeEach(async () => {
    contactRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto as Contact),
      save: jest.fn().mockResolvedValue(undefined),
      findByCompanyId: jest.fn().mockResolvedValue([[], 0] as [Contact[], number]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactSyncService,
        { provide: ContactRepository, useValue: contactRepo },
      ],
    }).compile();

    service = module.get<ContactSyncService>(ContactSyncService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('syncContacts', () => {
    it('should create contacts for individual JIDs that do not exist', async () => {
      const baileysContacts = [
        { id: '5511999999999@s.whatsapp.net', name: 'John Doe' },
        { id: '5511888888888@s.whatsapp.net', name: 'Jane Smith' },
      ];

      const result = await service.syncContacts(sessionId, companyId, baileysContacts);

      expect(result).toEqual({ created: 2, skipped: 0 });
      expect(contactRepo.findOne).toHaveBeenCalledTimes(2);
      expect(contactRepo.create).toHaveBeenCalledTimes(2);
      expect(contactRepo.save).toHaveBeenCalledTimes(2);
      expect(contactRepo.create).toHaveBeenCalledWith({
        name: 'John Doe',
        phone: '5511999999999',
        wa_id: '5511999999999@s.whatsapp.net',
        source: 'whatsapp',
        company_id: companyId,
      });
      expect(contactRepo.create).toHaveBeenCalledWith({
        name: 'Jane Smith',
        phone: '5511888888888',
        wa_id: '5511888888888@s.whatsapp.net',
        source: 'whatsapp',
        company_id: companyId,
      });
    });

    it('should skip contacts that already exist by phone + company_id', async () => {
      contactRepo.findOne.mockResolvedValue({ id: 'existing-1' } as Contact);

      const baileysContacts = [
        { id: '5511999999999@s.whatsapp.net', name: 'John Doe' },
      ];

      const result = await service.syncContacts(sessionId, companyId, baileysContacts);

      expect(result).toEqual({ created: 0, skipped: 1 });
      expect(contactRepo.findOne).toHaveBeenCalledWith({
        where: { phone: '5511999999999', company_id: companyId },
      });
      expect(contactRepo.create).not.toHaveBeenCalled();
      expect(contactRepo.save).not.toHaveBeenCalled();
    });

    it('should filter out group JIDs (@g.us)', async () => {
      const baileysContacts = [
        { id: '5511999999999@s.whatsapp.net', name: 'John' },
        { id: '1234567890@g.us', name: 'Group Chat' },
      ];

      const result = await service.syncContacts(sessionId, companyId, baileysContacts);

      expect(result).toEqual({ created: 1, skipped: 0 });
      expect(contactRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should use phone as fallback name when contact has no name', async () => {
      const baileysContacts = [
        { id: '5511999999999@s.whatsapp.net' },
      ];

      const result = await service.syncContacts(sessionId, companyId, baileysContacts);

      expect(result).toEqual({ created: 1, skipped: 0 });
      expect(contactRepo.create).toHaveBeenCalledWith({
        name: '5511999999999',
        phone: '5511999999999',
        wa_id: '5511999999999@s.whatsapp.net',
        source: 'whatsapp',
        company_id: companyId,
      });
    });

    it('should return zeroes for empty input', async () => {
      const result = await service.syncContacts(sessionId, companyId, []);

      expect(result).toEqual({ created: 0, skipped: 0 });
      expect(contactRepo.findOne).not.toHaveBeenCalled();
      expect(contactRepo.create).not.toHaveBeenCalled();
      expect(contactRepo.save).not.toHaveBeenCalled();
    });

    it('should skip contacts without an id', async () => {
      const baileysContacts = [
        { id: '5511999999999@s.whatsapp.net', name: 'John' },
        { id: undefined, name: 'No ID' } as any,
        { name: 'Also No ID' } as any,
      ];

      const result = await service.syncContacts(sessionId, companyId, baileysContacts);

      expect(result).toEqual({ created: 1, skipped: 0 });
      expect(contactRepo.findOne).toHaveBeenCalledTimes(1);
      expect(contactRepo.create).toHaveBeenCalledTimes(1);
    });
  });
});
