import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { SessionManagerService } from '../services/session-manager.service';

@Controller('whatsapp/sessions')
@UseGuards(JwtAuthGuard)
export class SessionStatusController {
  constructor(private readonly sessionManager: SessionManagerService) {}

  /**
   * Get QR code for a session that is in QR_CODE status.
   */
  @Get(':id/qr')
  async getQr(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ) {
    try {
      const qr = await this.sessionManager.getQrCode(id, companyId);
      return { data: { qr } };
    } catch (err: unknown) {
      // QR not ready yet — client should listen via WebSocket
      const message = err instanceof Error ? err.message : 'QR not available';
      return { data: { qr: null, message } };
    }
  }

  /**
   * Get current status of a session.
   */
  @Get(':id/status')
  async getStatus(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ) {
    const session = await this.sessionManager.getSession(id, companyId);
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
