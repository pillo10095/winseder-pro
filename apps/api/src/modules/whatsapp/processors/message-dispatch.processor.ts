import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import Bottleneck from 'bottleneck';

import { BuilderbotProviderService } from '../services/builderbot-provider.service';
import { SessionRepository } from '../repositories/session.repository';
import { CampaignContactRepository } from '../../campaigns/repositories/campaign-contact.repository';
import { CampaignRepository } from '../../campaigns/repositories/campaign.repository';

interface MessageJobData {
  campaignId: string;
  companyId: string;
  contactId: string;
  phone: string;
  contactName?: string;
  messageBody: string;
}

const MSG_PER_MIN = Number(process.env.WHATSAPP_RATE_PER_MIN ?? 30);
const MIN_TIME_MS = Math.round(60_000 / MSG_PER_MIN); // ej: 2000ms para 30/min

@Injectable()
@Processor('message-dispatch')
export class MessageDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageDispatchProcessor.name);

  /** Un limiter por sesión de WhatsApp */
  private readonly limiters = new Map<string, Bottleneck>();

  constructor(
    private readonly botProvider: BuilderbotProviderService,
    private readonly sessionRepository: SessionRepository,
    private readonly campaignContactRepo: CampaignContactRepository,
    private readonly campaignRepo: CampaignRepository,
  ) {
    super();
  }

  async process(job: Job<MessageJobData>): Promise<void> {
    const { campaignId, companyId, contactId, phone, contactName, messageBody } = job.data;

    try {
      // 1. Get an active WhatsApp session for this company
      const session = await this.sessionRepository.findActiveByCompanyId(companyId);
      if (!session) {
        this.logger.warn(
          `[MessageDispatch] Campaña ${campaignId}: no hay sesión activa para company ${companyId}`,
        );
        await this.markContactFailed(campaignId, contactId, 'No active WhatsApp session');
        return;
      }

      // 2. Get or create a rate limiter for this session
      const limiter = this.getLimiter(session.id);

      // 3. Get the WhatsApp socket for this session
      const sock = this.botProvider.getSocket(session.id);
      if (!sock) {
        this.logger.warn(
          `[MessageDispatch] Campaña ${campaignId}: socket no disponible para sesión ${session.id}`,
        );
        await this.markContactFailed(campaignId, contactId, 'Socket not available');
        return;
      }

      // 4. Format the phone number as a WhatsApp JID
      const cleanPhone = phone.replace(/[^\d]/g, '');
      const jid = `${cleanPhone}@s.whatsapp.net`;

      // 5. Wait for rate-limit token, then send via Baileys
      await limiter.schedule({ expiration: 30_000 }, async () => {
        this.logger.debug(
          `[MessageDispatch] Enviando a ${contactName || phone} (jid: ${jid}): "${messageBody.substring(0, 60)}..."`,
        );

        const result = await sock.sendMessage(jid, { text: messageBody });

        // 6. Mark as sent in campaign_contacts
        await this.campaignContactRepo.update(
          { campaign_id: campaignId, contact_id: contactId },
          {
            status: 'sent',
            sent_at: new Date(),
          },
        );

        // 7. Increment campaign sent_count
        await this.campaignRepo.increment({ id: campaignId }, 'sent_count', 1);

        this.logger.debug(
          `[MessageDispatch] ✅ ${contactName || phone} — messageId: ${result?.key?.id}`,
        );
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[MessageDispatch] ❌ Error enviando a ${phone}: ${errMsg}`,
      );

      await this.markContactFailed(campaignId, contactId, errMsg);

      // Re-throw so BullMQ marks the job as failed (for retry)
      throw error;
    }
  }

  private getLimiter(sessionId: string): Bottleneck {
    let limiter = this.limiters.get(sessionId);
    if (!limiter) {
      this.logger.log(
        `[RateLimit] Creando limiter para sesión ${sessionId}: ${MSG_PER_MIN} msg/min`,
      );

      limiter = new Bottleneck({
        maxConcurrent: 1,
        minTime: MIN_TIME_MS,
        reservoir: MSG_PER_MIN,
        reservoirRefreshAmount: MSG_PER_MIN,
        reservoirRefreshInterval: 60_000,
      });

      // Log cuando se agota el reservoir
      limiter.on('depleted', () => {
        this.logger.debug(`[RateLimit] Reservoir agotado para sesión ${sessionId}, esperando...`);
      });

      this.limiters.set(sessionId, limiter);
    }
    return limiter;
  }

  private async markContactFailed(
    campaignId: string,
    contactId: string,
    errorMsg: string,
  ): Promise<void> {
    try {
      await this.campaignContactRepo.update(
        { campaign_id: campaignId, contact_id: contactId },
        {
          status: 'failed',
          error: errorMsg.substring(0, 500),
        },
      );
      await this.campaignRepo.increment({ id: campaignId }, 'failed_count', 1);
    } catch (dbErr) {
      this.logger.error(
        `[MessageDispatch] Error al actualizar estado fallido: ${dbErr instanceof Error ? dbErr.message : 'Unknown'}`,
      );
    }
  }
}
