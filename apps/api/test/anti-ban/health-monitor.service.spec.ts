import { Test, TestingModule } from '@nestjs/testing';

import { HealthMonitorService } from '@/modules/anti-ban/services/health-monitor.service';

describe('HealthMonitorService', () => {
  let service: HealthMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthMonitorService],
    }).compile();

    service = module.get<HealthMonitorService>(HealthMonitorService);
  });

  afterEach(() => {
    service.unregisterSession('session-1');
    service.unregisterSession('session-2');
  });

  describe('getConfig', () => {
    it('should return default config when no overrides set', () => {
      const config = service.getConfig('session-1');
      expect(config.failureThreshold).toBe(5);
      expect(config.circuitTimeout).toBe(300_000);
      expect(config.degradedThreshold).toBe(3);
    });

    it('should return merged config with overrides', () => {
      service.setConfig('session-1', { failureThreshold: 3, circuitTimeout: 60_000 });
      const config = service.getConfig('session-1');
      expect(config.failureThreshold).toBe(3);
      expect(config.circuitTimeout).toBe(60_000);
      expect(config.degradedThreshold).toBe(3);
    });
  });

  describe('registerSession', () => {
    it('should register a new session as healthy with closed circuit', () => {
      service.registerSession('session-1');
      expect(service.getHealth('session-1')).toBe('healthy');
      expect(service.getCircuitState('session-1')).toBe('closed');
      expect(service.isOperationAllowed('session-1')).toBe(true);
      expect(service.isHealthy('session-1')).toBe(true);
    });

    it('should not duplicate registration', () => {
      service.registerSession('session-1');
      service.registerSession('session-1');
      const stats = service.getAllSessionStats();
      expect(stats).toHaveLength(1);
    });
  });

  describe('unregisterSession', () => {
    it('should remove session from monitoring', () => {
      service.registerSession('session-1');
      service.unregisterSession('session-1');
      expect(service.isHealthy('session-1')).toBe(false);
      expect(service.isOperationAllowed('session-1')).toBe(false);
    });
  });

  describe('markConnected / markDisconnected', () => {
    it('should mark session as connected', () => {
      service.markConnected('session-1');
      const stats = service.getSessionStats('session-1');
      expect(stats?.isConnected).toBe(true);
    });

    it('should mark session as disconnected', () => {
      service.markConnected('session-1');
      service.markDisconnected('session-1');
      const stats = service.getSessionStats('session-1');
      expect(stats?.isConnected).toBe(false);
    });
  });

  describe('recordPing', () => {
    it('should auto-register session and update lastSeen', () => {
      const before = Date.now();
      service.recordPing('session-1');
      const stats = service.getSessionStats('session-1');
      expect(stats?.lastSeen).toBeGreaterThanOrEqual(before);
      expect(stats?.status).toBe('healthy');
    });
  });

  describe('recordSuccess', () => {
    it('should increment consecutive successes and total sent', () => {
      service.registerSession('session-1');
      service.recordSuccess('session-1');
      const stats = service.getSessionStats('session-1');
      expect(stats?.consecutiveSuccesses).toBe(1);
      expect(stats?.totalSent).toBe(1);
    });

    it('should close circuit when in half-open state', () => {
      service.registerSession('session-1');
      for (let i = 0; i < 5; i++) {
        service.recordFailure('session-1', `Error ${i}`);
      }
      service.setConfig('session-1', { circuitTimeout: 0 });
      expect(service.getCircuitState('session-1')).toBe('half-open');

      service.recordSuccess('session-1');
      expect(service.getCircuitState('session-1')).toBe('closed');
      expect(service.getHealth('session-1')).toBe('healthy');
    });

    it('should restore health after 5 consecutive successes when degraded', () => {
      service.registerSession('session-1');
      for (let i = 0; i < 3; i++) {
        service.recordFailure('session-1', `Error ${i}`);
      }
      expect(service.getHealth('session-1')).toBe('degraded');

      for (let i = 0; i < 5; i++) {
        service.recordSuccess('session-1');
      }
      expect(service.getHealth('session-1')).toBe('healthy');
    });

    it('should track latency metrics', () => {
      service.registerSession('session-1');
      service.recordSuccess('session-1', 100);
      const stats = service.getSessionStats('session-1');
      expect(stats?.avgLatency).toBe(100);
    });
  });

  describe('recordFailure', () => {
    it('should increment consecutive failures and total failed', () => {
      service.registerSession('session-1');
      service.recordFailure('session-1', 'test error');
      const stats = service.getSessionStats('session-1');
      expect(stats?.consecutiveFailures).toBe(1);
      expect(stats?.totalFailed).toBe(1);
      expect(stats?.lastError).toBe('test error');
    });

    it('should set status to degraded after reaching degradedThreshold', () => {
      service.registerSession('session-1');
      for (let i = 0; i < 3; i++) {
        service.recordFailure('session-1', `Error ${i}`);
      }
      expect(service.getHealth('session-1')).toBe('degraded');
    });

    it('should open circuit after reaching failureThreshold', () => {
      service.registerSession('session-1');
      for (let i = 0; i < 5; i++) {
        service.recordFailure('session-1', `Error ${i}`);
      }
      expect(service.getCircuitState('session-1')).toBe('open');
      expect(service.getHealth('session-1')).toBe('unhealthy');
      expect(service.isOperationAllowed('session-1')).toBe(false);
    });

    it('should not degrade below degraded before hitting threshold', () => {
      service.registerSession('session-1');
      service.recordFailure('session-1', 'minor error');
      expect(service.getHealth('session-1')).toBe('healthy');
    });
  });

  describe('getHealth / getCircuitState', () => {
    it('should return unhealthy / open for unregistered session', () => {
      expect(service.getHealth('unknown')).toBe('unhealthy');
      expect(service.getCircuitState('unknown')).toBe('open');
    });

    it('should transition to half-open after circuitTimeout', () => {
      service.registerSession('session-1');
      for (let i = 0; i < 5; i++) {
        service.recordFailure('session-1', `Error ${i}`);
      }
      expect(service.getCircuitState('session-1')).toBe('open');

      service.setConfig('session-1', { circuitTimeout: 0 });
      expect(service.getCircuitState('session-1')).toBe('half-open');
    });
  });

  describe('getSessionStats', () => {
    it('should return null for unregistered session', () => {
      expect(service.getSessionStats('unknown')).toBeNull();
    });

    it('should return full stats for registered session', () => {
      service.registerSession('session-1');
      service.recordSuccess('session-1');
      service.recordFailure('session-1', 'error');

      const stats = service.getSessionStats('session-1');
      expect(stats).toMatchObject({
        sessionId: 'session-1',
        status: 'healthy',
        circuitState: 'closed',
        totalSent: 1,
        totalFailed: 1,
        successRate: 50,
      });
      expect(stats?.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAllSessionStats', () => {
    it('should return stats for all registered sessions', () => {
      service.registerSession('session-1');
      service.registerSession('session-2');
      const all = service.getAllSessionStats();
      expect(all).toHaveLength(2);
    });
  });

  describe('getAggregateHealth', () => {
    it('should return aggregate stats', () => {
      service.registerSession('session-1');
      service.registerSession('session-2');
      const agg = service.getAggregateHealth();
      expect(agg.total).toBe(2);
      expect(agg.healthy).toBe(2);
      expect(agg.degraded).toBe(0);
      expect(agg.unhealthy).toBe(0);
    });

    it('should count unhealthy sessions correctly', () => {
      service.registerSession('session-1');
      for (let i = 0; i < 5; i++) {
        service.recordFailure('session-1', `Error ${i}`);
      }
      const agg = service.getAggregateHealth();
      expect(agg.unhealthy).toBe(1);
    });
  });
});
