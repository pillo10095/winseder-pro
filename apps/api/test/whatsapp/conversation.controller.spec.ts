import { Test, type TestingModule } from '@nestjs/testing';

import { ConversationController } from '@/modules/whatsapp/controllers/conversation.controller';
import { ConversationRepository } from '@/modules/whatsapp/repositories/conversation.repository';
import { MessageRepository } from '@/modules/whatsapp/repositories/message.repository';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

describe('ConversationController', () => {
  let controller: ConversationController;
  let conversationRepo: any;
  let messageRepo: any;

  const mockConversationRepo = {
    findBySessionId: jest.fn(),
  };

  const mockMessageRepo = {
    findByConversation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        { provide: ConversationRepository, useValue: mockConversationRepo },
        { provide: MessageRepository, useValue: mockMessageRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<ConversationController>(ConversationController);
    conversationRepo = module.get<ConversationRepository>(ConversationRepository);
    messageRepo = module.get<MessageRepository>(MessageRepository);

    jest.clearAllMocks();
  });

  describe('GET /whatsapp/sessions/:sessionId/conversations', () => {
    it('should return paginated conversations', async () => {
      const data = [{ id: 'conv-1', contact_name: 'John' }];
      mockConversationRepo.findBySessionId.mockResolvedValue([data, 1]);

      const result = await controller.list('session-1', undefined, '10', undefined);

      expect(conversationRepo.findBySessionId).toHaveBeenCalledWith('session-1', undefined, 10, undefined);
      expect(result).toEqual({ data, total: 1 });
    });

    it('should use default limit of 20', async () => {
      mockConversationRepo.findBySessionId.mockResolvedValue([[], 0]);

      await controller.list('session-1');

      expect(conversationRepo.findBySessionId).toHaveBeenCalledWith('session-1', undefined, 20, undefined);
    });

    it('should pass search and cursor params', async () => {
      mockConversationRepo.findBySessionId.mockResolvedValue([[], 0]);

      await controller.list('session-1', 'john', '5', 'cursor-1');

      expect(conversationRepo.findBySessionId).toHaveBeenCalledWith('session-1', 'john', 5, 'cursor-1');
    });

    it('should return empty list', async () => {
      mockConversationRepo.findBySessionId.mockResolvedValue([[], 0]);

      const result = await controller.list('session-1');

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('GET .../:conversationId/messages', () => {
    it('should return paginated messages', async () => {
      const data = [{ id: 'msg-1', content: 'Hello' }];
      mockMessageRepo.findByConversation.mockResolvedValue([data, 1]);

      const result = await controller.getMessages('session-1', 'conv-1', '10', undefined);

      expect(messageRepo.findByConversation).toHaveBeenCalledWith('conv-1', 10, undefined);
      expect(result).toEqual({ data, total: 1 });
    });

    it('should use default limit of 50', async () => {
      mockMessageRepo.findByConversation.mockResolvedValue([[], 0]);

      await controller.getMessages('session-1', 'conv-1');

      expect(messageRepo.findByConversation).toHaveBeenCalledWith('conv-1', 50, undefined);
    });

    it('should return empty list', async () => {
      mockMessageRepo.findByConversation.mockResolvedValue([[], 0]);

      const result = await controller.getMessages('session-1', 'conv-1');

      expect(result).toEqual({ data: [], total: 0 });
    });
  });
});
