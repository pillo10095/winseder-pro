import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import {
  WsMessageNewPayload,
  WsMessageStatusPayload,
  WsQrGeneratedPayload,
  WsSessionStatusPayload,
  WS_CLIENT_EVENTS,
  WS_EVENTS,
} from './events';

@WebSocketGateway({
  namespace: '/whatsapp',
  cors: { origin: '*', credentials: true },
})
export class WhatsAppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WhatsAppGateway.name);

  @WebSocketServer()
  server!: Server;

  /**
   * Map: companyId → Set<socketId>
   */
  private companyRooms = new Map<string, Set<string>>();

  handleConnection(client: Socket): void {
    const companyId = client.handshake.query.companyId as string;
    if (!companyId) {
      client.disconnect();
      return;
    }

    client.join(`company:${companyId}`);
    if (!this.companyRooms.has(companyId)) {
      this.companyRooms.set(companyId, new Set());
    }
    this.companyRooms.get(companyId)!.add(client.id);

    this.logger.debug(`WS client connected: ${client.id} (company: ${companyId})`);
  }

  handleDisconnect(client: Socket): void {
    const companyId = client.handshake.query.companyId as string;
    if (companyId) {
      this.companyRooms.get(companyId)?.delete(client.id);
      if (this.companyRooms.get(companyId)?.size === 0) {
        this.companyRooms.delete(companyId);
      }
    }
    this.logger.debug(`WS client disconnected: ${client.id}`);
  }

  // --- Server-side emitters (called by services) ---

  emitQrGenerated(companyId: string, payload: WsQrGeneratedPayload): void {
    this.server.to(`company:${companyId}`).emit(WS_EVENTS.QR_GENERATED, payload);
  }

  emitSessionStatus(companyId: string, payload: WsSessionStatusPayload): void {
    this.server.to(`company:${companyId}`).emit(WS_EVENTS.SESSION_STATUS, payload);
  }

  emitMessageNew(companyId: string, payload: WsMessageNewPayload): void {
    this.server.to(`company:${companyId}`).emit(WS_EVENTS.MESSAGE_NEW, payload);
  }

  emitMessageStatus(companyId: string, payload: WsMessageStatusPayload): void {
    this.server.to(`company:${companyId}`).emit(WS_EVENTS.MESSAGE_STATUS, payload);
  }

  // --- Client-side event handlers ---

  @SubscribeMessage(WS_CLIENT_EVENTS.REQUEST_QR)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequestQr(client: Socket, _payload: { sessionId: string }): void {
    const companyId = client.handshake.query.companyId as string;
    this.logger.debug(`QR requested by company ${companyId}`);
    // The service will regenerate QR; for now acknowledge
    client.emit(WS_EVENTS.QR_GENERATED, { message: 'QR request received' });
  }

  @SubscribeMessage(WS_CLIENT_EVENTS.REQUEST_STATUS)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequestStatus(client: Socket, _payload: { sessionId: string }): void {
    const companyId = client.handshake.query.companyId as string;
    this.logger.debug(`Status requested by company ${companyId}`);
    client.emit(WS_EVENTS.SESSION_STATUS, { message: 'Status request received' });
  }
}
