import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Relay signaling server.
 *
 * It only introduces devices to each other: room membership, WebRTC offer/answer/ICE
 * relay (scoped to members of the same room), and "nearby device" discovery.
 * File bytes never pass through here. Nothing is persisted; all state is in memory.
 */

// ── Readable room codes: adjective-noun-123  (244 × 247 × 900 ≈ 54M combinations)
const ADJ = 'amber,ancient,arctic,azure,bold,brave,breezy,bright,brisk,calm,candid,cedar,chill,civic,clever,cobalt,coral,cosmic,cozy,crimson,crisp,curly,dapper,dawn,deep,dewy,dusky,eager,early,easy,ember,epic,fair,fancy,fern,fiery,fleet,fluffy,foggy,fond,frosty,gentle,giant,glad,gleaming,glossy,golden,grand,grassy,hazel,hidden,hollow,honest,humble,icy,indigo,ivory,jade,jolly,keen,kind,lively,lofty,loyal,lucid,lucky,lunar,magic,mellow,merry,mighty,minty,misty,modest,mossy,neat,nimble,noble,north,oaken,ocean,olive,opal,orchid,pastel,patient,peachy,pearl,plucky,polar,polite,proud,quick,quiet,radiant,rapid,rare,rosy,royal,ruby,rustic,sage,sandy,scarlet,serene,shady,sharp,shiny,silent,silky,silver,simple,sleek,smooth,snowy,solar,sonic,spicy,steady,stormy,sturdy,sunny,swift,tame,tidy,timber,tiny,topaz,tranquil,tropic,true,tulip,velvet,vivid,warm,wavy,wild,windy,wise,witty,woolly,young,zesty,zen,alpine,autumn,blazing,blissful,bouncy,cheery,cloudy,crystal,daring,dreamy,dusty,electric,elegant,emerald,fearless,festive,floral,fresh,frozen,gallant,gilded,glacial,glowing,graceful,happy,hearty,heroic,hushed,jazzy,jovial,kindly,lavish,lemon,limber,lilac,lush,majestic,marble,meadow,midnight,mystic,nautical,nifty,nova,orbit,pacific,paper,peppy,pine,plum,prairie,prime,quartz,quirky,rainy,regal,rhythm,ripple,river,rocky,saffron,satin,shimmer,sierra,sincere,sky,smoky,snug,sparkly,spring,starry,stellar,stone,summer,super,sweet,thunder,tidal,toasty,twilight,urban,vast,vintage,violet,vital,wander,winter,wooden,zippy,zonal,aqua,bliss,briny,burly,cinder,dandy,feisty,glimmer,hazy,indie'.split(',');
const NOUN = 'badger,bay,beacon,bear,bee,birch,bison,bloom,breeze,brook,canyon,cedar,cloud,comet,coral,cove,crane,creek,crow,dawn,deer,delta,dolphin,dove,dune,eagle,echo,elk,ember,falcon,fern,finch,fjord,flame,fox,frog,galaxy,gecko,glacier,glade,grove,gull,harbor,hare,hawk,heron,hill,horizon,ibis,island,jaguar,koala,lagoon,lake,lark,leaf,lemur,lily,lion,lotus,lynx,maple,marsh,meadow,mesa,meteor,mink,moon,moose,moth,mountain,nebula,newt,oak,oasis,ocean,orca,otter,owl,panda,panther,parrot,peak,pebble,pelican,penguin,pine,planet,plover,pond,poppy,puffin,quail,rabbit,rain,raven,reef,ridge,river,robin,rock,rose,sage,salmon,seal,shore,sky,sparrow,spruce,star,stone,stork,storm,stream,sun,swan,thistle,tide,tiger,trail,tulip,tundra,turtle,valley,violet,wave,whale,willow,wolf,wren,yak,zebra,acorn,anchor,apple,arrow,aspen,aurora,basil,berry,blossom,boulder,bramble,cactus,cairn,caribou,cascade,cherry,cliff,clover,condor,cosmos,cougar,coyote,cricket,crystal,cypress,daisy,dragon,drift,eclipse,ermine,falls,feather,ferret,firefly,flint,forest,fountain,garnet,geyser,ginger,granite,gully,hazel,heath,hedge,hollow,hornet,iris,ivy,jasper,juniper,kestrel,kiwi,lantern,larch,laurel,lichen,magpie,mango,marlin,mist,monsoon,moss,nectar,nettle,nutmeg,ocelot,olive,orchid,osprey,papaya,peach,pepper,petal,pigeon,plateau,prism,puma,quartz,rapids,redwood,ripple,sapphire,seagull,sequoia,shell,shrike,sierra,skylark,snowfall,sorrel,spark,spring,squall,summit,swift,sycamore,thunder,tornado,trout,typhoon,vale,vapor,walrus,warbler,wildcat,zephyr,bobcat,bonsai,breaker,cobble,dingo,egret,fennel,gopher'.split(',');

