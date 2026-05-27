import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ActivityService } from '@/modules/crm/services/activity.service';
import { Activity, ActivityType } from '@/modules/crm/entities/activity.entity';
import { ActivityRepository } from '@/modules/crm/repositories/activity.repository';

describe('ActivityService', () => {
  let service: ActivityService;
  let activityRepo: jest.Mocked<ActivityRepository>;

  const mockActivity: Activity = {
    id: 'activity-1',
    company_id: 'company-1',
    type: ActivityType.NOTE,
    description: 'Called the client',
    contact_id: 'contact-1',
    deal_id: null,
    logged_by: 'user-1',
    activity_date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  } as Activity;

  beforeEach(async () => {
    activityRepo = {
      create: jest.fn().mockReturnValue(mockActivity),
      save: jest.fn().mockResolvedValue(mockActivity),
      findByCompanyId: jest.fn().mockResolvedValue([mockActivity]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: ActivityRepository, useValue: activityRepo },
        { provide: getRepositoryToken(Activity), useValue: activityRepo },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create an activity', async () => {
      const dto = {
        type: ActivityType.NOTE,
        description: 'Called the client',
        contact_id: 'contact-1',
      };

      const result = await service.create('company-1', 'user-1', dto);

      expect(result).toEqual(mockActivity);
      expect(activityRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-1',
          logged_by: 'user-1',
          type: ActivityType.NOTE,
          description: 'Called the client',
        }),
      );
      expect(activityRepo.save).toHaveBeenCalled();
    });

    it('should default activity_date to now', async () => {
      const dto = { type: ActivityType.NOTE, description: 'Test' };

      await service.create('company-1', 'user-1', dto);

      expect(activityRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_date: expect.any(Date),
        }),
      );
    });
  });

  describe('findByCompanyId', () => {
    it('should return activities scoped to company', async () => {
      const activities = await service.findByCompanyId('company-1');

      expect(activities).toHaveLength(1);
      expect(activityRepo.findByCompanyId).toHaveBeenCalledWith('company-1', undefined, undefined, undefined, 50);
    });
  });
});
