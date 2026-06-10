import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { InboxService } from '../services/inbox.service';
import { CreateNoteDto } from '../dto/create-note.dto';

@Controller('conversations/:conversationId/notes')
@UseGuards(JwtAuthGuard)
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
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    return this.inbox.addNote(conversationId, userId, dto.content);
  }
}
