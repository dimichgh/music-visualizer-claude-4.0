import { EventEmitter } from 'events';
import { AudioConfig, AudioSource, AudioEvent, AudioAnalysisResult } from '@shared/types';
import { FileAudioProcessor } from './file-audio-processor';
import { AudioAnalyzer } from './audio-analyzer';
import { MicrophoneCapture } from './microphone-capture';

export class AudioManager extends EventEmitter {
  private config: AudioConfig;
  private currentSource: AudioSource | null = null;
  private fileProcessor: FileAudioProcessor;
  private analyzer: AudioAnalyzer;
  private microphoneCapture: MicrophoneCapture;
  private isProcessing = false;

  constructor(config: AudioConfig) {
    super();
    this.config = config;
    this.fileProcessor = new FileAudioProcessor(config);
    this.analyzer = new AudioAnalyzer(config);
    this.microphoneCapture = new MicrophoneCapture(config);
    
    // Enable extended audio analysis for advanced features
    this.analyzer.enableExtendedAnalysis(true);
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // File processor events
    this.fileProcessor.on('data', (audioBuffer: Float32Array) => {
      this.processAudioData(audioBuffer);
    });

    this.fileProcessor.on('error', (error: Error) => {
      this.emit(AudioEvent.ERROR, error);
    });

    // Microphone capture events
    this.microphoneCapture.on('data', (audioBuffer: Float32Array) => {
      this.processAudioData(audioBuffer);
    });

    this.microphoneCapture.on('error', (error: Error) => {
      this.emit(AudioEvent.ERROR, error);
    });

    // Analyzer events
    this.analyzer.on('analysis', (analysisResult: AudioAnalysisResult) => {
      this.handleAnalysisResult(analysisResult);
    });
  }

  private handleAnalysisResult(analysisResult: AudioAnalysisResult): void {
    // Emit basic features
    this.emit(AudioEvent.FEATURES_EXTRACTED, analysisResult);
    
    // Emit extended features if available
    if (analysisResult.extendedFeatures) {
      this.emit(AudioEvent.EXTENDED_FEATURES_EXTRACTED, analysisResult.extendedFeatures);
    }
  }

  public async startMicrophoneCapture(): Promise<void> {
    try {
      await this.microphoneCapture.start();
      this.currentSource = {
        type: 'microphone',
        name: 'Microphone Input',
        isActive: true,
        config: this.config,
      };
      this.isProcessing = true;
      this.emit(AudioEvent.SOURCE_CHANGED, this.currentSource);
    } catch (error) {
      this.emit(AudioEvent.ERROR, error);
    }
  }

  public async loadAudioFile(filePath: string): Promise<void> {
    try {
      await this.fileProcessor.loadFile(filePath);
      this.currentSource = {
        type: 'file',
        name: filePath.split('/').pop() || 'Unknown File',
        isActive: true,
        config: this.config,
      };
      this.isProcessing = true;
      this.emit(AudioEvent.SOURCE_CHANGED, this.currentSource);
    } catch (error) {
      this.emit(AudioEvent.ERROR, error);
    }
  }

  public stop(): void {
    this.fileProcessor.stop();
    this.microphoneCapture.stop();
    this.isProcessing = false;
    if (this.currentSource) {
      this.currentSource.isActive = false;
    }
  }

  public pause(): void {
    if (this.currentSource?.type === 'file') {
      this.fileProcessor.pause();
    }
  }

  public resume(): void {
    if (this.currentSource?.type === 'file') {
      this.fileProcessor.resume();
    }
  }

  public seek(position: number): void {
    if (this.currentSource?.type === 'file') {
      this.fileProcessor.seek(position);
    }
  }

  public getDuration(): number {
    if (this.currentSource?.type === 'file') {
      return this.fileProcessor.getDuration();
    }
    return 0;
  }

  public getCurrentTime(): number {
    if (this.currentSource?.type === 'file') {
      return this.fileProcessor.getCurrentTime();
    }
    return 0;
  }

  private processAudioData(audioBuffer: Float32Array): void {
    if (!this.isProcessing) return;

    // Emit raw audio data
    this.emit(AudioEvent.DATA_AVAILABLE, {
      buffer: audioBuffer,
      timestamp: Date.now(),
    });

    // Process for features extraction
    this.analyzer.analyze(audioBuffer);
  }

  public getCurrentSource(): AudioSource | null {
    return this.currentSource;
  }

  public getConfig(): AudioConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Update processors with new config
    this.fileProcessor.updateConfig(this.config);
    this.analyzer.updateConfig(this.config);
    this.microphoneCapture.updateConfig(this.config);
  }
} 