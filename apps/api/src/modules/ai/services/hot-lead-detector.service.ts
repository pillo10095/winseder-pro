import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AI_EVENTS } from '../ai.events';
import { AiAgentRepository } from '../repositories/ai-agent.repository';
import { AiLogRepository } from '../repositories/ai-log.repository';
import { AiProviderConfig, AiProviderService } from './ai-provider.service';

@Injectable()
export class HotLeadDetectorService {
  constructor(
    private readonly agentRepo: AiAgentRepository,
    private readonly logRepo: AiLogRepository,
    private readonly provider: AiProviderService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async detect(
    companyId: string,
    conversationText: string,
    context?: { sessionId?: string; conversationId?: string },
  ): Promise<{ isHot: boolean; score: number; reason: string }> {
    const agent = await this.agentRepo.findActiveByCompanyId(companyId);
    if (!agent?.api_key) throw new BadRequestException('No active AI agent or API key');

    const config: AiProviderConfig = {
      apiKey: agent.api_key,
      model: agent.model,
      temperature: 0.2,
      maxTokens: 200,
      baseUrl: agent.base_url ?? undefined,
    };

    const start = Date.now();
    const result = await this.provider.detectHotLead(config, conversationText);

    await this.logRepo.save({
      company_id: companyId,
      agent_id: agent.id,
      type: 'hot_lead',
      prompt: conversationText,
      response: JSON.stringify(result),
      tokens_used: 0,
      duration_ms: Date.now() - start,
    } as Record<string, unknown>);

    if (result.isHot) {
      this.eventEmitter.emit(AI_EVENTS.HOT_LEAD_DETECTED, {
        companyId,
        content: conversationText,
        score: result.score,
        reason: result.reason,
        ...context,
      });
    }

    return result;
  }
}
