import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export const QR_EVENTS = {
  CODE_GENERATED: 'whatsapp.qr.generated',
  CODE_EXPIRED: 'whatsapp.qr.expired',
  SCANNED: 'whatsapp.qr.scanned',
} as const;

export interface QrGeneratedEvent {
  sessionId: string;
  companyId: string;
  qrDataUrl: string;
  expiresAt: Date;
}

export interface QrScannedEvent {
  sessionId: string;
}

@Injectable()
export class QrEventsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitQrGenerated(sessionId: string, companyId: string, qrDataUrl: string): void {
    this.eventEmitter.emit(QR_EVENTS.CODE_GENERATED, {
      sessionId,
      companyId,
      qrDataUrl,
      expiresAt: new Date(Date.now() + 60_000), // QR valid for 60s
    } satisfies QrGeneratedEvent);
  }

  emitQrExpired(sessionId: string): void {
    this.eventEmitter.emit(QR_EVENTS.CODE_EXPIRED, { sessionId });
  }

  emitQrScanned(sessionId: string): void {
    this.eventEmitter.emit(QR_EVENTS.SCANNED, { sessionId } satisfies QrScannedEvent);
  }
}
