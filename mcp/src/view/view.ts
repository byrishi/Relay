/**
 * Relay inside the chat (MCP Apps view).
 *
 * Runs in the host's sandboxed frame on the user's own device. It opens a Relay room and
 * shows a QR code; the user's phone joins, and files move directly between this device
 * and the phone over WebRTC. Files Claude wrote (passed as tool input) are offered to the
 * phone; files the phone sends arrive here and can be saved or added to the chat.
 */
import { App } from '@modelcontextprotocol/ext-apps';
import QRCode from 'qrcode';
import { RelayRoom, fmtBytes, isTerminal, PUBLIC_SERVER, type Item } from '../room';

const SERVER: string = (globalThis as any).__RELAY_SERVER__ || PUBLIC_SERVER;
const MAX_CONTEXT_BYTES = 5 * 1024 * 1024;

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// ── connection diagnostics ──────────────────────────────────────────────────
// Wraps RTCPeerConnection to count ICE candidates and track states, so the panel can say
// exactly where a connection stalls (shown under "Connection details").
const diag = {
  webrtc: typeof (globalThis as any).RTCPeerConnection === 'function' ? 'available' : 'missing',
  error: '',
  local: {} as Record<string, number>,
  remote: 0,
  gathering: '',
  ice: '',
  conn: '',
  mdns: 0,
  iceErrors: [] as string[],
  csp: [] as string[],
};
// The host's Content Security Policy can block requests or features; note what it blocks.
addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
  const v = `${e.effectiveDirective || e.violatedDirective} ${String(e.blockedURI || '').slice(0, 60)}`.trim();
  if (diag.csp.length < 8 && !diag.csp.includes(v)) { diag.csp.push(v); schedule(); }
});
const NativePC = (globalThis as any).RTCPeerConnection;
if (NativePC) {
  class TrackedPC extends NativePC {
    constructor(cfg?: RTCConfiguration) {
      try { super(cfg); } catch (e: any) { diag.error = e?.message || String(e); schedule(); throw e; }
      const pc = this as unknown as RTCPeerConnection;
      pc.addEventListener('icecandidate', (e: any) => {
        const c = e.candidate?.candidate || '';
        const t = / typ (\w+)/.exec(c)?.[1];
        if (t) diag.local[t] = (diag.local[t] || 0) + 1;
        if (/\.local /.test(c)) diag.mdns++;
        schedule();
      });
      pc.addEventListener('icegatheringstatechange', () => { diag.gathering = pc.iceGatheringState; schedule(); });
      pc.addEventListener('iceconnectionstatechange', () => { diag.ice = pc.iceConnectionState; schedule(); });
      pc.addEventListener('connectionstatechange', () => { diag.conn = pc.connectionState; schedule(); });
      pc.addEventListener('icecandidateerror', (e: any) => {
        const v = `${e.errorCode || ''} ${String(e.url || '').replace(/\?.*$/, '')}`.trim();
        if (diag.iceErrors.length < 6 && !diag.iceErrors.includes(v)) diag.iceErrors.push(v);
      });
    }
    addIceCandidate(...args: any[]) { diag.remote++; schedule(); return (super.addIceCandidate as any)(...args); }
  }
  (globalThis as any).RTCPeerConnection = TrackedPC;
}
const SLOW_MS = 12_000;
setInterval(() => { if (room.state === 'connecting') schedule(); }, 2000);

const app = new App({ name: 'Relay', version: '0.2.0' }, {}, { autoResize: true });
const room = new RelayRoom({ server: SERVER, deviceName: 'Relay in chat', acceptIncoming: true, onChange: () => schedule() });
const added = new Set<string>(); // received items already added to the chat
let qrFor = '';
let renderQueued = false;
let fatal = '';

function schedule() {
  if (renderQueued) return;
  renderQueued = true;
  // a timer, not requestAnimationFrame: rAF pauses in background tabs and off-screen frames
  setTimeout(() => { renderQueued = false; render(); }, 60);
}

// ── tool input: files Claude wants to hand over ─────────────────────────────
interface InFile { name?: string; content?: string; mime_type?: string }
const seenInputs = new Set<string>();
function takeFiles(args: any) {
  const list: InFile[] = Array.isArray(args?.files) ? args.files : [];
  const files: File[] = [];
  for (const f of list) {
    if (typeof f?.content !== 'string') continue;
    const name = String(f.name || 'note.txt').replace(/[\\/]/g, '_').slice(0, 120);
    const key = `${name}:${f.content.length}:${f.content.slice(0, 64)}`;
    if (seenInputs.has(key)) continue; // partial + final input deliver the same files
    seenInputs.add(key);
    files.push(new File([f.content], name, { type: f.mime_type || guessMime(name) }));
  }
  if (files.length) room.addFiles(files);
}
const guessMime = (n: string) => ({ md: 'text/markdown', csv: 'text/csv', json: 'application/json', html: 'text/html', svg: 'image/svg+xml', js: 'text/javascript', ts: 'text/plain', py: 'text/x-python' } as Record<string, string>)[n.split('.').pop()?.toLowerCase() || ''] || 'text/plain';

