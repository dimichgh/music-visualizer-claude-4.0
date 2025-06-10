import { EventEmitter } from 'events';
import FFT = require('fft.js');
import { AudioConfig, FrequencyData, AudioFeatures, ExtendedAudioFeatures, AudioAnalysisResult } from '@shared/types';

export class AudioAnalyzer extends EventEmitter {
  private config: AudioConfig;
  private fft: FFT;
  private fftSize: number;
  private frequencyBins: Float32Array;
  private amplitudes: Float32Array;
  private beatDetector: BeatDetector;
  private enhancedAnalysis: boolean = false;

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

    // Convert to frequency domain - complexBuffer is a regular array
    this.calculateFrequencyData(complexBuffer as number[]);
    
    // Extract audio features
    const features = this.extractFeatures();

    // Extract extended features if enabled
    let extendedFeatures: ExtendedAudioFeatures | undefined;
    if (this.enhancedAnalysis) {
      extendedFeatures = this.extractExtendedFeatures(audioBuffer, features);
    }

    // Create analysis result
    const analysisResult: AudioAnalysisResult = {
      frequencyData: {
        frequencies: new Float32Array(this.frequencyBins),
        amplitudes: new Float32Array(this.amplitudes),
        sampleRate: this.config.sampleRate,
        nyquistFrequency: this.config.sampleRate / 2,
      },
      features,
      extendedFeatures,
      timestamp: Date.now(),
    };

    this.emit('analysis', analysisResult);
  }

  private applyHannWindow(samples: Float32Array): Float32Array {
    const windowed = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (samples.length - 1)));
      windowed[i] = samples[i] * windowValue;
    }
    return windowed;
  }

  private calculateFrequencyData(complexBuffer: number[]): void {
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

  private extractExtendedFeatures(audioBuffer: Float32Array, basicFeatures: AudioFeatures): ExtendedAudioFeatures {
    // Extended analysis - simplified implementation for now
    const extendedFeatures: ExtendedAudioFeatures = {
      ...basicFeatures,
      
      // Basic instrument detection (simplified)
      instrumentDetection: {
        drums: this.detectDrums(basicFeatures),
        guitar: this.detectGuitar(basicFeatures),
        bass: this.detectBass(basicFeatures),
        vocals: this.detectVocals(basicFeatures),
        piano: this.detectPiano(basicFeatures),
        strings: this.detectStrings(basicFeatures),
      },
      
      // Spectral features
      spectralCentroid: this.computeSpectralCentroid(),
      spectralRolloff: this.computeSpectralRolloff(),
      spectralFlux: this.computeSpectralFlux(),
      zeroCrossingRate: this.computeZeroCrossingRate(audioBuffer),
      
      // Dynamic features
      rms: this.computeRMS(audioBuffer),
      peak: this.computePeak(audioBuffer),
      
      // Musical analysis (simplified)
      musicalKey: 'C major', // Placeholder
      timeSignature: '4/4',
      rhythmComplexity: Math.min(1.0, basicFeatures.tempo / 140), // Simplified
      beatStrength: basicFeatures.beatDetected ? 1.0 : 0.0,
      tempoStability: 0.8, // Placeholder
    };
    
    return extendedFeatures;
  }

  // Simplified instrument detection methods
  private detectDrums(features: AudioFeatures): number {
    // Drums typically have high bass and beat activity
    return Math.min(1.0, features.bassLevel * 2 + (features.beatDetected ? 0.5 : 0));
  }

  private detectGuitar(features: AudioFeatures): number {
    // Guitar has mid-range emphasis
    return Math.min(1.0, features.midLevel * 1.5);
  }

  private detectBass(features: AudioFeatures): number {
    // Bass has strong low-frequency content
    return Math.min(1.0, features.bassLevel * 2);
  }

  private detectVocals(features: AudioFeatures): number {
    // Vocals typically in mid-range with some treble
    return Math.min(1.0, (features.midLevel + features.trebleLevel * 0.5) * 1.2);
  }

  private detectPiano(features: AudioFeatures): number {
    // Piano has broad frequency content
    return Math.min(1.0, (features.bassLevel + features.midLevel + features.trebleLevel) / 3 * 1.5);
  }

  private detectStrings(features: AudioFeatures): number {
    // Strings have rich harmonics in mid-to-treble range
    return Math.min(1.0, (features.midLevel + features.trebleLevel) * 1.2);
  }

  // Spectral feature computation methods
  private computeSpectralCentroid(): number {
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < this.amplitudes.length; i++) {
      numerator += this.frequencyBins[i] * this.amplitudes[i];
      denominator += this.amplitudes[i];
    }
    return denominator > 0 ? numerator / denominator : 0;
  }

  private computeSpectralRolloff(): number {
    const totalEnergy = this.amplitudes.reduce((sum, amp) => sum + amp * amp, 0);
    const rolloffThreshold = totalEnergy * 0.85;
    let cumulativeEnergy = 0;
    
    for (let i = 0; i < this.amplitudes.length; i++) {
      cumulativeEnergy += this.amplitudes[i] * this.amplitudes[i];
      if (cumulativeEnergy >= rolloffThreshold) {
        return this.frequencyBins[i];
      }
    }
    return this.frequencyBins[this.frequencyBins.length - 1];
  }

  private computeSpectralFlux(): number {
    // Simplified: use change in overall energy
    // In a full implementation, this would compare consecutive frames
    return this.amplitudes.reduce((sum, amp) => sum + amp, 0);
  }

  private computeZeroCrossingRate(audioBuffer: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < audioBuffer.length; i++) {
      if ((audioBuffer[i] >= 0) !== (audioBuffer[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / audioBuffer.length;
  }

  private computeRMS(audioBuffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      sum += audioBuffer[i] * audioBuffer[i];
    }
    return Math.sqrt(sum / audioBuffer.length);
  }

  private computePeak(audioBuffer: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      peak = Math.max(peak, Math.abs(audioBuffer[i]));
    }
    return peak;
  }

  private calculateAverageLevel(startBin: number, endBin: number): number {
    let sum = 0;
    const count = endBin - startBin;
    for (let i = startBin; i < endBin; i++) {
      sum += this.amplitudes[i];
    }
    return count > 0 ? sum / count : 0;
  }

  public updateConfig(config: AudioConfig): void {
    this.config = config;
    // Update beat detector with new sample rate if needed
    this.beatDetector = new BeatDetector(config.sampleRate);
  }

  public enableExtendedAnalysis(enabled: boolean): void {
    this.enhancedAnalysis = enabled;
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