import { Test, type TestingModule } from '@nestjs/testing';

import { ActivityController } from '@/modules/crm/controllers/activity.controller';
import { ActivityService } from '@/modules/crm/services/activity.service';

describe('ActivityController', () => {
  let controller: ActivityController;
  let activityService: ActivityService;

  const mockActivityService = {
    findByCompanyId: jest.fn(),
    create: jest.fn(),
  };

  const companyId = 'company-1';
  const userId = 'user-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    controller = module.get<ActivityController>(ActivityController);
    activityService = module.get<ActivityService>(ActivityService);

    jest.clearAllMocks();
  });

  describe('GET /crm/activities', () => {
    it('should return activities with default limit', async () => {
      const activities = [{ id: 'act-1', type: 'note', description: 'Test' }];
      mockActivityService.findByCompanyId.mockResolvedValue(activities);

      const result = await controller.findAll(companyId, undefined, undefined, undefined, undefined);

      expect(activityService.findByCompanyId).toHaveBeenCalledWith(companyId, undefined, undefined, undefined, 50);
      expect(result).toEqual(activities);
    });

    it('should filter by type, contact_id, and deal_id', async () => {
      const activities = [{ id: 'act-2', type: 'call', contact_id: 'contact-1' }];
      mockActivityService.findByCompanyId.mockResolvedValue(activities);

      const result = await controller.findAll(companyId, 'call', 'contact-1', 'deal-1', '10');

      expect(activityService.findByCompanyId).toHaveBeenCalledWith(companyId, 'call', 'contact-1', 'deal-1', 10);
      expect(result).toEqual(activities);
    });

    it('should return empty array when no activities', async () => {
      mockActivityService.findByCompanyId.mockResolvedValue([]);

      const result = await controller.findAll(companyId, undefined, undefined, undefined, undefined);

      expect(result).toEqual([]);
    });
  });

  describe('POST /crm/activities', () => {
    it('should create an activity', async () => {
      const dto = { type: 'note', description: 'Test note', contact_id: 'contact-1' };
      const created = { id: 'act-3', ...dto, company_id: companyId, logged_by: userId };
      mockActivityService.create.mockResolvedValue(created);

      const result = await controller.create(companyId, userId, dto as any);

      expect(activityService.create).toHaveBeenCalledWith(companyId, userId, dto);
      expect(result).toEqual(created);
    });
  });
});
