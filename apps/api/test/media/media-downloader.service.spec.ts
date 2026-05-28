import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

import { MediaDownloaderService } from '@/modules/media/services/media-downloader.service';
import { MediaStorageService } from '@/modules/media/services/media-storage.service';

jest.mock('@whiskeysockets/baileys', () => ({
  downloadContentFromMessage: jest.fn(),
  proto: {
    Message: {
      IImageMessage: {},
      IVideoMessage: {},
      IAudioMessage: {},
      IDocumentMessage: {},
    },
    IWebMessageInfo: {},
  },
}));

function createMockStream(data: Buffer): Readable {
  return new Readable({
    read() {
      this.push(data);
      this.push(null);
    },
  });
}

describe('MediaDownloaderService', () => {
  let service: MediaDownloaderService;
  let mockStorage: jest.Mocked<MediaStorageService>;

  const signedUrl = 'https://storage.test/media';

  beforeEach(async () => {
    mockStorage = {
      upload: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn().mockResolvedValue(signedUrl),
    } as unknown as jest.Mocked<MediaStorageService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaDownloaderService,
        { provide: MediaStorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<MediaDownloaderService>(MediaDownloaderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMediaKey', () => {
    it('should return imageMessage for an image message', () => {
      const msg = { message: { imageMessage: { mimetype: 'image/jpeg', mediaKey: Buffer.from('k'), directPath: '/p', url: 'u' } } };
      const result = service['getMediaKey'](msg as any);
      expect(result).toEqual(msg.message.imageMessage);
    });

    it('should return videoMessage for a video message', () => {
      const msg = { message: { videoMessage: { mimetype: 'video/mp4', mediaKey: Buffer.from('k'), directPath: '/p', url: 'u' } } };
      const result = service['getMediaKey'](msg as any);
      expect(result).toEqual(msg.message.videoMessage);
    });

    it('should return audioMessage for an audio message', () => {
      const msg = { message: { audioMessage: { mimetype: 'audio/mp4', mediaKey: Buffer.from('k'), directPath: '/p', url: 'u' } } };
      const result = service['getMediaKey'](msg as any);
      expect(result).toEqual(msg.message.audioMessage);
    });

    it('should return documentMessage for a document message', () => {
      const msg = { message: { documentMessage: { mimetype: 'application/pdf', mediaKey: Buffer.from('k'), directPath: '/p', url: 'u' } } };
      const result = service['getMediaKey'](msg as any);
      expect(result).toEqual(msg.message.documentMessage);
    });

    it('should return null when message has no media', () => {
      const msg = { message: { conversation: 'hello' } };
      const result = service['getMediaKey'](msg as any);
      expect(result).toBeNull();
    });

    it('should return null when message is empty', () => {
      const msg = { message: null };
      const result = service['getMediaKey'](msg as any);
      expect(result).toBeNull();
    });
  });

  describe('getMediaType', () => {
    it('should detect image by mimeType', () => {
      const result = service['getMediaType']({ mimetype: 'image/png' } as any);
      expect(result).toBe('image');
    });

    it('should detect video by mimeType', () => {
      const result = service['getMediaType']({ mimetype: 'video/mp4' } as any);
      expect(result).toBe('video');
    });

    it('should detect audio by mimeType', () => {
      const result = service['getMediaType']({ mimetype: 'audio/mpeg' } as any);
      expect(result).toBe('audio');
    });

    it('should detect video by seconds property when no mimetype', () => {
      const result = service['getMediaType']({ seconds: 30 } as any);
      expect(result).toBe('video');
    });

    it('should default to document for unknown mimeType', () => {
      const result = service['getMediaType']({ mimetype: 'application/octet-stream' } as any);
      expect(result).toBe('document');
    });

    it('should default to document when no mimeType or seconds', () => {
      const result = service['getMediaType']({} as any);
      expect(result).toBe('document');
    });
  });

  describe('getMimeType', () => {
    it('should return the mimeType from the media', () => {
      const result = service['getMimeType']({ mimetype: 'image/webp' } as any, 'image');
      expect(result).toBe('image/webp');
    });

    it('should return default mime for image when no mimetype', () => {
      const result = service['getMimeType']({} as any, 'image');
      expect(result).toBe('image/jpeg');
    });

    it('should return default mime for video when no mimetype', () => {
      const result = service['getMimeType']({} as any, 'video');
      expect(result).toBe('video/mp4');
    });

    it('should return default mime for audio when no mimetype', () => {
      const result = service['getMimeType']({} as any, 'audio');
      expect(result).toBe('audio/mp4');
    });

    it('should return default mime for document when no mimetype', () => {
      const result = service['getMimeType']({} as any, 'document');
      expect(result).toBe('application/octet-stream');
    });
  });

  describe('getExtension', () => {
    const known: Record<string, string> = {
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

    for (const [mime, ext] of Object.entries(known)) {
      it(`should return "${ext}" for "${mime}"`, () => {
        expect(service['getExtension'](mime)).toBe(ext);
      });
    }

    it('should return "bin" for unknown mime types', () => {
      expect(service['getExtension']('application/unknown')).toBe('bin');
    });
  });

  describe('downloadAndStore', () => {
    const sessionId = 'session-1';
    const messageId = 'msg-1';
    const imageData = Buffer.from('fake-image-data');

    const imageMessage = {
      message: {
        imageMessage: {
          mediaKey: Buffer.from('media-key'),
          directPath: '/direct/path',
          url: 'https://whatsapp.test/media',
          mimetype: 'image/jpeg',
          width: 800,
          height: 600,
        },
      },
    };

    it('should download, store, and return media metadata on success', async () => {
      (downloadContentFromMessage as jest.Mock).mockResolvedValue(createMockStream(imageData));

      const result = await service.downloadAndStore(imageMessage as any, sessionId, messageId);

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('image/jpeg');
      expect(result!.fileSize).toBe(imageData.length);
      expect(result!.width).toBe(800);
      expect(result!.height).toBe(600);
      expect(result!.signedUrl).toBe(signedUrl);
      expect(result!.storageKey).toMatch(/^session-1\/msg-1-/);
      expect(result!.storageKey).toMatch(/\.jpg$/);

      expect(downloadContentFromMessage).toHaveBeenCalledWith(
        { mediaKey: imageMessage.message.imageMessage.mediaKey, directPath: '/direct/path', url: 'https://whatsapp.test/media' },
        'image',
      );
      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^session-1\/msg-1-.+\.jpg$/),
        imageData,
        'image/jpeg',
      );
      expect(mockStorage.getSignedUrl).toHaveBeenCalledWith(result!.storageKey);
    });

    it('should return null when message has no media key', async () => {
      const textMessage = { message: { conversation: 'hi' } };
      const result = await service.downloadAndStore(textMessage as any, sessionId, messageId);
      expect(result).toBeNull();
    });

    it('should return null when downloadContentFromMessage throws', async () => {
      (downloadContentFromMessage as jest.Mock).mockRejectedValue(new Error('Download failed'));

      const result = await service.downloadAndStore(imageMessage as any, sessionId, messageId);
      expect(result).toBeNull();
    });

    it('should return null when storage upload fails', async () => {
      (downloadContentFromMessage as jest.Mock).mockResolvedValue(createMockStream(imageData));
      mockStorage.upload.mockRejectedValueOnce(new Error('Upload failed'));

      const result = await service.downloadAndStore(imageMessage as any, sessionId, messageId);
      expect(result).toBeNull();
    });

    it('should not include dimensions when media has no width/height', async () => {
      (downloadContentFromMessage as jest.Mock).mockResolvedValue(createMockStream(imageData));
      const msgNoDims = {
        message: {
          documentMessage: {
            mediaKey: Buffer.from('key'),
            directPath: '/p',
            url: 'u',
            mimetype: 'application/pdf',
          },
        },
      };

      const result = await service.downloadAndStore(msgNoDims as any, sessionId, messageId);
      expect(result).not.toBeNull();
      expect(result!.width).toBeUndefined();
      expect(result!.height).toBeUndefined();
    });
  });
});
