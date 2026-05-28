import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QrEventsService, QR_EVENTS } from '@/modules/whatsapp/services/qr-events.service';

describe('QrEventsService', () => {
  let service: QrEventsService;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    eventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrEventsService,
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<QrEventsService>(QrEventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('emitQrGenerated', () => {
    it('should emit whatsapp.qr.generated event', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));

      service.emitQrGenerated('session-1', 'company-1', 'data:image/png;base64,qr');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        QR_EVENTS.CODE_GENERATED,
        {
          sessionId: 'session-1',
          companyId: 'company-1',
          qrDataUrl: 'data:image/png;base64,qr',
          expiresAt: new Date(Date.now() + 60_000),
        },
      );

      jest.useRealTimers();
    });

    it('should include 60s expiration from now', () => {
      const now = Date.now();
      jest.useFakeTimers();
      jest.setSystemTime(now);

      service.emitQrGenerated('session-1', 'company-1', 'qr-data');

      const callArg = (eventEmitter.emit as jest.Mock).mock.calls[0][1];
      expect(callArg.expiresAt.getTime()).toBe(now + 60_000);

      jest.useRealTimers();
    });
  });

  describe('emitQrExpired', () => {
    it('should emit whatsapp.qr.expired event', () => {
      service.emitQrExpired('session-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        QR_EVENTS.CODE_EXPIRED,
        { sessionId: 'session-1' },
      );
    });
  });

  describe('emitQrScanned', () => {
    it('should emit whatsapp.qr.scanned event', () => {
      service.emitQrScanned('session-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        QR_EVENTS.SCANNED,
        { sessionId: 'session-1' },
      );
    });
  });
});
