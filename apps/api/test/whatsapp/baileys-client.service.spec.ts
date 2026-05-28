jest.mock('@whiskeysockets/baileys', () => ({
  fetchLatestBaileysVersion: jest.fn(),
  makeCacheableSignalKeyStore: jest.fn(),
  makeWASocket: jest.fn(),
}));

jest.mock('@cacheable/node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }));
});

import { Test, TestingModule } from '@nestjs/testing';
import { BaileysClientService } from '@/modules/whatsapp/services/baileys-client.service';
import { SessionRepository } from '@/modules/whatsapp/repositories/session.repository';
import { BaileysAuthService } from '@/modules/whatsapp/services/baileys-auth.service';
import { BaileysReconnectService } from '@/modules/whatsapp/services/baileys-reconnect.service';
import { QrService } from '@/modules/whatsapp/services/qr.service';
import { QrEventsService } from '@/modules/whatsapp/services/qr-events.service';
import {
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeWASocket,
} from '@whiskeysockets/baileys';
import { SessionStatus } from '@/modules/whatsapp/entities/session.entity';

describe('BaileysClientService', () => {
  let service: BaileysClientService;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let authService: jest.Mocked<BaileysAuthService>;
  let reconnectService: jest.Mocked<BaileysReconnectService>;
  let qrService: jest.Mocked<QrService>;
  let qrEvents: jest.Mocked<QrEventsService>;

  let processHandler: (events: Record<string, unknown>) => Promise<void>;
  const mockSocket = {
    ev: {
      process: jest.fn().mockImplementation((handler: any) => {
        processHandler = handler;
      }),
    },
    end: jest.fn(),
    user: { id: '5511999999999:0@s.whatsapp.net' },
  };

  const mockAuthState = {
    state: {
      creds: { signedIdentity: 'test' },
      keys: {} as any,
    },
    saveCreds: jest.fn(),
  };

  beforeEach(async () => {
    processHandler = undefined!;

    sessionRepo = {
      update: jest.fn(),
    } as any;

    authService = {
      getAuthState: jest.fn().mockResolvedValue(mockAuthState),
    } as any;

    reconnectService = {
      clearRetries: jest.fn(),
      onReconnectSuccess: jest.fn(),
      evaluateDisconnect: jest.fn(),
      scheduleReconnect: jest.fn(),
      onApplicationShutdown: jest.fn(),
    } as any;

    qrService = {
      generateQrDataUrl: jest.fn(),
    } as any;

    qrEvents = {
      emitQrGenerated: jest.fn(),
    } as any;

    (fetchLatestBaileysVersion as jest.Mock).mockResolvedValue({
      version: [2, 3000, 1],
    });
    (makeCacheableSignalKeyStore as jest.Mock).mockReturnValue({});
    (makeWASocket as jest.Mock).mockReturnValue(mockSocket);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BaileysClientService,
        { provide: SessionRepository, useValue: sessionRepo },
        { provide: BaileysAuthService, useValue: authService },
        { provide: BaileysReconnectService, useValue: reconnectService },
        { provide: QrService, useValue: qrService },
        { provide: QrEventsService, useValue: qrEvents },
      ],
    }).compile();

    service = module.get<BaileysClientService>(BaileysClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSocket', () => {
    it('should create a new Baileys socket and register handlers', async () => {
      const sock = await service.createSocket('session-1', 'company-1');

      expect(sock).toBe(mockSocket);
      expect(authService.getAuthState).toHaveBeenCalledWith('session-1');
      expect(fetchLatestBaileysVersion).toHaveBeenCalled();
      expect(makeWASocket).toHaveBeenCalledWith(
        expect.objectContaining({
          version: [2, 3000, 1],
          auth: { creds: mockAuthState.state.creds, keys: {} },
        }),
      );
      expect(sessionRepo.update).toHaveBeenCalledWith('session-1', {
        status: SessionStatus.CONNECTING,
      });
    });

    it('should end existing socket before creating new one', async () => {
      await service.createSocket('session-1', 'company-1');
      expect(reconnectService.clearRetries).toHaveBeenCalledWith('session-1');
    });

    it('should handle socket creation when auth fails', async () => {
      authService.getAuthState.mockRejectedValue(new Error('Auth error'));

      await expect(service.createSocket('session-1', 'company-1')).rejects.toThrow('Auth error');
    });
  });

  describe('getSocket', () => {
    it('should return undefined when no socket exists', () => {
      expect(service.getSocket('unknown')).toBeUndefined();
    });

    it('should return socket when it exists', async () => {
      await service.createSocket('session-1', 'company-1');

      expect(service.getSocket('session-1')).toBe(mockSocket);
    });
  });

  describe('hasActiveSocket', () => {
    it('should return false when no socket exists', () => {
      expect(service.hasActiveSocket('unknown')).toBe(false);
    });

    it('should return true when socket exists', async () => {
      await service.createSocket('session-1', 'company-1');

      expect(service.hasActiveSocket('session-1')).toBe(true);
    });
  });

  describe('getActiveCount', () => {
    it('should return 0 when no sockets', () => {
      expect(service.getActiveCount()).toBe(0);
    });

    it('should return correct count', async () => {
      await service.createSocket('session-1', 'company-1');

      expect(service.getActiveCount()).toBe(1);
    });
  });

  describe('event handlers', () => {
    async function createSocketAndClearManualDisconnect(sessionId: string, companyId: string) {
      await service.createSocket(sessionId, companyId);
      (service as any).manualDisconnect.delete(sessionId);
    }

    it('should handle QR code event on connection.update', async () => {
      qrService.generateQrDataUrl.mockResolvedValue('data:image/png;base64,qr');
      await createSocketAndClearManualDisconnect('session-1', 'company-1');

      await processHandler({
        'connection.update': {
          connection: 'connecting',
          qr: 'qr-string-data',
          lastDisconnect: undefined,
        },
      });

      expect(qrService.generateQrDataUrl).toHaveBeenCalledWith('qr-string-data');
      expect(qrEvents.emitQrGenerated).toHaveBeenCalledWith(
        'session-1', 'company-1', 'data:image/png;base64,qr',
      );
      expect(sessionRepo.update).toHaveBeenCalledWith('session-1', {
        status: SessionStatus.QR_CODE,
      });
    });

    it('should handle connection open event', async () => {
      await createSocketAndClearManualDisconnect('session-1', 'company-1');

      await processHandler({
        'connection.update': {
          connection: 'open',
          lastDisconnect: undefined,
          qr: undefined,
        },
      });

      expect(reconnectService.onReconnectSuccess).toHaveBeenCalledWith('session-1');
      expect(sessionRepo.update).toHaveBeenCalledWith('session-1', {
        status: SessionStatus.CONNECTED,
        phone_number: '5511999999999',
        last_seen: expect.any(Date),
      });
    });

    it('should handle connection close with manual disconnect', async () => {
      await service.createSocket('session-1', 'company-1');
      await service.endSocket('session-1');

      await processHandler({
        'connection.update': {
          connection: 'close',
          lastDisconnect: { error: undefined },
          qr: undefined,
        },
      });

      expect(sessionRepo.update).toHaveBeenCalledWith('session-1', {
        status: SessionStatus.DISCONNECTED,
        auth_state: null,
      });
      expect(service.hasActiveSocket('session-1')).toBe(false);
    });

    it('should handle connection close with reconnect', async () => {
      reconnectService.evaluateDisconnect.mockReturnValue({
        shouldReconnect: true,
        reason: 'Network issue',
      });
      await createSocketAndClearManualDisconnect('session-1', 'company-1');

      await processHandler({
        'connection.update': {
          connection: 'close',
          lastDisconnect: { error: undefined },
          qr: undefined,
        },
      });

      expect(sessionRepo.update).toHaveBeenCalledWith('session-1', {
        status: SessionStatus.CONNECTING,
      });
      expect(reconnectService.scheduleReconnect).toHaveBeenCalledWith(
        'session-1',
        expect.any(Function),
      );
    });

    it('should handle connection close with expired session', async () => {
      reconnectService.evaluateDisconnect.mockReturnValue({
        shouldReconnect: false,
        reason: 'max retries exceeded',
      });
      await createSocketAndClearManualDisconnect('session-1', 'company-1');

      await processHandler({
        'connection.update': {
          connection: 'close',
          lastDisconnect: { error: undefined },
          qr: undefined,
        },
      });

      expect(sessionRepo.update).toHaveBeenCalledWith('session-1', {
        status: SessionStatus.EXPIRED,
      });
      expect(service.hasActiveSocket('session-1')).toBe(false);
    });

    it('should handle creds.update event', async () => {
      await createSocketAndClearManualDisconnect('session-1', 'company-1');

      await processHandler({
        'creds.update': {},
      });

      expect(mockAuthState.saveCreds).toHaveBeenCalled();
    });

    it('should handle messages.upsert event', async () => {
      await createSocketAndClearManualDisconnect('session-1', 'company-1');

      await processHandler({
        'messages.upsert': {
          type: 'notify',
          messages: [
            { key: { id: 'msg-1', remoteJid: '5511999999999@s.whatsapp.net' } },
          ],
        },
      });
    });
  });

  describe('endSocket', () => {
    it('should end socket and clear retries', async () => {
      await service.createSocket('session-1', 'company-1');

      await service.endSocket('session-1');

      expect(reconnectService.clearRetries).toHaveBeenCalledWith('session-1');
      expect(mockSocket.end).toHaveBeenCalledWith(undefined);
      expect(service.hasActiveSocket('session-1')).toBe(false);
    });

    it('should handle endSocket when no socket exists', async () => {
      await service.endSocket('unknown');

      expect(reconnectService.clearRetries).toHaveBeenCalledWith('unknown');
    });

    it('should handle socket.end throwing an error', async () => {
      await service.createSocket('session-1', 'company-1');
      mockSocket.end.mockImplementation(() => { throw new Error('End error'); });

      await expect(service.endSocket('session-1')).resolves.toBeUndefined();
    });
  });

  describe('endAllSockets', () => {
    it('should end all active sockets', async () => {
      await service.createSocket('session-1', 'company-1');
      await service.createSocket('session-2', 'company-1');

      await service.endAllSockets();

      expect(service.getActiveCount()).toBe(0);
    });
  });

  describe('onApplicationShutdown', () => {
    it('should cleanup all resources', async () => {
      await service.createSocket('session-1', 'company-1');

      await service.onApplicationShutdown();

      expect(reconnectService.onApplicationShutdown).toHaveBeenCalled();
      expect(service.getActiveCount()).toBe(0);
    });
  });
});
