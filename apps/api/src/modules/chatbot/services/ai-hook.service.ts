import { Injectable, Logger } from '@nestjs/common';

export interface AiHookPayload {
  sessionId: string;
  remoteJid: string;
  message: string;
  config: Record<string, string>;
}

@Injectable()
export class AiHookService {
  private readonly logger = new Logger(AiHookService.name);

  /**
   * Forward an incoming message to an external AI endpoint.
   * The endpoint is expected to handle reply generation separately.
   */
  async forwardToAi(endpoint: string, payload: AiHookPayload): Promise<void> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: payload.sessionId,
          remote_jid: payload.remoteJid,
          message: payload.message,
          ...payload.config,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`AI hook returned ${response.status} for ${endpoint}`);
      }
    } catch (error) {
      this.logger.error(`Failed to forward to AI hook ${endpoint}: ${(error as Error).message}`);
    }
  }
}
