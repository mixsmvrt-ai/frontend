import type { ChainDefinition } from "../types";

// Beat/bus chain: HPF -> low-mid cleanup -> bus comp -> saturation -> stereo widen -> soft limiter
export const beatChain: ChainDefinition = {
  id: "beat-bus",
  name: "Beat / Instrumental Bus",
  role: "beat",
  description:
    "High-pass the subs, clean low-mids, add bus compression, taste of saturation, stereo widening, and gentle limiting.",
  stages: [
    {
      id: "eq",
      params: {
        id: "eq",
        bands: [
          { type: "highpass", frequency: 30, gainDb: 0 },
          { type: "peak", frequency: 250, q: 1.4, gainDb: -2 },
        ],
      },
    },
    {
      id: "compressor",
      params: {
        id: "compressor",
        thresholdDb: -16,
        ratio: 2,
        attackMs: 10,
        releaseMs: 100,
        makeupGainDb: 1,
      },
    },
    {
      id: "saturation",
      params: {
        id: "saturation",
        driveDb: 2,
        blend: 0.3,
      },
    },
    {
      id: "stereo",
      params: {
        id: "stereo",
        width: 1.15,
        pan: 0,
      },
    },
    {
      id: "limiter",
      params: {
        id: "limiter",
        ceilingDb: -1,
        releaseMs: 80,
      },
    },
  ],
};
