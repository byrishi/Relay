/**
 * The Relay MCP server definition, shared by the stdio (local) and HTTP (remote) entry points.
 *
 * buildServer() registers the in-chat app (open_relay). The stdio entry adds the local tools
 * (local.ts), which read files from disk; a hosted connector exposes only the app, which runs
 * on the user's own device inside the chat.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { PUBLIC_SERVER, fmtBytes } from './util';

export const VERSION = '0.2.0';
const APP_URI = 'ui://relay/app.html';
const MAX_INLINE_BYTES = 2 * 1024 * 1024;

const viewCache = new Map<string, string>();
/** The built single-file view (dist/view.html). Hosts that bundle this code can pass its path. */
function loadView(file?: string) {
  const candidates = file ? [file] : (() => {
    // dist/view.html, whether this runs from dist/ or dist/chunks/ (ESM builds only)
    const url = typeof import.meta !== 'undefined' ? import.meta.url : undefined;
    const here = url ? dirname(fileURLToPath(url)) : process.cwd();
    return [join(here, 'view.html'), join(here, '..', 'view.html')];
  })();
  const found = candidates.find((f) => existsSync(f));
  if (!found) throw new Error(`Relay view not found (${candidates.join(', ')}); run the mcp build`);
  if (!viewCache.has(found)) viewCache.set(found, readFileSync(found, 'utf8'));
  return viewCache.get(found)!;
}

export interface BuildOptions {
  relayServer?: string;
  /** Path to the built view.html; defaults to the one next to this file. */
  viewFile?: string;
}

export async function buildServer(opts: BuildOptions = {}) {
  const relay = (opts.relayServer || process.env.RELAY_URL || PUBLIC_SERVER).replace(/\/+$/, '');
  const origin = new URL(relay);
  const wss = `${origin.protocol === 'http:' ? 'ws' : 'wss'}://${origin.host}`;
  const server = new McpServer({ name: 'relay', version: VERSION });

  // ── In-chat app ────────────────────────────────────────────────────────────
  registerAppResource(server, 'Relay', APP_URI, { description: 'Move files between this chat and your phone, directly.' }, async () => ({
    contents: [{
      uri: APP_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: loadView(opts.viewFile).replace('<script>/*__RELAY_CONFIG__*/</script>', `<script>window.__RELAY_SERVER__=${JSON.stringify(relay)}</script>`),
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

  return server;
}
