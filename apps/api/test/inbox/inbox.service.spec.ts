import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InboxService } from '@/modules/inbox/services/inbox.service';
import { ConversationRepository } from '@/modules/whatsapp/repositories/conversation.repository';
import { ConversationNoteRepository } from '@/modules/inbox/repositories/conversation-note.repository';
import { Conversation, ConversationStatus } from '@/modules/whatsapp/entities/conversation.entity';
import { NotFoundException } from '@nestjs/common';

describe('InboxService', () => {
  let service: InboxService;
  let conversationRepo: jest.Mocked<ConversationRepository>;
  let noteRepo: jest.Mocked<ConversationNoteRepository>;

  const mockConversation = {
    id: 'conv-1',
    session_id: 'session-1',
    contact_jid: '5511999999999@s.whatsapp.net',
    contact_name: 'John Doe',
    status: ConversationStatus.OPEN,
    assigned_to: null,
    last_message_at: new Date(),
    unread_count: 3,
  } as Conversation;

  beforeEach(async () => {
    conversationRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    noteRepo = {
      save: jest.fn(),
      create: jest.fn(),
      findByConversationId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: ConversationRepository, useValue: conversationRepo },
        { provide: ConversationNoteRepository, useValue: noteRepo },
      ],
    }).compile();

    service = module.get<InboxService>(InboxService);
  });

  describe('assignConversation', () => {
    it('should assign a user to a conversation', async () => {
      conversationRepo.findOne.mockResolvedValue(mockConversation);
      conversationRepo.save.mockResolvedValue({ ...mockConversation, assigned_to: 'user-1' });

      const result = await service.assignConversation('conv-1', 'user-1');

      expect(result.assigned_to).toBe('user-1');
      expect(conversationRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      conversationRepo.findOne.mockResolvedValue(null);
      await expect(service.assignConversation('invalid', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update conversation status', async () => {
      conversationRepo.findOne.mockResolvedValue(mockConversation);
      conversationRepo.save.mockResolvedValue({ ...mockConversation, status: ConversationStatus.CLOSED });

      const result = await service.updateStatus('conv-1', ConversationStatus.CLOSED);

      expect(result.status).toBe(ConversationStatus.CLOSED);
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      conversationRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus('invalid', ConversationStatus.CLOSED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addNote', () => {
    it('should create a note for the conversation', async () => {
      conversationRepo.findOne.mockResolvedValue(mockConversation);
      noteRepo.create.mockReturnValue({} as any);
      noteRepo.save.mockResolvedValue({
        id: 'note-1',
        conversation_id: 'conv-1',
        author_id: 'user-1',
        content: 'Test note',
      } as any);

      const result = await service.addNote('conv-1', 'user-1', 'Test note');

      expect(result).toBeDefined();
      expect(noteRepo.create).toHaveBeenCalledWith({
        conversation_id: 'conv-1',
        author_id: 'user-1',
        content: 'Test note',
      });
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      conversationRepo.findOne.mockResolvedValue(null);
      await expect(service.addNote('invalid', 'user-1', 'Note')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getNotes', () => {
    it('should return notes for a conversation', async () => {
      const notes = [
        { id: 'note-1', content: 'Note 1', author: { name: 'User' } },
      ];
      noteRepo.findByConversationId.mockResolvedValue(notes as any);

      const result = await service.getNotes('conv-1');
      expect(result).toEqual(notes);
    });
  });

  describe('findConversations', () => {
    it('should query with filters', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockConversation], 1]),
      };
      conversationRepo.createQueryBuilder.mockReturnValue(qb as any);

      const [items, total] = await service.findConversations(
        'session-1',
        ConversationStatus.OPEN,
        undefined,
        undefined,
        20,
      );

      expect(items).toHaveLength(1);
      expect(total).toBe(1);
      expect(qb.where).toHaveBeenCalledWith('c.session_id = :sessionId', {
        sessionId: 'session-1',
      });
    });
  });
});
