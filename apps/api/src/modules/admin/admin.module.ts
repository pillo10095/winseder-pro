import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { Session } from '../whatsapp/entities/session.entity';
import { Message } from '../whatsapp/entities/message.entity';
import { User } from '../auth/entities/user.entity';
import { Company } from '../tenancy/entities/company.entity';
import { Plan } from '../tenancy/entities/plan.entity';
import { Subscription } from '../tenancy/entities/subscription.entity';
import { AuditLog } from './entities/audit-log.entity';

import { SuperAdminController } from './controllers/superadmin.controller';
import { BillingController } from './controllers/billing.controller';

import { SuperAdminService } from './services/superadmin.service';
import { AuditLogService } from './services/audit-log.service';
import { SubscriptionService } from './services/subscription.service';
import { BillingService } from './services/billing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Company,
      Plan,
      Subscription,
      Session,
      Message,
      AuditLog,
    ]),
    AuthModule,
    TenancyModule,
  ],
  controllers: [SuperAdminController, BillingController],
  providers: [
    SuperAdminService,
    AuditLogService,
    SubscriptionService,
    BillingService,
  ],
  exports: [AuditLogService],
})
export class AdminModule {}
