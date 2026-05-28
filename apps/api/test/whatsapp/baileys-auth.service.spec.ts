jest.mock('@whiskeysockets/baileys', () => ({
  BufferJSON: {
    reviver: (_key: string, value: unknown) => value,
    replacer: (_key: string, value: unknown) => value,
  },
  initAuthCreds: jest.fn(() => ({
    signedIdentity: Buffer.from('test'),
    registrationId: 1,
  })),
  SignalDataTypeMap: {},
  AuthenticationCreds: {},
  AuthenticationState: {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BaileysAuthService } from '@/modules/whatsapp/services/baileys-auth.service';
import { SessionRepository } from '@/modules/whatsapp/repositories/session.repository';

describe('BaileysAuthService', () => {
  let service: BaileysAuthService;
  let sessionRepo: jest.Mocked<SessionRepository>;

  const mockSession = {
    id: 'session-1',
    company_id: 'company-1',
    session_name: 'Test Session',
    auth_state: JSON.stringify({
      creds: { signedIdentity: 'base64test' },
      keys: { 'sender-key': { '123@s.whatsapp.net': { id: 'key1' } } },
    }),
    status: 'DISCONNECTED',
    phone_number: null,
    last_seen: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    sessionRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BaileysAuthService,
        { provide: SessionRepository, useValue: sessionRepo },
      ],
    }).compile();

    service = module.get<BaileysAuthService>(BaileysAuthService);
  });

  describe('getAuthState', () => {
    it('should return auth state from existing session data', async () => {
      sessionRepo.findOne.mockResolvedValue(mockSession as any);

      const result = await service.getAuthState('session-1');

      expect(result.state.creds).toBeDefined();
      expect(result.state.creds.signedIdentity).toBe('base64test');
      expect(result.state.keys).toBeDefined();
      expect(typeof result.state.keys.get).toBe('function');
      expect(typeof result.state.keys.set).toBe('function');
      expect(typeof result.state.keys.clear).toBe('function');
    });

    it('should initialize new creds when session has no auth_state', async () => {
      sessionRepo.findOne.mockResolvedValue({ ...mockSession, auth_state: null } as any);

      const result = await service.getAuthState('session-1');

      expect(result.state.creds).toEqual({
        signedIdentity: Buffer.from('test'),
        registrationId: 1,
      });
    });

    it('should initialize new creds when session is not found', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      const result = await service.getAuthState('session-1');

      expect(result.state.creds).toEqual({
        signedIdentity: Buffer.from('test'),
        registrationId: 1,
      });
    });

    it('should re-initialize creds when auth_state JSON is invalid', async () => {
      sessionRepo.findOne.mockResolvedValue({ ...mockSession, auth_state: '{invalid' } as any);

      const result = await service.getAuthState('session-1');

      expect(result.state.creds).toEqual({
        signedIdentity: Buffer.from('test'),
        registrationId: 1,
      });
    });

    it('should save creds via saveCreds', async () => {
      sessionRepo.findOne.mockResolvedValue(null);
      const { saveCreds } = await service.getAuthState('session-1');

      await saveCreds();

      expect(sessionRepo.update).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({ auth_state: expect.any(String) }),
      );
    });

    it('should handle saveCreds error gracefully', async () => {
      sessionRepo.findOne.mockResolvedValue(null);
      sessionRepo.update.mockRejectedValue(new Error('DB error'));
      const { saveCreds } = await service.getAuthState('session-1');

      await expect(saveCreds()).resolves.toBeUndefined();
    });

    it('keys.get should return matching entries', async () => {
      sessionRepo.findOne.mockResolvedValue(mockSession as any);
      const { state } = await service.getAuthState('session-1');

      const result = await state.keys.get(
        'sender-key' as any,
        ['123@s.whatsapp.net', 'nonexistent'],
      );

      expect(result).toEqual({ '123@s.whatsapp.net': { id: 'key1' } });
    });

    it('keys.get should return empty for unknown type', async () => {
      sessionRepo.findOne.mockResolvedValue(mockSession as any);
      const { state } = await service.getAuthState('session-1');

      const result = await state.keys.get('unknown-type' as any, ['test-id']);

      expect(result).toEqual({});
    });

    it('keys.set should merge data and call saveCreds', async () => {
      sessionRepo.findOne.mockResolvedValue(null);
      sessionRepo.update.mockResolvedValue(undefined);
      const { state } = await service.getAuthState('session-1');

      await state.keys.set({ 'pre-key': { 'key-1': { id: 'pk1' } } } as any);

      expect(sessionRepo.update).toHaveBeenCalled();
    });

    it('keys.clear should clear keys and call saveCreds', async () => {
      sessionRepo.findOne.mockResolvedValue(null);
      sessionRepo.update.mockResolvedValue(undefined);
      const { state } = await service.getAuthState('session-1');

      await state.keys.clear();

      expect(sessionRepo.update).toHaveBeenCalled();
    });
  });
});
