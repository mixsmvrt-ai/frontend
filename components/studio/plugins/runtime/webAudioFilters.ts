"use client";

import type { PluginParams, PluginType, TrackPlugin } from "../../pluginTypes";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getNumber(params: PluginParams, key: string, fallback: number) {
  const v = Number(params[key]);
  return Number.isFinite(v) ? v : fallback;
}

function getBoolean(params: PluginParams, key: string, fallback: boolean) {
  const v = params[key];
  return typeof v === "boolean" ? v : fallback;
}

function getString(params: PluginParams, key: string, fallback: string) {
  const v = params[key];
  return typeof v === "string" ? v : fallback;
}

function dbToGain(db: number) {
  return Math.pow(10, db / 20);
}

function makeSaturationCurve(amount: number, samples: number): Float32Array {
  // Some TS/lib.dom definitions expect a Float32Array backed by ArrayBuffer (not SharedArrayBuffer).
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  const k = amount;
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function createImpulseResponse(
  context: AudioContext,
  decaySeconds: number,
  preDelayMs: number,
  dampingPercent: number,
): AudioBuffer {
  const rate = context.sampleRate;
  const preDelaySamples = Math.max(0, Math.round((preDelayMs / 1000) * rate));
  const length = Math.max(1, Math.round(decaySeconds * rate) + preDelaySamples);
  const buffer = context.createBuffer(2, length, rate);

  const damping = clamp(dampingPercent / 100, 0, 1);
  const tone = 0.15 + (1 - damping) * 0.85; // more damping => darker tail

  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      if (i < preDelaySamples) {
        data[i] = 0;
        continue;
      }
      const t = (i - preDelaySamples) / rate;
      const env = Math.exp(-t / Math.max(0.05, decaySeconds));
      // A slightly colored noise tail (not a real IR, but musical enough for preview)
      const noise = (Math.random() * 2 - 1) * tone;
      data[i] = noise * env;
    }
  }

  return buffer;
}

function biquadTypeForEqBand(band: "low" | "low_mid" | "mid" | "high_mid" | "high", uiType: string): BiquadFilterType {
  const t = uiType.toLowerCase();
  if (t.includes("cut") || t.includes("hp")) {
    return band === "high" ? "highpass" : "highpass";
  }
  if (t.includes("lp")) return "lowpass";
  if (t.includes("shelf")) return band === "low" ? "lowshelf" : "highshelf";
  return "peaking";
}

export type BuiltWebAudioFilters = {
  filters: AudioNode[];
  dispose: () => void;
};

