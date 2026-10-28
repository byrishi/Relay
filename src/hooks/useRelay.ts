import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  WebRTCManager, TransferUpdate, TransferStatus, RouteInfo, IncomingOffer, FileMeta, GroupInfo,
  loadIceServers, discardPartial,
} from '../lib/webrtc';
import { Sink, browserSink, dirSink, pickDiskSink, pickDirectory } from '../lib/sinks';
import { setAtmosphere, pulseAtmosphere, speedToEnergy } from '../lib/atmosphere';

const vals = <T,>(o: Record<string, T>): T[] => Object.values(o) as T[];
const ents = <T,>(o: Record<string, T>): [string, T][] => Object.entries(o) as [string, T][];

// ── Identity ─────────────────────────────────────────────────────────────────
const rid = () => (crypto as any).randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function storageGet(store: Storage, key: string) { try { return store.getItem(key); } catch { return null; } }
function storageSet(store: Storage, key: string, v: string) { try { store.setItem(key, v); } catch { /* private mode */ } }

/** Stable per tab: a reconnect or reload keeps the same id, so peers recognise us. */
function getClientId() {
  let id = storageGet(sessionStorage, 'relay-client-id');
  if (!id) { id = rid().replace(/[^A-Za-z0-9_-]/g, ''); storageSet(sessionStorage, 'relay-client-id', id); }
  return id;
}

// Device names pair a Sanskrit quality with a bird, flower or star from the old texts (e.g. Shanti Hamsa).
const NAME_A = ['Satya', 'Shanti', 'Ananda', 'Karuna', 'Maitri', 'Jyoti', 'Divya', 'Amrita', 'Tejas', 'Prana', 'Vidya', 'Kirti', 'Mangala', 'Ujjwala', 'Sneha', 'Swara'];
const NAME_B = ['Mayura', 'Hamsa', 'Kokila', 'Padma', 'Kamala', 'Megha', 'Surya', 'Chandra', 'Tara', 'Ganga', 'Sindhu', 'Gaja', 'Simha', 'Harina', 'Shuka', 'Dhruva'];

export function deviceKind(): 'phone' | 'tablet' | 'laptop' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
  if (/Android|iPhone|Mobile/i.test(ua)) return 'phone';
  if (/Macintosh|Windows|CrOS/i.test(ua)) return 'laptop';
  return 'desktop';
}
function platformLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/CrOS/i.test(ua)) return 'Chromebook';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Device';
}
function getDeviceName() {
  let n = storageGet(localStorage, 'relay-device-name');
  if (!n) {
    n = `${NAME_A[Math.floor(Math.random() * NAME_A.length)]} ${NAME_B[Math.floor(Math.random() * NAME_B.length)]}`;
    storageSet(localStorage, 'relay-device-name', n);
  }
  return `${n} · ${platformLabel()}`;
}

// ── Types ────────────────────────────────────────────────────────────────────
export type AppState = 'LANDING' | 'LOBBY' | 'CONNECTED';

export interface Peer {
  clientId: string;
  socketId: string;
  name: string;
  session?: string;
  connected: boolean;
  /** undefined = waiting for your decision */
  approved?: boolean;
  route?: RouteInfo;
  safety?: string;
}

export interface TransferTask {
  id: string;
  name: string;
  size: number;
  mime?: string;
  path?: string;
  group?: GroupInfo;
  isSending: boolean;
  status: TransferStatus;
  progress: number;
  bytes: number;
  speed: number;
  eta?: number;
  avgSpeed?: number;
  url?: string;
  blob?: Blob;
  crc?: number;
  savedToDisk?: boolean;
  previewUrl?: string;
  error?: string;
  peerIds: string[];
  samples: number[];
  interruptedAt?: number;
}

export interface PendingOffer extends IncomingOffer { peerId: string; peerName: string; receivedAt: number }

export interface TextMessage { id: string; text: string; isSending: boolean; timestamp: number; from?: string; kind?: 'text' | 'clip' }

export interface NearbyDevice { id: string; name: string; kind: string }

export interface HistoryEntry {
  id: string; name: string; size: number; direction: 'send' | 'receive'; status: TransferStatus;
  peer: string; avgSpeed?: number; at: number; group?: string;
}

