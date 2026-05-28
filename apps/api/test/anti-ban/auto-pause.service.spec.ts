import { Test, TestingModule } from '@nestjs/testing';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { AutoPauseService } from '@/modules/anti-ban/services/auto-pause.service';

describe('AutoPauseService', () => {
  let service: AutoPauseService;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoPauseService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AutoPauseService>(AutoPauseService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (service.isPaused('session-1')) service.resume('session-1');
    if (service.isPaused('session-2')) service.resume('session-2');
  });

  describe('getConfig', () => {
    it('should return default config when no overrides set', () => {
      const config = service.getConfig('session-1');
      expect(config.autoResumeMinutes).toBe(30);
      expect(config.pauseOnDegraded).toBe(true);
      expect(config.pauseOnRateLimit).toBe(true);
      expect(config.pauseOnReport).toBe(true);
      expect(config.pauseOnBudgetExceeded).toBe(true);
      expect(config.rateLimitViolationThreshold).toBe(3);
    });

    it('should return merged config with overrides', () => {
      service.setConfig('session-1', { autoResumeMinutes: 60, pauseOnDegraded: false });
      const config = service.getConfig('session-1');
      expect(config.autoResumeMinutes).toBe(60);
      expect(config.pauseOnDegraded).toBe(false);
      expect(config.pauseOnReport).toBe(true);
    });
  });

  describe('pause', () => {
    it('should pause a session and emit event', () => {
      service.pause('session-1', 'test reason', 'manual');

      expect(service.isPaused('session-1')).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'anti-ban.session_paused',
        expect.objectContaining({ sessionId: 'session-1', reason: 'test reason', triggeredBy: 'manual' }),
      );
    });

    it('should not set autoResumeAt for manual pauses', () => {
      service.pause('session-1', 'manual reason', 'manual');
      const info = service.getPauseInfo('session-1');
      expect(info.autoResumeAt).toBeNull();
    });

    it('should set autoResumeAt for auto pauses', () => {
      const before = Date.now();
      service.pause('session-1', 'auto reason', 'auto');
      const info = service.getPauseInfo('session-1');
      expect(info.autoResumeAt).toBeGreaterThanOrEqual(before + 30 * 60_000);
    });
  });

  describe('resume', () => {
    it('should resume a paused session and emit event', () => {
      service.pause('session-1', 'test', 'manual');
      const result = service.resume('session-1');

      expect(result).toBe(true);
      expect(service.isPaused('session-1')).toBe(false);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'anti-ban.session_resumed',
        expect.objectContaining({ sessionId: 'session-1' }),
      );
    });

    it('should return false if session was not paused', () => {
      const result = service.resume('session-1');
      expect(result).toBe(false);
    });
  });

  describe('isPaused', () => {
    it('should return false for non-paused session', () => {
      expect(service.isPaused('session-1')).toBe(false);
    });

    it('should auto-resume expired entries', () => {
      service.setConfig('session-1', { autoResumeMinutes: 0 });
      service.pause('session-1', 'test', 'auto');
      expect(service.isPaused('session-1')).toBe(false);
    });
  });

  describe('getPauseInfo', () => {
    it('should return pause details for paused session', () => {
      service.pause('session-1', 'my reason', 'manual');
      const info = service.getPauseInfo('session-1');
      expect(info.paused).toBe(true);
      expect(info.reason).toBe('my reason');
      expect(info.triggeredBy).toBe('manual');
    });

    it('should return unpaused info for non-paused session', () => {
      const info = service.getPauseInfo('session-1');
      expect(info.paused).toBe(false);
      expect(info.reason).toBeNull();
    });

    it('should auto-resume expired entries', () => {
      service.setConfig('session-1', { autoResumeMinutes: 0 });
      service.pause('session-1', 'test', 'auto');
      const info = service.getPauseInfo('session-1');
      expect(info.paused).toBe(false);
    });
  });

  describe('checkRateLimitViolations', () => {
    it('should return false if pauseOnRateLimit is disabled', () => {
      service.setConfig('session-1', { pauseOnRateLimit: false });
      const result = service.checkRateLimitViolations('session-1');
      expect(result).toBe(false);
    });

    it('should return false when under threshold', () => {
      const result = service.checkRateLimitViolations('session-1');
      expect(result).toBe(false);
    });

    it('should pause session when violations exceed threshold', () => {
      service.setConfig('session-1', { rateLimitViolationThreshold: 3 });
      service.checkRateLimitViolations('session-1');
      service.checkRateLimitViolations('session-1');
      const result = service.checkRateLimitViolations('session-1');

      expect(result).toBe(true);
      expect(service.isPaused('session-1')).toBe(true);
    });
  });

  describe('checkHealthTrigger', () => {
    it('should return false if pauseOnDegraded is disabled', () => {
      service.setConfig('session-1', { pauseOnDegraded: false });
      const result = service.checkHealthTrigger('session-1', 'unhealthy');
      expect(result).toBe(false);
    });

    it('should return false for non-unhealthy status', () => {
      const result = service.checkHealthTrigger('session-1', 'healthy');
      expect(result).toBe(false);
    });

    it('should pause session on unhealthy status', () => {
      const result = service.checkHealthTrigger('session-1', 'unhealthy');
      expect(result).toBe(true);
      expect(service.isPaused('session-1')).toBe(true);
    });
  });

  describe('checkBudgetTrigger', () => {
    it('should return false if pauseOnBudgetExceeded is disabled', () => {
      service.setConfig('session-1', { pauseOnBudgetExceeded: false });
      const result = service.checkBudgetTrigger('session-1', true);
      expect(result).toBe(false);
    });

    it('should return false when budget not exceeded', () => {
      const result = service.checkBudgetTrigger('session-1', false);
      expect(result).toBe(false);
    });

    it('should pause session when budget exceeded', () => {
      const result = service.checkBudgetTrigger('session-1', true);
      expect(result).toBe(true);
      expect(service.isPaused('session-1')).toBe(true);
    });
  });

  describe('checkReportTrigger', () => {
    it('should return false if pauseOnReport is disabled', () => {
      service.setConfig('session-1', { pauseOnReport: false });
      const result = service.checkReportTrigger('session-1', 'high');
      expect(result).toBe(false);
    });

    it('should return false for low severity', () => {
      const result = service.checkReportTrigger('session-1', 'low');
      expect(result).toBe(false);
    });

    it('should pause session on high severity', () => {
      const result = service.checkReportTrigger('session-1', 'high');
      expect(result).toBe(true);
      expect(service.isPaused('session-1')).toBe(true);
    });

    it('should pause session on critical severity', () => {
      const result = service.checkReportTrigger('session-1', 'critical');
      expect(result).toBe(true);
      expect(service.isPaused('session-1')).toBe(true);
    });
  });

  describe('getAllPaused', () => {
    it('should return all currently paused sessions', () => {
      service.pause('session-1', 'reason 1', 'manual');
      service.pause('session-2', 'reason 2', 'auto');
      const all = service.getAllPaused();
      expect(all).toHaveLength(2);
    });
  });

  describe('getPauseHistory', () => {
    it('should return current paused sessions', () => {
      service.pause('session-1', 'test', 'manual');
      const history = service.getPauseHistory('session-1');
      expect(history).toHaveLength(1);
    });
  });
});
