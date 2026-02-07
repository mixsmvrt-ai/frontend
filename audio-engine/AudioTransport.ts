// Global AudioTransport singleton for Studio playback
// Manages a single AudioContext, master gain, and per-track buffers.

export type TransportTrackId = string;

export interface TransportTrackConfig {
  id: TransportTrackId;
  offsetSec?: number; // arrangement offset, default 0
}

export interface TransportTrackHandle {
  id: TransportTrackId;
  setBuffer: (buffer: AudioBuffer | null) => void;
  setGain: (gain: number) => void;
  setPan: (pan: number) => void;
  dispose: () => void;
}

export interface TransportStateSnapshot {
  isPlaying: boolean;
  currentTime: number; // playhead position in seconds
}

export type TransportListener = (state: TransportStateSnapshot) => void;

class AudioTransportImpl {
  private audioContext: AudioContext | null = null;

  private masterGain: GainNode | null = null;

  private tracks = new Map<
    TransportTrackId,
    {
      id: TransportTrackId;
      offsetSec: number;
      buffer: AudioBuffer | null;
      gainNode: GainNode;
      panNode: StereoPannerNode | null;
      currentSource: AudioBufferSourceNode | null;
      gain: number;
      pan: number;
    }
  >();

  private isPlaying = false;

  private playheadSec = 0;

  private lastStartContextTime: number | null = null;

  private listeners = new Set<TransportListener>();

  private rafId: number | null = null;

  private ensureContext(): AudioContext {
    if (typeof window === "undefined") {
      throw new Error("AudioContext not available on server");
    }
    if (!this.audioContext) {
      const Ctor: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) {
        throw new Error("Web Audio API not supported in this browser");
      }
      this.audioContext = new Ctor();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.audioContext.destination);
    }
    return this.audioContext;
  }

  getContext(): AudioContext {
    return this.ensureContext();
  }

  getState(): TransportStateSnapshot {
    return { isPlaying: this.isPlaying, currentTime: this.getCurrentTime() };
  }

  subscribe(listener: TransportListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const snapshot = this.getState();
    this.listeners.forEach((l) => l(snapshot));
  }

  private startRafLoop() {
    if (this.rafId != null) return;
    const loop = () => {
      this.rafId = null;
      if (this.isPlaying) {
        this.emit();
        this.rafId = window.requestAnimationFrame(loop);
      }
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  private stopRafLoop() {
    if (this.rafId != null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getCurrentTime(): number {
    if (!this.isPlaying || !this.audioContext || this.lastStartContextTime == null) {
      return this.playheadSec;
    }
    const ctx = this.audioContext;
    const elapsed = ctx.currentTime - this.lastStartContextTime;
    return this.playheadSec + Math.max(0, elapsed);
  }

  async decodeFileToBuffer(file: File): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    const arrayBuffer = await file.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer.slice(0));
  }

  registerTrack(config: TransportTrackConfig): TransportTrackHandle {
    // For now the transport is responsible for timing only; audio output is
    // handled by the per-track WaveSurfer instances. We still return a handle
    // so callers can keep their code simple, but the handle is effectively a
    // no-op placeholder.
    const id = config.id;
    if (!this.tracks.has(id)) {
      this.tracks.set(id, {
        id,
        offsetSec: config.offsetSec ?? 0,
        buffer: null,
        // Dummy nodes that are never connected; kept only to satisfy the
        // internal Track record shape.
        gainNode: (this.ensureContext().createGain()),
        panNode: null,
        currentSource: null,
        gain: 1,
        pan: 0,
      });
    }

    const existing = this.tracks.get(id)!;

    return {
      id,
      setBuffer: (buffer) => {
        existing.buffer = buffer;
      },
      setGain: (gain) => {
        existing.gain = gain;
      },
      setPan: (pan) => {
        existing.pan = pan;
      },
      dispose: () => this.unregisterTrack(id),
    };
  }

  private unregisterTrack(id: TransportTrackId) {
    const existing = this.tracks.get(id);
    if (!existing) return;
    try {
      if (existing.currentSource) {
        existing.currentSource.stop();
        existing.currentSource.disconnect();
      }
    } catch {
      // ignore
    }
    try {
      existing.gainNode.disconnect();
    } catch {
      // ignore
    }
    if (existing.panNode) {
      try {
        existing.panNode.disconnect();
      } catch {
        // ignore
      }
    }
    this.tracks.delete(id);
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const ctx = this.ensureContext();

    // Ensure the AudioContext is running so we have a monotonic clock for
    // timing, even though audio is produced elsewhere.
    if (typeof ctx.resume === "function" && ctx.state === "suspended") {
      void ctx.resume().catch(() => {
        // ignore resume errors; timing will still advance using playheadSec
      });
    }

    // Starting point based on current playhead
    this.lastStartContextTime = ctx.currentTime;

    this.startRafLoop();
    this.emit();
  }

  pause() {
    if (!this.isPlaying) return;
    if (!this.audioContext || this.lastStartContextTime == null) {
      this.isPlaying = false;
      this.emit();
      return;
    }

    const ctx = this.audioContext;
    const elapsed = ctx.currentTime - this.lastStartContextTime;
    this.playheadSec += Math.max(0, elapsed);

    this.isPlaying = false;
    this.lastStartContextTime = null;
    this.stopRafLoop();
    this.emit();
  }

  seek(nextTimeSec: number) {
    const clamped = Math.max(0, nextTimeSec);
    this.playheadSec = clamped;

    if (!this.isPlaying) {
      this.emit();
      return;
    }
    if (this.audioContext) {
      this.lastStartContextTime = this.audioContext.currentTime;
    }

    this.emit();
  }

  setPlayhead(timeSec: number) {
    const clamped = Math.max(0, timeSec);
    this.playheadSec = clamped;
    if (!this.isPlaying) {
      this.emit();
    }
  }
}

const singleton = new AudioTransportImpl();

export function getAudioTransport() {
  return singleton;
}
