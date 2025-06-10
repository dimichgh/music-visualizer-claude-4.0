export interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
  channels: number;
  bitDepth?: number;
  inputDeviceId?: string;
}

export interface FrequencyData {
  frequencies: Float32Array;
  amplitudes: Float32Array;
  sampleRate: number;
  nyquistFrequency: number;
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

export interface ExtendedAudioFeatures extends AudioFeatures {
  musicalKey?: string;
  chordProgression?: string[];
  harmonicContent?: number[];
  instrumentDetection?: {
    drums: number;
    guitar: number;
    bass: number;
    vocals: number;
    piano: number;
    strings: number;
  };
  rhythmComplexity?: number;
  beatStrength?: number;
  tempoStability?: number;
  onsetDetection?: boolean;
  timeSignature?: string;
  spectralCentroid?: number;
  spectralRolloff?: number;
  spectralFlux?: number;
  zeroCrossingRate?: number;
  mfcc?: number[];
  dynamicRange?: number;
  rms?: number;
  peak?: number;
  nextBeatPrediction?: number;
}

export interface AudioSource {
  type: 'system' | 'file' | 'microphone';
  name: string;
  isActive: boolean;
  config: AudioConfig;
  format?: string;
  duration?: number;
}

export interface WaveformData {
  left: Float32Array;
  right: Float32Array;
  length: number;
  sampleRate: number;
  samples?: Float32Array;
  duration?: number;
  channels?: number;
}

export enum AudioEvent {
  DATA_AVAILABLE = 'audio:data-available',
  FEATURES_EXTRACTED = 'audio:features-extracted',
  EXTENDED_FEATURES_EXTRACTED = 'audio:extended-features-extracted',
  SOURCE_CHANGED = 'audio:source-changed',
  ERROR = 'audio:error',
}

export interface AudioAnalysisResult {
  frequencyData: FrequencyData;
  features: AudioFeatures;
  extendedFeatures?: ExtendedAudioFeatures;
  timestamp: number;
  processingTime?: number;
}

export interface MusicalAnalysis {
  key: string;
  mode: 'major' | 'minor';
  confidence: number;
  chromaVector: number[];
  currentChord: string;
  chordProgression: string[];
  keyStability: number;
}

export interface InstrumentClassification {
  instrument: string;
  probability: number;
  confidence: number;
  spectralFeatures: {
    centroid: number;
    rolloff: number;
    flux: number;
    mfcc: number[];
  };
  temporalFeatures: {
    attackTime: number;
    decayTime: number;
    sustainLevel: number;
    releaseTime: number;
  };
}

export interface RhythmAnalysis {
  tempo: number;
  tempoConfidence: number;
  beatTimes: number[];
  beatStrengths: number[];
  timeSignature: string;
  rhythmPattern: number[];
  complexity: number;
  groove: number;
}

export interface SpectralFeatures {
  centroid: number;
  rolloff: number;
  flux: number;
  slope: number;
  spread: number;
  skewness: number;
  kurtosis: number;
  flatness: number;
} 