import { Injectable, Logger } from '@nestjs/common';

import { Session, SessionStatus } from '../../whatsapp/entities/session.entity';
import { SessionRepository } from '../../whatsapp/repositories/session.repository';

@Injectable()
export class SessionClonerService {
  private readonly logger = new Logger(SessionClonerService.name);

  constructor(private readonly sessionRepository: SessionRepository) {}

  /**
   * Export auth state from a session as a JSON string.
   */
  async exportAuthState(sessionId: string, companyId: string): Promise<string> {
    const session = await this.sessionRepository.findByIdAndCompany(sessionId, companyId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.auth_state) {
      throw new Error('Session has no auth state to export');
    }

    this.logger.log(`[${sessionId}] Auth state exported`);
    return session.auth_state;
  }

  /**
   * Import auth state into a session.
   */
  async importAuthState(
    sessionId: string,
    companyId: string,
    authState: string,
  ): Promise<void> {
    const session = await this.sessionRepository.findByIdAndCompany(sessionId, companyId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Basic validation — ensure it looks like a valid JSON auth state
    try {
      const parsed = JSON.parse(authState);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid auth state format');
      }
    } catch {
      throw new Error('Auth state must be valid JSON');
    }

    await this.sessionRepository.update(sessionId, {
      auth_state: authState,
      status: SessionStatus.DISCONNECTED,
    });

    this.logger.log(`[${sessionId}] Auth state imported`);
  }

  /**
   * Clone a session: creates a new session with the same auth state.
   */
  async cloneSession(
    sessionId: string,
    companyId: string,
    newName?: string,
  ): Promise<Session> {
    const source = await this.sessionRepository.findByIdAndCompany(sessionId, companyId);
    if (!source) {
      throw new Error('Source session not found');
    }

    if (!source.auth_state) {
      throw new Error('Source session has no auth state to clone');
    }

    const cloned = await this.sessionRepository.save(
      this.sessionRepository.create({
        company_id: companyId,
        session_name: newName ?? `${source.session_name} (Clone)`,
        status: SessionStatus.DISCONNECTED,
        auth_state: source.auth_state,
        phone_number: source.phone_number,
      }),
    );

    this.logger.log(
      `[${sessionId}] Cloned to new session ${cloned.id} (${cloned.session_name})`,
    );

    return cloned;
  }

  /**
   * Get sessions that can be cloned (have auth state).
   */
  async getCloneableSessions(companyId: string): Promise<Session[]> {
    const sessions = await this.sessionRepository.findByCompanyId(companyId);
    return sessions.filter((s) => !!s.auth_state);
  }
}
