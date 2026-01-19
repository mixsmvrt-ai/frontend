"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import TransportBar from "../../components/studio/TransportBar";
import TrackLane from "../../components/studio/TrackLane";
import Timeline from "../../components/studio/Timeline";
import {
  ProcessingOverlay,
  type ProcessingOverlayState,
  type TrackProcessingStatus,
  PROCESSING_STAGES,
} from "../../components/studio/ProcessingOverlay";

export const dynamic = "force-dynamic";

export type TrackType = {
  id: string;
  name: string;
  role: "beat" | "vocal" | "background" | "adlib" | "instrument";
  volume: number; // 0 - 1
  pan?: number; // -1 (L) to 1 (R)
  gender?: "male" | "female";
  file?: File;
};

type StudioMode =
  | "cleanup"
  | "mix-only"
  | "mix-master"
  | "master-only"
  | "podcast"
  | "default";

const DSP_URL = process.env.NEXT_PUBLIC_DSP_URL || "http://localhost:8001";

const GENRE_TO_DSP_KEY: Record<string, string> = {
  Dancehall: "dancehall",
  "Trap Dancehall": "trap_dancehall",
  Afrobeats: "afrobeat",
  "Hip Hop": "hiphop",
  Rap: "rap",
  "R&B": "rnb",
  Reggae: "reggae",
};

function getInitialTracksForMode(mode: StudioMode): TrackType[] {
  switch (mode) {
    case "cleanup":
      return [
        {
          id: "voice",
          name: "Voice",
          role: "vocal",
          volume: 0.9,
          pan: 0,
          gender: "male",
        },
      ];
    case "master-only":
      return [
        {
          id: "master",
          name: "Master Mix",
          role: "instrument",
          volume: 0.9,
          pan: 0,
        },
      ];
    case "podcast":
      return [
        {
          id: "host",
          name: "Host",
          role: "vocal",
          volume: 0.9,
          pan: 0,
          gender: "male",
        },
        {
          id: "guest",
          name: "Guest",
          role: "vocal",
          volume: 0.9,
          pan: 0,
          gender: "female",
        },
      ];
    case "mix-only":
    case "mix-master":
    case "default":
    default:
      return [
        { id: "beat", name: "Beat", role: "beat", volume: 0.9 },
        {
          id: "lead",
          name: "Lead Vocal",
          role: "vocal",
          volume: 0.9,
          pan: 0,
          gender: "male",
        },
        {
          id: "bvs",
          name: "Background Vocals",
          role: "background",
          volume: 0.9,
          pan: 0,
          gender: "male",
        },
        {
          id: "adlibs",
          name: "Adlibs",
          role: "adlib",
          volume: 0.9,
          pan: 0,
          gender: "male",
        },
      ];
  }
}

