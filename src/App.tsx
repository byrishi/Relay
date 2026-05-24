import React, { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { ShieldCheck, Menu, X } from "lucide-react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import {
  GeistPixelSquare,
  GeistPixelGrid,
  GeistPixelCircle,
  GeistPixelTriangle,
  GeistPixelLine,
} from "geist/font/pixel";

import Home from "./pages/Home";
import HowItWorks from "./pages/HowItWorks";
import Security from "./pages/Security";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// SEO Pages
import WebRTCFileTransfer from "./pages/seo/WebRTCFileTransfer";
import P2PFileSharing from "./pages/seo/P2PFileSharing";
import NoUploadFileTransfer from "./pages/seo/NoUploadFileTransfer";
import PrivateFileTransfer from "./pages/seo/PrivateFileTransfer";
import BrowserToBrowserTransfer from "./pages/seo/BrowserToBrowserTransfer";
import SendLargeFiles from "./pages/seo/SendLargeFiles";
import RelayVsWeTransfer from "./pages/seo/RelayVsWeTransfer";
import WebRTCSecurity from "./pages/seo/WebRTCSecurity";
import TurnVsStun from "./pages/seo/TurnVsStun";
import OpenSourceFileSharing from "./pages/seo/OpenSourceFileSharing";
import HowP2PWorks from "./pages/seo/HowP2PWorks";
import WeTransferAlternative from "./pages/seo/WeTransferAlternative";
import HowToSendLargeFiles from "./pages/seo/HowToSendLargeFiles";
import HowWebRTCWorks from "./pages/seo/HowWebRTCWorks";
import DirectFileTransfer from "./pages/seo/DirectFileTransfer";
import SelfHostedFileSharing from "./pages/seo/SelfHostedFileSharing";
import RelayVsGoogleDrive from "./pages/seo/RelayVsGoogleDrive";
import RelayVsSnapdrop from "./pages/seo/RelayVsSnapdrop";
import RelayVsShareDrop from "./pages/seo/RelayVsShareDrop";
import SecureDeviceTransfer from "./pages/seo/SecureDeviceTransfer";
import TransferWithoutCloud from "./pages/seo/TransferWithoutCloud";
import TemporaryFileSharing from "./pages/seo/TemporaryFileSharing";
import VerifyIdentity from "./pages/VerifyIdentity";
import AIFooter from "./components/AIFooter";
import ScrollToTop from "./components/ScrollToTop";

