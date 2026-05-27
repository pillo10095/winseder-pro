import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Campaign } from '../entities/campaign.entity';
import { CampaignRepository } from '../repositories/campaign.repository';
import { CampaignContactRepository } from '../repositories/campaign-contact.repository';
import { CreateCampaignDto } from '../dto/create-campaign.dto';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly campaignContactRepo: CampaignContactRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(companyId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const campaign = await this.campaignRepo.save(
      this.campaignRepo.create({
        name: dto.name,
        template_id: dto.template_id,
        company_id: companyId,
        status: dto.scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
      }),
    );

    if (dto.contact_ids?.length) {
      const campaignContacts = dto.contact_ids.map((contactId) => ({
        campaign_id: campaign.id,
        contact_id: contactId,
      }));
      await this.campaignContactRepo.save(
        this.campaignContactRepo.create(campaignContacts),
      );
      await this.campaignRepo.update(campaign.id, {
        total_count: dto.contact_ids.length,
      });
    }

    this.eventEmitter.emit('campaign.created', { campaignId: campaign.id });

    return this.campaignRepo.findOne({ where: { id: campaign.id }, relations: ['template'] }) as Promise<Campaign>;
  }

  async findByCompanyId(
    companyId: string,
    limit = 20,
    cursor?: string,
  ): Promise<[Campaign[], number]> {
    return this.campaignRepo.findByCompanyId(companyId, limit, cursor);
  }

  async findById(id: string): Promise<Campaign | null> {
    return this.campaignRepo.findOne({
      where: { id },
      relations: ['template'],
    });
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const updates: Partial<Campaign> = { status };
    if (status === 'completed') {
      updates.completed_at = new Date();
    }
    await this.campaignRepo.update(id, updates);
    this.eventEmitter.emit('campaign.status.updated', { campaignId: id, status });
  }

  async startCampaign(id: string): Promise<void> {
    const campaign = await this.findById(id);
    if (!campaign) throw new Error('Campaign not found');

    await this.updateStatus(id, 'sending');
    this.eventEmitter.emit('campaign.start', { campaignId: id });
  }

  async pauseCampaign(id: string): Promise<void> {
    await this.updateStatus(id, 'paused');
  }

  async resumeCampaign(id: string): Promise<void> {
    await this.updateStatus(id, 'sending');
  }

  async cancelCampaign(id: string): Promise<void> {
    await this.updateStatus(id, 'cancelled');
  }
}
