import type { PresetDefinition } from "../types";
import { genericVocalChain } from "../chains/vocalChain";

export const cleanVocalPreset: PresetDefinition = {
  id: "vocal-clean",
  name: "Clean Vocal",
  role: "vocal",
  chain: genericVocalChain,
  notes: "Focus on clarity and intelligibility with gentle de-essing and compression.",
};

export const aggressiveVocalPreset: PresetDefinition = {
  id: "vocal-aggressive",
  name: "Aggressive Vocal",
  role: "vocal",
  chain: {
    ...genericVocalChain,
    id: "vocal-aggressive-chain",
    name: "Vocal – Aggressive",
    stages: genericVocalChain.stages.map((stage) => {
      if (stage.id === "compressor" && stage.params.id === "compressor") {
        return {
          ...stage,
          params: {
            ...stage.params,
            thresholdDb: -20,
            ratio: 4,
            makeupGainDb: 3,
          },
        };
      }
      if (stage.id === "saturation" && stage.params.id === "saturation") {
        return {
          ...stage,
          params: {
            ...stage.params,
            driveDb: 5,
            blend: 0.5,
          },
        };
      }
      return stage;
    }),
  },
  notes: "More forward, dense vocals for rap or energetic pop.",
};

export const airyVocalPreset: PresetDefinition = {
  id: "vocal-airy",
  name: "Airy Vocal",
  role: "vocal",
  chain: {
    ...genericVocalChain,
    id: "vocal-airy-chain",
    name: "Vocal – Airy Top End",
    stages: genericVocalChain.stages.map((stage) => {
      if (stage.id === "eq" && stage.params.id === "eq") {
        return {
          ...stage,
          params: {
            ...stage.params,
            bands: [
              ...stage.params.bands,
              { type: "highshelf", frequency: 12000, q: 0.7, gainDb: 2.5 },
            ],
          },
        };
      }
      return stage;
    }),
  },
  notes: "Adds openness and air while keeping sibilance under control.",
};

export const vocalPresets: PresetDefinition[] = [
  cleanVocalPreset,
  aggressiveVocalPreset,
  airyVocalPreset,
];
