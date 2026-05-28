import { BadRequestException, Injectable } from '@nestjs/common';

import { AiAgentRepository } from '../repositories/ai-agent.repository';
import { AiLogRepository } from '../repositories/ai-log.repository';
import { AiProviderConfig, AiProviderService } from './ai-provider.service';

@Injectable()
export class SuggestionService {
  constructor(
    private readonly agentRepo: AiAgentRepository,
    private readonly logRepo: AiLogRepository,
    private readonly provider: AiProviderService,
  ) {}

  async suggest(
    companyId: string,
    message: string,
    conversationContext?: string,
  ): Promise<{ suggestions: string[] }> {
    const agent = await this.agentRepo.findActiveByCompanyId(companyId);
    if (!agent?.api_key) throw new BadRequestException('No active AI agent or API key');

    const config: AiProviderConfig = {
      apiKey: agent.api_key,
      model: agent.model,
      temperature: 0.5,
      maxTokens: 300,
      baseUrl: agent.base_url ?? undefined,
    };

    const contextMessages = [];
    if (agent.system_prompt) {
      contextMessages.push({ role: 'system' as const, content: agent.system_prompt });
    }
    if (conversationContext) {
      contextMessages.push({ role: 'user' as const, content: conversationContext });
    }
    contextMessages.push({ role: 'user' as const, content: message });

    const start = Date.now();
    const suggestions = await this.provider.generateSuggestions(config, contextMessages);

    await this.logRepo.save({
      company_id: companyId,
      agent_id: agent.id,
      type: 'suggest',
      prompt: message,
      response: JSON.stringify(suggestions),
      tokens_used: 0,
      duration_ms: Date.now() - start,
    } as any);

    return { suggestions };
  }
}
