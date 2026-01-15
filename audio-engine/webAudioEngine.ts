// Web Audio API bindings for MIXSMVRT chains/presets
// This module maps the existing ChainDefinition / ProcessorParams types
// to actual Web Audio node graphs that can run in the browser.

import type {
  ChainDefinition,
  ChainStage,
  EngineAudioBuffer,
  ProcessorParams,
  PresetDefinition,
} from "./types";

// Lightweight wrapper around an AudioContext graph built from a chain
export interface WebAudioChainInstance {
  context: AudioContext;
  source: AudioBufferSourceNode;
  input: AudioNode; // first processing node (or source)
  output: AudioNode; // last processing node
  gainOut: GainNode; // convenient final gain node before destination
  disconnect: () => void;
}

// Convert a browser AudioBuffer into the engine's neutral format so the same
// buffer can be fed into either the TypeScript DSP mocks or Web Audio chains.
export function audioBufferToEngineBuffer(audioBuffer: AudioBuffer): EngineAudioBuffer {
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch += 1) {
    const src = audioBuffer.getChannelData(ch);
    channels.push(new Float32Array(src));
  }
  return {
    sampleRate: audioBuffer.sampleRate,
    channels,
  };
}

// Convert our EngineAudioBuffer into a real AudioBuffer for a given context
export function engineBufferToAudioBuffer(
  context: AudioContext,
  buffer: EngineAudioBuffer,
): AudioBuffer {
  const audioBuffer = context.createBuffer(
    buffer.channels.length,
    buffer.channels[0]?.length ?? 0,
    buffer.sampleRate,
  );

  buffer.channels.forEach((channelData, index) => {
    const channel = audioBuffer.getChannelData(index);
    channel.set(channelData);
  });

  return audioBuffer;
}

// Build a Web Audio node for a single processor stage
function createNodeForStage(
  context: AudioContext,
  stage: ChainStage,
): AudioNode | null {
  const params = stage.params as ProcessorParams;

  if (stage.bypass) {
    return null;
  }

  switch (stage.id) {
    case "eq": {
      // For now we implement a simple mid EQ using a single peaking filter.
      // More bands can be added by chaining multiple BiquadFilterNodes.
      const node = context.createBiquadFilter();
      const firstBand = (params as any).bands?.[0];
      if (firstBand) {
        node.type = firstBand.type as BiquadFilterType;
        node.frequency.value = firstBand.frequency;
        if (firstBand.q != null) node.Q.value = firstBand.q;
        node.gain.value = firstBand.gainDb;
      }
      return node;
    }
    case "compressor": {
      const node = context.createDynamicsCompressor();
      if ("thresholdDb" in params) node.threshold.value = params.thresholdDb;
      if ("ratio" in params) node.ratio.value = params.ratio;
      if ("attackMs" in params) node.attack.value = params.attackMs / 1000;
      if ("releaseMs" in params) node.release.value = params.releaseMs / 1000;
      return node;
    }
    case "deesser": {
      // Approximate de-esser: band-pass into compressor would be ideal.
      // Here we expose a simple high-shelf filter to tame highs.
      const node = context.createBiquadFilter();
      node.type = "highshelf";
      node.frequency.value = (params as any).centerFrequency ?? 7000;
      node.gain.value = -4;
      return node;
    }
    case "saturation": {
      // Simple waveshaper-based saturation
      const shaper = context.createWaveShaper();
      const driveDb = "driveDb" in params ? params.driveDb : 6;
      const amount = Math.max(1, driveDb / 3);
      shaper.curve = makeSaturationCurve(amount, 2048) as any;
      shaper.oversample = "2x";
      return shaper;
    }
    case "stereo": {
      // Width is not trivial with stock nodes; we at least expose pan.
      const panner = context.createStereoPanner();
      if ("pan" in params) panner.pan.value = params.pan;
      return panner;
    }
    case "limiter": {
      // Simple limiter approximation using a hard compressor near ceiling.
      const comp = context.createDynamicsCompressor();
      comp.threshold.value = ((params as any).ceilingDb ?? -1) - 1;
      comp.knee.value = 0;
      comp.ratio.value = 20;
      comp.attack.value = 0.003;
      comp.release.value = ((params as any).releaseMs ?? 50) / 1000;
      return comp;
    }
    case "loudness": {
      // Approximate loudness as a static gain towards target LUFS.
      const gain = context.createGain();
      // The exact gain will depend on analysis; here we leave unity and
      // expect the backend / analysis to set it via automation if needed.
      gain.gain.value = 1;
      return gain;
    }
    default:
      return null;
  }
}

// Simple arctangent-style saturation curve
function makeSaturationCurve(amount: number, samples: number): Float32Array {
  const curve = new Float32Array(samples);
  const k = amount;
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// Build a Web Audio processing graph for a given chain definition and buffer.
export function createWebAudioChainInstance(
  context: AudioContext,
  buffer: EngineAudioBuffer,
  chain: ChainDefinition,
): WebAudioChainInstance {
  const audioBuffer = engineBufferToAudioBuffer(context, buffer);
  const source = context.createBufferSource();
  source.buffer = audioBuffer;

  let currentNode: AudioNode = source;

  for (const stage of chain.stages) {
    const node = createNodeForStage(context, stage);
    if (!node) continue;
    currentNode.connect(node);
    currentNode = node;
  }

  const gainOut = context.createGain();
  currentNode.connect(gainOut);
  gainOut.connect(context.destination);

  return {
    context,
    source,
    input: source,
    output: gainOut,
    gainOut,
    disconnect: () => {
      try {
        source.stop();
      } catch {
        // ignore
      }
      try {
        source.disconnect();
      } catch {
        // ignore
      }
      try {
        gainOut.disconnect();
      } catch {
        // ignore
      }
    },
  };
}

// Convenience: given a preset, build a chain and start playback immediately.
export function playPresetWithWebAudio(
  context: AudioContext,
  buffer: EngineAudioBuffer,
  preset: PresetDefinition,
): WebAudioChainInstance {
  const instance = createWebAudioChainInstance(context, buffer, preset.chain);
  instance.source.start();
  return instance;
}
