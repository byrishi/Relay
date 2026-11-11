# Relay for AI agents (MCP server, in-chat app and CLI)

Let Claude, or any agent that speaks the [Model Context Protocol](https://modelcontextprotocol.io), hand a file on your computer to your phone. Nothing is uploaded: the file streams straight from your machine to the device that opens the link, encrypted end to end, with the same engine as [relay.rishishah.in](https://relay.rishishah.in).

> "Build the release APK and send it to my phone."
>
> Claude builds it, calls `send_files`, and shows you a link and a QR code. You open it on the phone, tap **Accept**, and the file arrives.

The receiving side is just the Relay website, so the phone needs no app.

In hosts that support [MCP Apps](https://modelcontextprotocol.io/extensions/apps) (Claude on the web, desktop and mobile, ChatGPT, VS Code and others), Relay also opens **inside the chat**: a panel with a QR code. Scan it, and files move straight between the chat and your phone, both ways.

## Install

**Claude Code**

```sh
claude mcp add relay -- npx -y @byrishi/relay-mcp
```

**Claude Desktop**, and other MCP clients that read the same config: add this to `claude_desktop_config.json`, then restart.

```json
{
  "mcpServers": {
    "relay": {
      "command": "npx",
      "args": ["-y", "@byrishi/relay-mcp"]
    }
  }
}
```

It runs on your computer, so it can read the files you point it at. It needs Node.js 20 or newer.

## Tools

| Tool | What it does |
| --- | --- |
| `send_files` | Opens a room for one or more files (absolute paths) and returns a link, a room code and a QR code. |
| `transfer_status` | Says whether the other device joined, shows the safety number and per-file progress. `wait_seconds` waits for the next change. |
| `stop_sharing` | Closes the room; the link and code stop working. |
| `open_relay` | Opens Relay inside the chat (MCP Apps hosts). Text files Claude writes can be passed in `files` and are offered to the phone. Files sent from the phone can be saved or added to the chat. |

## Inside the chat (hosted connector)

The public connector is live at **`https://relay.rishishah.in/mcp`**. In Claude: **Settings → Connectors → Add custom connector**, paste that URL, then ask Claude to "open Relay" or "send this to my phone". It works the same in other MCP Apps hosts.

To host your own (for example in front of a self-hosted Relay server):

```sh
PORT=8787 npx -y -p @byrishi/relay-mcp relay-mcp-http      # serves POST /mcp
```

Or mount it on an existing Express server (this is how relay.rishishah.in serves `/mcp`):

```ts
import { mountRelayConnector } from '@byrishi/relay-mcp/connector';
mountRelayConnector(app, { path: '/mcp', relayServer: 'https://relay.example.com' });
```

Then in Claude: **Settings → Connectors → Add custom connector**, URL `https://your-host/mcp`. Ask Claude to "open Relay" or "send this to my phone".

The connector only exposes `open_relay`. The panel runs on the user's own device inside the chat's sandboxed frame and talks to the Relay server directly, so the connector never sees a file. It declares the Relay server as its only network destination (`connectDomains`). Files Claude passes in `files` must be text and under 2 MB in total; larger files belong to `send_files` on a local install.

What the panel does:

- **Claude → phone**: files from `files` are offered as soon as the phone connects.
- **Phone → chat**: whatever the phone sends arrives in the panel. **Save** downloads it through the host; **Add to chat** puts images and text files (up to 5 MB) into the conversation.
- **This device → phone**: **Add files** picks files from the device the chat is open on.

## From a terminal

The same thing without an agent:

```sh
npx -y -p @byrishi/relay-mcp relay-send ./build/app-release.apk ./notes.pdf
```

It prints a QR code and a room code, shows the safety number once the phone connects, then progress until every file is sent.

## How it works

1. Your machine opens a room on the Relay signaling server and gets a code such as `satya-ganga-108`.
2. The phone opens `https://relay.rishishah.in/?code=…`. The server introduces the two devices and steps aside.
3. They connect directly over WebRTC (DTLS encrypted). If no direct path exists, a TURN relay forwards the encrypted bytes, which it cannot read.
4. Each file is offered first and only streams once the receiver accepts. Interrupted transfers resume.

The server never receives file bytes and stores nothing.

## Security notes

- A room accepts one receiving device: the first one to join with the code. Anyone else is ignored.
- Compare the **safety number** the tool reports with the one on the phone. If they match, nobody in between can read the transfer.
- The room only exists while the server process runs, and closes with `stop_sharing`.
- The receiver can see your IP address, as with any direct connection.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `RELAY_URL` | `https://relay.rishishah.in` | Use your own [self-hosted](../README.md#self-host) Relay server. |
| `PORT` | `8787` | Port for `relay-mcp-http`. |

The CLI also takes `--server URL` and `--name "Device name"`.

## Develop

```sh
cd mcp
npm install
npm run build          # dist/mcp.js, dist/cli.js, dist/http.js and the single-file dist/view.html
node dist/cli.js ./some-file --server http://localhost:3000
```

- `src/room.ts`: one room with one other device, sending and receiving, in Node or the browser. It reuses the transfer engine (`../src/lib/webrtc.ts`) unchanged.
- `src/session.ts`: the Node side (reads files from disk; [node-datachannel](https://github.com/murat-dogan/node-datachannel) provides `RTCPeerConnection`).
- `src/server.ts`: the in-chat app (`open_relay` and its resource); `src/local.ts`: the tools that read local files.
- `src/mcp.ts` (stdio), `src/http.ts` (standalone HTTP) and `src/connector.ts` (mount on Express) are the entry points.
- `src/view/`: the in-chat panel, bundled into one HTML file.
