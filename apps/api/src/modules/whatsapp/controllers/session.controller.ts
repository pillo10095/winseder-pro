import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateSessionDto } from '../dto/create-session.dto';
import { SessionManagerService } from '../services/session-manager.service';

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
  async list(@Req() req: Request) {
    const sessions = await this.sessionManager.getSessions(req.companyId!);
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
}
