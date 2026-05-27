import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 4000);
  const globalPrefix = config.get<string>('app.globalPrefix', 'api');

  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  await app.listen(port);

  Logger.log(`🚀 Wisender API running at http://localhost:${port}/${globalPrefix}`);
}

void bootstrap();
