import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import sharp from 'sharp';

import { MediaThumbnailService } from '@/modules/media/services/media-thumbnail.service';
import { MediaStorageService } from '@/modules/media/services/media-storage.service';

var mockToBuffer: jest.Mock;

jest.mock('sharp', () => {
  mockToBuffer = jest.fn().mockResolvedValue(Buffer.from('thumbnail-data'));
  const mockSharp = jest.fn().mockReturnValue({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: mockToBuffer,
  });
  return mockSharp;
});

function createReadableStream(data: Buffer): Readable {
  return new Readable({
    read() {
      this.push(data);
      this.push(null);
    },
  });
}

describe('MediaThumbnailService', () => {
  let service: MediaThumbnailService;
  let mockStorage: jest.Mocked<MediaStorageService>;

  beforeEach(async () => {
    mockStorage = {
      download: jest.fn(),
      upload: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MediaStorageService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaThumbnailService,
        { provide: MediaStorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<MediaThumbnailService>(MediaThumbnailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateThumbnail', () => {
    const storageKey = 'images/photo.jpg';
    const imageData = Buffer.from('full-image-data');

    it('should download, resize, upload and return thumb key on success', async () => {
      mockStorage.download.mockResolvedValue(createReadableStream(imageData));

      const result = await service.generateThumbnail(storageKey);

      expect(result).toBe(`thumb-${storageKey}`);
      expect(mockStorage.download).toHaveBeenCalledWith(storageKey);
      expect(sharp).toHaveBeenCalledWith(imageData);
      const sharpInstance = (sharp as unknown as jest.Mock).mock.results[0]?.value;
      expect(sharpInstance.resize).toHaveBeenCalledWith(320, 320, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(sharpInstance.jpeg).toHaveBeenCalledWith({ quality: 70 });
      expect(sharpInstance.toBuffer).toHaveBeenCalled();
      expect(mockStorage.upload).toHaveBeenCalledWith(
        `thumb-${storageKey}`,
        Buffer.from('thumbnail-data'),
        'image/jpeg',
      );
    });

    it('should return null when download fails', async () => {
      mockStorage.download.mockRejectedValue(new Error('Object not found'));

      const result = await service.generateThumbnail(storageKey);

      expect(result).toBeNull();
      expect(mockStorage.upload).not.toHaveBeenCalled();
    });

    it('should return null when sharp processing fails', async () => {
      mockStorage.download.mockResolvedValue(createReadableStream(imageData));
      mockToBuffer.mockRejectedValueOnce(new Error('Processing error'));

      const result = await service.generateThumbnail(storageKey);

      expect(result).toBeNull();
      expect(mockStorage.upload).not.toHaveBeenCalled();
    });
  });
});
