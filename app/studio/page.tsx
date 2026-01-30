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
  type ProcessingStage,
  FLOW_PROCESSING_STAGE_TEMPLATES,
} from "../../components/studio/ProcessingOverlay";
import {
  PresetSelector,
  type StudioPresetMeta,
  type ThrowFxMode,
} from "../../components/studio/PresetSelector";
import { useBackendJobStatus } from "../../lib/useBackendJobStatus";
import type { TrackPlugin } from "../../components/studio/pluginTypes";
import {
  defaultAIParams,
  defaultPluginName,
  defaultPluginParams,
  isPluginType,
} from "../../components/studio/pluginTypes";
import type { PluginWindowPosition } from "../../components/studio/PluginWindow";
import PluginWindow from "../../components/studio/PluginWindow";
import StudioToolsPanel from "../../components/studio/StudioToolsPanel";
import StudioToolsDropdown from "../../components/studio/StudioToolsDropdown";
import type { StudioRegion, StudioTool } from "../../components/studio/tools/studioTools";
import {
  concatAudioBuffers,
  sliceAudioBuffer,
  timeStretchAudioBufferSegment,
} from "../../components/studio/tools/timeStretch";
import { encodeWavFromAudioBuffer } from "../../components/studio/tools/wav";

export const dynamic = "force-dynamic";

export type TrackType = {
  id: string;
  name: string;
  role: "beat" | "vocal" | "background" | "adlib" | "instrument";
  volume: number; // 0 - 1
  pan?: number; // -1 (L) to 1 (R)
  gender?: "male" | "female";
  file?: File;
  muted?: boolean;
  solo?: boolean;
  // Visually indicate that this track's audio has been processed/mastered.
  processed?: boolean;
  plugins?: TrackPlugin[];
  regions?: StudioRegion[];
};

type StudioMode =
  | "cleanup"
  | "mix-only"
  | "mix-master"
  | "master-only"
  | "podcast"
  | "default";

type FeatureType =
  | "audio_cleanup"
  | "mixing_only"
  | "mix_master"
  | "mastering_only";

type JobType = "mix" | "master" | "mix_master";

type StudioSnapshot = {
  tracks: TrackType[];
  hasMixed: boolean;
  isMastering: boolean;
};

const DSP_URL = process.env.NEXT_PUBLIC_DSP_URL || "http://localhost:8001";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const MAX_HISTORY = 20;

function featureTypeForMode(mode: StudioMode): FeatureType | null {
  if (mode === "cleanup") return "audio_cleanup";
  if (mode === "mix-only") return "mixing_only";
  if (mode === "mix-master") return "mix_master";
  if (mode === "master-only") return "mastering_only";
  return null;
}

function jobTypeForFeature(featureType: FeatureType): JobType {
  if (featureType === "mastering_only") return "master";
  if (featureType === "mix_master") return "mix_master";
  // For cleanup and mix-only flows, use mix
  return "mix";
}

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
          muted: false,
          solo: false,
          processed: false,
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
          muted: false,
          solo: false,
          processed: false,
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
          muted: false,
          solo: false,
          processed: false,
        },
        {
          id: "guest",
          name: "Guest",
          role: "vocal",
          volume: 0.9,
          pan: 0,
          gender: "female",
          muted: false,
          solo: false,
          processed: false,
        },
      ];
    case "mix-only":
    case "mix-master":
    case "default":
    default:
      return [
        {
          id: "beat",
          name: "Beat",
          role: "beat",
          volume: 0.9,
          muted: false,
          solo: false,
          processed: false,
        },
        {
          id: "lead",
          name: "Lead Vocal",
          role: "vocal",
          volume: 0.9,
          pan: 0,
          gender: "male",
          muted: false,
          solo: false,
          processed: false,
        },
        {
          id: "bvs",
          name: "Background Vocals",
          role: "background",
          volume: 0.9,
          pan: 0,
          gender: "male",
          muted: false,
          solo: false,
          processed: false,
        },
        {
          id: "adlibs",
          name: "Adlibs",
          role: "adlib",
          volume: 0.9,
          pan: 0,
          gender: "male",
          muted: false,
          solo: false,
          processed: false,
        },
      ];
  }
}

