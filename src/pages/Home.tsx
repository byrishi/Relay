import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, ShieldCheck } from 'lucide-react';
import { useRelay } from '../hooks/useRelay';
import Connected from '../components/relay/Connected';
import Dialog from '../components/Dialog';
import { collectDropped } from '../components/relay/format';
import { takeSharedFiles } from '../lib/share';
import { useDesign } from '../lib/design';
import { Staged, stagedCount } from './home/shared';
import LandingDark from './home/LandingDark';
import LandingLight from './home/LandingLight';
import Lobby from './home/Lobby';

export default function Home() {
  const relay = useRelay();
  const design = useDesign();
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

  const Landing = design === 'light' ? LandingLight : LandingDark;

  return (
    <div className="flex-1 flex flex-col w-full relative"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); if (!e.relatedTarget) setDragging(false); }}>
      <AnimatePresence mode="wait">
        {relay.appState === 'LANDING' && <Landing key={`landing-${design}`} relay={relay} onStage={stage} />}
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
              <button data-autofocus onClick={() => relay.answerNearbyInvite(true)} className="btn btn-w btn-lg flex-1">Connect</button>
              <button onClick={() => relay.answerNearbyInvite(false)} className="btn btn-g btn-lg flex-1">Decline</button>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 inset-x-4 flex justify-center z-[70] pointer-events-none" role="status" aria-live="polite">
        <AnimatePresence>
          {relay.notice && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              className="max-w-full px-4 py-2.5 rounded-xl bg-s3 ring2 text-[14px] text-fg shadow-[0_20px_50px_-12px_rgb(0_0_0/0.5)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-acc shrink-0" aria-hidden="true" />{relay.notice}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {dragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true"
            className="fixed inset-3 z-50 rounded-2xl bg-bg/90 backdrop-blur-md border border-dashed border-acc/60 flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-10 h-10 text-acc" />
            <p className="mt-5 text-[40px] md:text-[56px] font-semibold tracking-[var(--tr-1)]">Drop to send</p>
            <p className="text-[16px] text-fg-2 mt-2">{relay.appState === 'CONNECTED' ? 'Files and folders go straight to the connected device.' : 'You will get a link and QR code for the other device.'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