app.ontoolinput = (p) => takeFiles(p.arguments);
app.onhostcontextchanged = () => applyTheme();

function applyTheme() {
  const theme = app.getHostContext()?.theme;
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : '';
}

// ── actions ──────────────────────────────────────────────────────────────────
async function blobToBase64(b: Blob) {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function save(it: Item) {
  if (!it.blob) return;
  if (app.getHostCapabilities()?.downloadFile) {
    const blob = await blobToBase64(it.blob);
    const r = await app.downloadFile({ contents: [{ type: 'resource', resource: { uri: `file:///${encodeURIComponent(it.name)}`, mimeType: it.mime, blob } }] }).catch(() => ({ isError: true }));
    if (!r.isError) return;
  }
  const a = document.createElement('a'); // fallback when the host has no download bridge
  a.href = URL.createObjectURL(it.blob);
  a.download = it.name;
  a.click();
}

const isTextual = (it: Item) => /^text\/|json|xml|csv|markdown|javascript/.test(it.mime) || /\.(txt|md|csv|json|log|ya?ml|xml|html?|js|ts|py|sql)$/i.test(it.name);
const isImage = (it: Item) => /^image\/(png|jpe?g|gif|webp)$/.test(it.mime);
const canAddToChat = (it: Item) => !!it.blob && it.size <= MAX_CONTEXT_BYTES && (isTextual(it) || isImage(it)) && !!app.getHostCapabilities()?.updateModelContext;

async function addToChat(it: Item) {
  if (!it.blob) return;
  const content: any[] = [{ type: 'text', text: `The user sent "${it.name}" (${fmtBytes(it.size)}) from ${room.peerName || 'their phone'} with Relay.` }];
  if (isImage(it)) content.push({ type: 'image', data: await blobToBase64(it.blob), mimeType: it.mime });
  else content.push({ type: 'text', text: (await it.blob.text()).slice(0, 200_000) });
  try {
    await app.updateModelContext({ content });
    added.add(it.id);
  } catch { /* host refused */ }
  render();
}

function pickFiles() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.onchange = () => { if (input.files?.length) room.addFiles([...input.files]); };
  input.click();
}

