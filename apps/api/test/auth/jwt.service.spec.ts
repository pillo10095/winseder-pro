import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtTokenService } from '@/modules/auth/services/jwt.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let nestJwtService: NestJwtService;
  let configService: ConfigService;

  const mockNestJwtService = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'admin',
    companyId: 'company-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenService,
        { provide: NestJwtService, useValue: mockNestJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<JwtTokenService>(JwtTokenService);
    nestJwtService = module.get<NestJwtService>(NestJwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('generateAccessToken', () => {
    it('should sign a JWT with user payload and access token config', () => {
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'access-secret';
        throw new Error(`Missing config: ${key}`);
      });
      mockConfigService.get.mockReturnValue('15m');
      mockNestJwtService.sign.mockReturnValue('signed-access-token');

      const token = service.generateAccessToken(mockUser);

      expect(mockNestJwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          email: 'test@example.com',
          role: 'admin',
          companyId: 'company-1',
        },
        {
          secret: 'access-secret',
          expiresIn: 900,
        },
      );
      expect(token).toBe('signed-access-token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should sign a refresh token with userId and jti', async () => {
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        throw new Error(`Missing config: ${key}`);
      });
      mockConfigService.get.mockReturnValue('7d');
      mockNestJwtService.sign.mockReturnValue('signed-refresh-token');

      const result = await service.generateRefreshToken('user-1');

      expect(mockNestJwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', jti: expect.any(String) },
        {
          secret: 'refresh-secret',
          expiresIn: 604800,
        },
      );
      expect(result.token).toBe('signed-refresh-token');
      expect(result.jti).toBeDefined();
      expect(typeof result.jti).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('should return decoded payload for valid access token', async () => {
      const payload = { sub: 'user-1', email: 'test@example.com', role: 'admin', companyId: 'company-1' };
      mockConfigService.getOrThrow.mockReturnValue('access-secret');
      mockNestJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyToken('valid-token');

      expect(mockNestJwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'access-secret',
      });
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockConfigService.getOrThrow.mockReturnValue('access-secret');
      mockNestJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.verifyToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return decoded payload for valid refresh token', async () => {
      const payload = { sub: 'user-1', jti: 'jti-1' };
      mockConfigService.getOrThrow.mockReturnValue('refresh-secret');
      mockNestJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyRefreshToken('valid-refresh-token');

      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockConfigService.getOrThrow.mockReturnValue('refresh-secret');
      mockNestJwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

      await expect(service.verifyRefreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid JWT without verification', () => {
      const payload = Buffer.from(JSON.stringify({ sub: 'user-1', jti: 'jti-1' })).toString('base64url');
      const token = `header.${payload}.signature`;

      const result = service.decodeToken(token);

      expect(result).toEqual({ sub: 'user-1', jti: 'jti-1' });
    });

    it('should return null for malformed token (wrong part count)', () => {
      const result = service.decodeToken('only-two-parts');

      expect(result).toBeNull();
    });

    it('should return null for token with invalid JSON in payload', () => {
      const result = service.decodeToken('header.invalid-json.signature');

      expect(result).toBeNull();
    });

    it('should return null for empty token', () => {
      const result = service.decodeToken('');

      expect(result).toBeNull();
    });
  });

  describe('getSecret', () => {
    it('should return JWT_SECRET from config', () => {
      mockConfigService.getOrThrow.mockReturnValue('my-secret');

      const result = service.getSecret();

      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
      expect(result).toBe('my-secret');
    });
  });

  describe('getRefreshSecret', () => {
    it('should return JWT_REFRESH_SECRET from config', () => {
      mockConfigService.getOrThrow.mockReturnValue('refresh-secret');

      const result = service.getRefreshSecret();

      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('JWT_REFRESH_SECRET');
      expect(result).toBe('refresh-secret');
    });
  });

  describe('getAccessExpirationSeconds', () => {
    it('should parse 15m as 900 seconds', () => {
      mockConfigService.get.mockReturnValue('15m');

      const result = service.getAccessExpirationSeconds();

      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_EXPIRATION', '15m');
      expect(result).toBe(900);
    });

    it('should default to 15m when not configured', () => {
      mockConfigService.get.mockReturnValue('15m');

      const result = service.getAccessExpirationSeconds();

      expect(result).toBe(900);
    });
  });

  describe('getRefreshExpirationSeconds', () => {
    it('should parse 7d as 604800 seconds', () => {
      mockConfigService.get.mockReturnValue('7d');

      const result = service.getRefreshExpirationSeconds();

      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_REFRESH_EXPIRATION', '7d');
      expect(result).toBe(604800);
    });

    it('should default to 7d when not configured', () => {
      mockConfigService.get.mockReturnValue('7d');

      const result = service.getRefreshExpirationSeconds();

      expect(result).toBe(604800);
    });
  });

  describe('parseExpirationToSeconds', () => {
    it('should parse seconds', () => {
      const result = (service as any).parseExpirationToSeconds('30s');
      expect(result).toBe(30);
    });

    it('should parse minutes', () => {
      const result = (service as any).parseExpirationToSeconds('5m');
      expect(result).toBe(300);
    });

    it('should parse hours', () => {
      const result = (service as any).parseExpirationToSeconds('2h');
      expect(result).toBe(7200);
    });

    it('should parse days', () => {
      const result = (service as any).parseExpirationToSeconds('1d');
      expect(result).toBe(86400);
    });

    it('should return 7 days default for invalid format', () => {
      const result = (service as any).parseExpirationToSeconds('invalid');
      expect(result).toBe(604800);
    });

    it('should return 7 days default for empty string', () => {
      const result = (service as any).parseExpirationToSeconds('');
      expect(result).toBe(604800);
    });
  });
});
