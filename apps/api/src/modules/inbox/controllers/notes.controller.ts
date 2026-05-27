import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { InboxService } from '../services/inbox.service';
import { CreateNoteDto } from '../dto/create-note.dto';

@Controller('conversations/:conversationId/notes')
export class NotesController {
  constructor(private readonly inbox: InboxService) {}

  @Get()
  async list(@Param('conversationId') conversationId: string): Promise<unknown> {
    return this.inbox.getNotes(conversationId);
  }

  @Post()
  async create(
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateNoteDto,
  ): Promise<unknown> {
    // TODO: get author_id from current authenticated user
    return this.inbox.addNote(conversationId, 'system', dto.content);
  }
}
