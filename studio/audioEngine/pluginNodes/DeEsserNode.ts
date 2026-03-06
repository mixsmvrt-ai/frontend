export class DeEsserNode {
  private readonly filter: BiquadFilterNode;

  constructor(context: AudioContext) {
    this.filter = context.createBiquadFilter();
    this.filter.type = "peaking";
  }

  connect(node: AudioNode): void {
    this.filter.connect(node);
  }

  disconnect(): void {
    this.filter.disconnect();
  }

  getInput(): AudioNode {
    return this.filter;
  }

  update(params: Record<string, unknown>): void {
    const freq = typeof params.freq === "number" ? params.freq : 6500;
    const amount = typeof params.amount === "number" ? params.amount : 35;
    this.filter.frequency.value = freq;
    this.filter.Q.value = 2.5;
    this.filter.gain.value = -Math.max(0, Math.min(12, amount / 10));
  }
}
