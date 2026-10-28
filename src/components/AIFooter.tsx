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

/** A quiet row in the footer: ask an assistant about Relay. */
export default function AIFooter() {
  return (
    <div className="mt-8">
      <h2 className="text-[14px] text-ink-3">Ask an assistant whether Relay is safe</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {tools.map((t) => (
          <li key={t.name}>
            <a href={t.href} target="_blank" rel="noopener noreferrer"
              className="h-10 pl-1.5 pr-4 inline-flex items-center gap-2 rounded-full bg-paper shadow-[inset_0_0_0_1px_var(--color-line)] text-[15px] hover:shadow-[inset_0_0_0_1.5px_var(--color-signal)] transition-shadow">
              <span className={`w-7 h-7 rounded-full bg-white flex items-center justify-center p-1.5 ${t.tint}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: t.logo }} />
              {t.name}<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
