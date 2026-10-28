import openai from '../assets/ai/openai.svg?raw';
import claude from '../assets/ai/claude-color.svg?raw';
import perplexity from '../assets/ai/perplexity-color.svg?raw';
import gemini from '../assets/ai/gemini-color.svg?raw';

const Q = encodeURIComponent('What is Relay (relay.rishishah.in) and how does its peer-to-peer, end-to-end encrypted file transfer work? Is it safe to use?');

// Brand marks from @lobehub/icons (MIT). Used only to link to each assistant.
const svg = (raw: string) => raw.replace(/<title>.*?<\/title>/, '').replace(/width="1em"/, 'width="100%"').replace(/height="1em"/, 'height="100%"').replace(/style="[^"]*"/, '');

/** The four assistants, each opened with question `q` (already URI-encoded) pre-filled. */
export const aiTools = (q: string) => [
  { name: 'ChatGPT', by: 'OpenAI', href: `https://chatgpt.com/?q=${q}`, logo: svg(openai), tint: 'text-ink' },
  { name: 'Claude', by: 'Anthropic', href: `https://claude.ai/new?q=${q}`, logo: svg(claude), tint: '' },
  { name: 'Google AI', by: 'Gemini \u00b7 AI Mode', href: `https://www.google.com/search?q=${q}&udm=50`, logo: svg(gemini), tint: '' },
  { name: 'Perplexity', by: 'Perplexity', href: `https://www.perplexity.ai/search?q=${q}`, logo: svg(perplexity), tint: '' },
];
const tools = aiTools(Q);

export default function AIFooter() {
  return (
    <section aria-labelledby="ask-ai" className="w-full max-w-6xl mx-auto px-5 md:px-8 mb-16 md:mb-20">
      <div className="card rounded-[32px] p-6 md:p-10 flex flex-col lg:flex-row gap-8 lg:items-center">
        <div className="lg:max-w-sm">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-3">Second opinion</p>
          <h2 id="ask-ai" className="text-2xl md:text-3xl font-semibold tracking-tight text-ink mt-2">Ask an AI if Relay is <em className="font-serif italic font-normal">safe</em></h2>
          <p className="text-ink-2 mt-3 leading-relaxed">Don’t take our word for it. Each button opens the assistant with the question already asked.</p>
        </div>
        <ul className="grid grid-cols-2 gap-3 flex-1">
          {tools.map((t) => (
            <li key={t.name}>
              <a href={t.href} target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-3 p-4 rounded-2xl bg-white border border-line hover:border-ink/25 hover:-translate-y-0.5 hover:shadow-lg transition-all">
                <span className={`w-10 h-10 shrink-0 rounded-xl bg-paper flex items-center justify-center p-2 ${t.tint}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: t.logo }} />
                <span className="flex flex-col">
                  <span className="font-semibold text-ink">Ask {t.name}<span className="sr-only"> (opens in a new tab)</span></span>
                  <span className="text-xs text-ink-3">{t.by}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
