import { DataSource } from 'typeorm';

import databaseConfig from '../config/database.config';

const dataSource = new DataSource({
  ...databaseConfig(),
  entities: [],
  migrations: ['dist/database/migrations/*.js']
});

dataSource
  .initialize()
  .then(() => dataSource.runMigrations())
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Migrations executed successfully');
    return dataSource.destroy();
  })
  .catch(async (error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Failed to run migrations', error);
    await dataSource.destroy();
    process.exit(1);
  });
