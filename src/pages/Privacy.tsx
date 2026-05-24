import React from 'react';
import { motion } from 'motion/react';
import { Shield, EyeOff, ServerOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-16 md:py-24 font-sans text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-16"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-brand-neon font-pixel-grid text-sm tracking-widest uppercase hover:text-white transition-colors w-fit group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return to Home
        </Link>
        <div className="max-w-3xl">
           <div className="inline-flex items-center gap-3 px-4 py-2 border border-brand-neon/30 bg-brand-neon/5 tracking-widest text-[10px] font-bold text-brand-neon uppercase font-pixel-grid mb-8">
              <Shield className="w-4 h-4" />
              Privacy Policy
            </div>
          <h1 className="text-5xl md:text-7xl font-pixel-square uppercase tracking-tighter mb-6 leading-tight">
            Privacy Policy
          </h1>
          <p className="text-xl text-white/50 leading-relaxed font-sans mt-4">
            Last Updated: May 24, 2026
          </p>
          <p className="text-xl md:text-2xl text-white/80 leading-relaxed font-medium mt-6 bg-surface/50 p-6 rounded-xl border border-surface-border">
            Relay is built on the principle that your data is yours. We do not store your files, we do not require an account, and we cannot read what you send.
          </p>
        </div>

        <div className="flex flex-col gap-12">
          
          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">1. Data We Do Not Collect</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p>Relay is designed to minimize data collection. Specifically, we <strong>do not</strong> collect or store:</p>
              <ul className="list-disc pl-6 space-y-2 text-white/70">
                <li><strong>Your Files:</strong> Files are transferred point-to-point between browsers using WebRTC. They do not pass through or reside on our servers.</li>
                <li><strong>Personal Identity information:</strong> We do not ask for your name, email, or phone number. There are no user accounts.</li>
                <li><strong>Transfer Contents:</strong> We cannot decrypt or inspect the files or messages you send. All WebRTC DataChannels are End-to-End Encrypted (E2EE) using DTLS/SRTP.</li>
              </ul>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">2. Role of the Signaling Server</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p>To establish a peer-to-peer connection, Relay operates a signaling server. This server's only purpose is to mediate the initial handshake (SDP offers and ICE candidates) between peers.</p>
              <ul className="list-disc pl-6 space-y-2 text-white/70">
                <li><strong>Ephemeral Data:</strong> Connection metadata (like room codes and network IPs required for WebRTC negotiation) is held only in memory for the duration of the session and dropped immediately after connection or timeout.</li>
                <li><strong>No Logs:</strong> We do not log IP addresses or the contents of signaling exchanges.</li>
              </ul>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">3. Third-Party Services</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p>Relay relies on public STUN servers for NAT traversal (to help browsers discover their public IP addresses). If required, your browser may communicate with these servers. STUN servers do not handle your files, only connection routing.</p>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">4. Local Storage & Cookies</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p>Relay does not use tracking cookies. The application performs file processing locally within your browser's memory and may use standard browser APIs (like OPFS or Blob storage) temporarily to assemble files before you save them to your disk.</p>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">5. Open Source Transparency</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p>Relay is open-source. Our privacy claims can be independently verified by inspecting the codebase. We encourage security researchers to audit our networking implementation.</p>
            </div>
          </section>
          
        </div>
      </motion.div>
    </div>
  );
}
