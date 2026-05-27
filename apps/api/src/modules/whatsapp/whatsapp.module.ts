import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Session } from './entities/session.entity';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { SessionRepository } from './repositories/session.repository';
import { MessageRepository } from './repositories/message.repository';
import { ConversationRepository } from './repositories/conversation.repository';
import { BaileysClientService } from './services/baileys-client.service';
import { BaileysAuthService } from './services/baileys-auth.service';
import { BaileysReconnectService } from './services/baileys-reconnect.service';
import { QrService } from './services/qr.service';
import { QrEventsService } from './services/qr-events.service';
import { MessageHandlerService } from './services/message-handler.service';
import { MessageRelayService } from './services/message-relay.service';
import { SessionManagerService } from './services/session-manager.service';
import { SessionController } from './controllers/session.controller';
import { SessionStatusController } from './controllers/session-status.controller';
import { MessageController } from './controllers/message.controller';
import { ConversationController } from './controllers/conversation.controller';
import { WebhookController } from './controllers/webhook.controller';
import { WhatsAppGateway } from './gateways/whatsapp.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Message, Conversation]),
  ],
  controllers: [
    SessionController,
    SessionStatusController,
    MessageController,
    ConversationController,
    WebhookController,
  ],
  providers: [
    // Repositories
    SessionRepository,
    MessageRepository,
    ConversationRepository,
    // Services
    BaileysClientService,
    BaileysAuthService,
    BaileysReconnectService,
    QrService,
    QrEventsService,
    MessageHandlerService,
    MessageRelayService,
    SessionManagerService,
    // Gateways
    WhatsAppGateway,
  ],
  exports: [
    BaileysClientService,
    SessionManagerService,
    SessionRepository,
    ConversationRepository,
    MessageHandlerService,
  ],
})
export class WhatsAppModule {}
