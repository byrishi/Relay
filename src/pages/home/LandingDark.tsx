import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { AppWindow, Bar, CompareTable, Faq, LandingProps, PathDiagram, SafetyVisual } from './shared';

const H2 = 'text-[34px] md:text-[52px] font-semibold tracking-[var(--tr-1)] leading-[1.05] text-balance';
const SECTION = 'max-w-[1200px] mx-auto px-5 md:px-6 pt-24 md:pt-44';
const Kick = ({ children }: { children: React.ReactNode }) => <p className="text-[14px] font-medium text-acc">{children}</p>;

function SizeVisual() {
  return (
    <div className="w-full" aria-hidden="true">
      <p className="text-[52px] md:text-[64px] font-semibold tracking-[-0.05em] leading-none">No limit</p>
      <div className="mt-6 rounded-xl ring2 bg-tint/[0.02] p-3.5 flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-tint/[0.06] flex items-center justify-center text-[10px] font-semibold text-fg-2 shrink-0">MOV</span>
        <span className="flex-1 min-w-0">
          <span className="flex justify-between text-[13px]"><span className="truncate">Wedding_Final_4K.mov</span><span className="text-fg-3 ml-3 shrink-0">42.1 GB</span></span>
          <Bar pct={64} className="mt-2" />
          <span className="block text-[12px] text-fg-3 mt-1.5">Writing straight to Downloads</span>
        </span>
      </div>
    </div>
  );
}

function ResumeVisual() {
  return (
    <div className="w-full" aria-hidden="true">
      <div className="relative">
        <Bar pct={100} />
        <span className="absolute top-1/2 -translate-y-1/2 w-[3px] h-4 rounded bg-warn" style={{ left: '37%' }} />
      </div>
      <div className="flex justify-between text-[12px] text-fg-3 mt-3"><span>Wi-Fi dropped at 37%</span><span className="text-ok inline-flex items-center gap-1"><Check className="w-3 h-3" />Finished</span></div>
    </div>
  );
}

