import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { AiTrainingDocRepository } from '../repositories/ai-training-doc.repository';

class CreateTrainingDocDto {
  title!: string;
  content!: string;
}

@Controller('ai/training')
@UseGuards(JwtAuthGuard)
export class AiTrainingController {
  constructor(
    private readonly docRepo: AiTrainingDocRepository,
  ) {}

  @Get()
  async list(@CompanyId() companyId: string) {
    const docs = await this.docRepo.findByCompanyId(companyId);
    return { data: docs };
  }

  @Post()
  async create(
    @CompanyId() companyId: string,
    @Body() dto: CreateTrainingDocDto,
  ) {
    const doc = this.docRepo.create({
      company_id: companyId,
      title: dto.title,
      content: dto.content,
      content_type: 'text',
      chunks: [dto.content],
    });

    const saved = await this.docRepo.save(doc);
    return { data: saved };
  }

  @Delete(':id')
  async remove(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    await this.docRepo.delete({ id, company_id: companyId });
    return { data: { deleted: true } };
  }
}
