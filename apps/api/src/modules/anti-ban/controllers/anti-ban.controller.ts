import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RateLimiterV2Service } from '../services/rate-limiter-v2.service';
import { AdaptiveDelayService } from '../services/adaptive-delay.service';
import { QuietHoursService } from '../services/quiet-hours.service';
import { DailyBudgetService } from '../services/daily-budget.service';
import { ReportDetectorService } from '../services/report-detector.service';
import { AutoPauseService } from '../services/auto-pause.service';
import { SessionClonerService } from '../services/session-cloner.service';
import { HealthMonitorService } from '../services/health-monitor.service';

@Controller('anti-ban')
@UseGuards(JwtAuthGuard)
export class AntiBanController {
  constructor(
    private readonly rateLimiter: RateLimiterV2Service,
    private readonly adaptiveDelay: AdaptiveDelayService,
    private readonly quietHours: QuietHoursService,
    private readonly dailyBudget: DailyBudgetService,
    private readonly reportDetector: ReportDetectorService,
    private readonly autoPause: AutoPauseService,
    private readonly sessionCloner: SessionClonerService,
    private readonly healthMonitor: HealthMonitorService,
  ) {}

  /* ───── Health ───── */

  @Get('health')
  async getHealthOverview() {
    const aggregate = this.healthMonitor.getAggregateHealth();
    const pausedSessions = this.autoPause.getAllPaused();
    return {
      data: {
        ...aggregate,
        paused: pausedSessions.length,
        pausedSessions: pausedSessions.map((p) => ({
          sessionId: p.sessionId,
          reason: p.reason,
          pausedAt: p.pausedAt,
          autoResumeAt: p.autoResumeAt,
        })),
      },
    };
  }

  @Get('health/:sessionId')
  async getSessionHealth(
    @Param('sessionId') sessionId: string,
  ) {
    const stats = this.healthMonitor.getSessionStats(sessionId);
    if (!stats) return { error: 'Session not registered' };

    const delayStats = this.adaptiveDelay.getStats(sessionId);
    const pauseInfo = this.autoPause.getPauseInfo(sessionId);
    const budget = this.dailyBudget.getBudget(sessionId);
    const rateStats = this.rateLimiter.getStats(sessionId);
    const quiet = this.quietHours.isQuietHours(sessionId);

    return {
      data: {
        health: stats,
        delay: delayStats,
        pause: pauseInfo,
        budget: {
          limit: budget.limit,
          consumed: budget.consumed,
          remaining: budget.remaining,
          usagePercent: budget.usagePercent,
        },
        rateLimiter: {
          tighteningLevel: rateStats.tighteningLevel,
          violations: rateStats.violations,
          lastViolationAt: rateStats.lastViolationAt,
        },
        quietHours: { isActive: quiet },
      },
    };
  }

  /* ───── Config ───── */

  @Get('config/:sessionId')
  async getConfig(@Param('sessionId') sessionId: string) {
    return {
      data: {
        rateLimiter: this.rateLimiter.getConfig(sessionId),
        adaptiveDelay: this.adaptiveDelay.getConfig(sessionId),
        quietHours: this.quietHours.getConfig(sessionId),
        dailyBudget: this.dailyBudget.getConfig(sessionId),
        reportDetector: this.reportDetector.getConfig(sessionId),
        autoPause: this.autoPause.getConfig(sessionId),
      },
    };
  }

  @Put('config/:sessionId')
  async updateConfig(
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      rateLimiter?: Record<string, unknown>;
      adaptiveDelay?: Record<string, unknown>;
      quietHours?: Record<string, unknown>;
      dailyBudget?: Record<string, unknown>;
      reportDetector?: Record<string, unknown>;
      autoPause?: Record<string, unknown>;
    },
  ) {
    if (body.rateLimiter) this.rateLimiter.setConfig(sessionId, body.rateLimiter as Record<string, unknown>);
    if (body.adaptiveDelay) this.adaptiveDelay.setConfig(sessionId, body.adaptiveDelay as Record<string, unknown>);
    if (body.quietHours) this.quietHours.setConfig(sessionId, body.quietHours as Record<string, unknown>);
    if (body.dailyBudget) this.dailyBudget.setConfig(sessionId, body.dailyBudget as Record<string, unknown>);
    if (body.reportDetector) this.reportDetector.setConfig(sessionId, body.reportDetector as Record<string, unknown>);
    if (body.autoPause) this.autoPause.setConfig(sessionId, body.autoPause as Record<string, unknown>);

    return { data: { updated: true } };
  }

  /* ───── Pause / Resume ───── */

  @Post(':sessionId/pause')
  async pauseSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { reason?: string },
  ) {
    this.autoPause.pause(sessionId, body.reason ?? 'Manually paused', 'manual');
    return { data: { paused: true } };
  }

  @Post(':sessionId/resume')
  async resumeSession(@Param('sessionId') sessionId: string) {
    const resumed = this.autoPause.resume(sessionId);
    return { data: { resumed } };
  }

  /* ───── Budget ───── */

  @Get('budget/:sessionId')
  async getBudget(@Param('sessionId') sessionId: string) {
    return { data: this.dailyBudget.getBudget(sessionId) };
  }

  /* ───── Reports ───── */

  @Get('reports/:sessionId')
  async getReportHistory(@Param('sessionId') sessionId: string) {
    return { data: this.reportDetector.getHistory(sessionId) };
  }

  @Get('reports/:sessionId/stats')
  async getReportStats(@Param('sessionId') sessionId: string) {
    return { data: this.reportDetector.getStats(sessionId) };
  }

  /* ───── Session Cloner ───── */

  @Post('clone/:sessionId')
  async cloneSession(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Body() body: { name?: string },
  ) {
    try {
      const cloned = await this.sessionCloner.cloneSession(
        sessionId,
        req.companyId!,
        body.name,
      );
      return {
        data: {
          id: cloned.id,
          session_name: cloned.session_name,
          status: cloned.status,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Clone failed';
      return { error: message };
    }
  }

  @Get('cloneable')
  async getCloneableSessions(@Req() req: Request) {
    const sessions = await this.sessionCloner.getCloneableSessions(req.companyId!);
    return {
      data: sessions.map((s) => ({
        id: s.id,
        session_name: s.session_name,
        phone_number: s.phone_number,
        status: s.status,
      })),
    };
  }
}
