import { Injectable, Logger } from '@nestjs/common';

import { Deal } from '../entities/deal.entity';
import { DealRepository } from '../repositories/deal.repository';
import { CreateDealDto } from '../dto/create-deal.dto';
import { UpdateDealDto } from '../dto/update-deal.dto';

@Injectable()
export class DealService {
  private readonly logger = new Logger(DealService.name);

  constructor(private readonly dealRepo: DealRepository) {}

  async create(companyId: string, dto: CreateDealDto): Promise<Deal> {
    return this.dealRepo.save(
      this.dealRepo.create({ ...dto, company_id: companyId }),
    );
  }

  async findByCompanyId(
    companyId: string,
    stageId?: string,
    assignedTo?: string,
    search?: string,
    limit = 20,
    cursor?: string,
  ): Promise<[Deal[], number]> {
    return this.dealRepo.findByCompanyId(companyId, stageId, assignedTo, search, limit, cursor);
  }

  async findById(id: string): Promise<Deal | null> {
    return this.dealRepo.findOne({
      where: { id },
      relations: ['pipeline_stage', 'contact', 'assigned_user'],
    });
  }

  async update(id: string, dto: UpdateDealDto): Promise<Deal | null> {
    await this.dealRepo.update(id, dto as any);
    return this.findById(id);
  }

  async moveStage(id: string, stageId: string, reason?: string): Promise<Deal | null> {
    const update: any = { pipeline_stage_id: stageId };
    if (reason) update.won_lost_reason = reason;
    await this.dealRepo.update(id, update);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.dealRepo.delete(id);
  }
}
