import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, MotionValue } from 'motion/react';
import { AppWindow, CompareTable, Faq, LandingProps } from './shared';
import { KineticLine } from '../../components/Kinetic';
import { RevealWords, Stagger, item } from '../../components/Reveal';
import { useEntryOpen } from '../../lib/entry';

const ease = [0.76, 0, 0.24, 1] as const;

function H2({ id, children, className = '' }: { id: string; children: string; className?: string }) {
  return (
    <h2 id={id} className={`display text-[46px] sm:text-[60px] md:text-[80px] text-balance text-ink ${className}`} style={{ ['--w' as string]: 3.5 }}>
      <RevealWords text={children} />
    </h2>
  );
}

// ── How a file gets there: the file crosses as you scroll ───────────────────
function Track({ p, vertical }: { p: MotionValue<number>; vertical?: boolean }) {
  const pos = useTransform(p, [0.15, 0.7], ['0%', '100%']);
  return (
    <div className={`relative ${vertical ? 'w-10 h-full mx-auto' : 'h-10 w-full'}`} aria-hidden="true">
      <div className={`absolute rounded-full bg-pale ${vertical ? 'inset-y-0 left-1/2 -translate-x-1/2 w-1.5' : 'inset-x-0 top-1/2 -translate-y-1/2 h-1.5'}`} />
      <motion.div className={`absolute rounded-full bg-signal ${vertical ? 'top-0 left-1/2 -translate-x-1/2 w-1.5' : 'left-0 top-1/2 -translate-y-1/2 h-1.5'}`}
        style={vertical ? { height: pos } : { width: pos }} />
      <motion.span className="absolute w-10 h-10 rounded-[12px] bg-signal text-white flex items-center justify-center text-[11px] font-medium"
        style={vertical ? { top: pos, left: 0, translateY: '-50%' } : { left: pos, top: 0, translateX: '-50%' }}>PDF</motion.span>
    </div>
  );
}

function End({ title, line }: { title: string; line: string }) {
  return (
    <div className="rounded-[24px] bg-paper p-6 md:p-7 shadow-[inset_0_0_0_1px_var(--color-line)]">
      <p className="display text-[34px] md:text-[42px]" style={{ ['--w' as string]: 4 }}>{title}</p>
      <p className="text-ink-2 mt-2">{line}</p>
    </div>
  );
}

function Path() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 40%'] });
  return (
    <div ref={ref} className="mt-12 md:mt-16" aria-hidden="true">
      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] items-center gap-6">
        <End title="Your device" line="Encrypts the file before it leaves." />
        <Track p={scrollYProgress} />
        <End title="Their device" line="Decrypts it and saves it." />
      </div>
      <div className="md:hidden flex flex-col">
        <End title="Your device" line="Encrypts the file before it leaves." />
        <div className="h-40 py-2"><Track p={scrollYProgress} vertical /></div>
        <End title="Their device" line="Decrypts it and saves it." />
      </div>
      <div className="mt-4 md:mt-6 md:mx-auto md:max-w-[52%] rounded-[24px] border-[1.5px] border-dashed border-line-2 px-6 py-5 text-center">
        <p><span className="font-medium">Relay's server</span> <span className="text-ink-2">only introduces the two devices. It never sees a file.</span></p>
      </div>
    </div>
  );
}

/** One headline line rising out of its own mask, after the sheet opens. */
function Rise({ i, children }: { i: number; children: React.ReactNode }) {
  const waiting = useEntryOpen();
  return (
    <span className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
      <motion.span className="block will-change-transform" initial={{ y: '102%' }} animate={waiting ? { y: '102%' } : { y: 0 }} transition={{ duration: 1, ease, delay: (waiting ? 0 : 0.35) + i * 0.09 }}>{children}</motion.span>
    </span>
  );
}

const FACTS: { title: string; body: string; to: string; more: string }[] = [
  { title: 'No size limit', body: 'Send a 40 GB video the same way as a photo. Chrome and Edge write big files straight to disk instead of holding them in memory.', to: '/best-way-to-send-large-files', more: 'Sending large files' },
  { title: 'Nothing is stored', body: 'Files go from one device to the other and nowhere else, so there is no copy on a server to leak or expire.', to: '/security', more: 'How Relay is secured' },
  { title: 'You can check who is on the other end', body: 'Both screens show the same safety number. If they match, nobody is listening in, not even us.', to: '/verify-safety-number', more: 'Checking the safety number' },
  { title: 'Bad Wi-Fi is fine', body: 'If the connection drops, the transfer picks up from the exact byte where it stopped.', to: '/resume-interrupted-file-transfer', more: 'Resuming transfers' },
  { title: 'Nearby devices show up on their own', body: 'On the same Wi-Fi, the other device appears in the list. Tap it and you are connected.', to: '/share-files-on-same-wifi', more: 'Sharing on the same Wi-Fi' },
  { title: 'Folders stay folders', body: 'Send a whole folder and it arrives with the same structure, saved into a folder or as one ZIP.', to: '/send-a-folder-online', more: 'Sending a folder' },
];

