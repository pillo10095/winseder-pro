import { DataSource, In } from 'typeorm';

import { Plan } from '../modules/tenancy/entities/plan.entity';

const PLANS_SEED = [
  {
    name: 'Free',
    code: 'free',
    description: 'Plan básico para agentes individuales',
    price_mxn: 0,
    max_contacts: 100,
    max_whatsapp_sessions: 1,
    max_campaigns_per_month: 0,
    features: ['basic_crm', 'basic_reports'],
  },
  {
    name: 'Starter',
    code: 'starter',
    description: 'Herramientas esenciales para equipos pequeños',
    price_mxn: 299,
    max_contacts: 1000,
    max_whatsapp_sessions: 3,
    max_campaigns_per_month: 50,
    features: ['basic_crm', 'advanced_reports', 'campaigns', 'api_access'],
  },
  {
    name: 'Professional',
    code: 'professional',
    description: 'Solución completa para negocios en crecimiento',
    price_mxn: 799,
    max_contacts: 5000,
    max_whatsapp_sessions: 10,
    max_campaigns_per_month: -1,
    features: [
      'basic_crm',
      'advanced_reports',
      'campaigns',
      'api_access',
      'priority_support',
      'custom_fields',
    ],
  },
  {
    name: 'Enterprise',
    code: 'enterprise',
    description: 'Solución personalizada para grandes organizaciones',
    price_mxn: 0,
    max_contacts: -1,
    max_whatsapp_sessions: -1,
    max_campaigns_per_month: -1,
    features: [
      'basic_crm',
      'advanced_reports',
      'campaigns',
      'api_access',
      'dedicated_support',
      'custom_fields',
      'sla',
    ],
  },
];

export async function seedPlans(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Plan);
  const codes = PLANS_SEED.map((p) => p.code);
  const existing = await repo.find({ where: { code: In(codes) } });
  const existingCodes = new Set(existing.map((p) => p.code));

  for (const planData of PLANS_SEED) {
    if (!existingCodes.has(planData.code)) {
      await repo.save(repo.create(planData));
    }
  }
}
