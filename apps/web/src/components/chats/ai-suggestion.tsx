'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAiAgent } from '@/src/hooks/use-ai-agent';

export interface AiSuggestionProps {
  /** Last message received from the customer */
  lastMessage?: string;
  /** Full conversation context as text */
  conversationContext?: string;
  /** Called when user picks a suggestion */
  onSelectSuggestion?: (suggestion: string) => void;
}

export function AiSuggestion({
  lastMessage,
  conversationContext,
  onSelectSuggestion,
}: AiSuggestionProps) {
  const { agent, fetchAgent, suggest } = useAiAgent();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const generateSuggestions = useCallback(async () => {
    if (!lastMessage) return;
    setLoadingSuggestions(true);
    const result = await suggest(lastMessage, conversationContext);
    if (result?.suggestions) {
      setSuggestions(result.suggestions);
    }
    setLoadingSuggestions(false);
  }, [lastMessage, conversationContext, suggest]);

  if (!agent?.is_active) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Sugerencias IA
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={generateSuggestions}
          disabled={loadingSuggestions || !lastMessage}
        >
          {loadingSuggestions ? 'Analizando...' : 'Generar sugerencias'}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-left text-xs"
              onClick={() => onSelectSuggestion?.(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
