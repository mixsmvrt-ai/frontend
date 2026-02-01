"use client";

export type PluginType =
  | "EQ"
  | "Compressor"
  | "De-esser"
  | "Saturation"
  | "Reverb"
  | "Delay"
  | "Limiter"
  | "Mastering EQ"
  | "Master Bus Compressor"
  | "Stereo Imager";

export type PluginCategory = "EQ" | "Dynamics" | "FX" | "Utility";

export type PluginParams = Record<string, number | string | boolean | number[]>;

export type PluginPreset = {
  id: string;
  name: string;
  params: PluginParams;
};

export interface TrackPlugin {
  id: string;
  pluginId: string;
  trackId?: string;
  pluginType: PluginType;
  name: string;
  order: number;
  params: PluginParams;
  // Optional AI baseline parameters for revert/compare UX.
  aiParams?: PluginParams;
  preset?: string;
  enabled: boolean;
  aiGenerated: boolean;
  locked: boolean;
}

export const PLUGIN_TYPE_TO_CATEGORY: Record<PluginType, PluginCategory> = {
  EQ: "EQ",
  Compressor: "Dynamics",
  "De-esser": "Dynamics",
  Saturation: "FX",
  Reverb: "FX",
  Delay: "FX",
  Limiter: "Dynamics",
  "Mastering EQ": "EQ",
  "Master Bus Compressor": "Dynamics",
  "Stereo Imager": "Utility",
};

export function isPluginType(value: unknown): value is PluginType {
  return (
    value === "EQ" ||
    value === "Compressor" ||
    value === "De-esser" ||
    value === "Saturation" ||
    value === "Reverb" ||
    value === "Delay" ||
    value === "Limiter" ||
    value === "Mastering EQ" ||
    value === "Master Bus Compressor" ||
    value === "Stereo Imager"
  );
}

export function defaultPluginName(type: PluginType): string {
  switch (type) {
    case "EQ":
      return "Channel EQ";
    case "Compressor":
      return "Channel Comp";
    case "De-esser":
      return "De-Esser";
    case "Saturation":
      return "Saturation";
    case "Reverb":
      return "Reverb";
    case "Delay":
      return "Delay";
    case "Limiter":
      return "Limiter";
    case "Mastering EQ":
      return "Mastering EQ";
    case "Master Bus Compressor":
      return "Master Bus Comp";
    case "Stereo Imager":
      return "Stereo Imager";
    default:
      return "Plugin";
  }
}

export function defaultPluginParams(type: PluginType): PluginParams {
  switch (type) {
    case "EQ":
      return {
        low_freq: 120,
        low_gain: 0,
        low_q: 0.8,
        low_type: "Shelf",

        low_mid_freq: 350,
        low_mid_gain: 0,
        low_mid_q: 1.0,
        low_mid_type: "Bell",

        mid_freq: 1000,
        mid_gain: 0,
        mid_q: 1.0,
        mid_type: "Bell",

        high_mid_freq: 3500,
        high_mid_gain: 0,
        high_mid_q: 1.0,
        high_mid_type: "Bell",

        high_freq: 10000,
        high_gain: 0,
        high_q: 0.8,
        high_type: "Shelf",

        mix: 1,
        output_gain: 0,
      };

    case "Compressor":
      return {
        threshold: -18,
        ratio: 3,
        attack: 10,
        release: 120,
        knee: 6,
        sidechain: false,
        auto: false,
        mix: 1,
        output_gain: 0,
      };

    case "De-esser":
      return {
        freq: 6500,
        width: 0.8,
        threshold: -24,
        amount: 40, // percent
        mix: 1,
        output_gain: 0,
      };

    case "Saturation":
      return {
        drive: 25, // percent
        tone: 0, // -1..1
        mode: "Tape",
        mix: 1,
        output_gain: 0,
      };

    case "Reverb":
      return {
        size: 55, // percent
        width: 70, // percent
        decay: 1.8, // sec
        pre_delay: 20, // ms
        damping: 45, // percent
        early_reflections: true,
        room: "Plate",
        mix: 0.22,
        output_gain: 0,
      };

    case "Delay":
      return {
        time_ms: 320,
        sync: false,
        feedback: 35, // percent
        width: 60, // percent
        hp: 120, // Hz
        lp: 8000, // Hz
        ping_pong: false,
        mix: 0.18,
        output_gain: 0,
      };

    case "Limiter":
      return {
        threshold: -6,
        ceiling: -1,
        release: 120,
        target_lufs: -14,
        mix: 1,
        output_gain: 0,
      };

    case "Mastering EQ":
      return {
        tilt: 0, // dB across spectrum
        low_shelf_gain: 0,
        high_shelf_gain: 0,
        linear_phase: true,
        mix: 1,
        output_gain: 0,
      };

    case "Master Bus Compressor":
      return {
        threshold: -12,
        ratio: 2,
        attack: 30,
        release: 200,
        auto_release: true,
        mix: 0.75,
        output_gain: 0,
      };

    case "Stereo Imager":
      return {
        low_width: 0.9,
        mid_width: 1.0,
        high_width: 1.15,
        mono_check: false,
        mix: 1,
        output_gain: 0,
      };

    default:
      return { mix: 1, output_gain: 0 };
  }
}

