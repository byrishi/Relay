import React from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
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
              <FileText className="w-4 h-4" />
              Legal Terms
            </div>
          <h1 className="text-5xl md:text-7xl font-pixel-square uppercase tracking-tighter mb-6 leading-tight">
            Terms of Service
          </h1>
          <p className="text-xl text-white/50 leading-relaxed font-sans mt-4">
            Last Updated: May 24, 2026
          </p>
        </div>

        <div className="flex flex-col gap-12">
          
          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">1. Acceptance of Terms</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p>By accessing or using Relay, you agree to be bound by these Terms of Service. Relay is provided "as is" and intended strictly for the point-to-point transfer of files. If you do not agree, do not use the application.</p>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">2. Description of Service</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p>Relay is a decentralized, browser-to-browser file transfer tool utilizing WebRTC. The service merely facilitates the initial connection. The core transit occurs directly over the network between endpoints.</p>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">3. User Responsibility & Conduct</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p>Because Relay has no central storage and cannot inspect traffic, you are solely responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 text-white/70">
                <li>The contents of any file you share or receive.</li>
                <li>Ensuring you do not distribute malware, illegal content, or intellectual property without proper authorization.</li>
                <li>Verifying the identity of the person you are communicating with in a room.</li>
              </ul>
              <p>We do not monitor, endorse, or manage any content transferred using this tool.</p>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">4. Disclaimers & Warranties</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p><strong>Relay is provided "as is," without warranty of any kind.</strong> We make no guarantees that the service will be available, secure, fast, or reliable in all network conditions. Transfer success depends heavily on restrictive firewalls, NATs, and ISP configurations.</p>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">5. Limitation of Liability</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p>In no event shall the creators, maintainers, or contributors of Relay be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the service, including but not limited to lost data, missed transfers, or network interceptions resulting from compromised local endpoints.</p>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-pixel-line uppercase tracking-widest text-white border-b border-white/10 pb-4">6. Open Source Software</h2>
            <div className="text-white/60 font-sans leading-relaxed space-y-4">
              <p>Relay is open-source software distributed under the MIT License. These Terms of Service govern the use of the hosted application instance provided. If you self-host Relay, you are free to define your own terms and responsibilities.</p>
            </div>
          </section>
          
        </div>
      </motion.div>
    </div>
  );
}
