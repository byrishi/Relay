import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, BookOpen } from 'lucide-react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { GeistPixelSquare, GeistPixelGrid, GeistPixelCircle, GeistPixelTriangle, GeistPixelLine } from 'geist/font/pixel';

import Home from './pages/Home';
import VerifyIdentity from './pages/VerifyIdentity';
import AIFooter from './components/AIFooter';
import ScrollToTop from './components/ScrollToTop';
import Atmosphere from './components/Atmosphere';
import { applyHead } from './content/head';
import { HOME, SITE } from './content/site';

// Articles and content pages (markdown) load on demand, keeping the app bundle small.
const DocRoute = lazy(() => import('./pages/Docs').then((m) => ({ default: m.DocRoute })));
const DocsIndex = lazy(() => import('./pages/Docs').then((m) => ({ default: m.DocsIndex })));

const NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/articles', label: 'Guides', icon: BookOpen },
  { to: '/security', label: 'Security', icon: ShieldCheck },
];

function Header() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const fonts = `${GeistSans.variable} ${GeistMono.variable}`;
  return (
    <>
      <header className={`fixed top-0 left-0 w-full h-20 md:h-24 px-4 md:px-8 flex items-center justify-between z-50 backdrop-blur-xl bg-[#05070f]/40 border-b border-white/[0.06] ${fonts}`}>
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" title="Relay — P2P file transfer">
          <span className="font-pixel-square text-2xl md:text-3xl tracking-tight text-white uppercase">Relay</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/55" aria-label="Main">
          <Link to="/" className={`px-4 py-2 rounded-[6px] font-pixel-grid text-xs tracking-widest uppercase transition-all ${location.pathname === '/' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white'}`}>Launch App</Link>
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={`hover:text-white transition-colors flex items-center gap-2 ${location.pathname === to ? 'text-white' : ''}`}>
              {Icon && <Icon className="w-4 h-4" />} {label}
            </Link>
          ))}
        </nav>
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-white/70 hover:text-white" aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>
      {open && (
        <div className={`fixed inset-0 top-20 z-40 bg-[#03040a]/95 backdrop-blur-3xl flex flex-col p-6 md:hidden ${fonts}`}>
          <nav className="flex flex-col gap-6 text-lg font-medium text-white/70 mt-4" aria-label="Mobile">
            <Link onClick={() => setOpen(false)} to="/" className="py-2 border-b border-white/5 font-pixel-grid tracking-widest text-sm uppercase text-brand-neon">Launch App</Link>
            {NAV.map(({ to, label }) => (
              <Link key={to} onClick={() => setOpen(false)} to={to} className={`py-2 border-b border-white/5 ${location.pathname === to ? 'text-white' : ''}`}>{label}</Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

const FOOTER: { title: string; links: [string, string][] }[] = [
  { title: 'Relay', links: [['/', 'Open Relay'], ['/how-it-works', 'How it works'], ['/security', 'Security'], ['/faq', 'FAQ'], ['/privacy', 'Privacy'], ['/terms', 'Terms']] },
  { title: 'Guides', links: [
    ['/peer-to-peer-file-sharing', 'P2P file sharing'], ['/secure-file-sharing', 'Secure file sharing'], ['/best-way-to-send-large-files', 'Send large files'],
    ['/end-to-end-encrypted-file-transfer', 'Encrypted file transfer'], ['/best-p2p-file-sharing-apps', 'Best P2P apps'], ['/airdrop-alternative', 'AirDrop alternative'],
    ['/articles', 'All guides →'],
  ] },
  { title: 'Compare', links: [
    ['/relay-vs-wetransfer', 'Relay vs WeTransfer'], ['/relay-vs-google-drive', 'Relay vs Google Drive'], ['/relay-vs-localsend', 'Relay vs LocalSend'],
    ['/relay-vs-pairdrop', 'Relay vs PairDrop'], ['/relay-vs-wormhole', 'Relay vs Wormhole'], ['/relay-vs-snapdrop', 'Relay vs Snapdrop'], ['/relay-vs-sharedrop', 'Relay vs ShareDrop'],
  ] },
];

function Footer() {
  return (
    <footer className="w-full max-w-[100vw] relative bg-[#03040a]/70 backdrop-blur-2xl pt-16 md:pt-24 mt-auto z-10 flex flex-col border-t border-surface-border">
      <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10 mb-16 md:mb-24">
        {FOOTER.map((col) => (
          <div key={col.title} className="flex flex-col gap-4">
            <h4 className="text-white font-pixel-line uppercase tracking-widest text-lg">{col.title}</h4>
            <ul className="flex flex-col gap-2.5 text-sm text-white/55">
              {col.links.map(([to, label]) => <li key={to}><Link to={to} className="hover:text-white transition-colors">{label}</Link></li>)}
            </ul>
          </div>
        ))}
        <div className="flex flex-col gap-4">
          <h4 className="text-white font-pixel-line uppercase tracking-widest text-lg">Open source</h4>
          <ul className="flex flex-col gap-2.5 text-sm text-white/55">
            <li><a href={SITE.github} target="_blank" rel="noopener noreferrer" className="hover:text-white">Source code on GitHub</a></li>
            <li><Link to="/self-hosted-file-sharing" className="hover:text-white">Self-host Relay</Link></li>
            <li><Link to="/verify-identity" className="hover:text-white">Verify Relay</Link></li>
            <li><a href="/llms.txt" className="hover:text-white">llms.txt</a></li>
            <li><a href="/sitemap.xml" className="hover:text-white">Sitemap</a></li>
          </ul>
        </div>
      </div>

      <AIFooter />

      <div className="w-full pointer-events-none select-none overflow-hidden flex justify-center mt-4 -mb-4 md:-mb-8 px-4 md:px-12" aria-hidden="true">
        <svg viewBox="0 0 1000 280" className="w-full h-auto opacity-[0.03]" preserveAspectRatio="xMidYMid meet">
          <text x="50%" y="80%" textAnchor="middle" className="font-pixel-square tracking-tight fill-white uppercase" fontSize="240">RELAY</text>
        </svg>
      </div>

      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-white/35 pb-6 pt-6 px-6 gap-4">
        <span>© 2026 Relay · MIT licensed · Files go device to device, never through our servers.</span>
        <span>Built by <a href={SITE.author.url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-brand-neon border-b border-white/20 pb-0.5">{SITE.author.name}</a></span>
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
  const fonts = [GeistSans, GeistMono, GeistPixelSquare, GeistPixelGrid, GeistPixelCircle, GeistPixelTriangle, GeistPixelLine].map((f) => f.variable).join(' ');
  return (
    <div className={`min-h-screen relative flex flex-col font-sans text-white bg-[#03040a] selection:bg-brand-neon/30 selection:text-white overflow-x-hidden w-full max-w-[100vw] ${fonts}`}>
      <ScrollToTop />
      <Atmosphere />
      <Header />
      <main className="flex-1 flex flex-col relative z-10 pt-20 md:pt-24">
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
  );
}
