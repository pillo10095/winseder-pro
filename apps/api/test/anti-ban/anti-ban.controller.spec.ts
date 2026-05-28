import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AntiBanController } from '@/modules/anti-ban/controllers/anti-ban.controller';
import { RateLimiterV2Service } from '@/modules/anti-ban/services/rate-limiter-v2.service';
import { AdaptiveDelayService } from '@/modules/anti-ban/services/adaptive-delay.service';
import { QuietHoursService } from '@/modules/anti-ban/services/quiet-hours.service';
import { DailyBudgetService } from '@/modules/anti-ban/services/daily-budget.service';
import { ReportDetectorService } from '@/modules/anti-ban/services/report-detector.service';
import { AutoPauseService } from '@/modules/anti-ban/services/auto-pause.service';
import { SessionClonerService } from '@/modules/anti-ban/services/session-cloner.service';
import { HealthMonitorService } from '@/modules/anti-ban/services/health-monitor.service';

const mockHealthStats = {
  sessionId: 'session-1',
  status: 'healthy',
  circuitState: 'closed',
  isConnected: true,
  totalSent: 100,
  totalFailed: 2,
  successRate: 98,
  consecutiveFailures: 0,
  consecutiveSuccesses: 10,
  lastSeen: Date.now(),
  lastError: null,
  lastErrorAt: null,
  registeredAt: Date.now(),
  avgLatency: 200,
  uptime: 3600000,
};

const mockDelayStats = {
  currentDelay: 2000,
  minDelay: 500,
  maxDelay: 15000,
  consecutiveFailures: 0,
  consecutiveSuccesses: 5,
  totalFailures: 0,
  totalSuccesses: 10,
  lastAdjustment: Date.now(),
  lastFailureAt: null,
  alertTriggered: false,
};

const mockBudget = {
  limit: 1000,
  consumed: 50,
  remaining: 950,
  usagePercent: 5,
  details: { text: 50 },
  resetAt: new Date(Date.now() + 86400000),
};

const mockRateStats = {
  tighteningLevel: 0,
  violations: 0,
  lastViolationAt: null,
};

function mockRequest(overrides: Partial<Request> & { companyId: string }): Request {
  return { ...overrides } as unknown as Request;
}

