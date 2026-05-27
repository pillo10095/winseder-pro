import { Injectable, Logger } from '@nestjs/common';
import { downloadContentFromMessage, proto } from '@whiskeysockets/baileys';
import { v4 as uuidv4 } from 'uuid';
import { Writable } from 'stream';

import { MediaStorageService } from './media-storage.service';

type WAImageMessage = proto.Message.IImageMessage;
type WAVideoMessage = proto.Message.IVideoMessage;
type WAAudioMessage = proto.Message.IAudioMessage;
type WADocumentMessage = proto.Message.IDocumentMessage;
type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface DownloadedMedia {
  storageKey: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  signedUrl?: string;
}

@Injectable()
export class MediaDownloaderService {
  private readonly logger = new Logger(MediaDownloaderService.name);

  constructor(private readonly storage: MediaStorageService) {}

  async downloadAndStore(
    message: proto.IWebMessageInfo,
    sessionId: string,
    messageId: string,
  ): Promise<DownloadedMedia | null> {
    try {
      const mediaKey = this.getMediaKey(message);
      if (!mediaKey) return null;

      const type = this.getMediaType(mediaKey);
      const mimeType = this.getMimeType(mediaKey, type);
      const ext = this.getExtension(mimeType);
      const storageKey = `${sessionId}/${messageId}-${uuidv4().slice(0, 8)}.${ext}`;

      // Download from WhatsApp
      const stream = await downloadContentFromMessage(
        { mediaKey: mediaKey.mediaKey!, directPath: mediaKey.directPath!, url: mediaKey.url! },
        type,
      );

      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        const writable = new Writable({
          write(chunk: Buffer, _encoding, callback) {
            chunks.push(chunk);
            callback();
          },
        });
        stream.pipe(writable);
        writable.on('finish', resolve);
        writable.on('error', reject);
      });

      const buffer = Buffer.concat(chunks);

      // Upload to permanent storage
      await this.storage.upload(storageKey, buffer, mimeType);
      const signedUrl = await this.storage.getSignedUrl(storageKey);

      const result: DownloadedMedia = {
        storageKey,
        mimeType,
        fileSize: buffer.length,
        signedUrl,
      };

      // Dimensions
      if ('width' in mediaKey && typeof mediaKey.width === 'number') {
        result.width = mediaKey.width;
      }
      if ('height' in mediaKey && typeof mediaKey.height === 'number') {
        result.height = mediaKey.height;
      }

      this.logger.log(`Media stored: ${storageKey} (${(buffer.length / 1024).toFixed(1)} KB)`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to download media for message ${messageId}: ${(error as Error).message}`);
      return null;
    }
  }

  private getMediaKey(msg: proto.IWebMessageInfo): WAImageMessage | WAVideoMessage | WAAudioMessage | WADocumentMessage | null {
    const m = msg.message;
    if (!m) return null;

    if (m.imageMessage) return m.imageMessage;
    if (m.videoMessage) return m.videoMessage;
    if (m.audioMessage) return m.audioMessage;
    if (m.documentMessage) return m.documentMessage;

    return null;
  }

  private getMediaType(
    media: WAImageMessage | WAVideoMessage | WAAudioMessage | WADocumentMessage,
  ): MediaType {
    if ('mimetype' in media && typeof media.mimetype === 'string') {
      if (media.mimetype.startsWith('image/')) return 'image';
      if (media.mimetype.startsWith('video/')) return 'video';
      if (media.mimetype.startsWith('audio/')) return 'audio';
    }
    if ('seconds' in media) {
      if ((media as WAVideoMessage).seconds !== undefined) return 'video';
      if ((media as WAAudioMessage).seconds !== undefined) return 'audio';
    }
    return 'document';
  }

  private getMimeType(
    media: WAImageMessage | WAVideoMessage | WAAudioMessage | WADocumentMessage,
    type: MediaType,
  ): string {
    if ('mimetype' in media && typeof media.mimetype === 'string') {
      return media.mimetype;
    }
    const defaults: Record<MediaType, string> = {
      image: 'image/jpeg',
      video: 'video/mp4',
      audio: 'audio/mp4',
      document: 'application/octet-stream',
    };
    return defaults[type];
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/3gpp': '3gp',
      'audio/mp4': 'm4a',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
    };
    return map[mimeType] || 'bin';
  }
}
