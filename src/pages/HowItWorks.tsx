import React from 'react';
import { motion } from 'motion/react';
import { Zap, ShieldCheck, WifiOff, HardDrive, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HowItWorks() {
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
          <h1 className="text-5xl md:text-7xl font-display font-semibold uppercase tracking-tighter mb-6 leading-tight">
            How Relativity Works
          </h1>
          <p className="text-xl md:text-2xl text-white/50 leading-relaxed font-medium">
            Relay creates a direct, peer-to-peer data tunnel between devices. No servers in the middle, no bandwidth limits, infinite scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              icon: <Zap className="w-8 h-8 text-black" />,
              title: "Direct WebRTC Tunnel",
              desc: "We use WebRTC to establish a direct connection between browsers. The signaling server only introduces the devices; it never touches your actual data."
            },
            {
              icon: <ShieldCheck className="w-8 h-8 text-black" />,
              title: "Military Grade E2EE",
              desc: "All files and messages are end-to-end encrypted using AES-256-GCM. We couldn't look at your data even if we tried."
            },
            {
              icon: <WifiOff className="w-8 h-8 text-black" />,
              title: "Local Network Speeds",
              desc: "If both devices are on the same Wi-Fi, the data transfers locally. It doesn't bounce to a cloud server and back. Pure local speed."
            },
            {
              icon: <HardDrive className="w-8 h-8 text-black" />,
              title: "No Server Storage",
              desc: "Files stream directly from the sender's RAM/Disk to the receiver's. There are no intermediate storage buckets or size limits."
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 border border-surface-border bg-surface hover:border-brand-neon transition-colors group">
              <div className="w-16 h-16 bg-brand-neon mb-6 flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform">
                <div className="-rotate-3 group-hover:-rotate-6 transition-transform">{feature.icon}</div>
              </div>
              <h3 className="text-2xl font-display font-bold mb-4 uppercase tracking-tight">{feature.title}</h3>
              <p className="text-white/50 font-mono text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
