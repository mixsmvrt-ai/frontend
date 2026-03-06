export class EQNode {
  private readonly input: GainNode;
  private readonly lowShelf: BiquadFilterNode;
  private readonly midPeak: BiquadFilterNode;
  private readonly highShelf: BiquadFilterNode;
  private readonly output: GainNode;

  constructor(context: AudioContext) {
    this.input = context.createGain();

    this.lowShelf = context.createBiquadFilter();
    this.lowShelf.type = "lowshelf";

    this.midPeak = context.createBiquadFilter();
    this.midPeak.type = "peaking";

    this.highShelf = context.createBiquadFilter();
    this.highShelf.type = "highshelf";

    this.output = context.createGain();

    this.input.connect(this.lowShelf);
    this.lowShelf.connect(this.midPeak);
    this.midPeak.connect(this.highShelf);
    this.highShelf.connect(this.output);
  }

  connect(node: AudioNode): void {
    this.output.connect(node);
  }

  disconnect(): void {
    this.output.disconnect();
  }

  getInput(): AudioNode {
    return this.input;
  }

  update(params: Record<string, unknown>): void {
    this.lowShelf.frequency.value = typeof params.low_freq === "number" ? params.low_freq : 120;
    this.lowShelf.gain.value = typeof params.low_gain === "number" ? params.low_gain : 0;

    this.midPeak.frequency.value = typeof params.mid_freq === "number" ? params.mid_freq : 1000;
    this.midPeak.gain.value = typeof params.mid_gain === "number" ? params.mid_gain : 0;
    this.midPeak.Q.value = typeof params.mid_q === "number" ? params.mid_q : 1;

    this.highShelf.frequency.value = typeof params.high_freq === "number" ? params.high_freq : 10000;
    this.highShelf.gain.value = typeof params.high_gain === "number" ? params.high_gain : 0;
  }
}
