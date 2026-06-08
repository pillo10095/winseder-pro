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

    // Auto-reconnect sessions that were CONNECTED before server restart
    this.restoreSessions();
  }

  private async restoreSessions(): Promise<void> {
    try {
      const connected = await this.sessionRepository.findByStatus(SessionStatus.CONNECTED);
      if (connected.length === 0) {
        this.logger.log('No connected sessions to restore');
        return;
      }

      this.logger.log(`Restoring ${connected.length} session(s)...`);
      for (const session of connected) {
        this.logger.log(`Reconnecting session ${session.id} (${session.session_name})`);
        await this.sessionRepository.update(session.id, {
          status: SessionStatus.CONNECTING,
        });
        this.baileysClient.createSocket(session.id, session.company_id).catch((err) => {
          this.logger.error(`Failed to restore session ${session.id}: ${err.message}`);
        });
      }
    } catch (err) {
      this.logger.error('Error restoring sessions', err);
    }
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
  async getSessions(companyId: string, status?: string): Promise<Session[]> {
    if (status && Object.values(SessionStatus).includes(status as SessionStatus)) {
      return this.sessionRepository.find({
        where: { company_id: companyId, status: status as SessionStatus },
        order: { created_at: 'DESC' },
      });
    }
    // Por defecto solo sesiones CONNECTED
    return this.sessionRepository.find({
      where: { company_id: companyId, status: SessionStatus.CONNECTED },
      order: { created_at: 'DESC' },
    });
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
