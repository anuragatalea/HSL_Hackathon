import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: [${socket.id}]`);

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: [${socket.id}]`);
    });

    socket.on('rover:ping', (data) => {
      socket.emit('rover:pong', { serverTime: new Date().toISOString(), ...data });
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket first.');
  }
  return io;
}

/**
 * Broadcast an event to all connected web clients and rovers.
 */
export function broadcast(event: string, payload: any) {
  if (io) {
    io.emit(event, payload);
  }
}
