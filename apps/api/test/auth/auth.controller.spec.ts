import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';
import { JwtTokenService } from '@/modules/auth/services/jwt.service';
import { RefreshTokenService } from '@/modules/auth/services/refresh-token.service';
import { TokenBlacklistService } from '@/modules/auth/services/token-blacklist.service';
import { Company } from '@/modules/tenancy/entities/company.entity';
import { Plan } from '@/modules/tenancy/entities/plan.entity';
import { Subscription } from '@/modules/tenancy/entities/subscription.entity';
import { User } from '@/modules/auth/entities/user.entity';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Company),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Plan),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: {},
        },
        {
          provide: JwtTokenService,
          useValue: {},
        },
        {
          provide: RefreshTokenService,
          useValue: {},
        },
        {
          provide: TokenBlacklistService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should call authService.login with the dto', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const expected = {
        access_token: 'token',
        refresh_token: 'refresh',
        user: { id: '1', name: 'Test', email: 'test@example.com', role: 'agent' },
      };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /auth/register', () => {
    it('should call authService.register with the dto', async () => {
      const dto = { name: 'Test User', email: 'test@example.com', password: 'password123' };
      const expected = {
        access_token: 'token',
        refresh_token: 'refresh',
        user: { id: '1', name: 'Test', email: 'test@example.com', role: 'agent' },
      };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should call authService.refresh with the dto', async () => {
      const dto = { refresh_token: 'some-refresh-token' };
      const expected = { access_token: 'new-access', refresh_token: 'new-refresh' };
      mockAuthService.refresh.mockResolvedValue(expected);

      const result = await controller.refresh(dto);

      expect(authService.refresh).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /auth/logout', () => {
    it('should call authService.logout with the token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer some-jwt-token',
        },
      } as any;
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(req);

      expect(authService.logout).toHaveBeenCalledWith('some-jwt-token');
      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
    });

    it('should handle missing Authorization header gracefully', async () => {
      const req = { headers: {} } as any;
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(req);

      expect(authService.logout).toHaveBeenCalledWith('');
      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
    });
  });

  describe('GET /auth/me', () => {
    it('should call authService.getProfile with the user id', async () => {
      const req = {
        user: { id: 'user-1', email: 'test@example.com', role: 'agent', companyId: 'company-1' },
      } as any;
      const expected = { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'agent' };
      mockAuthService.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile(req);

      expect(authService.getProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });
});
