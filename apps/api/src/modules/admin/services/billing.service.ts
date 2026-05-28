import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * BillingService — integración con Conekta.
 *
 * Por ahora implementa un placeholder. Cuando se configure una API key
 * de Conekta real, se activarán los endpoints de pago.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly apiKey: string | null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CONEKTA_API_KEY', '');
    if (!this.apiKey) {
      this.logger.warn('CONEKTA_API_KEY not configured — billing operations are stubs');
    }
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Create a Conekta customer for a company.
   */
  async createCustomer(companyId: string, name: string, email: string) {
    if (!this.isConfigured) {
      this.logger.log(`[Stub] createCustomer: ${companyId} (${name})`);
      return { id: `cus_stub_${companyId}`, companyId, name, email };
    }

    // Real Conekta integration would go here
    throw new Error('Conekta integration not yet implemented');
  }

  /**
   * Create a subscription invoice.
   */
  async createInvoice(customerId: string, amountMxn: number, description: string) {
    if (!this.isConfigured) {
      this.logger.log(`[Stub] createInvoice: ${customerId} — $${amountMxn} MXN`);
      return {
        id: `inv_stub_${Date.now()}`,
        customerId,
        amount: amountMxn,
        currency: 'MXN',
        status: 'paid',
        description,
        paid_at: new Date().toISOString(),
      };
    }

    throw new Error('Conekta integration not yet implemented');
  }

  /**
   * Charge a saved payment method.
   */
  async charge(customerId: string, amountMxn: number, description: string) {
    if (!this.isConfigured) {
      this.logger.log(`[Stub] charge: ${customerId} — $${amountMxn} MXN`);
      return {
        id: `ch_stub_${Date.now()}`,
        customerId,
        amount: amountMxn,
        currency: 'MXN',
        status: 'succeeded',
        description,
        charged_at: new Date().toISOString(),
      };
    }

    throw new Error('Conekta integration not yet implemented');
  }

  /**
   * Get payment methods for a customer.
   */
  async getPaymentMethods(_customerId: string) {
    if (!this.isConfigured) {
      return [];
    }

    throw new Error('Conekta integration not yet implemented');
  }
}
