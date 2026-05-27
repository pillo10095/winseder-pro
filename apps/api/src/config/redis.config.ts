import { registerAs } from '@nestjs/config';
import type { BullRootModuleOptions } from '@nestjs/bullmq';

export type RedisConfig = BullRootModuleOptions;

export default registerAs('redis', (): RedisConfig => ({
  connection: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined
  },
  defaultJobOptions: {
    removeOnFail: false,
    removeOnComplete: true
  }
}));
