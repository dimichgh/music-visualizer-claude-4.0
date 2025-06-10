# Sub-task 2.2: Audio-Visual Mapping - Advanced Synchronization

## Objective
Implement sophisticated audio-visual mapping algorithms that create intelligent connections between musical elements and visual effects, including instrument detection, musical key analysis, and advanced beat pattern recognition.

## Technical Requirements
- Advanced frequency-to-visual parameter mapping
- Instrument detection and classification
- Musical key and chord detection  
- Complex beat pattern analysis (not just single beats)
- Tempo change detection and adaptation
- Dynamic color palette generation based on musical content
- Cross-frequency harmonic analysis
- Real-time audio feature smoothing and prediction

## Implementation Steps

### Step 1: Enhanced Audio Analysis
Extend `src/main/audio/audio-analyzer.ts`:
```typescript
export interface AdvancedAudioFeatures {
  // Existing features
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  overallLevel: number;
  beatDetected: boolean;
  tempo: number;
  
  // New advanced features
  musicalKey: string; // e.g., "C major", "A minor"
  chordProgression: string[];
  instrumentDetection: {
    drums: number;
    guitar: number;
    bass: number;
    vocals: number;
    piano: number;
    strings: number;
  };
  rhythmComplexity: number; // 0-1 scale
  harmonicContent: number[]; // Harmonic series analysis
  spectralCentroid: number; // Brightness measure
  spectralRolloff: number; // Energy distribution
  zeroCrossingRate: number; // Texture analysis
  mfcc: number[]; // Mel-frequency cepstral coefficients
  tempoStability: number; // How stable the tempo is
  beatStrength: number; // How strong the current beat is
  onsetDetection: boolean; // Note onset detection
}
```

### Step 2: Instrument Detection Algorithm
Create `src/main/audio/instrument-detector.ts`:
```typescript
export class InstrumentDetector {
  private spectralFeatures: SpectralFeatureExtractor;
  private temporalFeatures: TemporalFeatureExtractor;
  private classificationModel: SimpleMLClassifier;

  public detectInstruments(frequencyData: Float32Array, timeData: Float32Array): InstrumentProbabilities {
    // Use spectral features and temporal patterns to classify instruments
    // Drums: Strong transients, broad spectrum, specific frequency patterns
    // Guitar: Harmonic structure, specific formants
    // Bass: Low frequency dominance, fundamental + harmonics
    // Vocals: Formant structure, pitch continuity
    // Piano: Sharp attacks, harmonic structure
    // Strings: Smooth attacks, rich harmonics
  }
}
```

### Step 3: Musical Key Detection
Create `src/main/audio/key-detector.ts`:
```typescript
export class KeyDetector {
  private chromaVector: number[] = new Array(12).fill(0);
  private keyProfiles: { [key: string]: number[] };

  public detectKey(frequencyData: Float32Array): string {
    // Chroma vector extraction (12-tone pitch class profile)
    // Cross-correlation with major/minor key profiles
    // Return most likely key (e.g., "C major", "F# minor")
  }

  public detectChordProgression(chromaHistory: number[][]): string[] {
    // Analyze chord changes over time
    // Return sequence like ["I", "V", "vi", "IV"] in detected key
  }
}
```

### Step 4: Advanced Visual Mapping System
Create `src/renderer/visualizers/audio-visual-mapper.ts`:
```typescript
export class AudioVisualMapper {
  private colorPalettes: { [key: string]: ColorPalette };
  private instrumentVisualProfiles: { [instrument: string]: VisualProfile };
  
  public mapAudioToVisuals(audioFeatures: AdvancedAudioFeatures): VisualParameters {
    return {
      // Color mapping based on musical key
      primaryColors: this.getKeyBasedColors(audioFeatures.musicalKey),
      
      // Particle behavior based on instruments
      particleProfiles: this.getInstrumentBasedParticles(audioFeatures.instrumentDetection),
      
      // Camera movement based on rhythm complexity
      cameraMovement: this.getRhythmBasedCamera(audioFeatures.rhythmComplexity),
      
      // Effects intensity based on harmonic content
      effectsIntensity: this.getHarmonicBasedEffects(audioFeatures.harmonicContent),
      
      // Beat visualization based on beat strength
      beatVisuals: this.getBeatBasedVisuals(audioFeatures.beatStrength, audioFeatures.onsetDetection)
    };
  }

  private getKeyBasedColors(key: string): ColorPalette {
    // Map musical keys to color palettes
    // Major keys: warmer colors, Minor keys: cooler colors
    // Circle of fifths mapping to color wheel
    const keyColorMap = {
      'C major': ['#FF6B6B', '#4ECDC4', '#45B7D1'], // Warm, balanced
      'A minor': ['#9B59B6', '#3498DB', '#2C3E50'], // Cool, melancholic
      'G major': ['#F39C12', '#E67E22', '#D35400'], // Bright, energetic
      'E minor': ['#7F8C8D', '#95A5A6', '#BDC3C7'], // Muted, introspective
      // ... more keys
    };
    return keyColorMap[key] || keyColorMap['C major'];
  }
}
```

