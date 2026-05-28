import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { InboxController } from '@/modules/inbox/controllers/inbox.controller';
import { InboxService } from '@/modules/inbox/services/inbox.service';
import { ConversationStatus } from '@/modules/whatsapp/entities/conversation.entity';

describe('InboxController', () => {
  let controller: InboxController;
  let inbox: InboxService;

  const mockInbox = {
    findConversations: jest.fn(),
    assignConversation: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InboxController],
      providers: [
        { provide: InboxService, useValue: mockInbox },
      ],
    }).compile();

    controller = module.get<InboxController>(InboxController);
    inbox = module.get<InboxService>(InboxService);

    jest.clearAllMocks();
  });

  describe('GET :sessionId/conversations', () => {
    it('should return paginated conversations', async () => {
      const items = [{ id: 'conv-1' }, { id: 'conv-2' }];
      mockInbox.findConversations.mockResolvedValue([items, 2]);

      const result = await controller.list('session-1', undefined, undefined, undefined, '10', undefined);

      expect(inbox.findConversations).toHaveBeenCalledWith('session-1', undefined, undefined, undefined, 10, undefined);
      expect(result).toEqual({ items, total: 2 });
    });

    it('should use default limit of 20 when not provided', async () => {
      mockInbox.findConversations.mockResolvedValue([[], 0]);

      await controller.list('session-1', undefined, undefined, undefined, undefined, undefined);

      expect(inbox.findConversations).toHaveBeenCalledWith('session-1', undefined, undefined, undefined, 20, undefined);
    });

    it('should pass query parameters', async () => {
      mockInbox.findConversations.mockResolvedValue([[], 0]);

      await controller.list('session-1', ConversationStatus.OPEN, 'user-1', 'john', '5', 'cursor-1');

      expect(inbox.findConversations).toHaveBeenCalledWith('session-1', ConversationStatus.OPEN, 'user-1', 'john', 5, 'cursor-1');
    });

    it('should return empty list when no conversations', async () => {
      mockInbox.findConversations.mockResolvedValue([[], 0]);

      const result = await controller.list('session-1');

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('PATCH :conversationId/assign', () => {
    it('should assign conversation to user', async () => {
      const conversation = { id: 'conv-1', assigned_to: 'user-1' };
      mockInbox.assignConversation.mockResolvedValue(conversation);

      const result = await controller.assign('conv-1', { user_id: 'user-1' });

      expect(inbox.assignConversation).toHaveBeenCalledWith('conv-1', 'user-1');
      expect(result).toEqual(conversation);
    });

    it('should throw when conversation not found', async () => {
      mockInbox.assignConversation.mockRejectedValue(new NotFoundException('Conversation not found'));

      await expect(controller.assign('conv-404', { user_id: 'user-1' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH :conversationId/status', () => {
    it('should update conversation status', async () => {
      const conversation = { id: 'conv-1', status: ConversationStatus.CLOSED };
      mockInbox.updateStatus.mockResolvedValue(conversation);

      const result = await controller.updateStatus('conv-1', { status: ConversationStatus.CLOSED });

      expect(inbox.updateStatus).toHaveBeenCalledWith('conv-1', ConversationStatus.CLOSED);
      expect(result).toEqual(conversation);
    });

    it('should throw when conversation not found', async () => {
      mockInbox.updateStatus.mockRejectedValue(new NotFoundException('Conversation not found'));

      await expect(controller.updateStatus('conv-404', { status: ConversationStatus.CLOSED })).rejects.toThrow(NotFoundException);
    });
  });
});
