import { io } from 'socket.io-client';

// Connect to backend port 4000
const SOCKET_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000' 
  : `http://${window.location.hostname}:4000`;

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000
});