function generateCode(exists: (c: string) => boolean) {
  for (let i = 0; i < 1000; i++) {
    const a = ADJ[crypto.randomInt(ADJ.length)].replace(/\d+$/, '');
    const n = NOUN[crypto.randomInt(NOUN.length)];
    const code = `${a}-${n}-${crypto.randomInt(100, 1000)}`;
    if (!exists(code)) return code;
  }
  throw new Error('code space exhausted');
}

const normalizeCode = (raw: unknown) =>
  typeof raw === 'string'
    ? raw.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 48)
    : '';

const cleanName = (raw: unknown) =>
  typeof raw === 'string' && raw.trim() ? raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40) : 'Unknown device';

const cleanSession = (raw: unknown) => (typeof raw === 'string' && /^[A-Za-z0-9_-]{4,40}$/.test(raw) ? raw : undefined);
const cleanClientId = (raw: unknown) =>
  typeof raw === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(raw) ? raw : crypto.randomUUID();

// ── Small sliding-window limiter keyed by IP (state is in memory and pruned)
class Limiter {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) {
    setInterval(() => this.prune(), 60_000).unref();
  }
  hit(key: string) {
    const now = Date.now();
    const list = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    list.push(now);
    this.hits.set(key, list);
    return list.length <= this.max;
  }
  blocked(key: string) {
    const now = Date.now();
    return (this.hits.get(key) || []).filter((t) => now - t < this.windowMs).length >= this.max;
  }
  private prune() {
    const now = Date.now();
    for (const [k, v] of this.hits) {
      const keep = v.filter((t) => now - t < this.windowMs);
      if (keep.length) this.hits.set(k, keep); else this.hits.delete(k);
    }
  }
}

function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16);
  return { salt, hash: crypto.scryptSync(pw, salt, 32) };
}
function checkPassword(pw: string, rec: { salt: Buffer; hash: Buffer }) {
  const h = crypto.scryptSync(pw, rec.salt, 32);
  return crypto.timingSafeEqual(h, rec.hash);
}

interface Member { clientId: string; name: string; session?: string }
interface Room {
  hostId: string;
  members: Map<string, Member>; // socketId -> member
  createdAt: number;
  password?: { salt: Buffer; hash: Buffer };
}