describe('AntiBanController', () => {
  let controller: AntiBanController;

  const mockRateLimiter = {
    getConfig: jest.fn(),
    setConfig: jest.fn(),
    getStats: jest.fn(),
  };

  const mockAdaptiveDelay = {
    getConfig: jest.fn(),
    setConfig: jest.fn(),
    getStats: jest.fn(),
  };

  const mockQuietHours = {
    getConfig: jest.fn(),
    setConfig: jest.fn(),
    isQuietHours: jest.fn(),
  };

  const mockDailyBudget = {
    getConfig: jest.fn(),
    setConfig: jest.fn(),
    getBudget: jest.fn(),
  };

  const mockReportDetector = {
    getConfig: jest.fn(),
    setConfig: jest.fn(),
    getHistory: jest.fn(),
    getStats: jest.fn(),
  };

  const mockAutoPause = {
    getConfig: jest.fn(),
    setConfig: jest.fn(),
    getAllPaused: jest.fn(),
    getPauseInfo: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  };

  const mockSessionCloner = {
    cloneSession: jest.fn(),
    getCloneableSessions: jest.fn(),
  };

  const mockHealthMonitor = {
    getAggregateHealth: jest.fn(),
    getSessionStats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AntiBanController],
      providers: [
        { provide: RateLimiterV2Service, useValue: mockRateLimiter },
        { provide: AdaptiveDelayService, useValue: mockAdaptiveDelay },
        { provide: QuietHoursService, useValue: mockQuietHours },
        { provide: DailyBudgetService, useValue: mockDailyBudget },
        { provide: ReportDetectorService, useValue: mockReportDetector },
        { provide: AutoPauseService, useValue: mockAutoPause },
        { provide: SessionClonerService, useValue: mockSessionCloner },
        { provide: HealthMonitorService, useValue: mockHealthMonitor },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<AntiBanController>(AntiBanController);
  });

  describe('getHealthOverview', () => {
    it('should return aggregate health with paused sessions', async () => {
      mockHealthMonitor.getAggregateHealth.mockReturnValue({
        total: 2,
        healthy: 1,
        degraded: 1,
        unhealthy: 0,
        totalSent: 100,
        totalFailed: 5,
        paused: 0,
      });
      mockAutoPause.getAllPaused.mockReturnValue([
        {
          sessionId: 'session-2',
          reason: 'Manual',
          pausedAt: Date.now(),
          autoResumeAt: null,
          resumedAt: null,
          triggeredBy: 'manual',
        },
      ]);

      const result = await controller.getHealthOverview();

      expect(result.data.total).toBe(2);
      expect(result.data.paused).toBe(1);
      expect(result.data.pausedSessions).toHaveLength(1);
      expect(result.data.pausedSessions[0].sessionId).toBe('session-2');
    });

    it('should return zero paused when none paused', async () => {
      mockHealthMonitor.getAggregateHealth.mockReturnValue({
        total: 1,
        healthy: 1,
        degraded: 0,
        unhealthy: 0,
        totalSent: 10,
        totalFailed: 0,
        paused: 0,
      });
      mockAutoPause.getAllPaused.mockReturnValue([]);

      const result = await controller.getHealthOverview();

      expect(result.data.paused).toBe(0);
      expect(result.data.pausedSessions).toEqual([]);
    });
  });

  describe('getSessionHealth', () => {
    it('should return full health for a registered session', async () => {
      mockHealthMonitor.getSessionStats.mockReturnValue(mockHealthStats);
      mockAdaptiveDelay.getStats.mockReturnValue(mockDelayStats);
      mockAutoPause.getPauseInfo.mockReturnValue({
        paused: false,
        reason: null,
        pausedAt: null,
        autoResumeAt: null,
        triggeredBy: null,
      });
      mockDailyBudget.getBudget.mockReturnValue(mockBudget);
      mockRateLimiter.getStats.mockReturnValue(mockRateStats);
      mockQuietHours.isQuietHours.mockReturnValue(false);

      const result = await controller.getSessionHealth('session-1');

      expect(result.data.health.status).toBe('healthy');
      expect(result.data.budget).toEqual({
        limit: 1000,
        consumed: 50,
        remaining: 950,
        usagePercent: 5,
      });
      expect(result.data.quietHours.isActive).toBe(false);
    });

    it('should return error for unregistered session', async () => {
      mockHealthMonitor.getSessionStats.mockReturnValue(null);

      const result = await controller.getSessionHealth('unknown');

      expect(result).toEqual({ error: 'Session not registered' });
    });
  });

  describe('getConfig', () => {
    it('should return all service configs', async () => {
      mockRateLimiter.getConfig.mockReturnValue({});
      mockAdaptiveDelay.getConfig.mockReturnValue({});
      mockQuietHours.getConfig.mockReturnValue({});
      mockDailyBudget.getConfig.mockReturnValue({});
      mockReportDetector.getConfig.mockReturnValue({});
      mockAutoPause.getConfig.mockReturnValue({});

      const result = await controller.getConfig('session-1');

      expect(result.data).toHaveProperty('rateLimiter');
      expect(result.data).toHaveProperty('adaptiveDelay');
      expect(result.data).toHaveProperty('quietHours');
      expect(result.data).toHaveProperty('dailyBudget');
      expect(result.data).toHaveProperty('reportDetector');
      expect(result.data).toHaveProperty('autoPause');
    });
  });

  describe('updateConfig', () => {
    const body = {
      rateLimiter: { tighteningFactor: 0.5 },
      quietHours: { enabled: false },
    };

    it('should update provided configs', async () => {
      const result = await controller.updateConfig('session-1', body);

      expect(result).toEqual({ data: { updated: true } });
      expect(mockRateLimiter.setConfig).toHaveBeenCalledWith('session-1', { tighteningFactor: 0.5 });
      expect(mockQuietHours.setConfig).toHaveBeenCalledWith('session-1', { enabled: false });
      expect(mockAdaptiveDelay.setConfig).not.toHaveBeenCalled();
    });

    it('should return updated true with empty body', async () => {
      const result = await controller.updateConfig('session-1', {});

      expect(result).toEqual({ data: { updated: true } });
    });
  });

  describe('pauseSession', () => {
    it('should pause with reason', async () => {
      const result = await controller.pauseSession('session-1', { reason: 'Testing' });

      expect(result).toEqual({ data: { paused: true } });
      expect(mockAutoPause.pause).toHaveBeenCalledWith('session-1', 'Testing', 'manual');
    });

    it('should pause with default reason', async () => {
      await controller.pauseSession('session-1', {});

      expect(mockAutoPause.pause).toHaveBeenCalledWith('session-1', 'Manually paused', 'manual');
    });
  });

  describe('resumeSession', () => {
    it('should return resumed true', async () => {
      mockAutoPause.resume.mockReturnValue(true);

      const result = await controller.resumeSession('session-1');

      expect(result).toEqual({ data: { resumed: true } });
    });

    it('should return resumed false when not paused', async () => {
      mockAutoPause.resume.mockReturnValue(false);

      const result = await controller.resumeSession('session-1');

      expect(result).toEqual({ data: { resumed: false } });
    });
  });

  describe('getBudget', () => {
    it('should return daily budget', async () => {
      mockDailyBudget.getBudget.mockReturnValue(mockBudget);

      const result = await controller.getBudget('session-1');

      expect(result).toEqual({ data: mockBudget });
    });
  });

  describe('getReportHistory', () => {
    it('should return report history', async () => {
      mockReportDetector.getHistory.mockReturnValue({
        total: 1,
        recentWindow: 0,
        entries: [],
      });

      const result = await controller.getReportHistory('session-1');

      expect(result.data.total).toBe(1);
    });
  });

  describe('getReportStats', () => {
    it('should return report stats', async () => {
      mockReportDetector.getStats.mockReturnValue({
        byType: { spam_report: 1 },
        bySeverity: { high: 1 },
        total: 1,
      });

      const result = await controller.getReportStats('session-1');

      expect(result.data.byType.spam_report).toBe(1);
    });
  });

  describe('cloneSession', () => {
    const req = mockRequest({ companyId: 'company-1' });

    it('should clone a session', async () => {
      const cloned = {
        id: 'clone-1',
        session_name: 'Session (Clone)',
        status: 'disconnected',
      };
      mockSessionCloner.cloneSession.mockResolvedValue(cloned);

      const result = await controller.cloneSession('session-1', req, { name: 'Clone' });

      expect(result).toEqual({ data: { id: 'clone-1', session_name: 'Session (Clone)', status: 'disconnected' } });
      expect(mockSessionCloner.cloneSession).toHaveBeenCalledWith('session-1', 'company-1', 'Clone');
    });

    it('should return error when clone fails', async () => {
      mockSessionCloner.cloneSession.mockRejectedValue(new Error('Source session not found'));

      const result = await controller.cloneSession('session-1', req, {});

      expect(result).toEqual({ error: 'Source session not found' });
    });

    it('should return generic error for non-Error throws', async () => {
      mockSessionCloner.cloneSession.mockRejectedValue('string error');

      const result = await controller.cloneSession('session-1', req, {});

      expect(result).toEqual({ error: 'Clone failed' });
    });
  });

  describe('getCloneableSessions', () => {
    const req = mockRequest({ companyId: 'company-1' });

    it('should return cloneable sessions', async () => {
      mockSessionCloner.getCloneableSessions.mockResolvedValue([
        { id: 's-1', session_name: 'S1', phone_number: '+521', status: 'connected' },
        { id: 's-2', session_name: 'S2', phone_number: '+522', status: 'disconnected' },
      ]);

      const result = await controller.getCloneableSessions(req);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].phone_number).toBe('+521');
      expect(mockSessionCloner.getCloneableSessions).toHaveBeenCalledWith('company-1');
    });

    it('should return empty array when none cloneable', async () => {
      mockSessionCloner.getCloneableSessions.mockResolvedValue([]);

      const result = await controller.getCloneableSessions(req);

      expect(result.data).toEqual([]);
    });
  });
});
