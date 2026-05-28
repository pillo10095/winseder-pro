import { Test, TestingModule } from '@nestjs/testing';
import { AiHookService } from '@/modules/chatbot/services/ai-hook.service';

describe('AiHookService', () => {
  let service: AiHookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiHookService],
    }).compile();

    service = module.get<AiHookService>(AiHookService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('forwardToAi', () => {
    const endpoint = 'https://ai.example.com/webhook';
    const payload = {
      sessionId: 'session-1',
      remoteJid: '5511999999999@s.whatsapp.net',
      message: 'Hello',
      config: { model: 'gpt-4' },
    };

    it('should forward payload to AI endpoint', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await service.forwardToAi(endpoint, payload);

      expect(mockFetch).toHaveBeenCalledWith(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: payload.sessionId,
          remote_jid: payload.remoteJid,
          message: payload.message,
          ...payload.config,
        }),
      });
    });

    it('should log warning when endpoint returns non-ok status', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
      global.fetch = mockFetch;

      await expect(
        service.forwardToAi(endpoint, payload),
      ).resolves.toBeUndefined();
    });

    it('should log error when fetch throws', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      await expect(
        service.forwardToAi(endpoint, payload),
      ).resolves.toBeUndefined();
    });

    it('should handle empty config', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await service.forwardToAi(endpoint, {
        ...payload,
        config: {},
      });

      expect(mockFetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          body: JSON.stringify({
            session_id: payload.sessionId,
            remote_jid: payload.remoteJid,
            message: payload.message,
          }),
        }),
      );
    });

    it('should handle network timeout', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
      global.fetch = mockFetch;

      await expect(
        service.forwardToAi(endpoint, payload),
      ).resolves.toBeUndefined();
    });

    it('should handle malformed endpoint URL', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('ENOTFOUND'));
      global.fetch = mockFetch;

      await expect(
        service.forwardToAi('not-a-url', payload),
      ).resolves.toBeUndefined();
    });
  });
});
