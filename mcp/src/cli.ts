/**
 * relay-send — send files from a terminal to a phone or any browser.
 *
 *   npx -p @byrishi/relay-mcp relay-send ./build/app.apk ./notes.pdf
 *
 * Prints a QR code and a room code, then streams the files directly to the device that joins.
 */
import QRCode from 'qrcode';
import { SendSession, prepareFiles, fmtBytes, DEFAULT_SERVER } from './session';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};

if (!args.length || args.includes('-h') || args.includes('--help')) {
  console.log(`relay-send — send files straight to a phone or another device, no upload.

Usage: relay-send <file...> [--server URL] [--name "Device name"]

  --server   Relay server (default ${DEFAULT_SERVER}, or set RELAY_URL)
  --name     Name the other device sees
`);
  process.exit(args.length ? 0 : 1);
}

const server = flag('--server');
const name = flag('--name');
const tty = process.stdout.isTTY;
const dim = (s: string) => (tty ? `\x1b[2m${s}\x1b[0m` : s);
const bold = (s: string) => (tty ? `\x1b[1m${s}\x1b[0m` : s);

async function main() {
  const prepared = await prepareFiles(args);
  let lastLine = '';
  let safetyShown = false;
  const s = new SendSession(prepared, {
    server,
    deviceName: name,
    onChange: (x) => {
      if (x.state === 'stopped') return;
      if (x.safety && !safetyShown) {
        safetyShown = true;
        if (tty) process.stdout.write('\r\x1b[2K');
        console.log(`  Safety number ${bold(x.safety)} ${dim('— check it matches the other screen')}`);
        lastLine = '';
      }
      const pct = x.totalBytes ? Math.floor((x.sentBytes / x.totalBytes) * 100) : 0;
      const speed = x.files.reduce((a, f) => a + f.speed, 0);
      const line =
        x.state === 'waiting' ? 'Waiting for the other device…' :
        x.state === 'connecting' ? `${x.peerName} joined. Connecting…` :
        x.state === 'connected' && x.files.some((f) => f.status === 'offered' || f.status === 'waiting') ? `Connected to ${x.peerName}. Waiting for them to accept…` :
        x.state === 'connected' ? `Sending to ${x.peerName}  ${pct}%  ${fmtBytes(x.sentBytes)} / ${fmtBytes(x.totalBytes)}  ${fmtBytes(speed)}/s` :
        x.state === 'done' ? 'Done.' : x.state;
      if (line === lastLine) return;
      lastLine = line;
      if (tty) process.stdout.write(`\r\x1b[2K${line}`); else console.log(line);
    },
  });
  const code = await s.start();
  const qr = await QRCode.toString(s.link, { type: 'terminal', small: true });
  console.log(`\n${qr}`);
  console.log(`  ${bold('Open on the other device:')} ${s.link}`);
  console.log(`  ${bold('Or enter the code')} ${code} ${dim(`at ${s.server}`)}`);
  console.log(dim(`  ${prepared.length} file(s), ${fmtBytes(s.totalBytes)}. Goes straight to that device, encrypted end to end.\n`));


  process.on('SIGINT', () => { s.stop(); console.log('\nStopped.'); process.exit(130); });
  await s.waitUntilDone();
  if (tty) process.stdout.write('\r\x1b[2K');
  for (const f of s.files) console.log(`  ${f.status === 'completed' ? '✓' : '✗'} ${f.name} ${dim(`${fmtBytes(f.size)} · ${f.status}${f.error ? ` (${f.error})` : ''}`)}`);
  s.stop();
  process.exit(s.files.every((f) => f.status === 'completed') ? 0 : 1);
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
