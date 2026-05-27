import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { WebhookConfigRepository } from '../repositories/webhook-config.repository';
import { CreateWebhookConfigDto } from '../dto/create-webhook-config.dto';
import { UpdateWebhookConfigDto } from '../dto/update-webhook-config.dto';

@Controller('webhook-configs')
export class WebhookConfigController {
  constructor(private readonly webhookRepo: WebhookConfigRepository) {}

  @Get()
  async findAll(): Promise<unknown[]> {
    return this.webhookRepo.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<unknown> {
    return this.webhookRepo.findOneOrFail({ where: { id } });
  }

  @Post()
  async create(@Body() dto: CreateWebhookConfigDto): Promise<unknown> {
    return this.webhookRepo.save(this.webhookRepo.create(dto));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookConfigDto): Promise<unknown> {
    await this.webhookRepo.update(id, dto);
    return this.webhookRepo.findOneOrFail({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.webhookRepo.delete(id);
  }
}
