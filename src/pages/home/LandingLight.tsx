import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Check } from 'lucide-react';
import { RelayMark } from '../../brand/Logo';
import { AppWindow, Bar, CompareTable, Faq, LandingProps } from './shared';

const H2 = 'text-[36px] sm:text-[44px] md:text-[56px] font-semibold tracking-[var(--tr-1)] leading-[1.07] text-balance';
const LEAD = 'text-[19px] md:text-[21px] leading-[1.4] text-fg-3 font-medium tracking-[-0.012em] text-pretty';

// ── Device mock-ups (drawn in HTML so they stay sharp at any size) ──────────
function LaptopScreen() {
  return (
    <div className="h-full bg-white text-[#1D1D1F] text-left p-[3.2cqw] flex flex-col" aria-hidden="true">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-[1cqw] text-[1.9cqw] font-semibold"><RelayMark deep className="h-[2.6cqw] w-auto" />Relay</span>
        <span className="text-[1.45cqw] text-[#1A7F37] flex items-center gap-[0.6cqw]"><Check className="w-[1.6cqw] h-[1.6cqw]" />Verified, direct connection</span>
      </div>
      <p className="mt-[3.4cqw] text-[1.5cqw] text-[#6E6E73]">Sending to Ivory's iPhone</p>
      <p className="text-[6.4cqw] font-semibold tracking-[-0.04em] leading-none mt-[0.6cqw]">86.2<span className="text-[2.6cqw] text-[#6E6E73] font-medium ml-[0.8cqw] tracking-[-0.01em]">MB/s</span></p>
      <div className="mt-[3cqw] flex flex-col">
        {[['MOV', 'Wedding_Final_4K.mov', '18.6 GB of 42.1 GB, 4 min left', 44], ['DIR', 'RAW Photos, Ladakh', '640 files, 8.4 GB', 0], ['PDF', 'Contract_signed.pdf', '2.1 MB, delivered', 100]].map(([k, n, m, p]) => (
          <div key={n as string} className="flex items-center gap-[1.6cqw] py-[1.5cqw] border-t border-black/[0.08]">
            <span className="w-[3.6cqw] h-[3.6cqw] rounded-[0.8cqw] bg-[#F5F5F7] text-[1cqw] font-semibold text-[#6E6E73] flex items-center justify-center shrink-0">{k}</span>
            <span className="flex-1 min-w-0">
              <span className="flex justify-between text-[1.55cqw]"><span>{n}</span><span className="text-[#6E6E73]">{p === 100 ? 'Delivered' : p ? `${p}%` : 'Queued'}</span></span>
              <span className="block text-[1.25cqw] text-[#6E6E73]">{m}</span>
              {p !== 100 && <span className="block mt-[0.7cqw] h-[0.5cqw] rounded-full bg-black/[0.07] overflow-hidden"><span className="block h-full rounded-full grad" style={{ width: `${p}%` }} /></span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneScreen() {
  return (
    <div className="relative h-full bg-white text-[#1D1D1F] px-[7cqw] pt-[22cqw] text-left" aria-hidden="true">
      <span className="absolute top-[4.5cqw] left-1/2 -translate-x-1/2 w-[32cqw] h-[9.5cqw] rounded-full bg-black" />
      <span className="absolute top-[5.5cqw] left-[9cqw] text-[5cqw] font-semibold">9:41</span>
      <p className="text-[10cqw] font-bold tracking-[-0.03em]">Relay</p>
      <p className="text-[5cqw] text-[#6E6E73] -mt-[1cqw]">Connected to MacBook Pro</p>
      <div className="mt-[6cqw] rounded-[6cqw] bg-[#F5F5F7] p-[5.5cqw]">
        <p className="text-[4.6cqw] text-[#6E6E73]">Receiving</p>
        <p className="text-[5.8cqw] font-semibold truncate">Wedding_Final_4K.mov</p>
        <p className="text-[4.6cqw] text-[#6E6E73]">42.1 GB, 44%</p>
        <span className="block mt-[3cqw] h-[1.8cqw] rounded-full bg-black/[0.08] overflow-hidden"><span className="block h-full w-[44%] rounded-full grad" /></span>
      </div>
      <div className="mt-[4cqw] rounded-[6cqw] bg-[#F5F5F7] p-[5.5cqw]">
        <p className="text-[4.6cqw] text-[#6E6E73]">Wants to send you</p>
        <p className="text-[5.8cqw] font-semibold">RAW Photos, Ladakh</p>
        <p className="text-[4.6cqw] text-[#6E6E73]">640 files, 8.4 GB</p>
        <span className="mt-[4cqw] block text-center rounded-full bg-[#0071E3] text-white text-[5cqw] font-medium py-[2.8cqw]">Accept</span>
        <span className="mt-[2.4cqw] block text-center rounded-full bg-[#E8E8ED] text-[5cqw] font-medium py-[2.8cqw]">Decline</span>
      </div>
    </div>
  );
}

function Phone({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-[17%/8%] bg-[#1D1D1F] p-[2.6%] shadow-[0_0_0_1.5px_#C7C7CC,0_40px_80px_-30px_rgb(0_0_0/0.45)] ${className}`}>
      <div className="@container aspect-[9/19.4] rounded-[15%/7%] overflow-hidden"><PhoneScreen /></div>
    </div>
  );
}

function DeviceStage() {
  return (
    <div className="relative mx-auto mt-12 md:mt-16 w-full max-w-[1040px] px-5 md:px-6" aria-hidden="true">
      {/* Phones get the phone; larger screens get the laptop and the phone */}
      <div className="md:hidden flex justify-center"><Phone className="w-[240px]" /></div>
      <div className="hidden md:block relative pb-[4%]">
        <div className="w-[80%]">
          <div className="rounded-t-[2.2%/3.4%] bg-[#1D1D1F] p-[1.4%] pb-[2%] shadow-[0_0_0_1.5px_#C7C7CC]">
            <div className="@container aspect-[16/10] rounded-[0.6%] overflow-hidden"><LaptopScreen /></div>
          </div>
          <div className="relative h-[14px] -mx-[6%] rounded-b-[18px] bg-gradient-to-b from-[#E3E3E8] to-[#B4B4BA] shadow-[0_24px_40px_-20px_rgb(0_0_0/0.5)]">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 w-[16%] h-[6px] rounded-b-lg bg-[#A1A1A6]" />
          </div>
        </div>
        {/* the file in flight, from the laptop to the phone */}
        <svg className="absolute left-[66%] top-[-12%] w-[26%] h-auto overflow-visible" viewBox="0 0 300 300">
          <defs><linearGradient id="arc" x1="0" x2="1"><stop offset="0" stopColor="#4B52E0" /><stop offset=".55" stopColor="#8B5CF6" /><stop offset="1" stopColor="#F0703F" /></linearGradient></defs>
          <path d="M92 74 C 130 -18, 232 -10, 248 222" fill="none" stroke="url(#arc)" strokeWidth="12" strokeOpacity=".1" strokeLinecap="round" />
          <path d="M92 74 C 130 -18, 232 -10, 248 222" fill="none" stroke="url(#arc)" strokeWidth="3.5" strokeDasharray="2 9" strokeLinecap="round" className="flow-h" />
        </svg>
        <Phone className="absolute right-[1%] bottom-0 w-[23%]" />
      </div>
    </div>
  );
}

function Tile({ label, children, body, dark, wide }: { label: string; children: React.ReactNode; body: React.ReactNode; dark?: boolean; wide?: boolean }) {
  return (
    <li className={`rounded-[24px] md:rounded-[28px] p-7 md:p-11 flex flex-col md:min-h-[440px] ${dark ? 'bg-black text-[#F5F5F7]' : 'bg-s1'} ${wide ? 'md:col-span-2 md:min-h-[380px]' : ''}`}>
      <p className={`text-[17px] font-semibold ${dark ? 'text-[#A1A1A6]' : 'text-fg-3'}`}>{label}</p>
      <div className="mt-auto pt-8 md:pt-10">{children}</div>
      <p className={`mt-4 text-[17px] md:text-[19px] font-semibold tracking-[-0.015em] leading-snug max-w-[30ch] ${dark ? 'text-[#F5F5F7]' : 'text-fg'}`}>{body}</p>
    </li>
  );
}

/** Design B: light, in the spirit of Apple's product pages. */
export default function LandingLight({ relay, onStage }: LandingProps) {
  const codeInput = useRef<HTMLInputElement>(null);
  const receive = () => { codeInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); codeInput.current?.focus({ preventScroll: true }); };

  return (
    <motion.div key="landing-light" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="w-full">
      {/* HERO */}
      <section aria-labelledby="hero-title" className="text-center pt-12 md:pt-20 overflow-hidden">
        <div className="px-5">
          <p className="inline-flex items-center gap-2 text-[19px] md:text-[24px] font-semibold tracking-[-0.02em]"><RelayMark className="h-6 md:h-7 w-auto" />Relay</p>
          <h1 id="hero-title" className="mt-2 md:mt-3 text-[48px] sm:text-[72px] md:text-[96px] font-semibold tracking-[var(--tr-1)] leading-[1.02] text-balance">
            Files. <span className="text-grad">Straight across.</span>
          </h1>
          <p className={`${LEAD} mx-auto mt-4 md:mt-6 max-w-[30ch] md:text-[24px]`}>Send anything, of any size, to another device. End-to-end encrypted. Never uploaded. No account.</p>
          <div className="mt-7 md:mt-9 flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center items-center">
            <button onClick={relay.createRoom} className="btn btn-w btn-lg">Start sending</button>
            <button onClick={receive} className="link-more text-[17px] md:text-[19px]">Receive with a code</button>
          </div>
        </div>
        <DeviceStage />
      </section>

      {/* TRY IT */}
      <section aria-labelledby="try-title" className="bg-s1 mt-16 md:mt-24 py-20 md:py-32">
        <div className="max-w-[1040px] mx-auto px-5 md:px-6">
          <div className="text-center">
            <h2 id="try-title" className={H2}>Try it right here.</h2>
            <p className={`${LEAD} mx-auto mt-4 max-w-[34ch]`}>Choose files to send, or enter the code from the other device. Nothing to install.</p>
          </div>
          <AppWindow ref={codeInput} relay={relay} onStage={onStage} className="mt-10 md:mt-14" />
        </div>
      </section>

      {/* STAT TILES */}
      <section aria-labelledby="tiles-title" className="max-w-[1040px] mx-auto px-5 md:px-6 pt-24 md:pt-36">
        <h2 id="tiles-title" className={`${H2} text-center`}>Big files. No catch.</h2>
        <ul className="mt-10 md:mt-16 grid md:grid-cols-2 gap-4 md:gap-5">
          <Tile label="Stored on our servers" body={<>Files go device to device. <span className="text-fg-3">Our server only introduces them and never sees what you send.</span></>}>
            <p className="text-grad text-[64px] md:text-[88px] font-semibold tracking-[-0.05em] leading-none">0 bytes</p>
          </Tile>
          <Tile label="File size limit" body={<>Send a 100 GB video. <span className="text-fg-3">Chrome and Edge write it straight to disk as it arrives.</span></>}>
            <p className="text-[64px] md:text-[88px] font-semibold tracking-[-0.05em] leading-none">None.</p>
          </Tile>
          <Tile dark wide label="Safety number" body={<>Same number on both screens? <span className="text-[#A1A1A6]">Then nobody, not even Relay, is in the middle.</span></>}>
            <p className="font-mono text-[26px] sm:text-[34px] md:text-[44px] tracking-[0.06em] leading-tight" aria-hidden="true">4821 0937 5512<br className="md:hidden" /> 6604 1180</p>
            <div className="mt-6 flex flex-wrap gap-3" aria-hidden="true">
              <span className="px-4 py-2 rounded-full bg-[#30D158] text-black text-[15px] font-semibold">They match</span>
              <span className="px-4 py-2 rounded-full bg-[#2C2C2E] text-[15px]">They don't match</span>
            </div>
          </Tile>
          <Tile label="Lost Wi-Fi at 37%?" body={<>It resumes from the exact byte. <span className="text-fg-3">No starting over.</span></>}>
            <p className="text-[56px] md:text-[72px] font-semibold tracking-[-0.05em] leading-none">37% <span className="text-fg-3">→</span> 100%</p>
            <Bar pct={100} className="mt-6 h-2" />
          </Tile>
          <Tile label="Works on" body={<>Any modern browser. <span className="text-fg-3">Nothing to install, nothing to sign up for.</span></>}>
            <p className="text-[34px] md:text-[44px] font-semibold tracking-[-0.035em] leading-[1.1]">iPhone, Android, Windows, Mac, Linux.</p>
          </Tile>
        </ul>
      </section>

      {/* STEPS */}
      <section aria-labelledby="steps-title" className="max-w-[1040px] mx-auto px-5 md:px-6 pt-24 md:pt-36">
        <h2 id="steps-title" className={`${H2} text-center`}>Three steps. That's it.</h2>
        <ol className="mt-10 md:mt-16 grid md:grid-cols-3 gap-8 md:gap-10">
          {[
            ['Open Relay on both devices.', 'Phone, tablet or computer, in any browser.'],
            ['Connect them.', 'Scan the QR code, type the code, or tap the device nearby.'],
            ['Approve and send.', 'You allow the device. They accept the file.'],
          ].map(([t, b], i) => (
            <li key={t} className="border-t border-line pt-6">
              <span className="w-9 h-9 rounded-full bg-fg text-bg text-[15px] font-semibold flex items-center justify-center" aria-hidden="true">{i + 1}</span>
              <h3 className="mt-5 text-[22px] md:text-[24px] font-semibold tracking-[-0.02em]">{t}</h3>
              <p className="mt-2 text-[17px] text-fg-3">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* PRIVACY BAND (black, as Apple does for privacy) */}
      <section aria-labelledby="privacy-title" className="mt-24 md:mt-36 bg-black text-[#F5F5F7] py-20 md:py-32">
        <div className="max-w-[1040px] mx-auto px-5 md:px-6 text-center">
          <span className="mx-auto w-[72px] h-[72px] md:w-[84px] md:h-[84px] rounded-[22px] flex items-center justify-center bg-[linear-gradient(135deg,#4B52E0,#8B5CF6_55%,#F0703F)]" aria-hidden="true"><Lock className="w-9 h-9 text-white" strokeWidth={2.2} /></span>
          <h2 id="privacy-title" className={`${H2} mt-7 mx-auto max-w-[16ch]`}>Privacy. Built in, not bolted on.</h2>
          <p className="mt-4 mx-auto max-w-[36ch] text-[19px] md:text-[21px] text-[#A1A1A6] font-medium">Every transfer is encrypted end to end with keys made on your devices. Every line of code is public.</p>
          <ul className="mt-14 md:mt-20 grid md:grid-cols-3 gap-10 text-left">
            {[
              ['You approve every device.', 'Nothing arrives until you allow the other device, and every file waits for an Accept.'],
              ['No account. No tracking.', 'No sign-up, no email address, no analytics, no ads.'],
              ['Open source, MIT.', 'Read the code, check the security review, or host it yourself.'],
            ].map(([t, b]) => (
              <li key={t}>
                <h3 className="text-[21px] font-semibold tracking-[-0.02em]">{t}</h3>
                <p className="mt-2 text-[17px] text-[#A1A1A6]">{b}</p>
              </li>
            ))}
          </ul>
          <Link to="/security" className="inline-block mt-12 text-[17px] md:text-[19px] text-[#2997FF] hover:underline underline-offset-4">Read the security model ›</Link>
        </div>
      </section>

      {/* COMPARE */}
      <section aria-labelledby="cmp-title" className="max-w-[1040px] mx-auto px-5 md:px-6 pt-24 md:pt-36">
        <h2 id="cmp-title" className={`${H2} text-center mb-10 md:mb-14`}>Built for sending, not storing.</h2>
        <CompareTable />
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="max-w-[820px] mx-auto px-5 md:px-6 pt-24 md:pt-36">
        <h2 id="faq-title" className={`${H2} text-center mb-10 md:mb-12`}>Questions? Answers.</h2>
        <Faq size="lg" />
        <p className="mt-6 text-center text-[17px]"><Link to="/faq" className="link-more">More questions</Link></p>
      </section>

      {/* FINAL CTA */}
      <section aria-labelledby="final-title" className="text-center px-5 pt-24 md:pt-40">
        <RelayMark className="h-14 md:h-16 w-auto mx-auto" />
        <h2 id="final-title" className={`${H2} mt-6`}>Send something now.</h2>
        <p className={`${LEAD} mt-4`}>Free. Open it on the other device and you're done.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center items-center">
          <button onClick={() => { window.scrollTo({ top: 0 }); relay.createRoom(); }} className="btn btn-w btn-lg">Start sending</button>
          <Link to="/how-it-works" className="link-more text-[17px] md:text-[19px]">How it works</Link>
        </div>
      </section>
    </motion.div>
  );
}