function NearbyVisual() {
  return (
    <div className="relative w-[210px] h-[170px]" aria-hidden="true">
      {[0, 28, 56].map((i) => <span key={i} className="absolute rounded-full" style={{ inset: `${i * 0.75}px ${i}px`, boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--color-acc) 25%, transparent)' }} />)}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-acc shadow-[0_0_24px_6px_color-mix(in_srgb,var(--color-acc)_50%,transparent)]" />
      {[['Amber Moth', 'left-[-8px] top-[18px]'], ['Ivory Panda', 'right-[-14px] top-[84px]'], ['Sage Hare', 'left-[40px] bottom-[-4px]']].map(([n, c]) => (
        <span key={n} className={`absolute ${c} text-[12px] px-2.5 py-1 rounded-full bg-s3 ring2 whitespace-nowrap`}>{n}</span>
      ))}
    </div>
  );
}

function FolderVisual() {
  return (
    <pre className="font-mono text-[12.5px] leading-[1.9] text-fg-2 w-full" aria-hidden="true">{`Ladakh/
├─ RAW/        640 files
├─ Edits/
│  └─ final.tif
└─ notes.md`}</pre>
  );
}

function Feature({ title, body, children, wide }: { title: string; body: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <li className={`panel rounded-2xl p-5 md:p-7 flex flex-col md:min-h-[320px] ${wide ? 'md:col-span-3' : 'md:col-span-2'}`}>
      <div className="flex-1 flex items-center justify-center py-4 md:py-0 mb-5 md:mb-6">{children}</div>
      <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="text-[14.5px] text-fg-2 mt-1.5 max-w-[40ch] leading-relaxed">{body}</p>
    </li>
  );
}

/** Design A: dark, product-first. */
export default function LandingDark({ relay, onStage }: LandingProps) {
  const codeInput = useRef<HTMLInputElement>(null);
  const receive = () => { codeInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); codeInput.current?.focus({ preventScroll: true }); };

  return (
    <motion.div key="landing-dark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full">
      {/* HERO */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div className="hero-glow absolute left-1/2 -translate-x-1/2 -top-48 w-[1100px] h-[720px] pointer-events-none" aria-hidden="true" />
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-6 pt-12 md:pt-28 text-center">
          <Link to="/resume-interrupted-file-transfer" className="inline-flex items-center gap-2.5 h-8 pl-1.5 pr-3 rounded-full ring2 bg-tint/[0.03] text-[13px] text-fg-2 hover:text-fg transition-colors">
            <span className="h-[22px] px-2.5 rounded-full grad text-[#05070C] text-[11.5px] font-semibold inline-flex items-center">New</span>
            Transfers resume from the exact byte <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <h1 id="hero-title" className="h-hero mx-auto mt-6 md:mt-7 max-w-[13ch] text-[44px] sm:text-[64px] md:text-[84px] font-semibold tracking-[var(--tr-1)] leading-[1] text-balance pb-1">
            Send files directly. Nothing in between.
          </h1>
          <p className="mx-auto mt-5 md:mt-6 max-w-[560px] text-[17px] md:text-[20px] text-fg-2 leading-[1.5] text-pretty">
            Relay moves files of any size from one device to another, end-to-end encrypted, without ever uploading them. No account. Free and open source.
          </p>
          <div className="mt-8 md:mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={relay.createRoom} className="btn btn-w btn-lg">Start sending</button>
            <button onClick={receive} className="btn btn-g btn-lg">Receive with a code</button>
          </div>
          <p className="mt-4 text-[13px] text-fg-3">Works in any browser. Nothing to install.</p>

          <AppWindow ref={codeInput} relay={relay} onStage={onStage} className="mt-12 md:mt-20 mx-auto max-w-[1080px]" />

          <div className="mt-16 md:mt-24">
            <p className="text-[13px] text-fg-3">Works across every device you own</p>
            <ul className="mt-5 grid grid-cols-3 md:flex md:flex-wrap justify-center gap-x-6 md:gap-x-12 gap-y-3 text-[16px] md:text-[19px] font-semibold tracking-[-0.02em] text-fg-3" aria-label="Supported platforms">
              {['iPhone', 'Android', 'Windows', 'macOS', 'Linux', 'ChromeOS'].map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* PRIVATE BY DESIGN */}
      <section aria-labelledby="private-title" className={SECTION}>
        <Kick>Private by design</Kick>
        <h2 id="private-title" className={`${H2} mt-3 max-w-[17ch]`}>Your files never touch a server. <span className="text-fg-3">Not even ours.</span></h2>
        <p className="mt-5 text-[17px] md:text-[18px] text-fg-2 max-w-[54ch] leading-relaxed">Relay only introduces the two devices. Then the file goes straight across, over an encrypted connection only they can read.</p>
        <ul className="mt-10 md:mt-14 grid md:grid-cols-6 gap-3 md:gap-3.5">
          <Feature wide title="Verify with one number" body="Both devices compute a safety number from their encryption keys. Same number on both screens, private connection."><SafetyVisual /></Feature>
          <Feature wide title="Any size, really" body="No caps, no compression, no expiring links. Chrome and Edge write large files straight to disk."><SizeVisual /></Feature>
          <Feature title="Survives bad Wi-Fi" body="If the connection drops, the transfer picks up from the exact byte."><ResumeVisual /></Feature>
          <Feature title="Nearby, instantly" body="Devices on the same Wi-Fi appear on their own. Tap one to connect."><NearbyVisual /></Feature>
          <Feature title="Folders stay folders" body="Structure is kept. Save into a folder or as a single ZIP."><FolderVisual /></Feature>
        </ul>
      </section>

      {/* HOW IT WORKS */}
      <section aria-labelledby="how-title" className={SECTION}>
        <Kick>How it works</Kick>
        <h2 id="how-title" className={`${H2} mt-3 max-w-[16ch]`}>Three steps. No sign-up.</h2>
        <div className="mt-10 md:mt-14 grid md:grid-cols-12 gap-8 items-center">
          <ol className="md:col-span-5 flex flex-col">
            {[
              { t: 'Open Relay on both devices', b: 'Any browser on a phone, tablet or computer.' },
              { t: 'Connect them', b: 'Scan the QR code, type the room code, or tap the device under Nearby.' },
              { t: 'Approve, then send', b: 'You allow the other device. They accept each file.' },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-4 md:gap-5 py-5 md:py-6 border-t border-line first:border-t-0 first:pt-0">
                <span className="w-7 h-7 rounded-full ring2 text-[13px] font-medium text-fg-2 flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{s.t}</h3>
                  <p className="text-[15px] text-fg-2 mt-1 leading-relaxed">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
          <figure className="md:col-span-7 panel rounded-2xl p-5 md:p-9">
            <PathDiagram />
            <figcaption className="text-[13.5px] text-fg-2 mt-4 leading-relaxed">
              Your device encrypts the file and sends it directly to theirs. The server passes the room code and connection details, then steps aside. It never receives files, file names or messages. <Link to="/security" className="text-fg underline underline-offset-4 decoration-tint/25 hover:decoration-fg">What it can and can't see</Link>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* COMPARE */}
      <section aria-labelledby="cmp-title" className={SECTION}>
        <Kick>Compared</Kick>
        <h2 id="cmp-title" className={`${H2} mt-3 max-w-[16ch] mb-10 md:mb-12`}>Built for sending, not storing.</h2>
        <CompareTable />
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className={`${SECTION} grid md:grid-cols-12 gap-8`}>
        <div className="md:col-span-4">
          <h2 id="faq-title" className={H2}>Questions</h2>
          <p className="mt-4 text-fg-2">More in the <Link to="/faq" className="text-fg underline underline-offset-4 decoration-tint/25 hover:decoration-fg">FAQ</Link> and <Link to="/articles" className="text-fg underline underline-offset-4 decoration-tint/25 hover:decoration-fg">guides</Link>.</p>
        </div>
        <div className="md:col-span-8"><Faq /></div>
      </section>

      {/* FINAL CTA */}
      <section aria-labelledby="final-title" className={SECTION}>
        <div className="relative overflow-hidden rounded-[24px] md:rounded-[28px] panel px-6 py-16 md:py-28 text-center">
          <div className="hero-glow absolute left-1/2 -translate-x-1/2 -top-64 w-[900px] h-[560px] pointer-events-none" aria-hidden="true" />
          <h2 id="final-title" className={`${H2} relative mx-auto max-w-[14ch]`}>Send your first file in ten seconds.</h2>
          <p className="relative mt-5 text-[17px] text-fg-2">Open Relay on both devices. That's the whole setup.</p>
          <div className="relative mt-8 md:mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => { window.scrollTo({ top: 0 }); relay.createRoom(); }} className="btn btn-w btn-lg">Start sending</button>
            <Link to="/security" className="btn btn-g btn-lg">Read the security model</Link>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
