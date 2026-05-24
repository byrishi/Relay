import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Download, Laptop, Smartphone, Wifi, QrCode, UploadCloud, X, Check, File as FileIcon, Copy, Link2, Send, MessageSquare, ShieldCheck, Zap, Lock, Globe, HardDrive, Pause, Play } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { WebRTCManager, SignalData } from '../lib/webrtc';
import { cn } from '../lib/utils';
import JSZip from 'jszip';

type AppState = 'LANDING' | 'LOBBY' | 'CONNECTED';

interface TransferTask {
  id: string;
  name: string;
  progress: number;
  status: 'transferring' | 'completed' | 'paused' | 'cancelled';
  url?: string;
  isSending: boolean;
  size?: number;
  speed?: number;
  timeRemaining?: number;
}

type TextMessage = {
  id: string;
  text: string;
  isSending: boolean;
  timestamp: number;
}

function getDeviceName() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android Device';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux PC';
  return 'Unknown Device';
}

const readDir = (dirEntry: any, path: string = ''): Promise<File[]> => {
  return new Promise((resolve, reject) => {
    const dirReader = dirEntry.createReader();
    let entries: File[] = [];

    const readEntries = () => {
      dirReader.readEntries(async (results: any[]) => {
        if (!results.length) {
          resolve(entries);
        } else {
          for (const result of results) {
            if (result.isFile) {
              const file = await new Promise<File>((resolveEntry) => {
                result.file((f: File) => {
                  resolveEntry(new File([f], `${path}${f.name}`, { type: f.type }));
                });
              });
              entries.push(file);
            } else if (result.isDirectory) {
              const subEntries = await readDir(result, `${path}${result.name}/`);
              entries.push(...subEntries);
            }
          }
          readEntries();
        }
      }, reject);
    };
    readEntries();
  });
};

function playSuccessSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
  }
}

