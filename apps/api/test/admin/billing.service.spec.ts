import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { BillingService } from '@/modules/admin/services/billing.service';

describe('BillingService', () => {
  let service: BillingService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('when CONEKTA_API_KEY is not configured', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'CONEKTA_API_KEY') return defaultValue ?? '';
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BillingService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<BillingService>(BillingService);
      configService = module.get<ConfigService>(ConfigService);
    });

    it('should have isConfigured = false', () => {
      expect(service.isConfigured).toBe(false);
    });

    it('createCustomer should return stub response', async () => {
      const result = await service.createCustomer('company-1', 'Test Co', 'test@co.com');

      expect(result).toEqual({
        id: 'cus_stub_company-1',
        companyId: 'company-1',
        name: 'Test Co',
        email: 'test@co.com',
      });
    });

    it('createInvoice should return stub response', async () => {
      const result = await service.createInvoice('cus_1', 50000, 'Subscription');

      expect(result.customerId).toBe('cus_1');
      expect(result.amount).toBe(50000);
      expect(result.currency).toBe('MXN');
      expect(result.status).toBe('paid');
      expect(result.description).toBe('Subscription');
      expect(result.id).toContain('inv_stub_');
    });

    it('charge should return stub response', async () => {
      const result = await service.charge('cus_1', 50000, 'Charge test');

      expect(result.customerId).toBe('cus_1');
      expect(result.amount).toBe(50000);
      expect(result.currency).toBe('MXN');
      expect(result.status).toBe('succeeded');
      expect(result.id).toContain('ch_stub_');
    });

    it('getPaymentMethods should return empty array', async () => {
      const result = await service.getPaymentMethods('cus_1');

      expect(result).toEqual([]);
    });
  });

  describe('when CONEKTA_API_KEY is configured', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'CONEKTA_API_KEY') return 'sk_test_123456';
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BillingService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<BillingService>(BillingService);
    });

    it('should have isConfigured = true', () => {
      expect(service.isConfigured).toBe(true);
    });

    it('createCustomer should throw not implemented error', async () => {
      await expect(service.createCustomer('c1', 'N', 'e@e.com')).rejects.toThrow(
        'Conekta integration not yet implemented',
      );
    });

    it('createInvoice should throw not implemented error', async () => {
      await expect(service.createInvoice('c1', 100, 'desc')).rejects.toThrow(
        'Conekta integration not yet implemented',
      );
    });

    it('charge should throw not implemented error', async () => {
      await expect(service.charge('c1', 100, 'desc')).rejects.toThrow(
        'Conekta integration not yet implemented',
      );
    });

    it('getPaymentMethods should throw not implemented error', async () => {
      await expect(service.getPaymentMethods('c1')).rejects.toThrow(
        'Conekta integration not yet implemented',
      );
    });
  });
});
