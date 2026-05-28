jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { QrService } from '@/modules/whatsapp/services/qr.service';
import * as QRCode from 'qrcode';

describe('QrService', () => {
  let service: QrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QrService],
    }).compile();

    service = module.get<QrService>(QrService);
  });

  describe('generateQrDataUrl', () => {
    it('should generate a QR data URL', async () => {
      const mockDataUrl = 'data:image/png;base64,fakeqrcode';
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockDataUrl);

      const result = await service.generateQrDataUrl('test-qr-string');

      expect(result).toBe(mockDataUrl);
      expect(QRCode.toDataURL).toHaveBeenCalledWith('test-qr-string', {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    });

    it('should throw when QR generation fails', async () => {
      const error = new Error('QR generation failed');
      (QRCode.toDataURL as jest.Mock).mockRejectedValue(error);

      await expect(service.generateQrDataUrl('bad-input')).rejects.toThrow('QR generation failed');
    });

    it('should handle empty string input', async () => {
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,empty');

      const result = await service.generateQrDataUrl('');

      expect(result).toBe('data:image/png;base64,empty');
    });
  });
});
