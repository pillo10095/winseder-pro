import { Injectable, Logger } from '@nestjs/common';
import { WASocket } from '@whiskeysockets/baileys';

import { RuleAction } from '../entities/automation-rule.entity';
import { BaileysClientService } from '../../whatsapp/services/baileys-client.service';
import { AiAgentService } from '../../ai/services/ai-agent.service';
import { IntentClassifierService } from '../../ai/services/intent-classifier.service';
import { HotLeadDetectorService } from '../../ai/services/hot-lead-detector.service';
import { AiLogRepository } from '../../ai/repositories/ai-log.repository';

export interface AiActionRequest {
  companyId: string;
  sessionId: string;
  remoteJid: string;
  content: string;
  action: RuleAction;
}

@Injectable()
export class AiActionService {
  private readonly logger = new Logger(AiActionService.name);

  constructor(
    private readonly baileysClient: BaileysClientService,
    private readonly aiAgent: AiAgentService,
    private readonly classifier: IntentClassifierService,
    private readonly hotLead: HotLeadDetectorService,
    private readonly logRepo: AiLogRepository,
  ) {}

  async execute(request: AiActionRequest): Promise<boolean> {
    const { companyId, sessionId, remoteJid, content, action } = request;

    try {
      switch (action.type) {
        case 'ai_reply':
          return this.handleAiReply(companyId, sessionId, remoteJid, content, action.config);

        case 'ai_classify':
          return this.handleClassify(companyId, content);

        case 'ai_hot_lead':
          return this.handleHotLead(companyId, sessionId, remoteJid, content);

        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`AI action error: ${(error as Error).message}`);
      return false;
    }
  }

  private async handleAiReply(
    companyId: string,
    sessionId: string,
    remoteJid: string,
    content: string,
    config: Record<string, string>,
  ): Promise<boolean> {
    const systemPrompt = config.system_prompt || undefined;
    const { reply } = await this.aiAgent.chat(companyId, content, systemPrompt);

    const socket = this.getSocket(sessionId);
    if (!socket) return false;

    await socket.sendMessage(remoteJid, { text: reply });
    this.logger.debug(`AI reply sent to ${remoteJid}`);
    return true;
  }

  private async handleClassify(
    companyId: string,
    content: string,
  ): Promise<boolean> {
    const result = await this.classifier.classify(companyId, content);

    await this.logRepo.save({
      company_id: companyId,
      type: 'automation_classify',
      prompt: content,
      response: JSON.stringify(result),
      tokens_used: 0,
      duration_ms: 0,
    } as any);

    this.logger.debug(`Classified intent: ${result.intent} (${result.confidence})`);
    return true;
  }

  private async handleHotLead(
    companyId: string,
    sessionId: string,
    remoteJid: string,
    content: string,
  ): Promise<boolean> {
    const result = await this.hotLead.detect(companyId, content, {
      sessionId,
      conversationId: remoteJid,
    });

    return true;
  }

  private getSocket(sessionId: string): WASocket | undefined {
    return this.baileysClient.getSocket(sessionId);
  }
}
