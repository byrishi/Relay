/**
 * Mount the hosted Relay connector (remote MCP, in-chat app only) on an Express app.
 *
 *   import { mountRelayConnector } from './connector';
 *   mountRelayConnector(app, { path: '/mcp', relayServer: 'https://relay.rishishah.in' });
 *
 * Stateless Streamable HTTP: each POST gets a fresh server. The in-chat app runs on the
 * user's device, so this endpoint never handles file contents.
 */
import express, { type Express } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer } from './server';

export interface ConnectorOptions {
  path?: string;
  relayServer?: string;
  viewFile?: string;
}

export function mountRelayConnector(app: Express, opts: ConnectorOptions = {}) {
  const path = opts.path || '/mcp';
  app.post(path, express.json({ limit: '4mb' }), async (req, res) => {
    try {
      const server = await buildServer({ relayServer: opts.relayServer, viewFile: opts.viewFile });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on('close', () => { transport.close(); server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error('[relay-mcp]', e);
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
    }
  });
  const notAllowed = (_req: express.Request, res: express.Response) =>
    res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  app.get(path, notAllowed);
  app.delete(path, notAllowed);
}
