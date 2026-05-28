import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { NotesController } from '@/modules/inbox/controllers/notes.controller';
import { InboxService } from '@/modules/inbox/services/inbox.service';

describe('NotesController', () => {
  let controller: NotesController;
  let inbox: InboxService;

  const mockInbox = {
    getNotes: jest.fn(),
    addNote: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [
        { provide: InboxService, useValue: mockInbox },
      ],
    }).compile();

    controller = module.get<NotesController>(NotesController);
    inbox = module.get<InboxService>(InboxService);

    jest.clearAllMocks();
  });

  describe('GET :conversationId/notes', () => {
    it('should return notes for conversation', async () => {
      const notes = [
        { id: 'note-1', content: 'Note content', author_id: 'user-1' },
      ];
      mockInbox.getNotes.mockResolvedValue(notes);

      const result = await controller.list('conv-1');

      expect(inbox.getNotes).toHaveBeenCalledWith('conv-1');
      expect(result).toEqual(notes);
    });

    it('should return empty list when no notes', async () => {
      mockInbox.getNotes.mockResolvedValue([]);

      const result = await controller.list('conv-1');

      expect(result).toEqual([]);
    });
  });

  describe('POST :conversationId/notes', () => {
    it('should create a note with system author', async () => {
      const note = { id: 'note-1', content: 'New note', author_id: 'system' };
      mockInbox.addNote.mockResolvedValue(note);

      const result = await controller.create('conv-1', { content: 'New note' });

      expect(inbox.addNote).toHaveBeenCalledWith('conv-1', 'system', 'New note');
      expect(result).toEqual(note);
    });

    it('should throw when conversation not found', async () => {
      mockInbox.addNote.mockRejectedValue(new NotFoundException('Conversation not found'));

      await expect(controller.create('conv-404', { content: 'Note' })).rejects.toThrow(NotFoundException);
    });
  });
});
