import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { TemplateController } from '@/modules/campaigns/controllers/template.controller';
import { TemplateService } from '@/modules/campaigns/services/template.service';

describe('TemplateController', () => {
  let controller: TemplateController;
  let templateService: TemplateService;

  const mockTemplateService = {
    findByCompanyId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const companyId = 'company-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplateController],
      providers: [
        { provide: TemplateService, useValue: mockTemplateService },
      ],
    }).compile();

    controller = module.get<TemplateController>(TemplateController);
    templateService = module.get<TemplateService>(TemplateService);

    jest.clearAllMocks();
  });

  describe('GET /campaigns/templates', () => {
    it('should return templates list', async () => {
      const templates = [{ id: 'tmpl-1', name: 'Welcome' }];
      mockTemplateService.findByCompanyId.mockResolvedValue(templates);

      const result = await controller.findAll(companyId, undefined);

      expect(templateService.findByCompanyId).toHaveBeenCalledWith(companyId, undefined);
      expect(result).toEqual({ data: templates });
    });

    it('should filter by search term', async () => {
      const templates = [{ id: 'tmpl-2', name: 'Promo' }];
      mockTemplateService.findByCompanyId.mockResolvedValue(templates);

      const result = await controller.findAll(companyId, 'Promo');

      expect(templateService.findByCompanyId).toHaveBeenCalledWith(companyId, 'Promo');
      expect(result).toEqual({ data: templates });
    });

    it('should return empty array when no templates', async () => {
      mockTemplateService.findByCompanyId.mockResolvedValue([]);

      const result = await controller.findAll(companyId, undefined);

      expect(result).toEqual({ data: [] });
    });
  });

  describe('GET /campaigns/templates/:id', () => {
    it('should return a template by id', async () => {
      const template = { id: 'tmpl-1', name: 'Welcome' };
      mockTemplateService.findById.mockResolvedValue(template);

      const result = await controller.findOne('tmpl-1');

      expect(templateService.findById).toHaveBeenCalledWith('tmpl-1');
      expect(result).toEqual(template);
    });

    it('should return null when not found', async () => {
      mockTemplateService.findById.mockResolvedValue(null);

      const result = await controller.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('POST /campaigns/templates', () => {
    it('should create a template', async () => {
      const dto = { name: 'New Template', body: 'Hello {{name}}' };
      const created = { id: 'tmpl-3', ...dto, variables: ['name'], company_id: companyId };
      mockTemplateService.create.mockResolvedValue(created);

      const result = await controller.create(companyId, dto as any);

      expect(templateService.create).toHaveBeenCalledWith(companyId, dto);
      expect(result).toEqual(created);
    });
  });

  describe('PUT /campaigns/templates/:id', () => {
    it('should update a template', async () => {
      const dto = { name: 'Updated Template' };
      const updated = { id: 'tmpl-1', name: 'Updated Template', body: 'Hello {{name}}' };
      mockTemplateService.update.mockResolvedValue(updated);

      const result = await controller.update('tmpl-1', dto as any);

      expect(templateService.update).toHaveBeenCalledWith('tmpl-1', dto);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplateService.update.mockRejectedValue(new NotFoundException('Template not found'));

      await expect(controller.update('non-existent', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /campaigns/templates/:id', () => {
    it('should remove a template', async () => {
      mockTemplateService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('tmpl-1');

      expect(templateService.remove).toHaveBeenCalledWith('tmpl-1');
      expect(result).toEqual({ success: true });
    });
  });
});
