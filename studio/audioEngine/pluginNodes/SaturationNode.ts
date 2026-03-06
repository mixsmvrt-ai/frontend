export class SaturationNode {
  private readonly shaper: WaveShaperNode;

  constructor(context: AudioContext) {
    this.shaper = context.createWaveShaper();
    this.shaper.oversample = "2x";
    this.shaper.curve = SaturationNode.buildCurve(0.2);
  }

  connect(node: AudioNode): void {
    this.shaper.connect(node);
  }

  disconnect(): void {
    this.shaper.disconnect();
  }

  getInput(): AudioNode {
    return this.shaper;
  }

  update(params: Record<string, unknown>): void {
    const drivePct = typeof params.drive === "number" ? params.drive : 20;
    const amount = Math.max(0.05, Math.min(1.0, drivePct / 100));
    this.shaper.curve = SaturationNode.buildCurve(amount);
  }

  private static buildCurve(amount: number): Float32Array {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const k = 2 + amount * 20;

    for (let i = 0; i < samples; i += 1) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * Math.PI) / (Math.PI + k * Math.abs(x));
    }

    return curve;
  }
}
