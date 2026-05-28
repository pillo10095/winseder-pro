import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Session, SessionStatus } from '../entities/session.entity';
import { SessionRepository } from '../repositories/session.repository';
import { BaileysClientService } from './baileys-client.service';
import { QrEventsService, QR_EVENTS, QrGeneratedEvent } from './qr-events.service';
import { QrService } from './qr.service';
import { MessageHandlerService } from './message-handler.service';
import { MessageRelayService } from './message-relay.service';
import { WhatsAppGateway } from '../gateways/whatsapp.gateway';

@Injectable()
export class SessionManagerService implements OnModuleInit {
  private readonly logger = new Logger(SessionManagerService.name);

  /** In-memory QR cache: sessionId → qrDataUrl */
  private readonly qrCache = new Map<string, string>();

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly baileysClient: BaileysClientService,
    private readonly qrService: QrService,
    private readonly qrEvents: QrEventsService,
    private readonly messageHandler: MessageHandlerService,
    private readonly messageRelay: MessageRelayService,
    private readonly eventEmitter: EventEmitter2,
    private readonly wsGateway: WhatsAppGateway,
  ) {}

  onModuleInit() {
    this.eventEmitter.on(QR_EVENTS.CODE_GENERATED, (event: QrGeneratedEvent) => {
      this.qrCache.set(event.sessionId, event.qrDataUrl);
      this.logger.debug(`QR cached for session ${event.sessionId}`);

      // Emit via WebSocket to frontend
      this.wsGateway.emitQrGenerated(event.companyId, {
        sessionId: event.sessionId,
        qrDataUrl: event.qrDataUrl,
        expiresAt: event.expiresAt.toISOString(),
      });
    });

    this.eventEmitter.on(QR_EVENTS.CODE_EXPIRED, (event: { sessionId: string }) => {
      this.qrCache.delete(event.sessionId);
    });
  }

  /**
   * Create a new WhatsApp session for a company.
   * Throws if the company already has an active session.
   */
  async createSession(companyId: string, sessionName?: string): Promise<Session> {
    const active = await this.sessionRepository.findActiveByCompanyId(companyId);
    if (active) {
      throw new Error('Company already has an active WhatsApp session. Disconnect first.');
    }

    const session = await this.sessionRepository.save(
      this.sessionRepository.create({
        company_id: companyId,
        session_name: sessionName || `WhatsApp - ${new Date().toLocaleDateString()}`,
        status: SessionStatus.CONNECTING,
      }),
    );

    // Start Baileys connection in background (don't block the response)
    this.baileysClient.createSocket(session.id, companyId).catch((err) => {
      this.logger.error(`Failed to create Baileys socket for ${session.id}: ${err.message}`);
    });

    return session;
  }

  /**
   * Get all sessions for a company.
   */
  async getSessions(companyId: string): Promise<Session[]> {
    return this.sessionRepository.findByCompanyId(companyId);
  }

  /**
   * Get a single session by ID.
   */
  async getSession(id: string, companyId: string): Promise<Session | null> {
    return this.sessionRepository.findByIdAndCompany(id, companyId);
  }

  /**
   * Disconnect a session.
   */
  async disconnectSession(id: string, companyId: string): Promise<void> {
    const session = await this.sessionRepository.findByIdAndCompany(id, companyId);
    if (!session) {
      throw new Error('Session not found');
    }

    await this.baileysClient.endSocket(id);
    await this.sessionRepository.update(id, {
      status: SessionStatus.DISCONNECTED,
      auth_state: null,
    });
  }

  /**
   * Get the QR code for a connecting session.
   * Returns the current QR or throws if the session is not in QR_CODE state.
   */
  async getQrCode(id: string, companyId: string): Promise<string> {
    const session = await this.sessionRepository.findByIdAndCompany(id, companyId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status !== SessionStatus.QR_CODE && session.status !== SessionStatus.CONNECTING) {
      throw new Error(`Session is ${session.status}, not ready for QR scan`);
    }

    const cached = this.qrCache.get(id);
    if (!cached) {
      throw new Error('QR code not yet generated');
    }
    return cached;
  }

  /**
   * Health check: verify session connectivity.
   */
  async checkHealth(id: string): Promise<{ ok: boolean; status: SessionStatus; lastSeen?: Date }> {
    const session = await this.sessionRepository.findOne({ where: { id } });
    if (!session) {
      return { ok: false, status: SessionStatus.DISCONNECTED };
    }

    const hasSocket = this.baileysClient.hasActiveSocket(id);
    return {
      ok: hasSocket && session.status === SessionStatus.CONNECTED,
      status: session.status,
      lastSeen: session.last_seen ?? undefined,
    };
  }
}
