import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { WebhookConfigRepository } from '../repositories/webhook-config.repository';
import { CreateWebhookConfigDto } from '../dto/create-webhook-config.dto';
import { UpdateWebhookConfigDto } from '../dto/update-webhook-config.dto';

@Controller('webhook-configs')
@UseGuards(JwtAuthGuard)
export class WebhookConfigController {
  constructor(private readonly webhookRepo: WebhookConfigRepository) {}

  private async findOwned(id: string, companyId: string) {
    const config = await this.webhookRepo.findOne({ where: { id, company_id: companyId } });
    if (!config) throw new NotFoundException('Webhook config not found');
    return config;
  }

  @Get()
  async findAll(@CompanyId() companyId: string): Promise<unknown[]> {
    return this.webhookRepo.find({ where: { company_id: companyId } });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ): Promise<unknown> {
    return this.findOwned(id, companyId);
  }

  @Post()
  async create(
    @Body() dto: CreateWebhookConfigDto,
    @CompanyId() companyId: string,
  ): Promise<unknown> {
    if (!companyId) throw new UnauthorizedException('Authentication required');
    return this.webhookRepo.save(
      this.webhookRepo.create({ ...dto, company_id: companyId }),
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookConfigDto,
    @CompanyId() companyId: string,
  ): Promise<unknown> {
    const result = await this.webhookRepo.update({ id, company_id: companyId }, dto);
    if (result.affected === 0) throw new NotFoundException('Webhook config not found');
    return this.webhookRepo.findOne({ where: { id, company_id: companyId } });
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ): Promise<void> {
    await this.findOwned(id, companyId);
    await this.webhookRepo.delete(id);
  }
}
