import { BadRequestException, Injectable } from '@nestjs/common';

import { AiTrainingDocRepository } from '../repositories/ai-training-doc.repository';
import { AiAgentRepository } from '../repositories/ai-agent.repository';
import { AiLogRepository } from '../repositories/ai-log.repository';
import { AiProviderConfig, AiProviderService } from './ai-provider.service';

@Injectable()
export class RagService {
  constructor(
    private readonly agentRepo: AiAgentRepository,
    private readonly docRepo: AiTrainingDocRepository,
    private readonly logRepo: AiLogRepository,
    private readonly provider: AiProviderService,
  ) {}

  async answer(
    companyId: string,
    question: string,
  ): Promise<{ answer: string }> {
    const agent = await this.agentRepo.findActiveByCompanyId(companyId);
    if (!agent?.api_key) throw new BadRequestException('No active AI agent or API key');

    // Simple keyword-based chunk retrieval
    const docs = await this.docRepo.findByCompanyId(companyId);
    const queryWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const relevantChunks: string[] = [];

    for (const doc of docs) {
      const docChunks = (doc.chunks ?? [doc.content]) as string[];
      for (const chunk of docChunks) {
        const chunkLower = chunk.toLowerCase();
        const matchCount = queryWords.filter((w) => chunkLower.includes(w)).length;
        if (matchCount > 0) {
          relevantChunks.push(chunk);
        }
      }
    }

    if (relevantChunks.length === 0) {
      return { answer: 'No encontré información relevante en los documentos de entrenamiento.' };
    }

    const config: AiProviderConfig = {
      apiKey: agent.api_key,
      model: agent.model,
      temperature: 0.3,
      maxTokens: 500,
      baseUrl: agent.base_url ?? undefined,
    };

    const start = Date.now();
    const answer = await this.provider.answerWithContext(
      config,
      question,
      relevantChunks.slice(0, 5),
    );

    await this.logRepo.save({
      company_id: companyId,
      agent_id: agent.id,
      type: 'rag',
      prompt: question,
      response: answer,
      tokens_used: 0,
      duration_ms: Date.now() - start,
    } as Record<string, unknown>);

    return { answer };
  }
}
