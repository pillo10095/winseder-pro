import { Test, type TestingModule } from '@nestjs/testing';
import { Request } from 'express';

import { WebhookController } from '@/modules/whatsapp/controllers/webhook.controller';

describe('WebhookController', () => {
  let controller: WebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
  });

  describe('POST /whatsapp/webhook', () => {
    it('should return ok status for any payload', async () => {
      const req = { body: { event: 'message', data: { text: 'Hello' } } } as Request;

      const result = await controller.handleWebhook(req);

      expect(result).toEqual({ status: 'ok' });
    });

    it('should handle empty body', async () => {
      const req = { body: {} } as Request;

      const result = await controller.handleWebhook(req);

      expect(result).toEqual({ status: 'ok' });
    });

    it('should handle missing body', async () => {
      const req = {} as Request;

      const result = await controller.handleWebhook(req);

      expect(result).toEqual({ status: 'ok' });
    });
  });
});
