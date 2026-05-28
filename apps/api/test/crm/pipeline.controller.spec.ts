import { Test, type TestingModule } from '@nestjs/testing';

import { PipelineController } from '@/modules/crm/controllers/pipeline.controller';
import { PipelineService } from '@/modules/crm/services/pipeline.service';

describe('PipelineController', () => {
  let controller: PipelineController;
  let pipelineService: PipelineService;

  const mockPipelineService = {
    findByCompanyId: jest.fn(),
    seedDefaults: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const companyId = 'company-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipelineController],
      providers: [
        { provide: PipelineService, useValue: mockPipelineService },
      ],
    }).compile();

    controller = module.get<PipelineController>(PipelineController);
    pipelineService = module.get<PipelineService>(PipelineService);

    jest.clearAllMocks();
  });

  describe('GET /crm/pipeline-stages', () => {
    it('should return all pipeline stages', async () => {
      const stages = [
        { id: 'stage-1', name: 'Lead', sort_order: 0 },
        { id: 'stage-2', name: 'Qualified', sort_order: 1 },
      ];
      mockPipelineService.findByCompanyId.mockResolvedValue(stages);

      const result = await controller.findAll(companyId);

      expect(pipelineService.findByCompanyId).toHaveBeenCalledWith(companyId);
      expect(result).toEqual(stages);
    });

    it('should return empty array when no stages', async () => {
      mockPipelineService.findByCompanyId.mockResolvedValue([]);

      const result = await controller.findAll(companyId);

      expect(result).toEqual([]);
    });
  });

  describe('POST /crm/pipeline-stages/seed', () => {
    it('should seed default pipeline stages', async () => {
      const stages = [
        { id: 'stage-1', name: 'Lead', sort_order: 0 },
        { id: 'stage-2', name: 'Qualified', sort_order: 1 },
      ];
      mockPipelineService.seedDefaults.mockResolvedValue(stages);

      const result = await controller.seed(companyId);

      expect(pipelineService.seedDefaults).toHaveBeenCalledWith(companyId);
      expect(result).toEqual(stages);
    });

    it('should return existing stages if already seeded', async () => {
      const existing = [{ id: 'stage-1', name: 'Lead' }];
      mockPipelineService.seedDefaults.mockResolvedValue(existing);

      const result = await controller.seed(companyId);

      expect(result).toEqual(existing);
    });
  });

  describe('POST /crm/pipeline-stages', () => {
    it('should create a pipeline stage', async () => {
      const dto = { name: 'New Stage', color: '#FF0000', sort_order: 6 };
      const created = { id: 'stage-7', ...dto, company_id: companyId };
      mockPipelineService.create.mockResolvedValue(created);

      const result = await controller.create(companyId, dto as any);

      expect(pipelineService.create).toHaveBeenCalledWith(companyId, dto);
      expect(result).toEqual(created);
    });
  });

  describe('PUT /crm/pipeline-stages/:id', () => {
    it('should update a pipeline stage', async () => {
      const dto = { name: 'Updated Stage', color: '#00FF00' };
      const updated = { id: 'stage-1', name: 'Updated Stage', color: '#00FF00', sort_order: 0 };
      mockPipelineService.update.mockResolvedValue(updated);

      const result = await controller.update('stage-1', dto as any);

      expect(pipelineService.update).toHaveBeenCalledWith('stage-1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('DELETE /crm/pipeline-stages/:id', () => {
    it('should remove a pipeline stage', async () => {
      mockPipelineService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('stage-1');

      expect(pipelineService.remove).toHaveBeenCalledWith('stage-1');
      expect(result).toEqual({ success: true });
    });
  });
});
