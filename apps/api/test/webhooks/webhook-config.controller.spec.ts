import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { WebhookConfigController } from '@/modules/webhooks/controllers/webhook-config.controller';
import { WebhookConfigRepository } from '@/modules/webhooks/repositories/webhook-config.repository';

describe('WebhookConfigController', () => {
  let controller: WebhookConfigController;
  let webhookRepo: any;

  const mockWebhookRepo = {
    find: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookConfigController],
      providers: [
        { provide: WebhookConfigRepository, useValue: mockWebhookRepo },
      ],
    }).compile();

    controller = module.get<WebhookConfigController>(WebhookConfigController);
    webhookRepo = module.get<WebhookConfigRepository>(WebhookConfigRepository);

    jest.clearAllMocks();
  });

  describe('GET /webhook-configs', () => {
    it('should return all webhook configs', async () => {
      const configs = [
        { id: 'wh-1', url: 'https://example.com/hook', events: ['message.new'], is_active: true },
      ];
      mockWebhookRepo.find.mockResolvedValue(configs);

      const result = await controller.findAll();

      expect(webhookRepo.find).toHaveBeenCalled();
      expect(result).toEqual(configs);
    });

    it('should return empty list when none exist', async () => {
      mockWebhookRepo.find.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('GET /webhook-configs/:id', () => {
    it('should return a single webhook config', async () => {
      const config = { id: 'wh-1', url: 'https://example.com/hook', events: ['message.new'] };
      mockWebhookRepo.findOneOrFail.mockResolvedValue(config);

      const result = await controller.findOne('wh-1');

      expect(webhookRepo.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'wh-1' } });
      expect(result).toEqual(config);
    });

    it('should throw when not found', async () => {
      mockWebhookRepo.findOneOrFail.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('wh-404')).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /webhook-configs', () => {
    it('should create a webhook config', async () => {
      const dto = { url: 'https://example.com/hook', events: ['message.new'] };
      const created = { id: 'wh-1', ...dto, is_active: true };
      mockWebhookRepo.create.mockReturnValue(created);
      mockWebhookRepo.save.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(webhookRepo.create).toHaveBeenCalledWith(dto);
      expect(webhookRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('PATCH /webhook-configs/:id', () => {
    it('should update and return the webhook config', async () => {
      const dto = { is_active: false };
      const updated = { id: 'wh-1', url: 'https://example.com/hook', events: ['message.new'], is_active: false };
      mockWebhookRepo.update.mockResolvedValue(undefined);
      mockWebhookRepo.findOneOrFail.mockResolvedValue(updated);

      const result = await controller.update('wh-1', dto);

      expect(webhookRepo.update).toHaveBeenCalledWith('wh-1', dto);
      expect(webhookRepo.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'wh-1' } });
      expect(result).toEqual(updated);
    });

    it('should throw when updating non-existent config', async () => {
      mockWebhookRepo.update.mockResolvedValue(undefined);
      mockWebhookRepo.findOneOrFail.mockRejectedValue(new NotFoundException());

      await expect(controller.update('wh-404', { is_active: false })).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /webhook-configs/:id', () => {
    it('should delete a webhook config', async () => {
      mockWebhookRepo.delete.mockResolvedValue({ affected: 1 });

      await controller.remove('wh-1');

      expect(webhookRepo.delete).toHaveBeenCalledWith('wh-1');
    });
  });
});
