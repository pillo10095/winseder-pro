import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { TemplateService } from '@/modules/campaigns/services/template.service';
import { TemplateRepository } from '@/modules/campaigns/repositories/template.repository';
import { Template } from '@/modules/campaigns/entities/template.entity';

describe('TemplateService', () => {
  let service: TemplateService;
  let templateRepo: jest.Mocked<TemplateRepository>;

  const mockTemplate: Template = {
    id: 'template-1',
    company_id: 'company-1',
    name: 'Welcome Message',
    body: 'Hello {{name}}, welcome to {{company}}!',
    variables: ['name', 'company'],
    created_at: new Date(),
    updated_at: new Date(),
  } as Template;

  beforeEach(async () => {
    templateRepo = {
      create: jest.fn().mockReturnValue(mockTemplate),
      save: jest.fn().mockResolvedValue(mockTemplate),
      findOne: jest.fn().mockResolvedValue(mockTemplate),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      findByCompanyId: jest.fn().mockResolvedValue([mockTemplate]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: TemplateRepository, useValue: templateRepo },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a template with provided variables', async () => {
      const dto = {
        name: 'Welcome Message',
        body: 'Hello {{name}}, welcome!',
        variables: ['name'],
      };

      const result = await service.create('company-1', dto);

      expect(result).toEqual(mockTemplate);
      expect(templateRepo.create).toHaveBeenCalledWith({
        ...dto,
        company_id: 'company-1',
      });
    });

    it('should extract variables from body when not provided', async () => {
      await service.create('company-1', {
        name: 'Auto Extract',
        body: 'Hi {{firstName}} {{lastName}}, order #{{orderId}} is ready!',
      });

      expect(templateRepo.create).toHaveBeenCalledWith({
        name: 'Auto Extract',
        body: 'Hi {{firstName}} {{lastName}}, order #{{orderId}} is ready!',
        variables: ['firstName', 'lastName', 'orderId'],
        company_id: 'company-1',
      });
    });

    it('should return empty variables array for body without placeholders', async () => {
      await service.create('company-1', {
        name: 'Plain Text',
        body: 'Hello, this is a plain message.',
      });

      expect(templateRepo.create).toHaveBeenCalledWith({
        name: 'Plain Text',
        body: 'Hello, this is a plain message.',
        variables: [],
        company_id: 'company-1',
      });
    });

    it('should deduplicate repeated variables', async () => {
      await service.create('company-1', {
        name: 'Dupes',
        body: 'Hello {{name}}, yes {{name}} again!',
      });

      expect(templateRepo.create).toHaveBeenCalledWith({
        name: 'Dupes',
        body: 'Hello {{name}}, yes {{name}} again!',
        variables: ['name'],
        company_id: 'company-1',
      });
    });
  });

  describe('findByCompanyId', () => {
    it('should return templates for company', async () => {
      const result = await service.findByCompanyId('company-1');

      expect(result).toEqual([mockTemplate]);
      expect(templateRepo.findByCompanyId).toHaveBeenCalledWith(
        'company-1',
        undefined,
      );
    });

    it('should pass search filter', async () => {
      await service.findByCompanyId('company-1', 'welcome');

      expect(templateRepo.findByCompanyId).toHaveBeenCalledWith(
        'company-1',
        'welcome',
      );
    });

    it('should return empty array when none match', async () => {
      templateRepo.findByCompanyId.mockResolvedValue([]);

      const result = await service.findByCompanyId('company-1', 'zzz');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a template by id', async () => {
      const result = await service.findById('template-1');

      expect(result).toEqual(mockTemplate);
      expect(templateRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('should return null if not found', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the template', async () => {
      const result = await service.update('template-1', {
        name: 'Updated Name',
      });

      expect(result).toEqual(mockTemplate);
      expect(templateRepo.update).toHaveBeenCalledWith('template-1', {
        name: 'Updated Name',
        variables: ['name', 'company'],
      });
    });

    it('should re-extract variables when body changes', async () => {
      await service.update('template-1', { body: 'New {{code}} here' });

      expect(templateRepo.update).toHaveBeenCalledWith('template-1', {
        body: 'New {{code}} here',
        variables: ['code'],
      });
    });

    it('should keep existing variables when no body in update', async () => {
      await service.update('template-1', { name: 'Renamed' });

      expect(templateRepo.update).toHaveBeenCalledWith('template-1', {
        name: 'Renamed',
        variables: ['name', 'company'],
      });
    });

    it('should use provided variables over extraction when both given', async () => {
      await service.update('template-1', {
        body: 'Hello {{name}} {{unused}}!',
        variables: ['name'],
      });

      expect(templateRepo.update).toHaveBeenCalledWith('template-1', {
        body: 'Hello {{name}} {{unused}}!',
        variables: ['name'],
      });
    });

    it('should throw NotFoundException if template does not exist', async () => {
      templateRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.update('nonexistent', { name: 'Nope' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a template', async () => {
      await service.remove('template-1');

      expect(templateRepo.delete).toHaveBeenCalledWith('template-1');
    });
  });
});
