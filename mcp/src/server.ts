/**
 * The Relay MCP server definition, shared by the stdio (local) and HTTP (remote) entry points.
 *
 * local  — runs on the user's computer: send_files / transfer_status / stop_sharing read files
 *          from disk, plus the in-chat app.
 * remote — a hosted connector (claude.ai, mobile): only the in-chat app, which runs on the
 *          user's own device inside the chat.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import QRCode from 'qrcode';
import { PUBLIC_SERVER, fmtBytes } from './room';

export const VERSION = '0.2.0';
const APP_URI = 'ui://relay/app.html';
const MAX_INLINE_BYTES = 2 * 1024 * 1024;

let viewCache: string | undefined;
function viewHtml(server: string) {
  if (!viewCache) {
    // dist/view.html, whether this code runs from dist/ or dist/chunks/
    const here = dirname(fileURLToPath(import.meta.url));
    const file = [join(here, 'view.html'), join(here, '..', 'view.html')].find((f) => existsSync(f));
    if (!file) throw new Error('view.html not found; run npm run build');
    viewCache = readFileSync(file, 'utf8');
  }
  return viewCache.replace('<script>/*__RELAY_CONFIG__*/</script>', `<script>window.__RELAY_SERVER__=${JSON.stringify(server)}</script>`);
}

export interface BuildOptions {
  mode: 'local' | 'remote';
  relayServer?: string;
}

export async function buildServer(opts: BuildOptions) {
  const relay = (opts.relayServer || process.env.RELAY_URL || PUBLIC_SERVER).replace(/\/+$/, '');
  const origin = new URL(relay);
  const wss = `${origin.protocol === 'http:' ? 'ws' : 'wss'}://${origin.host}`;
  const server = new McpServer({ name: 'relay', version: VERSION });

  // ── In-chat app ────────────────────────────────────────────────────────────
  registerAppResource(server, 'Relay', APP_URI, { description: 'Move files between this chat and your phone, directly.' }, async () => ({
    contents: [{
      uri: APP_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: viewHtml(relay),
      _meta: { ui: { csp: { connectDomains: [origin.origin, wss] }, prefersBorder: true } },
    }],
  }));

  registerAppTool(server, 'open_relay', {
    title: 'Open Relay',
    description:
      'Open Relay inside the chat to move files between this conversation and the user\'s phone, directly and end-to-end encrypted. ' +
      'It shows a QR code; the user scans it with their phone. Use it when the user wants to send something to their phone, or ' +
      'send a photo or file from their phone into the chat. Text files you write (notes, code, CSV, Markdown, JSON) can be ' +
      'passed in `files` and are offered to the phone. Files the user sends from the phone appear in the panel, where they can ' +
      'save them or add them to the chat.',
    inputSchema: {
      files: z.array(z.object({
        name: z.string().min(1).max(120).describe('File name with extension, e.g. "notes.md"'),
        content: z.string().describe('Full text content of the file'),
        mime_type: z.string().max(100).optional(),
      })).max(20).optional().describe('Text files to offer to the phone'),
    },
    _meta: { ui: { resourceUri: APP_URI } },
  }, async ({ files }) => {
    const size = (files || []).reduce((a, f) => a + new TextEncoder().encode(f.content).byteLength, 0);
    if (size > MAX_INLINE_BYTES) {
      return { isError: true, content: [{ type: 'text', text: `Too much inline content (${fmtBytes(size)}). Keep files passed to open_relay under ${fmtBytes(MAX_INLINE_BYTES)} in total; for larger files use send_files with a path on this computer.` }] };
    }
    const offered = files?.length ? ` It is offering ${files.length} file${files.length > 1 ? 's' : ''} (${files.map((f) => f.name).join(', ')}) to the phone.` : '';
    return {
      content: [{
        type: 'text',
        text: `Relay is open in the chat. The user scans the QR code with their phone (or opens ${relay} and types the code) to connect.${offered} ` +
          'Files the user sends from the phone show up in the panel, where they can save them or add them to the chat. Nothing is uploaded; the transfer is direct and end-to-end encrypted.',
      }],
    };
  });

  if (opts.mode === 'local') await registerLocalTools(server);
  return server;
}

