import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

config({ path: resolve(__dirname, '../../../.env') });

import databaseConfig from './config/database.config';
import { Permission } from './modules/auth/entities/permission.entity';
import { User } from './modules/auth/entities/user.entity';
import { Company } from './modules/tenancy/entities/company.entity';
import { Plan } from './modules/tenancy/entities/plan.entity';
import { Subscription } from './modules/tenancy/entities/subscription.entity';
import { seedAdmin } from './seeds/seed.admin';
import { seedPlans } from './seeds/seed.plans';

async function main(): Promise<void> {
  const dataSource = new DataSource({
    ...databaseConfig(),
    entities: [Company, Plan, Subscription, User, Permission],
  });

  await dataSource.initialize();

  await seedPlans(dataSource);
  await seedAdmin(dataSource);

  await dataSource.destroy();
}

main().catch((err: unknown) => {
  console.error('Seed failed', err);
  process.exit(1);
});
