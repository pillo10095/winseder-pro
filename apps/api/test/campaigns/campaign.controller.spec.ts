import { Test, type TestingModule } from '@nestjs/testing';

import { CampaignController } from '@/modules/campaigns/controllers/campaign.controller';
import { CampaignService } from '@/modules/campaigns/services/campaign.service';
import { CsvImportService } from '@/modules/campaigns/services/csv-import.service';
import { CampaignContactRepository } from '@/modules/campaigns/repositories/campaign-contact.repository';

describe('CampaignController', () => {
  let controller: CampaignController;
  let campaignService: CampaignService;
  let csvImportService: CsvImportService;
  let campaignContactRepo: CampaignContactRepository;

  const mockCampaignService = {
    findByCompanyId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    startCampaign: jest.fn(),
    pauseCampaign: jest.fn(),
    resumeCampaign: jest.fn(),
    cancelCampaign: jest.fn(),
  };

  const mockCsvImportService = {
    importFromFile: jest.fn(),
  };

  const mockCampaignContactRepo = {
    findByCampaignId: jest.fn(),
  };

  const companyId = 'company-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignController],
      providers: [
        { provide: CampaignService, useValue: mockCampaignService },
        { provide: CsvImportService, useValue: mockCsvImportService },
        { provide: CampaignContactRepository, useValue: mockCampaignContactRepo },
      ],
    }).compile();

    controller = module.get<CampaignController>(CampaignController);
    campaignService = module.get<CampaignService>(CampaignService);
    csvImportService = module.get<CsvImportService>(CsvImportService);
    campaignContactRepo = module.get<CampaignContactRepository>(CampaignContactRepository);

    jest.clearAllMocks();
  });

  describe('GET /campaigns', () => {
    it('should return campaigns list with total', async () => {
      const campaigns = [{ id: 'camp-1', name: 'Test Campaign' }];
      mockCampaignService.findByCompanyId.mockResolvedValue([campaigns, 1]);

      const result = await controller.findAll(companyId, '20', undefined);

      expect(campaignService.findByCompanyId).toHaveBeenCalledWith(companyId, 20, undefined);
      expect(result).toEqual({ data: campaigns, total: 1 });
    });

    it('should use default limit when not provided', async () => {
      mockCampaignService.findByCompanyId.mockResolvedValue([[], 0]);

      await controller.findAll(companyId, undefined, undefined);

      expect(campaignService.findByCompanyId).toHaveBeenCalledWith(companyId, 20, undefined);
    });

    it('should handle empty list', async () => {
      mockCampaignService.findByCompanyId.mockResolvedValue([[], 0]);

      const result = await controller.findAll(companyId, '10', undefined);

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('GET /campaigns/:id', () => {
    it('should return a campaign by id', async () => {
      const campaign = { id: 'camp-1', name: 'Test Campaign' };
      mockCampaignService.findById.mockResolvedValue(campaign);

      const result = await controller.findOne('camp-1');

      expect(campaignService.findById).toHaveBeenCalledWith('camp-1');
      expect(result).toEqual(campaign);
    });

    it('should return null when not found', async () => {
      mockCampaignService.findById.mockResolvedValue(null);

      const result = await controller.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('POST /campaigns', () => {
    it('should create a campaign', async () => {
      const dto = { name: 'New Campaign', template_id: 'tmpl-1' };
      const created = { id: 'camp-2', ...dto, company_id: companyId };
      mockCampaignService.create.mockResolvedValue(created);

      const result = await controller.create(companyId, dto as any);

      expect(campaignService.create).toHaveBeenCalledWith(companyId, dto);
      expect(result).toEqual(created);
    });
  });

  describe('POST /campaigns/:id/start', () => {
    it('should start a campaign', async () => {
      mockCampaignService.startCampaign.mockResolvedValue(undefined);

      const result = await controller.start('camp-1');

      expect(campaignService.startCampaign).toHaveBeenCalledWith('camp-1');
      expect(result).toEqual({ success: true });
    });

    it('should throw when campaign not found', async () => {
      mockCampaignService.startCampaign.mockRejectedValue(new Error('Campaign not found'));

      await expect(controller.start('non-existent')).rejects.toThrow('Campaign not found');
    });
  });

  describe('POST /campaigns/:id/pause', () => {
    it('should pause a campaign', async () => {
      mockCampaignService.pauseCampaign.mockResolvedValue(undefined);

      const result = await controller.pause('camp-1');

      expect(campaignService.pauseCampaign).toHaveBeenCalledWith('camp-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('POST /campaigns/:id/resume', () => {
    it('should resume a campaign', async () => {
      mockCampaignService.resumeCampaign.mockResolvedValue(undefined);

      const result = await controller.resume('camp-1');

      expect(campaignService.resumeCampaign).toHaveBeenCalledWith('camp-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('POST /campaigns/:id/cancel', () => {
    it('should cancel a campaign', async () => {
      mockCampaignService.cancelCampaign.mockResolvedValue(undefined);

      const result = await controller.cancel('camp-1');

      expect(campaignService.cancelCampaign).toHaveBeenCalledWith('camp-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('POST /campaigns/:id/import-csv', () => {
    it('should import CSV file', async () => {
      const dto = { campaign_id: 'camp-1', file_path: '/path/to/file.csv' };
      const importResult = { imported: 5, errors: [] };
      mockCsvImportService.importFromFile.mockResolvedValue(importResult);

      const result = await controller.importCsv(companyId, 'camp-1', dto as any);

      expect(csvImportService.importFromFile).toHaveBeenCalledWith(companyId, 'camp-1', dto.file_path);
      expect(result).toEqual(importResult);
    });
  });

  describe('GET /campaigns/:id/contacts', () => {
    it('should return campaign contacts', async () => {
      const contacts = [{ id: 'contact-1', campaign_id: 'camp-1' }];
      mockCampaignContactRepo.findByCampaignId.mockResolvedValue(contacts);

      const result = await controller.findContacts('camp-1');

      expect(campaignContactRepo.findByCampaignId).toHaveBeenCalledWith('camp-1');
      expect(result).toEqual({ data: contacts });
    });

    it('should return empty array when no contacts', async () => {
      mockCampaignContactRepo.findByCampaignId.mockResolvedValue([]);

      const result = await controller.findContacts('camp-1');

      expect(result).toEqual({ data: [] });
    });
  });

  describe('DELETE /campaigns/:id', () => {
    it('should cancel and remove a campaign', async () => {
      mockCampaignService.cancelCampaign.mockResolvedValue(undefined);

      const result = await controller.remove('camp-1');

      expect(campaignService.cancelCampaign).toHaveBeenCalledWith('camp-1');
      expect(result).toEqual({ success: true });
    });
  });
});
