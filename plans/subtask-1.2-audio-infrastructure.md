# Sub-task 1.2: Audio Infrastructure - System Audio Capture & Processing

## Objective
Implement comprehensive audio processing capabilities including macOS system audio capture, WAV file loading, Web Audio API integration, and real-time FFT analysis for the music visualizer.

## Technical Requirements
- macOS system audio capture using native APIs
- WAV file loading and decoding
- Web Audio API integration for processing
- Real-time FFT analysis (2048+ samples)
- Beat detection and tempo analysis
- Low-latency audio processing (< 50ms)
- Frequency band extraction for visualization

## Implementation Steps

### Step 1: Install Audio Dependencies
```bash
# Core audio processing libraries
npm install --save @types/web-audio-api
npm install --save buffer
npm install --save stream

# macOS system audio capture
npm install --save node-portaudio
npm install --save-dev @types/node-portaudio

# Audio analysis libraries
npm install --save fft.js
npm install --save ml-matrix
npm install --save wav-decoder

# File system operations
npm install --save fs-extra
npm install --save-dev @types/fs-extra
```

### Step 2: Shared Audio Types
Create `src/shared/types/audio.ts`:
```typescript
export interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
  channels: number;
  inputDeviceId?: string;
}

export interface FrequencyData {
  frequencies: Float32Array;
  amplitudes: Float32Array;
  timestamp: number;
}

export interface AudioFeatures {
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  overallLevel: number;
  beatDetected: boolean;
  tempo: number;
  dominantFrequency: number;
}

export interface AudioSource {
  type: 'system' | 'file';
  name: string;
  isActive: boolean;
  config: AudioConfig;
}

export interface WaveformData {
  left: Float32Array;
  right: Float32Array;
  length: number;
  sampleRate: number;
}

export enum AudioEvent {
  DATA_AVAILABLE = 'audio:data-available',
  FEATURES_EXTRACTED = 'audio:features-extracted',
  SOURCE_CHANGED = 'audio:source-changed',
  ERROR = 'audio:error',
}
```

### Step 3: Audio Manager Core
Create `src/main/audio/audio-manager.ts`:
```typescript
import { EventEmitter } from 'events';
import { AudioConfig, AudioSource, AudioEvent } from '@shared/types';
import { SystemAudioCapture } from './system-audio-capture';
import { FileAudioProcessor } from './file-audio-processor';
import { AudioAnalyzer } from './audio-analyzer';

export class AudioManager extends EventEmitter {
  private config: AudioConfig;
  private currentSource: AudioSource | null = null;
  private systemCapture: SystemAudioCapture;
  private fileProcessor: FileAudioProcessor;
  private analyzer: AudioAnalyzer;
  private isProcessing = false;

  constructor(config: AudioConfig) {
    super();
    this.config = config;
    this.systemCapture = new SystemAudioCapture(config);
    this.fileProcessor = new FileAudioProcessor(config);
    this.analyzer = new AudioAnalyzer(config);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.systemCapture.on('data', (audioBuffer: Float32Array) => {
      this.processAudioData(audioBuffer);
    });

    this.fileProcessor.on('data', (audioBuffer: Float32Array) => {
      this.processAudioData(audioBuffer);
    });

    this.analyzer.on('features', (features) => {
      this.emit(AudioEvent.FEATURES_EXTRACTED, features);
    });
  }

  public async startSystemCapture(): Promise<void> {
    try {
      await this.systemCapture.start();
      this.currentSource = {
        type: 'system',
        name: 'System Audio',
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
    this.systemCapture.stop();
    this.fileProcessor.stop();
    this.isProcessing = false;
    if (this.currentSource) {
      this.currentSource.isActive = false;
    }
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
}
```

