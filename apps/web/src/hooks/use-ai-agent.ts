import { useState, useCallback } from 'react';

import { API_URL, fetchWithAuth } from '../lib/api';

export type AiAgent = {
  id: string;
  company_id: string;
  is_active: boolean;
  provider: string;
  model: string;
  api_key?: string;
  base_url?: string;
  system_prompt?: string;
  temperature: number;
  max_tokens: number;
};

export type AiSuggestion = {
  suggestions: string[];
};

export type IntentClassification = {
  intent: string;
  confidence: number;
};

export function useAiAgent() {
  const [agent, setAgent] = useState<AiAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/ai/agent`);
      if (!res.ok) throw new Error('Failed to fetch AI agent');
      const json = await res.json();
      setAgent(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAgent = useCallback(async (data: Partial<AiAgent>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/ai/agent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update AI agent');
      const json = await res.json();
      setAgent(json.data);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const chat = useCallback(async (message: string, conversationId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversation_id: conversationId }),
      });
      if (!res.ok) throw new Error('Failed to send chat message');
      const json = await res.json();
      return json.data as { reply: string };
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const classify = useCallback(async (message: string) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/ai/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Classification failed');
      const json = await res.json();
      return json.data as IntentClassification;
    } catch {
      return null;
    }
  }, []);

  const suggest = useCallback(
    async (message: string, conversationContext?: string) => {
      try {
        const res = await fetchWithAuth(`${API_URL}/ai/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, conversation_context: conversationContext }),
        });
        if (!res.ok) throw new Error('Suggestion failed');
        const json = await res.json();
        return json.data as AiSuggestion;
      } catch {
        return null;
      }
    },
    [],
  );

  return {
    agent,
    loading,
    error,
    fetchAgent,
    updateAgent,
    chat,
    classify,
    suggest,
  };
}
