import { Test, type TestingModule } from '@nestjs/testing';

import { MessageController } from '@/modules/whatsapp/controllers/message.controller';
import { MessageRepository } from '@/modules/whatsapp/repositories/message.repository';
import { ConversationRepository } from '@/modules/whatsapp/repositories/conversation.repository';
import { MessageType, MessageStatus } from '@/modules/whatsapp/entities/message.entity';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

describe('MessageController', () => {
  let controller: MessageController;
  let messageRepo: any;
  let conversationRepo: any;

  const mockMessageRepo = {
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockConversationRepo = {};

  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date('2026-05-28T12:00:00Z') });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [
        { provide: MessageRepository, useValue: mockMessageRepo },
        { provide: ConversationRepository, useValue: mockConversationRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<MessageController>(MessageController);
    messageRepo = module.get<MessageRepository>(MessageRepository);
    conversationRepo = module.get<ConversationRepository>(ConversationRepository);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('POST /whatsapp/sessions/:sessionId/messages', () => {
    it('should save a pending message and return it', async () => {
      const dto = { conversation_id: 'conv-1', content: 'Hello', type: MessageType.TEXT };
      const saved = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        session_id: 'session-1',
        message_id: 'pending-1716883200000',
        type: MessageType.TEXT,
        content: 'Hello',
        from_me: true,
        timestamp: new Date('2026-05-28T12:00:00Z'),
        status: MessageStatus.PENDING,
      };
      mockMessageRepo.create.mockReturnValue(saved);
      mockMessageRepo.save.mockResolvedValue(saved);

      const result = await controller.send('session-1', dto);

      expect(messageRepo.create).toHaveBeenCalledWith({
        conversation_id: 'conv-1',
        session_id: 'session-1',
        message_id: `pending-${Date.now()}`,
        type: MessageType.TEXT,
        content: 'Hello',
        from_me: true,
        timestamp: new Date('2026-05-28T12:00:00Z'),
        status: MessageStatus.PENDING,
      });
      expect(messageRepo.save).toHaveBeenCalledWith(saved);
      expect(result).toEqual({ data: saved });
    });

    it('should default type to TEXT when not provided', async () => {
      const dto = { conversation_id: 'conv-1', content: 'Hi' };
      const saved = { id: 'msg-2' };
      mockMessageRepo.create.mockReturnValue(saved);
      mockMessageRepo.save.mockResolvedValue(saved);

      await controller.send('session-1', dto as any);

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: MessageType.TEXT }),
      );
    });

    it('should return error when conversation_id is missing', async () => {
      const dto = { content: 'Hello' };

      const result = await controller.send('session-1', dto as any);

      expect(result).toEqual({ error: 'conversation_id is required' });
      expect(mockMessageRepo.save).not.toHaveBeenCalled();
    });
  });
});
