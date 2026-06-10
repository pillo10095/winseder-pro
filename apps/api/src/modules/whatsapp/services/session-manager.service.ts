import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Session, SessionStatus } from '../entities/session.entity';
import { SessionRepository } from '../repositories/session.repository';
import { BuilderbotProviderService } from './builderbot-provider.service';
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
    private readonly builderbotProvider: BuilderbotProviderService,
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
    this.restoreSessions().catch((err) =>
      this.logger.error('Failed to restore sessions on startup', err),
    );
  }

  private async restoreSessions(): Promise<void> {
    try {
      const toRestore = await this.sessionRepository.find({
        where: [
          { status: SessionStatus.CONNECTED },
          { status: SessionStatus.CONNECTING },
          { status: SessionStatus.QR_CODE },
        ],
      });
      if (toRestore.length === 0) {
        this.logger.log('No sessions to restore');
        return;
      }

      this.logger.log(`Restoring ${toRestore.length} session(s)...`);
      for (const session of toRestore) {
        this.logger.log(`Reconnecting session ${session.id} (${session.session_name})`);
        await this.sessionRepository.update(session.id, {
          status: SessionStatus.CONNECTING,
        });
        this.builderbotProvider.createSession(session.id, session.company_id).catch(async (err) => {
          this.logger.error(`Failed to restore session ${session.id}: ${err.message}`);
          await this.sessionRepository.update(session.id, {
            status: SessionStatus.DISCONNECTED,
          });
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

    // Start BuilderBot connection in background (don't block the response)
    this.builderbotProvider.createSession(session.id, companyId).catch(async (err) => {
      this.logger.error(`Failed to create session ${session.id}: ${err.message}`);
      await this.sessionRepository.update(session.id, {
        status: SessionStatus.DISCONNECTED,
      });
    });

    return session;
  }

  /**
   * Get all sessions for a company.
   */
  async getSessions(companyId: string, status?: string): Promise<Session[]> {
    const where: any = { company_id: companyId };

    if (status && status !== 'all') {
      if (Object.values(SessionStatus).includes(status as SessionStatus)) {
        where.status = status as SessionStatus;
      }
    }

    return this.sessionRepository.find({
      where,
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

    await this.builderbotProvider.endSession(id);
    await this.sessionRepository.update(id, {
      status: SessionStatus.DISCONNECTED,
      auth_state: null,
    });
  }

  /**
   * Get the QR code for a connecting session.
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
   * Get all connected sessions for a company.
   */
  getConnectedSessions(companyId: string): { sessionId: string; companyId: string }[] {
    return this.builderbotProvider
      .getConnectedSessions()
      .filter((s) => s.companyId === companyId);
  }

  /**
   * Manually extract WhatsApp contacts into the CRM.
   */
  async extractContacts(sessionId: string, companyId: string): Promise<{ created: number; skipped: number }> {
    const session = await this.sessionRepository.findByIdAndCompany(sessionId, companyId);
    if (!session) {
      throw new Error('Session not found');
    }
    return this.builderbotProvider.extractContacts(sessionId, companyId);
  }

  /**
   * Health check: verify session connectivity.
   */
  async checkHealth(id: string): Promise<{ ok: boolean; status: SessionStatus; lastSeen?: Date }> {
    const session = await this.sessionRepository.findOne({ where: { id } });
    if (!session) {
      return { ok: false, status: SessionStatus.DISCONNECTED };
    }

    const hasSocket = this.builderbotProvider.hasActiveSocket(id);
    return {
      ok: hasSocket && session.status === SessionStatus.CONNECTED,
      status: session.status,
      lastSeen: session.last_seen ?? undefined,
    };
  }
}
