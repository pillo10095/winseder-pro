import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WhatsappLabelMapping } from '../entities/whatsapp-label-mapping.entity';
import { LabelMappingRepository } from '../repositories/label-mapping.repository';
import { CreateLabelMappingDto } from '../dto/create-label-mapping.dto';

@Injectable()
export class LabelMappingService {
  private readonly logger = new Logger(LabelMappingService.name);

  constructor(private readonly repo: LabelMappingRepository) {}

  async findByCompanyId(companyId: string): Promise<WhatsappLabelMapping[]> {
    return this.repo.findByCompanyId(companyId);
  }

  async create(companyId: string, dto: CreateLabelMappingDto): Promise<WhatsappLabelMapping> {
    const mapping = this.repo.create({ ...dto, company_id: companyId });
    return this.repo.save(mapping);
  }

  async update(id: string, dto: Partial<CreateLabelMappingDto>, companyId: string): Promise<WhatsappLabelMapping> {
    const mapping = await this.repo.findOne({ where: { id, company_id: companyId }, relations: ['pipeline_stage'] });
    if (!mapping) throw new NotFoundException('Label mapping not found');
    Object.assign(mapping, dto);
    return this.repo.save(mapping);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const mapping = await this.repo.findOne({ where: { id, company_id: companyId } });
    if (!mapping) throw new NotFoundException('Label mapping not found');
    await this.repo.remove(mapping);
  }
}
