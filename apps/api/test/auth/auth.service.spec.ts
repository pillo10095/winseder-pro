import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, type TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';

import { AuthService, hashPassword } from '@/modules/auth/auth.service';
import { User, UserRole } from '@/modules/auth/entities/user.entity';
import { JwtTokenService } from '@/modules/auth/services/jwt.service';
import { RefreshTokenService } from '@/modules/auth/services/refresh-token.service';
import { TokenBlacklistService } from '@/modules/auth/services/token-blacklist.service';
import { Company } from '@/modules/tenancy/entities/company.entity';
import { Plan } from '@/modules/tenancy/entities/plan.entity';
import { Subscription } from '@/modules/tenancy/entities/subscription.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Repository<User>;
  let companyRepo: Repository<Company>;
  let planRepo: Repository<Plan>;
  let subscriptionRepo: Repository<Subscription>;
  let jwtTokenService: JwtTokenService;
  let refreshTokenService: RefreshTokenService;

  const validPassword = 'password123';
  const validHash = hashPassword(validPassword);

  const mockUser: Partial<User> = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    password_hash: validHash,
    role: UserRole.AGENT,
    is_active: true,
    company_id: 'company-1',
    last_login_at: new Date(),
  };

  const mockCompany: Partial<Company> = {
    id: 'company-1',
    name: 'Test Company',
    slug: 'test-company',
    is_active: true,
  };

  const mockPlan: Partial<Plan> = {
    id: 'plan-1',
    code: 'free',
    name: 'Free',
  };

  const mockJwtTokenService = {
    generateAccessToken: jest.fn().mockReturnValue('access-token'),
    generateRefreshToken: jest.fn().mockResolvedValue({ token: 'refresh-token', jti: 'jti-1' }),
    verifyRefreshToken: jest.fn(),
    verifyToken: jest.fn(),
    decodeToken: jest.fn(),
    getRefreshExpirationSeconds: jest.fn().mockReturnValue(604800),
    getAccessExpirationSeconds: jest.fn().mockReturnValue(900),
    getSecret: jest.fn().mockReturnValue('secret'),
    getRefreshSecret: jest.fn().mockReturnValue('refresh-secret'),
  };

  const mockRefreshTokenService = {
    storeRefreshToken: jest.fn().mockResolvedValue(undefined),
    validateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
  };

  const mockTokenBlacklistService = {
    blacklistToken: jest.fn().mockResolvedValue(undefined),
    isBlacklisted: jest.fn().mockResolvedValue(false),
    extractJtiFromToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Company),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Plan),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useClass: Repository,
        },
        {
          provide: JwtTokenService,
          useValue: mockJwtTokenService,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    companyRepo = module.get<Repository<Company>>(getRepositoryToken(Company));
    planRepo = module.get<Repository<Plan>>(getRepositoryToken(Plan));
    subscriptionRepo = module.get<Repository<Subscription>>(getRepositoryToken(Subscription));
    jwtTokenService = module.get<JwtTokenService>(JwtTokenService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens and user with valid credentials', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(userRepo, 'update').mockResolvedValue({} as any);

      const result = await service.login({ email: 'test@example.com', password: validPassword });

      expect(result.access_token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
      expect(userRepo.update).toHaveBeenCalledWith(mockUser.id, expect.any(Object));
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue({
        ...mockUser,
        is_active: false,
        password_hash: validHash,
      } as User);

      await expect(
        service.login({ email: 'test@example.com', password: validPassword }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create company + user + subscription and return tokens', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(companyRepo, 'create').mockReturnValue(mockCompany as Company);
      jest.spyOn(companyRepo, 'save').mockResolvedValue(mockCompany as Company);
      jest.spyOn(userRepo, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(planRepo, 'findOne').mockResolvedValue(mockPlan as Plan);
      jest.spyOn(subscriptionRepo, 'create').mockReturnValue({} as Subscription);
      jest.spyOn(subscriptionRepo, 'save').mockResolvedValue({} as Subscription);

      const result = await service.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.access_token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
      expect(companyRepo.create).toHaveBeenCalled();
      expect(userRepo.create).toHaveBeenCalled();
      expect(subscriptionRepo.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);

      await expect(
        service.register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('refresh', () => {
    it('should return new token pair with valid refresh token', async () => {
      mockJwtTokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', jti: 'jti-1' });
      mockRefreshTokenService.validateRefreshToken.mockResolvedValue({ userId: 'user-1' });
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);

      const result = await service.refresh({ refresh_token: 'valid-refresh-token' });

      expect(result.access_token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
      expect(mockRefreshTokenService.revokeRefreshToken).toHaveBeenCalledWith('jti-1');
    });

    it('should throw UnauthorizedException with revoked token', async () => {
      mockJwtTokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', jti: 'revoked-jti' });
      mockRefreshTokenService.validateRefreshToken.mockResolvedValue(null);

      await expect(
        service.refresh({ refresh_token: 'revoked-refresh-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should blacklist the token', async () => {
      mockJwtTokenService.decodeToken.mockReturnValue({
        sub: 'user-1',
        jti: 'jti-1',
        email: 'test@example.com',
        role: 'agent',
        companyId: 'company-1',
        iat: Math.floor(Date.now() / 1000) - 60,
        exp: Math.floor(Date.now() / 1000) + 600,
      });

      await service.logout('valid-token');

      expect(mockTokenBlacklistService.blacklistToken).toHaveBeenCalledWith('jti-1', expect.any(Number));
      expect(mockRefreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getProfile', () => {
    it('should return user data for valid user', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);

      const result = await service.getProfile('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.role).toBe(UserRole.AGENT);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
