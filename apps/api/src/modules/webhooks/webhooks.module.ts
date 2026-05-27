import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WebhookConfig } from './entities/webhook-config.entity';
import { WebhookConfigRepository } from './repositories/webhook-config.repository';
import { WebhookSignatureService } from './services/webhook-signature.service';
import { WebhookDeliveryService } from './services/webhook-delivery.service';
import { WebhookEventBusService } from './services/webhook-event-bus.service';
import { WebhookConfigController } from './controllers/webhook-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookConfig])],
  controllers: [WebhookConfigController],
  providers: [
    WebhookConfigRepository,
    WebhookSignatureService,
    WebhookDeliveryService,
    WebhookEventBusService,
  ],
  exports: [WebhookConfigRepository],
})
export class WebhooksModule {}
