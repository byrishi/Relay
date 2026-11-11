# Relay for AI agents (MCP server and CLI)

Let Claude, or any agent that speaks the [Model Context Protocol](https://modelcontextprotocol.io), hand a file on your computer to your phone. Nothing is uploaded: the file streams straight from your machine to the device that opens the link, encrypted end to end, with the same engine as [relay.rishishah.in](https://relay.rishishah.in).

> "Build the release APK and send it to my phone."
>
> Claude builds it, calls `send_files`, and shows you a link and a QR code. You open it on the phone, tap **Accept**, and the file arrives.

The receiving side is just the Relay website, so the phone needs no app.

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

The CLI also takes `--server URL` and `--name "Device name"`.

## Develop

```sh
cd mcp
npm install
npm run build          # dist/mcp.js and dist/cli.js
node dist/cli.js ./some-file --server http://localhost:3000
```

`src/session.ts` reuses the browser transfer engine (`../src/lib/webrtc.ts`) unchanged, with [node-datachannel](https://github.com/murat-dogan/node-datachannel) providing `RTCPeerConnection` in Node.
