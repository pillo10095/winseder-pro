import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { UserRole } from '../../auth/entities/user.entity';
import { SubscriptionStatus } from '../../tenancy/entities/subscription.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SubscriptionService, CreatePlanDto, UpdatePlanDto } from '../services/subscription.service';
import { BillingService } from '../services/billing.service';

@Controller('admin/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class BillingController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly billingService: BillingService,
  ) {}

  /* ───── Plans ───── */

  @Get('plans')
  async listPlans(@Query('include_inactive') includeInactive?: string) {
    const plans = await this.subscriptionService.listPlans(includeInactive === 'true');
    return { data: plans };
  }

  @Get('plans/:planId')
  async getPlan(@Param('planId') planId: string) {
    const plan = await this.subscriptionService.getPlan(planId);
    return { data: plan };
  }

  @Post('plans')
  async createPlan(@Body() dto: CreatePlanDto, @Req() req: Request) {
    const plan = await this.subscriptionService.createPlan(dto, req.user!.id);
    return { data: plan };
  }

  @Put('plans/:planId')
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
    @Req() req: Request,
  ) {
    const plan = await this.subscriptionService.updatePlan(planId, dto, req.user!.id);
    return { data: plan };
  }

  /* ───── Subscriptions ───── */

  @Get('subscriptions')
  async listSubscriptions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('company_id') companyId?: string,
  ) {
    const result = await this.subscriptionService.listSubscriptions({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      status: status as SubscriptionStatus,
      companyId,
    });
    return { data: result };
  }

  @Post('subscriptions')
  async assignPlan(@Body() body: { company_id: string; plan_id: string; trial_days?: number }, @Req() req: Request) {
    const sub = await this.subscriptionService.assignPlan(
      { ...body, status: undefined },
      req.user!.id,
    );
    return { data: sub };
  }

  @Post('subscriptions/:subscriptionId/cancel')
  async cancelSubscription(@Param('subscriptionId') subscriptionId: string, @Req() req: Request) {
    const result = await this.subscriptionService.cancelSubscription(subscriptionId, req.user!.id);
    return { data: result };
  }

  /* ───── Billing ───── */

  @Get('status')
  async getBillingStatus() {
    return {
      data: {
        configured: this.billingService.isConfigured,
        provider: 'conekta',
      },
    };
  }

  @Post('invoice')
  async createInvoice(
    @Body() body: { customer_id: string; amount: number; description: string },
  ) {
    const invoice = await this.billingService.createInvoice(
      body.customer_id,
      body.amount,
      body.description,
    );
    return { data: invoice };
  }
}
