"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getAudioTransport, type TransportStateSnapshot, type TransportTrackHandle } from "./AudioTransport";

interface AudioTransportContextValue extends TransportStateSnapshot {
  play: () => void;
  pause: () => void;
  seek: (timeSec: number) => void;
  registerTrack: (id: string, offsetSec?: number) => TransportTrackHandle;
  decodeFile: (file: File) => Promise<AudioBuffer>;
}

const AudioTransportContext = createContext<AudioTransportContextValue | null>(null);

export function AudioTransportProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TransportStateSnapshot>(() => {
    return getAudioTransport().getState();
  });

  useEffect(() => {
    const transport = getAudioTransport();
    return transport.subscribe((next) => {
      setState(next);
    });
  }, []);

  const value: AudioTransportContextValue = {
    ...state,
    play: () => getAudioTransport().play(),
    pause: () => getAudioTransport().pause(),
    seek: (t: number) => getAudioTransport().seek(t),
    registerTrack: (id: string, offsetSec?: number) =>
      getAudioTransport().registerTrack({ id, offsetSec }),
    decodeFile: (file: File) => getAudioTransport().decodeFileToBuffer(file),
  };

  return (
    <AudioTransportContext.Provider value={value}>
      {children}
    </AudioTransportContext.Provider>
  );
}

export function useAudioTransport(): AudioTransportContextValue {
  const ctx = useContext(AudioTransportContext);
  if (!ctx) {
    throw new Error("useAudioTransport must be used within AudioTransportProvider");
  }
  return ctx;
}
