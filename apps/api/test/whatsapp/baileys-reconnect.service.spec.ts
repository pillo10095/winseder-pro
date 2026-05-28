jest.mock('@whiskeysockets/baileys', () => ({
  DisconnectReason: {
    loggedOut: 401,
    restartRequired: 428,
    connectionClosed: 515,
    connectionLost: 516,
    timedOut: 408,
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BaileysReconnectService } from '@/modules/whatsapp/services/baileys-reconnect.service';

describe('BaileysReconnectService', () => {
  let service: BaileysReconnectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BaileysReconnectService],
    }).compile();

    service = module.get<BaileysReconnectService>(BaileysReconnectService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('evaluateDisconnect', () => {
    it('should NOT reconnect when logged out', () => {
      const boomError = { output: { statusCode: 401 }, isBoom: true } as any;

      const result = service.evaluateDisconnect('session-1', { error: boomError });

      expect(result.shouldReconnect).toBe(false);
      expect(result.reason).toContain('Logged out');
    });

    it('should reconnect when restart is required', () => {
      const boomError = { output: { statusCode: 428 }, isBoom: true } as any;

      const result = service.evaluateDisconnect('session-1', { error: boomError });

      expect(result.shouldReconnect).toBe(true);
      expect(result.reason).toContain('Restart required');
    });

    it('should reconnect on connection closed (retryable)', () => {
      const boomError = { output: { statusCode: 515 }, isBoom: true } as any;

      const result = service.evaluateDisconnect('session-1', { error: boomError });

      expect(result.shouldReconnect).toBe(true);
    });

    it('should reconnect on connection lost (retryable)', () => {
      const boomError = { output: { statusCode: 516 }, isBoom: true } as any;

      const result = service.evaluateDisconnect('session-1', { error: boomError });

      expect(result.shouldReconnect).toBe(true);
    });

    it('should reconnect on timed out (retryable)', () => {
      const boomError = { output: { statusCode: 408 }, isBoom: true } as any;

      const result = service.evaluateDisconnect('session-1', { error: boomError });

      expect(result.shouldReconnect).toBe(true);
    });

    it('should handle unknown error codes as retryable', () => {
      const boomError = { output: { statusCode: 999 }, isBoom: true } as any;

      const result = service.evaluateDisconnect('session-1', { error: boomError });

      expect(result.shouldReconnect).toBe(true);
      expect(result.reason).toContain('Unknown error');
    });

    it('should reconnect when no disconnect error provided', () => {
      const result = service.evaluateDisconnect('session-1', {});

      expect(result.shouldReconnect).toBe(true);
    });

    it('should NOT reconnect after max retries exceeded', () => {
      const boomError = { output: { statusCode: 515 }, isBoom: true } as any;

      service.evaluateDisconnect('session-1', { error: boomError });
      service.evaluateDisconnect('session-1', { error: boomError });
      service.evaluateDisconnect('session-1', { error: boomError });

      const result = service.evaluateDisconnect('session-1', { error: boomError });

      expect(result.shouldReconnect).toBe(false);
      expect(result.reason).toContain('max retries');
    });
  });

  describe('getBackoffDelay', () => {
    it('should return 5s before any attempt (counter=0)', () => {
      expect(service.getBackoffDelay('session-1')).toBe(5000);
    });

    it('should return 15s after first attempt (counter=1)', () => {
      const boomError = { output: { statusCode: 515 }, isBoom: true } as any;
      service.evaluateDisconnect('session-1', { error: boomError });

      expect(service.getBackoffDelay('session-1')).toBe(15000);
    });

    it('should return 45s after second attempt (counter=2) and cap there', () => {
      const boomError = { output: { statusCode: 515 }, isBoom: true } as any;
      service.evaluateDisconnect('session-1', { error: boomError });
      service.evaluateDisconnect('session-1', { error: boomError });

      expect(service.getBackoffDelay('session-1')).toBe(45000);
    });
  });

  describe('scheduleReconnect', () => {
    it('should schedule reconnect after backoff delay', () => {
      const boomError = { output: { statusCode: 515 }, isBoom: true } as any;
      service.evaluateDisconnect('session-1', { error: boomError });
      const callback = jest.fn().mockResolvedValue(undefined);

      service.scheduleReconnect('session-1', callback);

      expect(callback).not.toHaveBeenCalled();
      jest.advanceTimersByTime(15000);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle callback error gracefully', () => {
      const boomError = { output: { statusCode: 515 }, isBoom: true } as any;
      service.evaluateDisconnect('session-1', { error: boomError });
      const callback = jest.fn().mockRejectedValue(new Error('Reconnect failed'));

      service.scheduleReconnect('session-1', callback);

      jest.advanceTimersByTime(15000);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('onReconnectSuccess', () => {
    it('should clear retry counters on success', () => {
      const boomError = { output: { statusCode: 515 }, isBoom: true } as any;
      service.evaluateDisconnect('session-1', { error: boomError });

      service.onReconnectSuccess('session-1');

      expect(service.getBackoffDelay('session-1')).toBe(5000);
    });
  });

  describe('clearRetries', () => {
    it('should clear retry counters and timers', () => {
      const boomError = { output: { statusCode: 515 }, isBoom: true } as any;
      service.evaluateDisconnect('session-1', { error: boomError });
      service.scheduleReconnect('session-1', jest.fn());

      service.clearRetries('session-1');

      expect(service.getBackoffDelay('session-1')).toBe(5000);
    });

    it('should not throw when clearing unknown session', () => {
      expect(() => service.clearRetries('unknown')).not.toThrow();
    });
  });

  describe('onApplicationShutdown', () => {
    it('should clear all timers and retry counters', () => {
      const boomError = { output: { statusCode: 515 }, isBoom: true } as any;
      service.evaluateDisconnect('session-1', { error: boomError });
      service.evaluateDisconnect('session-2', { error: boomError });
      service.scheduleReconnect('session-1', jest.fn());
      service.scheduleReconnect('session-2', jest.fn());

      service.onApplicationShutdown();

      expect(service.getBackoffDelay('session-1')).toBe(5000);
    });
  });
});
