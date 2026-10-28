import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Github, Search, User, ArrowRight } from 'lucide-react';
import { aiTools } from '../components/AIFooter';
import { RelayTile } from '../brand/Logo';
import { SITE } from '../content/site';

const Q = encodeURIComponent('What is relay.rishishah.in, what does it do, who is Rishi Shah who built it, and is it trustworthy for sending private files?');

const OTHER = [
  { icon: Github, name: 'Read the source', by: 'GitHub · MIT licensed', href: SITE.github },
  { icon: Search, name: 'Search Google', by: 'Footprint and reputation', href: 'https://www.google.com/search?q=%22relay.rishishah.in%22+OR+%22Rishi+Shah%22+Relay' },
  { icon: User, name: 'Meet the developer', by: 'rishishah.in', href: SITE.author.url },
];

export default function VerifyIdentity() {
  useEffect(() => { document.title = 'Verify Relay and its developer | Relay'; }, []);
  const tile = 'group flex items-center gap-4 p-5 rounded-3xl bg-white border border-ink/10 hover:border-ink/30 hover:-translate-y-0.5 transition-all';
  return (
    <div className="w-full max-w-6xl mx-auto px-5 md:px-8 py-6 md:py-12 text-ink">
      <header className="max-w-3xl">
        <RelayTile className="w-14 h-14" />
        <p className="eyebrow mt-8">Independent check</p>
        <h1 className="mt-3 text-[44px] md:text-[72px] font-semibold tracking-[-0.045em] leading-[1]">Verify Relay <em className="font-serif italic font-normal tracking-normal text-dawn pr-1">yourself</em></h1>
        <p className="text-lg md:text-xl text-ink-2 mt-6 leading-relaxed">You shouldn't have to take a file tool's word for it. Ask an assistant, read the code, or look up the person who built it. Every link opens in a new tab with the question already filled in.</p>
      </header>

      <section aria-labelledby="ask-title" className="mt-14">
        <h2 id="ask-title" className="eyebrow pb-3 border-b border-ink/15">Ask an AI assistant</h2>
        <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {aiTools(Q).map((t) => (
            <li key={t.name}>
              <a href={t.href} target="_blank" rel="noopener noreferrer" className={tile}>
                <span className={`w-12 h-12 shrink-0 rounded-2xl bg-paper flex items-center justify-center p-2.5 ${t.tint}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: t.logo }} />
                <span className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold text-ink">Ask {t.name}<span className="sr-only"> (opens in a new tab)</span></span>
                  <span className="text-xs text-ink-3">{t.by}</span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-ink-3 group-hover:text-ink" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="check-title" className="mt-12">
        <h2 id="check-title" className="eyebrow pb-3 border-b border-ink/15">Check the evidence</h2>
        <ul className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {OTHER.map(({ icon: Icon, name, by, href }) => (
            <li key={name}>
              <a href={href} target="_blank" rel="noopener noreferrer" className={tile}>
                <span className="w-12 h-12 shrink-0 rounded-2xl bg-paper flex items-center justify-center" aria-hidden="true"><Icon className="w-5 h-5 text-brand" /></span>
                <span className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold text-ink">{name}<span className="sr-only"> (opens in a new tab)</span></span>
                  <span className="text-xs text-ink-3">{by}</span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-ink-3 group-hover:text-ink" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="noacct-title" className="mt-12 card rounded-[32px] p-7 md:p-10 grid md:grid-cols-[1fr_1.4fr] gap-6 md:gap-12">
        <h2 id="noacct-title" className="text-2xl md:text-3xl font-semibold tracking-tight">Why there are <em className="font-serif italic font-normal">no accounts</em></h2>
        <div>
          <p className="text-ink-2 leading-relaxed">Accounts mean collecting emails, passwords and a history of who sent what to whom. Relay only connects two devices for as long as the page is open and never stores your files, so it doesn't need to know who you are. The only identities that matter are the two devices, and you can confirm those with the safety number.</p>
          <Link to="/security" className="inline-flex items-center gap-1.5 mt-5 text-[15px] font-medium text-ink hover:text-indigo">Read the security model <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
