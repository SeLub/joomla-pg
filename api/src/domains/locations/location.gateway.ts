import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { LocationService } from './location.service';
import { NearestQuery } from './location.types';

@WebSocketGateway({ cors: true, namespace: 'locations' })
export class LocationGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly service: LocationService) {}

  @SubscribeMessage('nearest')
  async handleNearest(@MessageBody() query: NearestQuery) {
    return this.service.findNearest(query);
  }

  // called by service when location data changes — broadcasts to all clients
  broadcastUpdate(data: unknown) {
    this.server.emit('locations:updated', data);
  }
}
