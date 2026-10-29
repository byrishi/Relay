import { useState } from 'react';
import { useRelay, Peer, TransferTask, Relay } from '../hooks/useRelay';

/**
 * A deliberately plain reference client for the Relay engine.
 * It shows every step of a transfer (create or join a room, approve a device,
 * compare the safety number, send, accept, save) with no styling of its own,
 * so you can build your own interface on top of `useRelay`.
 */

const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${u[i]}`;
};

function Landing({ relay }: { relay: Relay }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="stack">
      <section className="card" aria-labelledby="create-h">
        <h2 id="create-h">Send</h2>
        <p className="muted">Create a room, then share its code or link with the other device.</p>
        <button className="primary" onClick={relay.createRoom}>Create a room</button>
      </section>
      <section className="card" aria-labelledby="join-h">
        <h2 id="join-h">Receive</h2>
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (code.trim()) relay.joinRoom(code.trim(), password || undefined); }}>
          <label className="row">Room code
            <input type="text" value={code} onChange={(e) => { setCode(e.target.value); relay.setJoinError(''); }}
              autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="satya-ganga-108" />
          </label>
          {relay.needsPassword && (
            <label className="row">Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          <button className="primary" type="submit" disabled={!code.trim()}>Join</button>
        </form>
        {relay.joinError && <p className="error" role="alert">{relay.joinError}</p>}
      </section>
    </div>
  );
}

function Lobby({ relay }: { relay: Relay }) {
  const [copied, setCopied] = useState(false);
  const [pw, setPw] = useState('');
  const link = `${window.location.origin}/?code=${relay.roomCode}`;
  const copy = () => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <section className="card" aria-labelledby="lobby-h">
      <h2 id="lobby-h">Waiting for the other device</h2>
      <p className="muted">Open this link on the other device, or enter the code there. You approve it before anything is sent.</p>
      <p className="mono code" data-testid="room-code">{relay.roomCode || 'Creating…'}</p>
      <div className="row">
        <button className="primary" onClick={copy} disabled={!relay.roomCode}>{copied ? 'Copied' : 'Copy link'}</button>
        <button onClick={relay.leaveRoom}>Cancel</button>
      </div>
      {relay.isHost && (
        <form className="row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); relay.setRoomPassword(pw); setPw(''); }}>
          <label className="row">Room password (optional)
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <button type="submit" disabled={!pw}>Set</button>
          {relay.passwordEnabled && <button type="button" onClick={() => relay.setRoomPassword('')}>Remove</button>}
        </form>
      )}
    </section>
  );
}

function Devices({ relay }: { relay: Relay }) {
  const peers = Object.values(relay.peers) as Peer[];
  return (
    <section className="card" aria-labelledby="dev-h">
      <h2 id="dev-h">Devices</h2>
      <ul className="list">
        {peers.map((p) => (
          <li key={p.clientId}>
            <strong>{p.name}</strong>{' '}
            <span className="muted">
              {p.approved === undefined ? 'waiting for you' : p.approved === false ? 'blocked' : p.connected ? 'connected' : 'reconnecting…'}
            </span>
            {p.approved === undefined && (
              <div className="row" style={{ marginTop: 8 }}>
                <button className="primary" onClick={() => relay.approvePeer(p.clientId, true)}>Allow</button>
                <button className="danger" onClick={() => relay.approvePeer(p.clientId, false)}>Block</button>
              </div>
            )}
            {p.safety && (
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Safety number <code>{p.safety}</code>. It must match on both screens; if it does, nobody is in the middle.
              </p>
            )}
          </li>
        ))}
        {!peers.length && <li className="muted">No other device yet.</li>}
      </ul>
    </section>
  );
}

function Offers({ relay }: { relay: Relay }) {
  if (!relay.offers.length) return null;
  return (
    <section className="card" aria-labelledby="off-h">
      <h2 id="off-h">Incoming files</h2>
      <ul className="list">
        {relay.offers.map((o) => (
          <li key={o.id}>
            <strong>{o.peerName}</strong> wants to send <strong>{o.name}</strong> ({formatBytes(o.size)})
            <div className="row" style={{ marginTop: 8 }}>
              <button className="primary" onClick={() => relay.respondToOffer(o.id, 'accept')}>Accept</button>
              <button className="danger" onClick={() => relay.respondToOffer(o.id, 'decline')}>Decline</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Transfer({ t, relay }: { t: TransferTask; relay: Relay }) {
  const live = t.status === 'transferring' || t.status === 'paused' || t.status === 'queued' || t.status === 'interrupted';
  return (
    <li>
      <div><strong>{t.name}</strong> <span className="muted">{t.isSending ? 'sending' : 'receiving'}, {formatBytes(t.size)}</span></div>
      <progress value={t.progress} max={100} aria-label={`${t.name} progress`} />
      <div className="muted">
        {t.status}{t.status === 'transferring' && t.speed ? `, ${formatBytes(t.speed)}/s` : ''}{t.error ? `: ${t.error}` : ''}
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        {t.status === 'transferring' && <button onClick={() => relay.manageTransfer(t, 'pause')}>Pause</button>}
        {t.status === 'paused' && <button onClick={() => relay.manageTransfer(t, 'resume')}>Resume</button>}
        {live && <button className="danger" onClick={() => relay.manageTransfer(t, 'cancel')}>Cancel</button>}
        {!t.isSending && t.status === 'completed' && t.url && <a className="button" href={t.url} download={t.name}>Save</a>}
        {!live && <button onClick={() => relay.dismissTransfer(t.id)}>Dismiss</button>}
      </div>
    </li>
  );
}

function Connected({ relay }: { relay: Relay }) {
  const transfers = (Object.values(relay.transfers) as TransferTask[]).reverse();
  return (
    <div className="stack">
      <Devices relay={relay} />
      <Offers relay={relay} />
      <section className="card" aria-labelledby="send-h">
        <h2 id="send-h">Send files</h2>
        <input type="file" multiple aria-label="Choose files to send" data-testid="file-input"
          onChange={(e) => { if (e.target.files?.length) relay.sendFiles(Array.from(e.target.files)); e.target.value = ''; }} />
      </section>
      <section className="card" aria-labelledby="tr-h">
        <h2 id="tr-h">Transfers</h2>
        <ul className="list">
          {transfers.map((t) => <Transfer key={t.id} t={t} relay={relay} />)}
          {!transfers.length && <li className="muted">Nothing yet.</li>}
        </ul>
      </section>
      <div><button onClick={relay.leaveRoom}>Leave room</button></div>
    </div>
  );
}

export default function App() {
  const relay = useRelay();
  return (
    <main>
      <h1>Relay</h1>
      <p className="muted">Send files straight to another device. Peer to peer, encrypted, nothing uploaded.</p>
      {relay.notice && <p role="status" className="ok">{relay.notice}</p>}
      {relay.appState === 'LANDING' && <Landing relay={relay} />}
      {relay.appState === 'LOBBY' && <Lobby relay={relay} />}
      {relay.appState === 'CONNECTED' && <Connected relay={relay} />}
    </main>
  );
}
