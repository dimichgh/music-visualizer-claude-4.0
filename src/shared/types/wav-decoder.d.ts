declare module 'wav-decoder' {
  export interface AudioData {
    sampleRate: number;
    channelData: Float32Array[];
    length: number;
  }

  export function decode(buffer: Buffer): Promise<AudioData>;
} 