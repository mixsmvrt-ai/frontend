export function encodeWavFromAudioBuffer(
  audioBuffer: AudioBuffer,
  opts?: { float32?: boolean },
): Blob {
  const float32 = opts?.float32 ?? false;
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;

  const bytesPerSample = float32 ? 4 : 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, float32 ? 3 : 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c += 1) {
    channels.push(audioBuffer.getChannelData(c));
  }

  for (let i = 0; i < numFrames; i += 1) {
    for (let c = 0; c < numChannels; c += 1) {
      let sample = channels[c][i] ?? 0;
      if (!Number.isFinite(sample)) sample = 0;
      // clamp
      sample = Math.max(-1, Math.min(1, sample));

      if (float32) {
        view.setFloat32(offset, sample, true);
        offset += 4;
      } else {
        const s = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, Math.round(s), true);
        offset += 2;
      }
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}
