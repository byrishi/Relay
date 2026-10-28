import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Github, Search, User } from 'lucide-react';
import { aiTools } from '../components/AIFooter';
import { SITE } from '../content/site';

const Q = encodeURIComponent('What is relay.rishishah.in, what does it do, who is Rishi Shah who built it, and is it trustworthy for sending private files?');

const OTHER = [
  { icon: Github, name: 'Read the source', by: 'GitHub, MIT licensed', href: SITE.github },
  { icon: Search, name: 'Search Google', by: 'Footprint and reputation', href: 'https://www.google.com/search?q=%22relay.rishishah.in%22+OR+%22Rishi+Shah%22+Relay' },
  { icon: User, name: 'Meet the developer', by: 'rishishah.in', href: SITE.author.url },
];

const tile = 'group h-full flex items-center gap-3.5 p-4 rounded-xl panel hover:shadow-[inset_0_0_0_1px_var(--color-line3)] transition-shadow';

export default function VerifyIdentity() {
  useEffect(() => { document.title = 'Verify Relay and its developer | Relay'; }, []);
  return (
    <div className="relative w-full">
      <div className="hero-glow absolute left-1/2 -translate-x-1/2 -top-56 w-[1100px] h-[700px] pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-[1200px] mx-auto px-6 pt-16 md:pt-24">
        <header className="max-w-[720px]">
          <p className="text-[14px] font-medium text-acc">Independent check</p>
          <h1 className="mt-3 text-[44px] md:text-[64px] font-semibold tracking-[var(--tr-1)] leading-[1] h-hero pb-1">Verify Relay yourself.</h1>
          <p className="text-[18px] md:text-[20px] text-fg-2 mt-6 leading-relaxed">You shouldn't have to take a file tool's word for it. Ask an assistant, read the code, or look up the person who built it. Every link opens in a new tab.</p>
        </header>

        <section aria-labelledby="ask-title" className="mt-16">
          <h2 id="ask-title" className="text-[20px] font-semibold tracking-[-0.025em]">Ask an AI assistant</h2>
          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {aiTools(Q).map((t) => (
              <li key={t.name}>
                <a href={t.href} target="_blank" rel="noopener noreferrer" className={tile}>
                  <span className={`w-10 h-10 shrink-0 rounded-lg bg-white flex items-center justify-center p-2 ${t.tint}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: t.logo }} />
                  <span className="flex flex-col flex-1 min-w-0">
                    <span className="text-[14.5px] font-medium text-fg">Ask {t.name}<span className="sr-only"> (opens in a new tab)</span></span>
                    <span className="text-[12.5px] text-fg-3">{t.by}</span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-fg-3 group-hover:text-fg" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="check-title" className="mt-14">
          <h2 id="check-title" className="text-[20px] font-semibold tracking-[-0.025em]">Check the evidence</h2>
          <ul className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            {OTHER.map(({ icon: Icon, name, by, href }) => (
              <li key={name}>
                <a href={href} target="_blank" rel="noopener noreferrer" className={tile}>
                  <span className="w-10 h-10 shrink-0 rounded-lg bg-tint/[0.06] flex items-center justify-center" aria-hidden="true"><Icon className="w-[18px] h-[18px] text-fg" /></span>
                  <span className="flex flex-col flex-1 min-w-0">
                    <span className="text-[14.5px] font-medium text-fg">{name}<span className="sr-only"> (opens in a new tab)</span></span>
                    <span className="text-[12.5px] text-fg-3">{by}</span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-fg-3 group-hover:text-fg" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="noacct-title" className="mt-14 panel rounded-2xl p-7 md:p-10 grid md:grid-cols-[1fr_1.5fr] gap-6 md:gap-12">
          <h2 id="noacct-title" className="text-[24px] md:text-[28px] font-semibold tracking-[var(--tr-2)] leading-tight">Why there are no accounts</h2>
          <div>
            <p className="text-fg-2 leading-relaxed">Accounts mean collecting emails, passwords and a history of who sent what to whom. Relay only connects two devices while the page is open and never stores your files, so it doesn't need to know who you are. The only identities that matter are the two devices, and you can confirm those with the safety number.</p>
            <Link to="/security" className="inline-block mt-5 text-[14.5px] text-fg underline underline-offset-4 decoration-tint/25 hover:decoration-fg">Read the security model</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
