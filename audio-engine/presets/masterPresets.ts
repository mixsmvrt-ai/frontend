import type { PresetDefinition } from "../types";
import { masterChain } from "../chains/masterChain";

export const streamingMasterPreset: PresetDefinition = {
  id: "master-streaming",
  name: "Master – Streaming Ready",
  role: "master",
  chain: masterChain,
  notes: "Balanced master suitable for most streaming platforms.",
};

export const loudClubPreset: PresetDefinition = {
  id: "master-club",
  name: "Master – Loud Club",
  role: "master",
  chain: {
    ...masterChain,
    id: "master-club-chain",
    name: "Master – Club Loud",
    stages: masterChain.stages.map((stage) => {
      if (stage.id === "compressor" && stage.params.id === "compressor") {
        return {
          ...stage,
          params: {
            ...stage.params,
            thresholdDb: -18,
            ratio: 3,
            makeupGainDb: 2,
          },
        };
      }
      if (stage.id === "loudness" && stage.params.id === "loudness") {
        return {
          ...stage,
          params: {
            ...stage.params,
            targetLufs: -7,
          },
        };
      }
      return stage;
    }),
  },
  notes: "Aggressive loudness for club or hype playback.",
};

export const gentleMasterPreset: PresetDefinition = {
  id: "master-gentle",
  name: "Master – Gentle",
  role: "master",
  chain: {
    ...masterChain,
    id: "master-gentle-chain",
    name: "Master – Gentle",
    stages: masterChain.stages.map((stage) => {
      if (stage.id === "compressor" && stage.params.id === "compressor") {
        return {
          ...stage,
          params: {
            ...stage.params,
            thresholdDb: -12,
            ratio: 1.5,
            makeupGainDb: 0.5,
          },
        };
      }
      if (stage.id === "loudness" && stage.params.id === "loudness") {
        return {
          ...stage,
          params: {
            ...stage.params,
            targetLufs: -14,
          },
        };
      }
      return stage;
    }),
  },
  notes: "Preserves more dynamics for acoustic or jazz-focused material.",
};

export const masterPresets: PresetDefinition[] = [
  streamingMasterPreset,
  loudClubPreset,
  gentleMasterPreset,
];
