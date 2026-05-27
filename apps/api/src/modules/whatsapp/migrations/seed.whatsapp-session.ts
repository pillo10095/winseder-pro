import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Seed script for creating a test WhatsApp session structure.
 * Run via: `npx ts-node -r tsconfig-paths/register src/modules/whatsapp/migrations/seed.whatsapp-session.ts`
 */
@Injectable()
export class WhatsAppSessionSeed {
  private readonly logger = new Logger(WhatsAppSessionSeed.name);

  constructor(private readonly dataSource: DataSource) {}

  async seed(): Promise<void> {
    this.logger.log('No seed data needed for WhatsApp sessions');
    // Sessions are created dynamically when users connect WhatsApp.
    this.logger.log('Done');
  }
}