export default function MixStudio() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured || !supabase) {
      router.replace("/login");
      return undefined;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        if (!data.session) {
          router.replace("/login");
          return;
        }
        setAuthChecking(false);
      })
      .catch(() => {
        if (!isMounted) return;
        router.replace("/login");
      });

    return () => {
      isMounted = false;
    };
  }, [router]);
  const [studioMode, setStudioMode] = useState<StudioMode>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const flowParam = params.get("flow") as StudioMode | null;
    if (
      flowParam === "cleanup" ||
      flowParam === "mix-only" ||
      flowParam === "mix-master" ||
      flowParam === "master-only" ||
      flowParam === "podcast"
    ) {
      setStudioMode(flowParam);
    }
  }, []);

  const [tracks, setTracks] = useState<TrackType[]>(() =>
    getInitialTracksForMode("default"),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [masterVolume, setMasterVolume] = useState(0.9);
  const [trackLevels, setTrackLevels] = useState<Record<string, number>>({});
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [gridResolution, setGridResolution] = useState<"1/2" | "1/4" | "1/8">("1/4");
  const [trackDurations, setTrackDurations] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [genre, setGenre] = useState<string>("Dancehall");
  const [bpm, setBpm] = useState<number>(120);
  const [sessionKey, setSessionKey] = useState<string>("C");
  const [sessionScale, setSessionScale] = useState<"Major" | "Minor">("Major");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [hasMixed, setHasMixed] = useState(false);
  const [isMastering, setIsMastering] = useState(false);
  const [referenceProfile, setReferenceProfile] = useState<any | null>(null);
  const [referenceAnalysis, setReferenceAnalysis] = useState<any | null>(null);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [processingOverlay, setProcessingOverlay] =
    useState<ProcessingOverlayState | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Reset layout when mode changes
  useEffect(() => {
    setTracks(getInitialTracksForMode(studioMode));
    setSelectedTrackId(null);
    setTrackDurations({});
    setTrackLevels({});
    setHasMixed(false);
  }, [studioMode]);

  // Spacebar play/pause
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Ctrl + scroll zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => Math.min(3, Math.max(0.5, z + (e.deltaY > 0 ? -0.1 : 0.1))));
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  // Simple transport clock based on play/pause state
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const loop = (time: number) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      setPlayheadSeconds((prev) => prev + delta);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPlaying]);

  const handleFileSelected = useCallback((trackId: string, file: File) => {
    setTracks((prev) =>
      prev.map((track) => (track.id === trackId ? { ...track, file } : track)),
    );
  }, []);

  const handleVolumeChange = useCallback((trackId: string, volume: number) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, volume: Math.min(1, Math.max(0, volume)) } : track,
      ),
    );
  }, []);

  const handleTrackLevelChange = useCallback((trackId: string, level: number) => {
    setTrackLevels((prev) => ({ ...prev, [trackId]: level }));
  }, []);

  const handleTrackGenderChange = useCallback(
    (trackId: string, gender: "male" | "female") => {
      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId
            ? {
                ...track,
                gender,
              }
            : track,
        ),
      );
    },
    [],
  );

  const masterLevel = useMemo(() => {
    const values = Object.values(trackLevels);
    if (!values.length) return 0;
    return Math.max(...values);
  }, [trackLevels]);

  const projectDuration = useMemo(() => {
    const values = Object.values(trackDurations);
    if (!values.length) return 0;
    return Math.max(...values);
  }, [trackDurations]);

  const addTrack = () => {
    setTracks((prev) => {
      const next = [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: `Track ${prev.length + 1}`,
          role: "vocal" as const,
          volume: 0.9,
          pan: 0,
          gender: "male" as const,
        },
      ];
      return next;
    });
  };

  const handlePanChange = useCallback((trackId: string, pan: number) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId
          ? { ...track, pan: Math.max(-1, Math.min(1, pan)) }
          : track,
      ),
    );
  }, []);

  // Handle rename events from TrackLane components
  useEffect(() => {
    const handleRename = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; name: string }>).detail;
      if (!detail) return;
      setTracks((prev) =>
        prev.map((track) =>
          track.id === detail.id ? { ...track, name: detail.name } : track,
        ),
      );
    };

    window.addEventListener("mixsmvrt:rename-track", handleRename as EventListener);

    return () => {
      window.removeEventListener(
        "mixsmvrt:rename-track",
        handleRename as EventListener,
      );
    };
  }, []);

  // Handle track duration events from TrackLane components
  useEffect(() => {
    const handleDuration = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; duration: number }>).detail;
      if (!detail) return;
      setTrackDurations((prev) => ({ ...prev, [detail.id]: detail.duration }));
    };

    window.addEventListener(
      "mixsmvrt:track-duration",
      handleDuration as EventListener,
    );

    return () => {
      window.removeEventListener(
        "mixsmvrt:track-duration",
        handleDuration as EventListener,
      );
    };
  }, []);

  const handleStop = () => {
    setIsPlaying(false);
    setPlayheadSeconds(0);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setPlayheadSeconds(0);
    window.dispatchEvent(new Event("mixsmvrt:transport-prev"));
  };

  const handleNext = () => {
    setIsPlaying(false);
    if (projectDuration > 0) {
      setPlayheadSeconds(projectDuration);
    }
    window.dispatchEvent(new Event("mixsmvrt:transport-next"));
  };

  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
  };

  const handleDeleteTrack = (trackId: string) => {
    setTracks((prev) => prev.filter((track) => track.id !== trackId));
    setTrackDurations((prev) => {
      const { [trackId]: _removed, ...rest } = prev;
      return rest;
    });
    setTrackLevels((prev) => {
      const { [trackId]: _removed, ...rest } = prev;
      return rest;
    });
    setSelectedTrackId((current) => (current === trackId ? null : current));
  };

  const handleDuplicateTrack = (trackId: string) => {
    setTracks((prev) => {
      const index = prev.findIndex((track) => track.id === trackId);
      if (index === -1) return prev;
      const source = prev[index];
      const copy: TrackType = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} Copy`,
      };
      const next = [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
      return next;
    });
  };

  const processTrackWithAI = async (
    track: TrackType,
    options?: { forceMaster?: boolean },
  ): Promise<File | null> => {
    if (!track.file) return null;

    const formData = new FormData();

    let trackType: "vocal" | "beat" | "master" = "vocal";
    if (options?.forceMaster) {
      trackType = "master";
    } else if (track.role === "beat") {
      trackType = "beat";
    } else if (track.role === "instrument") {
      trackType = "master";
    }

    let presetName: string;

    if (trackType === "beat" || trackType === "master") {
      // Instrumental / 2-track or full mix bus
      presetName = "streaming_master";
    } else {
      // Vocals family – choose based on specific role
      if (track.role === "vocal") {
        // Main / lead vocal
        presetName = "clean_vocal";
      } else if (track.role === "background") {
        // Background stacks / harmonies
        presetName = "bg_vocal_glue";
      } else if (track.role === "adlib") {
        // Adlibs, hype shouts
        presetName = "adlib_hype";
      } else {
        presetName = "clean_vocal";
      }
    }

    formData.append("file", track.file);
    formData.append("track_type", trackType);
    formData.append("preset", presetName);

    if (trackType === "vocal") {
      const gender = track.gender || "male";
      formData.append("gender", gender);
    }

    const genreKey = GENRE_TO_DSP_KEY[genre];
    if (genreKey) {
      formData.append("genre", genreKey);
    }

    if (referenceProfile) {
      formData.append(
        "reference_profile",
        JSON.stringify({ preset_overrides: referenceProfile }),
      );
    }

    const response = await fetch(`${DSP_URL}/process`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to process audio with DSP service");
    }

    const data: {
      status?: string;
      output_file?: string;
      track_type?: string;
      preset?: string;
    } = await response.json();

    if (data.status !== "processed" || !data.output_file) {
      return null;
    }

    const outputUrl = data.output_file.startsWith("http")
      ? data.output_file
      : `${DSP_URL}${data.output_file}`;

    const outResp = await fetch(outputUrl);
    if (!outResp.ok) {
      throw new Error("Failed to download processed audio");
    }

    const blob = await outResp.blob();
    const processedFile = new File([blob], `${track.name}-processed.wav`, {
      type: blob.type || "audio/wav",
    });

    return processedFile;
  };

  const handleProcessFullMix = async () => {
    if (isProcessing) return;
    if (!tracks.some((track) => track.file)) return;

    setIsProcessing(true);
    setHasMixed(false);

    const playable = tracks.filter((track) => track.file);
    const initialTrackStatuses: TrackProcessingStatus[] = playable.map((track) => ({
      id: track.id,
      name: track.name || track.id,
      state: "idle",
      percentage: 0,
    }));

    setProcessingOverlay({
      active: true,
      mode: "mix",
      percentage: 0,
      currentStageId: "analyze",
      completedStageIds: [],
      tracks: initialTrackStatuses,
      error: null,
    });

    try {
      const updates = new Map<string, File>();
      let anyUpdated = false;

      // Process each track that has audio through the AI DSP service
      for (let index = 0; index < playable.length; index += 1) {
        const track = playable[index];
        const progressForTrack = (index / playable.length) * 100;

        setProcessingOverlay((prev): ProcessingOverlayState | null => {
          if (!prev) return prev;
          const updatedTracks: TrackProcessingStatus[] = prev.tracks.map((t) => {
            if (t.id === track.id) {
              return {
                ...t,
                state: "processing" as TrackProcessingStatus["state"],
                percentage: progressForTrack,
              };
            }
            return t;
          });

          const stageIndex = Math.min(
            PROCESSING_STAGES.length - 1,
            Math.floor((progressForTrack / 100) * PROCESSING_STAGES.length),
          );
          const currentStage = PROCESSING_STAGES[stageIndex];
          const completedStageIds = PROCESSING_STAGES.slice(0, stageIndex).map(
            (s) => s.id,
          );

          return {
            ...prev,
            percentage: progressForTrack,
            currentStageId: currentStage.id,
            completedStageIds,
            tracks: updatedTracks,
          };
        });

        // eslint-disable-next-line no-await-in-loop
        const processed = await processTrackWithAI(track);
        if (processed) {
          updates.set(track.id, processed);
          anyUpdated = true;

          const completedPercent = ((index + 1) / playable.length) * 100;
          setProcessingOverlay((prev): ProcessingOverlayState | null => {
            if (!prev) return prev;
            const updatedTracks: TrackProcessingStatus[] = prev.tracks.map((t) => {
              if (t.id === track.id) {
                return {
                  ...t,
                  state: "completed" as TrackProcessingStatus["state"],
                  percentage: completedPercent,
                };
              }
              return t;
            });

            const stageIndex = Math.min(
              PROCESSING_STAGES.length - 1,
              Math.floor((completedPercent / 100) * PROCESSING_STAGES.length),
            );
            const currentStage = PROCESSING_STAGES[stageIndex];
            const completedStageIds = PROCESSING_STAGES.slice(0, stageIndex + 1).map(
              (s) => s.id,
            );

            return {
              ...prev,
              percentage: completedPercent,
              currentStageId: currentStage.id,
              completedStageIds,
              tracks: updatedTracks,
            };
          });
        }
      }

      if (updates.size > 0) {
        setTracks((prev) =>
          prev.map((track) =>
            updates.has(track.id)
              ? {
                  ...track,
                  file: updates.get(track.id) ?? track.file,
                }
              : track,
          ),
        );
      }
      setHasMixed(anyUpdated);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error processing mix with AI", error);
      setProcessingOverlay((prev) =>
        prev
          ? {
              ...prev,
              error:
                error instanceof Error
                  ? error.message
                  : "Something went wrong while processing this mix.",
            }
          : prev,
      );
    } finally {
      setIsProcessing(false);
      setProcessingOverlay((prev) =>
        prev
          ? {
              ...prev,
              active: false,
              percentage: prev.error ? prev.percentage : 100,
              currentStageId: prev.error ? prev.currentStageId : "finalize",
              completedStageIds: prev.error
                ? prev.completedStageIds
                : PROCESSING_STAGES.map((s) => s.id),
            }
          : prev,
      );
    }
  };

  const handleProcessSelectedTrack = async () => {
    if (isProcessing) return;
    if (!selectedTrackId) return;

    const target = tracks.find((track) => track.id === selectedTrackId);
    if (!target || !target.file) return;

    const trackStatus: TrackProcessingStatus = {
      id: target.id,
      name: target.name || target.id,
      state: "processing",
      percentage: 0,
    };

    setProcessingOverlay({
      active: true,
      mode: "track",
      percentage: 0,
      currentStageId: "analyze",
      completedStageIds: [],
      tracks: [trackStatus],
      error: null,
    });

    setIsProcessing(true);
    try {
      const processed = await processTrackWithAI(target);
      if (processed) {
        setTracks((prev) =>
          prev.map((track) =>
            track.id === selectedTrackId
              ? {
                  ...track,
                  file: processed,
                }
              : track,
          ),
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error processing selected track with AI", error);
      setProcessingOverlay((prev) =>
        prev
          ? {
              ...prev,
              error:
                error instanceof Error
                  ? error.message
                  : "Something went wrong while processing this track.",
            }
          : prev,
      );
    } finally {
      setIsProcessing(false);
      setProcessingOverlay((prev) =>
        prev
          ? {
              ...prev,
              active: false,
              percentage: prev.error ? prev.percentage : 100,
              currentStageId: prev.error ? prev.currentStageId : "finalize",
              completedStageIds: prev.error
                ? prev.completedStageIds
                : PROCESSING_STAGES.map((s) => s.id),
            }
          : prev,
      );
    }
  };

  const handlePreviewMix = () => {
    if (!tracks.some((track) => track.file)) return;
    handlePrev();
    setIsPlaying(true);
  };

  const handleSendToMaster = async () => {
    if (isProcessing || isMastering) return;

    let target: TrackType | undefined = tracks.find(
      (track) => (track.role === "instrument" || track.role === "beat") && track.file,
    );

    if (!target && selectedTrackId) {
      target = tracks.find((track) => track.id === selectedTrackId && track.file);
    }

    if (!target || !target.file) return;

    setIsMastering(true);
    try {
      const processed = await processTrackWithAI(target, { forceMaster: true });
      if (processed) {
        const targetId = target.id;
        setTracks((prev) =>
          prev.map((track) =>
            track.id === targetId
              ? {
                  ...track,
                  file: processed,
                }
              : track,
          ),
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error sending mix to master", error);
    } finally {
      setIsMastering(false);
    }
  };

  const handleDownloadMixOnly = () => {
    if (!hasMixed) return;
    const playableTracks = tracks.filter((track) => track.file);
    if (!playableTracks.length) return;

    playableTracks.forEach((track) => {
      if (!track.file) return;
      const url = URL.createObjectURL(track.file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${track.name || track.id}-mix.wav`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    });
  };

  const handleReferenceFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzingReference(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${DSP_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error("Failed to analyze reference track", await response.text());
        return;
      }

      const data = await response.json();
      setReferenceAnalysis(data);
      if (data.preset_overrides) {
        setReferenceProfile(data.preset_overrides);
      } else {
        setReferenceProfile(null);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error analyzing reference track", error);
    } finally {
      setIsAnalyzingReference(false);
      // reset input value so the same file can be selected again if needed
      event.target.value = "";
    }
  };

  // Global keyboard shortcuts for selected track (Alt+P, Alt+D, Delete)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && (event.key === "p" || event.key === "P")) {
        event.preventDefault();
        void handleProcessSelectedTrack();
        return;
      }

      if (event.altKey && (event.key === "d" || event.key === "D")) {
        if (!selectedTrackId) return;
        event.preventDefault();
        handleDuplicateTrack(selectedTrackId);
        return;
      }

      if (!event.altKey && event.key === "Delete") {
        if (!selectedTrackId) return;
        event.preventDefault();
        handleDeleteTrack(selectedTrackId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleProcessSelectedTrack, handleDuplicateTrack, handleDeleteTrack, selectedTrackId]);

  const isMixMasterMode = studioMode === "mix-master";
  const isMixOnlyMode = studioMode === "mix-only";
  const isMasterOnlyMode = studioMode === "master-only";
  const isCleanupMode = studioMode === "cleanup";
  const isPodcastMode = studioMode === "podcast";

  let primaryActionLabel: string;
  if (isCleanupMode) {
    primaryActionLabel = isProcessing ? "Cleaning..." : "Run Cleanup";
  } else if (isMixOnlyMode) {
    primaryActionLabel = isProcessing ? "Mixing..." : "Process Mix";
  } else if (isMixMasterMode) {
    primaryActionLabel = isProcessing ? "Mixing..." : "Run Mix";
  } else if (isMasterOnlyMode) {
    primaryActionLabel = isProcessing ? "Mastering..." : "Run Master";
  } else if (isPodcastMode) {
    primaryActionLabel = isProcessing ? "Processing..." : "Process Session";
  } else {
    primaryActionLabel = isProcessing ? "Processing Mix..." : "Process Full Mix";
  }

  return authChecking ? (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-black text-sm text-white/70">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" />
        <p>Loading your studio&hellip;</p>
      </div>
    </div>
  ) : (
    <div className="flex min-h-screen flex-col bg-black text-white sm:h-screen">
      <ProcessingOverlay state={processingOverlay} />

      <TransportBar
        isPlaying={isPlaying}
        onPlayToggle={() => setIsPlaying((p) => !p)}
        onStop={handleStop}
        onPrev={handlePrev}
        onNext={handleNext}
        playheadSeconds={playheadSeconds}
        gridResolution={gridResolution}
        onGridResolutionChange={setGridResolution}
        bpm={bpm}
        onBpmChange={setBpm}
        sessionKey={sessionKey}
        onSessionKeyChange={setSessionKey}
        sessionScale={sessionScale}
        onSessionScaleChange={setSessionScale}
      />

      <div className="flex-1 overflow-y-auto bg-black pb-20 sm:pb-0">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[900px]">
            <Timeline zoom={zoom} gridResolution={gridResolution} bpm={bpm} />

            <div>
              {tracks.map((track) => (
                <TrackLane
                  key={track.id}
                  track={track}
                  zoom={zoom}
                  isPlaying={isPlaying}
                  masterVolume={masterVolume}
                  onFileSelected={handleFileSelected}
                  onVolumeChange={handleVolumeChange}
                  onPanChange={handlePanChange}
                  onLevelChange={handleTrackLevelChange}
                  onGenderChange={handleTrackGenderChange}
                  isSelected={selectedTrackId === track.id}
                  onSelect={handleSelectTrack}
                  onDelete={handleDeleteTrack}
                  onDuplicate={handleDuplicateTrack}
                  onProcess={async (trackId) => {
                    const current = tracks.find((t) => t.id === trackId);
                    if (!current || !current.file || isProcessing) return;
                    setSelectedTrackId(trackId);
                    setIsProcessing(true);
                    try {
                      const processed = await processTrackWithAI(current);
                      if (processed) {
                        setTracks((prev) =>
                          prev.map((t) =>
                            t.id === trackId
                              ? {
                                  ...t,
                                  file: processed,
                                }
                              : t,
                          ),
                        );
                      }
                    } catch (error) {
                      // eslint-disable-next-line no-console
                      console.error("Error processing track from context menu", error);
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/95 text-xs sm:bg-transparent">
        {/* Mobile sticky action bar */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 sm:hidden">
          <button
            type="button"
            onClick={addTrack}
            className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-3 text-[12px] text-white/80"
          >
            + Track
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-black"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              onClick={handlePreviewMix}
              disabled={!tracks.some((track) => track.file)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/20 px-3 text-[12px] text-white/80 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
            >
              A/B
            </button>
          </div>
          <button
            type="button"
            onClick={handleProcessFullMix}
            disabled={isProcessing || !tracks.some((track) => track.file)}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-red-600 text-[12px] font-semibold text-white shadow-[0_0_20px_rgba(225,6,0,0.8)] disabled:cursor-not-allowed disabled:bg-red-600/50"
          >
            {primaryActionLabel}
          </button>
        </div>

        {/* Desktop transport + mix controls */}
        <div className="hidden items-center justify-between px-3 py-3 text-xs sm:flex">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={addTrack}
              className="rounded bg-red-600 px-4 py-2 text-sm hover:bg-red-700"
            >
              + Add Track
            </button>
            <div className="flex items-center gap-2">
              <span className="text-white/60">Master</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={masterVolume}
                onChange={(event) => setMasterVolume(Number(event.target.value))}
                className="h-1 w-32 accent-red-500"
              />
              <div className="h-6 w-2 overflow-hidden rounded bg-zinc-800">
                <div
                  className="h-full w-full origin-bottom bg-gradient-to-t from-red-500 via-yellow-400 to-emerald-400 transition-transform"
                  style={{ transform: `scaleY(${masterLevel})` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-4 text-[11px] text-white/60 sm:flex">
              <div className="flex items-center gap-2">
                <span>Genre</span>
                <select
                  className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/90 outline-none"
                  value={genre}
                  onChange={(event) => setGenre(event.target.value)}
                >
                  <option className="bg-black">Dancehall</option>
                  <option className="bg-black">Trap Dancehall</option>
                  <option className="bg-black">Afrobeats</option>
                  <option className="bg-black">Hip Hop</option>
                  <option className="bg-black">Rap</option>
                  <option className="bg-black">R&amp;B</option>
                  <option className="bg-black">Reggae</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-white/60">
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 hover:border-red-500/60">
                <span>{isAnalyzingReference ? "Analyzing reference..." : "Reference Track"}</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleReferenceFileChange}
                  disabled={isAnalyzingReference}
                />
              </label>
              {referenceProfile && referenceAnalysis && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
                  Ref loaded
                  {typeof referenceAnalysis.lufs === "number" && (
                    <span className="ml-1 text-white/50">({referenceAnalysis.lufs.toFixed(1)} LUFS)</span>
                  )}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleProcessSelectedTrack}
                disabled={
                  isProcessing ||
                  !selectedTrackId ||
                  !tracks.some((track) => track.id === selectedTrackId && track.file)
                }
                className="rounded bg-zinc-800 px-4 py-2 text-sm text-white/80 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-white/40 hover:bg-zinc-700"
              >
                Process Selected Track
              </button>

              {isMixMasterMode && hasMixed ? (
                <>
                  <button
                    type="button"
                    onClick={handlePreviewMix}
                    disabled={!tracks.some((track) => track.file)}
                    className="rounded bg-zinc-800 px-4 py-2 text-sm text-white/80 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-white/40"
                  >
                    Preview Mix
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessFullMix}
                    disabled={isProcessing || !tracks.some((track) => track.file)}
                    className="rounded bg-zinc-800 px-4 py-2 text-sm text-white/80 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-white/40"
                  >
                    {isProcessing ? "Re-running Mix..." : "Re-run Mix"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendToMaster}
                    disabled={
                      isProcessing ||
                      isMastering ||
                      !tracks.some((track) => (track.role === "beat" || track.role === "instrument") && track.file)
                    }
                    className="rounded bg-red-600 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:bg-red-600/50"
                  >
                    {isMastering ? "Mastering..." : "Send to Master"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMixOnly}
                    disabled={!hasMixed || !tracks.some((track) => track.file)}
                    className="rounded bg-zinc-800 px-4 py-2 text-sm text-white/80 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-white/40"
                  >
                    Download Mix Only
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleProcessFullMix}
                    disabled={isProcessing || !tracks.some((track) => track.file)}
                    className="rounded bg-red-600 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:bg-red-600/50"
                  >
                    {primaryActionLabel}
                  </button>
                  {(isMasterOnlyMode || isMixOnlyMode || isCleanupMode || isPodcastMode) && hasMixed && (
                    <button
                      type="button"
                      onClick={handleDownloadMixOnly}
                      disabled={!hasMixed || !tracks.some((track) => track.file)}
                      className="rounded bg-zinc-800 px-4 py-2 text-sm text-white/80 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-white/40"
                    >
                      {isMasterOnlyMode ? "Download Master" : "Download Processed"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
