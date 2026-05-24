import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function startServer() {
  const app = express();
  
  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Too restrictive for dev/WebRTC without careful tuning
  }));

  // Express Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  const httpServer = createServer(app);
  
  // Secure CORS handling
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : (process.env.NODE_ENV === 'production' ? false : '*');

  const io = new Server(httpServer, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: { 
      origin: allowedOrigins,
      methods: ["GET", "POST"]
    }
  });
  
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  const rooms = new Map<string, { hostId: string, peers: Map<string, string>, hostDeviceName?: string, createdAt: number }>();
  const socketToRoom = new Map<string, string>();
  
  // Connection rate limiting
  const connectionLimits = new Map<string, number[]>();

  // Cleanup stale rooms every hour
  setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of rooms.entries()) {
      // Clean up rooms older than 24 hours
      if (now - room.createdAt > 24 * 60 * 60 * 1000) {
         rooms.delete(roomCode);
         // Emit to all sockets in that room
         io.to(roomCode).emit('room_error', { message: 'Room has expired.' });
         io.in(roomCode).socketsLeave(roomCode);
      }
    }
  }, 60 * 60 * 1000);
  
  const generateRoomCode = () => {
    let code;
    let attempts = 0;
    do {
      // 6-character strong alphanumeric
      code = crypto.randomBytes(3).toString('hex').toUpperCase();
      attempts++;
    } while (rooms.has(code) && attempts < 1000);
    return code;
  };

  io.on('connection', (socket) => {
    // Simple WS Rate limiting connection IP
    const ip = socket.handshake.address;
    const now = Date.now();
    const timestamps = connectionLimits.get(ip) || [];
    const validTimestamps = timestamps.filter(t => now - t < 60000); // 1 minute window
    
    if (validTimestamps.length > 20) { // Max 20 connections per minute per IP
      socket.disconnect(true);
      return;
    }
    
    validTimestamps.push(now);
    connectionLimits.set(ip, validTimestamps);
    
    const leaveCurrentRoom = (explicit = false) => {
      const roomCode = socketToRoom.get(socket.id);
      if (roomCode) {
        const room = rooms.get(roomCode);
        if (room) {
          socket.to(roomCode).emit('peer_left', { peerId: socket.id, explicit });
          room.peers.delete(socket.id);
          
          if (room.peers.size === 0) {
             rooms.delete(roomCode);
          } else if (room.hostId === socket.id) {
             // Host leaving, reassign to first available peer
             const nextHost = Array.from(room.peers.keys())[0];
             room.hostId = nextHost;
          }
        }
        socket.leave(roomCode);
        socketToRoom.delete(socket.id);
      }
    };

    socket.on('create_room', (deviceName?: string) => {
      if (typeof deviceName !== 'string' && deviceName !== undefined) return;
      
      leaveCurrentRoom();
      
      const roomCode = generateRoomCode();
      const peersMap = new Map<string, string>();
      const safeDeviceName = deviceName ? String(deviceName).substring(0, 50) : 'Unknown Device';
      peersMap.set(socket.id, safeDeviceName);
      
      rooms.set(roomCode, { hostId: socket.id, hostDeviceName: safeDeviceName, peers: peersMap, createdAt: Date.now() });
      socketToRoom.set(socket.id, roomCode);
      socket.join(roomCode);
      socket.emit('room_created', { roomCode, deviceName: safeDeviceName });
      console.log(`[Room Context]: Room ${roomCode} created by ${socket.id}`);
    });

    socket.on('join_room', (data) => {
      if (!data) return;
      const rawRoomCode = typeof data === 'string' ? data : data.code;
      const rawDeviceName = typeof data === 'object' ? data.deviceName : 'Unknown Device';
      const roomCode = typeof rawRoomCode === 'string' ? String(rawRoomCode).trim().toUpperCase() : '';
      const deviceName = String(rawDeviceName).substring(0, 50);
      
      if (!roomCode || roomCode.length > 10) return;
      
      const room = rooms.get(roomCode);
      if (room) {
        if (room.peers.size >= 10) { // arbitrary limit for P2P mesh
           socket.emit('room_error', { message: 'Room is full (max 10 peers).' });
           return;
        }
        
        leaveCurrentRoom();
        room.peers.set(socket.id, deviceName);
        socketToRoom.set(socket.id, roomCode);
        socket.join(roomCode);
        
        const peersList = Array.from(room.peers.entries()).map(([id, name]) => ({ id, deviceName: name }));
        socket.emit('room_joined', { roomCode, peers: peersList });
        
        // Let others know peer wants to connect
        socket.to(roomCode).emit('peer_joined', { peerId: socket.id, peerDeviceName: deviceName });
        
      } else {
        socket.emit('room_error', { message: 'Invalid room code.' });
      }
    });

    socket.on('leave_room', () => {
      leaveCurrentRoom(true);
    });

    // WebRTC signaling validation
    socket.on('signal', (data) => {
      if (!data || typeof data !== 'object') return;
      const { to, signal } = data;
      
      if (typeof to !== 'string' || !signal) return;
      
      io.to(to).emit('signal', {
        from: socket.id,
        signal
      });
    });

    socket.on('disconnect', () => {
      leaveCurrentRoom(false);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Graceful Shutdown Handling
  const shutdown = () => {
     console.log('Shutting down server gracefully...');
     httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
     });
     
     // Force close after 10 seconds
     setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
     }, 10000);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
