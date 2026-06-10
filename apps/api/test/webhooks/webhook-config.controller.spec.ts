import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { WebhookConfigController } from '@/modules/webhooks/controllers/webhook-config.controller';
import { WebhookConfigRepository } from '@/modules/webhooks/repositories/webhook-config.repository';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

describe('WebhookConfigController', () => {
  let controller: WebhookConfigController;
  let webhookRepo: any;

  const mockWebhookRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const companyId = 'company-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookConfigController],
      providers: [
        { provide: WebhookConfigRepository, useValue: mockWebhookRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WebhookConfigController>(WebhookConfigController);
    webhookRepo = module.get<WebhookConfigRepository>(WebhookConfigRepository);

    jest.clearAllMocks();
  });

  describe('GET /webhook-configs', () => {
    it('should return all webhook configs for the company', async () => {
      const configs = [
        { id: 'wh-1', url: 'https://example.com/hook', events: ['message.new'], is_active: true },
      ];
      mockWebhookRepo.find.mockResolvedValue(configs);

      const result = await controller.findAll(companyId);

      expect(webhookRepo.find).toHaveBeenCalledWith({ where: { company_id: 'company-1' } });
      expect(result).toEqual(configs);
    });

    it('should return empty list when none exist', async () => {
      mockWebhookRepo.find.mockResolvedValue([]);

      const result = await controller.findAll(companyId);

      expect(result).toEqual([]);
    });
  });

  describe('GET /webhook-configs/:id', () => {
    it('should return a single webhook config owned by the company', async () => {
      const config = { id: 'wh-1', url: 'https://example.com/hook', events: ['message.new'] };
      mockWebhookRepo.findOne.mockResolvedValue(config);

      const result = await controller.findOne('wh-1', companyId);

      expect(webhookRepo.findOne).toHaveBeenCalledWith({ where: { id: 'wh-1', company_id: 'company-1' } });
      expect(result).toEqual(config);
    });

    it('should throw when not found', async () => {
      mockWebhookRepo.findOne.mockResolvedValue(null);

      await expect(controller.findOne('wh-404', companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /webhook-configs', () => {
    it('should create a webhook config for the company', async () => {
      const dto = { url: 'https://example.com/hook', events: ['message.new'] };
      const created = { id: 'wh-1', ...dto, is_active: true };
      mockWebhookRepo.create.mockReturnValue(created);
      mockWebhookRepo.save.mockResolvedValue(created);

      const result = await controller.create(dto, companyId);

      expect(webhookRepo.create).toHaveBeenCalledWith({ ...dto, company_id: 'company-1' });
      expect(webhookRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('PATCH /webhook-configs/:id', () => {
    it('should update and return the webhook config', async () => {
      const dto = { is_active: false };
      const updated = { id: 'wh-1', url: 'https://example.com/hook', events: ['message.new'], company_id: companyId, ...dto };
      mockWebhookRepo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      mockWebhookRepo.findOne.mockResolvedValue(updated);

      const result = await controller.update('wh-1', dto, companyId);

      expect(webhookRepo.update).toHaveBeenCalledWith({ id: 'wh-1', company_id: 'company-1' }, dto);
      expect(webhookRepo.findOne).toHaveBeenCalledWith({ where: { id: 'wh-1', company_id: 'company-1' } });
      expect(result).toEqual(updated);
    });

    it('should throw when updating non-existent config', async () => {
      mockWebhookRepo.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

      await expect(controller.update('wh-404', { is_active: false }, companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /webhook-configs/:id', () => {
    it('should delete a webhook config owned by the company', async () => {
      mockWebhookRepo.findOne.mockResolvedValue({ id: 'wh-1', company_id: companyId });
      mockWebhookRepo.delete.mockResolvedValue({ affected: 1 });

      await controller.remove('wh-1', companyId);

      expect(webhookRepo.findOne).toHaveBeenCalledWith({ where: { id: 'wh-1', company_id: 'company-1' } });
      expect(webhookRepo.delete).toHaveBeenCalledWith('wh-1');
    });
  });
});
