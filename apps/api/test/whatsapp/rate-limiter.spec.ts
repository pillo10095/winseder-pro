import { Test, TestingModule } from '@nestjs/testing';
import { AntiBanRateLimiter } from '@/modules/whatsapp/services/anti-ban/rate-limiter';

describe('AntiBanRateLimiter', () => {
  let limiter: AntiBanRateLimiter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AntiBanRateLimiter],
    }).compile();

    limiter = module.get<AntiBanRateLimiter>(AntiBanRateLimiter);
  });

  afterEach(() => {
    limiter.reset('session-1');
  });

  describe('default config', () => {
    it('should allow first action', () => {
      expect(limiter.canProceed('session-1')).toBe(true);
    });

    it('should allow up to maxPerMinute actions', () => {
      for (let i = 0; i < 15; i++) {
        expect(limiter.canProceed('session-1')).toBe(true);
      }
    });

    it('should block after maxPerMinute actions within the same minute', () => {
      for (let i = 0; i < 15; i++) {
        limiter.canProceed('session-1');
      }
      expect(limiter.canProceed('session-1')).toBe(false);
    });

    it('should return wait time when blocked', () => {
      for (let i = 0; i < 15; i++) {
        limiter.canProceed('session-1');
      }
      const waitTime = limiter.getWaitTime('session-1');
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(60_000);
    });

    it('should return 0 wait time when not blocked', () => {
      expect(limiter.getWaitTime('session-1')).toBe(0);
    });
  });

  describe('custom config', () => {
    it('should respect custom maxPerMinute', () => {
      limiter.setConfig('session-1', { maxPerMinute: 3 });

      expect(limiter.canProceed('session-1')).toBe(true);
      expect(limiter.canProceed('session-1')).toBe(true);
      expect(limiter.canProceed('session-1')).toBe(true);
      expect(limiter.canProceed('session-1')).toBe(false);
    });

    it('should return custom config values', () => {
      limiter.setConfig('session-1', { maxPerMinute: 5, maxPerHour: 50 });
      const config = limiter.getConfig('session-1');
      expect(config.maxPerMinute).toBe(5);
      expect(config.maxPerHour).toBe(50);
      expect(config.maxPerDay).toBe(2000); // default
    });
  });

  describe('reset', () => {
    it('should clear all state for a session', () => {
      for (let i = 0; i < 20; i++) {
        limiter.canProceed('session-1');
      }
      expect(limiter.canProceed('session-1')).toBe(false);

      limiter.reset('session-1');
      expect(limiter.canProceed('session-1')).toBe(true);
    });
  });

  describe('per-session isolation', () => {
    it('should track sessions independently', () => {
      for (let i = 0; i < 15; i++) {
        limiter.canProceed('session-1');
      }
      // session-1 is blocked
      expect(limiter.canProceed('session-1')).toBe(false);
      // session-2 should still work
      expect(limiter.canProceed('session-2')).toBe(true);
    });
  });
});
