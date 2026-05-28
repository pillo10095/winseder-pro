import { Test, TestingModule } from '@nestjs/testing';

import { AdaptiveDelayService } from '@/modules/anti-ban/services/adaptive-delay.service';

describe('AdaptiveDelayService', () => {
  let service: AdaptiveDelayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdaptiveDelayService],
    }).compile();

    service = module.get<AdaptiveDelayService>(AdaptiveDelayService);
  });

  afterEach(() => {
    service.reset('session-1');
    service.reset('session-2');
  });

  describe('getConfig', () => {
    it('should return default config when no overrides set', () => {
      const config = service.getConfig('session-1');
      expect(config.initialDelay).toBe(2000);
      expect(config.minDelay).toBe(500);
      expect(config.maxDelay).toBe(15_000);
      expect(config.failureMultiplier).toBe(1.5);
      expect(config.successMultiplier).toBe(0.95);
      expect(config.maxConsecutiveFailures).toBe(10);
    });

    it('should return merged config with overrides', () => {
      service.setConfig('session-1', { minDelay: 100, maxDelay: 5000 });
      const config = service.getConfig('session-1');
      expect(config.initialDelay).toBe(2000);
      expect(config.minDelay).toBe(100);
      expect(config.maxDelay).toBe(5000);
    });
  });

  describe('getDelay', () => {
    it('should return initial delay for a new session', () => {
      expect(service.getDelay('session-1')).toBe(2000);
    });
  });

  describe('recordSuccess', () => {
    it('should reduce delay using success multiplier', () => {
      service.recordSuccess('session-1');
      expect(service.getDelay('session-1')).toBe(1900);
    });

    it('should not go below minDelay', () => {
      service.setConfig('session-1', { minDelay: 1500, successMultiplier: 0.5 });
      service.recordSuccess('session-1');
      expect(service.getDelay('session-1')).toBe(1500);
    });

    it('should reset consecutive failures on success', () => {
      service.recordFailure('session-1');
      service.recordFailure('session-1');
      service.recordSuccess('session-1');
      const stats = service.getStats('session-1');
      expect(stats.consecutiveFailures).toBe(0);
      expect(stats.consecutiveSuccesses).toBe(1);
    });

    it('should clear alert flag after 5 consecutive successes', () => {
      service.recordFailure('session-1');
      service.recordFailure('session-1');
      service.recordFailure('session-1');
      service.recordFailure('session-1');
      service.recordFailure('session-1');
      service.recordFailure('session-1');
      service.recordFailure('session-1');
      service.recordFailure('session-1');
      service.recordFailure('session-1');
      service.recordFailure('session-1');
      expect(service.getStats('session-1').alertTriggered).toBe(true);

      for (let i = 0; i < 5; i++) {
        service.recordSuccess('session-1');
      }
      expect(service.getStats('session-1').alertTriggered).toBe(false);
    });
  });

  describe('recordFailure', () => {
    it('should increase delay using failure multiplier', () => {
      service.recordFailure('session-1');
      expect(service.getDelay('session-1')).toBe(3000);
    });

    it('should not go above maxDelay', () => {
      service.setConfig('session-1', { failureMultiplier: 10, maxDelay: 5000 });
      service.recordFailure('session-1');
      expect(service.getDelay('session-1')).toBe(5000);
    });

    it('should return true when max consecutive failures threshold crossed', () => {
      let alert = false;
      for (let i = 0; i < 10; i++) {
        alert = service.recordFailure('session-1');
      }
      expect(alert).toBe(true);
    });

    it('should return false before crossing threshold', () => {
      const alert = service.recordFailure('session-1');
      expect(alert).toBe(false);
    });

    it('should return false on subsequent alerts (only fires once)', () => {
      for (let i = 0; i < 10; i++) {
        service.recordFailure('session-1');
      }
      const alertAgain = service.recordFailure('session-1');
      expect(alertAgain).toBe(false);
    });

    it('should reset consecutive successes on failure', () => {
      service.recordSuccess('session-1');
      service.recordSuccess('session-1');
      service.recordFailure('session-1');
      const stats = service.getStats('session-1');
      expect(stats.consecutiveSuccesses).toBe(0);
      expect(stats.consecutiveFailures).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return full stats snapshot', () => {
      service.recordFailure('session-1');

      const stats = service.getStats('session-1');
      expect(stats.currentDelay).toBe(3000);
      expect(stats.totalSuccesses).toBe(0);
      expect(stats.totalFailures).toBe(1);
      expect(stats.lastAdjustment).toBeGreaterThan(0);
      expect(stats.lastFailureAt).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should clear all state and config for a session', () => {
      service.setConfig('session-1', { minDelay: 100 });
      service.recordFailure('session-1');
      service.reset('session-1');

      expect(service.getDelay('session-1')).toBe(2000);
      const config = service.getConfig('session-1');
      expect(config.minDelay).toBe(500);
    });
  });

  describe('per-session isolation', () => {
    it('should track sessions independently', () => {
      service.recordFailure('session-1');
      expect(service.getDelay('session-1')).toBe(3000);
      expect(service.getDelay('session-2')).toBe(2000);
    });
  });
});
