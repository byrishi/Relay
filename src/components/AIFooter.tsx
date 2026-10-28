import openai from '../assets/ai/openai.svg?raw';
import claude from '../assets/ai/claude-color.svg?raw';
import perplexity from '../assets/ai/perplexity-color.svg?raw';
import gemini from '../assets/ai/gemini-color.svg?raw';

const Q = encodeURIComponent('What is Relay (relay.rishishah.in) and how does its peer-to-peer, end-to-end encrypted file transfer work? Is it safe to use?');

// Brand marks from @lobehub/icons (MIT). Used only to link to each assistant.
const svg = (raw: string) => raw.replace(/<title>.*?<\/title>/, '').replace(/width="1em"/, 'width="100%"').replace(/height="1em"/, 'height="100%"').replace(/style="[^"]*"/, '');

/** The four assistants, each opened with question `q` (already URI-encoded) pre-filled. */
export const aiTools = (q: string) => [
  { name: 'ChatGPT', by: 'OpenAI', href: `https://chatgpt.com/?q=${q}`, logo: svg(openai), tint: 'text-black' },
  { name: 'Claude', by: 'Anthropic', href: `https://claude.ai/new?q=${q}`, logo: svg(claude), tint: '' },
  { name: 'Google AI', by: 'Gemini in AI Mode', href: `https://www.google.com/search?q=${q}&udm=50`, logo: svg(gemini), tint: '' },
  { name: 'Perplexity', by: 'Perplexity', href: `https://www.perplexity.ai/search?q=${q}`, logo: svg(perplexity), tint: '' },
];
const tools = aiTools(Q);

export default function AIFooter() {
  return (
    <section aria-labelledby="ask-ai" className="w-full max-w-[1200px] mx-auto px-6 mb-24">
      <div className="grid md:grid-cols-12 gap-8 md:gap-10 items-center">
        <div className="md:col-span-5">
          <h2 id="ask-ai" className="text-[26px] md:text-[30px] font-semibold tracking-[-0.035em] leading-[1.1]">Get a second opinion</h2>
          <p className="text-fg-2 mt-3 leading-relaxed max-w-[42ch]">Ask an AI assistant whether Relay is safe. Each one opens with the question already asked.</p>
        </div>
        <ul className="md:col-span-7 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tools.map((t) => (
            <li key={t.name}>
              <a href={t.href} target="_blank" rel="noopener noreferrer"
                className="group h-full flex items-center gap-3 p-3.5 rounded-xl panel hover:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)] transition-shadow">
                <span className={`w-9 h-9 shrink-0 rounded-lg bg-white flex items-center justify-center p-[7px] ${t.tint}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: t.logo }} />
                <span className="flex flex-col min-w-0">
                  <span className="text-[14px] font-medium text-fg">{t.name}<span className="sr-only"> (opens in a new tab)</span></span>
                  <span className="text-[12.5px] text-fg-3 truncate">{t.by}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
