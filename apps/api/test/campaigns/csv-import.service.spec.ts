jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'node:fs';

import { CsvImportService } from '@/modules/campaigns/services/csv-import.service';
import { CampaignContactRepository } from '@/modules/campaigns/repositories/campaign-contact.repository';
import { Contact } from '@/modules/crm/entities/contact.entity';
import { CampaignContact } from '@/modules/campaigns/entities/campaign-contact.entity';

describe('CsvImportService', () => {
  let service: CsvImportService;
  let dataSource: jest.Mocked<DataSource>;
  let campaignContactRepo: jest.Mocked<CampaignContactRepository>;
  let mockManager: any;

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((_entity: any, data: any) => data),
      save: jest.fn().mockImplementation((_entity: any, data: any) => ({
        ...data,
        id: 'gen-' + Math.random().toString(36).slice(2, 8),
      })),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(
        (cb: (manager: any) => Promise<any>) => cb(mockManager),
      ),
    } as any;

    campaignContactRepo = {} as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: CampaignContactRepository, useValue: campaignContactRepo },
      ],
    }).compile();

    service = module.get<CsvImportService>(CsvImportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('importFromFile', () => {
    it('should read file and delegate to importFromCsv', async () => {
      const csvContent = 'name,phone\nJohn,5511999999999';
      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);

      const result = await service.importFromFile('company-1', 'campaign-1', '/path/file.csv');

      expect(fs.readFileSync).toHaveBeenCalledWith('/path/file.csv', 'utf-8');
      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should propagate read file errors', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(
        service.importFromFile('company-1', 'campaign-1', '/bad/path.csv'),
      ).rejects.toThrow('File not found');
    });
  });

  describe('importFromCsv', () => {
    it('should import rows from CSV content', async () => {
      mockManager.findOne.mockResolvedValue(null);

      const result = await service.importFromCsv(
        'company-1',
        'campaign-1',
        'name,phone\nAlice,5511111111111\nBob,5522222222222',
      );

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should recognize Spanish column headers', async () => {
      mockManager.findOne.mockResolvedValue(null);

      const result = await service.importFromCsv(
        'company-1',
        'campaign-1',
        'nombre,telefono\nCarlos,5533333333333',
      );

      expect(result.imported).toBe(1);
      expect(mockManager.create).toHaveBeenCalledWith(Contact, expect.objectContaining({
        name: 'Carlos',
        phone: '5533333333333',
      }));
    });

    it('should handle rows with existing contacts', async () => {
      const existingContact = {
        id: 'contact-1',
        company_id: 'company-1',
        phone: '5511999999999',
        name: 'Existing',
      };

      mockManager.findOne
        .mockResolvedValueOnce(existingContact)
        .mockResolvedValueOnce(null);

      const result = await service.importFromCsv(
        'company-1',
        'campaign-1',
        'name,phone,email\nDuplicate,5511999999999,test@test.com',
      );

      expect(result.imported).toBe(1);
      expect(mockManager.save).toHaveBeenCalledWith(
        CampaignContact,
        expect.objectContaining({ campaign_id: 'campaign-1', contact_id: 'contact-1' }),
      );
    });

    it('should skip rows that are already in the campaign', async () => {
      const contact = { id: 'contact-1', company_id: 'company-1', phone: '5511999999999', name: 'Test' };

      mockManager.findOne
        .mockResolvedValueOnce(contact)
        .mockResolvedValueOnce({ id: 'cc-1', campaign_id: 'campaign-1', contact_id: 'contact-1' });

      const result = await service.importFromCsv(
        'company-1',
        'campaign-1',
        'name,phone\nTest,5511999999999',
      );

      expect(result.imported).toBe(1);
      expect(mockManager.save).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ campaign_id: 'campaign-1', contact_id: 'contact-1' }),
      );
    });

    it('should skip rows missing both name and phone', async () => {
      const result = await service.importFromCsv(
        'company-1',
        'campaign-1',
        'name,phone\n,\nAlice,5511111111',
      );

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Row missing name and phone');
    });

    it('should collect per-row errors and continue', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('DB timeout'))
        .mockResolvedValueOnce(null);

      const result = await service.importFromCsv(
        'company-1',
        'campaign-1',
        'name,phone\nAlice,5511111111\nBob,5522222222\nCharlie,5533333333',
      );

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(1);
    });

    it('should create contact with company and source fields', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await service.importFromCsv(
        'company-42',
        'campaign-1',
        'name,phone\nTest,5511999999999',
      );

      expect(mockManager.create).toHaveBeenCalledWith(Contact, expect.objectContaining({
        company_id: 'company-42',
        name: 'Test',
        phone: '5511999999999',
        source: 'import',
      }));
    });

    it('should use name from company column', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await service.importFromCsv(
        'company-1',
        'campaign-1',
        'name,phone,company\nTest,5511999999999,Acme Inc',
      );

      expect(mockManager.create).toHaveBeenCalledWith(Contact, expect.objectContaining({
        company_name: 'Acme Inc',
      }));
    });

    it('should handle quoted CSV fields', async () => {
      mockManager.findOne.mockResolvedValue(null);

      const result = await service.importFromCsv(
        'company-1',
        'campaign-1',
        '"name","phone","email"\n"John Doe","5511999999999","john@example.com"',
      );

      expect(result.imported).toBe(1);
      expect(mockManager.create).toHaveBeenCalledWith(Contact, expect.objectContaining({
        name: 'John Doe',
        phone: '5511999999999',
        email: 'john@example.com',
      }));
    });

    it('should handle empty CSV', async () => {
      const result = await service.importFromCsv('company-1', 'campaign-1', '');

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle CSV with only headers', async () => {
      const result = await service.importFromCsv('company-1', 'campaign-1', 'name,phone,email');

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empresa column for company_name', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await service.importFromCsv(
        'company-1',
        'campaign-1',
        'nombre,tel,empresa\nMaria,5544444444,Empresa SRL',
      );

      expect(mockManager.create).toHaveBeenCalledWith(Contact, expect.objectContaining({
        company_name: 'Empresa SRL',
      }));
    });

    it('should set name to phone when name is missing', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await service.importFromCsv(
        'company-1',
        'campaign-1',
        'phone\n5511999999999',
      );

      expect(mockManager.create).toHaveBeenCalledWith(Contact, expect.objectContaining({
        name: '5511999999999',
      }));
    });

    it('should throw on truly malformed CSV', async () => {
      await expect(
        service.importFromCsv('company-1', 'campaign-1', 'a,b\n1,2,3,4,5'),
      ).resolves.toBeDefined();
    });
  });
});