// ── Local tools: send files from this computer ───────────────────────────────
async function registerLocalTools(server: McpServer) {
  const { SendSession, prepareFiles, describe } = await import('./session');
  type S = InstanceType<typeof SendSession>;
  const sessions = new Map<string, S>();
  let latest: S | undefined;
  const pick = (code?: string) => (code ? sessions.get(code.trim().toLowerCase()) : latest);
  const stopAll = () => { for (const s of sessions.values()) s.stop(); };
  process.once('exit', stopAll);

  server.registerTool('send_files', {
    title: 'Send files to a phone or another device',
    description:
      'Send one or more files from this computer straight to the user\'s phone, tablet or another computer with Relay. ' +
      'Nothing is uploaded: the file streams directly between the two devices, encrypted end to end, and any size works. ' +
      'Returns a link, a room code and a QR code. Show the link and code to the user: they open the link (or scan the QR) ' +
      'on the other device, then tap Accept. Then call transfer_status to follow progress. Pass absolute paths.',
    inputSchema: {
      paths: z.array(z.string().min(1)).min(1).max(50).describe('Absolute paths of the files to send'),
      device_name: z.string().max(40).optional().describe('Name the other device sees, e.g. "Rishi\'s MacBook"'),
    },
  }, async ({ paths, device_name }) => {
    try {
      const prepared = await prepareFiles(paths);
      const s = new SendSession(prepared, { deviceName: device_name });
      const code = await s.start();
      sessions.set(code, s);
      latest = s;
      const qr = await QRCode.toDataURL(s.link, { margin: 2, width: 360, color: { dark: '#0E1233', light: '#FFFFFF' } });
      const text = [
        `Ready to send ${prepared.length} file${prepared.length > 1 ? 's' : ''} (${fmtBytes(s.totalBytes)}).`,
        '',
        `Open this on the other device: ${s.link}`,
        `Or go to ${s.server} and enter the room code: ${s.code}`,
        '',
        'The file goes straight from this computer to that device, encrypted end to end. The receiver taps Accept to start.',
        'Tell the user the link and code (the QR code is attached). Then call transfer_status to follow progress.',
      ].join('\n');
      return { content: [{ type: 'text', text }, { type: 'image', data: qr.split(',')[1], mimeType: 'image/png' }] };
    } catch (e: any) {
      return { isError: true, content: [{ type: 'text', text: e?.message || String(e) }] };
    }
  });

  server.registerTool('transfer_status', {
    title: 'Check a Relay transfer',
    description:
      'Progress of a send started with send_files: whether the other device joined, the safety number, and per-file progress. ' +
      'Set wait_seconds to wait for the next change (useful while the user is opening the link).',
    inputSchema: {
      code: z.string().optional().describe('Room code; defaults to the most recent send'),
      wait_seconds: z.number().int().min(0).max(120).optional().describe('Wait up to this long for something to change, or for the transfer to finish'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ code, wait_seconds }) => {
    const s = pick(code);
    if (!s) return { isError: true, content: [{ type: 'text', text: 'No active send. Call send_files first.' }] };
    const key = () => `${s.state}|${s.files.map((f) => f.status).join(',')}`;
    if (wait_seconds && !['done', 'stopped', 'error'].includes(s.state)) {
      const until = Date.now() + wait_seconds * 1000;
      const before = key();
      while (Date.now() < until) {
        await s.waitForChange(until - Date.now());
        if (key() !== before || ['done', 'stopped', 'error'].includes(s.state)) break;
      }
    }
    return { content: [{ type: 'text', text: describe(s) }] };
  });

  server.registerTool('stop_sharing', {
    title: 'Stop a Relay send',
    description: 'Close the room and cancel anything still pending. The link and code stop working.',
    inputSchema: { code: z.string().optional().describe('Room code; defaults to the most recent send') },
    annotations: { destructiveHint: true },
  }, async ({ code }) => {
    const s = pick(code);
    if (!s) return { content: [{ type: 'text', text: 'Nothing to stop.' }] };
    s.stop();
    sessions.delete(s.code);
    if (latest === s) latest = undefined;
    return { content: [{ type: 'text', text: `Stopped. Room ${s.code} is closed.` }] };
  });
}