### Step 5: Instrument-Specific Visual Profiles
```typescript
interface VisualProfile {
  particleConfig: ParticleSystemConfig;
  colorInfluence: number;
  movementPattern: 'smooth' | 'sharp' | 'pulsing' | 'flowing';
  effectsType: 'energy' | 'organic' | 'geometric' | 'ethereal';
}

const instrumentProfiles: { [key: string]: VisualProfile } = {
  drums: {
    particleConfig: { size: 20, speed: 3.0, spread: 40 },
    colorInfluence: 0.8,
    movementPattern: 'sharp',
    effectsType: 'energy'
  },
  guitar: {
    particleConfig: { size: 8, speed: 1.5, spread: 60 },
    colorInfluence: 0.6,
    movementPattern: 'flowing',
    effectsType: 'organic'
  },
  bass: {
    particleConfig: { size: 25, speed: 0.8, spread: 80 },
    colorInfluence: 0.9,
    movementPattern: 'pulsing',
    effectsType: 'energy'
  },
  vocals: {
    particleConfig: { size: 12, speed: 2.0, spread: 50 },
    colorInfluence: 0.7,
    movementPattern: 'smooth',
    effectsType: 'ethereal'
  }
};
```

### Step 6: Beat Pattern Analysis
Create `src/main/audio/rhythm-analyzer.ts`:
```typescript
export class RhythmAnalyzer {
  private beatHistory: number[] = [];
  private tempoHistory: number[] = [];
  
  public analyzeRhythmComplexity(beats: boolean[], tempo: number): number {
    // Analyze beat patterns for complexity
    // Simple 4/4 = low complexity
    // Syncopated/irregular = high complexity
    // Return 0-1 scale
  }

  public detectTimeSignature(beatPattern: boolean[]): string {
    // Detect time signature (4/4, 3/4, 6/8, etc.)
    // Use beat strength patterns and tempo analysis
  }

  public predictNextBeat(beatHistory: number[]): number {
    // Predict when next beat will occur
    // Use for pre-emptive visual effects
  }
}
```

### Step 7: Smooth Audio Feature Processing
Create `src/main/audio/feature-smoother.ts`:
```typescript
export class FeatureSmoother {
  private featureHistory: { [key: string]: number[] } = {};
  private smoothingFactors: { [key: string]: number } = {
    bassLevel: 0.3,
    midLevel: 0.4,
    trebleLevel: 0.5,
    tempo: 0.1, // Very slow changes
    beatStrength: 0.8 // Quick response
  };

  public smoothFeatures(rawFeatures: AdvancedAudioFeatures): AdvancedAudioFeatures {
    // Apply exponential smoothing to reduce jitter
    // Different smoothing factors for different features
    // Maintain responsiveness while reducing noise
  }
}
```

### Step 8: Integration with Existing Visualizer
Update `src/renderer/visualizers/music-visualizer.ts`:
```typescript
export class MusicVisualizer {
  private audioVisualMapper: AudioVisualMapper;
  private lastVisualParams: VisualParameters;
  private transitionManager: VisualTransitionManager;

  private updateVisualizations(deltaTime: number): void {
    if (this.audioFeatures) {
      // Get mapped visual parameters
      const visualParams = this.audioVisualMapper.mapAudioToVisuals(this.audioFeatures);
      
      // Smooth transitions between visual states
      const smoothedParams = this.transitionManager.smoothTransition(
        this.lastVisualParams, 
        visualParams, 
        deltaTime
      );
      
      // Apply to particle systems with instrument-specific behavior
      this.applyInstrumentBasedEffects(smoothedParams);
      
      // Update camera with rhythm-based movement
      this.updateRhythmBasedCamera(smoothedParams);
      
      // Apply key-based color schemes
      this.updateKeyBasedColors(smoothedParams);
      
      this.lastVisualParams = smoothedParams;
    }
  }
}
```

## Acceptance Criteria
- [ ] **Instrument Detection**: Accurately identifies 4+ instrument types (drums, guitar, bass, vocals)
- [ ] **Musical Key Detection**: Detects major/minor keys with 80%+ accuracy
- [ ] **Advanced Beat Analysis**: Detects complex rhythms beyond simple 4/4 beats
- [ ] **Color-Key Mapping**: Colors change based on detected musical key
- [ ] **Instrument Visual Profiles**: Different visual behaviors for different instruments
- [ ] **Smooth Transitions**: No jarring visual changes, smooth parameter interpolation
- [ ] **Harmonic Analysis**: Visual effects respond to harmonic content
- [ ] **Tempo Adaptation**: Visualization adapts to tempo changes in real-time
- [ ] **Beat Prediction**: Pre-emptive visual effects based on beat prediction

## Dependencies for Next Sub-task
This enhanced audio-visual mapping provides the foundation for Sub-task 3.1 (Cosmic Effects) and Sub-task 3.2 (Instrument Avatars) by providing detailed instrument detection and musical analysis.

## Performance Requirements
- Instrument detection: < 100ms latency
- Key detection: < 500ms for stable detection
- Feature smoothing: < 10ms processing time
- Overall audio-visual delay: < 50ms end-to-end

## Status Tracking
- [ ] **TODO**: Implement all steps above
- [ ] **IN PROGRESS**: Currently implementing
- [ ] **COMPLETED**: All acceptance criteria met
- [ ] **TESTED**: Verified with various music genres and instruments

## Testing Strategy
- Test with different music genres (rock, electronic, classical, jazz)
- Verify instrument detection accuracy with known instrument tracks
- Test key detection with music theory knowledge
- Performance test with long audio sessions
- User testing for visual-audio synchronization quality 