import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CreateAiAgentDto } from '../dto/ai-agent.dto';
import { AiAgent } from '../entities/ai-agent.entity';
import { AiAgentRepository } from '../repositories/ai-agent.repository';
import { AiLogRepository } from '../repositories/ai-log.repository';
import { AiProviderConfig, AiProviderService } from './ai-provider.service';

@Injectable()
export class AiAgentService {
  constructor(
    private readonly agentRepo: AiAgentRepository,
    private readonly logRepo: AiLogRepository,
    private readonly provider: AiProviderService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getOrCreate(companyId: string): Promise<AiAgent> {
    let agent = await this.agentRepo.findByCompanyId(companyId);
    if (!agent) {
      agent = this.agentRepo.create({ company_id: companyId });
      agent = await this.agentRepo.save(agent);
    }
    return agent;
  }

  async update(
    companyId: string,
    dto: CreateAiAgentDto,
  ): Promise<AiAgent> {
    const agent = await this.agentRepo.findByCompanyId(companyId);
    if (!agent) throw new NotFoundException('AI agent not found');

    Object.assign(agent, dto);
    return this.agentRepo.save(agent);
  }

  async chat(
    companyId: string,
    message: string,
    conversationContext?: string,
  ): Promise<{ reply: string }> {
    const agent = await this.agentRepo.findActiveByCompanyId(companyId);
    if (!agent) throw new BadRequestException('No active AI agent configured');
    if (!agent.api_key) throw new BadRequestException('API key not configured');

    const config: AiProviderConfig = {
      apiKey: agent.api_key,
      model: agent.model,
      temperature: Number(agent.temperature),
      maxTokens: agent.max_tokens,
      baseUrl: agent.base_url ?? undefined,
    };

    const messages = [];
    if (agent.system_prompt) {
      messages.push({ role: 'system' as const, content: agent.system_prompt });
    }
    if (conversationContext) {
      messages.push({ role: 'system' as const, content: `Conversation context:\n${conversationContext}` });
    }
    messages.push({ role: 'user' as const, content: message });

    const response = await this.provider.chat(config, messages);

    await this.logRepo.save({
      company_id: companyId,
      agent_id: agent.id,
      type: 'chat',
      prompt: message,
      response: response.content,
      tokens_used: response.tokensUsed,
      duration_ms: response.durationMs,
    } as any);

    return { reply: response.content };
  }
}