export function defaultAIParams(type: PluginType): PluginParams {
  // For now, seed AI params as defaults; backend/AI can overwrite later.
  return defaultPluginParams(type);
}

export function ensurePluginHasAIParams(plugin: TrackPlugin): TrackPlugin {
  if (plugin.aiParams && typeof plugin.aiParams === "object") return plugin;
  return {
    ...plugin,
    aiParams: defaultAIParams(plugin.pluginType),
  };
}

export function getPluginPresets(type: PluginType): PluginPreset[] {
  // These are intentionally “modern starting points” (not replicas of any branded presets).
  switch (type) {
    case "EQ":
      return [
        {
          id: "eq_vocal_clarity",
          name: "Vocal Clarity",
          params: {
            low_freq: 120,
            low_gain: -2,
            low_q: 0.8,
            low_type: "Shelf",
            low_mid_freq: 320,
            low_mid_gain: -1.5,
            low_mid_q: 1.2,
            low_mid_type: "Bell",
            mid_freq: 1800,
            mid_gain: +2.0,
            mid_q: 1.0,
            mid_type: "Bell",
            high_mid_freq: 4500,
            high_mid_gain: -1.0,
            high_mid_q: 2.0,
            high_mid_type: "Bell",
            high_freq: 12000,
            high_gain: +2.5,
            high_q: 0.7,
            high_type: "Shelf",
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "eq_sub_trap_dh",
          name: "Subtractive Trap/DH",
          params: {
            // Strongest subtractive curve – close to the
            // Trap Dancehall DSP preset.
            low_freq: 140,
            low_gain: -3.0,
            low_q: 0.8,
            low_type: "Shelf",

            low_mid_freq: 280,
            low_mid_gain: -3.0,
            low_mid_q: 1.0,
            low_mid_type: "Bell",

            mid_freq: 550,
            mid_gain: -2.5,
            mid_q: 1.2,
            mid_type: "Bell",

            high_mid_freq: 4475,
            high_mid_gain: -4.0,
            high_mid_q: 5.0,
            high_mid_type: "Bell",

            high_freq: 10500,
            high_gain: +0.5,
            high_q: 0.7,
            high_type: "Shelf",
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "eq_sub_hiphop",
          name: "Subtractive Hip-Hop",
          params: {
            low_freq: 160,
            low_gain: -2.0,
            low_q: 0.8,
            low_type: "Shelf",

            low_mid_freq: 320,
            low_mid_gain: -2.0,
            low_mid_q: 1.0,
            low_mid_type: "Bell",

            mid_freq: 650,
            mid_gain: -1.5,
            mid_q: 1.1,
            mid_type: "Bell",

            high_mid_freq: 4200,
            high_mid_gain: -2.0,
            high_mid_q: 3.0,
            high_mid_type: "Bell",

            high_freq: 11000,
            high_gain: 0.0,
            high_q: 0.8,
            high_type: "Shelf",
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "eq_sub_rap",
          name: "Subtractive Rap",
          params: {
            low_freq: 220,
            low_gain: -2.5,
            low_q: 0.8,
            low_type: "Shelf",

            low_mid_freq: 320,
            low_mid_gain: -2.5,
            low_mid_q: 1.1,
            low_mid_type: "Bell",

            mid_freq: 520,
            mid_gain: -2.0,
            mid_q: 1.2,
            mid_type: "Bell",

            high_mid_freq: 4100,
            high_mid_gain: -1.5,
            high_mid_q: 2.5,
            high_mid_type: "Bell",

            high_freq: 11500,
            high_gain: 0.0,
            high_q: 0.8,
            high_type: "Shelf",
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "eq_sub_afrobeat",
          name: "Subtractive Afrobeat",
          params: {
            low_freq: 170,
            low_gain: -1.5,
            low_q: 0.8,
            low_type: "Shelf",

            low_mid_freq: 260,
            low_mid_gain: -2.0,
            low_mid_q: 1.0,
            low_mid_type: "Bell",

            mid_freq: 900,
            mid_gain: -1.0,
            mid_q: 1.0,
            mid_type: "Bell",

            high_mid_freq: 3600,
            high_mid_gain: -1.0,
            high_mid_q: 2.0,
            high_mid_type: "Bell",

            high_freq: 9500,
            high_gain: +0.5,
            high_q: 0.8,
            high_type: "Shelf",
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "eq_sub_rnb",
          name: "Subtractive R&B",
          params: {
            low_freq: 150,
            low_gain: -0.5,
            low_q: 0.8,
            low_type: "Shelf",

            low_mid_freq: 260,
            low_mid_gain: -1.5,
            low_mid_q: 1.0,
            low_mid_type: "Bell",

            mid_freq: 800,
            mid_gain: -0.8,
            mid_q: 1.0,
            mid_type: "Bell",

            high_mid_freq: 3400,
            high_mid_gain: -0.8,
            high_mid_q: 1.8,
            high_mid_type: "Bell",

            high_freq: 10500,
            high_gain: +0.5,
            high_q: 0.8,
            high_type: "Shelf",
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "eq_sub_reggae",
          name: "Subtractive Reggae",
          params: {
            low_freq: 170,
            low_gain: -0.5,
            low_q: 0.8,
            low_type: "Shelf",

            low_mid_freq: 260,
            low_mid_gain: -1.5,
            low_mid_q: 1.0,
            low_mid_type: "Bell",

            mid_freq: 900,
            mid_gain: -0.6,
            mid_q: 1.0,
            mid_type: "Bell",

            high_mid_freq: 3200,
            high_mid_gain: -0.5,
            high_mid_q: 1.8,
            high_mid_type: "Bell",

            high_freq: 9200,
            high_gain: +0.5,
            high_q: 0.8,
            high_type: "Shelf",
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "eq_sub_generic",
          name: "Subtractive Generic",
          params: {
            low_freq: 150,
            low_gain: -1.5,
            low_q: 0.8,
            low_type: "Shelf",

            low_mid_freq: 320,
            low_mid_gain: -1.5,
            low_mid_q: 1.0,
            low_mid_type: "Bell",

            mid_freq: 900,
            mid_gain: -1.0,
            mid_q: 1.0,
            mid_type: "Bell",

            high_mid_freq: 3500,
            high_mid_gain: -1.0,
            high_mid_q: 1.8,
            high_mid_type: "Bell",

            high_freq: 10500,
            high_gain: +0.5,
            high_q: 0.8,
            high_type: "Shelf",
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "eq_air",
          name: "Air Lift",
          params: {
            low_freq: 120,
            low_gain: -1.5,
            low_q: 0.7,
            low_type: "Shelf",
            low_mid_freq: 300,
            low_mid_gain: -1.0,
            low_mid_q: 1.0,
            low_mid_type: "Bell",
            mid_freq: 1800,
            mid_gain: +1.0,
            mid_q: 0.9,
            mid_type: "Bell",
            high_mid_freq: 5000,
            high_mid_gain: -0.5,
            high_mid_q: 1.8,
            high_mid_type: "Bell",
            high_freq: 14000,
            high_gain: +4.0,
            high_q: 0.7,
            high_type: "Shelf",
            mix: 1,
            output_gain: 0,
          },
        },
      ];

    case "Compressor":
      return [
        {
          id: "comp_vocal_leveler",
          name: "Vocal Leveler",
          params: {
            threshold: -20,
            ratio: 3,
            attack: 12,
            release: 120,
            knee: 6,
            sidechain: false,
            auto: true,
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "comp_fast_tamer",
          name: "Fast Peak Tamer",
          params: {
            threshold: -16,
            ratio: 6,
            attack: 2.5,
            release: 70,
            knee: 3,
            sidechain: false,
            auto: false,
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "comp_soft_glue",
          name: "Soft Glue",
          params: {
            threshold: -14,
            ratio: 2,
            attack: 30,
            release: 180,
            knee: 10,
            sidechain: false,
            auto: true,
            mix: 0.85,
            output_gain: 0,
          },
        },
      ];

    case "De-esser":
      return [
        {
          id: "deess_vocal_standard",
          name: "Vocal Sibilance",
          params: {
            freq: 6500,
            width: 0.8,
            threshold: -24,
            amount: 45,
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "deess_bright",
          name: "Bright Vocal",
          params: {
            freq: 7800,
            width: 0.7,
            threshold: -26,
            amount: 55,
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "deess_soft",
          name: "Soft Control",
          params: {
            freq: 6000,
            width: 0.9,
            threshold: -22,
            amount: 30,
            mix: 1,
            output_gain: 0,
          },
        },
      ];

    case "Saturation":
      return [
        {
          id: "sat_tape_warm",
          name: "Tape Warm",
          params: {
            drive: 22,
            tone: -0.15,
            mode: "Tape",
            mix: 0.65,
            output_gain: 0,
          },
        },
        {
          id: "sat_tube_edge",
          name: "Tube Edge",
          params: {
            drive: 35,
            tone: 0.2,
            mode: "Tube",
            mix: 0.5,
            output_gain: 0,
          },
        },
        {
          id: "sat_parallel_crunch",
          name: "Parallel Crunch",
          params: {
            drive: 55,
            tone: 0.1,
            mode: "Analog",
            mix: 0.28,
            output_gain: 0,
          },
        },
      ];

    case "Reverb":
      return [
        {
          id: "rev_vocal_plate",
          name: "Vocal Plate",
          params: {
            size: 45,
            width: 75,
            decay: 1.6,
            pre_delay: 28,
            damping: 55,
            early_reflections: true,
            room: "Plate",
            mix: 0.18,
            output_gain: 0,
          },
        },
        {
          id: "rev_small_room",
          name: "Small Room",
          params: {
            size: 22,
            width: 55,
            decay: 0.9,
            pre_delay: 10,
            damping: 65,
            early_reflections: true,
            room: "Room",
            mix: 0.12,
            output_gain: 0,
          },
        },
        {
          id: "rev_big_hall",
          name: "Big Hall",
          params: {
            size: 80,
            width: 85,
            decay: 3.2,
            pre_delay: 38,
            damping: 40,
            early_reflections: true,
            room: "Hall",
            mix: 0.16,
            output_gain: 0,
          },
        },
      ];

    case "Delay":
      return [
        {
          id: "del_vocal_slap",
          name: "Vocal Slap",
          params: {
            time_ms: 110,
            sync: false,
            feedback: 18,
            width: 35,
            hp: 180,
            lp: 6500,
            ping_pong: false,
            mix: 0.16,
            output_gain: 0,
          },
        },
        {
          id: "del_eighth_pingpong",
          name: "Eighth Ping-Pong",
          params: {
            time_ms: 260,
            sync: false,
            feedback: 32,
            width: 75,
            hp: 220,
            lp: 7200,
            ping_pong: true,
            mix: 0.18,
            output_gain: 0,
          },
        },
        {
          id: "del_quarter_wide",
          name: "Quarter Wide",
          params: {
            time_ms: 420,
            sync: false,
            feedback: 40,
            width: 85,
            hp: 150,
            lp: 9000,
            ping_pong: true,
            mix: 0.14,
            output_gain: 0,
          },
        },
      ];

    case "Limiter":
      return [
        {
          id: "lim_streaming",
          name: "Streaming Safe",
          params: {
            threshold: -6,
            ceiling: -1,
            release: 140,
            target_lufs: -14,
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "lim_loud",
          name: "Loud + Tight",
          params: {
            threshold: -8,
            ceiling: -0.8,
            release: 90,
            target_lufs: -11,
            mix: 1,
            output_gain: 0,
          },
        },
      ];

    case "Master Bus Compressor":
      return [
        {
          id: "bus_glue_gentle",
          name: "Gentle Glue",
          params: {
            threshold: -14,
            ratio: 2,
            attack: 30,
            release: 200,
            auto_release: true,
            mix: 0.75,
            output_gain: 0,
          },
        },
        {
          id: "bus_glue_punch",
          name: "Punch Glue",
          params: {
            threshold: -12,
            ratio: 3,
            attack: 10,
            release: 120,
            auto_release: false,
            mix: 0.7,
            output_gain: 0,
          },
        },
      ];

    case "Mastering EQ":
      return [
        {
          id: "meq_warm",
          name: "Warm Master",
          params: {
            tilt: -0.6,
            low_shelf_gain: +1.0,
            high_shelf_gain: -0.4,
            linear_phase: true,
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "meq_bright",
          name: "Bright Master",
          params: {
            tilt: 0.7,
            low_shelf_gain: -0.5,
            high_shelf_gain: +1.5,
            linear_phase: true,
            mix: 1,
            output_gain: 0,
          },
        },
      ];

    case "Stereo Imager":
      return [
        {
          id: "stereo_safe",
          name: "Safe Wide",
          params: {
            low_width: 0.95,
            mid_width: 1.05,
            high_width: 1.15,
            mono_check: false,
            mix: 1,
            output_gain: 0,
          },
        },
        {
          id: "stereo_mono_check",
          name: "Mono Check",
          params: {
            low_width: 1,
            mid_width: 1,
            high_width: 1,
            mono_check: true,
            mix: 1,
            output_gain: 0,
          },
        },
      ];

    default:
      return [];
  }
}

export function applyPluginPreset(plugin: TrackPlugin, presetId: string): TrackPlugin {
  const presets = getPluginPresets(plugin.pluginType);
  const preset = presets.find((p) => p.id === presetId);
  if (!preset) {
    return { ...plugin, preset: presetId };
  }

  return {
    ...plugin,
    preset: preset.id,
    params: {
      ...defaultPluginParams(plugin.pluginType),
      ...preset.params,
    },
    locked: false,
    aiGenerated: plugin.aiGenerated,
  };
}
