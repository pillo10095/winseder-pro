import { Test, TestingModule } from '@nestjs/testing';

import { DailyBudgetService } from '@/modules/anti-ban/services/daily-budget.service';

describe('DailyBudgetService', () => {
  let service: DailyBudgetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyBudgetService],
    }).compile();

    service = module.get<DailyBudgetService>(DailyBudgetService);
  });

  afterEach(() => {
    service.reset('session-1');
    service.reset('session-2');
  });

  describe('getConfig', () => {
    it('should return default config when no overrides set', () => {
      const config = service.getConfig('session-1');
      expect(config.dailyLimit).toBe(1000);
      expect(config.weights.text).toBe(1);
      expect(config.weights.image).toBe(2);
      expect(config.resetHour).toBe(0);
      expect(config.resetTimezone).toBe('America/Mexico_City');
    });

    it('should return merged config with overrides', () => {
      service.setConfig('session-1', { dailyLimit: 500 });
      const config = service.getConfig('session-1');
      expect(config.dailyLimit).toBe(500);
      expect(config.weights.text).toBe(1);
    });
  });

  describe('consume', () => {
    it('should return true when within budget', () => {
      const result = service.consume('session-1', 'text');
      expect(result).toBe(true);
    });

    it('should return false when budget exceeded', () => {
      service.setConfig('session-1', { dailyLimit: 1 });
      service.consume('session-1', 'text');
      const result = service.consume('session-1', 'text');
      expect(result).toBe(false);
    });

    it('should use weight for message type', () => {
      service.setConfig('session-1', { dailyLimit: 3 });
      expect(service.consume('session-1', 'image')).toBe(true);
      expect(service.consume('session-1', 'image')).toBe(false);
    });

    it('should use "other" weight for unknown message types', () => {
      service.setConfig('session-1', { dailyLimit: 1 });
      const result = service.consume('session-1', 'unknown_type');
      expect(result).toBe(true);
    });

    it('should track consumption details per message type', () => {
      service.consume('session-1', 'text');
      service.consume('session-1', 'image');
      service.consume('session-1', 'text');

      const budget = service.getBudget('session-1');
      expect(budget.details).toEqual({ text: 2, image: 1 });
    });
  });

  describe('getBudget', () => {
    it('should return full budget status', () => {
      service.setConfig('session-1', { dailyLimit: 100 });
      service.consume('session-1', 'text');

      const budget = service.getBudget('session-1');
      expect(budget.limit).toBe(100);
      expect(budget.consumed).toBe(1);
      expect(budget.remaining).toBe(99);
      expect(budget.usagePercent).toBe(1);
      expect(budget.resetAt).toBeInstanceOf(Date);
    });

    it('should return 0 remaining when budget exceeded', () => {
      service.setConfig('session-1', { dailyLimit: 1 });
      service.consume('session-1', 'text');
      const budget = service.getBudget('session-1');
      expect(budget.remaining).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all state for a session', () => {
      service.consume('session-1', 'text');
      service.reset('session-1');

      const budget = service.getBudget('session-1');
      expect(budget.consumed).toBe(0);
    });
  });

  describe('per-session isolation', () => {
    it('should track sessions independently', () => {
      service.consume('session-1', 'text');
      const budget1 = service.getBudget('session-1');
      const budget2 = service.getBudget('session-2');
      expect(budget1.consumed).toBe(1);
      expect(budget2.consumed).toBe(0);
    });
  });
});
