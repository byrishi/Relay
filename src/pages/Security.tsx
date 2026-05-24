import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, FileKey, EyeOff, Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Security() {
  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-16 md:py-24 font-sans text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-16"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-brand-neon font-mono text-sm tracking-widest uppercase hover:text-white transition-colors w-fit group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return to Home
        </Link>
        <div className="max-w-3xl">
           <div className="inline-flex items-center gap-3 px-4 py-2 border border-brand-neon bg-brand-neon-dim tracking-widest text-[10px] font-bold text-brand-neon uppercase font-mono mb-8">
              <ShieldCheck className="w-4 h-4" />
              Security Whitepaper
            </div>
          <h1 className="text-5xl md:text-7xl font-display font-semibold uppercase tracking-tighter mb-6 leading-tight">
            Paranoid by Default
          </h1>
          <p className="text-xl md:text-2xl text-white/50 leading-relaxed font-medium">
            Relay is designed on the zero-trust principle. Our servers are stupid by design; they exist only to shake hands.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <div className="p-8 md:p-12 border border-surface-border bg-surface-hover flex flex-col md:flex-row gap-12 items-start">
            <div className="w-20 h-20 shrink-0 bg-brand-neon flex items-center justify-center">
               <Lock className="w-10 h-10 text-black" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-bold mb-4 uppercase tracking-tight">End-to-End Encryption</h2>
              <p className="text-white/60 font-mono text-sm leading-relaxed mb-6">
                Every byte transferred over Relay is encrypted using WebRTC's mandatory DTLS (Datagram Transport Layer Security) and SRTP (Secure Real-time Transport Protocol). The encryption keys are generated locally on your device and exchanged directly with your peer, bypassing our signaling servers entirely.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-surface-border inline-flex">
                 <div>
                    <div className="text-[10px] font-bold text-white/30 tracking-widest uppercase mb-1">Cipher Suite</div>
                    <div className="font-mono text-brand-neon">AES-256-GCM</div>
                 </div>
                 <div>
                    <div className="text-[10px] font-bold text-white/30 tracking-widest uppercase mb-1">Key Exchange</div>
                    <div className="font-mono text-brand-neon">ECDHE</div>
                 </div>
                 <div>
                    <div className="text-[10px] font-bold text-white/30 tracking-widest uppercase mb-1">Transport</div>
                    <div className="font-mono text-brand-neon">DTLS 1.2+</div>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 md:p-12 border border-surface-border bg-surface flex flex-col md:flex-row gap-12 items-start opacity-70 hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 shrink-0 bg-white/10 flex items-center justify-center">
               <EyeOff className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold mb-4 uppercase tracking-tight">Zero Knowledge Signaling</h2>
              <p className="text-white/60 font-mono text-sm leading-relaxed">
                The only thing our servers see are encrypted SDP (Session Description Protocol) offers and ICE candidates. These contain network routing information, not your data. We do not log IP addresses, we do not require accounts, and we have no database.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
