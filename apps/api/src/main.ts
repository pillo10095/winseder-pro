import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 4000);
  const globalPrefix = config.get<string>('app.globalPrefix', 'api');

  app.setGlobalPrefix(globalPrefix);

  // ── Global pipes ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ── Global filters ──
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Global interceptors ──
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // ── Swagger (requires @nestjs/swagger installed) ──
  try {
    const { setupSwagger } = await import('./swagger-setup');
    setupSwagger(app);
    Logger.log('📖 Swagger docs at /api/docs');
  } catch {
    Logger.warn('Swagger not available — install @nestjs/swagger to enable');
  }

  await app.listen(port);

  Logger.log(`🚀 Wisender API running at http://localhost:${port}/${globalPrefix}`);
  Logger.log(`🔒 Environment: ${process.env.NODE_ENV ?? 'development'}`);
}

void bootstrap();
