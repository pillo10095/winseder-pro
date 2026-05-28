import { Test, TestingModule } from '@nestjs/testing';

import { ReportDetectorService } from '@/modules/anti-ban/services/report-detector.service';

describe('ReportDetectorService', () => {
  let service: ReportDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportDetectorService],
    }).compile();

    service = module.get<ReportDetectorService>(ReportDetectorService);
  });

  afterEach(() => {
    service.reset('session-1');
    service.reset('session-2');
  });

  describe('getConfig', () => {
    it('should return default config when no overrides set', () => {
      const config = service.getConfig('session-1');
      expect(config.enabled).toBe(true);
      expect(config.frequencyThreshold).toBe(3);
      expect(config.frequencyWindowMs).toBe(3_600_000);
      expect(config.keywords).toContain('report');
    });
  });

  describe('analyze', () => {
    it('should return null when disabled', () => {
      service.setConfig('session-1', { enabled: false });
      const result = service.analyze('session-1', 'report spam');
      expect(result).toBeNull();
    });

    it('should return null for benign message', () => {
      const result = service.analyze('session-1', 'Hello, how are you?');
      expect(result).toBeNull();
    });

    it('should detect spam report pattern', () => {
      const result = service.analyze('session-1', 'Your account has been reported as spam');
      expect(result).not.toBeNull();
      expect(result!.detected).toBe(true);
      expect(result!.type).toBe('spam_report');
      expect(result!.severity).toBe('high');
      expect(result!.confidence).toBeGreaterThan(0);
    });

    it('should detect block notice pattern', () => {
      const result = service.analyze('session-1', 'Your account has been blocked');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('block_notice');
      expect(result!.severity).toBe('critical');
    });

    it('should detect suspicious activity', () => {
      const result = service.analyze('session-1', 'Suspicious activity detected on your account');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('suspicious_activity');
      expect(result!.severity).toBe('medium');
    });

    it('should detect account warning', () => {
      const result = service.analyze('session-1', 'Warning: your account is at risk');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('account_warning');
      expect(result!.severity).toBe('high');
    });

    it('should detect via custom keywords even without pattern match', () => {
      const result = service.analyze('session-1', 'This is a report about something');
      expect(result).not.toBeNull();
      expect(result!.detected).toBe(true);
    });

    it('should escalate severity based on frequency', () => {
      service.analyze('session-1', 'report spam');
      service.analyze('session-1', 'report spam');
      const result = service.analyze('session-1', 'report spam');
      expect(result!.severity).toBe('critical');
      expect(result!.frequencyInWindow).toBe(3);
    });

    it('should store history entry', () => {
      service.analyze('session-1', 'reported as spam');
      const history = service.getHistory('session-1');
      expect(history.total).toBe(1);
      expect(history.entries[0].type).toBe('spam_report');
    });

    it('should include matched patterns in analysis', () => {
      const result = service.analyze('session-1', 'Your account has been reported as spam');
      expect(result!.matchedPatterns.length).toBeGreaterThan(0);
    });

    it('should match Spanish patterns', () => {
      const result = service.analyze('session-1', 'Tu cuenta ha sido bloqueada');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('block_notice');
    });
  });

  describe('getHistory', () => {
    it('should return recent window count', () => {
      service.analyze('session-1', 'report spam');
      service.analyze('session-1', 'account suspended');
      const history = service.getHistory('session-1');
      expect(history.total).toBe(2);
      expect(history.recentWindow).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return aggregated stats by type and severity', () => {
      service.analyze('session-1', 'reported as spam');
      service.analyze('session-1', 'Your account has been blocked');
      service.analyze('session-1', 'suspicious activity');

      const stats = service.getStats('session-1');
      expect(stats.total).toBe(3);
      expect(stats.byType.spam_report).toBe(1);
      expect(stats.byType.block_notice).toBe(1);
      expect(stats.byType.suspicious_activity).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all state for a session', () => {
      service.analyze('session-1', 'report spam');
      service.reset('session-1');

      const history = service.getHistory('session-1');
      expect(history.total).toBe(0);
    });
  });

  describe('per-session isolation', () => {
    it('should track sessions independently', () => {
      service.analyze('session-1', 'report spam');
      service.analyze('session-2', 'report spam');
      expect(service.getHistory('session-1').total).toBe(1);
      expect(service.getHistory('session-2').total).toBe(1);
    });
  });
});