const TERMINAL: TransferStatus[] = ['completed', 'failed', 'cancelled', 'declined'];
const STATUS_RANK: TransferStatus[] = ['transferring', 'paused', 'queued', 'offered', 'interrupted', 'completed', 'failed', 'declined', 'cancelled'];
const HISTORY_KEY = 'relay-history';

function playChime() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 600);
  } catch { /* no audio */ }
}

export interface OutgoingFile { file: File; meta: Partial<FileMeta>; targets: Set<string> }

export function useRelay() {
  const clientId = useMemo(getClientId, []);
  const pageSession = useMemo(() => rid().slice(0, 12), []);
  const deviceName = useMemo(getDeviceName, []);
  const backend = (import.meta as any).env?.VITE_BACKEND_URL || '';

  const [socket, setSocket] = useState<Socket | null>(null);
  const [appState, setAppState] = useState<AppState>('LANDING');
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const [transfers, setTransfers] = useState<Record<string, TransferTask>>({});
  const [offers, setOffers] = useState<PendingOffer[]>([]);
  const [messages, setMessages] = useState<TextMessage[]>([]);
  const [nearbyDevices, setNearbyDevices] = useState<NearbyDevice[]>([]);
  const [nearbyInvite, setNearbyInvite] = useState<{ from: string; name: string; roomCode: string } | null>(null);
  const [clipboardSync, setClipboardSync] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try { return JSON.parse(storageGet(localStorage, HISTORY_KEY) || '[]'); } catch { return []; }
  });
  const [keepHistory, setKeepHistoryState] = useState(() => storageGet(localStorage, 'relay-keep-history') !== '0');
  const [notice, setNotice] = useState<string>('');

  // refs mirror state for socket/engine callbacks
  const managers = useRef<Record<string, WebRTCManager>>({});
  const peersRef = useRef(peers); peersRef.current = peers;
  const roomRef = useRef(roomCode); roomRef.current = roomCode;
  const appRef = useRef(appState); appRef.current = appState;
  const passwordRef = useRef('');
  const iceRef = useRef<RTCIceServer[]>([]);
  const peerProgress = useRef<Record<string, Record<string, TransferUpdate>>>({});
  const outgoingFiles = useRef<Record<string, OutgoingFile>>({});
  const groupDecisions = useRef<Record<string, { accept: boolean; dir?: any }>>({});
  const trusted = useRef<Set<string>>(new Set());
  const blocked = useRef<Set<string>>(new Set());
  const invitedSockets = useRef<Set<string>>(new Set());
  const heldOffers = useRef<Record<string, IncomingOffer[]>>({}); // offers from peers awaiting approval
  const reconnectTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const recorded = useRef<Set<string>>(new Set());
  const pendingInvite = useRef<string | null>(null);
  const keepHistoryRef = useRef(keepHistory); keepHistoryRef.current = keepHistory;
  const transfersRef = useRef(transfers); transfersRef.current = transfers;
  const clipRef = useRef({ enabled: false, last: '', pendingWrite: '' });
  clipRef.current.enabled = clipboardSync;

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    window.clearTimeout((flash as any)._t);
    (flash as any)._t = window.setTimeout(() => setNotice(''), 4000);
  }, []);

  const updatePeer = useCallback((cid: string, patch: Partial<Peer>) => {
    setPeers((prev) => {
      const cur = prev[cid];
      if (!cur && !patch.socketId) return prev;
      return { ...prev, [cid]: { clientId: cid, socketId: '', name: 'Device', connected: false, ...cur, ...patch } };
    });
  }, []);

  // ── History ────────────────────────────────────────────────────────────
  const record = useCallback((t: TransferTask, peerName: string) => {
    if (!keepHistoryRef.current || recorded.current.has(t.id)) return;
    recorded.current.add(t.id);
    setHistory((h) => {
      const next = [{ id: t.id, name: t.group ? `${t.path || t.name}` : t.name, size: t.size, direction: t.isSending ? 'send' : 'receive',
        status: t.status, peer: peerName, avgSpeed: t.avgSpeed, at: Date.now(), group: t.group?.name } as HistoryEntry, ...h].slice(0, 300);
      storageSet(localStorage, HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const clearHistory = useCallback(() => {
    setHistory([]); recorded.current.clear();
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  }, []);
  const setKeepHistory = useCallback((v: boolean) => {
    setKeepHistoryState(v);
    storageSet(localStorage, 'relay-keep-history', v ? '1' : '0');
    if (!v) clearHistory();
  }, [clearHistory]);

  // ── Transfer aggregation (one task may go to several peers) ─────────────
  const applyUpdate = useCallback((peerId: string, u: TransferUpdate) => {
    const per: Record<string, TransferUpdate> = (peerProgress.current[u.id] ||= {});
    const prevStatus = per[peerId]?.status;
    per[peerId] = u;
    if (u.status === 'completed' && prevStatus !== 'completed') {
      pulseAtmosphere();
      if (u.direction === 'receive') playChime();
    }
    const list = vals(per);
    const total = u.size * list.length;
    const bytes = list.reduce((a, x) => a + x.bytes, 0);
    const speed = list.reduce((a, x) => a + x.speed, 0);
    const status = STATUS_RANK.find((s) => list.some((x) => x.status === s)) || u.status;

    setTransfers((prev) => {
      const old = prev[u.id];
      const samples = old?.samples ?? [];
      const nextSamples = status === 'transferring' ? [...samples, speed].slice(-120) : samples;
      const task: TransferTask = {
        ...old,
        id: u.id, name: u.name, size: u.size, mime: u.mime, path: u.path, group: u.group,
        isSending: u.direction === 'send',
        status,
        bytes,
        progress: status === 'completed' ? 100 : total > 0 ? (bytes / total) * 100 : 0,
        speed,
        eta: speed > 0 ? (total - bytes) / speed : undefined,
        avgSpeed: u.avgSpeed ?? old?.avgSpeed,
        url: u.url ?? old?.url,
        blob: u.blob ?? old?.blob,
        crc: u.crc ?? old?.crc,
        savedToDisk: u.savedToDisk ?? old?.savedToDisk,
        error: list.find((x) => x.error)?.error,
        peerIds: Object.keys(per),
        samples: nextSamples,
        interruptedAt: status === 'interrupted' ? (old?.interruptedAt ?? Date.now()) : undefined,
      };
      if (TERMINAL.includes(status) && !list.some((x) => !TERMINAL.includes(x.status))) {
        record(task, Object.keys(per).map((p) => peersRef.current[p]?.name || 'device').join(', '));
      }
      return { ...prev, [u.id]: task };
    });
  }, [record]);

  // ── Offers ───────────────────────────────────────────────────────────────
  const acceptOffer = useCallback(async (o: IncomingOffer, peerId: string, sink?: Sink | null) => {
    const m = managers.current[peerId];
    if (!m) return;
    setOffers((prev) => prev.filter((x) => x.id !== o.id));
    try {
      await m.respond(o.id, true, o, sink ?? null);
    } catch {
      await m.respond(o.id, true, o, await browserSink(o.name));
    }
  }, []);

  const declineOffer = useCallback((o: IncomingOffer, peerId: string) => {
    managers.current[peerId]?.respond(o.id, false, o);
    setOffers((prev) => prev.filter((x) => x.id !== o.id));
  }, []);

  /** Apply a stored decision for a folder to one of its files. */
  const applyGroupDecision = useCallback(async (o: IncomingOffer, peerId: string) => {
    const d = groupDecisions.current[o.group!.id];
    if (!d) return false;
    if (!d.accept) { declineOffer(o, peerId); return true; }
    let sink: Sink | null = null;
    if (d.dir) {
      try { sink = await dirSink(d.dir, o.path || o.name); } catch { sink = null; }
    }
    await acceptOffer(o, peerId, sink);
    return true;
  }, [acceptOffer, declineOffer]);

  const routeOffer = useCallback(async (peerId: string, o: IncomingOffer) => {
    const peer = peersRef.current[peerId];
    if (!peer?.approved) {
      (heldOffers.current[peerId] ||= []).push(o);
      return;
    }
    if (o.group && await applyGroupDecision(o, peerId)) return;
    if (trusted.current.has(peerId) && !o.group) { await acceptOffer(o, peerId); return; }
    setOffers((prev) => prev.some((x) => x.id === o.id) ? prev : [...prev, { ...o, peerId, peerName: peer.name, receivedAt: Date.now() }]);
  }, [acceptOffer, applyGroupDecision]);

  /** UI actions on an offer card (all must run inside the click handler for pickers). */
  const respondToOffer = useCallback(async (offerId: string, action: 'save-as' | 'accept' | 'decline' | 'folder', alwaysAccept = false) => {
    const o = offers.find((x) => x.id === offerId);
    if (!o) return;
    if (alwaysAccept) trusted.current.add(o.peerId);
    if (o.group) {
      const siblings = offers.filter((x) => x.group?.id === o.group!.id);
      if (action === 'decline') {
        groupDecisions.current[o.group.id] = { accept: false };
        siblings.forEach((s) => declineOffer(s, s.peerId));
        return;
      }
      let dir: any;
      if (action === 'folder') {
        dir = await pickDirectory();
        if (!dir) return;
      }
      groupDecisions.current[o.group.id] = { accept: true, dir };
      for (const s of siblings) await applyGroupDecision(s, s.peerId);
      return;
    }
    if (action === 'decline') return declineOffer(o, o.peerId);
    let sink: Sink | null = null;
    if (action === 'save-as') {
      sink = await pickDiskSink(o.name);
      if (!sink) return; // user cancelled the picker
    }
    await acceptOffer(o, o.peerId, sink);
  }, [offers, acceptOffer, declineOffer, applyGroupDecision]);

  const acceptAllOffers = useCallback(async () => {
    for (const o of offers) {
      if (o.group) {
        groupDecisions.current[o.group.id] ||= { accept: true };
        await applyGroupDecision(o, o.peerId);
      } else await acceptOffer(o, o.peerId);
    }
  }, [offers, acceptOffer, applyGroupDecision]);

  // ── Connections ──────────────────────────────────────────────────────────
  const iAmInitiator = (peerCid: string) => clientId < peerCid;

  const resendTo = useCallback((peerId: string, m: WebRTCManager) => {
    for (const [id, of] of ents(outgoingFiles.current)) {
      if (!of.targets.has(peerId)) continue;
      const st = peerProgress.current[id]?.[peerId]?.status;
      if (st && TERMINAL.includes(st)) continue;
      m.sendFile(of.file, id, of.meta);
    }
  }, []);

  const createManager = useCallback((peerCid: string, initiator: boolean) => {
    const old = managers.current[peerCid];
    if (old) { old.onDisconnect = undefined; old.drop(); }
    const m = new WebRTCManager(iceRef.current);
    managers.current[peerCid] = m;
    clearTimeout(reconnectTimers.current[peerCid]);

    m.onSignal = (signal) => {
      const to = peersRef.current[peerCid]?.socketId;
      if (to) socketRef.current?.emit('signal', { to, signal });
    };
    m.onConnect = async () => {
      updatePeer(peerCid, { connected: true });
      setAppState('CONNECTED');
      const safety = await m.safetyNumber();
      updatePeer(peerCid, { safety: safety || undefined });
      if (peersRef.current[peerCid]?.approved) resendTo(peerCid, m);
    };
    m.onDisconnect = (reason) => {
      if (managers.current[peerCid] !== m) return;
      delete managers.current[peerCid];
      updatePeer(peerCid, { connected: false, route: undefined });
      const stillHere = !!peersRef.current[peerCid] && !!roomRef.current && !blocked.current.has(peerCid);
      if (reason === 'failed' && stillHere && iAmInitiator(peerCid)) {
        reconnectTimers.current[peerCid] = setTimeout(() => {
          if (!managers.current[peerCid] && peersRef.current[peerCid]) createManager(peerCid, true);
        }, 1500);
      }
    };
    m.onTransferUpdate = (u) => applyUpdate(peerCid, u);
    m.onOffer = (o) => routeOffer(peerCid, o);
    m.onTextReceived = (text) => {
      if (!peersRef.current[peerCid]?.approved) return;
      playChime();
      setMessages((prev) => [{ id: rid(), text, isSending: false, timestamp: Date.now(), from: peersRef.current[peerCid]?.name }, ...prev].slice(0, 200));
    };
    m.onClipboard = (text) => {
      if (!peersRef.current[peerCid]?.approved || !clipRef.current.enabled) return;
      clipRef.current.last = text;
      setMessages((prev) => [{ id: rid(), text, isSending: false, timestamp: Date.now(), from: peersRef.current[peerCid]?.name, kind: 'clip' as const }, ...prev].slice(0, 200));
      if (document.hasFocus()) navigator.clipboard?.writeText(text).then(() => flash('Clipboard updated from ' + (peersRef.current[peerCid]?.name || 'peer'))).catch(() => { clipRef.current.pendingWrite = text; });
      else clipRef.current.pendingWrite = text;
    };
    m.onRoute = (route) => updatePeer(peerCid, { route });
    m.init(initiator);
    return m;
  }, [applyUpdate, routeOffer, resendTo, updatePeer, flash]);

  const ensureConnection = useCallback((peerCid: string) => {
    if (blocked.current.has(peerCid) || managers.current[peerCid]) return;
    if (iAmInitiator(peerCid)) createManager(peerCid, true);
    // otherwise the peer (initiator) will send us an offer
  }, [createManager]);

  const removePeer = useCallback((peerCid: string, explicit: boolean) => {
    const m = managers.current[peerCid];
    if (m) { m.onDisconnect = undefined; delete managers.current[peerCid]; explicit ? m.close() : m.drop(); }
    if (explicit) {
      // they left on purpose: nothing will resume
      for (const [id, per] of ents(peerProgress.current)) {
        if (per[peerCid]?.status === 'interrupted') {
          discardPartial(id);
          applyUpdate(peerCid, { ...per[peerCid], status: 'cancelled', speed: 0, error: 'Peer left' });
        }
      }
    }
    setPeers((prev) => { const n = { ...prev }; delete n[peerCid]; return n; });
    setOffers((prev) => prev.filter((o) => o.peerId !== peerCid));
  }, [applyUpdate]);

  // ── Socket ───────────────────────────────────────────────────────────────
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    loadIceServers(backend).then((s) => { iceRef.current = s; });
    const s = io(backend || window.location.origin, { auth: { clientId } });
    socketRef.current = s;
    setSocket(s);

    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      window.history.replaceState({}, document.title, window.location.pathname + (params.get('share') ? '?share=1' : ''));
    }

    const join = (code: string) => s.emit('join_room', { code, deviceName, password: passwordRef.current || undefined, session: pageSession });

    s.on('connect', () => {
      if (roomRef.current) join(roomRef.current);
      if (appRef.current !== 'CONNECTED') s.emit('nearby_register', { name: deviceName, kind: deviceKind() });
    });

    s.on('room_created', ({ roomCode }) => {
      setRoomCode(roomCode); roomRef.current = roomCode;
      setIsHost(true);
      setAppState('LOBBY');
      if (pendingInvite.current) {
        invitedSockets.current.add(pendingInvite.current);
        s.emit('nearby_invite', { to: pendingInvite.current, roomCode });
        pendingInvite.current = null;
      }
    });

    s.on('room_joined', ({ roomCode, peers: list, isHost: host }) => {
      setRoomCode(roomCode); roomRef.current = roomCode;
      setIsHost(!!host);
      setNeedsPassword(false);
      setJoinError('');
      setAppState((st) => (st === 'CONNECTED' ? st : 'LOBBY'));
      for (const p of (list || []) as any[]) {
        if (p.clientId === clientId) continue;
        const known = peersRef.current[p.clientId];
        // we chose to join this room, so devices already inside are trusted by us
        updatePeer(p.clientId, { socketId: p.id, name: p.deviceName, approved: known?.approved ?? true });
        peersRef.current = { ...peersRef.current, [p.clientId]: { ...(known || { clientId: p.clientId, connected: false }), socketId: p.id, name: p.deviceName, approved: known?.approved ?? true } as Peer };
        ensureConnection(p.clientId);
      }
    });

    s.on('peer_joined', ({ peerId, clientId: cid, peerDeviceName, session }) => {
      if (!cid || cid === clientId) return;
      if (blocked.current.has(cid)) return;
      const known = peersRef.current[cid];
      const approved = known?.approved ?? (invitedSockets.current.has(peerId) ? true : undefined);
      if (known && session && known.session && known.session !== session) {
        // they reloaded: the old link is dead
        const m = managers.current[cid];
        if (m) { m.onDisconnect = undefined; delete managers.current[cid]; m.drop(); }
      }
      const next: Peer = { ...(known || { clientId: cid, connected: false }), socketId: peerId, name: peerDeviceName, session, approved } as Peer;
      peersRef.current = { ...peersRef.current, [cid]: next };
      setPeers((prev) => ({ ...prev, [cid]: next }));
      ensureConnection(cid);
    });

    s.on('peer_left', ({ clientId: cid, explicit }) => {
      if (!cid || !peersRef.current[cid]) return;
      if (explicit) removePeer(cid, true);
      // otherwise: their socket blipped; the direct link may still be alive
    });

    s.on('signal', ({ from, fromClient, signal }) => {
      if (!fromClient || blocked.current.has(fromClient)) return;
      if (!peersRef.current[fromClient]) return; // only peers announced by the room
      if (peersRef.current[fromClient].socketId !== from) {
        updatePeer(fromClient, { socketId: from });
        peersRef.current[fromClient] = { ...peersRef.current[fromClient], socketId: from };
      }
      let m = managers.current[fromClient];
      if (signal?.type === 'offer') {
        const fresh = !m || m.isInitiator || (m.remoteSession && signal.session && m.remoteSession !== signal.session);
        if (fresh && !iAmInitiator(fromClient)) m = createManager(fromClient, false);
      } else if (m?.remoteSession && signal?.session && m.remoteSession !== signal.session) {
        return; // stale signal from an old connection
      }
      m?.handleSignal(signal);
    });

    s.on('room_error', ({ code, message }) => {
      if (code === 'PASSWORD_REQUIRED') { setNeedsPassword(true); setJoinError(''); return; }
      if (code === 'BAD_PASSWORD') { setNeedsPassword(true); setJoinError(message); return; }
      setJoinError(message);
      if (appRef.current !== 'CONNECTED') { setAppState('LANDING'); setRoomCode(''); roomRef.current = ''; }
    });

    s.on('room_password_set', ({ enabled }) => setPasswordEnabled(!!enabled));
    s.on('nearby_list', (list: NearbyDevice[]) => setNearbyDevices(Array.isArray(list) ? list : []));
    s.on('nearby_invited', (inv) => setNearbyInvite(inv));
    s.on('nearby_declined', () => flash('The other device declined.'));

    if (codeParam) {
      roomRef.current = '';
      const tryJoin = () => join(codeParam);
      if (s.connected) tryJoin(); else s.once('connect', tryJoin);
    }

    return () => { s.removeAllListeners(); s.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // nearby discovery only while not connected
  useEffect(() => {
    if (!socket) return;
    if (appState === 'CONNECTED') socket.emit('nearby_unregister');
    else socket.emit('nearby_register', { name: deviceName, kind: deviceKind() });
  }, [socket, appState, deviceName]);

  // fall back to the lobby when every link is gone
  useEffect(() => {
    const anyConnected = vals(peers).some((p) => p.connected);
    if (appState === 'CONNECTED' && !anyConnected && !Object.keys(peers).length) setAppState(roomCode ? 'LOBBY' : 'LANDING');
  }, [peers, appState, roomCode]);

  // give up on interrupted transfers after 10 minutes
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      for (const task of vals(transfersRef.current)) {
        if (task.status === 'interrupted' && task.interruptedAt && now - task.interruptedAt > 10 * 60_000) {
          if (!task.isSending) discardPartial(task.id);
          for (const pid of task.peerIds) {
            const u = peerProgress.current[task.id]?.[pid];
            if (u?.status === 'interrupted') applyUpdate(pid, { ...u, status: 'failed', error: 'Connection lost' });
          }
        }
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [applyUpdate]);

  // ── Background scene ─────────────────────────────────────────────────────
  const totalSpeed = useMemo(() => vals(transfers).reduce((a, t) => a + (t.status === 'transferring' ? t.speed : 0), 0), [transfers]);
  const connectedCount = vals(peers).filter((p) => p.connected).length;
  useEffect(() => {
    setAtmosphere({ mode: appState === 'CONNECTED' ? 'connected' : appState === 'LOBBY' ? 'lobby' : 'landing', peers: Math.max(1, connectedCount) });
  }, [appState, connectedCount]);
  useEffect(() => { setAtmosphere({ energy: speedToEnergy(totalSpeed) }); }, [totalSpeed]);
  useEffect(() => () => setAtmosphere({ mode: 'landing', energy: 0 }), []);

  // ── Clipboard sync ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!clipboardSync) return;
    const pull = async () => {
      const c = clipRef.current;
      if (c.pendingWrite) {
        try { await navigator.clipboard.writeText(c.pendingWrite); flash('Clipboard updated'); } catch { /* still not allowed */ }
        c.last = c.pendingWrite; c.pendingWrite = '';
        return;
      }
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== c.last && text.length <= 100_000) {
          c.last = text;
          for (const [cid, m] of ents(managers.current)) if (peersRef.current[cid]?.approved && m.isOpen) m.sendClipboard(text);
        }
      } catch { /* permission denied or no focus */ }
    };
    const onFocus = () => { pull(); };
    window.addEventListener('focus', onFocus);
    const t = setInterval(() => { if (document.hasFocus()) pull(); }, 1500);
    pull();
    return () => { window.removeEventListener('focus', onFocus); clearInterval(t); };
  }, [clipboardSync, flash]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const createRoom = useCallback(() => {
    setJoinError('');
    socketRef.current?.emit('create_room', { deviceName, session: pageSession });
    setAppState('LOBBY');
  }, [deviceName, pageSession]);

  const joinRoom = useCallback((code: string, password?: string) => {
    const clean = code.trim().toLowerCase().replace(/[\s_]+/g, '-');
    if (!clean) return;
    if (password !== undefined) passwordRef.current = password;
    setJoinError('');
    socketRef.current?.emit('join_room', { code: clean, deviceName, password: passwordRef.current || undefined, session: pageSession });
  }, [deviceName, pageSession]);

  const setRoomPassword = useCallback((pw: string) => {
    socketRef.current?.emit('set_room_password', { password: pw });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave_room');
    for (const [cid, m] of ents(managers.current)) { m.onDisconnect = undefined; m.close(); delete managers.current[cid]; }
    for (const t of vals(transfersRef.current)) if (t.status === 'interrupted' && !t.isSending) discardPartial(t.id);
    vals(reconnectTimers.current).forEach(clearTimeout);
    setRoomCode(''); roomRef.current = '';
    setPeers({}); peersRef.current = {};
    setOffers([]);
    setTransfers({}); peerProgress.current = {};
    outgoingFiles.current = {};
    groupDecisions.current = {};
    setMessages([]);
    setPasswordEnabled(false);
    passwordRef.current = '';
    setAppState('LANDING');
  }, []);

  const approvePeer = useCallback((cid: string, allow: boolean) => {
    if (allow) {
      updatePeer(cid, { approved: true });
      peersRef.current[cid] = { ...peersRef.current[cid], approved: true };
      const held = heldOffers.current[cid] || [];
      delete heldOffers.current[cid];
      held.forEach((o) => routeOffer(cid, o));
      const m = managers.current[cid];
      if (m?.isOpen) resendTo(cid, m);
    } else {
      blocked.current.add(cid);
      for (const o of heldOffers.current[cid] || []) managers.current[cid]?.respond(o.id, false, o);
      delete heldOffers.current[cid];
      removePeer(cid, true);
      flash('Device blocked for this session.');
    }
  }, [updatePeer, routeOffer, resendTo, removePeer, flash]);

  /** Send files to every approved device. `paths` keeps folder structure. */
  const sendFiles = useCallback((files: File[], opts: { paths?: string[]; groupName?: string } = {}) => {
    const targets = vals(peersRef.current).filter((p) => p.approved).map((p) => p.clientId);
    if (!targets.length) {
      flash(Object.keys(peersRef.current).length ? 'Approve the device first.' : 'No device connected yet.');
      return;
    }
    if (!files.length) return;
    const group: GroupInfo | undefined = opts.groupName
      ? { id: rid(), name: opts.groupName, count: files.length, size: files.reduce((a, f) => a + f.size, 0) }
      : undefined;
    files.forEach((file, i) => {
      const id = rid();
      const meta: Partial<FileMeta> = group ? { path: opts.paths?.[i] || file.name, group } : {};
      outgoingFiles.current[id] = { file, meta, targets: new Set(targets) };
      const isMedia = !group && /^(image|video)\//.test(file.type) && file.size < 200 * 1024 * 1024;
      setTransfers((p) => ({
        ...p,
        [id]: {
          id, name: file.name, size: file.size, mime: file.type, path: meta.path, group, isSending: true,
          status: 'offered', progress: 0, bytes: 0, speed: 0, peerIds: targets, samples: [],
          previewUrl: isMedia ? URL.createObjectURL(file) : undefined,
        },
      }));
      for (const cid of targets) managers.current[cid]?.sendFile(file, id, meta);
    });
  }, [flash]);

  const sendText = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return false;
    let sent = false;
    for (const [cid, m] of ents(managers.current)) {
      if (peersRef.current[cid]?.approved && m.isOpen) { m.sendText(t); sent = true; }
    }
    if (!sent) { flash('No approved device connected.'); return false; }
    setMessages((prev) => [{ id: rid(), text: t, isSending: true, timestamp: Date.now() }, ...prev].slice(0, 200));
    return true;
  }, [flash]);

  const manageTransfer = useCallback((task: TransferTask, action: 'pause' | 'resume' | 'cancel') => {
    const ids = task.group && action === 'cancel'
      ? vals(transfersRef.current).filter((t) => t.group?.id === task.group!.id).map((t) => t.id)
      : [task.id];
    for (const id of ids) {
      const t = transfersRef.current[id];
      for (const pid of t?.peerIds || []) managers.current[pid]?.manageTransfer(id, action);
      if (action === 'cancel' && t?.status === 'interrupted') {
        if (!t.isSending) discardPartial(id);
        for (const pid of t.peerIds) {
          const u = peerProgress.current[id]?.[pid];
          if (u) applyUpdate(pid, { ...u, status: 'cancelled', speed: 0 });
        }
      }
    }
  }, [applyUpdate]);

  const dismissTransfer = useCallback((id: string) => {
    setTransfers((p) => {
      const n = { ...p };
      const t = n[id];
      const ids = t?.group ? vals(n).filter((x) => x.group?.id === t.group!.id).map((x) => x.id) : [id];
      for (const k of ids) {
        if (n[k]?.url) URL.revokeObjectURL(n[k].url!);
        if (n[k]?.previewUrl) URL.revokeObjectURL(n[k].previewUrl!);
        delete n[k];
        delete peerProgress.current[k];
        delete outgoingFiles.current[k];
      }
      return n;
    });
  }, []);

  // nearby
  const inviteNearby = useCallback((socketId: string) => {
    if (roomRef.current) {
      invitedSockets.current.add(socketId);
      socketRef.current?.emit('nearby_invite', { to: socketId, roomCode: roomRef.current });
    } else {
      pendingInvite.current = socketId;
      createRoom();
    }
    flash('Invitation sent — waiting for them to accept.');
    setTimeout(() => {
      if (!vals(peersRef.current).some((p) => p.socketId === socketId)) flash('No answer from that device. It may have gone to sleep.');
    }, 30_000);
  }, [createRoom, flash]);

  const answerNearbyInvite = useCallback((accept: boolean) => {
    const inv = nearbyInvite;
    setNearbyInvite(null);
    if (!inv) return;
    if (accept) joinRoom(inv.roomCode);
    else socketRef.current?.emit('nearby_decline', { to: inv.from });
  }, [nearbyInvite, joinRoom]);

  /** Test hook: simulate a dropped direct link to every peer. */
  useEffect(() => {
    (window as any).__relayDebug = {
      dropLinks: () => vals(managers.current).forEach((m) => m.drop()),
      managers: managers.current,
    };
  });

  return {
    clientId, deviceName, socket, appState, roomCode, isHost, passwordEnabled, joinError, needsPassword,
    peers, transfers, offers, messages, nearbyDevices, nearbyInvite, clipboardSync, history, keepHistory, notice,
    totalSpeed,
    createRoom, joinRoom, setRoomPassword, leaveRoom, approvePeer, sendFiles, sendText, manageTransfer,
    dismissTransfer, respondToOffer, acceptAllOffers, inviteNearby, answerNearbyInvite,
    setClipboardSync, clearHistory, setKeepHistory, setJoinError, flash,
  };
}

export type Relay = ReturnType<typeof useRelay>;