async function startServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  // Behind a hosting proxy (Render, Fly, Nginx…) the real client IP is in X-Forwarded-For.
  // Without this every visitor shares the proxy's IP and the rate limits lock everyone out.
  const trustProxy = process.env.TRUST_PROXY ?? (isProd ? '1' : '0');
  app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true');

  const backendOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  app.use(helmet({
    contentSecurityPolicy: isProd ? {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        'media-src': ["'self'", 'blob:'],
        'font-src': ["'self'", 'data:'],
        // iconify APIs: the footer's brand icons are fetched at runtime
        'connect-src': ["'self'", 'wss:', 'ws:', 'https://api.iconify.design', 'https://api.unisvg.com', 'https://api.simplesvg.com', ...backendOrigins],
        'worker-src': ["'self'", 'blob:'],
        'manifest-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
      },
    } : false,
  }));

  // Only the small JSON API is rate limited — static assets must never be blocked.
  app.use('/api', rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false }));

  app.get('/healthz', (_req, res) => res.type('text').send('ok'));
  // Share target fallback when the service worker isn't active yet.
  app.post('/share-target', (_req, res) => res.redirect(303, '/'));

  // Short-lived TURN credentials (coturn "use-auth-secret"), so no static secret ships to browsers.
  app.get('/api/turn', (_req, res) => {
    const secret = process.env.TURN_SECRET;
    const urls = process.env.TURN_URLS?.split(',').map((s) => s.trim()).filter(Boolean);
    if (!secret || !urls?.length) return res.json({ iceServers: [] });
    const username = `${Math.floor(Date.now() / 1000) + 6 * 3600}:relay`;
    const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
    res.set('Cache-Control', 'no-store').json({ iceServers: [{ urls, username, credential }] });
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    pingTimeout: 30_000,
    pingInterval: 20_000,
    maxHttpBufferSize: 256 * 1024,
    cors: { origin: backendOrigins.length ? backendOrigins : (isProd ? false : '*'), methods: ['GET', 'POST'] },
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const rooms = new Map<string, Room>();
  const socketRoom = new Map<string, string>();

  // nearby discovery: devices behind the same public network (same IPv4 / IPv6 /64)
  const nearby = new Map<string, Map<string, { name: string; kind: string }>>(); // group -> socketId -> info
  const socketGroup = new Map<string, string>();

  const connLimit = new Limiter(40, 60_000);          // new sockets per IP per minute
  const joinFailLimit = new Limiter(12, 10 * 60_000); // wrong codes/passwords per IP per 10 min
  const inviteLimit = new Limiter(10, 60_000);

  const ipOf = (socket: Socket) => {
    const xff = socket.handshake.headers['x-forwarded-for'];
    if (app.get('trust proxy') && typeof xff === 'string' && xff) {
      const hops = xff.split(',').map((s) => s.trim());
      const n = Number(app.get('trust proxy')) || 1;
      return hops[Math.max(0, hops.length - n)] || socket.handshake.address;
    }
    return socket.handshake.address;
  };
  const groupOf = (ip: string) => {
    const v4 = ip.replace(/^::ffff:/, '');
    const key = v4.includes(':') ? v4.split(':').slice(0, 4).join(':') : v4;
    // hashed so the group key never stores a raw IP
    return crypto.createHash('sha256').update('relay-nearby:' + key).digest('base64url').slice(0, 16);
  };

  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (now - room.createdAt > 24 * 3600_000) {
        io.to(code).emit('room_error', { code: 'EXPIRED', message: 'Room has expired.' });
        io.in(code).socketsLeave(code);
        for (const sid of room.members.keys()) socketRoom.delete(sid);
        rooms.delete(code);
      }
    }
  }, 10 * 60_000).unref();

  const broadcastNearby = (group: string) => {
    const members = nearby.get(group);
    if (!members) return;
    for (const sid of members.keys()) {
      const list = [...members].filter(([id]) => id !== sid).map(([id, m]) => ({ id, name: m.name, kind: m.kind }));
      io.to(sid).emit('nearby_list', list);
    }
  };
  const leaveNearby = (socket: Socket) => {
    const group = socketGroup.get(socket.id);
    if (!group) return;
    socketGroup.delete(socket.id);
    const members = nearby.get(group);
    members?.delete(socket.id);
    if (members && !members.size) nearby.delete(group);
    broadcastNearby(group);
  };

  io.on('connection', (socket) => {
    const ip = ipOf(socket);
    if (!connLimit.hit(ip)) {
      socket.emit('room_error', { code: 'RATE_LIMIT', message: 'Too many connections. Try again in a minute.' });
      socket.disconnect(true);
      return;
    }

    let clientId = cleanClientId(socket.handshake.auth?.clientId);

    const leaveRoom = (explicit: boolean) => {
      const code = socketRoom.get(socket.id);
      if (!code) return;
      socketRoom.delete(socket.id);
      socket.leave(code);
      const room = rooms.get(code);
      if (!room) return;
      room.members.delete(socket.id);
      socket.to(code).emit('peer_left', { peerId: socket.id, clientId, explicit });
      if (!room.members.size) rooms.delete(code);
      else if (room.hostId === socket.id) room.hostId = room.members.keys().next().value!;
    };

    const enter = (code: string, room: Room, name: string, session?: string) => {
      // Same browser tab reconnecting with a new socket: drop its stale entry.
      for (const [sid, m] of room.members) {
        if (m.clientId === clientId && sid !== socket.id) {
          room.members.delete(sid);
          socketRoom.delete(sid);
          if (room.hostId === sid) room.hostId = socket.id;
        }
      }
      room.members.set(socket.id, { clientId, name, session });
      socketRoom.set(socket.id, code);
      socket.join(code);
    };

    socket.on('create_room', (data: unknown) => {
      const d = (typeof data === 'object' && data) ? data as any : { deviceName: data };
      const name = cleanName(d.deviceName);
      leaveRoom(true);
      const code = generateCode((c) => rooms.has(c));
      const room: Room = { hostId: socket.id, members: new Map(), createdAt: Date.now() };
      rooms.set(code, room);
      enter(code, room, name, cleanSession(d.session));
      socket.emit('room_created', { roomCode: code });
    });

    socket.on('set_room_password', (data: unknown) => {
      const code = socketRoom.get(socket.id);
      const room = code ? rooms.get(code) : undefined;
      if (!room || room.hostId !== socket.id) return;
      const pw = typeof (data as any)?.password === 'string' ? (data as any).password : '';
      room.password = pw ? hashPassword(pw.slice(0, 128)) : undefined;
      socket.emit('room_password_set', { enabled: !!room.password });
    });

    socket.on('join_room', (data: unknown) => {
      const d = (typeof data === 'object' && data) ? data as any : { code: data };
      const code = normalizeCode(d.code);
      const name = cleanName(d.deviceName);
      const session = cleanSession(d.session);

      if (socketRoom.get(socket.id) === code) return; // already in it
      if (joinFailLimit.blocked(ip)) {
        socket.emit('room_error', { code: 'RATE_LIMIT', message: 'Too many failed attempts. Wait a few minutes.' });
        return;
      }
      const room = rooms.get(code);
      if (!room) {
        joinFailLimit.hit(ip);
        socket.emit('room_error', { code: 'NOT_FOUND', message: 'Invalid room code.' });
        return;
      }
      const isRejoin = [...room.members.values()].some((m) => m.clientId === clientId);
      if (room.password && !isRejoin) {
        const pw = typeof d.password === 'string' ? d.password : '';
        if (!pw) {
          socket.emit('room_error', { code: 'PASSWORD_REQUIRED', message: 'This room is password protected.' });
          return;
        }
        if (!checkPassword(pw.slice(0, 128), room.password)) {
          joinFailLimit.hit(ip);
          socket.emit('room_error', { code: 'BAD_PASSWORD', message: 'Wrong password.' });
          return;
        }
      }
      if (room.members.size >= 10 && !isRejoin) {
        socket.emit('room_error', { code: 'FULL', message: 'Room is full (max 10 devices).' });
        return;
      }

      leaveRoom(true);
      enter(code, room, name, session);
      const peers = [...room.members].map(([id, m]) => ({ id, clientId: m.clientId, deviceName: m.name, session: m.session }));
      socket.emit('room_joined', { roomCode: code, peers, isHost: room.hostId === socket.id });
      socket.to(code).emit('peer_joined', { peerId: socket.id, clientId, peerDeviceName: name, session });
    });

    socket.on('leave_room', () => leaveRoom(true));

    // WebRTC signaling — only between members of the same room.
    socket.on('signal', (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const { to, signal } = data as any;
      if (typeof to !== 'string' || !signal || typeof signal !== 'object') return;
      const code = socketRoom.get(socket.id);
      if (!code || socketRoom.get(to) !== code) return;
      if (JSON.stringify(signal).length > 64 * 1024) return;
      io.to(to).emit('signal', { from: socket.id, fromClient: clientId, signal });
    });

    // ── Nearby devices
    socket.on('nearby_register', (data: unknown) => {
      const d = (data && typeof data === 'object') ? data as any : {};
      leaveNearby(socket);
      const group = groupOf(ip);
      socketGroup.set(socket.id, group);
      if (!nearby.has(group)) nearby.set(group, new Map());
      const members = nearby.get(group)!;
      if (members.size >= 50) return;
      members.set(socket.id, { name: cleanName(d.name), kind: ['phone', 'tablet', 'laptop', 'desktop'].includes(d.kind) ? d.kind : 'desktop' });
      broadcastNearby(group);
    });
    socket.on('nearby_unregister', () => leaveNearby(socket));
    socket.on('nearby_invite', (data: unknown) => {
      const d = (data && typeof data === 'object') ? data as any : {};
      const group = socketGroup.get(socket.id);
      if (!group || typeof d.to !== 'string' || socketGroup.get(d.to) !== group) return;
      if (!inviteLimit.hit(ip)) return;
      const code = socketRoom.get(socket.id);
      if (!code || normalizeCode(d.roomCode) !== code) return; // can only invite into your own room
      const me = nearby.get(group)?.get(socket.id);
      io.to(d.to).emit('nearby_invited', { from: socket.id, name: me?.name || 'A nearby device', roomCode: code });
    });
    socket.on('nearby_decline', (data: unknown) => {
      const to = (data as any)?.to;
      if (typeof to === 'string' && socketGroup.get(to) === socketGroup.get(socket.id)) io.to(to).emit('nearby_declined', { from: socket.id });
    });

    socket.on('disconnect', () => {
      leaveRoom(false);
      leaveNearby(socket);
    });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders(res, file) {
        if (file.endsWith('sw.js') || file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        else if (/[\\/]assets[\\/]/.test(file)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }));
    app.get('*all', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const shutdown = () => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  httpServer.listen(PORT, '0.0.0.0', () => console.log(`Relay server on :${PORT}`));
}

startServer();
