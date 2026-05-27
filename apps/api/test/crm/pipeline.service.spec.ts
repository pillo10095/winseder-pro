import { Test, TestingModule } from '@nestjs/testing';

import { PipelineService } from '@/modules/crm/services/pipeline.service';
import { PipelineStage } from '@/modules/crm/entities/pipeline-stage.entity';
import { PipelineStageRepository } from '@/modules/crm/repositories/pipeline-stage.repository';

describe('PipelineService', () => {
  let service: PipelineService;
  let stageRepo: jest.Mocked<PipelineStageRepository>;

  const mockStage: PipelineStage = {
    id: 'stage-1',
    company_id: 'company-1',
    name: 'Lead',
    color: '#6B7280',
    sort_order: 0,
    created_at: new Date(),
    updated_at: new Date(),
  } as PipelineStage;

  beforeEach(async () => {
    stageRepo = {
      create: jest.fn().mockReturnValue(mockStage),
      save: jest.fn().mockResolvedValue(mockStage),
      saveMany: jest.fn(),
      findOne: jest.fn().mockResolvedValue(mockStage),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      findByCompanyId: jest.fn().mockResolvedValue([mockStage]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: PipelineStageRepository, useValue: stageRepo },
      ],
    }).compile();

    service = module.get<PipelineService>(PipelineService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a pipeline stage', async () => {
      stageRepo.findByCompanyId.mockResolvedValue([mockStage]);

      const result = await service.create('company-1', { name: 'Won', color: '#10B981' });

      expect(result).toEqual(mockStage);
      expect(stageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-1',
          name: 'Won',
          color: '#10B981',
        }),
      );
    });
  });

  describe('seedDefaults', () => {
    it('should return existing stages if present', async () => {
      stageRepo.findByCompanyId.mockResolvedValue([mockStage]);

      const result = await service.seedDefaults('company-1');

      expect(result).toHaveLength(1);
      expect(stageRepo.save).not.toHaveBeenCalled();
    });

    it('should create default stages if none exist', async () => {
      stageRepo.findByCompanyId.mockResolvedValue([]);
      stageRepo.save = jest.fn().mockResolvedValue([mockStage]);

      const result = await service.seedDefaults('company-1');

      expect(result).toBeDefined();
      expect(stageRepo.create).toHaveBeenCalledTimes(6);
      expect(stageRepo.save).toHaveBeenCalled();
    });
  });

  describe('findByCompanyId', () => {
    it('should return stages in order', async () => {
      const result = await service.findByCompanyId('company-1');

      expect(result).toHaveLength(1);
      expect(stageRepo.findByCompanyId).toHaveBeenCalledWith('company-1');
    });
  });
});
