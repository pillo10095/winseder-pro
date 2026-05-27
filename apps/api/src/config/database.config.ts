import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export type DatabaseConfig = DataSourceOptions & Record<string, unknown>;

export default registerAs(
  'database',
  (): DatabaseConfig =>
    ({
      type: 'mysql',
      host: process.env.MYSQL_HOST ?? 'localhost',
      port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
      username: process.env.MYSQL_USER ?? 'root',
      password: process.env.MYSQL_PASSWORD ?? 'carlos12',
      database: process.env.MYSQL_DATABASE ?? 'wisender_pro',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.TYPEORM_LOGGING === 'true',
      migrationsRun: false,
      migrations: ['dist/database/migrations/*.js']
    }) as DatabaseConfig
);
