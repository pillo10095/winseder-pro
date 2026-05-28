import { Test, type TestingModule } from '@nestjs/testing';

import { RateLimiterV2Service } from '@/modules/anti-ban/services/rate-limiter-v2.service';
import { AdaptiveDelayService } from '@/modules/anti-ban/services/adaptive-delay.service';
import { QuietHoursService } from '@/modules/anti-ban/services/quiet-hours.service';
import { DailyBudgetService } from '@/modules/anti-ban/services/daily-budget.service';
import { ReportDetectorService } from '@/modules/anti-ban/services/report-detector.service';
import { AutoPauseService } from '@/modules/anti-ban/services/auto-pause.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('Anti-Ban E2E', () => {
  let rateLimiter: RateLimiterV2Service;
  let adaptiveDelay: AdaptiveDelayService;
  let quietHours: QuietHoursService;
  let dailyBudget: DailyBudgetService;
  let reportDetector: ReportDetectorService;
  let autoPause: AutoPauseService;

  const sessionId = 'test-session-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterV2Service,
        AdaptiveDelayService,
        QuietHoursService,
        DailyBudgetService,
        ReportDetectorService,
        AutoPauseService,
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    rateLimiter = module.get<RateLimiterV2Service>(RateLimiterV2Service);
    adaptiveDelay = module.get<AdaptiveDelayService>(AdaptiveDelayService);
    quietHours = module.get<QuietHoursService>(QuietHoursService);
    dailyBudget = module.get<DailyBudgetService>(DailyBudgetService);
    reportDetector = module.get<ReportDetectorService>(ReportDetectorService);
    autoPause = module.get<AutoPauseService>(AutoPauseService);
  });

  afterEach(() => {
    rateLimiter.reset(sessionId);
    adaptiveDelay.reset(sessionId);
    dailyBudget.reset(sessionId);
  });

  describe('Rate Limiter V2', () => {
    it('should allow messages within limits', () => {
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.canProceed(sessionId, 'text')).toBe(true);
        rateLimiter.recordAction(sessionId, 'text');
      }
    });

    it('should tighten after violations', () => {
      rateLimiter.recordViolation(sessionId);
      rateLimiter.recordViolation(sessionId);

      const stats = rateLimiter.getStats(sessionId);
      expect(stats.tighteningLevel).toBe(2);
      expect(stats.violations).toBe(2);
    });

    it('should reject when limits exceeded', () => {
      // Push many image timestamps to exceed per-minute limit
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordAction(sessionId, 'image');
      }

      // After 5+, check if canProceed returns false
      const result = rateLimiter.canProceed(sessionId, 'image');
      expect(result).toBe(false);
    });
  });

  describe('Adaptive Delay', () => {
    it('should start with initial delay', () => {
      const delay = adaptiveDelay.getDelay(sessionId);
      expect(delay).toBe(2000);
    });

    it('should increase delay on failure', () => {
      adaptiveDelay.recordFailure(sessionId);
      expect(adaptiveDelay.getDelay(sessionId)).toBe(3000); // 2000 * 1.5
    });

    it('should decrease delay on success', () => {
      adaptiveDelay.recordFailure(sessionId); // 2000 → 3000
      adaptiveDelay.recordSuccess(sessionId); // 3000 → 2850
      expect(adaptiveDelay.getDelay(sessionId)).toBe(2850);
    });

    it('should trigger alert on consecutive failures', () => {
      let alertTriggered = false;
      for (let i = 0; i < 10; i++) {
        const result = adaptiveDelay.recordFailure(sessionId);
        if (result) alertTriggered = true;
      }

      expect(alertTriggered).toBe(true);
      const stats = adaptiveDelay.getStats(sessionId);
      expect(stats.alertTriggered).toBe(true);
    });
  });

  describe('Quiet Hours', () => {
    it('should have configurable ranges', () => {
      quietHours.setConfig(sessionId, {
        timezone: 'America/Mexico_City',
        ranges: [{ start: '00:00', end: '06:00' }],
        enabled: true,
      });

      const config = quietHours.getConfig(sessionId);
      expect(config.ranges).toHaveLength(1);
      expect(config.ranges[0].start).toBe('00:00');
    });
  });

  describe('Daily Budget', () => {
    it('should allow consumption within limit', () => {
      const result = dailyBudget.consume(sessionId, 'text');
      expect(result).toBe(true);
    });

    it('should track consumption details', () => {
      dailyBudget.consume(sessionId, 'text');
      dailyBudget.consume(sessionId, 'image');
      dailyBudget.consume(sessionId, 'text');

      const budget = dailyBudget.getBudget(sessionId);
      expect(budget.consumed).toBe(4); // text(1) + image(2) + text(1)
      expect(budget.remaining).toBe(996);
    });

    it('should reject when budget exceeded', () => {
      // Consume way over limit
      const config = dailyBudget.getConfig(sessionId);
      for (let i = 0; i < config.dailyLimit + 100; i++) {
        dailyBudget.consume(sessionId, 'text');
      }

      const result = dailyBudget.consume(sessionId, 'text');
      expect(result).toBe(false);
    });
  });

  describe('Report Detector', () => {
    it('should detect spam report patterns', () => {
      const result = reportDetector.analyze(sessionId, 'Your account has been reported for spam');

      expect(result).not.toBeNull();
      expect(result!.detected).toBe(true);
      expect(result!.type).toBe('spam_report');
    });

    it('should detect block notices', () => {
      const result = reportDetector.analyze(sessionId, 'Tu cuenta ha sido bloqueada por violación de términos');

      expect(result).not.toBeNull();
      expect(result!.detected).toBe(true);
      expect(result!.type).toBe('block_notice');
    });

    it('should return null for normal messages', () => {
      const result = reportDetector.analyze(sessionId, 'Hola, ¿cómo estás?');

      expect(result).toBeNull();
    });

    it('should escalate severity with frequency', () => {
      // Trigger multiple reports to increase frequency
      for (let i = 0; i < 5; i++) {
        reportDetector.analyze(sessionId, 'report spam');
      }

      const stats = reportDetector.getStats(sessionId);
      expect(stats.total).toBe(5);
    });
  });

  describe('Auto Pause', () => {
    it('should pause and resume session', () => {
      autoPause.pause(sessionId, 'Testing pause', 'manual');

      expect(autoPause.isPaused(sessionId)).toBe(true);

      autoPause.resume(sessionId);
      expect(autoPause.isPaused(sessionId)).toBe(false);
    });

    it('should return pause info', () => {
      autoPause.pause(sessionId, 'Manual pause', 'manual');

      const info = autoPause.getPauseInfo(sessionId);
      expect(info.paused).toBe(true);
      expect(info.reason).toBe('Manual pause');
    });
  });

  describe('Integration: Rate Limiter + Auto Pause', () => {
    it('should trigger auto-pause on repeated violations', () => {
      for (let i = 0; i < 3; i++) {
        rateLimiter.recordViolation(sessionId);
        autoPause.checkRateLimitViolations(sessionId);
      }

      const info = autoPause.getPauseInfo(sessionId);
      expect(info.paused).toBe(true);
    });
  });
});
