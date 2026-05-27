import { UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { JwtTokenService } from '@/modules/auth/services/jwt.service';
import { TokenBlacklistService } from '@/modules/auth/services/token-blacklist.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtTokenService: JwtTokenService;
  let tokenBlacklistService: TokenBlacklistService;

  const mockJwtTokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    decodeToken: jest.fn(),
    getSecret: jest.fn(),
    getRefreshSecret: jest.fn(),
    getAccessExpirationSeconds: jest.fn(),
    getRefreshExpirationSeconds: jest.fn(),
  };

  const mockTokenBlacklistService = {
    blacklistToken: jest.fn(),
    isBlacklisted: jest.fn(),
    extractJtiFromToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtTokenService,
          useValue: mockJwtTokenService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtTokenService = module.get<JwtTokenService>(JwtTokenService);
    tokenBlacklistService = module.get<TokenBlacklistService>(TokenBlacklistService);

    jest.clearAllMocks();
  });

  function createMockContext(token?: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: token ? `Bearer ${token}` : undefined,
          },
        }),
      }),
    } as any;
  }

  describe('canActivate', () => {
    it('should allow request with valid Bearer token', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'agent',
        companyId: 'company-1',
        jti: 'jti-1',
      };
      mockJwtTokenService.verifyToken.mockResolvedValue(payload);
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

      const context = createMockContext('valid-token');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtTokenService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(tokenBlacklistService.isBlacklisted).toHaveBeenCalledWith('jti-1');
    });

    it('should throw UnauthorizedException when no token is provided', async () => {
      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(jwtTokenService.verifyToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is blacklisted', async () => {
      mockJwtTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'agent',
        companyId: 'company-1',
        jti: 'blacklisted-jti',
      });
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(true);

      const context = createMockContext('blacklisted-token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockJwtTokenService.verifyToken.mockRejectedValue(new UnauthorizedException('Token inválido o expirado'));

      const context = createMockContext('invalid-token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should extract jti from token when payload does not have jti', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'agent',
        companyId: 'company-1',
      };
      mockJwtTokenService.verifyToken.mockResolvedValue(payload);
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockTokenBlacklistService.extractJtiFromToken.mockReturnValue('extracted-jti');

      const context = createMockContext('token-without-jti');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(tokenBlacklistService.extractJtiFromToken).toHaveBeenCalledWith('token-without-jti');
    });
  });
});
