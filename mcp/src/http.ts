/**
 * relay-mcp-http — the hosted connector on its own: Streamable HTTP at /mcp.
 *
 *   PORT=8787 RELAY_URL=https://relay.rishishah.in relay-mcp-http
 */
import express from 'express';
import { mountRelayConnector } from './connector';
import { VERSION } from './server';

const app = express();
app.set('trust proxy', 1);
app.get('/healthz', (_req, res) => res.type('text').send('ok'));
mountRelayConnector(app, { path: '/mcp', relayServer: process.env.RELAY_URL });

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`relay-mcp-http ${VERSION} on :${port}/mcp (Relay server: ${process.env.RELAY_URL || 'https://relay.rishishah.in'})`));
