import { Test, TestingModule } from '@nestjs/testing';
import { HealthMonitor } from '@/modules/whatsapp/services/anti-ban/health-monitor';

describe('HealthMonitor', () => {
  let monitor: HealthMonitor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthMonitor],
    }).compile();

    monitor = module.get<HealthMonitor>(HealthMonitor);
  });

  afterEach(() => {
    monitor.unregisterSession('session-1');
    monitor.unregisterSession('session-2');
  });

  describe('registerSession', () => {
    it('should register a new session as healthy', () => {
      monitor.registerSession('session-1');
      expect(monitor.isHealthy('session-1')).toBe(true);
      expect(monitor.isOperationAllowed('session-1')).toBe(true);
    });
  });

  describe('health transitions', () => {
    it('should stay healthy with successful operations', () => {
      monitor.registerSession('session-1');
      monitor.recordSuccess('session-1');
      monitor.recordSuccess('session-1');
      expect(monitor.isHealthy('session-1')).toBe(true);
    });

    it('should become degraded after half the failure threshold', () => {
      monitor.registerSession('session-1');
      // threshold is 5 by default, so 3 failures = degraded
      for (let i = 0; i < 3; i++) {
        monitor.recordFailure('session-1', `Error ${i}`);
      }
      expect(monitor.isHealthy('session-1')).toBe(false);
      expect(monitor.getHealth('session-1')).toBe('degraded');
    });

    it('should become unhealthy after hitting failure threshold', () => {
      monitor.registerSession('session-1');
      for (let i = 0; i < 5; i++) {
        monitor.recordFailure('session-1', `Error ${i}`);
      }
      expect(monitor.getHealth('session-1')).toBe('unhealthy');
    });

    it('should open circuit after failure threshold', () => {
      monitor.registerSession('session-1');
      for (let i = 0; i < 5; i++) {
        monitor.recordFailure('session-1', `Error ${i}`);
      }
      expect(monitor.getCircuitState('session-1')).toBe('open');
      expect(monitor.isOperationAllowed('session-1')).toBe(false);
    });
  });

  describe('circuit breaker', () => {
    it('should close circuit after success in half-open state', () => {
      monitor.registerSession('session-1');

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        monitor.recordFailure('session-1', `Error ${i}`);
      }
      expect(monitor.getCircuitState('session-1')).toBe('open');

      // Transition to half-open via tryHalfOpen (timeout)
      // We can force this by checking health after circuit timeout
      // Use a small config timeout
      monitor.setConfig('session-1', { circuitTimeout: 0 });
      expect(monitor.getCircuitState('session-1')).toBe('half-open');

      // Record success — circuit should close
      monitor.recordSuccess('session-1');
      expect(monitor.getCircuitState('session-1')).toBe('closed');
      expect(monitor.isHealthy('session-1')).toBe(true);
    });
  });

  describe('ping', () => {
    it('should update last ping time', () => {
      monitor.registerSession('session-1');
      monitor.recordPing('session-1');
      expect(monitor.isHealthy('session-1')).toBe(true);
    });
  });

  describe('unregisterSession', () => {
    it('should remove session from monitoring', () => {
      monitor.registerSession('session-1');
      monitor.unregisterSession('session-1');
      expect(monitor.isHealthy('session-1')).toBe(false);
      expect(monitor.isOperationAllowed('session-1')).toBe(false);
    });
  });

  describe('getAllSessions', () => {
    it('should return all registered sessions', () => {
      monitor.registerSession('session-1');
      monitor.registerSession('session-2');
      const all = monitor.getAllSessions();
      expect(all).toHaveLength(2);
      expect(all.map((s) => s.sessionId)).toEqual(
        expect.arrayContaining(['session-1', 'session-2']),
      );
    });
  });
});