### Step 4: System Audio Capture (macOS)
Create `src/main/audio/system-audio-capture.ts`:
```typescript
import { EventEmitter } from 'events';
import * as portAudio from 'node-portaudio';
import { AudioConfig } from '@shared/types';

export class SystemAudioCapture extends EventEmitter {
  private config: AudioConfig;
  private audioInput: any = null;
  private isCapturing = false;

  constructor(config: AudioConfig) {
    super();
    this.config = config;
  }

  public async start(): Promise<void> {
    if (this.isCapturing) {
      throw new Error('Audio capture already in progress');
    }

    try {
      // Initialize PortAudio
      portAudio.init();

      // Get available devices
      const devices = portAudio.getDevices();
      console.log('Available audio devices:', devices);

      // Find the default input device or loopback device
      const defaultDevice = portAudio.getDefaultInputDevice();
      
      // Configure audio input
      this.audioInput = new portAudio.AudioIO({
        inOptions: {
          channelCount: this.config.channels,
          sampleFormat: portAudio.SampleFormat24Bit,
          sampleRate: this.config.sampleRate,
          deviceId: this.config.inputDeviceId || defaultDevice,
          closeOnError: true,
        },
      });

      // Set up data handler
      this.audioInput.on('data', (inputBuffer: Buffer) => {
        const audioData = this.convertBufferToFloat32Array(inputBuffer);
        this.emit('data', audioData);
      });

      // Start capturing
      this.audioInput.start();
      this.isCapturing = true;

      console.log('System audio capture started');
    } catch (error) {
      console.error('Failed to start system audio capture:', error);
      throw error;
    }
  }

  public stop(): void {
    if (this.audioInput && this.isCapturing) {
      this.audioInput.quit();
      this.audioInput = null;
      this.isCapturing = false;
      portAudio.terminate();
      console.log('System audio capture stopped');
    }
  }

  private convertBufferToFloat32Array(buffer: Buffer): Float32Array {
    // Convert 24-bit buffer to Float32Array
    const samples = buffer.length / 3; // 24-bit = 3 bytes per sample
    const result = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const offset = i * 3;
      // Read 24-bit sample (little-endian)
      const sample = (buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16));
      // Convert to signed 24-bit and normalize to [-1, 1]
      const signed = sample > 0x7FFFFF ? sample - 0x1000000 : sample;
      result[i] = signed / 0x7FFFFF;
    }

    return result;
  }

  public isActive(): boolean {
    return this.isCapturing;
  }
}
```

### Step 5: File Audio Processor
Create `src/main/audio/file-audio-processor.ts`:
```typescript
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
      throw error;
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
}
```

