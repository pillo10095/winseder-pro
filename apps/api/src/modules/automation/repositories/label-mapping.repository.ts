import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WhatsappLabelMapping } from '../entities/whatsapp-label-mapping.entity';

@Injectable()
export class LabelMappingRepository extends Repository<WhatsappLabelMapping> {
  constructor(private dataSource: DataSource) {
    super(WhatsappLabelMapping, dataSource.createEntityManager());
  }

  async findByCompanyId(companyId: string): Promise<WhatsappLabelMapping[]> {
    return this.find({ where: { company_id: companyId }, relations: ['pipeline_stage'], order: { created_at: 'DESC' } });
  }

  async findEnabledByLabel(companyId: string, label: string): Promise<WhatsappLabelMapping | null> {
    return this.findOne({ where: { company_id: companyId, whatsapp_label: label, enabled: true }, relations: ['pipeline_stage'] });
  }
}
