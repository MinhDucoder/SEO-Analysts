import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

interface AuthSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
})
export class AuditGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AuditGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('Audit WebSocket gateway initialized at /ws');
  }

  handleConnection(client: AuthSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.replace(/^Bearer /, '') as string | undefined);
      if (!token) throw new UnauthorizedException('Missing token');
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      client.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.log(`Socket ${client.id} connected (user ${payload.sub})`);
    } catch (e) {
      this.logger.warn(`Rejecting socket ${client.id}: ${(e as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`Socket ${client.id} disconnected`);
  }

  @SubscribeMessage('audit:subscribe')
  subscribeToAudit(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { auditId: string },
  ) {
    if (!client.userId) return { error: 'Unauthorized' };
    const room = `audit:${payload.auditId}`;
    client.join(room);
    return { joined: room };
  }

  @SubscribeMessage('audit:unsubscribe')
  unsubscribe(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { auditId: string },
  ) {
    const room = `audit:${payload.auditId}`;
    client.leave(room);
    return { left: room };
  }

  emitProgress(auditId: string, data: unknown) {
    this.server.to(`audit:${auditId}`).emit('audit:progress', data);
  }

  emitCompleted(auditId: string, data: unknown) {
    this.server.to(`audit:${auditId}`).emit('audit:completed', data);
  }

  emitFailed(auditId: string, data: unknown) {
    this.server.to(`audit:${auditId}`).emit('audit:failed', data);
  }

  emitBillingConfirmed(evt: { userId: string; intentId: string; planCode: string }): void {
    this.server.to(`user:${evt.userId}`).emit('billing:confirmed', evt);
    this.server.to(`billing:${evt.intentId}`).emit('billing:confirmed', evt);
  }

  @SubscribeMessage('billing:subscribe')
  handleBillingSubscribe(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { intentId: string },
  ) {
    if (!client.userId) return { error: 'Unauthorized' };
    if (data?.intentId) client.join(`billing:${data.intentId}`);
    return { joined: `billing:${data.intentId}` };
  }
}
