import { Injectable, Logger } from '@nestjs/common';
import { proto } from '@whiskeysockets/baileys';

import { MessageStatus, MessageType } from '../entities/message.entity';
import { MessageRepository } from '../repositories/message.repository';
import { ConversationRepository } from '../repositories/conversation.repository';
import { SessionRepository } from '../repositories/session.repository';
import { MediaDownloaderService } from '../../media/services/media-downloader.service';
import { MediaThumbnailService } from '../../media/services/media-thumbnail.service';
import { Media } from '../../media/entities/media.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface ParsedMessage {
  messageId: string;
  conversationId: string;
  sessionId: string;
  type: MessageType;
  content: string;
  fromMe: boolean;
  timestamp: Date;
  mediaUrl?: string;
}

@Injectable()
export class MessageHandlerService {
  private readonly logger = new Logger(MessageHandlerService.name);

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly mediaDownloader: MediaDownloaderService,
    private readonly mediaThumbnail: MediaThumbnailService,
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
  ) {}

  /**
   * Extract text content from a WAMessage.
   */
  private extractText(msg: proto.IWebMessageInfo): string {
    const message = msg.message;
    if (!message) return '';

    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.documentMessage?.caption) return message.documentMessage.caption;

    return '';
  }

  /**
   * Determine the message type from WAMessage.
   */
  private detectType(msg: proto.IWebMessageInfo): MessageType {
    const message = msg.message;
    if (!message) return MessageType.TEXT;

    if (message.imageMessage) return MessageType.IMAGE;
    if (message.videoMessage) return MessageType.VIDEO;
    if (message.documentMessage) return MessageType.DOCUMENT;
    if (message.audioMessage) return MessageType.AUDIO;
    if (message.locationMessage) return MessageType.LOCATION;
    if (message.contactMessage) return MessageType.CONTACT;
    if (message.stickerMessage) return MessageType.STICKER;

    return MessageType.TEXT;
  }

  /**
   * Process an incoming/outgoing WAMessage.
   * Upserts the conversation and saves the message to DB.
   */
  async processMessage(
    msg: proto.IWebMessageInfo,
    sessionId: string,
  ): Promise<ParsedMessage> {
    const key = msg.key;
    if (!key) {
      throw new Error('Message has no key');
    }

    const remoteJid = key.remoteJid;
    if (!remoteJid) {
      throw new Error('Message has no remoteJid');
    }

    const messageId = key.id!;
    const fromMe = !!key.fromMe;
    const content = this.extractText(msg);
    const type = this.detectType(msg);
    const timestamp = msg.messageTimestamp
      ? new Date(Number(msg.messageTimestamp) * 1000)
      : new Date();

    // Upsert conversation
    const conversation = await this.conversationRepository.upsertBySessionAndJid(
      sessionId,
      remoteJid,
      {
        last_message_at: timestamp,
        unread_count: fromMe ? 0 : undefined,
      },
    );

    // Check for duplicate (Baileys can fire duplicate events)
    const existing = await this.messageRepository.findBySessionAndMessageId(
      sessionId,
      messageId,
    );
    if (existing) {
      return this.toParsedMessage(existing);
    }

    // Save message
    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversation_id: conversation.id,
        session_id: sessionId,
        message_id: messageId,
        type,
        content,
        from_me: fromMe,
        timestamp,
        media_url: null,
        status: fromMe ? MessageStatus.SENT : MessageStatus.DELIVERED,
      }),
    );

    // Download media if present
    if (type !== MessageType.TEXT) {
      const downloaded = await this.mediaDownloader.downloadAndStore(msg, sessionId, message.id);
      if (downloaded) {
        let thumbnailKey: string | null = null;

        // Generate thumbnail for images
        if (type === MessageType.IMAGE) {
          thumbnailKey = await this.mediaThumbnail.generateThumbnail(downloaded.storageKey);
        }

        // Save media record
        await this.mediaRepo.save(
          this.mediaRepo.create({
            id: message.id,
            message_id: message.id,
            session_id: sessionId,
            original_url: null,
            storage_key: downloaded.storageKey,
            mime_type: downloaded.mimeType,
            file_size: downloaded.fileSize,
            thumbnail_key: thumbnailKey,
            width: downloaded.width ?? null,
            height: downloaded.height ?? null,
          }),
        );

        // Update message with permanent media URL
        if (downloaded.signedUrl) {
          await this.messageRepository.update(message.id, {
            media_url: downloaded.signedUrl,
          });
          message.media_url = downloaded.signedUrl;
        }
      }
    }

    // Update session last_seen
    await this.sessionRepository.update(sessionId, { last_seen: new Date() });

    return this.toParsedMessage(message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toParsedMessage(msg: any): ParsedMessage {
    return {
      messageId: msg.message_id,
      conversationId: msg.conversation_id,
      sessionId: msg.session_id,
      type: msg.type,
      content: msg.content || '',
      fromMe: msg.from_me,
      timestamp: msg.timestamp,
      mediaUrl: msg.media_url || undefined,
    };
  }
}
