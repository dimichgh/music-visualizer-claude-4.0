import { EventEmitter } from 'events';
import { AudioConfig } from '@shared/types';

export class MicrophoneCapture extends EventEmitter {
  private config: AudioConfig;
  private isCapturing = false;

  constructor(config: AudioConfig) {
    super();
    this.config = config;
  }

  public async start(): Promise<void> {
    try {
      // For now, this is a placeholder - actual microphone capture
      // will be implemented via IPC communication with renderer process
      // since Web Audio API is not available in main process
      
      this.isCapturing = true;
      console.log('Microphone capture placeholder started');
      
      // Emit a message that microphone capture needs to be handled by renderer
      this.emit('error', new Error('Microphone capture requires renderer process implementation'));
    } catch (error) {
      this.emit('error', error);
    }
  }

  public stop(): void {
    this.isCapturing = false;
    console.log('Microphone capture stopped');
  }

  public updateConfig(config: AudioConfig): void {
    this.config = config;
  }

  public isActive(): boolean {
    return this.isCapturing;
  }
} 