### Step 6: Audio Analyzer with FFT
Create `src/main/audio/audio-analyzer.ts`:
```typescript
import { EventEmitter } from 'events';
import { FFT } from 'fft.js';
import { AudioConfig, FrequencyData, AudioFeatures } from '@shared/types';

export class AudioAnalyzer extends EventEmitter {
  private config: AudioConfig;
  private fft: FFT;
  private fftSize: number;
  private frequencyBins: Float32Array;
  private amplitudes: Float32Array;
  private beatDetector: BeatDetector;

  constructor(config: AudioConfig) {
    super();
    this.config = config;
    this.fftSize = 2048; // Power of 2 for FFT
    this.fft = new FFT(this.fftSize);
    this.frequencyBins = new Float32Array(this.fftSize / 2);
    this.amplitudes = new Float32Array(this.fftSize / 2);
    this.beatDetector = new BeatDetector(config.sampleRate);
  }

  public analyze(audioBuffer: Float32Array): void {
    // Ensure we have enough samples for FFT
    if (audioBuffer.length < this.fftSize) {
      return;
    }

    // Take the most recent samples
    const samples = audioBuffer.slice(-this.fftSize);
    
    // Apply windowing function (Hann window)
    const windowed = this.applyHannWindow(samples);

    // Perform FFT
    const complexBuffer = this.fft.createComplexArray();
    this.fft.realTransform(complexBuffer, windowed);

    // Convert to frequency domain
    this.calculateFrequencyData(complexBuffer);

    // Extract audio features
    const features = this.extractFeatures();

    // Emit results
    const frequencyData: FrequencyData = {
      frequencies: new Float32Array(this.frequencyBins),
      amplitudes: new Float32Array(this.amplitudes),
      timestamp: Date.now(),
    };

    this.emit('frequency-data', frequencyData);
    this.emit('features', features);
  }

  private applyHannWindow(samples: Float32Array): Float32Array {
    const windowed = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (samples.length - 1)));
      windowed[i] = samples[i] * windowValue;
    }
    return windowed;
  }

  private calculateFrequencyData(complexBuffer: Float32Array): void {
    const nyquist = this.config.sampleRate / 2;
    const binSize = nyquist / (this.fftSize / 2);

    for (let i = 0; i < this.fftSize / 2; i++) {
      const real = complexBuffer[i * 2];
      const imag = complexBuffer[i * 2 + 1];
      const magnitude = Math.sqrt(real * real + imag * imag);
      
      this.frequencyBins[i] = i * binSize;
      this.amplitudes[i] = magnitude;
    }
  }

  private extractFeatures(): AudioFeatures {
    const nyquist = this.config.sampleRate / 2;
    const binCount = this.amplitudes.length;

    // Define frequency ranges
    const bassRange = Math.floor((250 / nyquist) * binCount);
    const midRange = Math.floor((4000 / nyquist) * binCount);
    const trebleRange = binCount;

    // Calculate average levels for each range
    const bassLevel = this.calculateAverageLevel(0, bassRange);
    const midLevel = this.calculateAverageLevel(bassRange, midRange);
    const trebleLevel = this.calculateAverageLevel(midRange, trebleRange);
    const overallLevel = this.calculateAverageLevel(0, binCount);

    // Find dominant frequency
    let maxAmplitude = 0;
    let dominantFrequency = 0;
    for (let i = 1; i < binCount; i++) { // Skip DC component
      if (this.amplitudes[i] > maxAmplitude) {
        maxAmplitude = this.amplitudes[i];
        dominantFrequency = this.frequencyBins[i];
      }
    }

    // Beat detection
    const beatDetected = this.beatDetector.detectBeat(bassLevel);
    const tempo = this.beatDetector.getCurrentTempo();

    return {
      bassLevel,
      midLevel,
      trebleLevel,
      overallLevel,
      beatDetected,
      tempo,
      dominantFrequency,
    };
  }

  private calculateAverageLevel(startBin: number, endBin: number): number {
    let sum = 0;
    const count = endBin - startBin;
    for (let i = startBin; i < endBin; i++) {
      sum += this.amplitudes[i];
    }
    return count > 0 ? sum / count : 0;
  }
}

class BeatDetector {
  private sampleRate: number;
  private energyHistory: number[] = [];
  private beatTimes: number[] = [];
  private lastBeatTime = 0;
  private energyThreshold = 0.1;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public detectBeat(bassLevel: number): boolean {
    const currentTime = Date.now();
    
    // Add to energy history
    this.energyHistory.push(bassLevel);
    if (this.energyHistory.length > 50) {
      this.energyHistory.shift();
    }

    // Calculate average energy
    const avgEnergy = this.energyHistory.reduce((sum, val) => sum + val, 0) / this.energyHistory.length;
    
    // Beat detection logic
    const isBeat = bassLevel > avgEnergy * 1.3 && 
                   bassLevel > this.energyThreshold &&
                   (currentTime - this.lastBeatTime) > 300; // Minimum 300ms between beats

    if (isBeat) {
      this.beatTimes.push(currentTime);
      this.lastBeatTime = currentTime;
      
      // Keep only recent beats for tempo calculation
      if (this.beatTimes.length > 10) {
        this.beatTimes.shift();
      }
    }

    return isBeat;
  }

  public getCurrentTempo(): number {
    if (this.beatTimes.length < 2) return 0;

    // Calculate average time between beats
    const intervals = [];
    for (let i = 1; i < this.beatTimes.length; i++) {
      intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    return avgInterval > 0 ? 60000 / avgInterval : 0; // Convert to BPM
  }
}
```