// ── anonymous connection report ─────────────────────────────────────────────
// When a connection fails (or finally works), send the counts above to the Relay server so
// connection problems inside chat apps can be fixed. No addresses, names or file details.
const sent = new Set<string>();
function report() {
  const failed = room.state === 'connecting' && (diag.ice === 'failed' || diag.conn === 'failed');
  const kind = room.state === 'connected' ? 'connected' : failed ? 'failed' : slow() ? 'slow' : room.state === 'error' ? 'error' : '';
  if (!kind || sent.has(kind)) return;
  sent.add(kind);
  const body = JSON.stringify({
    kind, v: 2, ua: navigator.userAgent.slice(0, 200), secure: !!globalThis.isSecureContext,
    online: room.online, webrtc: diag.webrtc, error: diag.error || room.error, local: diag.local, mdns: diag.mdns,
    remote: diag.remote, gathering: diag.gathering, ice: diag.ice, conn: diag.conn,
    iceErrors: diag.iceErrors, csp: diag.csp, route: room.route?.route || '',
    ms: room.joinedAt ? Date.now() - room.joinedAt : 0,
  });
  fetch(`${room.server}/api/diag`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

// ── render ───────────────────────────────────────────────────────────────────
const slow = () => room.state === 'connecting' && room.joinedAt > 0 && Date.now() - room.joinedAt > SLOW_MS;

function statusText() {
  if (fatal) return fatal;
  switch (room.state) {
    case 'starting': return 'Opening a room…';
    case 'waiting': return 'Waiting for your phone';
    case 'connecting': return slow() ? 'Can\'t connect directly' : `${room.peerName} joined · connecting`;
    case 'connected': return `Connected to ${room.peerName}`;
    case 'stopped': return 'Closed';
    case 'error': return room.error || 'Something went wrong';
  }
}

function itemLabel(it: Item) {
  const pct = it.size ? Math.floor((it.bytes / it.size) * 100) : 100;
  switch (it.status) {
    case 'waiting': return room.connected ? 'Offering…' : 'Ready when your phone joins';
    case 'offered': return 'Tap Accept on the phone';
    case 'queued': return 'Queued';
    case 'transferring': return `${pct}% · ${fmtBytes(it.speed)}/s`;
    case 'paused': return `Paused at ${pct}%`;
    case 'interrupted': return `Reconnecting at ${pct}%`;
    case 'completed': return it.direction === 'send' ? 'Sent' : added.has(it.id) ? 'Received · added to chat' : 'Received';
    case 'declined': return 'Declined on the phone';
    case 'cancelled': return 'Cancelled';
    case 'failed': return it.error || 'Failed';
  }
}

async function render() {
  $('#status').textContent = statusText();
  $('#status').dataset.state = fatal ? 'error' : room.state;
  $('#join').hidden = room.state !== 'waiting' || !room.code;
  $('#joining').hidden = room.state !== 'connecting';
  if (room.state === 'connecting') {
    $('#joining-title').textContent = slow() ? `${room.peerName} joined, but a direct connection didn't form` : `${room.peerName} joined. Connecting…`;
    $('#joining-hint').textContent = slow()
      ? (diag.webrtc !== 'available' || diag.error
        ? 'This chat app blocks direct connections. Open Relay in a browser tab instead.'
        : 'Some networks and chat apps block direct connections. Open Relay in a browser tab on this device and your phone will connect to that instead.')
      : 'Setting up an encrypted, direct connection.';
    $('#joining-open').hidden = !slow();
    if (slow()) ($('#diag') as HTMLDetailsElement).open = true;
  }
  const L = diag.local;
  $('#diag-body').textContent = [
    `Signaling: ${room.online ? 'connected' : 'not connected'} (${room.server.replace(/^https?:\/\//, '')})`,
    `Room: ${room.code || '—'} · state ${room.state}${room.error ? ` · ${room.error}` : ''}`,
    `Other device: ${room.peerName || 'not joined'}`,
    `WebRTC: ${diag.webrtc}${diag.error ? ` · error: ${diag.error}` : ''}`,
    `Candidates here: host ${L.host || 0} · srflx ${L.srflx || 0} · relay ${L.relay || 0}${L.prflx ? ` · prflx ${L.prflx}` : ''} · from other device: ${diag.remote}`,
    `ICE: gathering ${diag.gathering || '—'} · ${diag.ice || '—'} · connection ${diag.conn || '—'}`,
    ...(diag.iceErrors.length ? [`ICE errors: ${diag.iceErrors.join(', ')}`] : []),
    ...(diag.csp.length ? [`Blocked by the host: ${diag.csp.join(', ')}`] : []),
  ].join('\n');
  report();
  $('#peer').hidden = !room.connected;

  if (room.code && qrFor !== room.link) {
    qrFor = room.link;
    $('#code').textContent = room.code;
    ($('#qr') as HTMLImageElement).src = await QRCode.toDataURL(room.link, { margin: 1, width: 280, color: { dark: '#0E1233', light: '#FFFFFF' } });
    $('#host').textContent = room.server.replace(/^https?:\/\//, '');
  }
  if (room.connected) {
    $('#peer-name').textContent = room.peerName;
    $('#safety').textContent = room.safety || '…';
    const r = room.route?.route;
    $('#route').textContent = r === 'lan' ? 'Same network' : r === 'relay' ? 'Via relay, still encrypted' : 'Direct';
  }

  const list = $('#items');
  list.replaceChildren();
  for (const it of room.items) {
    const row = el('div', `item ${it.status}`);
    const icon = el('span', 'dir', it.direction === 'send' ? '↑' : '↓');
    icon.setAttribute('aria-label', it.direction === 'send' ? 'Sending' : 'Receiving');
    const main = el('div', 'main');
    const top = el('div', 'top');
    top.append(el('span', 'name', it.name), el('span', 'size', fmtBytes(it.size)));
    const bar = el('div', 'bar');
    const fill = el('i');
    fill.style.width = `${it.size ? Math.min(100, (it.bytes / it.size) * 100) : 0}%`;
    bar.append(fill);
    main.append(top, bar, el('div', 'label', itemLabel(it)));
    row.append(icon, main);
    const actions = el('div', 'actions');
    if (it.direction === 'receive' && it.status === 'completed' && it.blob) {
      const s = el('button', 'btn', 'Save');
      s.onclick = () => save(it);
      actions.append(s);
      if (canAddToChat(it) && !added.has(it.id)) {
        const c = el('button', 'btn primary', 'Add to chat');
        c.onclick = () => addToChat(it);
        actions.append(c);
      }
    } else if (!isTerminal(it.status) && it.status !== 'waiting') {
      const x = el('button', 'btn ghost', 'Cancel');
      x.onclick = () => room.cancel(it.id);
      actions.append(x);
    }
    row.append(actions);
    list.append(row);
  }
  $('#empty').hidden = room.items.length > 0 || !room.connected;
  ($('#add') as HTMLButtonElement).disabled = room.state === 'stopped' || room.state === 'error';
}

$('#add').onclick = pickFiles;
// Open the same room in a normal browser tab on this device; the phone connects to that tab directly.
$('#joining-open').onclick = () => {
  if (!room.link) return;
  const url = room.link;
  app.openLink({ url }).catch(() => window.open(url, '_blank'));
};
$('#close').onclick = () => { room.stop(); render(); };
render();

// Open the room right away; the host handshake runs alongside it.
room.start().catch((e: any) => { fatal = e?.message || 'Could not open a room'; render(); });
app.connect().then(() => { applyTheme(); render(); }).catch(() => { /* outside a host: still usable */ });
addEventListener('pagehide', () => room.stop());
