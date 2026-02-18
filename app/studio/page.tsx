"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import TransportBar from "../../components/studio/TransportBar";
import TrackLane from "../../components/studio/TrackLane";
import Timeline from "../../components/studio/Timeline";
import TrackPluginRack from "../../components/studio/TrackPluginRack";
import { AudioTransportProvider, useAudioTransport } from "../../audio-engine/AudioTransportContext";
import {
  ProcessingOverlay,
  type ProcessingOverlayState,
  type TrackProcessingStatus,
  type ProcessingStage,
} from "../../components/studio/ProcessingOverlay";
import {
  PresetSelector,
  type StudioPresetMeta,
  type ThrowFxMode,
} from "../../components/studio/PresetSelector";
import { useProcessingJob } from "../../lib/useProcessingJob";
import type { FlowKey } from "../../lib/flowSteps";
import { getFlowSteps } from "../../lib/flowSteps";
import type { TrackPlugin } from "../../components/studio/pluginTypes";
import {
  defaultAIParams,
  defaultPluginName,
  defaultPluginParams,
  getPluginPresets,
  isPluginType,
} from "../../components/studio/pluginTypes";
import type { PluginWindowPosition } from "../../components/studio/PluginWindow";
import PluginWindow from "../../components/studio/PluginWindow";
import StudioToolsPanel from "../../components/studio/StudioToolsPanel";
import StudioToolsDropdown from "../../components/studio/StudioToolsDropdown";
import { type StudioRegion, type StudioTool } from "../../components/studio/tools/studioTools";
import {
  concatAudioBuffers,
  sliceAudioBuffer,
  timeStretchAudioBufferSegment,
} from "../../components/studio/tools/timeStretch";
import { encodeWavFromAudioBuffer } from "../../components/studio/tools/wav";
import {
  mapVirtualTracksFromBackend,
  type BackendVirtualTrack,
  type VirtualMixerTrack,
} from "../../lib/virtualTracks";

export const dynamic = "force-dynamic";

export default function MixStudio() {
  return (
    <AudioTransportProvider>
      <MixStudioInner />
    </AudioTransportProvider>
  );
}

export type TrackType = {
  id: string;
  name: string;
  role: "beat" | "vocal" | "background" | "adlib" | "instrument";
  volume: number; // 0 - 1
  pan?: number; // -1 (L) to 1 (R)
  gender?: "male" | "female";
  file?: File;
  s3_key?: string | null;
  local_preview_url?: string | null;
  upload_status?: "idle" | "uploading" | "uploaded" | "failed";
  upload_progress?: number;
  muted?: boolean;
  solo?: boolean;
  // Visually indicate that this track's audio has been processed/mastered.
  processed?: boolean;
   // Optional URLs returned from the DSP service for this track's
   // processed audio in different formats (e.g. WAV, MP3).
   renderUrls?: {
     wav?: string | null;
     mp3?: string | null;
   };
  plugins?: TrackPlugin[];
  regions?: StudioRegion[];
};

