import { Test, TestingModule } from '@nestjs/testing';

import { RateLimiterV2Service, MessageType } from '@/modules/anti-ban/services/rate-limiter-v2.service';

describe('RateLimiterV2Service', () => {
  let service: RateLimiterV2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimiterV2Service],
    }).compile();

    service = module.get<RateLimiterV2Service>(RateLimiterV2Service);
  });

  afterEach(() => {
    service.reset('session-1');
    service.reset('session-2');
  });

  describe('getConfig', () => {
    it('should return default config when no overrides set', () => {
      const config = service.getConfig('session-1');
      expect(config.perType.text.maxPerMinute).toBe(15);
      expect(config.tighteningFactor).toBe(0.8);
      expect(config.tighteningRecoveryMs).toBe(3_600_000);
    });

    it('should return merged config with overrides', () => {
      service.setConfig('session-1', { tighteningFactor: 0.5 });
      const config = service.getConfig('session-1');
      expect(config.tighteningFactor).toBe(0.5);
      expect(config.perType.text.maxPerMinute).toBe(15);
    });

    it('should merge per-type overrides', () => {
      service.setConfig('session-1', {
        perType: { text: { maxPerMinute: 10 } },
      });
      const config = service.getConfig('session-1');
      expect(config.perType.text.maxPerMinute).toBe(10);
      expect(config.perType.text.maxPerHour).toBe(200);
    });
  });

  describe('canProceed', () => {
    it('should allow first action', () => {
      expect(service.canProceed('session-1')).toBe(true);
    });

    it('should block after exceeding per-type per-minute limit', () => {
      // The limit check uses `>`, so we need `max + 1` actions for the next to fail
      for (let i = 0; i < 16; i++) {
        service.recordAction('session-1', 'text');
      }
      expect(service.canProceed('session-1', 'text')).toBe(false);
    });

    it('should allow different types independently', () => {
      for (let i = 0; i < 16; i++) {
        service.recordAction('session-1', 'text');
      }
      expect(service.canProceed('session-1', 'text')).toBe(false);
      expect(service.canProceed('session-1', 'image')).toBe(true);
    });

    it('should respect total rate limits across all types', () => {
      const types: MessageType[] = ['text', 'image', 'video', 'document'];
      // Total per-minute limit is min(sum of all max, 50) = 50
      for (let i = 0; i < 51; i++) {
        service.recordAction('session-1', 'text');
      }
      expect(service.canProceed('session-1', 'text')).toBe(false);
    });

    it('should apply tightening factor after violations', () => {
      service.recordViolation('session-1');
      service.recordViolation('session-1');

      // With tightening level 2: effective maxPerMinute = floor(15 * 0.8^2) = floor(9.6) = 9
      // Need 10 actions for 10 > 9 to be true
      for (let i = 0; i < 10; i++) {
        service.recordAction('session-1', 'text');
      }
      expect(service.canProceed('session-1', 'text')).toBe(false);
    });
  });

  describe('recordAction', () => {
    it('should record a timestamp for the message type', () => {
      service.recordAction('session-1', 'text');
      const stats = service.getStats('session-1');
      expect(stats.typeStats.text.lastMinute).toBe(1);
    });
  });

  describe('recordViolation', () => {
    it('should increase tightening level', () => {
      service.recordViolation('session-1');
      const stats = service.getStats('session-1');
      expect(stats.tighteningLevel).toBe(1);
    });

    it('should cap tightening level at 10', () => {
      for (let i = 0; i < 15; i++) {
        service.recordViolation('session-1');
      }
      const stats = service.getStats('session-1');
      expect(stats.tighteningLevel).toBe(10);
    });
  });

  describe('getWaitTime', () => {
    it('should return 0 when not rate limited', () => {
      expect(service.getWaitTime('session-1')).toBe(0);
    });

    it('should return positive wait time when rate limited', () => {
      for (let i = 0; i < 16; i++) {
        service.recordAction('session-1', 'text');
      }
      const wait = service.getWaitTime('session-1', 'text');
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBeLessThanOrEqual(60_000);
    });
  });

  describe('getStats', () => {
    it('should return stats for the session', () => {
      service.recordAction('session-1', 'text');
      service.recordAction('session-1', 'image');
      service.recordViolation('session-1');

      const stats = service.getStats('session-1');
      expect(stats.tighteningLevel).toBe(1);
      expect(stats.violations).toBe(1);
      expect(stats.typeStats.text.lastMinute).toBe(1);
      expect(stats.typeStats.image.lastMinute).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all state for a session', () => {
      for (let i = 0; i < 20; i++) {
        service.recordAction('session-1', 'text');
      }
      service.recordViolation('session-1');
      service.reset('session-1');

      expect(service.canProceed('session-1')).toBe(true);
      const stats = service.getStats('session-1');
      expect(stats.tighteningLevel).toBe(0);
    });
  });

  describe('per-session isolation', () => {
    it('should track sessions independently', () => {
      for (let i = 0; i < 16; i++) {
        service.recordAction('session-1', 'text');
      }
      expect(service.canProceed('session-1', 'text')).toBe(false);
      expect(service.canProceed('session-2', 'text')).toBe(true);
    });
  });
});
