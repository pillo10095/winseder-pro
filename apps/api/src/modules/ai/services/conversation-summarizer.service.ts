import { BadRequestException, Injectable } from '@nestjs/common';

import { AiAgentRepository } from '../repositories/ai-agent.repository';
import { AiLogRepository } from '../repositories/ai-log.repository';
import { AiProviderConfig, AiProviderService } from './ai-provider.service';

@Injectable()
export class ConversationSummarizerService {
  constructor(
    private readonly agentRepo: AiAgentRepository,
    private readonly logRepo: AiLogRepository,
    private readonly provider: AiProviderService,
  ) {}

  async summarize(
    companyId: string,
    conversationText: string,
  ): Promise<{ summary: string; keyPoints: string[] }> {
    const agent = await this.agentRepo.findActiveByCompanyId(companyId);
    if (!agent?.api_key) throw new BadRequestException('No active AI agent or API key');

    const config: AiProviderConfig = {
      apiKey: agent.api_key,
      model: agent.model,
      temperature: 0.3,
      maxTokens: 500,
      baseUrl: agent.base_url ?? undefined,
    };

    const start = Date.now();
    const result = await this.provider.summarize(config, conversationText);

    await this.logRepo.save({
      company_id: companyId,
      agent_id: agent.id,
      type: 'summarize',
      prompt: conversationText,
      response: JSON.stringify(result),
      tokens_used: 0,
      duration_ms: Date.now() - start,
    } as Record<string, unknown>);

    return result;
  }
}