export default function MixStudio() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [userFeatureAccess, setUserFeatureAccess] = useState<Record<FeatureType, boolean>>({
    audio_cleanup: false,
    mixing_only: false,
    mix_master: false,
    mastering_only: false,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<FeatureType | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [autosaveMinutes, setAutosaveMinutes] = useState<number>(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [hasLoadedProjectLayout, setHasLoadedProjectLayout] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState("");

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
        const email = data.session.user?.email;
        if (email && email.toLowerCase() === "mixsmvrt@gmail.com") {
          setIsAdmin(true);
        }
        // In a future iteration, this can call a dedicated backend
        // entitlement endpoint. For now, default to all features locked
        // visually; backend remains the source of truth.
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

    const projectIdParam = params.get("project_id");
    if (projectIdParam) {
      setProjectId(projectIdParam);
    }
  }, []);

  const [tracks, setTracks] = useState<TrackType[]>(() =>
    getInitialTracksForMode("default"),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1.2);
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
  const [selectedClipTrackId, setSelectedClipTrackId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<StudioTool>("select");
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<{ trackId: string; regionId: string } | null>(
    null,
  );
  const originalFileByTrackRef = useRef<Record<string, File>>({});
  const [hasMixed, setHasMixed] = useState(false);
  const [isMastering, setIsMastering] = useState(false);
  const [referenceProfile, setReferenceProfile] = useState<any | null>(null);
  const [referenceAnalysis, setReferenceAnalysis] = useState<any | null>(null);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [throwFxMode, setThrowFxMode] = useState<ThrowFxMode>("off");
  const [processingOverlay, setProcessingOverlay] =
    useState<ProcessingOverlayState | null>(null);
  const [overlayStages, setOverlayStages] = useState<ProcessingStage[] | undefined>(
    undefined,
  );
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [availablePresets, setAvailablePresets] = useState<StudioPresetMeta[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const lastPresetByModeRef = useRef<Record<StudioMode, string | null>>({
    cleanup: null,
    "mix-only": null,
    "mix-master": null,
    "master-only": null,
    podcast: null,
    default: null,
  });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const processingCancelRef = useRef<boolean>(false);
  const [undoStack, setUndoStack] = useState<StudioSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<StudioSnapshot[]>([]);

  const createSnapshot = (): StudioSnapshot => ({
    tracks: tracks.map((track) => ({ ...track })),
    hasMixed,
    isMastering,
  });

  const applySnapshot = (snapshot: StudioSnapshot) => {
    setTracks(snapshot.tracks.map((track) => ({ ...track })));
    setHasMixed(snapshot.hasMixed);
    setIsMastering(snapshot.isMastering);
  };

  const pushUndoSnapshot = () => {
    const snapshot = createSnapshot();
    setUndoStack((prev) => {
      const next = [...prev, snapshot];
      if (next.length > MAX_HISTORY) {
        return next.slice(next.length - MAX_HISTORY);
      }
      return next;
    });
    setRedoStack([]);
  };

  const backendJobStatus = useBackendJobStatus(activeJobId);

  // Load project details and any stored studio metadata when a project_id is present
  useEffect(() => {
    if (!projectId) return;
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;

    const loadProject = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select(
            "id, name, status, autosave_interval_min, last_saved_at, meta",
          )
          .eq("id", projectId)
          .single();

        if (!isMounted) return;

        if (error) {
          // eslint-disable-next-line no-console
          console.error("Failed to load project", error);
          return;
        }

        if (!data) return;

        setProjectName(data.name ?? null);
        setProjectStatus(data.status ?? null);
        setAutosaveMinutes(
          typeof data.autosave_interval_min === "number"
            ? data.autosave_interval_min
            : 0,
        );
        setLastSavedAt(data.last_saved_at ?? null);

        const meta = (data.meta ?? {}) as any;
        if (meta && typeof meta === "object") {
          if (typeof meta.bpm === "number") {
            setBpm(meta.bpm);
          }
          if (typeof meta.genre === "string") {
            setGenre(meta.genre);
          }
          if (typeof meta.sessionKey === "string") {
            setSessionKey(meta.sessionKey);
          }
          if (meta.sessionScale === "Major" || meta.sessionScale === "Minor") {
            setSessionScale(meta.sessionScale);
          }

          if (
            meta.studioMode === "cleanup" ||
            meta.studioMode === "mix-only" ||
            meta.studioMode === "mix-master" ||
            meta.studioMode === "master-only" ||
            meta.studioMode === "podcast" ||
            meta.studioMode === "default"
          ) {
            setStudioMode(meta.studioMode as StudioMode);
          }

          if (typeof meta.throwFxMode === "string") {
            if (
              meta.throwFxMode === "off" ||
              meta.throwFxMode === "1/4" ||
              meta.throwFxMode === "1/8" ||
              meta.throwFxMode === "1/16"
            ) {
              setThrowFxMode(meta.throwFxMode as ThrowFxMode);
            }
          }

          if (typeof meta.selectedPresetId === "string") {
            setSelectedPresetId(meta.selectedPresetId);
          }

          if (Array.isArray(meta.tracks) && meta.tracks.length) {
            const restoredTracks: TrackType[] = meta.tracks
              .filter((t: any) => t && typeof t === "object")
              .map((t: any) => {
                const base: TrackType = {
                  id: String(t.id ?? crypto.randomUUID()),
                  name: String(t.name ?? "Track"),
                  role:
                    t.role === "beat" ||
                    t.role === "vocal" ||
                    t.role === "background" ||
                    t.role === "adlib" ||
                    t.role === "instrument"
                      ? t.role
                      : "vocal",
                  volume:
                    typeof t.volume === "number"
                      ? Math.min(1, Math.max(0, t.volume))
                      : 0.9,
                  pan:
                    typeof t.pan === "number"
                      ? Math.max(-1, Math.min(1, t.pan))
                      : 0,
                  gender:
                    t.gender === "male" || t.gender === "female"
                      ? t.gender
                      : undefined,
                  muted: Boolean(t.muted),
                  solo: Boolean(t.solo),
                  processed: Boolean(t.processed),
                };

                const rawPlugins = Array.isArray(t.plugins) ? t.plugins : [];
                const plugins: TrackPlugin[] = rawPlugins
                  .map((p: any, index: number): TrackPlugin | null => {
                    const type =
                      typeof p.pluginType === "string" && isPluginType(p.pluginType)
                        ? p.pluginType
                        : null;
                    if (!type) return null;

                    const mergedParams = {
                      ...defaultPluginParams(type),
                      ...(p.params && typeof p.params === "object" ? p.params : {}),
                    };

                    const mergedAIParams =
                      p.aiParams && typeof p.aiParams === "object"
                        ? { ...defaultAIParams(type), ...p.aiParams }
                        : { ...defaultAIParams(type) };

                    return {
                      id: p.id || crypto.randomUUID(),
                      pluginId: p.pluginId || p.id || crypto.randomUUID(),
                      trackId: base.id,
                      pluginType: type,
                      name:
                        typeof p.name === "string" && p.name.length > 0
                          ? p.name
                          : defaultPluginName(type),
                      order: typeof p.order === "number" ? p.order : index,
                      params: mergedParams,
                      aiParams: mergedAIParams,
                      preset: typeof p.preset === "string" ? p.preset : undefined,
                      enabled:
                        typeof p.enabled === "boolean" ? p.enabled : true,
                      aiGenerated:
                        typeof p.aiGenerated === "boolean" ? p.aiGenerated : true,
                      locked:
                        typeof p.locked === "boolean" ? p.locked : !!p.aiGenerated,
                    };
                  })
                  .filter((p: TrackPlugin | null): p is TrackPlugin => p !== null)
                  .sort((a, b) => a.order - b.order);

                return {
                  ...base,
                  plugins,
                  regions: Array.isArray(t.regions)
                    ? (t.regions
                        .filter((r: any) => r && typeof r === "object")
                        .map((r: any): StudioRegion | null => {
                          const start = typeof r.start === "number" ? r.start : null;
                          const end = typeof r.end === "number" ? r.end : null;
                          if (start == null || end == null) return null;
                          if (!(end > start)) return null;
                          return {
                            id: typeof r.id === "string" ? r.id : crypto.randomUUID(),
                            start: Math.max(0, start),
                            end: Math.max(0, end),
                            name: typeof r.name === "string" ? r.name : undefined,
                            gainDb: typeof r.gainDb === "number" ? r.gainDb : 0,
                            pan: typeof r.pan === "number" ? r.pan : 0,
                            fadeInSec: typeof r.fadeInSec === "number" ? r.fadeInSec : 0,
                            fadeOutSec: typeof r.fadeOutSec === "number" ? r.fadeOutSec : 0,
                            stretchRate:
                              typeof r.stretchRate === "number" ? r.stretchRate : 1,
                            automation: Array.isArray(r.automation)
                              ? r.automation
                                  .filter((p: any) =>
                                    p && typeof p.t === "number" && typeof p.v === "number",
                                  )
                                  .map((p: any) => ({ t: p.t, v: p.v }))
                              : [],
                          };
                        })
                        .filter((r: StudioRegion | null): r is StudioRegion => r !== null)
                        .sort((a: StudioRegion, b: StudioRegion) => a.start - b.start))
                    : [],
                };
              });

            if (restoredTracks.length) {
              setTracks(restoredTracks);
              setHasLoadedProjectLayout(true);
            }
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading project", error);
      }
    };

    void loadProject();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Reset layout when mode changes
  useEffect(() => {
    if (hasLoadedProjectLayout) return;
    setTracks(getInitialTracksForMode(studioMode));
    setSelectedTrackId(null);
    setTrackDurations({});
    setTrackLevels({});
    setHasMixed(false);
  }, [studioMode, hasLoadedProjectLayout]);

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

  // Load presets whenever the studio mode changes
  useEffect(() => {
    const mapModeToPresetMode = (mode: StudioMode): string | null => {
      if (mode === "cleanup") return "audio_cleanup";
      if (mode === "mix-only") return "mixing_only";
      if (mode === "mix-master") return "mix_and_master";
      if (mode === "master-only") return "mastering_only";
      return null;
    };

    const presetMode = mapModeToPresetMode(studioMode);
    if (!presetMode) {
      setAvailablePresets([]);
      setSelectedPresetId(null);
      return;
    }

    const controller = new AbortController();
    fetch(`${BACKEND_URL}/studio/presets?mode=${presetMode}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.error("Failed to load presets", await res.text());
          return;
        }
        const data: StudioPresetMeta[] = await res.json();
        setAvailablePresets(data);

        const previous = lastPresetByModeRef.current[studioMode];
        let nextId: string | null = null;
        if (previous && data.some((p) => p.id === previous)) {
          nextId = previous;
        } else if (data.length) {
          // For beats, prefer Minimal Beat Processing by default when present
          const minimalBeat = data.find((p) => p.id === "minimal_beat_processing");
          nextId = minimalBeat?.id ?? data[0].id;
        }
        setSelectedPresetId(nextId);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        // eslint-disable-next-line no-console
        console.error("Error fetching presets", error);
      });

    return () => controller.abort();
  }, [studioMode]);

  // Ctrl + scroll zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => {
          const next = z + (e.deltaY > 0 ? -0.15 : 0.15);
          return Math.min(6, Math.max(0.5, next));
        });
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
      prev.map((track) =>
        track.id === trackId
          ? {
              ...track,
              file,
              // New upload resets any previous processed state.
              processed: false,
            }
          : track,
      ),
    );
  }, []);

  // Keep the processing overlay in sync with backend job progress & steps
  useEffect(() => {
    if (!backendJobStatus) return;

    setProcessingOverlay((prev): ProcessingOverlayState | null => {
      if (!prev) return prev;

      const steps = backendJobStatus.steps ?? undefined;
      let currentStageId = prev.currentStageId;
      let completedStageIds = prev.completedStageIds;

      if (steps && steps.length) {
        const dynamicStages: ProcessingStage[] = steps.map((s) => ({
          id: s.name,
          label: s.name,
        }));
        setOverlayStages(dynamicStages);

        const completedNames = steps.filter((s) => s.completed).map((s) => s.name);
        const firstIncomplete = steps.find((s) => !s.completed);
        currentStageId = firstIncomplete?.name ?? steps[steps.length - 1].name;
        completedStageIds = completedNames;
      }

      const nextError =
        backendJobStatus.status === "failed"
          ? backendJobStatus.error_message ||
            prev.error ||
            "Something went wrong while processing this audio."
          : prev.error;

      return {
        ...prev,
        percentage:
          typeof backendJobStatus.progress === "number"
            ? backendJobStatus.progress
            : prev.percentage,
        currentStageId,
        completedStageIds,
        error: nextError,
      };
    });
  }, [backendJobStatus]);

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

  const isAnySoloActive = useMemo(
    () => tracks.some((track) => track.solo),
    [tracks],
  );

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
          muted: false,
          solo: false,
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

  const handleToggleMute = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId
          ? { ...track, muted: !track.muted }
          : track,
      ),
    );
  }, []);

  const handleToggleSolo = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId
          ? { ...track, solo: !track.solo }
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
    setSelectedClipTrackId(null);
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
    setSelectedClipTrackId((current) => (current === trackId ? null : current));
  };

  const handleClearTrackAudio = (trackId: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId
          ? {
              ...track,
              file: undefined,
              processed: false,
            }
          : track,
      ),
    );
    setTrackDurations((prev) => {
      const { [trackId]: _removed, ...rest } = prev;
      return rest;
    });
    setTrackLevels((prev) => {
      const { [trackId]: _removed, ...rest } = prev;
      return rest;
    });
    setSelectedClipTrackId((current) => (current === trackId ? null : current));
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

    const selectedPreset =
      availablePresets.find((p) => p.id === selectedPresetId) ?? availablePresets[0];
    const presetName = selectedPreset?.dsp_chain_reference ||
      (trackType === "beat" || trackType === "master" ? "streaming_master" : "clean_vocal");

    formData.append("file", track.file);
    formData.append("track_type", trackType);
    formData.append("preset", presetName);

    // Hint DSP about the processing target so it can apply beat-safe logic
    const target: "vocal" | "beat" | "full_mix" =
      trackType === "vocal" ? "vocal" : trackType === "beat" ? "beat" : "full_mix";
    formData.append("target", target);

    if (trackType === "vocal") {
      const gender = track.gender || "male";
      formData.append("gender", gender);

      const currentMode = studioMode;
      if (
        (currentMode === "mix-only" || currentMode === "mix-master") &&
        throwFxMode &&
        throwFxMode !== "off"
      ) {
        formData.append("throw_fx_mode", throwFxMode);
      }
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

    // Capture the current mix so it can be restored via Undo.
    pushUndoSnapshot();

    // Reset any previous cancellation signal.
    processingCancelRef.current = false;

    setIsProcessing(true);
    setHasMixed(false);

    const featureType = featureTypeForMode(studioMode) ?? "mix_master";
    const jobType = jobTypeForFeature(featureType);
    const flowStages =
      FLOW_PROCESSING_STAGE_TEMPLATES[featureType] &&
      FLOW_PROCESSING_STAGE_TEMPLATES[featureType].length
        ? FLOW_PROCESSING_STAGE_TEMPLATES[featureType]
        : PROCESSING_STAGES;
    const initialStageId = (flowStages[0] ?? PROCESSING_STAGES[0]).id;

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
      currentStageId: initialStageId,
      completedStageIds: [],
      tracks: initialTrackStatuses,
      error: null,
    });

    // Seed overlay with the flow-specific stages immediately.
    setOverlayStages(flowStages);

    // Kick off a backend processing job so the overlay can track
    // real step-based progress via /status/{job_id}. This currently
    // drives Supabase job rows and the UI, while the DSP service
    // handles the actual per-track processing below.
    try {
      const payload = {
        user_id: null as string | null,
        feature_type: featureType,
        job_type: jobType,
        preset_id: selectedPresetId,
        target: "full_mix" as const,
        input_files: {
          _meta: {
            display_name: "Studio session mix",
          },
        },
      };

      const res = await fetch(`${BACKEND_URL}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          id: string;
          steps?: { name: string; completed: boolean }[];
        };
        setActiveJobId(data.id);
        if (data.steps && data.steps.length) {
          const dynamicStages: ProcessingStage[] = data.steps.map((s) => ({
            id: s.name,
            label: s.name,
          }));
          setOverlayStages(dynamicStages);
        }
      } else {
        // eslint-disable-next-line no-console
        console.error("Failed to create backend processing job", await res.text());
        setActiveJobId(null);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error creating backend processing job", error);
      setActiveJobId(null);
    }

    try {
      const updates = new Map<string, File>();
      let anyUpdated = false;

      // Process each track that has audio through the AI DSP service
      for (let index = 0; index < playable.length; index += 1) {
        if (processingCancelRef.current) {
          break;
        }

        const track = playable[index];
        // Show a small non-zero progress value while the first track is running
        const baseProgress = (index / playable.length) * 100;
        const progressForTrack = Math.max(5, baseProgress);

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
            flowStages.length - 1,
            Math.floor((progressForTrack / 100) * flowStages.length),
          );
          const currentStage = flowStages[stageIndex];
          const completedStageIds = flowStages.slice(0, stageIndex).map((s) => s.id);

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
        if (processed && !processingCancelRef.current) {
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
              flowStages.length - 1,
              Math.floor((completedPercent / 100) * flowStages.length),
            );
            const currentStage = flowStages[stageIndex];
            const completedStageIds = flowStages
              .slice(0, stageIndex + 1)
              .map((s) => s.id);

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

      if (!processingCancelRef.current && updates.size > 0) {
        setTracks((prev) =>
          prev.map((track) =>
            updates.has(track.id)
              ? {
                  ...track,
                  file: updates.get(track.id) ?? track.file,
                  // Mark tracks whose audio has been updated by the AI
                  // pipeline so their waveforms can appear "bigger".
                  processed: true,
                }
              : track,
          ),
        );
      }
      setHasMixed(!processingCancelRef.current && anyUpdated);
      if (!processingCancelRef.current && anyUpdated) {
        setProcessingOverlay((prev): ProcessingOverlayState | null =>
          prev
            ? {
                ...prev,
                percentage: 100,
                currentStageId:
                  (flowStages[flowStages.length - 1] ?? flowStages[0]).id,
                completedStageIds: flowStages.map((s) => s.id),
              }
            : prev,
        );
      }
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
      setProcessingOverlay((prev) => prev);
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
                  processed: true,
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

  const [openPluginEditors, setOpenPluginEditors] = useState<
    Array<{ trackId: string; pluginId: string }>
  >([]);
  const [pluginWindowPositions, setPluginWindowPositions] = useState<
    Record<string, PluginWindowPosition>
  >({});

  const closeTopmostPluginWindow = useCallback(() => {
    setOpenPluginEditors((prev) => (prev.length ? prev.slice(0, -1) : prev));
  }, []);

  const getDefaultPluginWindowPos = useCallback((): PluginWindowPosition => {
    const w = 760;
    const h = 560;
    const margin = 12;
    const x = Math.max(margin, Math.round(window.innerWidth / 2 - w / 2));
    const y = Math.max(margin, Math.round(window.innerHeight / 2 - h / 2));
    return { x, y };
  }, []);

  const bringPluginToFront = useCallback((trackId: string, pluginId: string) => {
    setOpenPluginEditors((prev) => {
      const idx = prev.findIndex((p) => p.trackId === trackId && p.pluginId === pluginId);
      if (idx < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.push(item);
      return next;
    });
  }, []);

  const openPluginWindow = useCallback(
    (trackId: string, pluginId: string) => {
      const windowId = `${trackId}:${pluginId}`;
      setPluginWindowPositions((prev) => {
        if (prev[windowId]) return prev;
        return { ...prev, [windowId]: getDefaultPluginWindowPos() };
      });
      setOpenPluginEditors((prev) => {
        const exists = prev.some((p) => p.trackId === trackId && p.pluginId === pluginId);
        const base = exists
          ? prev.filter((p) => !(p.trackId === trackId && p.pluginId === pluginId))
          : prev;
        return [...base, { trackId, pluginId }];
      });
    },
    [getDefaultPluginWindowPos],
  );

  // Global keyboard shortcuts for selected track (Alt+P, Alt+D, Delete)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTopmostPluginWindow();
        return;
      }
      if (event.altKey && (event.key === "d" || event.key === "D")) {
        if (!selectedTrackId) return;
        event.preventDefault();
        handleDuplicateTrack(selectedTrackId);
        return;
      }

      if (!event.altKey && event.key === "Delete") {
        event.preventDefault();
        if (selectedClipTrackId) {
          handleClearTrackAudio(selectedClipTrackId);
          return;
        }
        if (!selectedTrackId) return;
        handleDeleteTrack(selectedTrackId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeTopmostPluginWindow,
    handleDuplicateTrack,
    handleDeleteTrack,
    handleClearTrackAudio,
    selectedTrackId,
    selectedClipTrackId,
  ]);

  const isMixMasterMode = studioMode === "mix-master";
  const isMixOnlyMode = studioMode === "mix-only";
  const isMasterOnlyMode = studioMode === "master-only";
  const isCleanupMode = studioMode === "cleanup";
  const isPodcastMode = studioMode === "podcast";
  const hasBeatTrack = tracks.some((track) => track.role === "beat" && track.file);

  const handleCancelProcessingOverlay = () => {
    // Signal any in-flight processing loops to stop and avoid
    // committing processed audio back into the tracks state.
    processingCancelRef.current = true;
    setIsProcessing(false);
    setProcessingOverlay(null);
    setActiveJobId(null);
    setOverlayStages(undefined);
  };

  useEffect(() => {
    if (!openPluginEditors.length) return;
    const onDocPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".mixsmvrt-plugin-window")) return;
      closeTopmostPluginWindow();
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [closeTopmostPluginWindow, openPluginEditors.length]);

  const featureForMode: FeatureType | null = isCleanupMode
    ? "audio_cleanup"
    : isMixOnlyMode
      ? "mixing_only"
      : isMixMasterMode
        ? "mix_master"
        : isMasterOnlyMode
          ? "mastering_only"
          : null;
  const isPrimaryFeatureLocked =
    featureForMode != null && !userFeatureAccess[featureForMode] && !isAdmin;

  const canUndo = undoStack.length > 0 && !isProcessing;
  const canRedo = redoStack.length > 0 && !isProcessing;

  const handleTrackPluginsChange = useCallback(
    (trackId: string, plugins: TrackPlugin[]) => {
      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId
            ? {
                ...track,
                plugins,
              }
            : track,
        ),
      );
    },
    [],
  );

  const handleUndo = () => {
    if (!canUndo) return;
    const previous = undoStack[undoStack.length - 1];
    const remaining = undoStack.slice(0, -1);

    const current: StudioSnapshot = createSnapshot();
    setUndoStack(remaining);
    setRedoStack((prev) => [...prev, current]);
    applySnapshot(previous);
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    const remaining = redoStack.slice(0, -1);

    const current: StudioSnapshot = createSnapshot();
    setRedoStack(remaining);
    setUndoStack((prev) => [...prev, current]);
    applySnapshot(nextSnapshot);
  };

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

  const buildProjectMeta = useCallback(() => {
    const trackLayout = tracks.map((track) => ({
      id: track.id,
      name: track.name,
      role: track.role,
      volume: track.volume,
      pan: typeof track.pan === "number" ? track.pan : 0,
      gender: track.gender,
      muted: Boolean(track.muted),
      solo: Boolean(track.solo),
      processed: Boolean(track.processed),
      regions: (track.regions || []).map((r) => ({
        id: r.id,
        start: r.start,
        end: r.end,
        name: r.name,
        gainDb: typeof r.gainDb === "number" ? r.gainDb : 0,
        pan: typeof r.pan === "number" ? r.pan : 0,
        fadeInSec: typeof r.fadeInSec === "number" ? r.fadeInSec : 0,
        fadeOutSec: typeof r.fadeOutSec === "number" ? r.fadeOutSec : 0,
        stretchRate: typeof (r as any).stretchRate === "number" ? (r as any).stretchRate : 1,
        automation: Array.isArray((r as any).automation) ? (r as any).automation : [],
      })),
      plugins: (track.plugins || []).map((plugin) => ({
        id: plugin.id,
        pluginId: plugin.pluginId,
        pluginType: plugin.pluginType,
        name: plugin.name,
        order: plugin.order,
        params: plugin.params,
        aiParams: plugin.aiParams,
        preset: plugin.preset,
        enabled: plugin.enabled,
        aiGenerated: plugin.aiGenerated,
        locked: plugin.locked,
      })),
    }));

    return {
      bpm,
      genre,
      sessionKey,
      sessionScale,
      studioMode,
      throwFxMode,
      selectedPresetId,
      tracks: trackLayout,
    };
  }, [
    bpm,
    genre,
    sessionKey,
    sessionScale,
    studioMode,
    throwFxMode,
    selectedPresetId,
    tracks,
  ]);

  const handleSaveProject = useCallback(
    async () => {
      if (!projectId) return;
      if (!isSupabaseConfigured || !supabase) return;

      setIsSavingProject(true);
      try {
        const meta = buildProjectMeta();
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("projects")
          .update({
            meta,
            autosave_interval_min: autosaveMinutes,
            last_saved_at: now,
          })
          .eq("id", projectId)
          .select("status, last_saved_at, autosave_interval_min")
          .single();

        if (error) {
          // eslint-disable-next-line no-console
          console.error("Failed to save project", error);
          return;
        }

        if (data) {
          setProjectStatus(data.status ?? projectStatus);
          setLastSavedAt(data.last_saved_at ?? now);
          setAutosaveMinutes(
            typeof data.autosave_interval_min === "number"
              ? data.autosave_interval_min
              : autosaveMinutes,
          );
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error saving project", error);
      } finally {
        setIsSavingProject(false);
      }
    },
    [
      projectId,
      isSupabaseConfigured,
      supabase,
      buildProjectMeta,
      autosaveMinutes,
      projectStatus,
    ],
  );

  const handleCreateAndSaveProject = useCallback(
    async (name: string) => {
      if (!isSupabaseConfigured || !supabase) return;

      setIsSavingProject(true);
      try {
        const meta = buildProjectMeta();
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("projects")
          .insert({
            name,
            meta,
            autosave_interval_min: autosaveMinutes,
            last_saved_at: now,
          })
          .select("id, name, status, last_saved_at, autosave_interval_min")
          .single();

        if (error) {
          // eslint-disable-next-line no-console
          console.error("Failed to create project", error);
          return;
        }

        if (data) {
          setProjectId(data.id ?? null);
          setProjectName(data.name ?? name);
          setProjectStatus(data.status ?? null);
          setLastSavedAt(data.last_saved_at ?? now);
          setAutosaveMinutes(
            typeof data.autosave_interval_min === "number"
              ? data.autosave_interval_min
              : autosaveMinutes,
          );
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error creating project", error);
      } finally {
        setIsSavingProject(false);
      }
    },
    [
      autosaveMinutes,
      buildProjectMeta,
      isSupabaseConfigured,
      supabase,
    ],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || (e.target as HTMLElement | null)?.isContentEditable;
      if (isTyping) return;

      const key = e.key.toLowerCase();
      if (key === "v") setActiveTool("select");
      if (key === "s") setActiveTool("slice");
      if (key === "t") setActiveTool("trim");
      if (key === "f") setActiveTool("fade");
      if (key === "g") setActiveTool("gain");
      if (key === "p") setActiveTool("pan");
      if (key === "a") setActiveTool("automation");
      if (key === "r") setActiveTool("stretch");
      if (key === "escape") setSelectedRegion(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedRegionSummary = useMemo(() => {
    if (!selectedRegion) return null;
    const t = tracks.find((x) => x.id === selectedRegion.trackId);
    if (!t) return null;
    const r = (t.regions || []).find((x) => x.id === selectedRegion.regionId);
    if (!r) return null;
    return {
      trackName: t.name,
      regionLabel: r.name || "Clip",
      gainDb: typeof r.gainDb === "number" ? r.gainDb : 0,
      pan: typeof r.pan === "number" ? r.pan : 0,
      fadeInSec: typeof r.fadeInSec === "number" ? r.fadeInSec : 0,
      fadeOutSec: typeof r.fadeOutSec === "number" ? r.fadeOutSec : 0,
      stretchRate: typeof (r as any).stretchRate === "number" ? (r as any).stretchRate : 1,
      automationPoints: Array.isArray((r as any).automation) ? (r as any).automation.length : 0,
    };
  }, [selectedRegion, tracks]);

  const patchSelectedRegion = useCallback(
    (patch: {
      gainDb?: number;
      pan?: number;
      fadeInSec?: number;
      fadeOutSec?: number;
      stretchRate?: number;
      automation?: { t: number; v: number }[];
    }) => {
      if (!selectedRegion) return;
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id !== selectedRegion.trackId) return t;
          const nextRegions = (t.regions || []).map((r) =>
            r.id === selectedRegion.regionId
              ? {
                  ...r,
                  ...patch,
                }
              : r,
          );
          return { ...t, regions: nextRegions };
        }),
      );
    },
    [selectedRegion],
  );

  const applyTimeStretchToTrack = useCallback(
    async (trackId: string, regionId: string, stretchRate: number) => {
      const t = tracks.find((x) => x.id === trackId);
      if (!t?.file) return;
      const regions = t.regions || [];
      const region = regions.find((r) => r.id === regionId);
      if (!region) return;
      if (!Number.isFinite(stretchRate) || stretchRate <= 0) return;
      if (Math.abs(stretchRate - 1) < 0.01) return;

      if (!originalFileByTrackRef.current[trackId]) {
        originalFileByTrackRef.current[trackId] = t.file;
      }

      // Decode current file
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      try {
        const arrayBuffer = await t.file.arrayBuffer();
        const audioBuffer = await ac.decodeAudioData(arrayBuffer.slice(0));

        const start = Math.max(0, region.start);
        const end = Math.max(start, region.end);
        const oldDur = end - start;
        if (oldDur <= 0) return;

        const prefix = sliceAudioBuffer(ac, audioBuffer, 0, start);
        const stretched = await timeStretchAudioBufferSegment(
          ac,
          audioBuffer,
          start,
          end,
          stretchRate,
        );
        const suffix = sliceAudioBuffer(ac, audioBuffer, end, audioBuffer.duration);

        const combined = concatAudioBuffers(ac, [prefix, stretched, suffix]);
        const blob = encodeWavFromAudioBuffer(combined);
        const nextFile = new File([blob], `${t.name}-stretched.wav`, {
          type: "audio/wav",
        });

        const delta = stretched.duration - oldDur;
        const oldEnd = end;
        const newEnd = start + stretched.duration;

        setTracks((prev) =>
          prev.map((trk) => {
            if (trk.id !== trackId) return trk;
            const nextRegions: StudioRegion[] = (trk.regions || []).map((r) => {
              const automation = Array.isArray((r as any).automation)
                ? ((r as any).automation as any)
                : [];

              if (r.id === regionId) {
                const nextAutomation = automation
                  .filter((p: any) => p && typeof p.t === "number" && typeof p.v === "number")
                  .map((p: any) => {
                    const tt = p.t;
                    if (tt < start) return p;
                    if (tt > oldEnd) return { ...p, t: tt + delta };
                    return { ...p, t: start + (tt - start) * stretchRate };
                  })
                  .sort((a: any, b: any) => a.t - b.t);

                return {
                  ...r,
                  end: newEnd,
                  stretchRate: 1,
                  automation: nextAutomation,
                } as any;
              }

              if (r.start >= oldEnd) {
                const shiftedAutomation = automation
                  .filter((p: any) => p && typeof p.t === "number" && typeof p.v === "number")
                  .map((p: any) => ({ ...p, t: p.t + delta }))
                  .sort((a: any, b: any) => a.t - b.t);
                return {
                  ...r,
                  start: r.start + delta,
                  end: r.end + delta,
                  automation: shiftedAutomation,
                } as any;
              }

              return r;
            });

            return {
              ...trk,
              file: nextFile,
              processed: false,
              regions: nextRegions,
            };
          }),
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Time-stretch failed", error);
      } finally {
        try {
          await ac.close();
        } catch {
          // ignore
        }
      }
    },
    [tracks],
  );

  useEffect(() => {
    if (!projectId) return;
    if (!autosaveMinutes || autosaveMinutes <= 0) return;
    if (!isSupabaseConfigured || !supabase) return;

    const intervalMs = autosaveMinutes * 60 * 1000;
    const id = window.setInterval(() => {
      void handleSaveProject();
    }, intervalMs);

    return () => {
      window.clearInterval(id);
    };
  }, [projectId, autosaveMinutes, handleSaveProject]);

  return authChecking ? (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-black text-sm text-white/70">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" />
        <p>Loading your studio&hellip;</p>
      </div>
    </div>
  ) : (
    <div className="flex h-full min-h-0 flex-col bg-black text-white">
      {isSaveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-zinc-950 p-4 shadow-xl">
            <h2 className="text-sm font-semibold text-white">Save project</h2>
            <p className="mt-1 text-[11px] text-white/60">
              Name this session so you can find it later in your dashboard.
            </p>
            <div className="mt-3">
              <label className="block text-[11px] text-white/60">
                Project name
                <input
                  type="text"
                  value={saveDialogName}
                  onChange={(event) => setSaveDialogName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-white/15 bg-black px-2 py-1.5 text-[13px] text-white outline-none focus:border-white/40"
                  autoFocus
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2 text-[12px]">
              <button
                type="button"
                onClick={() => setIsSaveDialogOpen(false)}
                className="rounded-full border border-white/15 bg-black px-3 py-1.5 text-white/70 hover:border-white/40 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const trimmed = saveDialogName.trim();
                  if (!trimmed) return;
                  await handleCreateAndSaveProject(trimmed);
                  setIsSaveDialogOpen(false);
                }}
                disabled={isSavingProject || !saveDialogName.trim().length}
                className="rounded-full bg-white px-3 py-1.5 font-medium text-black shadow-[0_0_14px_rgba(255,255,255,0.35)] disabled:cursor-not-allowed disabled:bg-white/70"
              >
                {isSavingProject ? "Saving..." : "Save project"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProcessingOverlay
        state={processingOverlay}
        stages={overlayStages}
        onCancel={handleCancelProcessingOverlay}
        onDownload={
          processingOverlay &&
          processingOverlay.mode === "mix" &&
          hasMixed &&
          tracks.some((track) => track.file)
            ? handleDownloadMixOnly
            : undefined
        }
      />

      {(() => {
        const baseName = projectName && projectName.trim().length > 0 ? projectName : null;
        const derivedName = !baseName
          ? !projectId && autosaveMinutes > 0
            ? "Untitled"
            : !projectId && autosaveMinutes <= 0
              ? "Unsaved"
              : "Untitled session"
          : baseName;

        return (
          <div className="border-b border-white/10 bg-black/90">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 truncate rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/80"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  <span className="text-white/60">Project</span>
                  <span className="truncate font-medium text-white">
                    {derivedName}
                  </span>
                  <span className="text-[9px] text-white/40" aria-hidden="true">
                    ▾
                  </span>
                </button>
                {projectStatus && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/50">
                    {projectStatus}
                  </span>
                )}
                {lastSavedAt && (
                  <span className="text-[11px] text-white/50">
                    Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-[11px] text-white/70 hover:border-white/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Undo last processing"
                  >
                    ⟲
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-[11px] text-white/70 hover:border-white/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Redo processing"
                  >
                    ⟳
                  </button>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-white/60">
                  <span>Autosave</span>
                  <select
                    className="rounded-full border border-white/15 bg-black px-2 py-1 text-[11px] text-white/90 outline-none"
                    value={autosaveMinutes}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      // Allow 0 as "Off"
                      setAutosaveMinutes(Number.isFinite(value) ? value : 0);
                    }}
                  >
                    <option value={0}>Off</option>
                    <option value={1}>Every 1 min</option>
                    <option value={5}>Every 5 min</option>
                    <option value={10}>Every 10 min</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!projectId) {
                      const base = projectName && projectName.trim().length > 0
                        ? projectName
                        : autosaveMinutes > 0
                          ? "Untitled"
                          : "Unsaved";
                      setSaveDialogName(base);
                      setIsSaveDialogOpen(true);
                      return;
                    }

                    void handleSaveProject();
                  }}
                  disabled={isSavingProject}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-black shadow-[0_0_16px_rgba(255,255,255,0.3)] disabled:cursor-not-allowed disabled:bg-white/70"
                >
                  {isSavingProject ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

      <StudioToolsDropdown
        activeTool={activeTool}
        onChangeTool={setActiveTool}
        selectedRegionSummary={selectedRegionSummary}
        onChangeSelectedRegion={patchSelectedRegion}
      />

      <div className="flex flex-1 min-h-0 bg-black pb-28 sm:pb-0">
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <div className="min-w-[900px]">
            <Timeline
              zoom={zoom}
              gridResolution={gridResolution}
              bpm={bpm}
              onZoomChange={(value) =>
                setZoom((prev) => {
                  const clamped = Math.min(6, Math.max(0.5, value));
                  return Number.isFinite(clamped) ? clamped : prev;
                })
              }
            />

            <div>
              {tracks.map((track) => (
                <TrackLane
                  key={track.id}
                  track={track}
                  zoom={zoom}
                  isPlaying={isPlaying}
                  masterVolume={masterVolume}
                  activeTool={activeTool}
                  gridResolution={gridResolution}
                  bpm={bpm}
                  regions={track.regions || []}
                  selectedRegionId={
                    selectedRegion?.trackId === track.id ? selectedRegion.regionId : null
                  }
                  onSelectRegion={(trackId, regionId) => {
                    if (!regionId) {
                      setSelectedRegion(null);
                      return;
                    }
                    setSelectedRegion({ trackId, regionId });
                  }}
                  onRegionsChange={(trackId, nextRegions) => {
                    setTracks((prev) =>
                      prev.map((t) =>
                        t.id === trackId ? { ...t, regions: nextRegions } : t,
                      ),
                    );
                  }}
                  onCommitStretch={(trackId, regionId, stretchRate) => {
                    void applyTimeStretchToTrack(trackId, regionId, stretchRate);
                  }}
                  onFileSelected={handleFileSelected}
                  onVolumeChange={handleVolumeChange}
                  onPanChange={handlePanChange}
                  onLevelChange={handleTrackLevelChange}
                  onGenderChange={handleTrackGenderChange}
                  onToggleMute={handleToggleMute}
                  onToggleSolo={handleToggleSolo}
                  isAnySoloActive={isAnySoloActive}
                  isSelected={selectedTrackId === track.id}
                  onSelect={handleSelectTrack}
                  plugins={track.plugins}
                  onPluginsChange={handleTrackPluginsChange}
                  onOpenPlugin={(trackId, plugin) => {
                    openPluginWindow(trackId, plugin.id);
                  }}
                  isAudioSelected={selectedClipTrackId === track.id}
                  onSelectAudio={(trackId) => setSelectedClipTrackId(trackId)}
                  onClearAudio={handleClearTrackAudio}
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
                                  processed: true,
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

            <div className="hidden min-w-[220px] max-w-xs sm:block">
              <PresetSelector
                presets={availablePresets}
                modeLabel={
                  isCleanupMode
                    ? "Audio Cleanup"
                    : isMixOnlyMode
                      ? "Mixing Only"
                      : isMixMasterMode
                        ? "Mixing & Mastering"
                        : isMasterOnlyMode
                          ? "Mastering Only"
                          : "Studio"
                }
                selectedPresetId={selectedPresetId}
                onChange={(presetId) => {
                  setSelectedPresetId(presetId);
                  lastPresetByModeRef.current[studioMode] = presetId;
                }}
                hasBeatTrack={hasBeatTrack}
                showThrowFxControls={isMixOnlyMode || isMixMasterMode}
                throwFxMode={throwFxMode}
                onThrowFxModeChange={setThrowFxMode}
              />
            </div>

            <div className="flex gap-2">
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
                (isMasterOnlyMode || isMixOnlyMode || isCleanupMode || isPodcastMode) && hasMixed && (
                  <button
                    type="button"
                    onClick={handleDownloadMixOnly}
                    disabled={!hasMixed || !tracks.some((track) => track.file)}
                    className="rounded bg-zinc-800 px-4 py-2 text-sm text-white/80 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-white/40"
                  >
                    {isMasterOnlyMode ? "Download Master" : "Download Processed"}
                  </button>
                )
              )}
            </div>
          </div>
          {/* Primary processing action with simple visual gating */}
          <div className="sticky bottom-0 z-10 border-t border-white/10 bg-gradient-to-t from-black via-black/95 to-black/80 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col text-[11px] text-white/60">
                <span className="font-medium text-white/80">Primary processing</span>
                <span>
                  {featureForMode === "audio_cleanup" && "Audio Cleanup"}
                  {featureForMode === "mixing_only" && "Mixing Only"}
                  {featureForMode === "mix_master" && "Mixing & Mastering"}
                  {featureForMode === "mastering_only" && "Mastering Only"}
                  {!featureForMode && "Full Mix"}
                </span>
              </div>
              <button
                type="button"
                disabled={isProcessing || isPrimaryFeatureLocked}
                onClick={() => {
                  if (isPrimaryFeatureLocked) {
                    setShowUpgradeModal(featureForMode);
                    return;
                  }
                  void handleProcessFullMix();
                }}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  isPrimaryFeatureLocked
                    ? "border border-white/15 bg-transparent text-white/70"
                    : "bg-brand-primary text-white shadow-[0_0_30px_rgba(225,6,0,0.9)] hover:bg-[#ff291e]"
                }`}
              >
                {isPrimaryFeatureLocked && (
                  <span aria-hidden="true">🔒</span>
                )}
                <span>{primaryActionLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {openPluginEditors.map((ref, index) => {
        const track = tracks.find((t) => t.id === ref.trackId);
        const plugin = track?.plugins?.find((p) => p.id === ref.pluginId);
        if (!track || !plugin) return null;
        const windowId = `${ref.trackId}:${ref.pluginId}`;
        const pos = pluginWindowPositions[windowId] ?? { x: 24 + index * 16, y: 24 + index * 16 };
        return (
          <PluginWindow
            key={windowId}
            windowId={windowId}
            plugin={plugin}
            position={pos}
            zIndex={60 + index}
            onFocus={() => bringPluginToFront(ref.trackId, ref.pluginId)}
            onPositionChange={(nextPos) =>
              setPluginWindowPositions((prev) => ({ ...prev, [windowId]: nextPos }))
            }
            onChange={(next) => {
              setTracks((prev) =>
                prev.map((t) =>
                  t.id === track.id
                    ? {
                        ...t,
                        plugins: (t.plugins || []).map((p) => (p.id === plugin.id ? next : p)),
                      }
                    : t,
                ),
              );
            }}
            onClose={() =>
              setOpenPluginEditors((prev) =>
                prev.filter((p) => !(p.trackId === ref.trackId && p.pluginId === ref.pluginId)),
              )
            }
          />
        );
      })}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#050509]/95 p-4 shadow-[0_0_45px_rgba(0,0,0,0.85)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">
                  Unlock processing
                </p>
                <h2 className="mt-1 text-sm font-semibold text-white">
                  This feature is locked for your account.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-xs text-white/80 hover:bg-white/5"
                aria-label="Close upgrade dialog"
              >
                ×
              </button>
            </div>

            <p className="text-[12px] text-white/70">
              Upgrade to a monthly subscription for full access, or purchase a
              one-off credit to run this specific processing type.
            </p>

            <div className="mt-4 space-y-3 text-[12px]">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Monthly subscription
                </p>
                <p className="mt-1 text-sm font-medium text-white">Full studio access</p>
                <p className="mt-1 text-[12px] text-white/70">
                  Unlimited audio cleanup, mixing, mixing &amp; mastering, and
                  mastering while your subscription is active.
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-brand-primary px-4 text-[12px] font-medium text-white shadow-[0_0_22px_rgba(225,6,0,0.9)] hover:bg-[#ff291e]"
                >
                  Continue to subscription checkout
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Pay-as-you-go
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  Unlock this feature only
                </p>
                <p className="mt-1 text-[12px] text-white/70">
                  Buy a single credit to run this processing once. Credits are
                  applied immediately after checkout.
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-white/20 px-4 text-[12px] font-medium text-white hover:border-brand-primary hover:text-brand-primary"
                >
                  Purchase a one-off credit
                </button>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-white/50">
              Powered by secure PayPal checkout. You&apos;ll return here
              automatically once your payment is complete.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
