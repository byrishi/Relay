import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud } from 'lucide-react';
import { useRelay } from '../hooks/useRelay';
import Connected from '../components/relay/Connected';
import Dialog from '../components/Dialog';
import { collectDropped } from '../components/relay/format';
import { takeSharedFiles } from '../lib/share';
import { onSendRequest } from '../lib/send';
import { Staged, stagedCount } from './home/shared';
import Landing from './home/Landing';
import Lobby from './home/Lobby';

export default function Home() {
  const relay = useRelay();
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<Staged>([]);
  const hasApprovedPeer = Object.values(relay.peers).some((p) => p.approved && p.connected);

  const stage = (groups: Staged) => {
    if (!groups.length) return;
    if (relay.appState === 'CONNECTED') {
      groups.forEach((g) => relay.sendFiles(g.files, g.groupName ? { paths: g.paths, groupName: g.groupName } : {}));
      return;
    }
    setStaged((s) => [...s, ...groups]);
    if (relay.appState === 'LANDING') relay.createRoom();
  };
  const stageRef = useRef(stage);
  stageRef.current = stage;

  // The header's Send key opens this picker, whatever screen you're on.
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => onSendRequest(() => picker.current?.click()), []);

  // Files shared to the installed app (PWA share target) are staged like any others.
  useEffect(() => { takeSharedFiles().then((f) => { if (f.length) stageRef.current([{ files: f, paths: [] }]); }); }, []);

  // Staged files go out the moment a device is approved.
  useEffect(() => {
    if (!hasApprovedPeer || !staged.length || relay.appState !== 'CONNECTED') return;
    staged.forEach((g) => relay.sendFiles(g.files, g.groupName ? { paths: g.paths, groupName: g.groupName } : {}));
    relay.flash(`Sending ${stagedCount(staged)} file${stagedCount(staged) > 1 ? 's' : ''}`);
    setStaged([]);
  }, [hasApprovedPeer, staged, relay.appState, relay.sendFiles, relay.flash]);

  // Leaving the room drops anything still staged.
  const prevState = useRef(relay.appState);
  useEffect(() => {
    if (relay.appState === 'LANDING' && prevState.current !== 'LANDING') setStaged([]);
    prevState.current = relay.appState;
  }, [relay.appState]);

  // Paste to send: files (e.g. screenshots) or text
  useEffect(() => {
    if (relay.appState !== 'CONNECTED') return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length) {
        e.preventDefault();
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        relay.sendFiles(files.map((f) => (f.name === 'image.png' || !f.name ? new File([f], `pasted-${stamp}.${(f.type.split('/')[1] || 'bin')}`, { type: f.type }) : f)));
        relay.flash(`Sending ${files.length} pasted file${files.length > 1 ? 's' : ''}`);
        return;
      }
      const text = e.clipboardData?.getData('text/plain');
      if (text?.trim()) { e.preventDefault(); if (relay.sendText(text)) relay.flash('Sent pasted text'); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [relay.appState, relay.sendFiles, relay.sendText, relay.flash]);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!e.dataTransfer.items) return;
    stage(await collectDropped(e.dataTransfer.items));
  };

  return (
    <div className="flex-1 flex flex-col w-full relative"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); if (!e.relatedTarget) setDragging(false); }}>
      <input ref={picker} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="header-send-input"
        onChange={(e) => { if (e.target.files?.length) stageRef.current([{ files: Array.from(e.target.files), paths: [] }]); e.target.value = ''; }} />
      <AnimatePresence mode="wait">
        {relay.appState === 'LANDING' && <Landing key="landing" relay={relay} onStage={stage} />}
        {relay.appState === 'LOBBY' && <Lobby relay={relay} staged={staged} onStage={stage} onClearStaged={() => setStaged([])} />}
        {relay.appState === 'CONNECTED' && (
          <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <Connected relay={relay} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {relay.nearbyInvite && (
          <Dialog title={`${relay.nearbyInvite.name} wants to connect`} testId="nearby-invite" onClose={() => relay.answerNearbyInvite(false)}
            description="A device on your Wi-Fi network is inviting you. Only connect if you recognise it. You'll still choose which files to accept.">
            <div className="flex gap-2">
              <button data-autofocus onClick={() => relay.answerNearbyInvite(true)} className="btn btn-signal h-12 flex-1">Connect</button>
              <button onClick={() => relay.answerNearbyInvite(false)} className="btn btn-line h-12 flex-1">Decline</button>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 inset-x-4 flex justify-center z-[70] pointer-events-none" role="status" aria-live="polite">
        <AnimatePresence>
          {relay.notice && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              className="max-w-full px-5 h-12 rounded-full bg-ink text-white text-[15px] shadow-[0_20px_50px_-12px_rgb(14_18_51/0.5)] flex items-center">
              {relay.notice}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {dragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true"
            className="fixed inset-3 z-[260] rounded-[28px] bg-signal text-white flex flex-col justify-between p-6 md:p-10 pointer-events-none">
            <UploadCloud className="w-8 h-8" />
            <p className="display text-[26vw] md:text-[18vw] leading-[.8]" style={{ ['--w' as string]: 3.4 }}>Let go.</p>
            <p className="text-[18px] text-dev-fg-2 max-w-[40ch]">{relay.appState === 'CONNECTED' ? 'Files and folders go straight to the connected device.' : 'You will get a link and QR code for the other device.'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
