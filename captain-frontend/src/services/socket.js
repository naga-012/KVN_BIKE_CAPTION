import { io } from 'socket.io-client';

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = rawSocketUrl.replace(/\/api\/?$/, '');

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('[Socket] Connected to KVN Server with ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.warn('[Socket] Connection error:', error.message);
});

export default socket;
