import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

import { MediaStorageService } from './media-storage.service';

@Injectable()
export class MediaThumbnailService {
  private readonly logger = new Logger(MediaThumbnailService.name);

  constructor(private readonly storage: MediaStorageService) {}

  /**
   * Generate a thumbnail for an image and store it.
   * Returns the thumbnail storage key, or null if generation fails.
   */
  async generateThumbnail(storageKey: string): Promise<string | null> {
    try {
      const stream = await this.storage.download(storageKey);
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);
      const thumbnail = await sharp(buffer)
        .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

      const thumbKey = `thumb-${storageKey}`;
      await this.storage.upload(thumbKey, thumbnail, 'image/jpeg');

      this.logger.debug(`Thumbnail generated: ${thumbKey}`);
      return thumbKey;
    } catch (error) {
      this.logger.warn(`Failed to generate thumbnail for ${storageKey}: ${(error as Error).message}`);
      return null;
    }
  }
}
