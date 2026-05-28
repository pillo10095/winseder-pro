jest.mock('@whiskeysockets/baileys', () => ({
  fetchLatestBaileysVersion: jest.fn(),
  makeCacheableSignalKeyStore: jest.fn(),
  makeWASocket: jest.fn(),
}));

import { Test, type TestingModule } from '@nestjs/testing';
import { Request } from 'express';

import { SessionController } from '@/modules/whatsapp/controllers/session.controller';
import { SessionManagerService } from '@/modules/whatsapp/services/session-manager.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

describe('SessionController', () => {
  let controller: SessionController;
  let sessionManager: SessionManagerService;

  const mockSessionManager = {
    createSession: jest.fn(),
    getSessions: jest.fn(),
    getSession: jest.fn(),
    disconnectSession: jest.fn(),
    checkHealth: jest.fn(),
  };

  function mockRequest(overrides: Partial<Request> = {}): Request {
    return { companyId: 'company-1', ...overrides } as Request;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        { provide: SessionManagerService, useValue: mockSessionManager },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<SessionController>(SessionController);
    sessionManager = module.get<SessionManagerService>(SessionManagerService);

    jest.clearAllMocks();
  });

  describe('POST /whatsapp/sessions', () => {
    it('should create a new session', async () => {
      const session = { id: 'session-1', session_name: 'Test Session', status: 'CONNECTING' };
      mockSessionManager.createSession.mockResolvedValue(session);

      const result = await controller.create({ session_name: 'Test Session' }, mockRequest());

      expect(sessionManager.createSession).toHaveBeenCalledWith('company-1', 'Test Session');
      expect(result).toEqual({ data: session });
    });
  });

  describe('GET /whatsapp/sessions', () => {
    it('should list sessions for company', async () => {
      const sessions = [
        { id: 'session-1', session_name: 'WS-1', status: 'CONNECTED' },
        { id: 'session-2', session_name: 'WS-2', status: 'DISCONNECTED' },
      ];
      mockSessionManager.getSessions.mockResolvedValue(sessions);

      const result = await controller.list(mockRequest());

      expect(sessionManager.getSessions).toHaveBeenCalledWith('company-1');
      expect(result).toEqual({ data: sessions });
    });

    it('should return empty array when no sessions', async () => {
      mockSessionManager.getSessions.mockResolvedValue([]);

      const result = await controller.list(mockRequest());

      expect(result).toEqual({ data: [] });
    });
  });

  describe('GET /whatsapp/sessions/:id', () => {
    it('should return a session', async () => {
      const session = { id: 'session-1', session_name: 'WS-1', status: 'CONNECTED' };
      mockSessionManager.getSession.mockResolvedValue(session);

      const result = await controller.get('session-1', mockRequest());

      expect(sessionManager.getSession).toHaveBeenCalledWith('session-1', 'company-1');
      expect(result).toEqual({ data: session });
    });

    it('should return error when session not found', async () => {
      mockSessionManager.getSession.mockResolvedValue(null);

      const result = await controller.get('session-404', mockRequest());

      expect(result).toEqual({ error: 'Session not found' });
    });
  });

  describe('DELETE /whatsapp/sessions/:id', () => {
    it('should disconnect a session', async () => {
      mockSessionManager.disconnectSession.mockResolvedValue(undefined);

      const result = await controller.disconnect('session-1', mockRequest());

      expect(sessionManager.disconnectSession).toHaveBeenCalledWith('session-1', 'company-1');
      expect(result).toEqual({ data: { message: 'Session disconnected' } });
    });
  });

  describe('GET /whatsapp/sessions/:id/health', () => {
    it('should return session health', async () => {
      const health = { ok: true, status: 'CONNECTED', lastSeen: new Date('2026-05-28') };
      mockSessionManager.checkHealth.mockResolvedValue(health);

      const result = await controller.health('session-1');

      expect(sessionManager.checkHealth).toHaveBeenCalledWith('session-1');
      expect(result).toEqual({ data: health });
    });
  });
});