/** The home page: the working app is the hero, then the explanation. */
export default function Landing({ relay, onStage }: LandingProps) {
  const codeInput = useRef<HTMLInputElement>(null);

  const heading = (
    <div className="px-6 md:px-10 pt-9 md:pt-14 pb-6 md:pb-10">
      <h1 id="hero-title" className="sr-only">Free file transfer: send files straight to another device</h1>
      <div aria-hidden="true" data-nosnippet className="text-white select-none leading-[.86]">
        <span className="md:hidden block text-[13.4vw]">
          {['Send files', 'straight to', 'another device.'].map((t, i) => <Rise key={t} i={i}><KineticLine text={t} base={3.4} peak={3.4} delay={250 + i * 80} /></Rise>)}
        </span>
        <span className="hidden md:block text-[9.4vw] 2xl:text-[136px]">
          {['Send files straight', 'to another device.'].map((t, i) => <Rise key={t} i={i}><KineticLine text={t} base={3.4} peak={8} delay={250 + i * 100} /></Rise>)}
        </span>
      </div>
      <div className="mt-6 md:mt-9 flex flex-col md:flex-row md:items-end justify-between gap-5">
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.7 }} className="text-[18px] md:text-[21px] text-dev-fg-2 max-w-[44ch] leading-snug">Free file transfer between any two devices. Nothing is uploaded: no account, no size limit, encrypted end to end.</motion.p>
        <button onClick={relay.createRoom} className="key key-signal shrink-0">Start sending</button>
      </div>
    </div>
  );

  return (
    <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="w-full">
      <section aria-labelledby="hero-title" className="wrap pt-3 md:pt-5">
        <motion.div initial={{ clipPath: 'inset(0 0 100% 0 round 28px)' }} animate={{ clipPath: 'inset(0 0 0% 0 round 28px)' }} transition={{ duration: 0.9, ease }}>
          <AppWindow ref={codeInput} relay={relay} onStage={onStage} heading={heading} />
        </motion.div>
        <p className="mt-5 text-[15px] text-ink-3">Works in the browser on iPhone, Android, Windows, macOS, Linux and ChromeOS. Nothing to install.</p>
      </section>

      <section aria-labelledby="how-title" className="wrap pt-28 md:pt-44">
        <div className="grid md:grid-cols-12 gap-y-6">
          <H2 id="how-title" className="md:col-span-7">Your files never touch a server.</H2>
          <p className="md:col-span-4 md:col-start-9 self-end text-[18px] text-ink-2 leading-relaxed">Relay introduces the two devices, then steps aside. The file goes straight across, over a connection only those two devices can read.</p>
        </div>
        <Path />
        <Stagger as="ol" className="mt-16 md:mt-20 grid md:grid-cols-3 gap-8 md:gap-10">
          {[
            ['Open Relay and choose files', 'Or drop them anywhere on the page. You get a link, a room code and a QR code.'],
            ['Open the link on the other device', 'Or scan the QR code. You approve the device before anything is sent.'],
            ['The file streams across', 'Encrypted from end to end. Close the tab and the room is gone.'],
          ].map(([t, b], i) => (
            <motion.li key={t} className="flex gap-4" {...item}>
              <span className="w-9 h-9 shrink-0 rounded-full bg-pale text-signal font-medium flex items-center justify-center" aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="text-[19px] font-medium leading-snug">{t}</h3>
                <p className="text-ink-2 mt-1.5 leading-relaxed">{b}</p>
              </div>
            </motion.li>
          ))}
        </Stagger>
      </section>

      <section aria-labelledby="facts-title" className="wrap pt-28 md:pt-44">
        <H2 id="facts-title" className="max-w-[14ch]">Made for the files you actually send.</H2>
        <Stagger as="dl" className="mt-12 md:mt-16 grid md:grid-cols-2 gap-x-16">
          {FACTS.map((f) => (
            <motion.div key={f.title} className="py-7 border-t border-line" {...item}>
              <dt className="text-[22px] md:text-[24px] font-medium leading-snug">{f.title}</dt>
              <dd className="mt-2 text-ink-2 leading-relaxed max-w-[52ch]">{f.body} <Link to={f.to} className="link text-ink whitespace-nowrap">{f.more}</Link></dd>
            </motion.div>
          ))}
        </Stagger>
      </section>

      <section aria-labelledby="compare-title" className="wrap pt-28 md:pt-44">
        <H2 id="compare-title" className="max-w-[16ch]">The free plan is the only plan.</H2>
        <div className="mt-12 md:mt-16"><CompareTable /></div>
      </section>

      <section aria-labelledby="faq-title" className="wrap pt-28 md:pt-44">
        <div className="grid md:grid-cols-12 gap-y-10">
          <div className="md:col-span-4">
            <H2 id="faq-title">Questions</H2>
            <p className="mt-5 text-ink-2">More in the <Link to="/faq" className="link text-ink">full FAQ</Link>.</p>
          </div>
          <div className="md:col-span-8"><Faq /></div>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="wrap pt-28 md:pt-44">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <H2 id="cta-title" className="max-w-[12ch]">Got something to send?</H2>
          <button onClick={relay.createRoom} className="btn btn-signal h-14 px-8 text-[17px] self-start md:self-auto">Start sending</button>
        </div>
      </section>
    </motion.div>
  );
}
