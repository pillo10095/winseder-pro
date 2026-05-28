import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AiTrainingController } from '@/modules/ai/controllers/ai-training.controller';
import { AiTrainingDocRepository } from '@/modules/ai/repositories/ai-training-doc.repository';

const mockDocs = [
  {
    id: 'doc-1',
    company_id: 'company-1',
    title: 'Welcome',
    content: 'Welcome content',
    content_type: 'text',
    chunks: ['Welcome content'],
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'doc-2',
    company_id: 'company-1',
    title: 'FAQ',
    content: 'FAQ content',
    content_type: 'text',
    chunks: ['FAQ content'],
    created_at: new Date(),
    updated_at: new Date(),
  },
];

describe('AiTrainingController', () => {
  let controller: AiTrainingController;

  const mockDocRepo = {
    findByCompanyId: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiTrainingController],
      providers: [
        { provide: AiTrainingDocRepository, useValue: mockDocRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<AiTrainingController>(AiTrainingController);
  });

  const companyId = 'company-1';

  describe('list', () => {
    it('should return all training docs for the company', async () => {
      mockDocRepo.findByCompanyId.mockResolvedValue(mockDocs);

      const result = await controller.list(companyId);

      expect(result).toEqual({ data: mockDocs });
      expect(mockDocRepo.findByCompanyId).toHaveBeenCalledWith(companyId);
    });

    it('should return empty array when no docs exist', async () => {
      mockDocRepo.findByCompanyId.mockResolvedValue([]);

      const result = await controller.list(companyId);

      expect(result.data).toEqual([]);
    });
  });

  describe('create', () => {
    const dto = { title: 'New Doc', content: 'Some content' };

    it('should create and return a new training doc', async () => {
      const created = {
        company_id: companyId,
        title: dto.title,
        content: dto.content,
        content_type: 'text',
        chunks: [dto.content],
      };
      const saved = { id: 'doc-3', ...created, created_at: new Date(), updated_at: new Date() };

      mockDocRepo.create.mockReturnValue(created);
      mockDocRepo.save.mockResolvedValue(saved);

      const result = await controller.create(companyId, dto);

      expect(result).toEqual({ data: saved });
      expect(mockDocRepo.create).toHaveBeenCalledWith(created);
      expect(mockDocRepo.save).toHaveBeenCalledWith(created);
    });
  });

  describe('remove', () => {
    it('should delete a training doc', async () => {
      mockDocRepo.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.remove(companyId, 'doc-1');

      expect(result).toEqual({ data: { deleted: true } });
      expect(mockDocRepo.delete).toHaveBeenCalledWith({ id: 'doc-1', company_id: companyId });
    });

    it('should still return deleted true when doc not found', async () => {
      mockDocRepo.delete.mockResolvedValue({ affected: 0 } as any);

      const result = await controller.remove(companyId, 'nonexistent');

      expect(result).toEqual({ data: { deleted: true } });
    });
  });
});
