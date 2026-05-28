import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Session } from '../whatsapp/entities/session.entity';
import { SessionRepository } from '../whatsapp/repositories/session.repository';

import { AntiBanController } from './controllers/anti-ban.controller';

import { RateLimiterV2Service } from './services/rate-limiter-v2.service';
import { AdaptiveDelayService } from './services/adaptive-delay.service';
import { QuietHoursService } from './services/quiet-hours.service';
import { DailyBudgetService } from './services/daily-budget.service';
import { ReportDetectorService } from './services/report-detector.service';
import { AutoPauseService } from './services/auto-pause.service';
import { SessionClonerService } from './services/session-cloner.service';
import { ProxyRotatorService } from './services/proxy-rotator.service';
import { HealthMonitorService } from './services/health-monitor.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Session])],
  controllers: [AntiBanController],
  providers: [
    SessionRepository,
    RateLimiterV2Service,
    AdaptiveDelayService,
    QuietHoursService,
    DailyBudgetService,
    ReportDetectorService,
    AutoPauseService,
    SessionClonerService,
    ProxyRotatorService,
    HealthMonitorService,
  ],
  exports: [
    RateLimiterV2Service,
    AdaptiveDelayService,
    DailyBudgetService,
    AutoPauseService,
    SessionClonerService,
    HealthMonitorService,
  ],
})
export class AntiBanModule {}
