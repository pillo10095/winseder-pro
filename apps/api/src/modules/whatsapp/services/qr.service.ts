import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);

  /**
   * Generate a QR code as a base64 data URL for sending to frontend.
   */
  async generateQrDataUrl(qrString: string): Promise<string> {
    try {
      return await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch (err) {
      this.logger.error('Failed to generate QR data URL', err);
      throw err;
    }
  }
}
