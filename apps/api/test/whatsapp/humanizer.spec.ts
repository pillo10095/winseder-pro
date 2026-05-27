import { Test, TestingModule } from '@nestjs/testing';
import { AntiBanHumanizer } from '@/modules/whatsapp/services/anti-ban/humanizer';

describe('AntiBanHumanizer', () => {
  let humanizer: AntiBanHumanizer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AntiBanHumanizer],
    }).compile();

    humanizer = module.get<AntiBanHumanizer>(AntiBanHumanizer);
  });

  afterEach(() => {
    humanizer.reset('session-1');
  });

  describe('simulateTyping', () => {
    it('should add a delay between 1000-3000ms', async () => {
      const start = Date.now();
      await humanizer.simulateTyping('session-1');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(900); // allow margin
      expect(elapsed).toBeLessThanOrEqual(3500);
    }, 5000);
  });

  describe('maybeTakeBreak', () => {
    it('should return 0 when break roll fails', async () => {
      // Override Math.random to return 1 (no break)
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(1);

      const result = await humanizer.maybeTakeBreak('session-1');
      expect(result).toBe(0);

      Math.random = originalRandom;
    });

    it('should return > 0 when break roll succeeds', async () => {
      // Override Math.random to return 0 (break)
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0);

      const result = await humanizer.maybeTakeBreak('session-1');
      expect(result).toBeGreaterThanOrEqual(5000);
      expect(result).toBeLessThanOrEqual(30000);

      Math.random = originalRandom;
    }, 35000);
  });

  describe('isQuietHours', () => {
    it('should return boolean', () => {
      const result = humanizer.isQuietHours();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('randomActionDelay', () => {
    it('should add a delay', async () => {
      const start = Date.now();
      await humanizer.randomActionDelay('session-1');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(200);
      expect(elapsed).toBeLessThanOrEqual(2000);
    }, 5000);
  });

  describe('config', () => {
    it('should use custom config values', () => {
      humanizer.setConfig('session-1', { minTypingDelay: 500, maxTypingDelay: 1000 });
      const config = humanizer.getConfig('session-1');
      expect(config.minTypingDelay).toBe(500);
      expect(config.maxTypingDelay).toBe(1000);
    });

    it('should merge with defaults', () => {
      humanizer.setConfig('session-1', { breakProbability: 0.5 });
      const config = humanizer.getConfig('session-1');
      expect(config.breakProbability).toBe(0.5);
      expect(config.minTypingDelay).toBe(1000); // default
    });
  });

  describe('reset', () => {
    it('should clear config for session', () => {
      humanizer.setConfig('session-1', { minTypingDelay: 100 });
      humanizer.reset('session-1');
      const config = humanizer.getConfig('session-1');
      expect(config.minTypingDelay).toBe(1000); // back to default
    });
  });
});
