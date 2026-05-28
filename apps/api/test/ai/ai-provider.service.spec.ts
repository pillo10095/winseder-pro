import { Test, TestingModule } from '@nestjs/testing';
import { AiProviderService } from '@/modules/ai/services/ai-provider.service';

const mockCreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

// Get the constructor mock AFTER jest.mock has run
const MockOpenAI = jest.requireMock('openai').default;

describe('AiProviderService', () => {
  let service: AiProviderService;

  const config = {
    apiKey: 'sk-test',
    model: 'gpt-4o-mini',
    temperature: 0.5,
    maxTokens: 500,
  };

  const mockCompletion = (overrides = {}) => ({
    choices: [{ message: { content: 'Hello' } }],
    usage: { total_tokens: 42 },
    ...overrides,
  });

  beforeEach(async () => {
    mockCreate.mockClear();
    MockOpenAI.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiProviderService],
    }).compile();

    service = module.get<AiProviderService>(AiProviderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('should return content, tokensUsed, and durationMs', async () => {
      mockCreate.mockResolvedValue(mockCompletion());

      const result = await service.chat(config, [
        { role: 'user', content: 'Hi' },
      ]);

      expect(result.content).toBe('Hello');
      expect(result.tokensUsed).toBe(42);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.5,
          max_tokens: 500,
        }),
      );
    });

    it('should handle empty response content', async () => {
      mockCreate.mockResolvedValue(mockCompletion({ choices: [{ message: { content: null } }] }));

      const result = await service.chat(config, [
        { role: 'user', content: 'Hi' },
      ]);

      expect(result.content).toBe('');
    });

    it('should handle missing usage data', async () => {
      mockCreate.mockResolvedValue(mockCompletion({ usage: null }));

      const result = await service.chat(config, [
        { role: 'user', content: 'Hi' },
      ]);

      expect(result.tokensUsed).toBe(0);
    });

    it('should cache OpenAI clients by apiKey', async () => {
      mockCreate.mockResolvedValue(mockCompletion());

      await service.chat(config, [{ role: 'user', content: 'Hi' }]);
      await service.chat(config, [{ role: 'user', content: 'Bye' }]);

      expect(MockOpenAI).toHaveBeenCalledTimes(1);
    });

    it('should create separate clients for different baseUrl', async () => {
      mockCreate.mockResolvedValue(mockCompletion());

      await service.chat(config, [{ role: 'user', content: 'Hi' }]);
      await service.chat(
        { ...config, baseUrl: 'https://custom.com/v1' },
        [{ role: 'user', content: 'Hi' }],
      );

      expect(MockOpenAI).toHaveBeenCalledTimes(2);
    });

    it('should propagate OpenAI errors', async () => {
      mockCreate.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        service.chat(config, [{ role: 'user', content: 'Hi' }]),
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('classify', () => {
    it('should return parsed label and confidence', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({
          choices: [{ message: { content: '{"label": "compra", "confidence": 0.95}' } }],
        }),
      );

      const result = await service.classify(config, 'Quiero comprar', [
        'compra',
        'soporte',
      ]);

      expect(result).toEqual({ label: 'compra', confidence: 0.95 });
    });

    it('should return unknown on JSON parse failure', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({ choices: [{ message: { content: 'invalid json' } }] }),
      );

      const result = await service.classify(config, 'test', ['a', 'b']);

      expect(result).toEqual({ label: 'unknown', confidence: 0 });
    });
  });

  describe('generateSuggestions', () => {
    it('should return parsed suggestions array', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({
          choices: [{ message: { content: '["Reply A","Reply B","Reply C"]' } }],
        }),
      );

      const result = await service.generateSuggestions(
        config,
        [{ role: 'user', content: 'Help' }],
        3,
      );

      expect(result).toEqual(['Reply A', 'Reply B', 'Reply C']);
    });

    it('should slice to count', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({
          choices: [
            {
              message: {
                content: '["A","B","C","D"]',
              },
            },
          ],
        }),
      );

      const result = await service.generateSuggestions(
        config,
        [{ role: 'user', content: 'Help' }],
        2,
      );

      expect(result).toEqual(['A', 'B']);
    });

    it('should return empty on parse failure', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({ choices: [{ message: { content: 'not json' } }] }),
      );

      const result = await service.generateSuggestions(
        config,
        [{ role: 'user', content: 'Help' }],
        3,
      );

      expect(result).toEqual([]);
    });

    it('should return empty for non-array JSON', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({
          choices: [{ message: { content: '{"key": "value"}' } }],
        }),
      );

      const result = await service.generateSuggestions(
        config,
        [{ role: 'user', content: 'Help' }],
        3,
      );

      expect(result).toEqual([]);
    });
  });

  describe('summarize', () => {
    it('should return parsed summary and keyPoints', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({
          choices: [
            {
              message: {
                content:
                  '{"summary": "Customer was happy", "keyPoints": ["Point A", "Point B"]}',
              },
            },
          ],
        }),
      );

      const result = await service.summarize(config, 'long conversation');

      expect(result).toEqual({
        summary: 'Customer was happy',
        keyPoints: ['Point A', 'Point B'],
      });
    });

    it('should fallback on parse failure', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({ choices: [{ message: { content: 'raw summary text' } }] }),
      );

      const result = await service.summarize(config, 'long conversation');

      expect(result).toEqual({
        summary: 'raw summary text',
        keyPoints: [],
      });
    });
  });

  describe('detectHotLead', () => {
    it('should return parsed hot lead result', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({
          choices: [
            {
              message: {
                content:
                  '{"isHot": true, "score": 85, "reason": "High buying intent"}',
              },
            },
          ],
        }),
      );

      const result = await service.detectHotLead(config, 'I want to buy now');

      expect(result).toEqual({
        isHot: true,
        score: 85,
        reason: 'High buying intent',
      });
    });

    it('should return default on parse failure', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({ choices: [{ message: { content: 'bad json' } }] }),
      );

      const result = await service.detectHotLead(config, 'test');

      expect(result).toEqual({
        isHot: false,
        score: 0,
        reason: 'Error parsing lead score',
      });
    });
  });

  describe('answerWithContext', () => {
    it('should return answer using context chunks', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({
          choices: [{ message: { content: 'The answer is 42.' } }],
        }),
      );

      const result = await service.answerWithContext(config, 'What is life?', [
        'Chunk 1',
        'Chunk 2',
      ]);

      expect(result).toBe('The answer is 42.');
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('Chunk 1');
      expect(callArgs.messages[0].content).toContain('Chunk 2');
    });

    it('should handle empty context chunks gracefully', async () => {
      mockCreate.mockResolvedValue(
        mockCompletion({
          choices: [{ message: { content: 'No context provided.' } }],
        }),
      );

      const result = await service.answerWithContext(config, 'Question?', []);

      expect(result).toBe('No context provided.');
    });
  });
});
