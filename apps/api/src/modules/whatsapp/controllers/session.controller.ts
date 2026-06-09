import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateSessionDto } from '../dto/create-session.dto';
import { SessionManagerService } from '../services/session-manager.service';
import { SessionStatus } from '../entities/session.entity';

@Controller('whatsapp/sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionManager: SessionManagerService) {}

  @Post()
  async create(@Body() dto: CreateSessionDto, @Req() req: Request) {
    const session = await this.sessionManager.createSession(
      req.companyId!,
      dto.session_name,
    );
    return { data: session };
  }

  @Get()
  async list(
    @Req() req: Request,
    @Query('status') status?: string,
  ) {
    const sessions = await this.sessionManager.getSessions(
      req.companyId!,
      status,
    );
    return { data: sessions };
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: Request) {
    const session = await this.sessionManager.getSession(id, req.companyId!);
    if (!session) {
      return { error: 'Session not found' };
    }
    return { data: session };
  }

  @Delete(':id')
  async disconnect(@Param('id') id: string, @Req() req: Request) {
    await this.sessionManager.disconnectSession(id, req.companyId!);
    return { data: { message: 'Session disconnected' } };
  }

  @Get(':id/health')
  async health(@Param('id') id: string) {
    const result = await this.sessionManager.checkHealth(id);
    return { data: result };
  }

  @Post(':id/extract-contacts')
  async extractContacts(@Param('id') id: string, @Req() req: Request) {
    const result = await this.sessionManager.extractContacts(id, req.companyId!);
    return { data: result };
  }
}
