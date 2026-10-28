import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { Menu, X, Github } from 'lucide-react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { GeistPixelSquare, GeistPixelGrid, GeistPixelCircle, GeistPixelTriangle, GeistPixelLine } from 'geist/font/pixel';

import Home from './pages/Home';
import VerifyIdentity from './pages/VerifyIdentity';
import AIFooter from './components/AIFooter';
import ScrollToTop from './components/ScrollToTop';
import Atmosphere from './components/Atmosphere';
import { RelayLogo, RelayMark } from './brand/Logo';
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
];

function Header() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <header className="fixed top-0 inset-x-0 z-50 px-3 md:px-6 pt-3 md:pt-4">
      <div className="card mx-auto max-w-6xl h-14 md:h-16 rounded-full pl-4 pr-2 md:pl-5 flex items-center justify-between">
        <Link to="/" aria-label="Relay home" className="rounded-full"><RelayLogo /></Link>
        <nav className="hidden md:flex items-center gap-1 text-[15px]" aria-label="Main">
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to} aria-current={location.pathname === to ? 'page' : undefined}
              className={`px-4 py-2 rounded-full transition-colors ${location.pathname === to ? 'bg-ink/[0.06] text-ink' : 'text-ink-2 hover:text-ink hover:bg-ink/[0.04]'}`}>{label}</Link>
          ))}
          <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-full text-ink-2 hover:text-ink hover:bg-ink/[0.04]" aria-label="Source code on GitHub (opens in a new tab)">
            <Github className="w-[18px] h-[18px]" aria-hidden="true" />
          </a>
          <Link to="/" className="ml-2 h-11 px-5 rounded-full bg-brand text-white font-medium hover:bg-brand-strong transition-colors inline-flex items-center">Send a file</Link>
        </nav>
        <button onClick={() => setOpen(!open)} className="md:hidden w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-ink/[0.05]" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" className="md:hidden card mt-2 mx-auto max-w-6xl rounded-3xl p-3 flex flex-col text-lg" aria-label="Mobile">
          {NAV.map(({ to, label }) => <Link key={to} to={to} className="px-4 py-3 rounded-2xl text-ink hover:bg-ink/[0.04]">{label}</Link>)}
          <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="px-4 py-3 rounded-2xl text-ink hover:bg-ink/[0.04]">GitHub</a>
          <Link to="/" className="mt-2 h-12 rounded-full bg-brand text-white font-medium inline-flex items-center justify-center">Send a file</Link>
        </nav>
      )}
    </header>
  );
}

const FOOTER: { title: string; links: [string, string][] }[] = [
  { title: 'Relay', links: [['/', 'Send a file'], ['/how-it-works', 'How it works'], ['/security', 'Security'], ['/faq', 'FAQ'], ['/privacy', 'Privacy'], ['/terms', 'Terms']] },
  { title: 'Guides', links: [
    ['/peer-to-peer-file-sharing', 'P2P file sharing'], ['/secure-file-sharing', 'Secure file sharing'], ['/best-way-to-send-large-files', 'Send large files'],
    ['/end-to-end-encrypted-file-transfer', 'Encrypted transfer'], ['/airdrop-alternative', 'AirDrop alternative'], ['/articles', 'All guides →'],
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
    <button onClick={toggle} aria-pressed={!still} className="hover:text-ink underline underline-offset-4 decoration-line">
      Background animation: {still ? 'off' : 'on'}
    </button>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mt-auto pt-20">
      <AIFooter />
      <div className="bg-white/70 backdrop-blur-xl border-t border-line">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <RelayLogo />
            <p className="text-ink-2 mt-4 max-w-xs leading-relaxed">Send files directly between devices. Encrypted end to end, never uploaded, free and open source.</p>
            <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-full border border-line bg-white text-ink text-sm hover:border-ink/30">
              <Github className="w-4 h-4" aria-hidden="true" /> Source on GitHub
            </a>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title}>
              <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-3">{col.title}</h2>
              <ul className="mt-4 flex flex-col gap-2.5 text-[15px]">
                {col.links.map(([to, label]) => <li key={to}><Link to={to} className="text-ink-2 hover:text-ink">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-5 md:px-8 pb-8 flex flex-col md:flex-row gap-4 md:items-center justify-between text-sm text-ink-3">
          <span className="flex items-center gap-2"><RelayMark className="h-4 w-auto text-brand" /> © 2026 Relay · MIT licensed · Built by <a href={SITE.author.url} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-4 decoration-line hover:decoration-ink">{SITE.author.name}</a></span>
          <span className="flex flex-wrap gap-x-5 gap-y-2">
            <MotionToggle />
            <Link to="/self-hosted-file-sharing" className="hover:text-ink">Self-host</Link>
            <Link to="/verify-identity" className="hover:text-ink">Verify Relay</Link>
            <a href="/llms.txt" className="hover:text-ink">llms.txt</a>
            <a href="/sitemap.xml" className="hover:text-ink">Sitemap</a>
          </span>
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

/** Fade the particle mark on reading pages so it never competes with text. */
function QuietScene() {
  const { pathname } = useLocation();
  useEffect(() => { setAtmosphere({ quiet: pathname !== '/' }); }, [pathname]);
  return null;
}

export default function App() {
  const fonts = [GeistSans, GeistMono, GeistPixelSquare, GeistPixelGrid, GeistPixelCircle, GeistPixelTriangle, GeistPixelLine].map((f) => f.variable).join(' ');
  return (
    <MotionConfig reducedMotion="user">
      <div className={`min-h-screen relative flex flex-col font-sans text-ink bg-paper overflow-x-hidden w-full max-w-[100vw] ${fonts}`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-full focus:bg-ink focus:text-white focus:font-medium">Skip to content</a>
        <ScrollToTop />
        <QuietScene />
        <Atmosphere />
        <Header />
        <main id="main" tabIndex={-1} className="flex-1 flex flex-col relative z-10 pt-24 md:pt-28 outline-none">
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
