import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { WebhookConfig } from '../entities/webhook-config.entity';

@Injectable()
export class WebhookConfigRepository extends Repository<WebhookConfig> {
  constructor(private dataSource: DataSource) {
    super(WebhookConfig, dataSource.createEntityManager());
  }

  async findActiveByCompanyId(companyId: string): Promise<WebhookConfig[]> {
    return this.find({ where: { company_id: companyId, is_active: true } });
  }

  async findByIdAndCompany(id: string, companyId: string): Promise<WebhookConfig | null> {
    return this.findOne({ where: { id, company_id: companyId } });
  }

  async findActiveByEvent(event: string): Promise<WebhookConfig[]> {
    return this.createQueryBuilder('w')
      .where('w.is_active = :active', { active: true })
      .andWhere('JSON_CONTAINS(w.events, :event, "$")', { event: JSON.stringify(event) })
      .getMany();
  }
}
