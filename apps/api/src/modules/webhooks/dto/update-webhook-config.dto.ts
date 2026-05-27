import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhookConfigDto } from './create-webhook-config.dto';

export class UpdateWebhookConfigDto extends PartialType(CreateWebhookConfigDto) {}
