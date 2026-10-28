import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { MotionConfig, AnimatePresence, motion } from 'motion/react';

import Home from './pages/Home';
import VerifyIdentity from './pages/VerifyIdentity';
import AIFooter from './components/AIFooter';
import Cursor from './components/Cursor';
import { RouteCurtain } from './components/Intro';
import { RelayLogo } from './brand/Logo';
import { applyHead } from './content/head';
import { HOME, SITE } from './content/site';
import { startSmoothScroll, scrollToTop, setScrollLock } from './lib/scroll';

// Articles and content pages (markdown) load on demand, keeping the app bundle small.
const DocRoute = lazy(() => import('./pages/Docs').then((m) => ({ default: m.DocRoute })));
const DocsIndex = lazy(() => import('./pages/Docs').then((m) => ({ default: m.DocsIndex })));

const NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/security', label: 'Security' },
  { to: '/articles', label: 'Guides' },
  { to: '/verify-identity', label: 'Verify' },
];

function Header() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => { setScrollLock(open); }, [open]);
  return (
    <header className="sticky top-0 z-50 bg-bg/95 border-b border-line">
      <div className="wrap h-16 flex items-center gap-8">
        <Link to="/" aria-label="Relay home" className="group shrink-0"><RelayLogo /></Link>
        <nav className="hidden lg:flex items-center gap-1 ml-6" aria-label="Main">
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to} aria-current={location.pathname === to ? 'page' : undefined}
              className={`h-10 px-3.5 inline-flex items-center rounded-full text-[15.5px] transition-colors ${location.pathname === to ? 'bg-pale text-signal' : 'text-ink-2 hover:text-ink hover:bg-bg-2'}`}>{label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="hidden lg:inline-flex h-10 px-3.5 items-center rounded-full text-[15.5px] text-ink-2 hover:text-ink hover:bg-bg-2">
            GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <Link to="/" className="btn btn-signal h-10 px-5 text-[15px]">Send a file</Link>
          <button onClick={() => setOpen(!open)} className="lg:hidden w-11 h-11 -mr-2 flex items-center justify-center" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'}>
            <span className="relative w-5 h-3" aria-hidden="true">
              <span className={`absolute left-0 right-0 h-[2px] bg-ink transition-transform ${open ? 'top-[5px] rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 right-0 h-[2px] bg-ink transition-transform ${open ? 'top-[5px] -rotate-45' : 'top-[10px]'}`} />
            </span>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav id="mobile-nav" aria-label="Mobile" className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-signal text-white flex flex-col"
            initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} exit={{ clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}>
            <div className="wrap pt-4 flex flex-col">
              {[...NAV, { to: '/', label: 'Send a file' }].map(({ to, label }, i) => (
                <motion.div key={to} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 + i * 0.05 }}>
                  <Link to={to} className="block py-2.5 display text-[52px]" style={{ ['--w' as string]: 3 }}>{label}</Link>
                </motion.div>
              ))}
              <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="mt-8 text-white/80 underline underline-offset-4">Source code on GitHub</a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

const FOOTER: { title: string; links: [string, string][] }[] = [
  { title: 'Relay', links: [['/', 'Send a file'], ['/how-it-works', 'How it works'], ['/security', 'Security'], ['/faq', 'FAQ'], ['/privacy', 'Privacy'], ['/terms', 'Terms']] },
  { title: 'Guides', links: [
    ['/peer-to-peer-file-sharing', 'P2P file sharing'], ['/secure-file-sharing', 'Secure file sharing'], ['/best-way-to-send-large-files', 'Send large files'],
    ['/end-to-end-encrypted-file-transfer', 'Encrypted transfer'], ['/airdrop-alternative', 'AirDrop alternative'], ['/articles', 'All guides'],
  ] },
  { title: 'Compare', links: [
    ['/best-p2p-file-sharing-apps', 'Best P2P apps'], ['/relay-vs-wetransfer', 'vs WeTransfer'], ['/relay-vs-google-drive', 'vs Google Drive'],
    ['/relay-vs-localsend', 'vs LocalSend'], ['/relay-vs-pairdrop', 'vs PairDrop'], ['/relay-vs-wormhole', 'vs Wormhole'],
  ] },
];

/** Sets a line of display type so it exactly fills its container's width. */
function FitWord({ text, w = 9 }: { text: string; w?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const b = box.current, t = word.current;
      if (!b || !t) return;
      t.style.fontSize = '100px';
      t.style.fontSize = `${(100 * b.clientWidth) / t.scrollWidth}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box.current!);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [text]);
  return (
    <div ref={box} className="overflow-hidden" aria-hidden="true">
      <span ref={word} className="display inline-block whitespace-nowrap leading-[.78] pt-[2%]" style={{ ['--w' as string]: w }}>{text}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mt-auto pt-32 md:pt-48">
      <div className="wrap">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-y-10 border-t border-line pt-10">
          <div className="col-span-2 md:col-span-5 md:pr-10">
            <p className="text-ink-2 max-w-[34ch] leading-relaxed">Peer-to-peer file transfer that never uploads your files. Free and open source, made in Ahmedabad by <a href={SITE.author.url} target="_blank" rel="noopener noreferrer" className="link text-ink">{SITE.author.name}</a>.</p>
            <AIFooter />
          </div>
          {FOOTER.map((col, i) => (
            <div key={col.title} className={`md:col-span-2 ${i === 0 ? 'md:col-start-7' : ''}`}>
              <h2 className="text-[14px] text-ink-3">{col.title}</h2>
              <ul className="mt-4 flex flex-col gap-2 text-[15.5px]">
                {col.links.map(([to, label]) => <li key={to}><Link to={to} className="hover:text-signal">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 md:mt-24 text-signal"><FitWord text="Relay" w={7} /></div>
        <div className="py-6 flex flex-col md:flex-row gap-3 md:items-center justify-between text-[14px] text-ink-3">
          <p>© 2026 Relay. MIT licence.</p>
          <p className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/self-hosted-file-sharing" className="hover:text-ink">Self-host it</Link>
            <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="hover:text-ink">Source code</a>
            <a href="/llms.txt" className="hover:text-ink">llms.txt</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function HomeRoute() {
  useEffect(() => {
    applyHead({ title: HOME.title, description: HOME.description, canonical: `${SITE.url}/`, ogType: 'website', markdown: '/index.md', jsonLd: [] });
  }, []);
  return <Home />;
}

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => { scrollToTop(); }, [pathname]);
  return null;
}

export default function App() {
  useEffect(() => { startSmoothScroll(); }, []);
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen relative flex flex-col font-sans text-ink bg-bg overflow-x-hidden w-full max-w-[100vw]">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[400] focus:px-4 focus:py-2 focus:bg-signal focus:text-white focus:rounded-full focus:font-medium">Skip to content</a>
        <ScrollReset />
        <Header />
        <main id="main" tabIndex={-1} className="flex-1 flex flex-col relative z-10 outline-none">
          <Suspense fallback={<div className="min-h-[60vh]" />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/articles" element={<DocsIndex />} />
              <Route path="/verify-identity" element={<VerifyIdentity />} />
              <Route path="/:slug" element={<DocRoute />} />
              <Route path="*" element={<DocRoute />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <RouteCurtain />
        <Cursor />
      </div>
    </MotionConfig>
  );
}
