import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as wavDecoder from 'wav-decoder';
import { AudioConfig, WaveformData } from '@shared/types';

export class FileAudioProcessor extends EventEmitter {
  private config: AudioConfig;
  private audioData: WaveformData | null = null;
  private playbackPosition = 0;
  private playbackTimer: NodeJS.Timeout | null = null;
  private isPlaying = false;

  constructor(config: AudioConfig) {
    super();
    this.config = config;
  }

  public async loadFile(filePath: string): Promise<void> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const audioBuffer = await wavDecoder.decode(fileBuffer);

      this.audioData = {
        left: new Float32Array(audioBuffer.channelData[0]),
        right: audioBuffer.channelData.length > 1 
          ? new Float32Array(audioBuffer.channelData[1])
          : new Float32Array(audioBuffer.channelData[0]),
        length: audioBuffer.length,
        sampleRate: audioBuffer.sampleRate,
      };

      console.log(`Loaded audio file: ${filePath}`);
      console.log(`Duration: ${this.audioData.length / this.audioData.sampleRate}s`);
      console.log(`Sample Rate: ${this.audioData.sampleRate}Hz`);

      this.playbackPosition = 0;
      this.startPlayback();
    } catch (error) {
      console.error('Failed to load audio file:', error);
      this.emit('error', error);
    }
  }

  private startPlayback(): void {
    if (!this.audioData || this.isPlaying) return;

    this.isPlaying = true;
    const bufferDuration = this.config.bufferSize / this.config.sampleRate * 1000; // ms

    this.playbackTimer = setInterval(() => {
      if (!this.audioData) return;

      const bufferSize = this.config.bufferSize;
      const endPosition = Math.min(
        this.playbackPosition + bufferSize,
        this.audioData.length
      );

      if (this.playbackPosition >= this.audioData.length) {
        // Loop back to start
        this.playbackPosition = 0;
        return;
      }

      // Extract audio chunk
      const leftChunk = this.audioData.left.slice(this.playbackPosition, endPosition);
      const rightChunk = this.audioData.right.slice(this.playbackPosition, endPosition);

      // Mix to mono for analysis (or keep stereo based on config)
      const monoChunk = new Float32Array(leftChunk.length);
      for (let i = 0; i < leftChunk.length; i++) {
        monoChunk[i] = (leftChunk[i] + rightChunk[i]) / 2;
      }

      this.emit('data', monoChunk);
      this.playbackPosition = endPosition;
    }, bufferDuration);
  }

  public stop(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.isPlaying = false;
    this.playbackPosition = 0;
  }

  public pause(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.isPlaying = false;
  }

  public resume(): void {
    if (!this.isPlaying && this.audioData) {
      this.startPlayback();
    }
  }

  public seek(position: number): void {
    if (this.audioData) {
      this.playbackPosition = Math.max(0, Math.min(position, this.audioData.length));
    }
  }

  public getDuration(): number {
    return this.audioData ? this.audioData.length / this.audioData.sampleRate : 0;
  }

  public getCurrentTime(): number {
    return this.audioData ? this.playbackPosition / this.audioData.sampleRate : 0;
  }

  public updateConfig(config: AudioConfig): void {
    this.config = config;
  }
} 