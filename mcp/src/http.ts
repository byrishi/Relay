/**
 * relay-mcp-http — the hosted connector: Streamable HTTP at /mcp, stateless.
 * Add its URL as a custom connector in Claude (or any MCP Apps host) to open Relay in the chat.
 *
 *   PORT=8787 RELAY_URL=https://relay.rishishah.in relay-mcp-http
 *
 * Only the in-chat app is exposed: it runs on the user's device, so this server never sees files.
 */
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer, VERSION } from './server';

const app = express();
app.use(express.json({ limit: '4mb' }));

app.get('/healthz', (_req, res) => res.type('text').send('ok'));

app.post('/mcp', async (req, res) => {
  try {
    const server = await buildServer({ mode: 'remote' });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
  }
});

// Stateless server: no SSE stream or session to resume.
const notAllowed = (_req: express.Request, res: express.Response) =>
  res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
app.get('/mcp', notAllowed);
app.delete('/mcp', notAllowed);

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`relay-mcp-http ${VERSION} on :${port}/mcp (Relay server: ${process.env.RELAY_URL || 'https://relay.rishishah.in'})`));
