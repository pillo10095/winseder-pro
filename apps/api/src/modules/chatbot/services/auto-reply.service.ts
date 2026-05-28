import { Injectable, Logger } from '@nestjs/common';
import { WASocket } from '@whiskeysockets/baileys';

import { RuleAction } from '../entities/automation-rule.entity';
import { BaileysClientService } from '../../whatsapp/services/baileys-client.service';
import { AiHookService } from './ai-hook.service';
import { AiActionService } from './ai-action.service';

export interface AutoReplyRequest {
  companyId: string;
  sessionId: string;
  remoteJid: string;
  content: string;
  action: RuleAction;
}

@Injectable()
export class AutoReplyService {
  private readonly logger = new Logger(AutoReplyService.name);

  constructor(
    private readonly baileysClient: BaileysClientService,
    private readonly aiHook: AiHookService,
    private readonly aiAction: AiActionService,
  ) {}

  async execute(request: AutoReplyRequest): Promise<boolean> {
    const { companyId, sessionId, remoteJid, content, action } = request;

    switch (action.type) {
      case 'reply.text': {
        const text = action.config.text || action.config.message || '';
        if (!text) {
          this.logger.warn(`reply.text action with no text content`);
          return false;
        }
        return this.sendText(sessionId, remoteJid, text);
      }

      case 'reply.image': {
        const imageUrl = action.config.url || action.config.image_url || '';
        const caption = action.config.caption || '';
        if (!imageUrl) {
          this.logger.warn(`reply.image action with no image_url`);
          return false;
        }
        return this.sendImage(sessionId, remoteJid, imageUrl, caption);
      }

      case 'ai_hook': {
        const endpoint = action.config.endpoint || action.config.url || '';
        if (!endpoint) {
          this.logger.warn(`ai_hook action with no endpoint`);
          return false;
        }
        await this.aiHook.forwardToAi(endpoint, {
          sessionId,
          remoteJid,
          message: content,
          config: action.config,
        });
        return true;
      }

      case 'ai_reply':
      case 'ai_classify':
      case 'ai_hot_lead':
        return this.aiAction.execute({
          companyId,
          sessionId,
          remoteJid,
          content,
          action,
        });

      case 'webhook':
        // Webhook actions are handled by the webhook module via events
        // This is just a marker — the rule-matched event will fire separately
        return true;

      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.logger.warn(`Unknown action type: ${(action as any).type}`);
        return false;
    }
  }

  private async sendText(sessionId: string, jid: string, text: string): Promise<boolean> {
    try {
      const socket = this.getSocket(sessionId);
      if (!socket) return false;

      await socket.sendMessage(jid, { text });
      this.logger.debug(`Auto-reply sent to ${jid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send auto-reply: ${(error as Error).message}`);
      return false;
    }
  }

  private async sendImage(sessionId: string, jid: string, url: string, caption: string): Promise<boolean> {
    try {
      const socket = this.getSocket(sessionId);
      if (!socket) return false;

      const response = await fetch(url);
      const buffer = Buffer.from(await response.arrayBuffer());

      await socket.sendMessage(jid, { image: buffer, caption: caption || undefined });
      this.logger.debug(`Auto-reply image sent to ${jid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send auto-reply image: ${(error as Error).message}`);
      return false;
    }
  }

  private getSocket(sessionId: string): WASocket | undefined {
    return this.baileysClient.getSocket(sessionId);
  }
}
