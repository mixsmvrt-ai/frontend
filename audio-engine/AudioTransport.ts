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
    const ctx = this.ensureContext();
    if (!this.masterGain) {
      throw new Error("Master gain not initialized");
    }

    const existing = this.tracks.get(config.id);
    if (existing) {
      return {
        id: existing.id,
        setBuffer: (buffer) => {
          existing.buffer = buffer;
        },
        setGain: (gain) => {
          existing.gain = gain;
          existing.gainNode.gain.value = gain;
        },
        setPan: (pan) => {
          existing.pan = pan;
          if (existing.panNode) existing.panNode.pan.value = pan;
        },
        dispose: () => this.unregisterTrack(config.id),
      };
    }

    const gainNode = ctx.createGain();
    gainNode.gain.value = 1;

    let panNode: StereoPannerNode | null = null;
    if (typeof (ctx as any).createStereoPanner === "function") {
      panNode = (ctx as any).createStereoPanner();
      panNode.pan.value = 0;
      gainNode.connect(panNode);
      panNode.connect(this.masterGain);
    } else {
      gainNode.connect(this.masterGain);
    }

    const track = {
      id: config.id,
      offsetSec: config.offsetSec ?? 0,
      buffer: null as AudioBuffer | null,
      gainNode,
      panNode,
      currentSource: null as AudioBufferSourceNode | null,
      gain: 1,
      pan: 0,
    };

    this.tracks.set(config.id, track);

    return {
      id: config.id,
      setBuffer: (buffer) => {
        track.buffer = buffer;
      },
      setGain: (gain) => {
        track.gain = gain;
        track.gainNode.gain.value = gain;
      },
      setPan: (pan) => {
        track.pan = pan;
        if (track.panNode) track.panNode.pan.value = pan;
      },
      dispose: () => this.unregisterTrack(config.id),
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
    const ctx = this.ensureContext();
    if (this.isPlaying) return;
    if (!this.masterGain) return;

    this.isPlaying = true;
    // Compute starting point based on current playhead
    const base = this.playheadSec;
    this.lastStartContextTime = ctx.currentTime;

    this.tracks.forEach((track) => {
      if (!track.buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = track.buffer;
      const when = ctx.currentTime;
      const offset = Math.max(0, base - track.offsetSec);
      const duration = track.buffer.duration - offset;
      if (duration <= 0) return;
      source.connect(track.gainNode);
      source.start(when, offset);
      track.currentSource = source;
    });

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

    this.tracks.forEach((track) => {
      if (!track.currentSource) return;
      try {
        track.currentSource.stop();
        track.currentSource.disconnect();
      } catch {
        // ignore
      }
      track.currentSource = null;
    });

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

    // If we are currently playing, restart all sources from the new time.
    this.tracks.forEach((track) => {
      if (track.currentSource) {
        try {
          track.currentSource.stop();
          track.currentSource.disconnect();
        } catch {
          // ignore
        }
        track.currentSource = null;
      }
    });

    if (!this.audioContext) return;
    const ctx = this.audioContext;
    this.lastStartContextTime = ctx.currentTime;

    this.tracks.forEach((track) => {
      if (!track.buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = track.buffer;
      const when = ctx.currentTime;
      const offset = Math.max(0, clamped - track.offsetSec);
      const duration = track.buffer.duration - offset;
      if (duration <= 0) return;
      source.connect(track.gainNode);
      source.start(when, offset);
      track.currentSource = source;
    });

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
