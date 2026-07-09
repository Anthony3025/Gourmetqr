import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketIo.on('connect', () => {
      console.log('Conectado a Socket.io backend');
      setIsConnected(true);
    });

    socketIo.on('disconnect', () => {
      console.log('Desconectado de Socket.io backend');
      setIsConnected(false);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, []);

  return { socket, isConnected };
};
