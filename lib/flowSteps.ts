// Centralized flow-specific step definitions for the Studio processing overlay.
// These steps are purely descriptive and are intended to mirror the
// conceptual stages of the backend DSP pipeline.

export type FlowKey = "audio_cleanup" | "mixing_only" | "mix_master" | "mastering_only";

export interface PresetLabelContext {
  presetName: string;
  toneDescription?: string | null;
  subtitle?: string | null;
}

export interface FlowStep {
  /** Stable key used to map backend steps to UI steps. */
  key: string;
  /** Base human-readable label for the step. */
  baseLabel: string;
  /**
   * When true, the label will be enriched with preset metadata
   * (e.g. "— Dancehall (Bright & Aggressive)").
   */
  presetScoped?: boolean;
  /** Optional short helper message to show under the progress bar. */
  helperText?: string;
}

export interface LabeledFlowStep extends FlowStep {
  /** Final label for display, after preset metadata has been applied. */
  label: string;
}

export const FLOW_STEPS: Record<FlowKey, FlowStep[]> = {
  // A. AUDIO CLEANUP FLOW
  audio_cleanup: [
    {
      key: "upload-validation",
      baseLabel: "Upload & validation",
      helperText: "Checking file format, length and integrity…",
    },
    {
      key: "noise-floor-analysis",
      baseLabel: "Noise floor analysis",
      helperText: "Measuring room tone and background noise profile…",
    },
    {
      key: "noise-reduction",
      baseLabel: "Noise reduction",
      helperText: "Reducing constant hiss and hum without harming clarity…",
    },
    {
      key: "click-pop-removal",
      baseLabel: "Click / pop removal",
      helperText: "Hunting for transient clicks and pops…",
    },
    {
      key: "harshness-resonance-cleanup",
      baseLabel: "Harshness & resonance cleanup",
      helperText: "Taming harsh frequencies and boxy resonances…",
    },
    {
      key: "level-normalization",
      baseLabel: "Level normalization",
      helperText: "Bringing overall loudness into a healthy range…",
    },
    {
      key: "quality-control",
      baseLabel: "Quality control",
      helperText: "Running final checks for artifacts or missed issues…",
    },
    {
      key: "final-render",
      baseLabel: "Final render",
      helperText: "Printing the cleaned audio at full quality…",
    },
  ],

  // B. MIXING ONLY FLOW
  mixing_only: [
    {
      key: "track-analysis-classification",
      baseLabel: "Track analysis & classification",
      helperText: "Detecting vocals, beats and supporting elements…",
    },
    {
      key: "vocal-preset-selection",
      baseLabel: "Selecting vocal tone preset",
      presetScoped: true,
      helperText: "Choosing a vocal tone that matches your vibe & genre…",
    },
    {
      key: "gain-staging",
      baseLabel: "Gain staging",
      helperText: "Balancing headroom across all tracks…",
    },
    {
      key: "vocal-cleanup",
      baseLabel: "Vocal cleanup",
      helperText: "Removing rumble, mud and harshness from vocals…",
    },
    {
      key: "vocal-eq-compression",
      baseLabel: "Preset-driven vocal EQ & compression",
      presetScoped: true,
      helperText: "Shaping tone and dynamics using your selected vocal preset…",
    },
    {
      key: "beat-eq-vocal-pocket",
      baseLabel: "Beat EQ & vocal pocketing",
      helperText: "Creating space in the beat for the vocal…",
    },
    {
      key: "vocal-bus-glue",
      baseLabel: "Adapting vocal dynamics & FX",
      presetScoped: true,
      helperText: "Dialing compression, saturation, reverb and delay for the vocal bus…",
    },
    {
      key: "stereo-image-balance",
      baseLabel: "Stereo image balance",
      helperText: "Balancing width and center focus for translation…",
    },
    {
      key: "mix-quality-check",
      baseLabel: "Mix quality check",
      helperText: "Checking headroom, phase and overall clarity…",
    },
    {
      key: "final-mix-render",
      baseLabel: "Final mix render",
      helperText: "Rendering the mixed stereo file…",
    },
  ],

  // C. MIXING + MASTERING FLOW
  mix_master: [
    {
      key: "track-analysis-classification",
      baseLabel: "Track analysis & classification",
      helperText: "Profiling vocals, beats and buses for this session…",
    },
    {
      key: "vocal-preset-selection",
      baseLabel: "Selecting vocal tone preset",
      presetScoped: true,
      helperText: "Locking in a vocal tone preset tuned to this genre…",
    },
    {
      key: "gain-staging",
      baseLabel: "Gain staging",
      helperText: "Setting safe levels into the mix bus…",
    },
    {
      key: "vocal-cleanup",
      baseLabel: "Vocal cleanup",
      helperText: "Cleaning noise, mud and sibilance before heavy processing…",
    },
    {
      key: "vocal-eq-compression",
      baseLabel: "Preset-driven vocal EQ & compression",
      presetScoped: true,
      helperText: "Tuning vocal tone and punch using the selected preset…",
    },
    {
      key: "beat-eq-vocal-pocket",
      baseLabel: "Beat EQ & vocal pocketing",
      helperText: "Carving pockets so lead vocals stay clear…",
    },
    {
      key: "vocal-bus-glue",
      baseLabel: "Adapting vocal dynamics & FX",
      presetScoped: true,
      helperText: "Adapting compression, saturation and FX sends to the vocal preset…",
    },
    {
      key: "mix-balance-verification",
      baseLabel: "Mix balance verification",
      helperText: "Checking mix balance before mastering…",
    },
    {
      key: "pre-master-loudness-prep",
      baseLabel: "Pre-master loudness prep",
      helperText: "Normalizing mix level into the mastering chain…",
    },
    {
      key: "master-eq-dynamics",
      baseLabel: "Master EQ & dynamics",
      helperText: "Shaping tonal balance and macro dynamics…",
    },
    {
      key: "limiting-loudness-targeting",
      baseLabel: "Limiting & loudness targeting",
      helperText: "Hitting safe streaming / club loudness targets…",
    },
    {
      key: "master-quality-control",
      baseLabel: "Master quality control",
      helperText: "Verifying peaks, phase and translation…",
    },
    {
      key: "final-master-render",
      baseLabel: "Final master render",
      helperText: "Rendering the final master at full quality…",
    },
  ],

  // D. MASTERING ONLY FLOW
  mastering_only: [
    {
      key: "loudness-spectral-analysis",
      baseLabel: "Loudness & spectral analysis",
      helperText: "Measuring LUFS, true peak and tonal balance…",
    },
    {
      key: "tonal-balance-correction",
      baseLabel: "Tonal balance correction",
      helperText: "Adjusting low, mid and high balance for reference curves…",
    },
    {
      key: "multiband-dynamics",
      baseLabel: "Multiband dynamics",
      helperText: "Controlling dynamics across low, mid and high bands…",
    },
    {
      key: "stereo-enhancement",
      baseLabel: "Stereo enhancement",
      helperText: "Refining width and mono compatibility…",
    },
    {
      key: "harmonic-enhancement",
      baseLabel: "Harmonic enhancement",
      helperText: "Adding subtle saturation for density and excitement…",
    },
    {
      key: "limiting-loudness-targeting",
      baseLabel: "Limiting & loudness targeting",
      helperText: "Reaching target loudness without harsh clipping…",
    },
    {
      key: "quality-control",
      baseLabel: "Quality control",
      helperText: "Final checks before releasing the master…",
    },
    {
      key: "final-master-render",
      baseLabel: "Final master render",
      helperText: "Rendering the mastered file for delivery…",
    },
  ],
};

/**
 * Produce a human-readable label for a step, optionally enriched
 * with preset metadata (name, tone description, subtitle).
 */
export function formatStepLabel(step: FlowStep, preset?: PresetLabelContext | null): string {
  if (!preset || !step.presetScoped) {
    return step.baseLabel;
  }

  const tone = preset.toneDescription?.trim() || preset.subtitle?.trim();
  if (tone && tone.length > 0) {
    return `${step.baseLabel} — ${preset.presetName} (${tone})`;
  }

  return `${step.baseLabel} — ${preset.presetName}`;
}

/**
 * Return the labeled steps for a flow, ready for display in the
 * processing overlay.
 */
export function getFlowSteps(
  flow: FlowKey,
  preset?: PresetLabelContext | null,
): LabeledFlowStep[] {
  const base = FLOW_STEPS[flow] ?? [];
  return base.map((step) => ({
    ...step,
    label: formatStepLabel(step, preset),
  }));
}
