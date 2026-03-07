import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({ cors: true })
export class AuditGateway {
  @WebSocketServer()
  server: Server;

  private jobProgress: Map<string, { status: string; progress: number }> =
    new Map();

  @SubscribeMessage('join-audit')
  handleJoinAudit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    void client.join(`audit:${data.jobId}`);
    // Send current progress on reconnection
    const current = this.jobProgress.get(data.jobId);
    if (current) {
      client.emit('audit-progress', { jobId: data.jobId, ...current });
    }
  }

  emitProgress(
    jobId: string,
    status: string,
    progress: number,
    message?: string,
  ) {
    this.jobProgress.set(jobId, { status, progress });
    this.server.to(`audit:${jobId}`).emit('audit-progress', {
      jobId,
      status,
      progress,
      message,
    });
  }

  clearProgress(jobId: string) {
    this.jobProgress.delete(jobId);
  }
}