function formatBytes(bytes?: number, decimals = 2) {
  if (bytes === undefined) return '';
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatTime(seconds?: number) {
  if (seconds === undefined || !isFinite(seconds) || seconds < 0) return '';
  if (seconds < 1) return '< 1s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('LANDING');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [joinError, setJoinError] = useState('');
  const [peersMap, setPeersMap] = useState<Record<string, { id: string, name: string, connected: boolean }>>({});
  const [transfers, setTransfers] = useState<Record<string, TransferTask>>({});
  const [textMessages, setTextMessages] = useState<TextMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const webrtcRefs = useRef<Record<string, WebRTCManager>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
    const newSocket = io(backendUrl);
    setSocket(newSocket);
    
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      const cleanCode = codeParam.trim();
      setJoinCode(cleanCode);
      window.history.replaceState({}, document.title, window.location.pathname);
      newSocket.on('connect', () => {
         newSocket.emit('join_room', { code: cleanCode, deviceName: getDeviceName() });
      });
    }

    return () => {
      newSocket.close();
    };
  }, []);

  const createRoom = () => {
    if (!socket) return;
    setJoinError('');
    socket.emit('create_room', getDeviceName());
    setAppState('LOBBY');
  };

  const joinRoom = (code: string) => {
    const cleanCode = code.trim();
    if (!socket || !cleanCode) return;
    setJoinError('');
    socket.emit('join_room', { code: cleanCode, deviceName: getDeviceName() });
  };

  const initializeWebRTC = useCallback((isInitiator: boolean, targetPeerId: string, peerName?: string) => {
    if (webrtcRefs.current[targetPeerId]) return;

    const rtc = new WebRTCManager();
    webrtcRefs.current[targetPeerId] = rtc;

    setPeersMap(prev => ({
       ...prev,
       [targetPeerId]: {
          id: targetPeerId,
          name: peerName || 'Unknown Device',
          connected: false
       }
    }));

    rtc.onSignal = (signal) => {
       socket?.emit('signal', { to: targetPeerId, signal });
    };

    rtc.onConnect = () => {
      setPeersMap(prev => ({
         ...prev,
         [targetPeerId]: { ...prev[targetPeerId], connected: true }
      }));
      setAppState('CONNECTED');
    };

    rtc.onDisconnect = () => {
      rtc.close();
      delete webrtcRefs.current[targetPeerId];
      setPeersMap(prev => {
         const next = { ...prev };
         delete next[targetPeerId];
         return next;
      });
      if (Object.keys(webrtcRefs.current).length === 0) {
         setAppState(prev => prev === 'CONNECTED' ? 'LOBBY' : prev); // Just fall back to lobby waiting state implicitly instead of killing flow
      }
    };

    rtc.onFileProgress = (progress, fileName, fileSize, speedBytesPerSec, estimatedTimeRemaining) => {
      setTransfers(prev => {
        const id = fileName; 
        let newStatus = prev[id]?.status || 'transferring';
        if (progress >= 100) newStatus = 'completed';
        else if (progress === -1) newStatus = 'cancelled';

        return {
          ...prev,
          [id]: {
            ...prev[id],
            id,
            name: fileName,
            progress: progress === -1 ? prev[id]?.progress || 0 : Math.max(progress, prev[id]?.progress || 0),
            status: newStatus,
            isSending: prev[id]?.isSending ?? false,
            size: fileSize,
            speed: speedBytesPerSec,
            timeRemaining: estimatedTimeRemaining
          }
        };
      });
    };

    rtc.onFileReceived = (url, fileName, fileSize) => {
      playSuccessSound();
      setTransfers(prev => ({
        ...prev,
        [fileName]: {
          ...prev[fileName],
          url,
          status: 'completed',
          progress: 100,
          isSending: false,
          size: fileSize
        }
      }));
    };

    rtc.onTextReceived = (text) => {
      playSuccessSound();
      setTextMessages(prev => [{
        id: Math.random().toString(36).substring(7),
        text,
        isSending: false,
        timestamp: Date.now()
      }, ...prev]);
    };

    rtc.init(isInitiator);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_created', ({ roomCode }) => {
      setRoomCode(roomCode);
    });

    socket.on('room_joined', ({ roomCode, peers }) => {
      setRoomCode(roomCode);
      setAppState('LOBBY');
      
      if (peers && Array.isArray(peers)) {
         peers.forEach((p: any) => {
            if (p.id !== socket.id) {
               initializeWebRTC(true, p.id, p.deviceName);
            }
         });
      }
    });

    socket.on('peer_joined', ({ peerId, peerDeviceName }) => {
      initializeWebRTC(false, peerId, peerDeviceName);
    });
    
    socket.on('peer_left', ({ peerId, explicit }) => {
       if (explicit) {
          const rtc = webrtcRefs.current[peerId];
          if (rtc) {
             rtc.close();
             delete webrtcRefs.current[peerId];
          }
          setPeersMap(prev => {
             const next = { ...prev };
             delete next[peerId];
             return next;
          });
          if (Object.keys(webrtcRefs.current).length === 0) {
             setAppState(prev => prev === 'CONNECTED' ? 'LOBBY' : prev);
          }
       }
    });

    socket.on('signal', ({ from, signal }) => {
       if (!webrtcRefs.current[from]) {
          initializeWebRTC(false, from);
       }
       webrtcRefs.current[from]?.handleSignal(signal);
    });

    socket.on('room_error', ({ message }) => {
       setJoinError(message);
       if (appState !== 'CONNECTED') {
         setAppState('LANDING');
         setRoomCode('');
       }
    });

    socket.on('connect', () => {
       if (roomCode) {
           socket.emit('join_room', { code: roomCode, deviceName: getDeviceName() });
       }
    });

    socket.on('disconnect', () => {
       // Just let socket.io auto-reconnect handle it.
       // We only clear out if we actually want to give up. We will stay in our current UI state.
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('peer_joined');
      socket.off('peer_left');
      socket.off('signal');
      socket.off('room_error');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket, appState, initializeWebRTC]);

  const handleFiles = (files: FileList | File[]) => {
    const peers = Object.values(webrtcRefs.current) as WebRTCManager[];
    if (!peers.length) return;
    
    Array.from(files).forEach(file => {
      let previewUrl;
      const isMedia = /\.(jpeg|jpg|gif|png|webp|svg|mp4|webm|ogg)$/i.test(file.name);
      if (isMedia) {
         previewUrl = URL.createObjectURL(file);
      }
      
      setTransfers(p => ({
        ...p,
        [file.name]: {
          id: file.name,
          name: file.name,
          progress: 0,
          status: 'transferring',
          isSending: true,
          size: file.size,
          url: previewUrl
        }
      }));
      peers.forEach(rtc => rtc.sendFile(file));
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (appState === 'CONNECTED') {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
       setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (appState !== 'CONNECTED' || !e.dataTransfer.items) return;

    const items = Array.from(e.dataTransfer.items) as DataTransferItem[];
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          if (entry.isDirectory) {
             const files = await readDir(entry);
             const zip = new JSZip();
             files.forEach(f => zip.file(f.name, f));
             zip.generateAsync({ type: 'blob' }).then(blob => {
                const zipFile = new File([blob], `${entry.name}.zip`, { type: 'application/zip' });
                handleFiles([zipFile]);
             });
          } else {
             const file = item.getAsFile();
             if (file) handleFiles([file]);
          }
        } else {
           const file = item.getAsFile();
           if (file) handleFiles([file]);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?code=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const manageTransferLocal = (task: TransferTask, action: 'pause' | 'resume' | 'cancel') => {
      if (!task.isSending) return; // Receiving end waits - although canceling receive is possible, keeping it simple for sender
      const peers = Object.values(webrtcRefs.current) as WebRTCManager[];
      peers.forEach(rtc => rtc.manageTransfer(task.id, action));
      
      setTransfers(prev => {
          const t = prev[task.id];
          if (!t) return prev;
          let newStatus = t.status;
          if (action === 'pause') newStatus = 'paused';
          else if (action === 'resume') newStatus = 'transferring';
          else if (action === 'cancel') newStatus = 'cancelled';
          return {
              ...prev,
              [task.id]: {
                  ...t,
                  status: newStatus
              }
          };
      });
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    const peers = Object.values(webrtcRefs.current) as WebRTCManager[];
    if (!textInput.trim() || !peers.length) return;
    
    peers.forEach(rtc => rtc.sendText(textInput));
    setTextMessages(prev => [{
      id: Math.random().toString(36).substring(7),
      text: textInput,
      isSending: true,
      timestamp: Date.now()
    }, ...prev]);
    setTextInput('');
  };

  const currentSpeedBytes = Object.values(transfers).reduce<number>((acc, t) => {
      const task = t as TransferTask;
      if (task.status === 'transferring' && task.speed) return acc + task.speed;
      return acc;
  }, 0);

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-start w-full relative h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <main className="w-full max-w-[100vw] flex flex-col z-10 bg-transparent flex-1 relative min-h-[calc(100vh-96px)]">
        <AnimatePresence mode="wait">
          {appState === 'LANDING' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full flex flex-col items-center bg-transparent flex-1 relative overflow-hidden"
            >
              <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] bg-brand-neon/10 blur-[120px] rounded-full pointer-events-none" />
              <div className="absolute bottom-[10%] left-[-10%] w-[60vw] h-[60vw] md:w-[30vw] md:h-[30vw] bg-emerald-900/10 blur-[100px] rounded-full pointer-events-none" />
              
              {/* HERO */}
              <div className="w-full min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-96px)] flex flex-col justify-center items-center text-center px-4 relative z-10 max-w-5xl mx-auto py-16 md:py-24">
                <a 
                  href="https://github.com/byrishi/Relay"
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-white/10 border border-white/20 text-white/90 text-xs font-semibold mb-10 backdrop-blur-md shadow-sm hover:bg-white/15 hover:border-brand-neon/50 hover:shadow-[0_0_15px_rgba(208,226,244,0.15)] transition-all cursor-pointer group"
                >
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-neon animate-pulse shadow-[0_0_8px_rgba(208,226,244,0.6)] group-hover:scale-125 transition-transform" />
                   <span className="font-pixel-line tracking-[0.2em] text-[10px] uppercase text-brand-neon mt-[1px] group-hover:text-white transition-colors">RELAY / 100% FREE & OPEN SOURCE</span>
                   <svg
                     className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity ml-1"
                     fill="currentColor"
                     viewBox="0 0 24 24"
                     aria-hidden="true"
                   >
                     <path
                       fillRule="evenodd"
                       d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                       clipRule="evenodd"
                     />
                   </svg>
                 </a>
                 
                 <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-sans font-bold tracking-tighter text-white mb-6 leading-[1.05]">
                   Transfer files directly.<br />
                   <span className="text-white/30">Without the cloud.</span>
                 </h1>
                 
                 <p className="text-lg md:text-xl text-white/80 max-w-xl font-sans mb-12 leading-relaxed font-medium mx-auto">
                   A military-grade encrypted peer-to-peer file transfer engine. No accounts, no size limits, and completely free. Your files go directly from your device to theirs.
                 </p>
                 
                 <div className="w-full max-w-xl flex flex-col sm:flex-row gap-4 items-center">
                    <button
                       onClick={() => createRoom()}
                       className="w-full sm:w-1/2 h-14 bg-brand-neon text-surface font-semibold rounded-[8px] hover:bg-white active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 group text-sm md:text-base shadow-[0_0_15px_rgba(208,226,244,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                       Start Transfer
                       <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <div className="relative w-full sm:w-1/2 h-14 group">
                      <input
                        type="text"
                        placeholder="ENTER JOIN CODE"
                        maxLength={5}
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') joinRoom(joinCode);
                        }}
                        className="w-full h-full px-6 rounded-[8px] bg-white/10 hover:bg-white/15 border border-white/20 focus:border-brand-neon focus:bg-white/20 text-white placeholder-white/50 font-medium outline-none transition-all text-center sm:text-left font-pixel-grid tracking-widest text-xs backdrop-blur-md shadow-sm uppercase"
                      />
                      <button 
                        onClick={() => joinRoom(joinCode)}
                        disabled={!joinCode}
                        className="absolute right-1.5 top-1.5 bottom-1.5 w-12 flex items-center justify-center bg-white/10 hover:bg-white hover:text-black rounded-[6px] transition-colors disabled:opacity-30 text-white/70"
                      >
                        <ArrowRight className="w-4 h-4"/>
                      </button>
                    </div>
                 </div>
                 {joinError && (
                   <p className="mt-6 text-brand-neon text-sm font-medium">
                     {joinError}
                   </p>
                 )}
              </div>

              {/* FEATURES (Psychological reassurance, fully separated) */}
              <div className="w-full bg-transparent relative z-10 py-32 border-b border-surface-border">
                 <div className="max-w-7xl mx-auto px-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                      {/* Feature 1 */}
                      <div className="flex flex-col gap-6 p-6 md:p-8 bg-surface/30 hover:bg-surface/60 backdrop-blur-2xl border border-white/5 hover:border-brand-neon/30 rounded-3xl transition-all shadow-2xl group">
                         <div className="w-16 h-16 bg-surface border border-surface-border rounded-2xl flex items-center justify-center mb-2 text-white group-hover:text-brand-neon group-hover:border-brand-neon/30 group-hover:bg-brand-neon/5 transition-all">
                            <Lock className="w-7 h-7" />
                         </div>
                         <h3 className="text-2xl font-bold text-white tracking-tight">E2E Encryption</h3>
                         <p className="text-white/80 leading-relaxed text-base">
                           Data never touches our servers. We use native WebRTC DTLS and SRTP protocols to encrypt files continuously from sender to receiver, ensuring military-grade security.
                         </p>
                      </div>
                      
                      {/* Feature 2 */}
                      <div className="flex flex-col gap-6 p-6 md:p-8 bg-surface/30 hover:bg-surface/60 backdrop-blur-2xl border border-white/5 hover:border-brand-neon/30 rounded-3xl transition-all shadow-2xl group">
                         <div className="w-16 h-16 bg-surface border border-surface-border rounded-2xl flex items-center justify-center mb-2 text-white group-hover:text-brand-neon group-hover:border-brand-neon/30 group-hover:bg-brand-neon/5 transition-all">
                            <HardDrive className="w-7 h-7" />
                         </div>
                         <h3 className="text-2xl font-bold text-white tracking-tight">Infinite Scale</h3>
                         <p className="text-white/80 leading-relaxed text-base">
                           Need to send a 150GB 8K video? Go ahead. Our engine chunks files securely in-memory, bypassing standard browser limits entirely. No arbitrary paywalls.
                         </p>
                      </div>
                      
                      {/* Feature 3 */}
                      <div className="flex flex-col gap-6 p-6 md:p-8 bg-surface/30 hover:bg-surface/60 backdrop-blur-2xl border border-white/5 hover:border-brand-neon/30 rounded-3xl transition-all shadow-2xl group">
                         <div className="w-16 h-16 bg-surface border border-surface-border rounded-2xl flex items-center justify-center mb-2 text-white group-hover:text-brand-neon group-hover:border-brand-neon/30 group-hover:bg-brand-neon/5 transition-all">
                            <Zap className="w-7 h-7" />
                         </div>
                         <h3 className="text-2xl font-bold text-white tracking-tight">LAN-Speed</h3>
                         <p className="text-white/80 leading-relaxed text-base">
                           Because there's no cloud upload bottleneck, your transfer speed is only limited by your ISP. Sending locally will max out your router's bandwidth.
                         </p>
                      </div>
                   </div>
                 </div>
              </div>
            </motion.div>
          )}

          {appState === 'LOBBY' && (
             <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              className="flex flex-col items-center justify-center w-full max-w-md"
            >
              <div className="w-full max-w-sm p-12 bg-surface/60 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col items-center relative rounded-[12px]">
                <div className="w-16 h-16 bg-white flex items-center justify-center mb-8 rounded-[12px] shadow-sm">
                   <QrCode className="w-8 h-8 text-black" />
                </div>

                <h2 className="text-xl font-pixel-square text-white mb-2 tracking-tight uppercase">Ready to Connect</h2>
                <p className="text-white/80 text-center text-sm mb-10 font-sans">
                  Scan QR or share Code to establish secure AES-256 tunnel.
                </p>
                
                <div className="p-4 bg-white rounded-lg mb-8 group relative overflow-hidden">
                   <QRCodeSVG 
                     value={`${window.location.href.split('?')[0]}?code=${roomCode}`} 
                     size={180} 
                     level="H" 
                     fgColor="#000000"
                     bgColor="#ffffff"
                   />
                </div>

                <div className="flex flex-col items-center gap-3 w-full">
                  <span className="text-white/50 text-[10px] uppercase font-pixel-line tracking-[0.2em]">Access Code</span>
                  <div className="tracking-[0.2em] md:tracking-[0.4em] text-3xl md:text-4xl font-pixel-square text-white bg-black/20 px-4 py-8 border border-white/10 rounded-lg w-full text-center relative group cursor-pointer hover:bg-white/5 hover:border-white/20 transition-colors" onClick={copyInviteLink}>
                    {roomCode || '...'}
                    <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-[#0a0a0a]/95 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="tracking-widest text-sm text-white font-sans font-medium flex items-center gap-2">
                        {copiedLink ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Code</>}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    socket?.emit('leave_room');
                    setRoomCode('');
                    setAppState('LANDING');
                  }}
                  className="mt-10 tracking-widest text-[10px] font-bold text-white/50 hover:text-white uppercase font-mono border-b border-transparent hover:border-white transition-all pb-1"
                >
                  Cancel Sync
                </button>
              </div>
            </motion.div>
          )}

          {appState === 'CONNECTED' && (
            <motion.div
              key="connected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-4xl mx-auto flex flex-col gap-6 items-center"
            >
              <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 bg-surface/60 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] gap-6 rounded-[12px]">
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="w-12 h-12 bg-white flex items-center justify-center flex-shrink-0 rounded-[10px] shadow-sm">
                    <ShieldCheck className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="text-white font-pixel-square text-lg tracking-tight flex items-center gap-3 uppercase">
                       Secure Tunnel 
                       <span className="px-2.5 py-1 bg-black/20 border border-surface-border rounded-[4px] text-brand-neon font-pixel-grid text-[10px] tracking-wide shrink-0 flex items-center gap-1.5 uppercase">
                         <div className="w-1.5 h-1.5 rounded-full bg-brand-neon animate-pulse" />
                         {Object.keys(peersMap).length} Peer{Object.keys(peersMap).length !== 1 && 's'}
                       </span>
                    </h3>
                    <p className="text-white/50 text-[10px] font-pixel-circle tracking-[0.2em] mt-1.5 uppercase">E2EE • AES-256-GCM • ID: {roomCode}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    socket?.emit('leave_room');
                    setRoomCode('');
                    setAppState('LANDING');
                    (Object.values(webrtcRefs.current) as WebRTCManager[]).forEach(rtc => rtc.close());
                    webrtcRefs.current = {};
                    setPeersMap({});
                    setTransfers({});
                    setTextMessages([]);
                  }}
                  className="px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white font-sans text-sm font-semibold rounded-[8px] transition-colors whitespace-nowrap self-stretch md:self-auto flex items-center justify-center"
                >
                  Terminate
                </button>
              </div>

              {Object.keys(transfers).length > 0 && (
                <div className="w-full flex flex-col mt-2 mb-6">
                  <h4 className="text-[10px] uppercase text-brand-neon tracking-[0.2em] font-pixel-grid mb-4 text-center pb-2 border-b border-white/5">Active Transfers</h4>
                  <AnimatePresence>
                    {(Object.values(transfers) as TransferTask[]).map(task => (
                      <motion.div 
                        key={task.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("bg-surface border p-4 rounded-xl flex flex-col gap-4 relative overflow-hidden group transition-all mb-3 w-full shadow-lg", 
                           task.status === 'cancelled' ? 'border-red-500/30' : 'border-brand-neon/30 hover:border-brand-neon/60 bg-brand-neon/5')}
                      >
                        <div className="flex items-center justify-between z-10 relative flex-wrap gap-4">
                          <div className="flex items-center gap-4 overflow-hidden max-w-full">
                            {task.url && /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(task.name) ? (
                              <img src={task.url} alt="preview" className="w-12 h-12 object-cover rounded-lg bg-black/20 border border-white/10 flex-shrink-0" />
                            ) : task.url && /\.(mp4|webm|ogg)$/i.test(task.name) ? (
                              <video src={task.url} className="w-12 h-12 object-cover rounded-lg bg-black/20 border border-white/10 flex-shrink-0" controls={false} />
                            ) : (
                              <div className={cn(
                                "w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-lg border",
                                task.status === 'completed' ? 'bg-black/20 text-brand-neon border-brand-neon/30' : 
                                task.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                'bg-black/20 text-brand-neon border-brand-neon/20'
                              )}>
                                {task.status === 'completed' ? (
                                  <Check className="w-6 h-6" />
                                ) : task.status === 'cancelled' ? (
                                  <X className="w-6 h-6" />
                                ) : (
                                  <FileIcon className="w-6 h-6" />
                                )}
                              </div>
                            )}
                            <div className="truncate min-w-[100px] flex flex-col items-start">
                              <p className="text-sm font-semibold text-white truncate max-w-[200px] md:max-w-[350px] font-sans tracking-tight text-left" title={task.name}>{task.name}</p>
                              <div className="flex items-center gap-3 text-xs text-white/60 font-sans mt-1 tracking-wide text-left">
                                <span>{task.size ? formatBytes(task.size) : '---'}</span>
                                <span className={cn(
                                   task.status === 'transferring' ? 'text-brand-neon font-bold' : '',
                                   task.status === 'cancelled' ? 'text-red-500' : '',
                                   task.status === 'paused' ? 'text-yellow-500' : ''
                                )}>
                                   {task.status}
                                   {['transferring', 'paused'].includes(task.status) ? ` (${task.progress.toFixed(0)}%)` : ''}
                                </span>
                                <span>{task.isSending ? 'Sent' : 'Received'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 flex-shrink-0">
                            {['transferring', 'paused'].includes(task.status) && (
                                <div className="flex flex-col items-end mr-4">
                                   <span className="text-xs text-brand-neon font-sans">
                                     {task.speed ? formatBytes(task.speed) + '/s' : '--/s'}
                                   </span>
                                   <span className="text-[11px] text-white/50 font-sans">
                                     {task.timeRemaining ? formatTime(task.timeRemaining) + ' left' : '-- left'}
                                   </span>
                                </div>
                            )}
                            
                            {task.isSending && ['transferring', 'paused'].includes(task.status) && (
                                <div className="flex items-center gap-1 bg-black/20 p-1 border border-surface-border rounded-lg">
                                   {task.status === 'transferring' ? (
                                      <button 
                                         onClick={(e) => { e.stopPropagation(); manageTransferLocal(task, 'pause'); }}
                                         className="p-1.5 rounded-md hover:bg-yellow-500/20 hover:text-yellow-500 text-white/50 transition-colors"
                                         title="Pause Transfer"
                                      >
                                         <Pause className="w-4 h-4" />
                                      </button>
                                   ) : (
                                      <button 
                                         onClick={(e) => { e.stopPropagation(); manageTransferLocal(task, 'resume'); }}
                                         className="p-1.5 rounded-md hover:bg-white/10 hover:text-white text-white/50 transition-colors"
                                         title="Resume Transfer"
                                      >
                                         <Play className="w-4 h-4" />
                                      </button>
                                   )}
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); manageTransferLocal(task, 'cancel'); }}
                                      className="p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-500 text-white/50 transition-colors"
                                      title="Cancel Transfer"
                                   >
                                      <X className="w-4 h-4" />
                                   </button>
                                </div>
                            )}

                            {task.url && !task.isSending && task.status === 'completed' && (
                              <a 
                                href={task.url}
                                download={task.name}
                                className="px-4 py-2 bg-white text-black font-semibold font-sans text-xs rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" /> Save
                              </a>
                            )}
                          </div>
                        </div>
                        
                        {(task.status === 'transferring' || task.status === 'paused') && (
                          <div className="absolute bottom-0 left-0 h-[2px] bg-white/5 w-full">
                            <motion.div 
                              className={cn("h-full", task.status === 'paused' ? 'bg-yellow-500' : 'bg-brand-neon')}
                              initial={{ width: 0 }}
                              animate={{ width: `${task.progress}%` }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>
                        )}
                        
                        {task.status === 'cancelled' && (
                           <div className="absolute bottom-0 left-0 h-[2px] bg-red-500 w-full" />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="relative group w-full aspect-video md:aspect-[3/1] border border-surface-border border-dashed hover:border-brand-neon bg-surface/50 hover:bg-white/5 backdrop-blur-md rounded-[12px] transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden"
              >
                <div className="w-16 h-16 bg-white/5 group-hover:bg-white group-hover:scale-110 transition-all duration-300 flex items-center justify-center mb-4 relative z-10 rounded-[12px]">
                   <UploadCloud className="w-6 h-6 text-white group-hover:text-black transition-colors" />
                </div>
                <h3 className="text-xl font-sans font-semibold text-white tracking-tight relative z-10 transition-colors">Drop files here or click to browse</h3>
                <p className="text-white/60 text-sm font-sans mt-2 relative z-10">No size limits. End-to-end encrypted.</p>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple 
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                  }} 
                />
              </div>

              <form onSubmit={handleSendText} className="flex items-center bg-surface/60 backdrop-blur-2xl border border-white/10 shadow-xl rounded-[10px] overflow-hidden">
                 <div className="flex items-center justify-center w-12 h-12 bg-white/5 border-r border-surface-border">
                    <MessageSquare className="w-5 h-5 text-white/50" />
                 </div>
                 <input 
                   type="text" 
                   className="flex-1 min-w-0 bg-transparent border-none outline-none text-white px-4 font-sans text-sm placeholder-white/30"
                   placeholder="Send a secure message or link..."
                   value={textInput}
                   onChange={e => setTextInput(e.target.value)}
                 />
                 <button 
                    type="submit"
                    disabled={!textInput.trim()}
                    className="flex text-sm font-sans font-semibold items-center justify-center px-6 h-12 bg-brand-neon text-surface disabled:opacity-30 hover:bg-white transition-colors"
                 >
                   Send
                 </button>
              </form>

              {textMessages.length > 0 && (
                <div className="w-full flex flex-col mt-4">
                  <h4 className="text-[10px] uppercase text-white/50 tracking-[0.2em] font-pixel-grid mb-4">Messages</h4>
                  <AnimatePresence>
                     {textMessages.map(msg => (
                        <motion.div 
                          key={msg.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="border border-surface-border bg-surface/50 rounded-lg p-4 mb-3 group hover:border-brand-neon/50 transition-colors w-full"
                        >
                           <div className="flex gap-4 items-start text-left">
                             <div className="flex-1 min-w-0">
                               <p className="text-sm text-white break-words whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</p>
                               <span className="text-[11px] text-white/40 mt-2 block font-sans">
                                 {new Date(msg.timestamp).toLocaleTimeString([], { hour12: true })} · {msg.isSending ? "Sent" : "Received"}
                               </span>
                             </div>
                             <button
                               onClick={() => copyToClipboard(msg.text)}
                               className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-white hover:text-black text-white/50 transition-all flex-shrink-0"
                               title="Copy snippet"
                             >
                               <Copy className="w-4 h-4" />
                             </button>
                           </div>
                        </motion.div>
                     ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isDraggingOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm border-[6px] border-brand-neon flex flex-col items-center justify-center pointer-events-none"
          >
             <div className="w-20 h-20 bg-white flex items-center justify-center mb-8 rounded-none border border-white/20">
                <UploadCloud className="w-10 h-10 text-black animate-pulse" />
             </div>
             <h2 className="text-4xl font-sans font-bold text-white tracking-tight">Initialize Transfer</h2>
             <p className="text-[10px] font-pixel-square tracking-[0.3em] text-brand-neon mt-6 uppercase">Drop payload to begin transmission.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
