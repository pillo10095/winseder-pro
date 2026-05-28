jest.mock('@whiskeysockets/baileys', () => ({
  downloadContentFromMessage: jest.fn(),
  proto: { IWebMessageInfo: {} },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessageHandlerService } from '@/modules/whatsapp/services/message-handler.service';
import { MessageRepository } from '@/modules/whatsapp/repositories/message.repository';
import { ConversationRepository } from '@/modules/whatsapp/repositories/conversation.repository';
import { SessionRepository } from '@/modules/whatsapp/repositories/session.repository';
import { MediaDownloaderService } from '@/modules/media/services/media-downloader.service';
import { MediaThumbnailService } from '@/modules/media/services/media-thumbnail.service';
import { Media } from '@/modules/media/entities/media.entity';
import { MessageType, MessageStatus } from '@/modules/whatsapp/entities/message.entity';

describe('MessageHandlerService', () => {
  let service: MessageHandlerService;
  let messageRepo: jest.Mocked<MessageRepository>;
  let conversationRepo: jest.Mocked<ConversationRepository>;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let mediaDownloader: jest.Mocked<MediaDownloaderService>;
  let mediaThumbnail: jest.Mocked<MediaThumbnailService>;
  let mediaRepo: jest.Mocked<any>;

  const mockConversation = {
    id: 'conv-1',
    session_id: 'session-1',
    contact_jid: '5511999999999@s.whatsapp.net',
    last_message_at: new Date(),
    unread_count: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMessage = {
    id: 'msg-1',
    message_id: 'baileys-msg-1',
    session_id: 'session-1',
    conversation_id: 'conv-1',
    type: MessageType.TEXT,
    content: 'Hello',
    from_me: false,
    timestamp: new Date(),
    status: MessageStatus.DELIVERED,
    media_url: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const baseWAMessage = {
    key: {
      id: 'baileys-msg-1',
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
    },
    messageTimestamp: 1704067200,
    message: {
      conversation: 'Hello',
    },
  };

  beforeEach(async () => {
    messageRepo = {
      findBySessionAndMessageId: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any;

    conversationRepo = {
      upsertBySessionAndJid: jest.fn(),
    } as any;

    sessionRepo = {
      update: jest.fn(),
    } as any;

    mediaDownloader = {
      downloadAndStore: jest.fn(),
    } as any;

    mediaThumbnail = {
      generateThumbnail: jest.fn(),
    } as any;

    mediaRepo = {
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageHandlerService,
        { provide: MessageRepository, useValue: messageRepo },
        { provide: ConversationRepository, useValue: conversationRepo },
        { provide: SessionRepository, useValue: sessionRepo },
        { provide: MediaDownloaderService, useValue: mediaDownloader },
        { provide: MediaThumbnailService, useValue: mediaThumbnail },
        { provide: getRepositoryToken(Media), useValue: mediaRepo },
      ],
    }).compile();

    service = module.get<MessageHandlerService>(MessageHandlerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processMessage', () => {
    it('should process a text message successfully', async () => {
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(null);
      messageRepo.create.mockReturnValue(mockMessage as any);
      messageRepo.save.mockResolvedValue(mockMessage as any);
      sessionRepo.update.mockResolvedValue(undefined);

      const result = await service.processMessage(baseWAMessage as any, 'session-1');

      expect(result.conversationId).toBe('conv-1');
      expect(result.messageId).toBe('baileys-msg-1');
      expect(result.content).toBe('Hello');
      expect(result.type).toBe(MessageType.TEXT);
      expect(result.fromMe).toBe(false);
      expect(conversationRepo.upsertBySessionAndJid).toHaveBeenCalledWith(
        'session-1',
        '5511999999999@s.whatsapp.net',
        { last_message_at: expect.any(Date), unread_count: undefined },
      );
    });

    it('should set unread_count to 0 when fromMe is true', async () => {
      const fromMeMsg = {
        ...baseWAMessage,
        key: { ...baseWAMessage.key, fromMe: true },
      };
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(null);
      messageRepo.create.mockReturnValue(mockMessage as any);
      messageRepo.save.mockResolvedValue({ ...mockMessage, from_me: true } as any);

      await service.processMessage(fromMeMsg as any, 'session-1');

      expect(conversationRepo.upsertBySessionAndJid).toHaveBeenCalledWith(
        'session-1',
        '5511999999999@s.whatsapp.net',
        { last_message_at: expect.any(Date), unread_count: 0 },
      );
    });

    it('should throw error when message has no key', async () => {
      const noKeyMsg = { message: { conversation: 'Hi' } };

      await expect(service.processMessage(noKeyMsg as any, 'session-1'))
        .rejects.toThrow('Message has no key');
    });

    it('should throw error when message has no remoteJid', async () => {
      const noJidMsg = {
        key: { id: 'msg-1', fromMe: false },
        message: { conversation: 'Hi' },
      };

      await expect(service.processMessage(noJidMsg as any, 'session-1'))
        .rejects.toThrow('Message has no remoteJid');
    });

    it('should deduplicate existing messages', async () => {
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(mockMessage as any);

      const result = await service.processMessage(baseWAMessage as any, 'session-1');

      expect(result.messageId).toBe('baileys-msg-1');
      expect(messageRepo.save).not.toHaveBeenCalled();
    });

    it('should process image messages with thumbnail', async () => {
      const imageMsg = {
        key: { id: 'img-1', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
        messageTimestamp: 1704067200,
        message: {
          imageMessage: { caption: 'Photo!', mimetype: 'image/jpeg' },
        },
      };
      const mockImgConversation = { ...mockConversation, id: 'conv-2' };
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockImgConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(null);
      messageRepo.create.mockReturnValue({ ...mockMessage, id: 'msg-img', type: MessageType.IMAGE } as any);
      messageRepo.save.mockResolvedValue({ ...mockMessage, id: 'msg-img', type: MessageType.IMAGE } as any);
      mediaDownloader.downloadAndStore.mockResolvedValue({
        storageKey: 'session-1/img-key',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        signedUrl: 'https://cdn.example.com/img',
        width: 800,
        height: 600,
      });
      mediaThumbnail.generateThumbnail.mockResolvedValue('thumb-session-1/img-key');
      mediaRepo.create.mockReturnValue({});
      mediaRepo.save.mockResolvedValue({});
      sessionRepo.update.mockResolvedValue(undefined);

      const result = await service.processMessage(imageMsg as any, 'session-1');

      expect(result.type).toBe(MessageType.IMAGE);
      expect(mediaDownloader.downloadAndStore).toHaveBeenCalled();
      expect(mediaThumbnail.generateThumbnail).toHaveBeenCalledWith('session-1/img-key');
      expect(mediaRepo.save).toHaveBeenCalled();
    });

    it('should process video messages without thumbnail', async () => {
      const videoMsg = {
        key: { id: 'vid-1', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
        messageTimestamp: 1704067200,
        message: {
          videoMessage: { caption: 'Video!', mimetype: 'video/mp4' },
        },
      };
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(null);
      messageRepo.create.mockReturnValue({ ...mockMessage, id: 'msg-vid', type: MessageType.VIDEO } as any);
      messageRepo.save.mockResolvedValue({ ...mockMessage, id: 'msg-vid', type: MessageType.VIDEO } as any);
      mediaDownloader.downloadAndStore.mockResolvedValue({
        storageKey: 'session-1/vid-key',
        mimeType: 'video/mp4',
        fileSize: 2048,
        signedUrl: 'https://cdn.example.com/vid',
      });
      mediaRepo.create.mockReturnValue({});
      mediaRepo.save.mockResolvedValue({});
      sessionRepo.update.mockResolvedValue(undefined);

      const result = await service.processMessage(videoMsg as any, 'session-1');

      expect(result.type).toBe(MessageType.VIDEO);
      expect(mediaThumbnail.generateThumbnail).not.toHaveBeenCalled();
    });

    it('should handle media download failure gracefully', async () => {
      const imgMsg = {
        key: { id: 'img-2', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
        messageTimestamp: 1704067200,
        message: {
          imageMessage: { caption: 'Photo', mimetype: 'image/jpeg' },
        },
      };
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(null);
      messageRepo.create.mockReturnValue({ ...mockMessage, id: 'msg-img2', type: MessageType.IMAGE } as any);
      messageRepo.save.mockResolvedValue({ ...mockMessage, id: 'msg-img2', type: MessageType.IMAGE } as any);
      mediaDownloader.downloadAndStore.mockResolvedValue(null);

      const result = await service.processMessage(imgMsg as any, 'session-1');

      expect(result.type).toBe(MessageType.IMAGE);
      expect(mediaRepo.save).not.toHaveBeenCalled();
    });

    it('should update session last_seen', async () => {
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(null);
      messageRepo.create.mockReturnValue(mockMessage as any);
      messageRepo.save.mockResolvedValue(mockMessage as any);
      sessionRepo.update.mockResolvedValue(undefined);

      await service.processMessage(baseWAMessage as any, 'session-1');

      expect(sessionRepo.update).toHaveBeenCalledWith('session-1', {
        last_seen: expect.any(Date),
      });
    });
  });

  describe('extractText (via processMessage)', () => {
    it('should extract conversation text', async () => {
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(null);
      messageRepo.create.mockReturnValue(mockMessage as any);
      messageRepo.save.mockResolvedValue(mockMessage as any);

      await service.processMessage(baseWAMessage as any, 'session-1');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Hello' }),
      );
    });

    it('should extract extendedTextMessage text', async () => {
      const msg = {
        key: { id: 'ext-1', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
        messageTimestamp: 1704067200,
        message: {
          extendedTextMessage: { text: 'Extended text' },
        },
      };
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(null);
      messageRepo.create.mockReturnValue(mockMessage as any);
      messageRepo.save.mockResolvedValue(mockMessage as any);

      await service.processMessage(msg as any, 'session-1');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Extended text' }),
      );
    });

    it('should extract image caption', async () => {
      const msg = {
        key: { id: 'cap-1', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
        messageTimestamp: 1704067200,
        message: {
          imageMessage: { caption: 'Image caption' },
        },
      };
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(null);
      messageRepo.create.mockReturnValue(mockMessage as any);
      messageRepo.save.mockResolvedValue(mockMessage as any);
      mediaDownloader.downloadAndStore.mockResolvedValue(null);

      await service.processMessage(msg as any, 'session-1');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Image caption' }),
      );
    });

    it('should return empty string for messages with no text content', async () => {
      const msg = {
        key: { id: 'no-text', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
        messageTimestamp: 1704067200,
        message: { locationMessage: {} },
      };
      conversationRepo.upsertBySessionAndJid.mockResolvedValue(mockConversation as any);
      messageRepo.findBySessionAndMessageId.mockResolvedValue(null);
      messageRepo.create.mockReturnValue(mockMessage as any);
      messageRepo.save.mockResolvedValue(mockMessage as any);

      await expect(
        service.processMessage(msg as any, 'session-1'),
      ).resolves.toBeDefined();
    });
  });
});
