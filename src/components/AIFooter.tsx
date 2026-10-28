import { Bot, Sparkles, Search, MessageCircle } from 'lucide-react';

const Q = encodeURIComponent('What is Relay (relay.rishishah.in) and how does its peer-to-peer, end-to-end encrypted file transfer work? Is it safe?');

const tools = [
  { name: 'ChatGPT', href: `https://chatgpt.com/?q=${Q}`, icon: Bot, body: 'Ask how Relay sends files directly between devices.' },
  { name: 'Claude', href: `https://claude.ai/new?q=${Q}`, icon: MessageCircle, body: 'Ask about Relay’s security model and safety numbers.' },
  { name: 'Perplexity', href: `https://www.perplexity.ai/search?q=${Q}`, icon: Search, body: 'See sources that describe Relay and peer-to-peer transfer.' },
  { name: 'Google AI', href: `https://www.google.com/search?q=${Q}&udm=50`, icon: Sparkles, body: 'Compare Relay with other ways to share files.' },
];

export default function AIFooter() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center mb-16 md:mb-24">
      <div className="text-center mb-10">
        <h2 className="text-white font-pixel-line uppercase tracking-widest text-2xl md:text-3xl mb-4">Ask AI about Relay</h2>
        <p className="text-white/70 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">Don’t take our word for it. Ask an AI assistant to explain how Relay works and whether it is safe.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
        {tools.map(({ name, href, icon: Icon, body }) => (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer"
            className="group flex items-start p-5 gap-4 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-neon/50 hover:bg-white/10 transition-all backdrop-blur-md">
            <div className="p-3 rounded-xl bg-white/10 shrink-0 border border-white/5 group-hover:border-brand-neon/30"><Icon className="w-6 h-6 text-white" /></div>
            <div className="flex flex-col pt-0.5">
              <span className="font-semibold text-white mb-1">Ask {name}<span className="sr-only"> (opens in a new tab)</span></span>
              <span className="text-xs text-white/75 leading-relaxed">{body}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
