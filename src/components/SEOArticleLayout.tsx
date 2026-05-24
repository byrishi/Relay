import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Share2, Check, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SEOArticleLayoutProps {
  title: string;
  metaDescription: string;
  h1: string;
  children: React.ReactNode;
}

export default function SEOArticleLayout({ title, metaDescription, h1, children }: SEOArticleLayoutProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${title} | Relay`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", metaDescription);
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = metaDescription;
      document.head.appendChild(meta);
    }
  }, [title, metaDescription, pathname]);

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-16 md:py-24 font-sans text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-12 md:gap-16"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-brand-neon font-pixel-grid text-sm tracking-widest uppercase hover:text-white transition-colors w-fit group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Relay
        </Link>
        <div className="max-w-4xl">
           <div className="inline-flex items-center gap-3 px-4 py-2 border border-brand-neon/30 bg-brand-neon/5 tracking-widest text-[10px] font-bold text-brand-neon uppercase font-pixel-grid mb-8">
              <Shield className="w-4 h-4" />
              Technical Guide
            </div>
          <h1 className="text-4xl md:text-6xl font-pixel-square uppercase tracking-tighter mb-8 leading-tight">
            {h1}
          </h1>
        </div>

        <article className="prose prose-invert prose-lg max-w-none prose-headings:font-pixel-line prose-headings:tracking-widest prose-headings:uppercase prose-p:text-white/70 prose-p:leading-relaxed prose-a:text-brand-neon prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-li:text-white/70">
          {children}
        </article>

        <div className="mt-16 p-8 border border-white/10 bg-surface/50 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-2">
             <h3 className="text-2xl font-pixel-square uppercase tracking-tight text-white mt-0">Ready to transfer files directly?</h3>
             <p className="text-white/60 m-0 leading-relaxed font-sans">No accounts. No uploads. Fully encrypted WebRTC transit.</p>
          </div>
          <Link to="/" className="px-8 py-4 bg-brand-neon text-surface font-pixel-grid uppercase tracking-widest text-sm hover:bg-white transition-colors flex-shrink-0">
             Launch App
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
