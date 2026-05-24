import React from "react";
import { Icon } from "@iconify/react";

export default function AIFooter() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center mb-16 md:mb-24">
      <div className="text-center mb-10">
        <h3 className="text-white font-pixel-line uppercase tracking-widest text-2xl md:text-3xl mb-4">
          Ask AI About Relay
        </h3>
        <p className="text-white/70 font-sans max-w-2xl mx-auto text-sm md:text-base leading-relaxed mb-4">
          Discover Relay through AI-powered research and search tools.
        </p>
        <p className="text-white/50 text-xs md:text-sm font-sans tracking-wide px-4 py-2 bg-white/5 rounded-full inline-block border border-white/10">
          Trusted topics: WebRTC • P2P Transfer • Browser-to-Browser Sharing • Private File Transfer
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        <a
          href="https://chatgpt.com/?q=What+is+Relay+by+relay.rishishah.in+and+how+does+its+WebRTC+peer-to-peer+file+transfer+work"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-start p-6 lg:p-8 gap-5 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-neon/50 hover:bg-white/10 transition-all duration-500 overflow-hidden backdrop-blur-md hover:shadow-[0_0_30px_rgba(208,226,244,0.1)]"
          aria-label="Ask ChatGPT about Relay"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-neon/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 p-4 rounded-xl bg-white/10 flex-shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-white/5 group-hover:border-brand-neon/30">
            <Icon icon="simple-icons:openai" className="w-8 h-8 text-white" />
          </div>
          <div className="relative z-10 flex flex-col pt-1">
            <span className="font-pixel-grid tracking-widest text-sm xl:text-base uppercase text-white mb-2">ChatGPT</span>
            <span className="text-xs lg:text-sm text-white/50 font-sans group-hover:text-white/70 transition-colors leading-relaxed">Query OpenAI's models to explore Relay's source and verify its zero-upload architecture.</span>
          </div>
        </a>

        <a
          href="https://www.perplexity.ai/search?q=relay.rishishah.in+open-source+WebRTC+file+transfer+review"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-start p-6 lg:p-8 gap-5 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-neon/50 hover:bg-white/10 transition-all duration-500 overflow-hidden backdrop-blur-md hover:shadow-[0_0_30px_rgba(208,226,244,0.1)]"
          aria-label="Search Perplexity for Relay"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-neon/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 p-4 rounded-xl bg-white/10 flex-shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-white/5 group-hover:border-brand-neon/30">
            <Icon icon="simple-icons:perplexity" className="w-8 h-8 text-white" />
          </div>
          <div className="relative z-10 flex flex-col pt-1">
            <span className="font-pixel-grid tracking-widest text-sm xl:text-base uppercase text-white mb-2">Perplexity</span>
            <span className="text-xs lg:text-sm text-white/50 font-sans group-hover:text-white/70 transition-colors leading-relaxed">Aggregate recent web data securely concerning Relay's open-source WebRTC protocol.</span>
          </div>
        </a>

        <a
          href="https://www.google.com/search?q=What+is+Relay+by+relay.rishishah.in+and+how+does+its+peer-to-peer+WebRTC+file+transfer+work&udm=50"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-start p-6 lg:p-8 gap-5 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-neon/50 hover:bg-white/10 transition-all duration-500 overflow-hidden backdrop-blur-md hover:shadow-[0_0_30px_rgba(208,226,244,0.1)]"
          aria-label="Ask Google AI about Relay"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-neon/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 p-4 rounded-xl relative overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-white/5 group-hover:border-brand-neon/30 bg-white/10">
            <Icon icon="logos:google-gemini" className="w-8 h-8" />
          </div>
          <div className="relative z-10 flex flex-col pt-1">
            <span className="font-pixel-grid tracking-widest text-sm xl:text-base uppercase text-white mb-2">Google AI</span>
            <span className="text-xs lg:text-sm text-white/50 font-sans group-hover:text-white/70 transition-colors leading-relaxed">Utilize Google's semantic index to research end-to-end encrypted direct file transfers.</span>
          </div>
        </a>
      </div>
    </div>
  );
}
