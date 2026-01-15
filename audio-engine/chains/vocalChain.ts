import type { ChainDefinition } from "../types";

// Generic vocal chain: HPF -> subtractive EQ -> de-esser -> comp -> additive EQ -> sat -> stereo -> limiter
export const genericVocalChain: ChainDefinition = {
  id: "vocal-generic",
  name: "Vocal – Generic",
  role: "vocal",
  description:
    "High-pass, cleanup EQ, de-essing, compression, tone shaping, saturation, stereo centering, and safety limiting.",
  stages: [
    {
      id: "eq",
      params: {
        id: "eq",
        bands: [
          { type: "highpass", frequency: 80, gainDb: 0 },
          { type: "peak", frequency: 250, q: 1.2, gainDb: -2 },
          { type: "peak", frequency: 3500, q: 1.0, gainDb: +1.5 },
        ],
      },
    },
    {
      id: "deesser",
      params: {
        id: "deesser",
        centerFrequency: 7000,
        bandwidth: 4000,
        thresholdDb: -18,
        ratio: 3,
      },
    },
    {
      id: "compressor",
      params: {
        id: "compressor",
        thresholdDb: -18,
        ratio: 3,
        attackMs: 5,
        releaseMs: 80,
        makeupGainDb: 2,
      },
    },
    {
      id: "eq",
      params: {
        id: "eq",
        bands: [
          { type: "highshelf", frequency: 9000, q: 0.7, gainDb: 2.5 },
        ],
      },
    },
    {
      id: "saturation",
      params: {
        id: "saturation",
        driveDb: 3,
        blend: 0.4,
      },
    },
    {
      id: "stereo",
      params: {
        id: "stereo",
        width: 1,
        pan: 0,
      },
    },
    {
      id: "limiter",
      params: {
        id: "limiter",
        ceilingDb: -1,
        releaseMs: 50,
      },
    },
  ],
};
