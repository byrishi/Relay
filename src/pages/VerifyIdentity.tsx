import React from "react";
import { Search, Bot, Globe, ExternalLink, ShieldCheck, User } from "lucide-react";
import { Link } from "react-router-dom";

export default function VerifyIdentity() {
  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-24 min-h-[80vh] flex flex-col justify-center">
      <div className="flex items-center gap-4 mb-4 text-brand-neon">
        <ShieldCheck className="w-8 h-8" />
        <h1 className="font-pixel-square text-2xl md:text-4xl tracking-tight uppercase">Verify Identity</h1>
      </div>
      
      <p className="text-xl md:text-2xl text-white/80 font-sans leading-relaxed mb-12 max-w-3xl">
        Relay operates strictly on a zero-knowledge trust model. We believe you should verify tools handling sensitive data independently. Use the external verification links below to research Relay and its developer, Rishi Shah.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        <a
          href="https://chatgpt.com/?q=What+is+the+website+relay.rishishah.in+and+what+does+it+do+and+who+is+Rishi+Shah"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-4 p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-neon/30 transition-all rounded-2xl group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-brand-neon/20 group-hover:text-brand-neon transition-colors">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-pixel-line uppercase tracking-wider text-xl mb-2 flex items-center gap-2">
              Ask ChatGPT <ExternalLink className="w-4 h-4 opacity-50" />
            </h3>
            <p className="text-white/60 font-sans text-sm">
              Query OpenAI's models to independently verify the underlying technology, domain reputation, and security model of Relay.
            </p>
          </div>
        </a>

        <a
          href="https://www.perplexity.ai/search?q=Explain+the+app+at+relay.rishishah.in+and+its+technology"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-4 p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-neon/30 transition-all rounded-2xl group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-brand-neon/20 group-hover:text-brand-neon transition-colors">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-pixel-line uppercase tracking-wider text-xl mb-2 flex items-center gap-2">
              Ask Perplexity <ExternalLink className="w-4 h-4 opacity-50" />
            </h3>
            <p className="text-white/60 font-sans text-sm">
              Use Perplexity's deep search engine to aggregate recent web data concerning Relay's open-source architecture.
            </p>
          </div>
        </a>

        <a
          href="https://www.google.com/search?q=%22relay.rishishah.in%22+OR+site:relay.rishishah.in+Rishi+Shah"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-4 p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-neon/30 transition-all rounded-2xl group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-brand-neon/20 group-hover:text-brand-neon transition-colors">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-pixel-line uppercase tracking-wider text-xl mb-2 flex items-center gap-2">
              Search Google <ExternalLink className="w-4 h-4 opacity-50" />
            </h3>
            <p className="text-white/60 font-sans text-sm">
              Perform a standard footprint search to visually confirm Relay's index presence and developer records.
            </p>
          </div>
        </a>

        <a
          href="https://rishishah.in"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-4 p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-neon/30 transition-all rounded-2xl group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-brand-neon/20 group-hover:text-brand-neon transition-colors">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-pixel-line uppercase tracking-wider text-xl mb-2 flex items-center gap-2">
              Developer Profile <ExternalLink className="w-4 h-4 opacity-50" />
            </h3>
            <p className="text-white/60 font-sans text-sm">
              Visit Rishi Shah's personal portfolio domain to verify the author and maintainer behind the Relay infrastructure.
            </p>
          </div>
        </a>
      </div>

      <div className="p-8 border border-white/10 bg-surface/80 rounded-2xl">
        <h3 className="text-xl font-bold mb-4">Why doesn't Relay require user accounts?</h3>
        <p className="text-white/70 font-sans mb-4">
          Identity management systems inherently collect personal data, email addresses, and usage footprints. Because Relay is purely a transport utility (we don't store your files), we intentionally removed account registration to maintain absolute zero-knowledge compliance. The only identities that matter are the devices connecting directly via WebRTC.
        </p>
        <Link to="/security" className="text-brand-neon hover:text-white transition-colors underline decoration-brand-neon/30 hover:decoration-white/50 underline-offset-4">
          Read more about the security model &rarr;
        </Link>
      </div>
    </div>
  );
}
