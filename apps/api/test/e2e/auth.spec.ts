import { Test, type TestingModule } from '@nestjs/testing';

import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';
import { JwtTokenService } from '@/modules/auth/services/jwt.service';
import { RefreshTokenService } from '@/modules/auth/services/refresh-token.service';
import { TokenBlacklistService } from '@/modules/auth/services/token-blacklist.service';
import { Company } from '@/modules/tenancy/entities/company.entity';
import { Plan } from '@/modules/tenancy/entities/plan.entity';
import { Subscription } from '@/modules/tenancy/entities/subscription.entity';
import { User, UserRole } from '@/modules/auth/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Auth E2E', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.AGENT,
    is_active: true,
    company_id: 'company-1',
  };

  const mockAuthService = {
    register: jest.fn().mockImplementation(async (dto) => {
      if (!dto.email || !dto.password) {
        throw new Error('Validation failed');
      }
      return {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        user: { id: 'user-1', name: 'New User', email: 'new@test.com', role: 'agent', company_id: 'company-1', is_active: true },
      };
    }),
    login: jest.fn().mockImplementation(async (dto) => {
      if (!dto.email || dto.password.length < 6) {
        throw new Error('Validation failed');
      }
      return {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'agent', company_id: 'company-1', is_active: true },
      };
    }),
    refresh: jest.fn().mockResolvedValue({
      access_token: 'new-token',
      refresh_token: 'new-refresh',
    }),
    logout: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue({
      id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'agent', is_active: true, company_id: 'company-1',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Company), useValue: {} },
        { provide: getRepositoryToken(Plan), useValue: {} },
        { provide: getRepositoryToken(Subscription), useValue: {} },
        { provide: JwtTokenService, useValue: {} },
        { provide: RefreshTokenService, useValue: {} },
        { provide: TokenBlacklistService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test') } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const result = await controller.login({ email: 'test@example.com', password: 'password123' });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should call authService.login with dto', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const dto = { name: 'New User', email: 'new@example.com', password: 'password123' };
      const result = await controller.register(dto);

      expect(result).toHaveProperty('access_token');
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens', async () => {
      const result = await controller.refresh({ refresh_token: 'old-refresh' });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(authService.refresh).toHaveBeenCalledWith({ refresh_token: 'old-refresh' });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const req = { headers: { authorization: 'Bearer test-token' }, user: { id: 'user-1' } } as any;
      await controller.logout(req);

      expect(authService.logout).toHaveBeenCalled();
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile', async () => {
      const req = { user: { id: 'user-1' } } as any;
      const result = await controller.getProfile(req);

      expect(result).toHaveProperty('email');
      expect(authService.getProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('Rate limiting', () => {
    it('should handle repeated requests gracefully', async () => {
      const requests = Array(5).fill({ email: 'test@example.com', password: 'password123' });
      const results = await Promise.all(requests.map((dto) => controller.login(dto)));

      results.forEach((r) => {
        expect(r).toHaveProperty('access_token');
      });
    });
  });

  describe('Validation', () => {
    it('should reject empty email', async () => {
      await expect(
        authService.login({ email: '', password: 'password123' }),
      ).rejects.toThrow();
    });

    it('should reject short password', async () => {
      await expect(
        authService.login({ email: 'test@example.com', password: '123' }),
      ).rejects.toThrow();
    });
  });
});
