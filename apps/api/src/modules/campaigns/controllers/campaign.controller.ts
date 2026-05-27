import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';

import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { CampaignService } from '../services/campaign.service';
import { CsvImportService } from '../services/csv-import.service';
import { CampaignContactRepository } from '../repositories/campaign-contact.repository';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { ImportCsvDto } from '../dto/import-csv.dto';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly csvImportService: CsvImportService,
    private readonly campaignContactRepo: CampaignContactRepository,
  ) {}

  @Get()
  async findAll(
    @CompanyId() companyId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const [campaigns, total] = await this.campaignService.findByCompanyId(
      companyId,
      limit ? parseInt(limit, 10) : 20,
      cursor,
    );
    return { data: campaigns, total };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.campaignService.findById(id);
  }

  @Post()
  async create(@CompanyId() companyId: string, @Body() dto: CreateCampaignDto) {
    return this.campaignService.create(companyId, dto);
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    await this.campaignService.startCampaign(id);
    return { success: true };
  }

  @Post(':id/pause')
  async pause(@Param('id') id: string) {
    await this.campaignService.pauseCampaign(id);
    return { success: true };
  }

  @Post(':id/resume')
  async resume(@Param('id') id: string) {
    await this.campaignService.resumeCampaign(id);
    return { success: true };
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    await this.campaignService.cancelCampaign(id);
    return { success: true };
  }

  @Post(':id/import-csv')
  async importCsv(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: ImportCsvDto,
  ) {
    return this.csvImportService.importFromFile(companyId, id, dto.file_path);
  }

  @Get(':id/contacts')
  async findContacts(@Param('id') id: string) {
    const contacts = await this.campaignContactRepo.findByCampaignId(id);
    return { data: contacts };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.campaignService.cancelCampaign(id);
    return { success: true };
  }
}
