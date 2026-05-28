import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { MediaStorageService } from '@/modules/media/services/media-storage.service';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('MediaStorageService', () => {
  let service: MediaStorageService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        STORAGE_PROVIDER: 'minio',
        STORAGE_ENDPOINT: 'http://localhost:9000',
        STORAGE_REGION: 'us-east-1',
        STORAGE_BUCKET: 'test-bucket',
        STORAGE_ACCESS_KEY: 'test-key',
        STORAGE_SECRET_KEY: 'test-secret',
      };
      return config[key] ?? null;
    }),
  };

  function getS3SendMock(): jest.Mock {
    const instance = (S3Client as jest.Mock).mock.results[0]?.value;
    return instance?.send ?? jest.fn();
  }

  beforeEach(async () => {
    (S3Client as jest.Mock).mockClear();
    (PutObjectCommand as jest.Mock).mockClear();
    (GetObjectCommand as jest.Mock).mockClear();
    (DeleteObjectCommand as jest.Mock).mockClear();
    (getSignedUrl as jest.Mock).mockClear();

    (S3Client as jest.Mock).mockImplementation(() => {
      const send = jest.fn().mockResolvedValue(undefined);
      return { send };
    });

    (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.com/test');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaStorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MediaStorageService>(MediaStorageService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload a buffer', async () => {
      const buffer = Buffer.from('test-content');
      await service.upload('images/photo.jpg', buffer, 'image/jpeg');

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'images/photo.jpg',
        Body: buffer,
        ContentType: 'image/jpeg',
      });
      expect(getS3SendMock()).toHaveBeenCalled();
    });

    it('should upload a readable stream', async () => {
      const stream = Readable.from(['stream-data']);
      await service.upload('docs/file.pdf', stream, 'application/pdf');

      expect(getS3SendMock()).toHaveBeenCalled();
    });
  });

  describe('download', () => {
    it('should download a file and return a readable stream', async () => {
      const mockStream = Readable.from(['file-content']);
      getS3SendMock().mockResolvedValueOnce({ Body: mockStream });

      const result = await service.download('images/photo.jpg');

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'images/photo.jpg',
      });
      expect(result).toBe(mockStream);
    });
  });

  describe('getSignedUrl', () => {
    it('should generate a signed URL with default expiry', async () => {
      const url = await service.getSignedUrl('images/photo.jpg');

      expect(url).toBe('https://signed-url.com/test');
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'images/photo.jpg',
      });
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 3600 },
      );
    });

    it('should generate a signed URL with custom expiry', async () => {
      await service.getSignedUrl('images/photo.jpg', 7200);

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 7200 },
      );
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      await service.delete('images/old-photo.jpg');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'images/old-photo.jpg',
      });
      expect(getS3SendMock()).toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      getS3SendMock().mockRejectedValueOnce(new Error('Network error'));

      await expect(service.delete('images/photo.jpg')).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('getBucket', () => {
    it('should return the configured bucket name', () => {
      expect(service.getBucket()).toBe('test-bucket');
    });
  });

  describe('config fallbacks', () => {
    it('should use defaults when config values are missing', async () => {
      mockConfigService.get.mockImplementation(() => null);

      (S3Client as jest.Mock).mockClear();
      (S3Client as jest.Mock).mockImplementation(() => {
        const send = jest.fn().mockResolvedValue(undefined);
        return { send };
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaStorageService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const svc = module.get<MediaStorageService>(MediaStorageService);

      expect(svc.getBucket()).toBe('wisender-media');
    });
  });
});
