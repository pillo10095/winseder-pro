import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateLabelDto } from '../dtos/create-label.dto';
import { UpdateLabelDto } from '../dtos/update-label.dto';
import { Label } from '../entities/label.entity';
import { LabelRepository } from '../repositories/label.repository';

@Injectable()
export class LabelService {
  constructor(private readonly labelRepo: LabelRepository) {}

  async findAll(companyId: string): Promise<Label[]> {
    return this.labelRepo.findByCompanyId(companyId);
  }

  async findOne(companyId: string, id: string): Promise<Label> {
    const label = await this.labelRepo.findOne({
      where: { id, company_id: companyId },
    });
    if (!label) throw new NotFoundException('Label not found');
    return label;
  }

  async create(companyId: string, dto: CreateLabelDto): Promise<Label> {
    const label = this.labelRepo.create({
      company_id: companyId,
      name: dto.name,
      color: dto.color ?? '#6B7280',
    });
    return this.labelRepo.save(label);
  }

  async update(companyId: string, id: string, dto: UpdateLabelDto): Promise<Label> {
    const label = await this.findOne(companyId, id);
    Object.assign(label, dto);
    return this.labelRepo.save(label);
  }

  async remove(companyId: string, id: string): Promise<void> {
    const label = await this.findOne(companyId, id);
    await this.labelRepo.remove(label);
  }
}
