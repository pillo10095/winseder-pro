jest.mock('@whiskeysockets/baileys', () => ({
  fetchLatestBaileysVersion: jest.fn(),
  makeCacheableSignalKeyStore: jest.fn(),
  makeWASocket: jest.fn(),
}));

import { Test, type TestingModule } from '@nestjs/testing';
import { Request } from 'express';

import { SessionStatusController } from '@/modules/whatsapp/controllers/session-status.controller';
import { SessionManagerService } from '@/modules/whatsapp/services/session-manager.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

describe('SessionStatusController', () => {
  let controller: SessionStatusController;
  let sessionManager: SessionManagerService;

  const mockSessionManager = {
    getQrCode: jest.fn(),
    getSession: jest.fn(),
  };

  function mockRequest(): Request {
    return { companyId: 'company-1' } as Request;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionStatusController],
      providers: [
        { provide: SessionManagerService, useValue: mockSessionManager },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<SessionStatusController>(SessionStatusController);
    sessionManager = module.get<SessionManagerService>(SessionManagerService);

    jest.clearAllMocks();
  });

  describe('GET /whatsapp/sessions/:id/qr', () => {
    it('should return QR code', async () => {
      mockSessionManager.getQrCode.mockResolvedValue('data:image/png;base64,qr-data');

      const result = await controller.getQr('session-1', mockRequest());

      expect(sessionManager.getQrCode).toHaveBeenCalledWith('session-1', 'company-1');
      expect(result).toEqual({ data: { qr: 'data:image/png;base64,qr-data' } });
    });

    it('should return null QR with message when QR not ready', async () => {
      mockSessionManager.getQrCode.mockRejectedValue(new Error('QR code not yet generated'));

      const result = await controller.getQr('session-1', mockRequest());

      expect(result).toEqual({ data: { qr: null, message: 'QR code not yet generated' } });
    });

    it('should handle non-Error rejection gracefully', async () => {
      mockSessionManager.getQrCode.mockRejectedValue('string error');

      const result = await controller.getQr('session-1', mockRequest());

      expect(result).toEqual({ data: { qr: null, message: 'QR not available' } });
    });
  });

  describe('GET /whatsapp/sessions/:id/status', () => {
    it('should return session status', async () => {
      const session = {
        id: 'session-1',
        status: 'CONNECTED',
        phone_number: '5511999999999',
        last_seen: new Date('2026-05-28T10:00:00Z'),
        created_at: new Date('2026-05-27T10:00:00Z'),
      };
      mockSessionManager.getSession.mockResolvedValue(session);

      const result = await controller.getStatus('session-1', mockRequest());

      expect(sessionManager.getSession).toHaveBeenCalledWith('session-1', 'company-1');
      expect(result).toEqual({
        data: {
          id: 'session-1',
          status: 'CONNECTED',
          phoneNumber: '5511999999999',
          lastSeen: new Date('2026-05-28T10:00:00Z'),
          createdAt: new Date('2026-05-27T10:00:00Z'),
        },
      });
    });

    it('should return error when session not found', async () => {
      mockSessionManager.getSession.mockResolvedValue(null);

      const result = await controller.getStatus('session-404', mockRequest());

      expect(result).toEqual({ error: 'Session not found' });
    });
  });
});
