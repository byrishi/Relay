import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { Menu, X, Github } from 'lucide-react';

import Home from './pages/Home';
import VerifyIdentity from './pages/VerifyIdentity';
import AIFooter from './components/AIFooter';
import ScrollToTop from './components/ScrollToTop';
import { RelayLogo } from './brand/Logo';
import { applyHead } from './content/head';
import { HOME, SITE } from './content/site';
import { atmosphere, setAtmosphere } from './lib/atmosphere';

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
  return (
    <header className="sticky top-0 z-50 bg-bg/70 backdrop-blur-xl border-b border-line">
      <div className="mx-auto max-w-[1200px] h-16 px-6 flex items-center justify-between gap-6">
        <Link to="/" aria-label="Relay home" className="flex items-center rounded-lg"><RelayLogo /></Link>
        <nav className="hidden md:flex items-center gap-8 text-[14px]" aria-label="Main">
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to} aria-current={location.pathname === to ? 'page' : undefined}
              className={`transition-colors ${location.pathname === to ? 'text-fg' : 'text-fg-2 hover:text-fg'}`}>{label}</Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2.5">
          <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="btn btn-g">
            <Github className="w-4 h-4" aria-hidden="true" />GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <Link to="/" className="btn btn-w">Start sending</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden w-10 h-10 -mr-2 rounded-lg flex items-center justify-center text-fg" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" className="md:hidden px-6 pb-6 flex flex-col text-[17px]" aria-label="Mobile">
          {NAV.map(({ to, label }) => <Link key={to} to={to} className="py-3.5 border-b border-line text-fg">{label}</Link>)}
          <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="py-3.5 border-b border-line text-fg">GitHub</a>
          <Link to="/" className="btn btn-w btn-lg mt-5">Start sending</Link>
        </nav>
      )}
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

function MotionToggle() {
  const [still, setStill] = useState(atmosphere.still);
  const toggle = () => {
    const v = !still;
    setStill(v);
    setAtmosphere({ still: v });
    try { localStorage.setItem('relay-motion', v ? 'off' : 'on'); } catch { /* ignore */ }
  };
  return (
    <button onClick={toggle} aria-pressed={!still} className="hover:text-fg">
      Background animation: {still ? 'off' : 'on'}
    </button>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mt-auto pt-32">
      <AIFooter />
      <div className="border-t border-line">
        <div className="max-w-[1200px] mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-12 gap-10">
          <div className="col-span-2 md:col-span-5">
            <RelayLogo />
            <p className="text-fg-2 text-[14.5px] mt-4 max-w-[34ch] leading-relaxed">Peer-to-peer file transfer that never uploads your files. Free and open source.</p>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title} className="md:col-span-2 first-of-type:md:col-start-7">
              <h2 className="text-[13px] font-medium text-fg">{col.title}</h2>
              <ul className="mt-4 flex flex-col gap-3 text-[14px]">
                {col.links.map(([to, label]) => <li key={to}><Link to={to} className="text-fg-2 hover:text-fg">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-[1200px] mx-auto px-6 py-8 border-t border-line flex flex-col md:flex-row gap-4 md:items-center justify-between text-[13px] text-fg-3">
          <p>© 2026 Relay. MIT licensed. Built by <a href={SITE.author.url} target="_blank" rel="noopener noreferrer" className="text-fg-2 underline underline-offset-4 decoration-white/25 hover:text-fg">{SITE.author.name}</a>.</p>
          <p className="flex flex-wrap gap-x-6 gap-y-2">
            <MotionToggle />
            <Link to="/self-hosted-file-sharing" className="hover:text-fg">Self-host</Link>
            <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="hover:text-fg">Source code</a>
            <a href="/llms.txt" className="hover:text-fg">llms.txt</a>
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

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className={`min-h-screen relative flex flex-col font-sans text-fg bg-bg overflow-x-hidden w-full max-w-[100vw]`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-fg focus:text-bg focus:font-medium">Skip to content</a>
        <ScrollToTop />
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
      </div>
    </MotionConfig>
  );
}
