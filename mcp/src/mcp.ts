/**
 * Relay MCP server (stdio). Lets an AI agent hand files on this machine to a phone or any
 * browser, directly and end-to-end encrypted. Nothing is uploaded: the file streams from this
 * machine to the device that joins with the room code.
 *
 * Tools
 *   send_files       open a room for one or more local files; returns a link, room code and QR
 *   transfer_status  progress of a send (optionally waits for the next change)
 *   stop_sharing     close a room
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import QRCode from 'qrcode';
import { SendSession, prepareFiles, describe, fmtBytes, DEFAULT_SERVER } from './session';

const VERSION = '0.1.0';
const sessions = new Map<string, SendSession>();
let latest: SendSession | undefined;

const pick = (code?: string) => (code ? sessions.get(code.trim().toLowerCase()) : latest);

const server = new McpServer({ name: 'relay', version: VERSION });

server.registerTool(
  'send_files',
  {
    title: 'Send files to a phone or another device',
    description:
      'Send one or more files from this computer straight to the user\'s phone, tablet or another computer with Relay. ' +
      'Nothing is uploaded: the file streams directly between the two devices, encrypted end to end. ' +
      'Returns a link, a room code and a QR code. Show the link and code to the user: they open the link (or scan the QR) ' +
      'on the other device, then tap Accept. Then call transfer_status to follow progress. ' +
      'Keep the session open until the transfer finishes; files over any size work. Pass absolute paths.',
    inputSchema: {
      paths: z.array(z.string().min(1)).min(1).max(50).describe('Absolute paths of the files to send'),
      device_name: z.string().max(40).optional().describe('Name the other device sees, e.g. "Rishi\'s MacBook"'),
    },
  },
  async ({ paths, device_name }) => {
    try {
      const prepared = await prepareFiles(paths);
      const s = new SendSession(prepared, { deviceName: device_name });
      const code = await s.start();
      sessions.set(code, s);
      latest = s;
      const total = prepared.reduce((a, p) => a + p.file.size, 0);
      const qr = await QRCode.toDataURL(s.link, { margin: 2, width: 360, color: { dark: '#0E1233', light: '#FFFFFF' } });
      const text = [
        `Ready to send ${prepared.length} file${prepared.length > 1 ? 's' : ''} (${fmtBytes(total)}).`,
        ``,
        `Open this on the other device: ${s.link}`,
        `Or go to ${s.server} and enter the room code: ${s.code}`,
        ``,
        `The file goes straight from this computer to that device, encrypted end to end. The receiver taps Accept to start.`,
        `Tell the user the link and code (the QR code is attached). Then call transfer_status to follow progress.`,
      ].join('\n');
      return {
        content: [
          { type: 'text', text },
          { type: 'image', data: qr.split(',')[1], mimeType: 'image/png' },
        ],
      };
    } catch (e: any) {
      return { isError: true, content: [{ type: 'text', text: e?.message || String(e) }] };
    }
  },
);

server.registerTool(
  'transfer_status',
  {
    title: 'Check a Relay transfer',
    description:
      'Progress of a send started with send_files: whether the other device joined, the safety number, and per-file progress. ' +
      'Set wait_seconds to wait for the next change (useful while the user is opening the link).',
    inputSchema: {
      code: z.string().optional().describe('Room code; defaults to the most recent send'),
      wait_seconds: z.number().int().min(0).max(120).optional().describe('Wait up to this long for something to change, or for the transfer to finish'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ code, wait_seconds }) => {
    const s = pick(code);
    if (!s) return { isError: true, content: [{ type: 'text', text: 'No active send. Call send_files first.' }] };
    if (wait_seconds && !['done', 'stopped', 'error'].includes(s.state)) {
      const until = Date.now() + wait_seconds * 1000;
      const before = `${s.state}|${s.files.map((f) => f.status).join(',')}`;
      // wake on a real state change (not every progress tick), finish, or timeout
      while (Date.now() < until) {
        await s.waitForChange(until - Date.now());
        const now = `${s.state}|${s.files.map((f) => f.status).join(',')}`;
        if (now !== before || ['done', 'stopped', 'error'].includes(s.state)) break;
      }
    }
    return { content: [{ type: 'text', text: describe(s) }] };
  },
);

server.registerTool(
  'stop_sharing',
  {
    title: 'Stop a Relay send',
    description: 'Close the room and cancel anything still pending. The link and code stop working.',
    inputSchema: { code: z.string().optional().describe('Room code; defaults to the most recent send') },
    annotations: { destructiveHint: true },
  },
  async ({ code }) => {
    const s = pick(code);
    if (!s) return { content: [{ type: 'text', text: 'Nothing to stop.' }] };
    s.stop();
    sessions.delete(s.code);
    if (latest === s) latest = undefined;
    return { content: [{ type: 'text', text: `Stopped. Room ${s.code} is closed.` }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`relay-mcp ${VERSION} ready (server: ${DEFAULT_SERVER})`);
}

const shutdown = () => { for (const s of sessions.values()) s.stop(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.stdin.on('close', shutdown);

main().catch((e) => { console.error(e); process.exit(1); });
