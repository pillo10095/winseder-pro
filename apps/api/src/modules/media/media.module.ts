import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Media } from './entities/media.entity';
import { MediaController } from './controllers/media.controller';
import { MediaStorageService } from './services/media-storage.service';
import { MediaDownloaderService } from './services/media-downloader.service';
import { MediaThumbnailService } from './services/media-thumbnail.service';

@Module({
  imports: [TypeOrmModule.forFeature([Media]), AuthModule],
  controllers: [MediaController],
  providers: [MediaStorageService, MediaDownloaderService, MediaThumbnailService],
  exports: [MediaDownloaderService, MediaThumbnailService, TypeOrmModule.forFeature([Media])],
})
export class MediaModule {}
