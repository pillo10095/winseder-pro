import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { Template } from '../entities/template.entity';
import { TemplateRepository } from '../repositories/template.repository';
import { CreateTemplateDto } from '../dto/create-template.dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly templateRepo: TemplateRepository) {}

  async create(companyId: string, dto: CreateTemplateDto): Promise<Template> {
    const variables = dto.variables ?? this.extractVariables(dto.body);
    return this.templateRepo.save(
      this.templateRepo.create({ ...dto, variables, company_id: companyId }),
    );
  }

  async findByCompanyId(companyId: string, search?: string): Promise<Template[]> {
    return this.templateRepo.findByCompanyId(companyId, search);
  }

  async findById(id: string): Promise<Template | null> {
    return this.templateRepo.findOne({ where: { id } });
  }

  async update(id: string, dto: Partial<CreateTemplateDto>): Promise<Template | null> {
    const template = await this.findById(id);
    if (!template) throw new NotFoundException('Template not found');

    const variables = dto.body
      ? (dto.variables ?? this.extractVariables(dto.body))
      : template.variables;

    await this.templateRepo.update(id, { ...dto, variables });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.templateRepo.delete(id);
  }

  private extractVariables(body: string): string[] {
    const matches = body.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.slice(2, -2)))];
  }
}