function Header() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full h-20 md:h-24 px-4 md:px-8 flex items-center justify-between z-50 backdrop-blur-xl bg-surface/50 border-b border-surface-border shadow-sm ${GeistSans.variable} ${GeistMono.variable}`}
      >
        <Link
          to="/"
          className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
          title="Relay Home"
        >
          <span
            className={`font-pixel-square text-2xl md:text-3xl tracking-tight text-white transition-colors uppercase`}
          >
            Relay
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50 font-sans">
          <Link
            to="/"
            className={`px-4 py-2 rounded-[6px] font-pixel-grid text-xs tracking-widest uppercase hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 ${location.pathname === "/" ? "bg-white/10 text-white" : "hover:bg-white/5 text-white font-semibold"}`}
          >
            Launch App
          </Link>
          <Link
            to="/how-it-works"
            className={`hover:text-white hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 ${location.pathname === "/how-it-works" ? "text-white" : ""}`}
          >
            How It Works
          </Link>
          <Link
            to="/security"
            className={`hover:text-white hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 flex items-center gap-2 ${location.pathname === "/security" ? "text-white" : ""}`}
          >
            <ShieldCheck className="w-4 h-4" /> Security
          </Link>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </header>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <div
          className={`fixed inset-0 top-20 z-40 bg-surface/95 backdrop-blur-3xl border-b border-surface-border flex flex-col p-6 md:hidden ${GeistSans.variable} ${GeistMono.variable}`}
        >
          <nav className="flex flex-col gap-6 text-lg font-medium text-white/70 font-sans mt-4">
            <Link
              onClick={() => setIsMobileMenuOpen(false)}
              to="/"
              className={`hover:text-white transition-colors py-2 border-b border-white/5 font-pixel-grid tracking-widest text-sm uppercase ${location.pathname === "/" ? "text-brand-neon border-brand-neon/30" : ""}`}
            >
              Launch App
            </Link>
            <Link
              onClick={() => setIsMobileMenuOpen(false)}
              to="/how-it-works"
              className={`hover:text-white transition-colors py-2 border-b border-white/5 ${location.pathname === "/how-it-works" ? "text-white border-brand-neon/30" : ""}`}
            >
              How It Works
            </Link>
            <Link
              onClick={() => setIsMobileMenuOpen(false)}
              to="/security"
              className={`hover:text-white transition-colors py-2 border-b border-white/5 flex items-center gap-2 ${location.pathname === "/security" ? "text-white border-brand-neon/30" : ""}`}
            >
              <ShieldCheck className="w-5 h-5" /> Security
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <div
      className={`min-h-screen relative flex flex-col font-sans text-white bg-surface selection:bg-brand-neon/30 selection:text-white overflow-x-hidden w-full max-w-[100vw] ${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelCircle.variable} ${GeistPixelTriangle.variable} ${GeistPixelLine.variable}`}
    >
      <ScrollToTop />
      {/* Premium Grain Texture Overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 400 400%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          mixBlendMode: "soft-light",
        }}
      ></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#F5F2EB] opacity-[0.02] mix-blend-color-burn"></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50 blur-3xl animate-aurora"></div>
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-brand-neon/10 via-transparent to-transparent opacity-50 blur-3xl animate-aurora"
        style={{ animationDelay: "-12.5s" }}
      ></div>
      <Header />
      <div className="flex-1 flex flex-col relative z-10 pt-20 md:pt-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/security" element={<Security />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/webrtc-file-transfer" element={<WebRTCFileTransfer />} />
          <Route path="/peer-to-peer-file-sharing" element={<P2PFileSharing />} />
          <Route path="/send-files-without-uploading" element={<NoUploadFileTransfer />} />
          <Route path="/private-file-transfer" element={<PrivateFileTransfer />} />
          <Route path="/browser-to-browser-file-transfer" element={<BrowserToBrowserTransfer />} />
          <Route path="/best-way-to-send-large-files" element={<SendLargeFiles />} />
          <Route path="/relay-vs-wetransfer" element={<RelayVsWeTransfer />} />
          <Route path="/webrtc-security" element={<WebRTCSecurity />} />
          <Route path="/turn-vs-stun" element={<TurnVsStun />} />
          <Route path="/open-source-file-sharing" element={<OpenSourceFileSharing />} />
          <Route path="/how-p2p-file-transfer-works" element={<HowP2PWorks />} />
          <Route path="/wetransfer-alternative" element={<WeTransferAlternative />} />
          <Route path="/send-large-files" element={<HowToSendLargeFiles />} />
          <Route path="/how-webrtc-file-sharing-works" element={<HowWebRTCWorks />} />
          <Route path="/how-direct-file-transfer-works" element={<DirectFileTransfer />} />
          <Route path="/self-hosted-file-sharing" element={<SelfHostedFileSharing />} />
          <Route path="/relay-vs-google-drive" element={<RelayVsGoogleDrive />} />
          <Route path="/relay-vs-snapdrop" element={<RelayVsSnapdrop />} />
          <Route path="/relay-vs-sharedrop" element={<RelayVsShareDrop />} />
          <Route path="/secure-file-transfer-between-devices" element={<SecureDeviceTransfer />} />
          <Route path="/transfer-files-without-cloud-storage" element={<TransferWithoutCloud />} />
          <Route path="/temporary-file-sharing" element={<TemporaryFileSharing />} />
          <Route path="/verify-identity" element={<VerifyIdentity />} />
        </Routes>
      </div>

      <footer className="w-full max-w-[100vw] relative bg-surface/50 backdrop-blur-lg pt-16 md:pt-24 mt-auto z-10 flex flex-col border-t border-surface-border shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <div className="w-full max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-start gap-12 mb-12 md:mb-32">
          <div className="flex flex-col gap-6 max-w-sm">
            <h4 className="text-white font-pixel-line uppercase tracking-widest text-lg mb-2">
              Navigation
            </h4>
            <div className="flex flex-col gap-3 font-sans text-sm text-white/50">
              <Link
                to="/"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Launch Transfer
              </Link>
              <Link
                to="/how-it-works"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                How It Works
              </Link>
              <Link
                to="/security"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Security
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-6 max-w-sm border-l border-surface-border pl-6">
            <h4 className="text-white font-pixel-line uppercase tracking-widest text-lg mb-2">
              Legal
            </h4>
            <div className="flex flex-col gap-3 font-sans text-sm text-white/50">
              <Link
                to="/privacy"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Terms of Service
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-6 max-w-sm border-l border-surface-border pl-6">
            <h4 className="text-white font-pixel-line uppercase tracking-widest text-lg mb-2">
              Learning Center
            </h4>
            <div className="flex flex-col gap-3 font-sans text-sm text-white/50">
              <Link
                to="/webrtc-file-transfer"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                What is WebRTC Transfer?
              </Link>
              <Link
                to="/peer-to-peer-file-sharing"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                P2P Architecture Guide
              </Link>
              <Link
                to="/send-files-without-uploading"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Zero-Upload Protocols
              </Link>
              <Link
                to="/private-file-transfer"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                True Private Transfers
              </Link>
              <Link
                to="/webrtc-security"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                WebRTC Security Model
              </Link>
              <Link
                to="/turn-vs-stun"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                TURN vs STUN Networking
              </Link>
              <Link
                to="/how-p2p-file-transfer-works"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Detailed P2P Mechanics
              </Link>
              <Link
                to="/how-webrtc-file-sharing-works"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                How WebRTC Works
              </Link>
              <Link
                to="/how-direct-file-transfer-works"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Direct File Transfer
              </Link>
              <Link
                to="/secure-file-transfer-between-devices"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Secure Device Transfer
              </Link>
              <Link
                to="/transfer-files-without-cloud-storage"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Transfer Without Cloud
              </Link>
              <Link
                to="/temporary-file-sharing"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Temporary File Sharing
              </Link>
              <Link
                to="/self-hosted-file-sharing"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Self-Hosted Frameworks
              </Link>
              <Link
                to="/send-large-files"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Send Huge Files
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-6 max-w-sm border-l border-surface-border pl-6">
            <h4 className="text-white font-pixel-line uppercase tracking-widest text-lg mb-2">
              Comparisons
            </h4>
            <div className="flex flex-col gap-3 font-sans text-sm text-white/50">
              <Link
                to="/best-way-to-send-large-files"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                How to Send Large Files
              </Link>
              <Link
                to="/relay-vs-wetransfer"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Relay vs WeTransfer
              </Link>
              <Link
                to="/browser-to-browser-file-transfer"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Browser P2P Transfers
              </Link>
              <Link
                to="/open-source-file-sharing"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Open Source Authority
              </Link>
              <Link
                to="/wetransfer-alternative"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                WeTransfer Alternative
              </Link>
              <Link
                to="/relay-vs-google-drive"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Relay vs Google Drive
              </Link>
              <Link
                to="/relay-vs-snapdrop"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Relay vs Snapdrop
              </Link>
              <Link
                to="/relay-vs-sharedrop"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                Relay vs ShareDrop
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-6 max-w-sm border-l border-surface-border pl-6">
            <h4 className="text-white font-pixel-line uppercase tracking-widest text-lg mb-2">
              Source
            </h4>
            <div className="flex flex-col gap-3 font-sans text-sm text-white/50">
              <a
                href="https://github.com/byrishi/Relay"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors inline-block w-fit"
              >
                GitHub Source Code
              </a>
            </div>
          </div>
        </div>

        <AIFooter />

        {/* Huge Bottom Text */}
        <div className="w-full relative pointer-events-none select-none overflow-hidden flex flex-col justify-end items-center mt-8 -mb-4 md:-mb-8">
          <div className="w-full opacity-[0.03] leading-none flex justify-center max-w-[100vw] overflow-hidden px-4 md:px-12">
            <svg
              viewBox="0 0 1000 280"
              className="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              <text
                x="50%"
                y="80%"
                textAnchor="middle"
                className="font-pixel-square tracking-tight fill-white uppercase"
                fontSize="240"
              >
                RELAY
              </text>
            </svg>
          </div>
        </div>

        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs font-sans text-white/30 pb-6 pt-6 px-6 z-10 relative">
          <div className="mb-4 md:mb-0 flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <span>© 2026 Relay — File Transfer That Doesn't Suck.</span>
            <div className="flex items-center gap-4">
              <a
                href="/robots.txt"
                className="hover:text-brand-neon hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                robots.txt
              </a>
              <a
                href="/sitemap.xml"
                className="hover:text-brand-neon hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                sitemap.xml
              </a>
              <a
                href="/llm.txt"
                className="hover:text-brand-neon hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                llm.txt
              </a>
            </div>
          </div>
          <div>
            Built by{" "}
            <a
              href="https://rishishah.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-brand-neon transition-colors border-b border-white/20 hover:border-brand-neon pb-1"
            >
              Rishi Shah
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
