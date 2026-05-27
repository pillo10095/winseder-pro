import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SessionManagerService } from '../services/session-manager.service';

@Controller('whatsapp/sessions')
@UseGuards(JwtAuthGuard)
export class SessionStatusController {
  constructor(private readonly sessionManager: SessionManagerService) {}

  /**
   * Get QR code for a session that is in QR_CODE status.
   */
  @Get(':id/qr')
  async getQr(@Param('id') id: string, @Req() req: Request) {
    try {
      const qr = await this.sessionManager.getQrCode(id, req.companyId!);
      return { data: { qr } };
    } catch (err: any) {
      // QR not ready yet — client should listen via WebSocket
      return { data: { qr: null, message: err.message } };
    }
  }

  /**
   * Get current status of a session.
   */
  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Req() req: Request) {
    const session = await this.sessionManager.getSession(id, req.companyId!);
    if (!session) {
      return { error: 'Session not found' };
    }
    return {
      data: {
        id: session.id,
        status: session.status,
        phoneNumber: session.phone_number,
        lastSeen: session.last_seen,
        createdAt: session.created_at,
      },
    };
  }
}
