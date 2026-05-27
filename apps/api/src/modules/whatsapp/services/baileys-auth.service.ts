import { Injectable, Logger } from '@nestjs/common';
import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  SignalDataTypeMap,
} from '@whiskeysockets/baileys';

import { SessionRepository } from '../repositories/session.repository';

/**
 * Custom auth state provider that stores credentials in the database
 * instead of the file system (useMultiFileAuthState is IO-heavy and NOT for production).
 *
 * Each session has its own auth state stored as JSON in the `auth_state` column.
 */
@Injectable()
export class BaileysAuthService {
  private readonly logger = new Logger(BaileysAuthService.name);

  constructor(private readonly sessionRepository: SessionRepository) {}

  async getAuthState(sessionId: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });

    let creds: AuthenticationCreds;
    let keys: Record<string, Record<string, unknown>> = {};

    if (session?.auth_state) {
      try {
        const parsed = JSON.parse(session.auth_state, BufferJSON.reviver);
        creds = parsed.creds;
        keys = parsed.keys || {};
      } catch {
        this.logger.warn(`Failed to parse auth state for session ${sessionId}, re-initializing`);
        creds = initAuthCreds();
      }
    } else {
      creds = initAuthCreds();
    }

    const saveCreds = async (): Promise<void> => {
      try {
        const serialized = JSON.stringify({ creds, keys }, BufferJSON.replacer);
        await this.sessionRepository.update(sessionId, { auth_state: serialized });
      } catch (err) {
        this.logger.error(`Failed to save auth state for session ${sessionId}`, err);
      }
    };

    return {
      state: {
        creds,
        keys: {
          get: async <T extends keyof SignalDataTypeMap>(
            type: T,
            ids: string[],
          ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = keys[type as string] as Record<string, any> | undefined;
            const result: Record<string, unknown> = {};
            for (const id of ids) {
              if (data?.[id] !== undefined) {
                result[id] = data[id];
              }
            }
            return result as { [id: string]: SignalDataTypeMap[T] };
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          set: async (data: Partial<Record<keyof SignalDataTypeMap, Record<string, any>>>): Promise<void> => {
            for (const type in data) {
              const entries = data[type as keyof SignalDataTypeMap];
              if (entries) {
                keys[type] = { ...(keys[type] || {}), ...entries };
              }
            }
            await saveCreds();
          },
          clear: async (): Promise<void> => {
            keys = {};
            await saveCreds();
          },
        },
      },
      saveCreds,
    };
  }
}
