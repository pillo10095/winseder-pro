import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

export interface AiProviderConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  baseUrl?: string;
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  content: string;
  tokensUsed: number;
  durationMs: number;
}

@Injectable()
export class AiProviderService {
  private clients = new Map<string, OpenAI>();

  private getClient(apiKey: string, baseUrl?: string): OpenAI {
    const key = baseUrl ? `${apiKey}::${baseUrl}` : apiKey;
    const existing = this.clients.get(key);
    if (existing) return existing;

    const client = new OpenAI({ apiKey, baseURL: baseUrl });
    this.clients.set(key, client);
    return client;
  }

  async chat(
    config: AiProviderConfig,
    messages: AiChatMessage[],
  ): Promise<AiChatResponse> {
    const client = this.getClient(config.apiKey, config.baseUrl);
    const start = Date.now();

    const completion = await client.chat.completions.create({
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });

    const durationMs = Date.now() - start;
    const content = completion.choices[0]?.message?.content ?? '';
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    return { content, tokensUsed, durationMs };
  }

  async classify(
    config: AiProviderConfig,
    prompt: string,
    labels: string[],
  ): Promise<{ label: string; confidence: number }> {
    const messages: AiChatMessage[] = [
      {
        role: 'system',
        content: `You are a text classifier. Classify the user message into one of these labels: ${labels.join(', ')}. Respond with ONLY a JSON object: {"label": "label_name", "confidence": 0.0-1.0}`,
      },
      { role: 'user', content: prompt },
    ];

    const response = await this.chat(config, messages);

    try {
      const parsed = JSON.parse(response.content) as { label: string; confidence: number };
      return { label: parsed.label, confidence: parsed.confidence };
    } catch {
      return { label: 'unknown', confidence: 0 };
    }
  }

  /** Generate structured suggestions from conversation context */
  async generateSuggestions(
    config: AiProviderConfig,
    contextMessages: AiChatMessage[],
    count = 3,
  ): Promise<string[]> {
    const messages: AiChatMessage[] = [
      {
        role: 'system',
        content: `You are a customer support assistant. Based on the conversation, suggest ${count} reply options the agent could send. Each suggestion should be concise and helpful. Return a JSON array of strings only.`,
      },
      ...contextMessages,
    ];

    const response = await this.chat(config, messages);

    try {
      const parsed = JSON.parse(response.content) as string[];
      return Array.isArray(parsed) ? parsed.slice(0, count) : [];
    } catch {
      return [];
    }
  }

  /** Summarize a conversation thread */
  async summarize(
    config: AiProviderConfig,
    conversationText: string,
  ): Promise<{ summary: string; keyPoints: string[] }> {
    const messages: AiChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a conversation analyst. Summarize the following conversation and extract key points. Respond with a JSON object: {"summary": "...", "keyPoints": ["..."]}',
      },
      { role: 'user', content: conversationText },
    ];

    const response = await this.chat(config, messages);

    try {
      return JSON.parse(response.content) as { summary: string; keyPoints: string[] };
    } catch {
      return { summary: response.content, keyPoints: [] };
    }
  }

  /** Detect if a conversation indicates a hot lead */
  async detectHotLead(
    config: AiProviderConfig,
    conversationText: string,
  ): Promise<{ isHot: boolean; score: number; reason: string }> {
    const messages: AiChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a sales lead scorer. Analyze the conversation for buying intent. Respond with a JSON object: {"isHot": true/false, "score": 0-100, "reason": "..."}',
      },
      { role: 'user', content: conversationText },
    ];

    const response = await this.chat(config, messages);

    try {
      return JSON.parse(response.content) as { isHot: boolean; score: number; reason: string };
    } catch {
      return { isHot: false, score: 0, reason: 'Error parsing lead score' };
    }
  }

  /** Answer a question using retrieved context (RAG) */
  async answerWithContext(
    config: AiProviderConfig,
    question: string,
    contextChunks: string[],
  ): Promise<string> {
    const context = contextChunks.join('\n\n---\n\n');

    const messages: AiChatMessage[] = [
      {
        role: 'system',
        content: `You are a support assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, say so politely. Do NOT invent information.\n\nContext:\n${context}`,
      },
      { role: 'user', content: question },
    ];

    const response = await this.chat(config, messages);
    return response.content;
  }
}
