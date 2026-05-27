import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';

import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { ContactService } from '../services/contact.service';
import { CreateContactDto } from '../dto/create-contact.dto';

@Controller('crm/contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  async findAll(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const [contacts, total] = await this.contactService.findByCompanyId(
      companyId,
      search,
      limit ? parseInt(limit, 10) : 20,
      cursor,
    );
    return { data: contacts, total };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contactService.findById(id);
  }

  @Post()
  async create(@CompanyId() companyId: string, @Body() dto: CreateContactDto) {
    return this.contactService.create(companyId, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateContactDto>) {
    return this.contactService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.contactService.remove(id);
    return { success: true };
  }
}
