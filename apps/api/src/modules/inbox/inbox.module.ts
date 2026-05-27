import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConversationNote } from './entities/conversation-note.entity';
import { ConversationNoteRepository } from './repositories/conversation-note.repository';
import { InboxService } from './services/inbox.service';
import { InboxController } from './controllers/inbox.controller';
import { NotesController } from './controllers/notes.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationNote]),
    WhatsAppModule,
  ],
  controllers: [InboxController, NotesController],
  providers: [
    ConversationNoteRepository,
    InboxService,
  ],
  exports: [InboxService],
})
export class InboxModule {}
