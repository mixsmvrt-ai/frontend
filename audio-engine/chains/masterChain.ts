import type { ChainDefinition } from "../types";

// Master chain: linear-phase style EQ -> glue comp -> subtle sat -> stereo enhance -> limiter -> loudness
export const masterChain: ChainDefinition = {
  id: "master-default",
  name: "Master – Default Streaming",
  role: "master",
  description:
    "Clean up low-end and top, add glue compression and subtle saturation, enhance stereo image, then peak limit and normalize loudness.",
  stages: [
    {
      id: "eq",
      params: {
        id: "eq",
        bands: [
          { type: "highpass", frequency: 25, gainDb: 0 },
          { type: "peak", frequency: 250, q: 1.1, gainDb: -1.5 },
          { type: "highshelf", frequency: 10000, q: 0.7, gainDb: 1.5 },
        ],
      },
    },
    {
      id: "compressor",
      params: {
        id: "compressor",
        thresholdDb: -14,
        ratio: 2,
        attackMs: 20,
        releaseMs: 150,
        makeupGainDb: 1,
      },
    },
    {
      id: "saturation",
      params: {
        id: "saturation",
        driveDb: 2,
        blend: 0.25,
      },
    },
    {
      id: "stereo",
      params: {
        id: "stereo",
        width: 1.1,
        pan: 0,
      },
    },
    {
      id: "limiter",
      params: {
        id: "limiter",
        ceilingDb: -1,
        releaseMs: 100,
      },
    },
    {
      id: "loudness",
      params: {
        id: "loudness",
        targetLufs: -10,
        ceilingDb: -1,
      },
    },
  ],
};
