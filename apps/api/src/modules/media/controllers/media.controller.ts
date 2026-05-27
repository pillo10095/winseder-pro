import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Media } from '../entities/media.entity';
import { MediaStorageService } from '../services/media-storage.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    private readonly storage: MediaStorageService,
  ) {}

  @Get(':id')
  async getMediaUrl(@Param('id') id: string) {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    const url = await this.storage.getSignedUrl(media.storage_key);
    return { url, mimeType: media.mime_type, fileSize: media.file_size };
  }

  @Get(':id/thumbnail')
  async getThumbnailUrl(@Param('id') id: string) {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    if (!media.thumbnail_key) throw new NotFoundException('No thumbnail available');

    const url = await this.storage.getSignedUrl(media.thumbnail_key);
    return { url };
  }
}
