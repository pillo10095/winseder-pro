import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MessageRelayService,
  MESSAGE_EVENTS,
} from '@/modules/whatsapp/services/message-relay.service';
import { ParsedMessage } from '@/modules/whatsapp/services/message-handler.service';

describe('MessageRelayService', () => {
  let service: MessageRelayService;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockParsed: ParsedMessage = {
    messageId: 'msg-1',
    conversationId: 'conv-1',
    sessionId: 'session-1',
    type: 'text',
    content: 'Hello world',
    fromMe: false,
    timestamp: new Date('2025-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    eventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageRelayService,
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<MessageRelayService>(MessageRelayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('relayInbound', () => {
    it('should emit whatsapp.message.inbound with correct payload', () => {
      service.relayInbound(mockParsed);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        MESSAGE_EVENTS.INBOUND,
        {
          sessionId: 'session-1',
          conversationId: 'conv-1',
          messageId: 'msg-1',
          content: 'Hello world',
          type: 'text',
          fromMe: false,
          timestamp: mockParsed.timestamp,
        },
      );
    });

    it('should handle message with mediaUrl', () => {
      const withMedia = { ...mockParsed, mediaUrl: 'https://cdn.example.com/img.jpg' };

      service.relayInbound(withMedia);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        MESSAGE_EVENTS.INBOUND,
        expect.objectContaining({
          content: 'Hello world',
          type: 'text',
        }),
      );
    });

    it('should handle empty content', () => {
      const emptyContent = { ...mockParsed, content: '' };

      service.relayInbound(emptyContent);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        MESSAGE_EVENTS.INBOUND,
        expect.objectContaining({ content: '' }),
      );
    });
  });

  describe('relayOutbound', () => {
    it('should emit whatsapp.message.outbound with fromMe true', () => {
      const outbound = { ...mockParsed, fromMe: true };

      service.relayOutbound(outbound);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        MESSAGE_EVENTS.OUTBOUND,
        expect.objectContaining({ fromMe: true }),
      );
    });
  });

  describe('relayStatusUpdate', () => {
    it('should emit whatsapp.message.status with status info', () => {
      const now = Date.now();
      jest.useFakeTimers();
      jest.setSystemTime(now);

      service.relayStatusUpdate('session-1', 'msg-1', 'DELIVERED');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        MESSAGE_EVENTS.STATUS_UPDATE,
        {
          sessionId: 'session-1',
          messageId: 'msg-1',
          status: 'DELIVERED',
          timestamp: new Date(now),
        },
      );

      jest.useRealTimers();
    });

    it('should handle failed status', () => {
      service.relayStatusUpdate('session-1', 'msg-2', 'FAILED');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        MESSAGE_EVENTS.STATUS_UPDATE,
        expect.objectContaining({ status: 'FAILED' }),
      );
    });
  });
});
