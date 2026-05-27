import { Injectable, Logger } from '@nestjs/common';

import { PipelineStage } from '../entities/pipeline-stage.entity';
import { PipelineStageRepository } from '../repositories/pipeline-stage.repository';
import { CreatePipelineStageDto } from '../dto/create-pipeline.dto';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(private readonly stageRepo: PipelineStageRepository) {}

  async create(companyId: string, dto: CreatePipelineStageDto): Promise<PipelineStage> {
    const maxOrder = await this.stageRepo
      .findByCompanyId(companyId)
      .then((stages) => stages.length);

    return this.stageRepo.save(
      this.stageRepo.create({
        ...dto,
        company_id: companyId,
        sort_order: dto.sort_order ?? maxOrder,
      }),
    );
  }

  async findByCompanyId(companyId: string): Promise<PipelineStage[]> {
    return this.stageRepo.findByCompanyId(companyId);
  }

  async seedDefaults(companyId: string): Promise<PipelineStage[]> {
    const existing = await this.findByCompanyId(companyId);
    if (existing.length > 0) return existing;

    const defaults = [
      { name: 'Lead', color: '#6B7280', sort_order: 0, default_probability: 10 },
      { name: 'Qualified', color: '#3B82F6', sort_order: 1, default_probability: 30 },
      { name: 'Proposal', color: '#F59E0B', sort_order: 2, default_probability: 50 },
      { name: 'Negotiation', color: '#8B5CF6', sort_order: 3, default_probability: 70 },
      { name: 'Closed Won', color: '#10B981', sort_order: 4, default_probability: 100 },
      { name: 'Closed Lost', color: '#EF4444', sort_order: 5, default_probability: 0 },
    ];

    const stages = defaults.map((d) =>
      this.stageRepo.create({ ...d, company_id: companyId }),
    );
    return this.stageRepo.save(stages);
  }

  async update(id: string, dto: Partial<CreatePipelineStageDto>): Promise<PipelineStage | null> {
    await this.stageRepo.update(id, dto);
    return this.stageRepo.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.stageRepo.delete(id);
  }
}
