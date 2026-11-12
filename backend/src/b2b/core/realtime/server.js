// @ts-check
/**
 * Self-hosted Socket.IO server for the B2B system (docs/plan/11-notifications-and-realtime.md).
 * Runs only in the realtime process — never attached to the existing Express server.
 * - Handshake: optional realtime token (signed-in users get their personal rooms).
 * - Browsers may subscribe to public availability rooms only (max 20 per socket).
 * - Max connections per IP; nothing sensitive is ever sent.
 */
import { Server } from 'socket.io';

import { CACHE_EVICT_ROOM, isPublicRoom } from './rooms.js';
import { verifyRealtimeToken } from './token.js';

const MAX_PUBLIC_ROOMS = 20;
const MAX_CONNECTIONS_PER_IP = 20;

/**
 * @param {{ httpServer: import('node:http').Server, secret: string, origins: readonly string[],
 *   clock: import('../clock.js').Clock, logger: import('../logger.js').Logger }} options
 */
export function createRealtimeServer(options) {
  const io = new Server(options.httpServer, {
    path: '/socket.io',
    cors: { origin: [...options.origins], credentials: false },
    maxHttpBufferSize: 4096,
    serveClient: false,
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60_000 },
  });
  /** @type {Map<string, number>} */
  const perIp = new Map();

  io.use((socket, next) => {
    const ip = String(socket.handshake.headers['cf-connecting-ip'] ?? socket.handshake.address);
    if ((perIp.get(ip) ?? 0) >= MAX_CONNECTIONS_PER_IP) return next(new Error('TOO_MANY_CONNECTIONS'));
    const token = socket.handshake.auth?.token;
    if (token !== undefined) {
      const claims = verifyRealtimeToken(String(token), options);
      if (!claims) return next(new Error('INVALID_TOKEN'));
      socket.data.rooms = claims.rooms;
    }
    socket.data.ip = ip;
    next();
  });

  io.on('connection', (socket) => {
    const ip = socket.data.ip;
    perIp.set(ip, (perIp.get(ip) ?? 0) + 1);
    for (const room of /** @type {string[]} */ (socket.data.rooms ?? [])) void socket.join(room);
    /** @type {Set<string>} */
    const publicRooms = new Set();

    socket.on('subscribe', (/** @type {unknown} */ room, /** @type {unknown} */ ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      if (typeof room !== 'string' || !isPublicRoom(room)) return reply({ ok: false, code: 'ROOM_NOT_ALLOWED' });
      if (publicRooms.size >= MAX_PUBLIC_ROOMS && !publicRooms.has(room)) return reply({ ok: false, code: 'TOO_MANY_ROOMS' });
      publicRooms.add(room);
      void socket.join(room);
      return reply({ ok: true });
    });

    socket.on('unsubscribe', (/** @type {unknown} */ room) => {
      if (typeof room === 'string' && publicRooms.delete(room)) void socket.leave(room);
    });

    socket.on('disconnect', () => {
      const n = (perIp.get(ip) ?? 1) - 1;
      if (n <= 0) perIp.delete(ip);
      else perIp.set(ip, n);
    });
  });

  return {
    io,
    /** @param {import('./signals.js').Signal} signal */
    deliver(signal) {
      if (signal.room === CACHE_EVICT_ROOM) return; // for API caches, not browsers
      io.to(signal.room).emit(signal.event, signal.data);
    },
    close: () =>
      new Promise((resolve) => {
        io.close(() => resolve(undefined));
      }),
  };
}
