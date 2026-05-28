jest.mock('@whiskeysockets/baileys', () => ({}));

import { Test, type TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { SessionStatusController } from '@/modules/whatsapp/controllers/session-status.controller';
import { SessionManagerService } from '@/modules/whatsapp/services/session-manager.service';
import { BaileysClientService } from '@/modules/whatsapp/services/baileys-client.service';
import { QrEventsService } from '@/modules/whatsapp/services/qr-events.service';
import { QrService } from '@/modules/whatsapp/services/qr.service';
import { MessageHandlerService } from '@/modules/whatsapp/services/message-handler.service';
import { MessageRelayService } from '@/modules/whatsapp/services/message-relay.service';
import { SessionRepository } from '@/modules/whatsapp/repositories/session.repository';
import { WhatsAppGateway } from '@/modules/whatsapp/gateways/whatsapp.gateway';
import { Session, SessionStatus } from '@/modules/whatsapp/entities/session.entity';
import { Message } from '@/modules/whatsapp/entities/message.entity';
import { Conversation } from '@/modules/whatsapp/entities/conversation.entity';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

describe('WhatsApp E2E', () => {
  let statusController: SessionStatusController;
  let sessionManager: SessionManagerService;

  const mockSession: Partial<Session> = {
    id: 'session-1',
    company_id: 'company-1',
    session_name: 'WhatsApp Test',
    status: SessionStatus.CONNECTED,
    phone_number: '521234567890',
    last_seen: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSessionRepo = {
    findActiveByCompanyId: jest.fn(),
    findByCompanyId: jest.fn(),
    findByIdAndCompany: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...mockSession, ...data })),
    save: jest.fn().mockImplementation((data) => Promise.resolve({ ...mockSession, ...data })),
    update: jest.fn().mockResolvedValue(undefined),
  };

  const mockBaileysClient = {
    createSocket: jest.fn().mockResolvedValue(undefined),
    endSocket: jest.fn(),
    hasActiveSocket: jest.fn().mockReturnValue(true),
  };

  const mockWhatsAppGateway = {
    emitQrGenerated: jest.fn(),
    emitSessionStatus: jest.fn(),
    emitMessageNew: jest.fn(),
    emitMessageStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      controllers: [SessionStatusController],
      providers: [
        SessionManagerService,
        { provide: SessionRepository, useValue: mockSessionRepo },
        { provide: BaileysClientService, useValue: mockBaileysClient },
        { provide: QrEventsService, useValue: {} },
        { provide: QrService, useValue: {} },
        { provide: MessageHandlerService, useValue: {} },
        { provide: MessageRelayService, useValue: {} },
        { provide: WhatsAppGateway, useValue: mockWhatsAppGateway },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    statusController = module.get<SessionStatusController>(SessionStatusController);
    sessionManager = module.get<SessionManagerService>(SessionManagerService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Session Manager', () => {
    it('should create a session', async () => {
      mockSessionRepo.findActiveByCompanyId.mockResolvedValue(null);

      const session = await sessionManager.createSession('company-1', 'Test Session');

      expect(session).toBeDefined();
      expect(session.session_name).toBe('Test Session');
      expect(mockBaileysClient.createSocket).toHaveBeenCalledWith(session.id, 'company-1');
    });

    it('should throw when creating duplicate active session', async () => {
      mockSessionRepo.findActiveByCompanyId.mockResolvedValue(mockSession);

      await expect(
        sessionManager.createSession('company-1', 'Another'),
      ).rejects.toThrow('already has an active WhatsApp session');
    });

    it('should get sessions by company', async () => {
      mockSessionRepo.findByCompanyId.mockResolvedValue([mockSession]);

      const sessions = await sessionManager.getSessions('company-1');

      expect(sessions).toHaveLength(1);
      expect(mockSessionRepo.findByCompanyId).toHaveBeenCalledWith('company-1');
    });

    it('should get session by id', async () => {
      mockSessionRepo.findByIdAndCompany.mockResolvedValue(mockSession);

      const session = await sessionManager.getSession('session-1', 'company-1');

      expect(session).toBeDefined();
      expect(session!.id).toBe('session-1');
    });

    it('should return null for unknown session', async () => {
      mockSessionRepo.findByIdAndCompany.mockResolvedValue(null);

      const session = await sessionManager.getSession('unknown', 'company-1');

      expect(session).toBeNull();
    });
  });

  describe('Session Status', () => {
    it('should return session status', async () => {
      mockSessionRepo.findByIdAndCompany.mockResolvedValue(mockSession);

      const req = { companyId: 'company-1' } as any;
      const result = await statusController.getStatus('session-1', req);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('status', SessionStatus.CONNECTED);
    });

    it('should return error for missing session', async () => {
      mockSessionRepo.findByIdAndCompany.mockResolvedValue(null);

      const req = { companyId: 'company-1' } as any;
      const result = await statusController.getStatus('unknown', req);

      expect(result).toHaveProperty('error');
    });
  });
});
