import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from './entities/company.entity';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Plan, Subscription])],
  exports: [TypeOrmModule],
})
export class TenancyModule {}
