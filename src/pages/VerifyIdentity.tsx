import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Github, Search, User } from 'lucide-react';
import { aiTools } from '../components/AIFooter';
import { SITE } from '../content/site';

const Q = encodeURIComponent('What is relay.rishishah.in, what does it do, who is Rishi Shah who built it, and is it trustworthy for sending private files?');

const OTHER = [
  { icon: Github, name: 'Read the source', by: 'GitHub, MIT licensed', href: SITE.github },
  { icon: Search, name: 'Search Google', by: 'Footprint and reputation', href: 'https://www.google.com/search?q=%22relay.rishishah.in%22+OR+%22Rishi+Shah%22+Relay' },
  { icon: User, name: 'Meet the developer', by: 'rishishah.in', href: SITE.author.url },
];

const tile = 'group h-full flex items-center gap-4 p-4 pr-5 rounded-[20px] bg-paper shadow-[inset_0_0_0_1px_var(--color-line)] hover:shadow-[inset_0_0_0_1.5px_var(--color-signal)] transition-shadow';

export default function VerifyIdentity() {
  useEffect(() => { document.title = 'Verify Relay and its developer | Relay'; }, []);
  return (
    <div className="wrap pt-8 md:pt-10">
      <header className="grid md:grid-cols-12">
        <h1 className="display md:col-span-10 text-[58px] sm:text-[84px] md:text-[120px] xl:text-[140px] text-signal" style={{ ['--w' as string]: 3.4 }}>Check Relay for yourself.</h1>
        <p className="md:col-start-7 md:col-span-6 text-[19px] md:text-[21px] text-ink-2 mt-8 leading-relaxed">You shouldn't have to take a file tool's word for it. Ask an assistant, read the code, or look up the person who built it. Every link opens in a new tab.</p>
      </header>

      <section aria-labelledby="ask-title" className="mt-20 md:mt-28">
        <h2 id="ask-title" className="display text-[40px] md:text-[52px]" style={{ ['--w' as string]: 3.5 }}>Ask an AI assistant</h2>
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {aiTools(Q).map((t) => (
            <li key={t.name}>
              <a href={t.href} target="_blank" rel="noopener noreferrer" className={tile} data-cursor="Ask">
                <span className={`w-11 h-11 shrink-0 rounded-full bg-white shadow-[inset_0_0_0_1px_var(--color-line)] flex items-center justify-center p-2.5 ${t.tint}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: t.logo }} />
                <span className="flex flex-col flex-1 min-w-0">
                  <span className="text-[17px] font-medium">Ask {t.name}<span className="sr-only"> (opens in a new tab)</span></span>
                  <span className="text-[14px] text-ink-3">{t.by}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="check-title" className="mt-16">
        <h2 id="check-title" className="display text-[40px] md:text-[52px]" style={{ ['--w' as string]: 3.5 }}>Check the evidence</h2>
        <ul className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          {OTHER.map(({ icon: Icon, name, by, href }) => (
            <li key={name}>
              <a href={href} target="_blank" rel="noopener noreferrer" className={tile}>
                <span className="w-11 h-11 shrink-0 rounded-full bg-signal text-white flex items-center justify-center" aria-hidden="true"><Icon className="w-[18px] h-[18px]" /></span>
                <span className="flex flex-col flex-1 min-w-0">
                  <span className="text-[17px] font-medium">{name}<span className="sr-only"> (opens in a new tab)</span></span>
                  <span className="text-[14px] text-ink-3">{by}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="noacct-title" className="mt-16 rounded-[28px] bg-signal text-white p-7 md:p-10 grid md:grid-cols-12 gap-6">
        <h2 id="noacct-title" className="md:col-span-5 display text-[44px] md:text-[60px]" style={{ ['--w' as string]: 3.4 }}>Why there are no accounts</h2>
        <div className="md:col-span-7">
          <p className="text-dev-fg-2 leading-relaxed text-[18px]">Accounts mean collecting emails, passwords and a history of who sent what to whom. Relay only connects two devices while the page is open and never stores your files, so it doesn't need to know who you are. The only identities that matter are the two devices, and you can confirm those with the safety number.</p>
          <Link to="/security" className="key key-signal mt-8">Read the security model</Link>
        </div>
      </section>
    </div>
  );
}
