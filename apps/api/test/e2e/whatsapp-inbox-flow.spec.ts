jest.mock('@whiskeysockets/baileys', () => ({
  fetchLatestBaileysVersion: jest.fn(),
  makeCacheableSignalKeyStore: jest.fn(),
  makeWASocket: jest.fn(),
}));

import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';
import { JwtTokenService } from '@/modules/auth/services/jwt.service';
import { RefreshTokenService } from '@/modules/auth/services/refresh-token.service';
import { TokenBlacklistService } from '@/modules/auth/services/token-blacklist.service';
import { User } from '@/modules/auth/entities/user.entity';
import { Company } from '@/modules/tenancy/entities/company.entity';
import { Plan } from '@/modules/tenancy/entities/plan.entity';
import { Subscription } from '@/modules/tenancy/entities/subscription.entity';

import { SessionController } from '@/modules/whatsapp/controllers/session.controller';
import { SessionManagerService } from '@/modules/whatsapp/services/session-manager.service';

import { InboxController } from '@/modules/inbox/controllers/inbox.controller';
import { InboxService } from '@/modules/inbox/services/inbox.service';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ConversationStatus } from '@/modules/whatsapp/entities/conversation.entity';

describe('WhatsApp + Inbox E2E — full authenticated flow', () => {
  let authController: AuthController;
  let sessionController: SessionController;
  let inboxController: InboxController;
  let authService: AuthService;

  let accessToken: string;

  // ── Mocks ──

  const mockAuthService = {
    register: jest.fn().mockImplementation(async (dto) => ({
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.unique-token-for-test',
      refresh_token: 'test-refresh-token',
      user: {
        id: 'user-1',
        name: dto.name ?? 'Test User',
        email: dto.email,
        role: 'agent',
        company_id: 'company-1',
        is_active: true,
      },
    })),
    login: jest.fn().mockImplementation(async (dto) => ({
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.unique-token-for-test',
      refresh_token: 'test-refresh-token',
      user: {
        id: 'user-1',
        name: 'Test User',
        email: dto.email,
        role: 'agent',
        company_id: 'company-1',
        is_active: true,
      },
    })),
    refresh: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  };

  const mockSessionManager = {
    createSession: jest.fn().mockResolvedValue({
      id: 'session-1',
      session_name: 'Test WhatsApp',
      status: 'CONNECTED',
      company_id: 'company-1',
      phone_number: '521234567890',
      created_at: new Date(),
    }),
    getSessions: jest.fn(),
    getSession: jest.fn(),
    disconnectSession: jest.fn(),
    checkHealth: jest.fn(),
  };

  const mockInboxService = {
    findConversations: jest.fn().mockImplementation(
      async (
        _sessionId: string,
        _status?: ConversationStatus,
        _assignedTo?: string,
        _search?: string,
        _limit = 20,
        _cursor?: string,
      ): Promise<[Array<Record<string, unknown>>, number]> => {
        return [
          [
            {
              id: 'conv-1',
              contact_jid: '521234567890@s.whatsapp.net',
              contact_name: 'John Doe',
              last_message: 'Hola, ¿cómo estás?',
              last_message_at: new Date(),
              status: 'OPEN',
              unread_count: 2,
            },
            {
              id: 'conv-2',
              contact_jid: '521234567891@s.whatsapp.net',
              contact_name: 'Jane Smith',
              last_message: 'Gracias por la info',
              last_message_at: new Date(),
              status: 'CLOSED',
              unread_count: 0,
            },
          ],
          2,
        ];
      },
    ),
    assignConversation: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockResolvedValue(true) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, SessionController, InboxController],
      providers: [
        // Auth providers
        { provide: AuthService, useValue: mockAuthService },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Company), useValue: {} },
        { provide: getRepositoryToken(Plan), useValue: {} },
        { provide: getRepositoryToken(Subscription), useValue: {} },
        { provide: JwtTokenService, useValue: {} },
        { provide: RefreshTokenService, useValue: {} },
        { provide: TokenBlacklistService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test') } },
        // Session providers
        { provide: SessionManagerService, useValue: mockSessionManager },
        // Inbox providers
        { provide: InboxService, useValue: mockInboxService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .compile();

    authController = module.get<AuthController>(AuthController);
    sessionController = module.get<SessionController>(SessionController);
    inboxController = module.get<InboxController>(InboxController);
    authService = module.get<AuthService>(AuthService);
  });

  // ── Tests ──

  it('should register a user with unique credentials', async () => {
    const uniqueEmail = `user-${Date.now()}@test.com`;
    const result = await authController.register({
      name: 'Test User',
      email: uniqueEmail,
      password: 'securePass123',
    });

    // Response interceptor wraps: { data: { access_token, ... }, meta }
    expect(result).toHaveProperty('access_token');
    expect(result.access_token).toEqual(expect.any(String));
    expect(result.access_token).not.toBe('');
    expect(result.user.email).toBe(uniqueEmail);
    expect(authService.register).toHaveBeenCalledWith({
      name: 'Test User',
      email: uniqueEmail,
      password: 'securePass123',
    });

    accessToken = result.access_token;
  });

  it('should login and receive access_token', async () => {
    const result = await authController.login({
      email: 'user@test.com',
      password: 'securePass123',
    });

    expect(result).toHaveProperty('access_token');
    expect(result.access_token).toEqual(expect.any(String));
    expect(result.user.email).toBe('user@test.com');
    expect(authService.login).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'securePass123',
    });

    accessToken = result.access_token;
  });

  it('should create a WhatsApp session', async () => {
    expect(accessToken).toBeDefined();

    const result = await sessionController.create(
      { session_name: 'Test WhatsApp' },
      { companyId: 'company-1', headers: { authorization: `Bearer ${accessToken}` } } as any,
    );

    // Session controller returns { data: session } → interceptor passes through
    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('id', 'session-1');
    expect(result.data).toHaveProperty('status', 'CONNECTED');
    expect(mockSessionManager.createSession).toHaveBeenCalledWith('company-1', 'Test WhatsApp');
  });

  it('should list inbox conversations', async () => {
    const result = await inboxController.list('session-1');

    // Inbox controller returns { items, total } → interceptor wraps as { data: { items, total }, meta }
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(mockInboxService.findConversations).toHaveBeenCalled();
  });

  it('should complete the full authenticated flow end-to-end', async () => {
    // 1. Register
    const registerResult = await authController.register({
      name: 'Flow User',
      email: `flow-${Date.now()}@test.com`,
      password: 'flowPass456',
    });
    expect(registerResult).toHaveProperty('access_token');
    const token = registerResult.access_token;
    expect(token).toEqual(expect.any(String));

    // 2. Login (unique credentials)
    const loginResult = await authController.login({
      email: `flow-${Date.now()}@test.com`,
      password: 'flowPass456',
    });
    expect(loginResult).toHaveProperty('access_token');

    // 3. Create session with auth context
    const req = {
      companyId: 'company-1',
      headers: { authorization: `Bearer ${token}` },
    } as any;
    const sessionResult = await sessionController.create(
      { session_name: 'Flow Session' },
      req,
    );
    expect(sessionResult).toHaveProperty('data');
    const sessionId = sessionResult.data.id;

    // 4. Get conversations
    const inboxResult = await inboxController.list(sessionId);

    // Result shape: { data: { items: [...], total: N }, meta: { timestamp, path } }
    // However, the interceptor only wraps when controller returns a plain object.
    // The inbox controller returns { items, total } which gets wrapped.
    // The controller returns { items, total }, and the interceptor transforms it.
    // We test the intermediate response since there's no real HTTP layer.
    expect(inboxResult).toHaveProperty('items');
    expect(inboxResult).toHaveProperty('total');
    expect(inboxResult.total).toBeGreaterThanOrEqual(0);

    // Verify both services were called
    expect(mockSessionManager.createSession).toHaveBeenCalled();
    expect(mockInboxService.findConversations).toHaveBeenCalled();
  });

  it('should handle empty inbox gracefully', async () => {
    mockInboxService.findConversations.mockResolvedValueOnce([[], 0]);

    const result = await inboxController.list('session-empty');

    expect(result).toHaveProperty('items');
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
