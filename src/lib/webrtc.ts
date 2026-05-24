export type SignalData = 
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'candidate'; candidate: RTCIceCandidateInit };

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  public isInitiator = false;
  
  public onSignal?: (data: SignalData) => void;
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onFileProgress?: (progress: number, fileName: string, fileSize?: number, speedBytesPerSec?: number, estimatedTimeRemaining?: number) => void;
  public onFileReceived?: (fileUrl: string, fileName: string, fileSize?: number) => void;
  public onTextReceived?: (text: string) => void;
  
  // File transfer state
  private receivingFile = false;
  private receiveBuffer: ArrayBuffer[] = [];
  private receivedSize = 0;
  private expectedSize = 0;
  private currentFileName = '';
  
  public activeTransfers: Record<string, {
    status: 'transferring' | 'paused' | 'cancelled',
    resolvePause?: () => void
  }> = {};
  
  // Stats
  private startTime = 0;
  private lastTime = 0;
  private lastBytes = 0;
  private currentSpeed = 0;

  private readonly CHUNK_SIZE = 262144; // 256KB for maximum throughput

  // Disk Streaming handling
  private incomingQueue: (ArrayBuffer | string)[] = [];
  private queueIndex = 0;
  private isProcessingQueue = false;
  private fileHandle: any = null;
  private fileStream: any = null;
  private useOPFS = false;

  constructor() {}

  public init(isInitiator: boolean) {
    this.isInitiator = isInitiator;
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onSignal) {
        this.onSignal({ type: 'candidate', candidate: event.candidate.toJSON() });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection?.connectionState === 'connected') {
        // Connected!
      } else if (this.peerConnection?.connectionState === 'disconnected' || this.peerConnection?.connectionState === 'failed') {
        this.onDisconnect?.();
      }
    };

    if (this.isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel('fileTransfer');
      this.setupDataChannel();
      
      this.peerConnection.createOffer()
        .then(offer => this.peerConnection!.setLocalDescription(offer))
        .then(() => {
          if (this.onSignal && this.peerConnection!.localDescription) {
            this.onSignal(this.peerConnection!.localDescription as any);
          }
        });
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.binaryType = 'arraybuffer';
    this.dataChannel.bufferedAmountLowThreshold = 1024 * 1024 * 4; // 4MB buffer threshold
    
    this.dataChannel.onopen = () => {
      this.onConnect?.();
    };

    this.dataChannel.onclose = () => {
      this.onDisconnect?.();
    };

    this.dataChannel.onmessage = (event) => {
       if (typeof event.data === 'string') {
         // Metadata
         const meta = JSON.parse(event.data);
         if (meta.type === 'START_FILE') {
           this.receivingFile = true;
           this.expectedSize = meta.size;
           this.currentFileName = meta.name;
           this.receivedSize = 0;
           this.receiveBuffer = [];
           this.startTime = performance.now();
           this.lastTime = this.startTime;
           this.lastBytes = 0;
           this.currentSpeed = 0;
         } else if (meta.type === 'END_FILE') {
           this.receivingFile = false;
         } else if (meta.type === 'CANCEL_FILE') {
           this.receivingFile = false;
           this.receiveBuffer = [];
           this.onFileProgress?.(-1, meta.name, this.expectedSize, 0, 0);
         }
       } else if (event.data instanceof ArrayBuffer) {
         if (this.receivingFile) {
           this.receivedSize += event.data.byteLength;
           
           const now = performance.now();
           const timeDiff = (now - this.lastTime) / 1000;
           if (timeDiff > 0.1) {
              const bytesDiff = this.receivedSize - this.lastBytes;
              this.currentSpeed = bytesDiff / timeDiff;
              this.lastTime = now;
              this.lastBytes = this.receivedSize;
           }

           const progress = Math.min(100, Math.round((this.receivedSize / this.expectedSize) * 100));
           const timeRemaining = this.currentSpeed > 0 ? Math.max(0, (this.expectedSize - this.receivedSize) / this.currentSpeed) : 0;
           
           this.onFileProgress?.(progress, this.currentFileName, this.expectedSize, this.currentSpeed, timeRemaining);
         }
       }
       
       this.incomingQueue.push(event.data);
       this.processIncomingQueue();
    };
  }

  private async processIncomingQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.queueIndex < this.incomingQueue.length) {
      const data = this.incomingQueue[this.queueIndex++];
      
      if (this.queueIndex > 5000) {
        this.incomingQueue = this.incomingQueue.slice(this.queueIndex);
        this.queueIndex = 0;
      }

      if (typeof data === 'string') {
        const meta = JSON.parse(data);
        if (meta.type === 'START_FILE') {
          try {
            if (navigator.storage && navigator.storage.getDirectory) {
              const dir = await navigator.storage.getDirectory();
              const safeName = meta.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
              const uniqueName = `${Date.now()}-${safeName}`;
              this.fileHandle = await dir.getFileHandle(uniqueName, { create: true });
              this.fileStream = await this.fileHandle.createWritable();
              this.useOPFS = true;
            } else {
              this.useOPFS = false;
            }
          } catch (e) {
            console.warn("OPFS streaming initialization failed. Falling back to memory buffer.", e);
            this.useOPFS = false;
          }
        } else if (meta.type === 'END_FILE') {
          if (this.useOPFS && this.fileStream && this.fileHandle) {
            try {
              await this.fileStream.close();
              const file = await this.fileHandle.getFile();
              const url = URL.createObjectURL(file);
              this.onFileReceived?.(url, meta.name, meta.size);
            } catch (e) {
              console.error("Failed to finalize OPFS file stream", e);
            }
          } else {
            const blob = new Blob(this.receiveBuffer);
            const url = URL.createObjectURL(blob);
            this.onFileReceived?.(url, meta.name, meta.size);
            this.receiveBuffer = [];
          }
        } else if (meta.type === 'TEXT') {
          this.onTextReceived?.(meta.content);
        }
      } else if (data instanceof ArrayBuffer) {
        if (this.useOPFS && this.fileStream) {
          try {
            await this.fileStream.write(data);
          } catch (e) {
            console.error("Failed to write chunk to OPFS stream", e);
          }
        } else {
          this.receiveBuffer.push(data);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  public manageTransfer(fileName: string, action: 'pause' | 'resume' | 'cancel') {
     const t = this.activeTransfers[fileName];
     if (!t) return;
     if (action === 'pause') {
         t.status = 'paused';
     } else if (action === 'resume') {
         t.status = 'transferring';
         if (t.resolvePause) {
             t.resolvePause();
             t.resolvePause = undefined;
         }
     } else if (action === 'cancel') {
         t.status = 'cancelled';
         if (t.resolvePause) {
             t.resolvePause();
             t.resolvePause = undefined;
         }
     }
  }

  public async handleSignal(signal: SignalData) {
    if (!this.peerConnection) return;
    
    if (signal.type === 'offer') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal as RTCSessionDescriptionInit));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      if (this.onSignal) {
        this.onSignal(this.peerConnection.localDescription as any);
      }
    } else if (signal.type === 'answer') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal as RTCSessionDescriptionInit));
    } else if (signal.type === 'candidate') {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    }
  }

  public async sendFile(file: File) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;

    this.activeTransfers[file.name] = { status: 'transferring' };

    // Send metadata
    this.dataChannel.send(JSON.stringify({
      type: 'START_FILE',
      name: file.name,
      size: file.size,
      mimeType: file.type
    }));

    let offset = 0;
    const startTime = performance.now();
    let lastTime = startTime;
    let lastBytes = 0;
    let currentSpeed = 0;

    const sendChunk = async () => {
      while (offset < file.size) {
        let currentTask = this.activeTransfers[file.name];
        if (!currentTask) {
           currentTask = { status: 'transferring' };
           this.activeTransfers[file.name] = currentTask;
        }

        if (currentTask.status === 'cancelled') {
           this.dataChannel!.send(JSON.stringify({ type: 'CANCEL_FILE', name: file.name }));
           delete this.activeTransfers[file.name];
           this.onFileProgress?.(-1, file.name, file.size, 0, 0); // -1 means cancelled
           return;
        }

        if (currentTask.status === 'paused') {
           await new Promise<void>(resolve => {
               currentTask!.resolvePause = resolve;
           });
           continue; // re-evaluate status before proceeding
        }

        if (this.dataChannel!.bufferedAmount > this.dataChannel!.bufferedAmountLowThreshold) {
          this.dataChannel!.onbufferedamountlow = () => {
            this.dataChannel!.onbufferedamountlow = null;
            sendChunk();
          };
          return;
        }

        const chunkBlob = file.slice(offset, offset + this.CHUNK_SIZE);
        const chunk = await chunkBlob.arrayBuffer();
        
        try {
          this.dataChannel!.send(chunk);
          offset += chunk.byteLength;
        } catch (e) {
          console.error("Data channel send failed", e);
          return;
        }

        const now = performance.now();
        const timeDiff = (now - lastTime) / 1000;
        if (timeDiff > 0.1) {
           const bytesDiff = offset - lastBytes;
           currentSpeed = bytesDiff / timeDiff;
           lastTime = now;
           lastBytes = offset;
        }

        const progress = Math.min(100, Math.round((offset / file.size) * 100));
        const timeRemaining = currentSpeed > 0 ? Math.max(0, (file.size - offset) / currentSpeed) : 0;
        
        this.onFileProgress?.(progress, file.name, file.size, currentSpeed, timeRemaining);
      }

      if (offset >= file.size && this.activeTransfers[file.name]?.status !== 'cancelled') {
        this.dataChannel!.send(JSON.stringify({ type: 'END_FILE', name: file.name, size: file.size }));
        delete this.activeTransfers[file.name];
      }
    };

    sendChunk();
  }

  public sendText(text: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
    this.dataChannel.send(JSON.stringify({
      type: 'TEXT',
      content: text
    }));
  }

  public close() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