### Step 7: IPC Bridge for Renderer Communication
Create `src/main/audio/audio-ipc.ts`:
```typescript
import { ipcMain, IpcMainEvent } from 'electron';
import { AudioManager } from './audio-manager';
import { AudioConfig, AudioEvent } from '@shared/types';

export class AudioIPC {
  private audioManager: AudioManager;

  constructor() {
    const defaultConfig: AudioConfig = {
      sampleRate: 44100,
      bufferSize: 1024,
      channels: 2,
    };

    this.audioManager = new AudioManager(defaultConfig);
    this.setupIpcHandlers();
    this.setupAudioEventForwarding();
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('audio:start-system-capture', async () => {
      try {
        await this.audioManager.startSystemCapture();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('audio:load-file', async (event: IpcMainEvent, filePath: string) => {
      try {
        await this.audioManager.loadAudioFile(filePath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('audio:stop', () => {
      this.audioManager.stop();
      return { success: true };
    });

    ipcMain.handle('audio:get-current-source', () => {
      return this.audioManager.getCurrentSource();
    });

    ipcMain.handle('audio:get-config', () => {
      return this.audioManager.getConfig();
    });
  }

  private setupAudioEventForwarding(): void {
    this.audioManager.on(AudioEvent.DATA_AVAILABLE, (data) => {
      // Forward to all renderer processes
      this.broadcastToRenderers('audio:data-available', data);
    });

    this.audioManager.on(AudioEvent.FEATURES_EXTRACTED, (features) => {
      this.broadcastToRenderers('audio:features-extracted', features);
    });

    this.audioManager.on(AudioEvent.SOURCE_CHANGED, (source) => {
      this.broadcastToRenderers('audio:source-changed', source);
    });

    this.audioManager.on(AudioEvent.ERROR, (error) => {
      this.broadcastToRenderers('audio:error', { message: error.message });
    });
  }

  private broadcastToRenderers(channel: string, data: any): void {
    // This would be implemented with the WindowManager reference
    // For now, we'll use the global webContents
    const { webContents } = require('electron');
    webContents.getAllWebContents().forEach((contents) => {
      if (!contents.isDestroyed()) {
        contents.send(channel, data);
      }
    });
  }
}
```

## Acceptance Criteria
- [ ] **System Audio Capture**: Successfully captures macOS system audio
- [ ] **File Processing**: Loads and processes WAV files correctly
- [ ] **FFT Analysis**: Performs real-time frequency analysis
- [ ] **Feature Extraction**: Extracts bass, mid, treble levels and beat detection
- [ ] **Low Latency**: Audio processing latency under 50ms
- [ ] **IPC Communication**: Renderer can control audio processing
- [ ] **Error Handling**: Graceful handling of audio errors
- [ ] **Memory Management**: No memory leaks during long sessions

## Testing Commands
```bash
# Test system audio capture
npm run dev
# Use developer tools to call: await window.electron.audio.startSystemCapture()

# Test file loading
# Use developer tools to call: await window.electron.audio.loadFile('/path/to/test.wav')

# Monitor audio events in console
# Check for regular audio:features-extracted events
```

## Status Tracking
- [ ] **TODO**: Implement all steps above
- [ ] **IN PROGRESS**: Currently implementing
- [ ] **COMPLETED**: All acceptance criteria met
- [ ] **TESTED**: Verified with system audio and file sources

## Dependencies for Next Sub-task
This sub-task provides the audio processing foundation required for Sub-task 2.1 (Graphics Foundation), which will consume the audio features and frequency data for visualization.

## Notes
- Test with various audio sources and file formats
- Monitor CPU usage during audio processing
- Ensure proper cleanup of audio resources
- Consider fallback options for different macOS versions
- Document any platform-specific limitations 