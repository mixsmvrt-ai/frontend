export class CompressorNode {
  private readonly node: DynamicsCompressorNode;

  constructor(context: AudioContext) {
    this.node = context.createDynamicsCompressor();
  }

  connect(node: AudioNode): void {
    this.node.connect(node);
  }

  disconnect(): void {
    this.node.disconnect();
  }

  getInput(): AudioNode {
    return this.node;
  }

  update(params: Record<string, unknown>): void {
    this.node.threshold.value = typeof params.threshold === "number" ? params.threshold : -18;
    this.node.ratio.value = typeof params.ratio === "number" ? params.ratio : 3;
    this.node.attack.value =
      typeof params.attack === "number" ? Math.max(0.001, params.attack / 1000) : 0.01;
    this.node.release.value =
      typeof params.release === "number" ? Math.max(0.01, params.release / 1000) : 0.12;
  }
}