function buildEffectNodesForPlugin(
  context: AudioContext,
  pluginType: PluginType,
  params: PluginParams,
): AudioNode[] {
  switch (pluginType) {
    case "EQ": {
      const nodes: AudioNode[] = [];
      const bands: Array<{ key: "low" | "low_mid" | "mid" | "high_mid" | "high"; defaultType: string }> = [
        { key: "low", defaultType: "Shelf" },
        { key: "low_mid", defaultType: "Bell" },
        { key: "mid", defaultType: "Bell" },
        { key: "high_mid", defaultType: "Bell" },
        { key: "high", defaultType: "Shelf" },
      ];

      for (const b of bands) {
        const f = context.createBiquadFilter();
        const freq = getNumber(params, `${b.key}_freq`, b.key === "low" ? 120 : b.key === "high" ? 10000 : 1000);
        const gain = getNumber(params, `${b.key}_gain`, 0);
        const q = getNumber(params, `${b.key}_q`, 1);
        const type = getString(params, `${b.key}_type`, b.defaultType);

        f.type = biquadTypeForEqBand(b.key, type);
        f.frequency.value = clamp(freq, 20, 20000);
        f.Q.value = clamp(q, 0.1, 18);
        // For shelf/peaking this is used; for HP/LP it is ignored.
        f.gain.value = clamp(gain, -24, 24);
        nodes.push(f);
      }
      return nodes;
    }

    case "Mastering EQ": {
      const nodes: AudioNode[] = [];
      const tilt = getNumber(params, "tilt", 0);
      const low = getNumber(params, "low_shelf_gain", 0);
      const high = getNumber(params, "high_shelf_gain", 0);

      const lowShelf = context.createBiquadFilter();
      lowShelf.type = "lowshelf";
      lowShelf.frequency.value = 140;
      lowShelf.gain.value = clamp(low + tilt * -0.5, -18, 18);

      const highShelf = context.createBiquadFilter();
      highShelf.type = "highshelf";
      highShelf.frequency.value = 9000;
      highShelf.gain.value = clamp(high + tilt * 0.5, -18, 18);

      nodes.push(lowShelf, highShelf);
      return nodes;
    }

    case "Compressor":
    case "Master Bus Compressor": {
      const comp = context.createDynamicsCompressor();
      comp.threshold.value = clamp(getNumber(params, "threshold", -18), -60, 0);
      comp.ratio.value = clamp(getNumber(params, "ratio", 3), 1, 20);
      comp.attack.value = clamp(getNumber(params, "attack", 10), 0.1, 200) / 1000;
      comp.release.value = clamp(getNumber(params, "release", 120), 10, 2000) / 1000;
      comp.knee.value = clamp(getNumber(params, "knee", 6), 0, 40);
      return [comp];
    }

    case "Limiter": {
      const ceiling = getNumber(params, "ceiling", -1);
      const release = getNumber(params, "release", 120);
      const comp = context.createDynamicsCompressor();
      comp.threshold.value = clamp(ceiling - 2, -24, 0);
      comp.knee.value = 0;
      comp.ratio.value = 20;
      comp.attack.value = 0.003;
      comp.release.value = clamp(release, 10, 1500) / 1000;
      return [comp];
    }

    case "De-esser": {
      const freq = getNumber(params, "freq", 6500);
      const amount = getNumber(params, "amount", 40);
      const shelf = context.createBiquadFilter();
      shelf.type = "highshelf";
      shelf.frequency.value = clamp(freq, 2000, 16000);
      shelf.gain.value = -clamp(amount / 6, 0, 12);
      return [shelf];
    }

    case "Saturation": {
      const mode = getString(params, "mode", "Tape");
      const drive = getNumber(params, "drive", 25);
      const tone = getNumber(params, "tone", 0);

      const shaper = context.createWaveShaper();
      const amount = mode.toLowerCase().includes("tube") ? 2 + drive / 10 : 1.5 + drive / 14;
      shaper.curve = makeSaturationCurve(amount, 2048) as any;
      shaper.oversample = "2x";

      const lp = context.createBiquadFilter();
      lp.type = "lowpass";
      const bright = clamp((tone + 1) / 2, 0, 1);
      lp.frequency.value = 4000 + bright * 14000;
      lp.Q.value = 0.7;

      return [shaper, lp];
    }

    case "Reverb": {
      const decay = getNumber(params, "decay", 1.8);
      const preDelay = getNumber(params, "pre_delay", 20);
      const damping = getNumber(params, "damping", 45);

      const convolver = context.createConvolver();
      convolver.buffer = createImpulseResponse(context, clamp(decay, 0.2, 8), clamp(preDelay, 0, 250), clamp(damping, 0, 100));

      const lp = context.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2500 + (1 - clamp(damping / 100, 0, 1)) * 14000;
      lp.Q.value = 0.7;

      return [convolver, lp];
    }

    case "Delay": {
      const timeMs = getNumber(params, "time_ms", 320);
      const feedback = getNumber(params, "feedback", 35);
      const hp = getNumber(params, "hp", 120);
      const lpHz = getNumber(params, "lp", 8000);

      const hpFilter = context.createBiquadFilter();
      hpFilter.type = "highpass";
      hpFilter.frequency.value = clamp(hp, 20, 8000);
      hpFilter.Q.value = 0.7;

      const lpFilter = context.createBiquadFilter();
      lpFilter.type = "lowpass";
      lpFilter.frequency.value = clamp(lpHz, 200, 20000);
      lpFilter.Q.value = 0.7;

      const delay = context.createDelay(2.0);
      delay.delayTime.value = clamp(timeMs, 1, 2000) / 1000;

      const fb = context.createGain();
      fb.gain.value = clamp(feedback / 100, 0, 0.92);

      // feedback loop: delay -> fb -> delay
      delay.connect(fb);
      fb.connect(delay);

      return [hpFilter, delay, lpFilter];
    }

    case "Stereo Imager": {
      // TODO: true M/S width processing. For now, implement mono-check by summing.
      const mono = getBoolean(params, "mono_check", false);
      if (!mono) {
        return [];
      }
      const splitter = context.createChannelSplitter(2);
      const merger = context.createChannelMerger(2);
      const sumGainL = context.createGain();
      const sumGainR = context.createGain();
      sumGainL.gain.value = 0.5;
      sumGainR.gain.value = 0.5;

      // L+R -> mono -> both outputs
      splitter.connect(sumGainL, 0);
      splitter.connect(sumGainL, 1);
      splitter.connect(sumGainR, 0);
      splitter.connect(sumGainR, 1);
      sumGainL.connect(merger, 0, 0);
      sumGainR.connect(merger, 0, 1);

      // The splitter/merger needs a proper series connection: we return splitter then merger,
      // so WaveSurfer will connect prev->splitter and merger->next; but it will also connect
      // splitter->merger in series (which is fine, because the internal wiring uses the splitter outputs).
      return [splitter, merger];
    }

    default:
      return [];
  }
}

export function buildWebAudioFiltersForPlugins(
  context: AudioContext,
  plugins: TrackPlugin[],
): BuiltWebAudioFilters {
  const created: AudioNode[] = [];
  const filters: AudioNode[] = [];

  const sorted = [...(plugins || [])]
    .filter((p) => p && p.enabled)
    .sort((a, b) => a.order - b.order);

  for (const plugin of sorted) {
    const mix = clamp(getNumber(plugin.params, "mix", 1), 0, 1);
    const outputGainDb = getNumber(plugin.params, "output_gain", 0);

    // Build a wet/dry wrapper that remains compatible with WaveSurfer's
    // sequential filter list.
    const input = context.createGain();
    const dry = context.createGain();
    const out = context.createGain();

    dry.gain.value = 1 - mix;
    out.gain.value = dbToGain(outputGainDb);

    // Ensure dry path exists (WaveSurfer also wires input->dry->out in series).
    input.connect(dry);
    dry.connect(out);

    const wetGain = context.createGain();
    wetGain.gain.value = mix;

    const wetNodes = buildEffectNodesForPlugin(context, plugin.pluginType, plugin.params);
    if (wetNodes.length) {
      input.connect(wetNodes[0]);
      for (let i = 0; i < wetNodes.length - 1; i += 1) {
        wetNodes[i].connect(wetNodes[i + 1]);
      }
      wetNodes[wetNodes.length - 1].connect(wetGain);
    } else {
      // No internal processing for this plugin type; wet path = input
      input.connect(wetGain);
    }

    wetGain.connect(out);

    created.push(input, dry, out, wetGain, ...wetNodes);
    filters.push(input, dry, out);
  }

  return {
    filters,
    dispose: () => {
      for (const node of created) {
        try {
          node.disconnect();
        } catch {
          // ignore
        }
      }
    },
  };
}
