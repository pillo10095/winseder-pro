import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { BillingController } from '@/modules/admin/controllers/billing.controller';
import { SubscriptionService } from '@/modules/admin/services/subscription.service';
import { BillingService } from '@/modules/admin/services/billing.service';

function mockRequest(overrides?: Partial<Request>): Request {
  return {
    user: { id: 'admin-1' },
    ...overrides,
  } as unknown as Request;
}

describe('BillingController', () => {
  let controller: BillingController;

  const mockSubscriptionService = {
    listPlans: jest.fn(),
    getPlan: jest.fn(),
    createPlan: jest.fn(),
    updatePlan: jest.fn(),
    listSubscriptions: jest.fn(),
    assignPlan: jest.fn(),
    cancelSubscription: jest.fn(),
  };

  const mockBillingService = {
    isConfigured: true,
    createInvoice: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: BillingService, useValue: mockBillingService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<BillingController>(BillingController);
  });

  describe('listPlans', () => {
    it('should list active plans by default', async () => {
      mockSubscriptionService.listPlans.mockResolvedValue([{ id: 'plan-1', name: 'Pro' }]);

      const result = await controller.listPlans();

      expect(result).toEqual({ data: [{ id: 'plan-1', name: 'Pro' }] });
      expect(mockSubscriptionService.listPlans).toHaveBeenCalledWith(false);
    });

    it('should include inactive plans when query param is true', async () => {
      mockSubscriptionService.listPlans.mockResolvedValue([]);

      await controller.listPlans('true');

      expect(mockSubscriptionService.listPlans).toHaveBeenCalledWith(true);
    });
  });

  describe('getPlan', () => {
    it('should return a plan by id', async () => {
      mockSubscriptionService.getPlan.mockResolvedValue({ id: 'plan-1', name: 'Pro' });

      const result = await controller.getPlan('plan-1');

      expect(result).toEqual({ data: { id: 'plan-1', name: 'Pro' } });
    });
  });

  describe('createPlan', () => {
    const dto = { name: 'Basic', code: 'basic', price_mxn: 299 };
    const req = mockRequest();

    it('should create and return a plan', async () => {
      mockSubscriptionService.createPlan.mockResolvedValue({ id: 'plan-2', ...dto });

      const result = await controller.createPlan(dto, req);

      expect(result).toEqual({ data: { id: 'plan-2', ...dto } });
      expect(mockSubscriptionService.createPlan).toHaveBeenCalledWith(dto, 'admin-1');
    });
  });

  describe('updatePlan', () => {
    const dto = { price_mxn: 399 };
    const req = mockRequest();

    it('should update and return the plan', async () => {
      mockSubscriptionService.updatePlan.mockResolvedValue({ id: 'plan-1', ...dto });

      const result = await controller.updatePlan('plan-1', dto, req);

      expect(result).toEqual({ data: { id: 'plan-1', ...dto } });
      expect(mockSubscriptionService.updatePlan).toHaveBeenCalledWith('plan-1', dto, 'admin-1');
    });
  });

  describe('listSubscriptions', () => {
    it('should list subscriptions with filters', async () => {
      mockSubscriptionService.listSubscriptions.mockResolvedValue({
        items: [{ id: 'sub-1' }],
        total: 1,
      });

      const result = await controller.listSubscriptions('10', '0', 'active', 'company-1');

      expect(result.data.items).toHaveLength(1);
      expect(mockSubscriptionService.listSubscriptions).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        status: 'active',
        companyId: 'company-1',
      });
    });

    it('should handle missing query params', async () => {
      mockSubscriptionService.listSubscriptions.mockResolvedValue({ items: [], total: 0 });

      await controller.listSubscriptions();

      expect(mockSubscriptionService.listSubscriptions).toHaveBeenCalledWith({
        limit: undefined,
        offset: undefined,
        status: undefined,
        companyId: undefined,
      });
    });
  });

  describe('assignPlan', () => {
    const body = { company_id: 'company-1', plan_id: 'plan-1', trial_days: 14 };
    const req = mockRequest();

    it('should assign a plan to a company', async () => {
      mockSubscriptionService.assignPlan.mockResolvedValue({ id: 'sub-2' });

      const result = await controller.assignPlan(body, req);

      expect(result).toEqual({ data: { id: 'sub-2' } });
      expect(mockSubscriptionService.assignPlan).toHaveBeenCalledWith(
        { company_id: 'company-1', plan_id: 'plan-1', trial_days: 14, status: undefined },
        'admin-1',
      );
    });
  });

  describe('cancelSubscription', () => {
    const req = mockRequest();

    it('should cancel a subscription', async () => {
      mockSubscriptionService.cancelSubscription.mockResolvedValue({
        id: 'sub-1',
        status: 'cancelled',
      });

      const result = await controller.cancelSubscription('sub-1', req);

      expect(result).toEqual({ data: { id: 'sub-1', status: 'cancelled' } });
      expect(mockSubscriptionService.cancelSubscription).toHaveBeenCalledWith('sub-1', 'admin-1');
    });
  });

  describe('getBillingStatus', () => {
    it('should return billing status', async () => {
      const result = await controller.getBillingStatus();

      expect(result).toEqual({
        data: { configured: true, provider: 'conekta' },
      });
    });
  });

  describe('createInvoice', () => {
    const body = { customer_id: 'cus-1', amount: 500, description: 'Monthly' };

    it('should create and return an invoice', async () => {
      mockBillingService.createInvoice.mockResolvedValue({
        id: 'inv-1',
        customerId: 'cus-1',
        amount: 500,
        currency: 'MXN',
        status: 'paid',
        description: 'Monthly',
        paid_at: new Date().toISOString(),
      });

      const result = await controller.createInvoice(body);

      expect(result.data.status).toBe('paid');
      expect(mockBillingService.createInvoice).toHaveBeenCalledWith('cus-1', 500, 'Monthly');
    });
  });
});
