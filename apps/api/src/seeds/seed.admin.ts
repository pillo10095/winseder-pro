import { randomBytes, scryptSync } from 'node:crypto';

import { DataSource } from 'typeorm';

import { User, UserRole } from '../modules/auth/entities/user.entity';
import { Company } from '../modules/tenancy/entities/company.entity';
import { Plan } from '../modules/tenancy/entities/plan.entity';
import { Subscription, SubscriptionStatus } from '../modules/tenancy/entities/subscription.entity';

function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const ADMIN_EMAIL = 'admin@wisender.pro';
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? 'Admin123!';

export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const existing = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });
  if (existing) return;

  const companyRepo = dataSource.getRepository(Company);
  const company = await companyRepo.save(
    companyRepo.create({
      name: 'Wisender Admin',
      slug: 'wisender-admin',
      is_active: true,
    }),
  );

  await userRepo.save(
    userRepo.create({
      company_id: company.id,
      email: ADMIN_EMAIL,
      password_hash: hashPassword(ADMIN_PASSWORD),
      name: 'Wisender Admin',
      role: UserRole.SUPERADMIN,
      is_active: true,
    }),
  );

  const planRepo = dataSource.getRepository(Plan);
  const enterprisePlan = await planRepo.findOne({ where: { code: 'enterprise' } });
  if (enterprisePlan) {
    const subscriptionRepo = dataSource.getRepository(Subscription);
    await subscriptionRepo.save(
      subscriptionRepo.create({
        company_id: company.id,
        plan_id: enterprisePlan.id,
        status: SubscriptionStatus.ACTIVE,
        starts_at: new Date(),
      }),
    );
  }
}
