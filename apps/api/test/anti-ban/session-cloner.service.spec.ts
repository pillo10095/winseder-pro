import { Test, TestingModule } from '@nestjs/testing';

import { Session, SessionStatus } from '@/modules/whatsapp/entities/session.entity';
import { SessionRepository } from '@/modules/whatsapp/repositories/session.repository';
import { SessionClonerService } from '@/modules/anti-ban/services/session-cloner.service';

describe('SessionClonerService', () => {
  let service: SessionClonerService;
  let sessionRepository: jest.Mocked<SessionRepository>;

  const mockSession = {
    id: 'session-1',
    company_id: 'company-1',
    session_name: 'Main Session',
    status: SessionStatus.CONNECTED,
    phone_number: '+521234567890',
    auth_state: '{"key":"value"}',
    last_seen: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  } as Session;

  beforeEach(async () => {
    const mockRepo = {
      findByIdAndCompany: jest.fn(),
      findByCompanyId: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionClonerService,
        { provide: SessionRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SessionClonerService>(SessionClonerService);
    sessionRepository = module.get(SessionRepository);
  });

  describe('exportAuthState', () => {
    it('should export auth state for a valid session', async () => {
      sessionRepository.findByIdAndCompany.mockResolvedValue(mockSession);

      const result = await service.exportAuthState('session-1', 'company-1');
      expect(result).toBe('{"key":"value"}');
      expect(sessionRepository.findByIdAndCompany).toHaveBeenCalledWith('session-1', 'company-1');
    });

    it('should throw if session not found', async () => {
      sessionRepository.findByIdAndCompany.mockResolvedValue(null);

      await expect(service.exportAuthState('session-1', 'company-1')).rejects.toThrow('Session not found');
    });

    it('should throw if session has no auth state', async () => {
      sessionRepository.findByIdAndCompany.mockResolvedValue({ ...mockSession, auth_state: null } as unknown as Session);

      await expect(service.exportAuthState('session-1', 'company-1')).rejects.toThrow('Session has no auth state to export');
    });
  });

  describe('importAuthState', () => {
    it('should import valid auth state', async () => {
      sessionRepository.findByIdAndCompany.mockResolvedValue(mockSession);
      sessionRepository.update.mockResolvedValue(undefined);

      await service.importAuthState('session-1', 'company-1', '{"new":"auth"}');
      expect(sessionRepository.update).toHaveBeenCalledWith('session-1', {
        auth_state: '{"new":"auth"}',
        status: SessionStatus.DISCONNECTED,
      });
    });

    it('should throw if session not found', async () => {
      sessionRepository.findByIdAndCompany.mockResolvedValue(null);

      await expect(service.importAuthState('session-1', 'company-1', '{}')).rejects.toThrow('Session not found');
    });

    it('should throw if auth state is not valid JSON', async () => {
      sessionRepository.findByIdAndCompany.mockResolvedValue(mockSession);

      await expect(service.importAuthState('session-1', 'company-1', 'not-json')).rejects.toThrow('Auth state must be valid JSON');
    });

    it('should throw if parsed auth state is not an object', async () => {
      sessionRepository.findByIdAndCompany.mockResolvedValue(mockSession);

      await expect(service.importAuthState('session-1', 'company-1', '"string"')).rejects.toThrow('Auth state must be valid JSON');
    });

    it('should throw if parsed auth state is null', async () => {
      sessionRepository.findByIdAndCompany.mockResolvedValue(mockSession);

      await expect(service.importAuthState('session-1', 'company-1', 'null')).rejects.toThrow('Auth state must be valid JSON');
    });
  });

  describe('cloneSession', () => {
    it('should clone a session with auth state', async () => {
      const clonedSession = {
        id: 'session-2',
        company_id: 'company-1',
        session_name: 'Main Session (Clone)',
        status: SessionStatus.DISCONNECTED,
        auth_state: '{"key":"value"}',
        phone_number: '+521234567890',
      } as Session;

      sessionRepository.findByIdAndCompany.mockResolvedValue(mockSession);
      sessionRepository.create.mockReturnValue(clonedSession);
      sessionRepository.save.mockResolvedValue(clonedSession);

      const result = await service.cloneSession('session-1', 'company-1');
      expect(result.id).toBe('session-2');
      expect(result.session_name).toBe('Main Session (Clone)');
      expect(result.status).toBe(SessionStatus.DISCONNECTED);
      expect(result.auth_state).toBe('{"key":"value"}');
    });

    it('should use custom name when provided', async () => {
      const clonedSession = {
        id: 'session-2',
        session_name: 'Custom Name',
      } as Session;

      sessionRepository.findByIdAndCompany.mockResolvedValue(mockSession);
      sessionRepository.create.mockReturnValue(clonedSession);
      sessionRepository.save.mockResolvedValue(clonedSession);

      const result = await service.cloneSession('session-1', 'company-1', 'Custom Name');
      expect(result.session_name).toBe('Custom Name');
    });

    it('should throw if source session not found', async () => {
      sessionRepository.findByIdAndCompany.mockResolvedValue(null);

      await expect(service.cloneSession('session-1', 'company-1')).rejects.toThrow('Source session not found');
    });

    it('should throw if source session has no auth state', async () => {
      sessionRepository.findByIdAndCompany.mockResolvedValue({ ...mockSession, auth_state: null } as unknown as Session);

      await expect(service.cloneSession('session-1', 'company-1')).rejects.toThrow('Source session has no auth state to clone');
    });
  });

  describe('getCloneableSessions', () => {
    it('should return sessions with auth state', async () => {
      const sessions = [
        { ...mockSession, id: 's1', auth_state: '{}' } as Session,
        { ...mockSession, id: 's2', auth_state: null } as unknown as Session,
        { ...mockSession, id: 's3', auth_state: '{}' } as Session,
      ];
      sessionRepository.findByCompanyId.mockResolvedValue(sessions);

      const result = await service.getCloneableSessions('company-1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('s1');
      expect(result[1].id).toBe('s3');
    });
  });
});
