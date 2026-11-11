/**
 * relay-mcp — local MCP server over stdio (Claude Code, Claude Desktop, any MCP client).
 * Can send files from this computer, and opens Relay inside the chat in hosts that support MCP Apps.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer, VERSION } from './server';
import { registerLocalTools } from './local';

async function main() {
  const server = await buildServer();
  registerLocalTools(server);
  await server.connect(new StdioServerTransport());
  console.error(`relay-mcp ${VERSION} ready (server: ${process.env.RELAY_URL || 'https://relay.rishishah.in'})`);
}

const shutdown = () => process.exit(0);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.stdin.on('close', shutdown);

main().catch((e) => { console.error(e); process.exit(1); });
