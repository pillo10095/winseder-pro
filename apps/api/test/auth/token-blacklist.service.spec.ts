let mockRedis: Record<string, jest.Mock>;

jest.mock('ioredis', () => {
  const redis: Record<string, jest.Mock> = {
    setex: jest.fn().mockResolvedValue('OK'),
    exists: jest.fn().mockResolvedValue(0),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn().mockReturnThis(),
  };
  mockRedis = redis;
  const RedisMock = jest.fn(() => redis) as any;
  RedisMock.Redis = RedisMock;
  return RedisMock;
});

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { TokenBlacklistService } from '@/modules/auth/services/token-blacklist.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;

  const mockConfigService = {
    get: jest.fn(),
  };

  async function buildModule() {
    jest.clearAllMocks();

    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_USERNAME: undefined,
        REDIS_PASSWORD: undefined,
        REDIS_TLS: false,
      };
      return key in config ? config[key] : defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
  }

  beforeEach(async () => {
    await buildModule();
  });

  describe('constructor', () => {
    it('should create Redis client with error handler', async () => {
      await buildModule();
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('blacklistToken', () => {
    it('should store token in Redis with TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.blacklistToken('jti-1', 900);

      expect(mockRedis.setex).toHaveBeenCalledWith('blacklist:jti-1', 900, '1');
    });

    it('should handle Redis error gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis down'));

      await expect(service.blacklistToken('jti-1', 900)).resolves.toBeUndefined();
    });
  });

  describe('isBlacklisted', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.isBlacklisted('jti-1');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.isBlacklisted('jti-1');

      expect(result).toBe(false);
    });

    it('should return false on Redis error', async () => {
      mockRedis.exists.mockRejectedValue(new Error('timeout'));

      const result = await service.isBlacklisted('jti-1');

      expect(result).toBe(false);
    });
  });

  describe('extractJtiFromToken', () => {
    it('should extract jti from a valid JWT', () => {
      const payload = Buffer.from(JSON.stringify({ jti: 'jti-123' })).toString('base64url');
      const token = `header.${payload}.signature`;

      const result = service.extractJtiFromToken(token);

      expect(result).toBe('jti-123');
    });

    it('should fall back to hash when JWT has no jti', () => {
      const payload = Buffer.from(JSON.stringify({ sub: 'user-1' })).toString('base64url');
      const token = `header.${payload}.signature`;

      const result = service.extractJtiFromToken(token);

      expect(result).toMatch(/^hash:/);
    });

    it('should hash malformed token with incorrect parts', () => {
      const result = service.extractJtiFromToken('not-a-jwt');

      expect(result).toMatch(/^hash:/);
    });

    it('should hash token when payload is not valid JSON', () => {
      const token = 'header.not-json.signature';

      const result = service.extractJtiFromToken(token);

      expect(result).toMatch(/^hash:/);
    });

    it('should hash empty string', () => {
      const result = service.extractJtiFromToken('');

      expect(result).toMatch(/^hash:/);
    });
  });

  describe('hashToken', () => {
    it('should produce deterministic hash for same input', () => {
      const hash1 = (service as any).hashToken('test-token');
      const hash2 = (service as any).hashToken('test-token');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = (service as any).hashToken('token-a');
      const hash2 = (service as any).hashToken('token-b');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis client', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});
