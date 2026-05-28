import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { CampaignService } from '@/modules/campaigns/services/campaign.service';
import { CampaignRepository } from '@/modules/campaigns/repositories/campaign.repository';
import { CampaignContactRepository } from '@/modules/campaigns/repositories/campaign-contact.repository';
import { Campaign } from '@/modules/campaigns/entities/campaign.entity';

describe('CampaignService', () => {
  let service: CampaignService;
  let campaignRepo: jest.Mocked<CampaignRepository>;
  let campaignContactRepo: jest.Mocked<CampaignContactRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockCampaign: Campaign = {
    id: 'campaign-1',
    company_id: 'company-1',
    name: 'Summer Sale',
    template_id: 'template-1',
    status: 'draft',
    scheduled_at: null,
    sent_count: 0,
    delivered_count: 0,
    read_count: 0,
    failed_count: 0,
    total_count: 0,
    completed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as Campaign;

  beforeEach(async () => {
    campaignRepo = {
      create: jest.fn().mockReturnValue(mockCampaign),
      save: jest.fn().mockResolvedValue(mockCampaign),
      findOne: jest.fn().mockResolvedValue(mockCampaign),
      update: jest.fn().mockResolvedValue(undefined),
      findByCompanyId: jest.fn().mockResolvedValue([[mockCampaign], 1]),
    } as any;

    campaignContactRepo = {
      create: jest.fn().mockReturnValue([]),
      save: jest.fn().mockResolvedValue([]),
    } as any;

    eventEmitter = { emit: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: CampaignRepository, useValue: campaignRepo },
        { provide: CampaignContactRepository, useValue: campaignContactRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a campaign with default draft status', async () => {
      campaignRepo.findOne.mockResolvedValue(mockCampaign);

      const result = await service.create('company-1', { name: 'Summer Sale' });

      expect(result).toEqual(mockCampaign);
      expect(campaignRepo.create).toHaveBeenCalledWith({
        name: 'Summer Sale',
        template_id: undefined,
        company_id: 'company-1',
        status: 'draft',
        scheduled_at: null,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('campaign.created', {
        campaignId: 'campaign-1',
      });
    });

    it('should set status to scheduled when scheduled_at is provided', async () => {
      await service.create('company-1', {
        name: 'Scheduled Campaign',
        scheduled_at: '2025-06-01T10:00:00Z',
        template_id: 'template-1',
      });

      expect(campaignRepo.create).toHaveBeenCalledWith({
        name: 'Scheduled Campaign',
        template_id: 'template-1',
        company_id: 'company-1',
        status: 'scheduled',
        scheduled_at: new Date('2025-06-01T10:00:00Z'),
      });
    });

    it('should save campaign contacts when contact_ids are provided', async () => {
      campaignContactRepo.create.mockReturnValue([
        { campaign_id: 'campaign-1', contact_id: 'contact-1' },
        { campaign_id: 'campaign-1', contact_id: 'contact-2' },
      ]);

      await service.create('company-1', {
        name: 'Campaign with Contacts',
        contact_ids: ['contact-1', 'contact-2'],
      });

      expect(campaignContactRepo.create).toHaveBeenCalledWith([
        { campaign_id: 'campaign-1', contact_id: 'contact-1' },
        { campaign_id: 'campaign-1', contact_id: 'contact-2' },
      ]);
      expect(campaignContactRepo.save).toHaveBeenCalled();
      expect(campaignRepo.update).toHaveBeenCalledWith('campaign-1', {
        total_count: 2,
      });
    });

    it('should not save contacts when contact_ids is empty', async () => {
      await service.create('company-1', { name: 'Empty Contacts' });

      expect(campaignContactRepo.save).not.toHaveBeenCalled();
      expect(campaignRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('findByCompanyId', () => {
    it('should return campaigns for company with defaults', async () => {
      const [campaigns, total] = await service.findByCompanyId('company-1');

      expect(campaigns).toHaveLength(1);
      expect(total).toBe(1);
      expect(campaignRepo.findByCompanyId).toHaveBeenCalledWith(
        'company-1',
        20,
        undefined,
      );
    });

    it('should pass limit and cursor', async () => {
      await service.findByCompanyId('company-1', 10, 'cursor-1');

      expect(campaignRepo.findByCompanyId).toHaveBeenCalledWith(
        'company-1',
        10,
        'cursor-1',
      );
    });
  });

  describe('findById', () => {
    it('should return a campaign by id', async () => {
      const result = await service.findById('campaign-1');

      expect(result).toEqual(mockCampaign);
      expect(campaignRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        relations: ['template'],
      });
    });

    it('should return null if not found', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update campaign status', async () => {
      await service.updateStatus('campaign-1', 'paused');

      expect(campaignRepo.update).toHaveBeenCalledWith('campaign-1', {
        status: 'paused',
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('campaign.status.updated', {
        campaignId: 'campaign-1',
        status: 'paused',
      });
    });

    it('should set completed_at when status is completed', async () => {
      await service.updateStatus('campaign-1', 'completed');

      expect(campaignRepo.update).toHaveBeenCalledWith('campaign-1', {
        status: 'completed',
        completed_at: expect.any(Date),
      });
    });
  });

  describe('startCampaign', () => {
    it('should start an existing campaign', async () => {
      await service.startCampaign('campaign-1');

      expect(campaignRepo.update).toHaveBeenCalledWith('campaign-1', {
        status: 'sending',
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('campaign.start', {
        campaignId: 'campaign-1',
      });
    });

    it('should throw if campaign does not exist', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      await expect(service.startCampaign('nonexistent')).rejects.toThrow(
        'Campaign not found',
      );
    });
  });

  describe('pauseCampaign', () => {
    it('should pause a campaign', async () => {
      await service.pauseCampaign('campaign-1');

      expect(campaignRepo.update).toHaveBeenCalledWith('campaign-1', {
        status: 'paused',
      });
    });
  });

  describe('resumeCampaign', () => {
    it('should resume a campaign', async () => {
      await service.resumeCampaign('campaign-1');

      expect(campaignRepo.update).toHaveBeenCalledWith('campaign-1', {
        status: 'sending',
      });
    });
  });

  describe('cancelCampaign', () => {
    it('should cancel a campaign', async () => {
      await service.cancelCampaign('campaign-1');

      expect(campaignRepo.update).toHaveBeenCalledWith('campaign-1', {
        status: 'cancelled',
      });
    });
  });
});