type ProcessedTrackResult = {
  file: File;
  urls?: {
    wav?: string | null;
    mp3?: string | null;
  };
  // Optional AI-generated plugin chain that reflects what the
  // assistant applied for this processing pass.
  plugins?: TrackPlugin[];
  // Optional intelligent analysis + suggested chain coming
  // directly from the DSP engine.
  intelligentAnalysis?: any;
  intelligentPluginChain?: any[];
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
const STUDIO_API_BASE = "/api/studio";
const MAX_HISTORY = 20;

function uploadWithProgress(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 120000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        onProgress?.(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`S3 upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("S3 upload failed"));
    xhr.ontimeout = () => reject(new Error("S3 upload timed out"));
    xhr.onabort = () => reject(new Error("S3 upload aborted"));

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "audio/wav");
    xhr.send(file);
  });
}

function applyAutoMixBalanceForMixMaster(tracks: TrackType[]): TrackType[] {
  if (!tracks.length) return tracks;

  const bgTracks = tracks.filter((t) => t.role === "background" && t.file);
  const adlibTracks = tracks.filter((t) => t.role === "adlib" && t.file);

  if (!bgTracks.length && !adlibTracks.length) {
    // Nothing to rebalance for this mix.
    return tracks;
  }

  const bgIndexById = new Map<string, number>(bgTracks.map((t, index) => [t.id, index]));
  const adlibIndexById = new Map<string, number>(
    adlibTracks.map((t, index) => [t.id, index]),
  );

  const gainFromDb = (db: number) => Math.pow(10, db / 20);

  const bgPanPattern = [-0.35, 0.35, -0.2, 0.2];
  const adlibPanPattern = [-0.6, 0.6, -0.4, 0.4];

  return tracks.map((track) => {
    if (!track.file) return track;

    let volume = track.volume;
    let pan = track.pan ?? 0;

    if (track.role === "vocal") {
      // Keep lead vocal strong and centered.
      pan = 0;
      volume = Math.min(1, volume * gainFromDb(0));
    } else if (track.role === "background") {
      const idx = bgIndexById.get(track.id) ?? 0;
      // If multiple background vocals are present, spread them wide
      // left/right using the pan pattern. With only one background,
      // leave its existing pan so the user can keep it centered if desired.
      if (bgTracks.length > 1) {
        pan = bgPanPattern[idx % bgPanPattern.length];
      }
      // Push backgrounds a bit down so they support the lead.
      volume = Math.min(1, volume * gainFromDb(-6));
    } else if (track.role === "adlib") {
      const idx = adlibIndexById.get(track.id) ?? 0;
      pan = adlibPanPattern[idx % adlibPanPattern.length];
      // Adlibs sit lower and wider than the lead.
      volume = Math.min(1, volume * gainFromDb(-9));
    }

    return {
      ...track,
      volume,
      pan,
    };
  });
}

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

function buildAIPluginsForTrack(
  trackId: string,
  trackType: "vocal" | "beat" | "master",
  presetName: string,
  genreKey?: string,
  role?: TrackType["role"],
  featureType?: FeatureType,
  studioPresetId?: string | null,
): TrackPlugin[] {
  const ctx = `${presetName || ""} ${genreKey || ""}`.toLowerCase();

  const isBackgroundVocal = trackType === "vocal" && role === "background";
  const isAdlibVocal = trackType === "vocal" && role === "adlib";

  let flavour: "trap_dh" | "afrobeat" | "hiphop" | "rap" | "rnb" | "reggae" | "dancehall" | "generic" =
    "generic";

  if (ctx.includes("trap_dancehall") || (ctx.includes("trap") && ctx.includes("dancehall"))) {
    flavour = "trap_dh";
  } else if (ctx.includes("dancehall")) {
    flavour = "dancehall";
  } else if (ctx.includes("afrobeat")) {
    flavour = "afrobeat";
  } else if (ctx.includes("hiphop") || ctx.includes("hip-hop")) {
    flavour = "hiphop";
  } else if (ctx.includes("rap")) {
    flavour = "rap";
  } else if (ctx.includes("rnb") || ctx.includes("r&b")) {
    flavour = "rnb";
  } else if (ctx.includes("reggae")) {
    flavour = "reggae";
  }

  const createPlugin = (
    type: Parameters<typeof defaultPluginParams>[0],
    presetId?: string,
    nameOverride?: string,
    order: number = 0,
  ): TrackPlugin => {
    const baseParams = defaultPluginParams(type);
    const baseAIParams = defaultAIParams(type);

    let params = { ...baseParams };
    let aiParams = { ...baseAIParams };
    let preset: string | undefined;

    if (presetId) {
      const presets = getPluginPresets(type);
      const match = presets.find((p) => p.id === presetId);
      if (match) {
        params = {
          ...baseParams,
          ...match.params,
        };
        aiParams = {
          ...baseAIParams,
          ...match.params,
        };
        preset = match.id;
      }
    }

    return {
      id: crypto.randomUUID(),
      pluginId: crypto.randomUUID(),
      trackId,
      pluginType: type,
      name: nameOverride || defaultPluginName(type),
      order,
      params,
      aiParams,
      preset,
      enabled: true,
      aiGenerated: true,
      locked: false,
    };
  };

  const plugins: TrackPlugin[] = [];

  if (trackType === "vocal") {
    let subEqPreset: string;
    let addEqPreset: string;
    let levelCompPreset: string;
    let glueCompPreset: string;
    let deessPreset: string;
    let satPreset: string;
    let reverbPreset: string;
    let delayPreset: string | null = null;

    switch (flavour) {
      case "trap_dh":
        // Strongest subtractive curve.
        subEqPreset = "eq_sub_trap_dh";
        addEqPreset = "eq_air";
        levelCompPreset = "comp_fast_tamer";
        glueCompPreset = "comp_soft_glue";
        deessPreset = "deess_bright";
        satPreset = "sat_parallel_crunch";
        reverbPreset = "rev_vocal_plate";
        delayPreset = "del_eighth_pingpong";
        break;
      case "rap":
        subEqPreset = "eq_sub_rap";
        addEqPreset = "eq_air";
        levelCompPreset = "comp_fast_tamer";
        glueCompPreset = "comp_soft_glue";
        deessPreset = "deess_bright";
        satPreset = "sat_parallel_crunch";
        reverbPreset = "rev_vocal_plate";
        delayPreset = "del_eighth_pingpong";
        break;
      case "hiphop":
        subEqPreset = "eq_sub_hiphop";
        addEqPreset = "eq_air";
        levelCompPreset = "comp_fast_tamer";
        glueCompPreset = "comp_soft_glue";
        deessPreset = "deess_bright";
        satPreset = "sat_parallel_crunch";
        reverbPreset = "rev_vocal_plate";
        delayPreset = "del_eighth_pingpong";
        break;
      case "afrobeat":
        subEqPreset = "eq_sub_afrobeat";
        addEqPreset = "eq_vocal_clarity";
        levelCompPreset = "comp_vocal_leveler";
        glueCompPreset = "comp_soft_glue";
        deessPreset = "deess_vocal_standard";
        satPreset = "sat_tape_warm";
        reverbPreset = "rev_vocal_plate";
        delayPreset = "del_quarter_wide";
        break;
      case "rnb":
        subEqPreset = "eq_sub_rnb";
        addEqPreset = "eq_air";
        levelCompPreset = "comp_vocal_leveler";
        glueCompPreset = "comp_soft_glue";
        deessPreset = "deess_soft";
        satPreset = "sat_tape_warm";
        reverbPreset = "rev_big_hall";
        delayPreset = "del_quarter_wide";
        break;
      case "reggae":
        subEqPreset = "eq_sub_reggae";
        addEqPreset = "eq_vocal_clarity";
        levelCompPreset = "comp_vocal_leveler";
        glueCompPreset = "comp_soft_glue";
        deessPreset = "deess_soft";
        satPreset = "sat_tape_warm";
        reverbPreset = "rev_small_room";
        delayPreset = "del_vocal_slap";
        break;
      case "dancehall":
        subEqPreset = "eq_sub_trap_dh";
        addEqPreset = "eq_air";
        levelCompPreset = "comp_fast_tamer";
        glueCompPreset = "comp_soft_glue";
        deessPreset = "deess_bright";
        satPreset = "sat_tube_edge";
        reverbPreset = "rev_vocal_plate";
        delayPreset = "del_vocal_slap";
        break;
      default:
        subEqPreset = "eq_sub_generic";
        addEqPreset = "eq_vocal_clarity";
        levelCompPreset = "comp_vocal_leveler";
        glueCompPreset = "comp_soft_glue";
        deessPreset = "deess_vocal_standard";
        satPreset = "sat_parallel_crunch";
        reverbPreset = "rev_small_room";
        delayPreset = "del_vocal_slap";
        break;
    }

    // Post-flavour tweaks for background/adlib roles so the
    // visible plugin chain mirrors the dedicated DSP paths.
    if (isBackgroundVocal) {
      // Backgrounds: darker, softer, more space, less density.
      // Keep subtractive EQ as warmth, but avoid the brightest
      // additive curves and use softer dynamics and FX.
      if (addEqPreset === "eq_air") {
        addEqPreset = "eq_vocal_clarity";
      }
      levelCompPreset = "comp_vocal_leveler";
      glueCompPreset = "comp_soft_glue";
      deessPreset = "deess_soft";
      satPreset = "sat_tape_warm";

      if (flavour === "rnb" || flavour === "afrobeat" || flavour === "reggae") {
        reverbPreset = "rev_big_hall";
        delayPreset = delayPreset || "del_quarter_wide";
      } else {
        reverbPreset = "rev_vocal_plate";
        delayPreset = delayPreset || "del_quarter_wide";
      }
    } else if (isAdlibVocal) {
      // Adlibs: brighter, more hyped and wetter, sitting behind
      // the lead but with obvious character.
      addEqPreset = "eq_air";
      deessPreset = "deess_bright";
      satPreset = "sat_parallel_crunch";
      reverbPreset = "rev_big_hall";
      delayPreset = "del_eighth_pingpong";
    }

    // Fine-tune vocal cleanup chains per Studio preset so that
    // different audio_cleanup presets produce audibly distinct
    // starting points in the TrackLane, even though they share
    // the same underlying DSP entry point.
    if (featureType === "audio_cleanup" && studioPresetId) {
      const cleanupId = studioPresetId;

      if (cleanupId === "low_end_rumble_removal") {
        // Most aggressive low-end cleanup.
        subEqPreset = "eq_sub_trap_dh";
        addEqPreset = "eq_vocal_clarity";
        deessPreset = "deess_vocal_standard";
        levelCompPreset = "comp_vocal_leveler";
      } else if (
        cleanupId === "harshness_reduction" || cleanupId === "de_ess_cleanup"
      ) {
        // Focus on upper-mid harshness and sibilance.
        subEqPreset = "eq_sub_generic";
        addEqPreset = "eq_vocal_clarity";
        deessPreset = "deess_bright";
        levelCompPreset = "comp_vocal_leveler";
      } else if (
        cleanupId === "noisy_room_cleanup" ||
        cleanupId === "room_echo_reduction" ||
        cleanupId === "phone_recording_repair"
      ) {
        // Noisy / roomy sources: firmer levelling.
        subEqPreset = "eq_sub_generic";
        addEqPreset = "eq_vocal_clarity";
        deessPreset = "deess_vocal_standard";
        levelCompPreset = "comp_fast_tamer";
      } else if (
        cleanupId === "dialogue_clarity_boost" ||
        cleanupId === "voice_over_clean" ||
        cleanupId === "podcast_clean"
      ) {
        // Forward, articulate spoken word.
        subEqPreset = "eq_sub_generic";
        addEqPreset = "eq_vocal_clarity";
        deessPreset = "deess_vocal_standard";
        levelCompPreset = "comp_vocal_leveler";
      } else if (cleanupId === "gentle_noise_reduction") {
        // Subtle, minimal processing.
        subEqPreset = "eq_sub_generic";
        addEqPreset = "eq_vocal_clarity";
        deessPreset = "deess_soft";
        levelCompPreset = "comp_vocal_leveler";
      }
    }

    // For mixing and mix+master vocal flows, use the selected
    // Studio preset id (when available) to further shape the
    // visible chain so that presets with the same genre still
    // feel and sound different.
    if (featureType !== "audio_cleanup" && studioPresetId) {
      const vocalPresetId = studioPresetId;

      if (
        vocalPresetId === "trap_vocal_modern" ||
        vocalPresetId === "trap_dh_lead_air"
      ) {
        // Bright, modern trap/dancehall leads.
        addEqPreset = "eq_air";
        deessPreset = "deess_bright";
        satPreset = "sat_parallel_crunch";
        reverbPreset = "rev_vocal_plate";
        delayPreset = "del_eighth_pingpong";
      } else if (vocalPresetId === "dancehall_vocal_punchy") {
        // Punchy, club-focused dancehall.
        subEqPreset = "eq_sub_trap_dh";
        addEqPreset = "eq_air";
        deessPreset = "deess_bright";
        satPreset = "sat_tube_edge";
        reverbPreset = "rev_vocal_plate";
        delayPreset = "del_vocal_slap";
      } else if (vocalPresetId === "reggae_vocal_natural") {
        // Natural, warmer reggae vocal.
        subEqPreset = "eq_sub_reggae";
        addEqPreset = "eq_vocal_clarity";
        deessPreset = "deess_soft";
        satPreset = "sat_tape_warm";
        reverbPreset = "rev_small_room";
        delayPreset = "del_vocal_slap";
      } else if (vocalPresetId === "rnb_vocal_smooth") {
        // Smooth, wide R&B lead.
        subEqPreset = "eq_sub_rnb";
        addEqPreset = "eq_vocal_clarity";
        deessPreset = "deess_soft";
        satPreset = "sat_tape_warm";
        reverbPreset = "rev_big_hall";
        delayPreset = "del_quarter_wide";
      } else if (vocalPresetId === "afrobeat_vocal_bright") {
        // Bright, forward afrobeat vocal.
        subEqPreset = "eq_sub_afrobeat";
        addEqPreset = "eq_air";
        deessPreset = "deess_bright";
        satPreset = "sat_parallel_crunch";
        reverbPreset = "rev_vocal_plate";
        delayPreset = "del_eighth_pingpong";
      } else if (vocalPresetId === "afrobeat_vocal_silk") {
        // Smoother afrobeat option.
        subEqPreset = "eq_sub_afrobeat";
        addEqPreset = "eq_vocal_clarity";
        deessPreset = "deess_soft";
        satPreset = "sat_tape_warm";
        reverbPreset = "rev_big_hall";
        delayPreset = "del_quarter_wide";
      } else if (vocalPresetId === "reggaeton_vocal_wide") {
        // Wide, modern reggaeton.
        addEqPreset = "eq_air";
        deessPreset = "deess_bright";
        satPreset = "sat_parallel_crunch";
        reverbPreset = "rev_big_hall";
        delayPreset = "del_quarter_wide";
      } else if (vocalPresetId === "rock_vocal_grit") {
        // More edge and bite for rock.
        addEqPreset = "eq_air";
        deessPreset = "deess_bright";
        satPreset = "sat_tube_edge";
        reverbPreset = "rev_small_room";
        delayPreset = "del_vocal_slap";
      } else if (vocalPresetId === "rap_vocal_aggressive") {
        // Dense, aggressive rap vocal.
        subEqPreset = "eq_sub_rap";
        addEqPreset = "eq_air";
        deessPreset = "deess_bright";
        satPreset = "sat_parallel_crunch";
        reverbPreset = "rev_vocal_plate";
        delayPreset = "del_eighth_pingpong";
      } else if (vocalPresetId === "hiphop_vocal_clarity") {
        // Focus on intelligibility.
        subEqPreset = "eq_sub_hiphop";
        addEqPreset = "eq_vocal_clarity";
        deessPreset = "deess_vocal_standard";
        satPreset = "sat_tape_warm";
        reverbPreset = "rev_small_room";
        delayPreset = "del_vocal_slap";
      } else if (vocalPresetId === "clean_pop_vocal") {
        // Polished but relatively clean pop vocal.
        subEqPreset = "eq_sub_generic";
        addEqPreset = "eq_vocal_clarity";
        deessPreset = "deess_soft";
        satPreset = "sat_tape_warm";
        reverbPreset = "rev_vocal_plate";
        delayPreset = "del_quarter_wide";
      }
    }

    if (featureType === "audio_cleanup") {
      // Cleanup flow: focus on removing noise and harshness,
      // keep the chain lean and dry so it visually differs from
      // mix / mix+master flows.
      plugins.push(
        createPlugin("EQ", subEqPreset, "AI Cleanup EQ", 0),
        createPlugin("De-esser", deessPreset, "AI De-Esser", 1),
        createPlugin("Compressor", levelCompPreset, "AI Level Comp", 2),
        createPlugin("EQ", addEqPreset, "AI Tone EQ", 3),
      );
    } else {
      // Mixing / mix+master and other vocal flows.
      // Main vocals get pitch correction plus the full chain,
      // while background and adlib vocals use leaner chains
      // so they support the lead without as many processors.
      if (isBackgroundVocal) {
        plugins.push(
          createPlugin("EQ", subEqPreset, "AI Subtractive EQ", 0),
          createPlugin("De-esser", deessPreset, "AI De-Esser", 1),
          createPlugin("Compressor", levelCompPreset, "AI Level Comp", 2),
          createPlugin("EQ", addEqPreset, "AI Additive EQ", 3),
          createPlugin("Reverb", reverbPreset, "AI Reverb", 4),
          ...(delayPreset ? [createPlugin("Delay", delayPreset, "AI Delay", 5)] : []),
        );
      } else if (isAdlibVocal) {
        plugins.push(
          createPlugin("EQ", subEqPreset, "AI Subtractive EQ", 0),
          createPlugin("De-esser", deessPreset, "AI De-Esser", 1),
          createPlugin("Compressor", levelCompPreset, "AI Level Comp", 2),
          createPlugin("EQ", addEqPreset, "AI Additive EQ", 3),
          createPlugin("Saturation", satPreset, "AI Saturation", 4),
          createPlugin("Reverb", reverbPreset, "AI Reverb", 5),
          ...(delayPreset ? [createPlugin("Delay", delayPreset, "AI Delay", 6)] : []),
        );
      } else {
        // Lead vocal: pitch correction + full creative chain.
        plugins.push(
          createPlugin("Pitch Correction", undefined, "AI Pitch Correction", 0),
          createPlugin("EQ", subEqPreset, "AI Subtractive EQ", 1),
          createPlugin("De-esser", deessPreset, "AI De-Esser", 2),
          createPlugin("Compressor", levelCompPreset, "AI Level Comp", 3),
          createPlugin("EQ", addEqPreset, "AI Additive EQ", 4),
          createPlugin("Compressor", glueCompPreset, "AI Glue Comp", 5),
          createPlugin("Saturation", satPreset, "AI Saturation", 6),
          createPlugin("Reverb", reverbPreset, "AI Reverb", 7),
          ...(delayPreset ? [createPlugin("Delay", delayPreset, "AI Delay", 8)] : []),
        );
      }
    }
  } else if (trackType === "beat") {
    let subMeqPreset: string;
    let addMeqPreset: string;
    let busTightPreset: string;
    let busGluePreset: string;
    let limPreset: string;
    let stereoPreset: string;
    let beatSubEqPreset: string;

    switch (flavour) {
      case "trap_dh":
      case "rap":
      case "hiphop":
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_punch";
        limPreset = "lim_loud";
        stereoPreset = "stereo_safe";
        beatSubEqPreset = "eq_sub_trap_dh";
        break;
      case "afrobeat":
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
        beatSubEqPreset = "eq_sub_afrobeat";
        break;
      case "rnb":
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
        beatSubEqPreset = "eq_sub_rnb";
        break;
      case "reggae":
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_mono_check";
        beatSubEqPreset = "eq_sub_reggae";
        break;
      case "dancehall":
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_punch";
        limPreset = "lim_loud";
        stereoPreset = "stereo_safe";
        beatSubEqPreset = "eq_sub_trap_dh";
        break;
      default:
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
        beatSubEqPreset = "eq_sub_generic";
        break;
    }

    // Beat-only mixing presets: gently bias the bus chain
    // so that each preset has a slightly different flavour
    // even though they share the same DSP entry point.
    if (studioPresetId && featureType === "mixing_only") {
      const beatPresetId = studioPresetId;

      if (beatPresetId === "beat_balance_clean") {
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_gentle";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
      } else if (beatPresetId === "bass_controlled_beat") {
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
      } else if (beatPresetId === "club_beat_punch") {
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_punch";
        limPreset = "lim_loud";
        stereoPreset = "stereo_safe";
      } else if (beatPresetId === "beat_stereo_polish") {
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_gentle";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
      } else if (beatPresetId === "vintage_beat_warmth") {
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_warm";
        busTightPreset = "bus_glue_gentle";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_mono_check";
      } else if (beatPresetId === "minimal_beat_processing") {
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_warm";
        busTightPreset = "bus_glue_gentle";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
      } else if (beatPresetId === "trap_beat_tight") {
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_punch";
        limPreset = "lim_loud";
        stereoPreset = "stereo_safe";
      } else if (beatPresetId === "afrobeat_groove_balance") {
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
      } else if (beatPresetId === "trap_beat_knock") {
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_punch";
        limPreset = "lim_loud";
        stereoPreset = "stereo_safe";
      } else if (beatPresetId === "afrobeat_club_beat") {
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_punch";
        limPreset = "lim_loud";
        stereoPreset = "stereo_safe";
      }
    }

    // In mix+master flows, also let the full-mix Studio preset
    // shape the beat EQ flavour so different presets do not all
    // show the same "AI Beat EQ" settings.
    if (studioPresetId && featureType === "mix_master") {
      const busPresetId = studioPresetId;

      if (
        busPresetId === "radio_ready_mix" ||
        busPresetId === "clean_commercial_mix" ||
        busPresetId === "streaming_optimized_mix" ||
        busPresetId === "wide_stereo_mix" ||
        busPresetId === "vocal_forward_mix"
      ) {
        // More neutral/bright overall tonal balance.
        addMeqPreset = "meq_bright";
      } else if (
        busPresetId === "warm_analog_mix" ||
        busPresetId === "bass_heavy_mix"
      ) {
        // Warmer, thicker mixes keep the beat EQ on the warm side.
        addMeqPreset = "meq_warm";
      } else if (
        busPresetId === "club_ready_mix" ||
        busPresetId === "loud_modern_mix" ||
        busPresetId === "punchy_urban_mix"
      ) {
        // Club / loud / punchy presets favour a brighter beat EQ.
        addMeqPreset = "meq_bright";
      }
    }

    // For mix-only and mix+master Studio flows, keep beat
    // processing light: show a single subtractive EQ instead
    // of a full mastering-style bus chain.
    if (featureType === "mixing_only" || featureType === "mix_master") {
      plugins.push(
        createPlugin("EQ", beatSubEqPreset, "AI Beat Subtractive EQ", 0),
      );
      return plugins;
    }

    plugins.push(
      createPlugin("Mastering EQ", subMeqPreset, "AI Subtractive EQ", 0),
      createPlugin("Master Bus Compressor", busTightPreset, "AI Tight Bus Comp", 1),
      createPlugin("Mastering EQ", addMeqPreset, "AI Additive EQ", 2),
      createPlugin("Master Bus Compressor", busGluePreset, "AI Glue Bus Comp", 3),
      createPlugin("Stereo Imager", stereoPreset, "AI Stereo", 4),
      createPlugin("Limiter", limPreset, "AI Limiter", 5),
    );
  } else {
    // Master or instrumental bus
    let subMeqPreset: string;
    let addMeqPreset: string;
    let busTightPreset: string;
    let busGluePreset: string;
    let limPreset: string;
    let stereoPreset: string;

    switch (flavour) {
      case "trap_dh":
      case "rap":
      case "hiphop":
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_punch";
        limPreset = "lim_loud";
        stereoPreset = "stereo_safe";
        break;
      case "afrobeat":
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
        break;
      case "rnb":
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
        break;
      case "reggae":
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_mono_check";
        break;
      case "dancehall":
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_punch";
        limPreset = "lim_loud";
        stereoPreset = "stereo_safe";
        break;
      default:
        subMeqPreset = "meq_warm";
        addMeqPreset = "meq_bright";
        busTightPreset = "bus_glue_punch";
        busGluePreset = "bus_glue_gentle";
        limPreset = "lim_streaming";
        stereoPreset = "stereo_safe";
        break;
    }

    // Full-mix and master-only presets: shape the bus chain so
    // each preset id nudges the EQ, compression, limiting and
    // stereo choices a bit differently.
    if (studioPresetId && (featureType === "mix_master" || featureType === "mastering_only")) {
      const busPresetId = studioPresetId;

      if (featureType === "mix_master") {
        if (busPresetId === "radio_ready_mix" || busPresetId === "clean_commercial_mix") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_gentle";
          busGluePreset = "bus_glue_gentle";
          limPreset = "lim_streaming";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "loud_modern_mix" || busPresetId === "punchy_urban_mix") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_punch";
          busGluePreset = "bus_glue_punch";
          limPreset = "lim_loud";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "streaming_optimized_mix") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_gentle";
          busGluePreset = "bus_glue_gentle";
          limPreset = "lim_streaming";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "club_ready_mix") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_punch";
          busGluePreset = "bus_glue_punch";
          limPreset = "lim_loud";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "warm_analog_mix") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_warm";
          busTightPreset = "bus_glue_gentle";
          busGluePreset = "bus_glue_gentle";
          limPreset = "lim_streaming";
          stereoPreset = "stereo_mono_check";
        } else if (busPresetId === "vocal_forward_mix") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_gentle";
          busGluePreset = "bus_glue_gentle";
          limPreset = "lim_streaming";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "bass_heavy_mix") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_warm";
          busTightPreset = "bus_glue_punch";
          busGluePreset = "bus_glue_punch";
          limPreset = "lim_loud";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "wide_stereo_mix") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_gentle";
          busGluePreset = "bus_glue_gentle";
          limPreset = "lim_streaming";
          stereoPreset = "stereo_safe";
        }
      } else if (featureType === "mastering_only") {
        if (busPresetId === "streaming_master_minus14" || busPresetId === "transparent_master") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_gentle";
          busGluePreset = "bus_glue_gentle";
          limPreset = "lim_streaming";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "loud_club_master" || busPresetId === "edm_loud_master") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_punch";
          busGluePreset = "bus_glue_punch";
          limPreset = "lim_loud";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "radio_master") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_gentle";
          busGluePreset = "bus_glue_gentle";
          limPreset = "lim_streaming";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "beat_sale_master") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_warm";
          busTightPreset = "bus_glue_gentle";
          busGluePreset = "bus_glue_gentle";
          limPreset = "lim_streaming";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "warm_analog_master") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_warm";
          busTightPreset = "bus_glue_gentle";
          busGluePreset = "bus_glue_gentle";
          limPreset = "lim_streaming";
          stereoPreset = "stereo_mono_check";
        } else if (busPresetId === "bass_focus_master") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_warm";
          busTightPreset = "bus_glue_punch";
          busGluePreset = "bus_glue_punch";
          limPreset = "lim_loud";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "wide_stereo_master") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_gentle";
          busGluePreset = "bus_glue_gentle";
          limPreset = "lim_streaming";
          stereoPreset = "stereo_safe";
        } else if (busPresetId === "clean_hiphop_master") {
          subMeqPreset = "meq_warm";
          addMeqPreset = "meq_bright";
          busTightPreset = "bus_glue_punch";
          busGluePreset = "bus_glue_punch";
          limPreset = "lim_loud";
          stereoPreset = "stereo_safe";
        }
      }
    }

    plugins.push(
      createPlugin("Mastering EQ", subMeqPreset, "AI Subtractive EQ", 0),
      createPlugin("Master Bus Compressor", busTightPreset, "AI Tight Master Comp", 1),
      createPlugin("Mastering EQ", addMeqPreset, "AI Additive EQ", 2),
      createPlugin("Master Bus Compressor", busGluePreset, "AI Glue Master Comp", 3),
      createPlugin("Limiter", limPreset, "AI Master Limiter", 4),
      createPlugin("Stereo Imager", stereoPreset, "AI Stereo", 5),
    );
  }

  return plugins;
}

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

function buildPluginsFromIntelligentChain(
  trackId: string,
  chain: Array<{ plugin: string; params: any }> | undefined | null,
): TrackPlugin[] {
  if (!Array.isArray(chain) || !chain.length) return [];

  const plugins: TrackPlugin[] = [];

  chain.forEach((item, index) => {
    const rawType = item?.plugin as unknown;
    if (!rawType || !isPluginType(rawType)) return;
    const type = rawType;
    const id = crypto.randomUUID();

    plugins.push({
      id,
      pluginId: id,
      trackId,
      pluginType: type,
      name: `AI ${defaultPluginName(type)}`,
      order: index,
      // Keep real-time WebAudio safe by using normal defaults for the
      // audible params while storing the DSP's exact settings on
      // aiParams for UI/overlay display.
      params: defaultPluginParams(type),
      aiParams: {
        ...defaultAIParams(type),
        dspConfig: item.params ?? {},
      },
      preset: "AI Intelligent Chain",
      enabled: true,
      aiGenerated: true,
      locked: true,
    });
  });

  return plugins;
}

function MixStudioInner() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userFeatureAccess, setUserFeatureAccess] = useState<Record<FeatureType, boolean>>({
    audio_cleanup: false,
    mixing_only: false,
    mix_master: false,
    mastering_only: false,
  });
  const [featureCredits, setFeatureCredits] = useState<Record<FeatureType, number | null>>({
    audio_cleanup: null,
    mixing_only: null,
    mix_master: null,
    mastering_only: null,
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
        const uid = data.session.user?.id;
        if (uid) {
          setUserId(uid);

          // Load current credits so the studio can show remaining usage.
          (async () => {
            try {
              const res = await fetch(
                `${BACKEND_URL}/studio/credits?user_id=${encodeURIComponent(uid)}`,
              );
              if (!res.ok) return;
              const json = await res.json();
              const credits = (json?.credits ?? []) as {
                feature_type: string;
                remaining_uses: number;
              }[];

              const nextAccess: Record<FeatureType, boolean> = {
                audio_cleanup: false,
                mixing_only: false,
                mix_master: false,
                mastering_only: false,
              };
              const nextCredits: Record<FeatureType, number | null> = {
                audio_cleanup: null,
                mixing_only: null,
                mix_master: null,
                mastering_only: null,
              };

              credits.forEach((credit) => {
                const ft = credit.feature_type as FeatureType;
                if (
                  ft === "audio_cleanup" ||
                  ft === "mixing_only" ||
                  ft === "mix_master" ||
                  ft === "mastering_only"
                ) {
                  const remaining = Number(credit.remaining_uses ?? 0);
                  if (remaining < 0) {
                    // Treat negative remaining as unlimited.
                    nextCredits[ft] = null;
                    nextAccess[ft] = true;
                  } else {
                    nextCredits[ft] = remaining;
                    nextAccess[ft] = remaining > 0;
                  }
                }
              });

              setFeatureCredits(nextCredits);
              setUserFeatureAccess(nextAccess);
            } catch {
              // If credit lookup fails, leave access unchanged.
            }
          })();
        }
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
  const { isPlaying, currentTime, play, pause, seek } = useAudioTransport();
  const [zoom, setZoom] = useState(1.2);
  const [masterVolume, setMasterVolume] = useState(0.9);
  const [masterPlugins, setMasterPlugins] = useState<TrackPlugin[]>([]);
  const [virtualMixerTracks, setVirtualMixerTracks] = useState<VirtualMixerTrack[]>([]);
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

  const isMixMasterMode = studioMode === "mix-master";
  const isMixOnlyMode = studioMode === "mix-only";
  const isMasterOnlyMode = studioMode === "master-only";
  const isCleanupMode = studioMode === "cleanup";
  const isPodcastMode = studioMode === "podcast";

  const featureForMode: FeatureType | null = isCleanupMode
    ? "audio_cleanup"
    : isMixOnlyMode
      ? "mixing_only"
      : isMixMasterMode
        ? "mix_master"
        : isMasterOnlyMode
          ? "mastering_only"
          : null;

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

  const selectedPresetMeta = useMemo(
    () => availablePresets.find((p) => p.id === selectedPresetId) ?? null,
    [availablePresets, selectedPresetId],
  );

  const { backend: backendJobStatus, ui: processingJobUi } = useProcessingJob(activeJobId, {
    flow: (featureForMode as FlowKey | null) ?? null,
    userId,
    presetLabelContext:
      selectedPresetMeta && featureForMode
        ? {
            presetName: selectedPresetMeta.name,
            toneDescription: selectedPresetMeta.intent || selectedPresetMeta.description,
            subtitle: selectedPresetMeta.inspired_style || null,
          }
        : null,
  });

  // Compute global playhead X position in pixels (shared with Timeline and track area)
  const pixelsPerSecond = 60 * zoom;
  const playheadX = Math.max(0, playheadSeconds * pixelsPerSecond);

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

  // Spacebar play/pause controlling global transport
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPlaying, play, pause]);

  // Load presets whenever the studio mode or genre/track context changes
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

        // Genre-aware + beat-aware filtering for the preset selector.
        const genreKey = GENRE_TO_DSP_KEY[genre];

        const hasBeatOnly = tracks.some(
          (t) => t.role === "beat" && t.file,
        ) && !tracks.some((t) => t.role === "vocal" && t.file);

        let filtered = data;

        if (genreKey) {
          // First, try strict genre matching. If we find any presets whose
          // genre matches the selected key, only show those. If none match,
          // fall back to the full list so the selector is never empty.
          const strictMatches = data.filter((p) => {
            if (!p.genre || p.genre === "any") return false;
            const g = p.genre.toLowerCase();
            return g === genreKey || g.includes(genreKey);
          });

          if (strictMatches.length > 0) {
            filtered = strictMatches;
          }
        }

        // When mixing or mastering a beat-only session, prefer Beat presets,
        // but fall back to the full list so the selector never disappears.
        if ((presetMode === "mixing_only" || presetMode === "mastering_only") && hasBeatOnly) {
          const beatPresets = filtered.filter((p) => p.target === "beat");
          if (beatPresets.length > 0) {
            filtered = beatPresets;
          }
        }

        setAvailablePresets(filtered);

        const previous = lastPresetByModeRef.current[studioMode];
        let nextId: string | null = null;

        if (previous && filtered.some((p) => p.id === previous)) {
          nextId = previous;
        } else if (filtered.length) {
          // For full-mix studio flows, prefer presets that target the full mix
          const fullMixPresets = filtered.filter((p) => p.target === "full_mix");
          if (fullMixPresets.length) {
            nextId = fullMixPresets[0].id;
          } else {
            nextId = filtered[0].id;
          }
        }

        setSelectedPresetId(nextId);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        // eslint-disable-next-line no-console
        console.error("Error fetching presets", error);
      });

    return () => controller.abort();
  }, [studioMode, genre, tracks]);

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

  // Sync local playheadSeconds to global transport time
  useEffect(() => {
    setPlayheadSeconds(currentTime);
  }, [currentTime]);

  const handleFileSelected = useCallback(async (trackId: string, file: File) => {
    const effectiveUserId = (userId && userId.trim().length > 0) ? userId : "studio-anon";
    const contentType = file.type && file.type.trim().length > 0 ? file.type : "audio/wav";
    const localPreviewUrl = URL.createObjectURL(file);

    // Seed local preview immediately while upload runs.
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId
          ? {
              ...track,
              file,
              local_preview_url: localPreviewUrl,
              s3_key: null,
              upload_status: "uploading",
              upload_progress: 0,
              processed: false,
            }
          : track,
      ),
    );

    try {
      // Step 1: request presigned upload URL.
      const res = await fetch(`${STUDIO_API_BASE}/generate-upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: effectiveUserId,
          filename: file.name,
          content_type: contentType,
          file_size_bytes: file.size,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to request upload URL");
      }

      const { upload_url, s3_key } = (await res.json()) as {
        upload_url: string;
        s3_key: string;
      };

      console.log("Uploading to S3...");

      // Step 2: upload file directly to S3.
      await uploadWithProgress(upload_url, file, (percent) => {
        setTracks((prev) =>
          prev.map((track) =>
            track.id === trackId
              ? {
                  ...track,
                  upload_status: "uploading",
                  upload_progress: Math.max(0, Math.min(100, percent)),
                }
              : track,
          ),
        );
      });

      console.log("S3 key:", s3_key);

      // Step 3: persist s3_key in track state.
      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId
            ? {
                ...track,
                s3_key,
                upload_status: "uploaded",
                upload_progress: 100,
              }
            : track,
        ),
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Track upload failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "Upload failed. Check backend and S3 CORS configuration.";
      // eslint-disable-next-line no-console
      console.error("Upload diagnostics:", {
        backendProxy: `${STUDIO_API_BASE}/generate-upload-url`,
        message,
      });
      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId
            ? {
                ...track,
                upload_status: "failed",
                upload_progress: 0,
              }
            : track,
        ),
      );
    }
  }, [userId]);

  // Keep the processing overlay in sync with backend job progress & steps
  useEffect(() => {
    if (!backendJobStatus) return;

    setProcessingOverlay((prev): ProcessingOverlayState | null => {
      if (!prev) return prev;
      const ui = processingJobUi;

      // Derive a ProcessingStage list from the UI steps so the
      // overlay can render a vertical checklist. Prefix the labels
      // with the currently active track name (e.g. "Beat", "Main Vocal")
      // so the steps feel contextual to whichever track is being
      // processed at this moment.
      let activeTrackLabel: string | null = null;
      const activeTrack =
        prev.tracks.find((t) => t.state === "processing") ??
        prev.tracks.find((t) => t.state === "idle") ??
        prev.tracks[0];

      if (activeTrack) {
        activeTrackLabel = activeTrack.name;
      }

      const dynamicStages: ProcessingStage[] = ui.steps.map((step) => ({
        id: step.key,
        label: activeTrackLabel ? `${activeTrackLabel} – ${step.label}` : step.label,
      }));
      setOverlayStages(dynamicStages);

      const completedStageIds = ui.steps.filter((s) => s.completed).map((s) => s.key);
      const currentStageId = ui.currentStepKey ?? prev.currentStageId;

      const nextError =
        ui.phase === "failed"
          ? ui.errorMessage ||
            prev.error ||
            "Something went wrong while processing this audio."
          : prev.error;

      return {
        ...prev,
        percentage: ui.overallProgress,
        currentStageId,
        completedStageIds,
        error: nextError,
        estimatedTotalSec: ui.estimatedTotalSec ?? prev.estimatedTotalSec ?? null,
        remainingSec: ui.remainingSec ?? prev.remainingSec ?? null,
        phase: ui.phase,
        queuePosition: ui.queuePosition,
        queueSize: ui.queueSize,
        helperMessage: ui.helperText ?? prev.helperMessage ?? null,
      };
    });
  }, [backendJobStatus, processingJobUi]);

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

  const handleTrackRoleChange = useCallback(
    (trackId: string, role: TrackType["role"]) => {
      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId
            ? {
                ...track,
                role,
              }
            : track,
        ),
      );
    },
    [],
  );

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
          s3_key: null,
          local_preview_url: null,
          upload_status: "idle" as const,
          upload_progress: 0,
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
    pause();
    seek(0);
  };

  const handlePrev = () => {
    pause();
    seek(0);
    window.dispatchEvent(new Event("mixsmvrt:transport-prev"));
  };

  const handleNext = () => {
    pause();
    if (projectDuration > 0) {
      seek(projectDuration);
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
              s3_key: null,
              local_preview_url: null,
              upload_status: "idle",
              upload_progress: 0,
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
  ): Promise<ProcessedTrackResult | null> => {
    if (!track.s3_key) {
      throw new Error("Track not uploaded yet.");
    }

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
    let presetName =
      selectedPreset?.dsp_chain_reference ||
      (trackType === "beat" || trackType === "master" ? "streaming_master" : "clean_vocal");

    if (trackType === "vocal") {
      if (track.role === "background") {
        presetName = `${presetName}_bg`;
      } else if (track.role === "adlib") {
        presetName = `${presetName}_adlib`;
      }
    }

    const effectiveUserId = (userId && userId.trim().length > 0) ? userId : "studio-anon";

    const genreKey = GENRE_TO_DSP_KEY[genre];
    const currentFeatureType = featureTypeForMode(studioMode) ?? null;
    // Create an async processing job backed by S3 IO.
    const flowType: FeatureType = options?.forceMaster
      ? "mastering_only"
      : (currentFeatureType ?? "mixing_only");

    const createJobRes = await fetch(`${BACKEND_URL}/create-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: effectiveUserId,
        s3_key: track.s3_key,
        genre: genreKey ?? null,
        flow_type: flowType,
        preset_name: presetName,
      }),
    });

    if (!createJobRes.ok) {
      const txt = await createJobRes.text();
      throw new Error(txt || "Failed to create processing job");
    }

    const jobPayload = (await createJobRes.json()) as { job_id: string };
    const jobId = jobPayload.job_id;
    setActiveJobId(jobId);

    // 4) Poll job status until complete and retrieve output URL.
    const pollStart = Date.now();
    const maxWaitMs = 20 * 60 * 1000;
    const pollEveryMs = 2500;

    let outputDownloadUrl: string | null = null;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (processingCancelRef.current) {
        return null;
      }

      if (Date.now() - pollStart > maxWaitMs) {
        throw new Error("Processing timed out");
      }

      const statusRes = await fetch(
        `${BACKEND_URL}/job/${encodeURIComponent(jobId)}?user_id=${encodeURIComponent(effectiveUserId)}`,
      );
      if (!statusRes.ok) {
        const txt = await statusRes.text();
        throw new Error(txt || "Failed to fetch job status");
      }

      const statusData = (await statusRes.json()) as {
        status: "pending" | "processing" | "completed" | "failed";
        output_download_url?: string | null;
        error_message?: string | null;
      };

      if (statusData.status === "completed") {
        outputDownloadUrl = statusData.output_download_url ?? null;
        break;
      }

      if (statusData.status === "failed") {
        throw new Error(statusData.error_message || "DSP processing job failed");
      }

      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, pollEveryMs));
    }

    if (!outputDownloadUrl) {
      throw new Error("Missing output download URL from completed job");
    }

    const wavUrl = outputDownloadUrl;
    const mp3Url: string | null = null;

    const outResp = await fetch(wavUrl);
    if (!outResp.ok) {
      throw new Error("Failed to download processed audio");
    }

    const blob = await outResp.blob();
    const processedFile = new File([blob], `${track.name}-processed.wav`, {
      type: blob.type || "audio/wav",
    });

    // For now, always use the curated Studio AI chains so the
    // visible plugin rack clearly shows the expected processing
    // for each track role (beat, lead, background, adlibs).
    const aiPlugins = buildAIPluginsForTrack(
      track.id,
      trackType,
      presetName,
      genreKey,
      track.role,
      currentFeatureType || undefined,
      selectedPreset?.id ?? null,
    );

    return {
      file: processedFile,
      urls: {
        wav: wavUrl,
        mp3: mp3Url,
      },
      plugins: aiPlugins,
      intelligentAnalysis: null,
      intelligentPluginChain: undefined,
    };
  };

  const handleProcessFullMix = async () => {
    if (isProcessing) return;
    if (!tracks.some((track) => track.s3_key)) return;

    const notUploaded = tracks.find((track) => (track.file || track.s3_key) && !track.s3_key);
    if (notUploaded) {
      window.alert("Track not uploaded yet.");
      return;
    }

    // Capture the current mix so it can be restored via Undo.
    pushUndoSnapshot();

  // Clear any previous virtual mixer buses; a new run will
  // repopulate them from the latest DSP response.
  setVirtualMixerTracks([]);

    // Reset any previous cancellation signal.
    processingCancelRef.current = false;

    setIsProcessing(true);
    setHasMixed(false);

    const featureType = featureTypeForMode(studioMode) ?? "mix_master";
    const jobType = jobTypeForFeature(featureType);

    // Use the centralized flowSteps config to derive the initial
    // step list for this run, so the overlay can show meaningful
    // stage labels even before the backend has returned status.
    const labeledSteps = getFlowSteps(featureType as FlowKey, null);
    const flowStages: ProcessingStage[] = labeledSteps.map((step) => ({
      id: step.key,
      label: step.label,
    }));
    const initialStageId = (flowStages[0] ?? { id: "processing" }).id;

    const playable = tracks.filter((track) => !!track.s3_key);

    // Enforce a musically sensible processing order so that the engine
    // always starts from the beat bed, then the main vocal, then
    // supporting/background vocals, and finally adlibs and instruments.
    const rolePriority: Record<TrackType["role"], number> = {
      beat: 0,
      vocal: 1,
      background: 2,
      adlib: 3,
      instrument: 4,
    };

    const orderIndex = new Map<string, number>(
      playable.map((t, index) => [t.id, index]),
    );

    const orderedPlayable = [...playable].sort((a, b) => {
      const pa = rolePriority[a.role] ?? 99;
      const pb = rolePriority[b.role] ?? 99;
      if (pa !== pb) return pa - pb;
      const ia = orderIndex.get(a.id) ?? 0;
      const ib = orderIndex.get(b.id) ?? 0;
      return ia - ib;
    });

    // Build human-friendly display names that make it obvious how many
    // tracks of each role are being processed (e.g. "Background Vocal 1").
    let beatCount = 0;
    let mainVocalCount = 0;
    let bgCount = 0;
    let adlibCount = 0;
    let instrumentCount = 0;

    const initialTrackStatuses: TrackProcessingStatus[] = orderedPlayable.map((track) => {
      let baseLabel = track.name || track.id;

      if (track.role === "beat") {
        beatCount += 1;
        baseLabel = beatCount === 1 ? "Beat" : `Beat ${beatCount}`;
      } else if (track.role === "vocal") {
        mainVocalCount += 1;
        baseLabel = mainVocalCount === 1 ? "Main Vocal" : `Main Vocal ${mainVocalCount}`;
      } else if (track.role === "background") {
        bgCount += 1;
        baseLabel = `Background Vocal ${bgCount}`;
      } else if (track.role === "adlib") {
        adlibCount += 1;
        baseLabel = `Adlib ${adlibCount}`;
      } else if (track.role === "instrument") {
        instrumentCount += 1;
        baseLabel = instrumentCount === 1 ? "Instrument" : `Instrument ${instrumentCount}`;
      }

      const displayName = track.name && track.name !== baseLabel
        ? `${baseLabel} – ${track.name}`
        : baseLabel;

      return {
        id: track.id,
        name: displayName,
        state: "idle" as TrackProcessingStatus["state"],
        percentage: 0,
        detail: null,
      };
    });

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

    // In S3 job mode, each track creates/owns its own async processing
    // job; the active job id is assigned inside processTrackWithAI.
    setActiveJobId(null);

    try {
      const updates = new Map<string, ProcessedTrackResult>();
      let anyUpdated = false;

      // Process each track that has audio through the AI DSP service,
      // in the same role-based order used to seed the overlay.
      const playableForLoop = (() => {
        // Reconstruct the ordered list in case the closure-scope
        // reference is lost; fall back to the raw playable list.
        const rolePriority: Record<TrackType["role"], number> = {
          beat: 0,
          vocal: 1,
          background: 2,
          adlib: 3,
          instrument: 4,
        };

        const orderIndex = new Map<string, number>(
          playable.map((t, index) => [t.id, index]),
        );

        const ordered = [...playable].sort((a, b) => {
          const pa = rolePriority[a.role] ?? 99;
          const pb = rolePriority[b.role] ?? 99;
          if (pa !== pb) return pa - pb;
          const ia = orderIndex.get(a.id) ?? 0;
          const ib = orderIndex.get(b.id) ?? 0;
          return ia - ib;
        });

        return ordered;
      })();

      for (let index = 0; index < playableForLoop.length; index += 1) {
        if (processingCancelRef.current) {
          break;
        }

        const track = playableForLoop[index];

        // Mark the per-track row as actively processing. Overall
        // progress and step advancement are driven purely by the
        // backend job status, not by this local loop.
        setProcessingOverlay((prev): ProcessingOverlayState | null => {
          if (!prev) return prev;
          const updatedTracks: TrackProcessingStatus[] = prev.tracks.map((t) => {
            if (t.id === track.id) {
              return {
                ...t,
                state: "processing" as TrackProcessingStatus["state"],
              };
            }
            return t;
          });

          return {
            ...prev,
            tracks: updatedTracks,
          };
        });

        // eslint-disable-next-line no-await-in-loop
        const processed = await processTrackWithAI(track);
        if (processed && !processingCancelRef.current) {
          updates.set(track.id, processed);
          anyUpdated = true;

          const chain = processed.intelligentPluginChain as
            | Array<{ plugin: string; params: any }>
            | undefined
            | null;
          const summary =
            chain && chain.length
              ? chain
                  .map((item) => (item && typeof item.plugin === "string" ? item.plugin : null))
                  .filter((name) => !!name)
                  .join(", ")
              : null;

          setProcessingOverlay((prev): ProcessingOverlayState | null => {
            if (!prev) return prev;
            const updatedTracks: TrackProcessingStatus[] = prev.tracks.map((t) => {
              if (t.id === track.id) {
                return {
                  ...t,
                  state: "completed" as TrackProcessingStatus["state"],
                  detail: summary
                    ? `DSP: ${summary}`
                    : t.detail ?? null,
                };
              }
              return t;
            });
            return {
              ...prev,
              tracks: updatedTracks,
            };
          });
        }
      }

      if (!processingCancelRef.current && updates.size > 0) {
        setTracks((prev) => {
          let next = prev.map((track) => {
            const updated = updates.get(track.id);
            if (!updated) return track;

            let plugins = track.plugins;
            if (updated.plugins && updated.plugins.length > 0) {
              const existing = Array.isArray(track.plugins) ? track.plugins : [];
              const userPlugins = existing.filter((p) => !p.aiGenerated);
              const baseOrder = userPlugins.length;
              const normalizedUser = userPlugins.map((p, index) => ({
                ...p,
                trackId: track.id,
                order: index,
              }));
              const normalizedAI = updated.plugins.map((p, index) => ({
                ...p,
                trackId: track.id,
                order: baseOrder + index,
              }));
              plugins = [...normalizedUser, ...normalizedAI];
            }

            return {
              ...track,
              file: updated.file ?? track.file,
              // Mark tracks whose audio has been updated by the AI
              // pipeline so their waveforms can appear "bigger".
              processed: true,
              renderUrls: updated.urls ?? track.renderUrls,
              plugins,
            };
          });

          // For mix & master and mix-only sessions, automatically rebalance
          // background vocals and adlibs so they sit under and around the lead.
          if (studioMode === "mix-master" || studioMode === "mix-only") {
            next = applyAutoMixBalanceForMixMaster(next);
          }

          return next;
        });
      }
      setHasMixed(!processingCancelRef.current && anyUpdated);
      // Final overall progress and step completion are driven by the
      // backend job status updates rather than the local loop.
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
      setActiveJobId(null);
      setProcessingOverlay((prev) => prev);
    }
  };

  const handlePreviewMix = () => {
    if (!tracks.some((track) => track.file)) return;
    handlePrev();
    play();
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
        // If the DSP provided an intelligent master chain, mirror it
        // into the master-bus rack so the bottom UI shows exactly
        // what will be applied on the rendered master.
        if (processed.intelligentPluginChain && Array.isArray(processed.intelligentPluginChain)) {
          setMasterPlugins(
            buildPluginsFromIntelligentChain(
              "master-bus",
              processed.intelligentPluginChain as Array<{ plugin: string; params: any }>,
            ),
          );
        }

        const targetId = target.id;
        setTracks((prev) =>
          prev.map((track) => {
            if (track.id !== targetId) return track;

            let plugins = track.plugins;
            if (processed.plugins && processed.plugins.length > 0) {
              const existing = Array.isArray(track.plugins) ? track.plugins : [];
              const userPlugins = existing.filter((p) => !p.aiGenerated);
              const baseOrder = userPlugins.length;
              const normalizedUser = userPlugins.map((p, index) => ({
                ...p,
                trackId: track.id,
                order: index,
              }));
              const normalizedAI = processed.plugins.map((p, index) => ({
                ...p,
                trackId: track.id,
                order: baseOrder + index,
              }));
              plugins = [...normalizedUser, ...normalizedAI];
            }

            return {
              ...track,
              file: processed.file,
              processed: true,
              renderUrls: processed.urls ?? track.renderUrls,
              plugins,
            };
          }),
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error sending mix to master", error);
    } finally {
      setIsMastering(false);
    }
  };

  type DownloadFormat = "wav" | "mp3" | "both";

  const handleDownloadProcessed = (format: DownloadFormat) => {
    if (!hasMixed) return;
    const playableTracks = tracks.filter((track) => track.file);
    if (!playableTracks.length) return;

    const triggerDownload = (url: string, filename: string) => {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    };

    playableTracks.forEach((track) => {
      const baseName = `${track.name || track.id}-mix`;

      if (format === "wav" || format === "both") {
        const wavUrl = track.renderUrls?.wav;
        if (wavUrl) {
          triggerDownload(wavUrl, `${baseName}.wav`);
        } else if (track.file) {
          const url = URL.createObjectURL(track.file);
          triggerDownload(url, `${baseName}.wav`);
          URL.revokeObjectURL(url);
        }
      }

      if (format === "mp3" || format === "both") {
        const mp3Url = track.renderUrls?.mp3;
        if (mp3Url) {
          triggerDownload(mp3Url, `${baseName}.mp3`);
        }
      }
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

  // isMixMasterMode, isMixOnlyMode, isMasterOnlyMode, isCleanupMode, isPodcastMode
  // are defined above, close to featureForMode so they can be reused here.
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

  const primaryFeatureCredits: number | null | undefined =
    featureForMode != null ? featureCredits[featureForMode] : undefined;

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
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId) {
          router.push("/login");
          return;
        }

        const flowKey: FlowKey =
          featureForMode === "audio_cleanup" ||
          featureForMode === "mixing_only" ||
          featureForMode === "mix_master" ||
          featureForMode === "mastering_only"
            ? (featureForMode as FlowKey)
            : "mix_master";

        const meta = buildProjectMeta();
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("projects")
          .insert({
            user_id: userId,
            name,
            flow_key: flowKey,
            status: "draft",
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
      featureForMode,
      isSupabaseConfigured,
      router,
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
            ? () => handleDownloadProcessed("both")
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
        onPlayToggle={() => {
          if (isPlaying) {
            pause();
          } else {
            play();
          }
        }}
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
          <div className="relative min-w-[900px]">
            {/* Global playhead line spanning timeline + waveform grid (excluding track header/faders) */}
            <div className="pointer-events-none absolute inset-y-0 left-60 right-0">
              <div
                className="absolute top-0 bottom-0 border-l border-red-400/90 shadow-[0_0_12px_rgba(248,113,113,0.7)]"
                style={{ left: `${playheadX}px` }}
              />
            </div>
            <Timeline
              zoom={zoom}
              gridResolution={gridResolution}
              bpm={bpm}
              playheadSeconds={playheadSeconds}
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
                  onRoleChange={handleTrackRoleChange}
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
                          prev.map((t) => {
                            if (t.id !== trackId) return t;

                            let plugins = t.plugins;
                            if (processed.plugins && processed.plugins.length > 0) {
                              const existing = Array.isArray(t.plugins) ? t.plugins : [];
                              const userPlugins = existing.filter((p) => !p.aiGenerated);
                              const baseOrder = userPlugins.length;
                              const normalizedUser = userPlugins.map((p, index) => ({
                                ...p,
                                trackId: t.id,
                                order: index,
                              }));
                              const normalizedAI = processed.plugins.map((p, index) => ({
                                ...p,
                                trackId: t.id,
                                order: baseOrder + index,
                              }));
                              plugins = [...normalizedUser, ...normalizedAI];
                            }

                            return {
                              ...t,
                              file: processed.file,
                              processed: true,
                              renderUrls: processed.urls ?? t.renderUrls,
                              plugins,
                            };
                          }),
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
              onClick={() => {
                if (isPlaying) {
                  pause();
                } else {
                  play();
                }
              }}
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
            <div className="flex flex-col gap-1">
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
              <div className="mt-1 w-64">
                <TrackPluginRack
                  plugins={masterPlugins}
                  hidePlugins={false}
                  onChange={(next) => {
                    setMasterPlugins(next);
                  }}
                  onOpen={(plugin) => {
                    openPluginWindow("master-bus", plugin.id);
                  }}
                />
              </div>
              {virtualMixerTracks.length > 0 && (
                <div className="mt-3 space-y-2">
                  {virtualMixerTracks.map((vt) => (
                    <div key={vt.id} className="w-64">
                      <div className="mb-1 text-[11px] font-medium text-white/60">
                        {vt.name}
                      </div>
                      <TrackPluginRack
                        plugins={vt.plugins}
                        hidePlugins={false}
                        onChange={(next) => {
                          setVirtualMixerTracks((prev) =>
                            prev.map((t) => (t.id === vt.id ? { ...t, plugins: next } : t)),
                          );
                        }}
                        onOpen={(plugin) => {
                          openPluginWindow(vt.id, plugin.id);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
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
                    onClick={() => handleDownloadProcessed("both")}
                    disabled={!hasMixed || !tracks.some((track) => track.file)}
                    className="rounded bg-zinc-800 px-4 py-2 text-sm text-white/80 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-white/40"
                  >
                    Download Mix WAV+MP3
                  </button>
                </>
              ) : (
                (isMasterOnlyMode || isMixOnlyMode || isCleanupMode || isPodcastMode) && hasMixed && (
                  <div className="inline-flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadProcessed("wav")}
                      disabled={!hasMixed || !tracks.some((track) => track.file)}
                      className="rounded bg-zinc-800 px-4 py-2 text-sm text-white/80 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-white/40"
                    >
                      {isMasterOnlyMode ? "Download WAV Master" : "Download WAV"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadProcessed("mp3")}
                      disabled={!hasMixed || !tracks.some((track) => track.file)}
                      className="rounded bg-zinc-800 px-4 py-2 text-sm text-white/80 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-white/40"
                    >
                      {isMasterOnlyMode ? "Download MP3 Master" : "Download MP3"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadProcessed("both")}
                      disabled={!hasMixed || !tracks.some((track) => track.file)}
                      className="rounded bg-zinc-800 px-4 py-2 text-sm text-white/80 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-800/50 disabled:text-white/40"
                    >
                      {isMasterOnlyMode ? "Download Both" : "Download WAV+MP3"}
                    </button>
                  </div>
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
                {featureForMode && (
                  <span className="text-[10px] text-white/50">
                    {primaryFeatureCredits == null
                      ? "Credits: unlimited"
                      : `Credits left: ${primaryFeatureCredits}`}
                  </span>
                )}
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
        const isMasterBus = ref.trackId === "master-bus";
        const track = isMasterBus ? null : tracks.find((t) => t.id === ref.trackId);
        const virtualTrack = !isMasterBus && !track
          ? virtualMixerTracks.find((t) => t.id === ref.trackId)
          : null;
        const plugin = isMasterBus
          ? masterPlugins.find((p) => p.id === ref.pluginId)
          : track?.plugins?.find((p) => p.id === ref.pluginId) ??
            virtualTrack?.plugins.find((p) => p.id === ref.pluginId);
        if (!plugin) return null;
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
              if (isMasterBus) {
                setMasterPlugins((prev) => prev.map((p) => (p.id === plugin.id ? next : p)));
              } else if (track) {
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
              } else if (virtualTrack) {
                setVirtualMixerTracks((prev) =>
                  prev.map((t) =>
                    t.id === virtualTrack.id
                      ? {
                          ...t,
                          plugins: t.plugins.map((p) => (p.id === plugin.id ? next : p)),
                        }
                      : t,
                  ),
                );
              }
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
