import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Flashlight, Keyboard } from 'lucide-react';
import { RelayMark } from '../brand/Logo';
import { setScrollLock } from '../lib/scroll';

/** Pull a room code out of whatever the QR holds: a Relay link (?code=…) or a bare code. */
export function codeFromQr(text: string): string | null {
  const t = text.trim();
  try {
    const u = new URL(t);
    const c = u.searchParams.get('code');
    if (c) return c.toLowerCase();
  } catch { /* not a URL */ }
  return /^[a-z]+-[a-z]+-\d{3}$/i.test(t) ? t.toLowerCase() : null;
}

type Phase = 'starting' | 'scanning' | 'found' | 'denied' | 'nocamera' | 'notrelay';

/**
 * Relay's own QR scanner for phones and tablets: the camera fills the screen,
 * the ultramarine sheet frames a square viewfinder, and a pale line sweeps it.
 * Uses the browser's BarcodeDetector where it exists and jsQR (loaded only
 * here) everywhere else, including iPhone Safari.
 */
export default function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('starting');
  const [found, setFound] = useState('');
  const [torch, setTorch] = useState<boolean | null>(null); // null = not supported
  const stream = useRef<MediaStream | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Keep the latest callbacks without restarting the camera on every parent render.
  const cb = useRef({ onCode, onClose });
  cb.current = { onCode, onClose };

  useEffect(() => {
    setScrollLock(true);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cb.current.onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { setScrollLock(false); window.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => {
    let stop = false, raf = 0, lastText = '', lastAt = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setPhase('nocamera'); return; }
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch (e) {
        setPhase((e as DOMException)?.name === 'NotFoundError' ? 'nocamera' : 'denied');
        return;
      }
      if (stop) { stream.current.getTracks().forEach((t) => t.stop()); return; }
      const v = video.current!;
      v.srcObject = stream.current;
      await v.play().catch(() => {});
      const track = stream.current.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() || {}) as MediaTrackCapabilities & { torch?: boolean };
      if (caps.torch) setTorch(false);
      setPhase('scanning');

      // Prefer the browser's own detector; fall back to jsQR.
      type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
      let detector: Detector | null = null;
      const BD = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
      if (BD) {
        try { if (!BD.getSupportedFormats || (await BD.getSupportedFormats()).includes('qr_code')) detector = new BD({ formats: ['qr_code'] }); } catch { detector = null; }
      }
      const jsQR = detector ? null : (await import('jsqr')).default;

      let busy = false, tick = 0;
      const loop = async () => {
        if (stop) return;
        raf = requestAnimationFrame(loop);
        if (busy || ++tick % 3 || v.readyState < 2) return; // ~20 checks a second
        busy = true;
        try {
          let text = '';
          if (detector) {
            const r = await detector.detect(v);
            text = r[0]?.rawValue || '';
          } else if (jsQR && ctx) {
            const w = 640, h = Math.round((v.videoHeight / v.videoWidth) * w) || 360;
            canvas.width = w; canvas.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            text = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data || '';
          }
          if (text) {
            const code = codeFromQr(text);
            if (code) {
              stop = true;
              navigator.vibrate?.(35);
              setFound(code);
              setPhase('found');
              setTimeout(() => cb.current.onCode(code), 650);
            } else if (text !== lastText || Date.now() - lastAt > 3000) {
              lastText = text; lastAt = Date.now();
              setPhase('notrelay');
              setTimeout(() => setPhase((p) => (p === 'notrelay' ? 'scanning' : p)), 2200);
            }
          }
        } catch { /* a frame failed; try the next one */ }
        busy = false;
      };
      loop();
    })();

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0];
    if (!track || torch === null) return;
    try { await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] }); setTorch(!torch); } catch { setTorch(null); }
  };

  const message = {
    starting: 'Starting the camera…',
    scanning: 'Point at the QR code on the other device',
    found: `Joining ${found}`,
    denied: 'Camera access is off. Allow it in your browser settings, or type the code instead.',
    nocamera: 'No camera found on this device. Type the code instead.',
    notrelay: "That isn't a Relay QR code. Try the one on the other device's screen.",
  }[phase];
  const live = phase === 'scanning' || phase === 'found' || phase === 'notrelay' || phase === 'starting';

  return createPortal(
    <motion.div role="dialog" aria-modal="true" aria-label="Scan a QR code to join" className="fixed inset-0 z-[450] bg-signal text-white overflow-hidden"
      initial={{ clipPath: 'inset(100% 0 0 0)' }} animate={{ clipPath: 'inset(0% 0 0 0)' }} exit={{ clipPath: 'inset(100% 0 0 0)' }}
      transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}>
      <video ref={video} playsInline muted className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${phase === 'scanning' || phase === 'found' || phase === 'notrelay' ? 'opacity-100' : 'opacity-0'}`} />

      {/* the sheet, with a square window cut out of it */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[min(74vw,340px)] aspect-square rounded-[28px] shadow-[0_0_0_200vmax_rgb(22_49_224/0.88)]">
          {(['left-0 top-0 border-l-4 border-t-4 rounded-tl-[28px]', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-[28px]', 'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-[28px]', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-[28px]'] as const).map((c) => (
            <span key={c} className={`absolute w-12 h-12 border-white transition-colors ${phase === 'found' ? 'border-[#9CF5BC]' : ''} ${c}`} />
          ))}
          {live && phase !== 'found' && <span className="scan-line absolute left-4 right-4 h-[3px] rounded-full bg-[#8FA0FF] shadow-[0_0_24px_4px_rgb(143_160_255/.7)]" />}
          {phase === 'found' && <motion.span className="absolute inset-0 rounded-[28px] bg-white" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />}
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 px-4 pt-[max(16px,env(safe-area-inset-top))] flex items-center justify-between">
        <span className="flex items-center gap-2.5 font-bold text-[20px] tracking-[-0.03em]"><RelayMark className="h-5 w-auto" ink="#fff" />Scan to join</span>
        <button ref={closeRef} onClick={onClose} aria-label="Close scanner" className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center"><X className="w-5 h-5" /></button>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-[max(24px,env(safe-area-inset-bottom))] flex flex-col items-center gap-5 text-center">
        <p className="max-w-[30ch] text-[17px] leading-snug" role="status" aria-live="polite">{message}</p>
        <div className="flex gap-3">
          {torch !== null && (
            <button onClick={toggleTorch} aria-pressed={torch} className={`key ${torch ? 'key-signal' : 'key-dark'}`}><Flashlight className="w-5 h-5" aria-hidden="true" />Light</button>
          )}
          <button onClick={onClose} className="key key-dark"><Keyboard className="w-5 h-5" aria-hidden="true" />Type the code</button>
        </div>
      </div>
    </motion.div>,
    document.body,
  );
}
