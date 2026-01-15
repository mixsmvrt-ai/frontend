import type { PresetDefinition } from "../types";
import { beatChain } from "../chains/beatChain";

export const transparentMixBusPreset: PresetDefinition = {
  id: "mixbus-transparent",
  name: "Mix Bus – Transparent",
  role: "mix-bus",
  chain: beatChain,
  notes: "Gentle glue and tone shaping that keeps the mix open.",
};

export const thickMixBusPreset: PresetDefinition = {
  id: "mixbus-thick",
  name: "Mix Bus – Thick & Warm",
  role: "mix-bus",
  chain: {
    ...beatChain,
    id: "beat-bus-thick",
    name: "Beat Bus – Thick",
    stages: beatChain.stages.map((stage) => {
      if (stage.id === "saturation" && stage.params.id === "saturation") {
        return {
          ...stage,
          params: {
            ...stage.params,
            driveDb: 4,
            blend: 0.5,
          },
        };
      }
      if (stage.id === "compressor" && stage.params.id === "compressor") {
        return {
          ...stage,
          params: {
            ...stage.params,
            thresholdDb: -18,
            ratio: 2.5,
            makeupGainDb: 2,
          },
        };
      }
      return stage;
    }),
  },
  notes: "Adds noticeable weight and density to the mix bus.",
};

export const mixBusPresets: PresetDefinition[] = [
  transparentMixBusPreset,
  thickMixBusPreset,
];
