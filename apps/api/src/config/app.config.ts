import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  globalPrefix: string;
  environment: string;
}

export default registerAs('app', (): AppConfig => ({
  port: parseInt(process.env.API_PORT ?? '4000', 10),
  globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
  environment: process.env.NODE_ENV ?? 'development'
}));
