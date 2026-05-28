import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { MediaController } from '@/modules/media/controllers/media.controller';
import { Media } from '@/modules/media/entities/media.entity';
import { MediaStorageService } from '@/modules/media/services/media-storage.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

describe('MediaController', () => {
  let controller: MediaController;
  let mediaRepo: any;
  let storage: MediaStorageService;

  const mockMediaRepo = {
    findOne: jest.fn(),
  };

  const mockStorage = {
    getSignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        { provide: getRepositoryToken(Media), useValue: mockMediaRepo },
        { provide: MediaStorageService, useValue: mockStorage },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<MediaController>(MediaController);
    mediaRepo = module.get(getRepositoryToken(Media));
    storage = module.get<MediaStorageService>(MediaStorageService);

    jest.clearAllMocks();
  });

  describe('GET :id', () => {
    it('should return media URL and metadata', async () => {
      const media = { id: 'media-1', storage_key: 'key-1', mime_type: 'image/png', file_size: 1024 };
      mockMediaRepo.findOne.mockResolvedValue(media);
      mockStorage.getSignedUrl.mockResolvedValue('https://signed.url');

      const result = await controller.getMediaUrl('media-1');

      expect(mediaRepo.findOne).toHaveBeenCalledWith({ where: { id: 'media-1' } });
      expect(storage.getSignedUrl).toHaveBeenCalledWith('key-1');
      expect(result).toEqual({ url: 'https://signed.url', mimeType: 'image/png', fileSize: 1024 });
    });

    it('should throw NotFoundException when media not found', async () => {
      mockMediaRepo.findOne.mockResolvedValue(null);

      await expect(controller.getMediaUrl('media-404')).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET :id/thumbnail', () => {
    it('should return thumbnail URL', async () => {
      const media = { id: 'media-1', storage_key: 'key-1', thumbnail_key: 'thumb-key-1', mime_type: 'image/png', file_size: 1024 };
      mockMediaRepo.findOne.mockResolvedValue(media);
      mockStorage.getSignedUrl.mockResolvedValue('https://signed.thumb.url');

      const result = await controller.getThumbnailUrl('media-1');

      expect(storage.getSignedUrl).toHaveBeenCalledWith('thumb-key-1');
      expect(result).toEqual({ url: 'https://signed.thumb.url' });
    });

    it('should throw NotFoundException when media not found', async () => {
      mockMediaRepo.findOne.mockResolvedValue(null);

      await expect(controller.getThumbnailUrl('media-404')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no thumbnail available', async () => {
      const media = { id: 'media-1', storage_key: 'key-1', thumbnail_key: null, mime_type: 'image/png', file_size: 1024 };
      mockMediaRepo.findOne.mockResolvedValue(media);

      await expect(controller.getThumbnailUrl('media-1')).rejects.toThrow(NotFoundException);
    });
  });
});
