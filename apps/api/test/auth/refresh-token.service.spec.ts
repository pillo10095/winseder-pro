let mockRedis: Record<string, jest.Mock>;

jest.mock('ioredis', () => {
  const redis: Record<string, jest.Mock> = {
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue(['0', []]),
    pipeline: jest.fn().mockReturnValue({ del: jest.fn(), exec: jest.fn().mockResolvedValue([]), length: 0 }),
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

import { RefreshTokenService } from '@/modules/auth/services/refresh-token.service';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

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
        RefreshTokenService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
  }

  beforeEach(async () => {
    await buildModule();
  });

  describe('constructor', () => {
    it('should create Redis client with config values', async () => {
      await buildModule();
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should use defaults when Redis config is missing', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_HOST', 'localhost');
    });
  });

  describe('storeRefreshToken', () => {
    it('should store token in Redis with TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.storeRefreshToken('jti-1', 'user-1', 3600);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'refresh:jti-1',
        3600,
        expect.stringContaining('"userId":"user-1"'),
      );
    });

    it('should throw error when Redis setex fails', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis down'));

      await expect(service.storeRefreshToken('jti-1', 'user-1', 3600)).rejects.toThrow('Redis down');
    });
  });

  describe('validateRefreshToken', () => {
    it('should return parsed data when token exists', async () => {
      const data = JSON.stringify({ userId: 'user-1', createdAt: new Date().toISOString(), expiresAt: new Date().toISOString() });
      mockRedis.get.mockResolvedValue(data);

      const result = await service.validateRefreshToken('jti-1');

      expect(mockRedis.get).toHaveBeenCalledWith('refresh:jti-1');
      expect(result).toEqual(expect.objectContaining({ userId: 'user-1' }));
    });

    it('should return null when token does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.validateRefreshToken('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('timeout'));

      const result = await service.validateRefreshToken('jti-1');

      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should delete token from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.revokeRefreshToken('jti-1');

      expect(mockRedis.del).toHaveBeenCalledWith('refresh:jti-1');
    });

    it('should not throw on Redis error', async () => {
      mockRedis.del.mockRejectedValue(new Error('timeout'));

      await expect(service.revokeRefreshToken('jti-1')).resolves.toBeUndefined();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should scan and delete all tokens for a user', async () => {
      const scanMock = jest.fn()
        .mockResolvedValueOnce(['0', ['refresh:jti-1', 'refresh:jti-2']])
        .mockResolvedValueOnce(['0', []]);
      mockRedis.scan = scanMock;
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify({ userId: 'user-1' }))
        .mockResolvedValueOnce(JSON.stringify({ userId: 'user-1' }));

      const delMock = jest.fn();
      const execMock = jest.fn().mockResolvedValue([]);
      mockRedis.pipeline = jest.fn().mockReturnValue({ del: delMock, exec: execMock, length: 2 });

      await service.revokeAllUserTokens('user-1');

      expect(scanMock).toHaveBeenCalledWith('0', 'MATCH', 'refresh:*', 'COUNT', 100);
      expect(delMock).toHaveBeenCalledWith('refresh:jti-1');
      expect(delMock).toHaveBeenCalledWith('refresh:jti-2');
      expect(execMock).toHaveBeenCalled();
    });

    it('should skip tokens belonging to other users', async () => {
      const scanMock = jest.fn()
        .mockResolvedValueOnce(['0', ['refresh:jti-other', 'refresh:jti-user']])
        .mockResolvedValueOnce(['0', []]);
      mockRedis.scan = scanMock;
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify({ userId: 'other-user' }))
        .mockResolvedValueOnce(JSON.stringify({ userId: 'user-1' }));

      const delMock = jest.fn();
      const execMock = jest.fn().mockResolvedValue([]);
      mockRedis.pipeline = jest.fn().mockReturnValue({ del: delMock, exec: execMock, length: 1 });

      await service.revokeAllUserTokens('user-1');

      expect(delMock).toHaveBeenCalledTimes(1);
      expect(delMock).toHaveBeenCalledWith('refresh:jti-user');
      expect(execMock).toHaveBeenCalled();
    });

    it('should not exec pipeline when no matching tokens', async () => {
      const scanMock = jest.fn()
        .mockResolvedValueOnce(['0', ['refresh:jti-other']])
        .mockResolvedValueOnce(['0', []]);
      mockRedis.scan = scanMock;
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ userId: 'other-user' }));

      const delMock = jest.fn();
      const execMock = jest.fn().mockResolvedValue([]);
      mockRedis.pipeline = jest.fn().mockReturnValue({ del: delMock, exec: execMock, length: 0 });

      await service.revokeAllUserTokens('user-1');

      expect(delMock).not.toHaveBeenCalled();
      expect(execMock).not.toHaveBeenCalled();
    });

    it('should handle Redis error gracefully', async () => {
      mockRedis.scan = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(service.revokeAllUserTokens('user-1')).resolves.toBeUndefined();
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
