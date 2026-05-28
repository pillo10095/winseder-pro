import { BadRequestException, Injectable } from '@nestjs/common';

import { AiAgentRepository } from '../repositories/ai-agent.repository';
import { AiLogRepository } from '../repositories/ai-log.repository';
import { AiProviderConfig, AiProviderService } from './ai-provider.service';

const DEFAULT_LABELS = ['compra', 'soporte', 'reclamo', 'consulta', 'otro'];

@Injectable()
export class IntentClassifierService {
  constructor(
    private readonly agentRepo: AiAgentRepository,
    private readonly logRepo: AiLogRepository,
    private readonly provider: AiProviderService,
  ) {}

  async classify(
    companyId: string,
    message: string,
  ): Promise<{ intent: string; confidence: number }> {
    const agent = await this.agentRepo.findActiveByCompanyId(companyId);
    if (!agent?.api_key) throw new BadRequestException('No active AI agent or API key');

    const config: AiProviderConfig = {
      apiKey: agent.api_key,
      model: agent.model,
      temperature: 0,
      maxTokens: 100,
      baseUrl: agent.base_url ?? undefined,
    };

    const start = Date.now();
    const result = await this.provider.classify(config, message, DEFAULT_LABELS);

    await this.logRepo.save({
      company_id: companyId,
      agent_id: agent.id,
      type: 'classify',
      prompt: message,
      response: JSON.stringify(result),
      tokens_used: 0,
      duration_ms: Date.now() - start,
    } as any);

    return { intent: result.label, confidence: result.confidence };
  }
}
