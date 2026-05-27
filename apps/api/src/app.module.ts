import { resolve } from 'node:path';

import { BullModule, type BullRootModuleOptions } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import validationSchema from './config/validation.schema';
import { CommonModule } from './common/common.module';
import { TenancyMiddleware } from './common/middleware/tenancy.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { HealthModule } from './health/health.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { MediaModule } from './modules/media/media.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

/**
 * AppModule centraliza la infraestructura transversal del backend.
 *
 * - ConfigModule expone una capa tipada de variables de entorno.
 * - TypeOrmModule conecta con MySQL usando la configuración definida.
 * - BullModule registra Redis como backend de colas BullMQ.
 * - HealthModule publica /health para chequeos externos y balanceadores.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(process.cwd(), '../../.env'),
      load: [appConfig, databaseConfig, redisConfig],
      validationSchema,
      cache: true
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow<TypeOrmModuleOptions>('database')
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow<BullRootModuleOptions>('redis')
    }),
    EventEmitterModule.forRoot(),
    CommonModule,
    TenancyModule,
    AuthModule,
    HealthModule,
    WhatsAppModule,
    MediaModule,
    ChatbotModule,
    InboxModule,
    WebhooksModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenancyMiddleware).forRoutes('*');
  }
}
