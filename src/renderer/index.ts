import './styles/main.css';
import { MusicVisualizer } from './visualizers/music-visualizer';
import { AudioPlayer } from './audio-player';

// Extend the global Window interface to include our electron API
declare global {
  interface Window {
    electronAPI: {
      audio: {
        startMicrophoneCapture: () => Promise<any>;
        loadFile: (filePath: string) => Promise<any>;
        stop: () => Promise<any>;
        pause: () => Promise<any>;
        resume: () => Promise<any>;
        seek: (position: number) => Promise<any>;
        getCurrentSource: () => Promise<any>;
        getConfig: () => Promise<any>;
        getDuration: () => Promise<any>;
        getCurrentTime: () => Promise<any>;
        updateConfig: (config: any) => Promise<any>;
      };
      onAudioEvent: (callback: (event: string, data: any) => void) => void;
      removeAudioListeners: () => void;
      openFileDialog: () => Promise<any>;
    };
  }
}

class MusicVisualizerRenderer {
  private audioFeatures: any = null;
  private isInitialized = false;
  private isInitializing = false; // Prevent double initialization
  private visualizer: MusicVisualizer | null = null;
  private extendedFeatures: any = null;
  private audioControlsEl!: HTMLDivElement;
  private featuresDisplayEl!: HTMLDivElement;
  private visualizerContainerEl!: HTMLDivElement;
  
  // Audio playback components
  private audioPlayer: AudioPlayer;
  private isAudioLoaded = false;
  private currentFileName = '';
  private progressUpdateInterval: number | null = null;

  constructor() {
    console.log('=== MUSIC VISUALIZER RENDERER STARTING ===');
    
    this.audioPlayer = new AudioPlayer();
    this.setupAudioPlayerCallbacks();
    
    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
      console.log('DOM still loading, waiting for DOMContentLoaded...');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing...');
        this.initialize();
      });
    } else {
      console.log('DOM already loaded, initializing immediately...');
      this.initialize();
    }
    
    // Add cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.destroy();
    });
  }

  private setupAudioPlayerCallbacks(): void {
    // Connect audio player data to our existing audio analysis system
    this.audioPlayer.onAudioData((audioData: Float32Array) => {
      console.log('Audio data received for visualization:', {
        dataLength: audioData.length,
        sampleData: audioData.slice(0, 5),
        hasVisualizer: !!this.visualizer
      });
      // Process audio data for visualization
      this.processAudioForVisualization(audioData);
    });

    // Set up callback for when audio ends naturally
    this.audioPlayer.onAudioEnded(() => {
      console.log('Audio ended naturally');
      this.updatePlayPauseButton(false);
      this.stopProgressUpdates();
      this.updateStatus('✅ Audio finished playing');
    });
  }

  private processAudioForVisualization(audioData: Float32Array): void {
    // Get frequency data from the audio player
    const frequencyData = this.audioPlayer.getFrequencyData();
    
    console.log('Processing audio for visualization:', {
      hasFrequencyData: !!frequencyData,
      frequencyDataLength: frequencyData?.length
    });
    
    if (!frequencyData) return;

    // Create a simplified analysis result for visualization
    const analysisResult = {
      features: this.extractBasicFeatures(audioData, frequencyData),
      frequencyData: {
        frequencies: new Float32Array(frequencyData.length).map((_, i) => 
          (i * 24000) / frequencyData.length // Assuming 48kHz sample rate
        ),
        amplitudes: new Float32Array(frequencyData.length).map((_, i) => 
          Math.pow(10, frequencyData[i] / 20) // Convert from dB to linear
        ),
        sampleRate: 48000,
        nyquistFrequency: 24000
      },
      timestamp: Date.now()
    };

    console.log('Analysis result:', {
      bassLevel: analysisResult.features.bassLevel,
      midLevel: analysisResult.features.midLevel,
      trebleLevel: analysisResult.features.trebleLevel,
      overallLevel: analysisResult.features.overallLevel
    });

    // Update visualizations
    this.updateAudioFeatures(analysisResult);
    this.updateFeaturesDisplay(analysisResult.features);
  }

  private simulateInstrumentDetection(audioData: {
    bassLevel: number;
    midLevel: number;
    trebleLevel: number;
    overallLevel: number;
    dominantFrequency: number;
    beatDetected: boolean;
    linearAmplitudes: Float32Array;
  }): any {
    const { bassLevel, midLevel, trebleLevel, overallLevel, dominantFrequency, beatDetected, linearAmplitudes } = audioData;
    
    // **MUCH MORE SENSITIVE DETECTION** - Lower thresholds for easier triggering
    console.log('🎵 Audio levels:', { overallLevel: overallLevel.toFixed(3), bassLevel: bassLevel.toFixed(3), midLevel: midLevel.toFixed(3), trebleLevel: trebleLevel.toFixed(3), dominantFreq: dominantFrequency.toFixed(0) });

    // Only detect instruments when there's ANY audio energy (much lower threshold)
    if (overallLevel < 0.01) {
      return {
        drums: 0,
        guitar: 0, 
        bass: 0,
        vocals: 0,
        piano: 0,
        strings: 0
      };
    }

    // **BALANCED INSTRUMENT DETECTION** - Equal sensitivity and multipliers
    
    // **DRUMS DETECTION** - REDUCED bias: Lower multiplier, less beat bonus
    let drumsConfidence = 0;
    if (bassLevel > 0.05 || beatDetected) {
      drumsConfidence = Math.min(1.0, bassLevel * 3.0 + (beatDetected ? 0.2 : 0)); // ← REDUCED: was 5.0 + 0.4
      drumsConfidence *= (0.7 + Math.sin(Date.now() * 0.003) * 0.3);
    }

    // **BASS DETECTION** - REDUCED bias: Lower multiplier
    let bassConfidence = 0;
    if (dominantFrequency < 300 || bassLevel > 0.08) {
      bassConfidence = Math.min(1.0, bassLevel * 4.0); // ← REDUCED: was 6.0
      bassConfidence *= (0.7 + Math.sin(Date.now() * 0.002) * 0.3);
    }

    // **GUITAR DETECTION** - INCREASED sensitivity: Better multipliers
    let guitarConfidence = 0;
    if (midLevel > 0.04 || trebleLevel > 0.02) { // ← EASIER: lowered thresholds
      guitarConfidence = Math.min(1.0, midLevel * 5.0 + trebleLevel * 3.0); // ← INCREASED: was 4.0 + 2.0
      guitarConfidence *= (0.7 + Math.sin(Date.now() * 0.0025) * 0.3); // ← INCREASED base from 0.6
    }

    // **VOCALS DETECTION** - INCREASED sensitivity: Better multipliers
    let vocalsConfidence = 0;
    if (midLevel > 0.04 || trebleLevel > 0.02) { // ← EASIER: lowered thresholds  
      vocalsConfidence = Math.min(1.0, midLevel * 4.0 + trebleLevel * 5.0); // ← INCREASED: was 3.0 + 4.0
      vocalsConfidence *= (0.7 + Math.sin(Date.now() * 0.004) * 0.3); // ← INCREASED base from 0.5
    }

    // **PIANO DETECTION** - INCREASED sensitivity: Better calculation
    let pianoConfidence = 0;
    if (midLevel > 0.04 || trebleLevel > 0.02) { // ← EASIER: lowered thresholds
      // Improved harmonic calculation favoring piano characteristics
      let harmonicRichness = (bassLevel + midLevel * 2 + trebleLevel) / 4; // ← BETTER: weight mid frequencies
      pianoConfidence = Math.min(1.0, harmonicRichness * 5.0 + midLevel * 3.0); // ← INCREASED: was 4.0 + 2.0
      pianoConfidence *= (0.7 + Math.sin(Date.now() * 0.0015) * 0.3); // ← INCREASED base from 0.6
    }

    // **STRINGS DETECTION** - INCREASED sensitivity: Much better detection
    let stringsConfidence = 0;
    if (midLevel > 0.03 || trebleLevel > 0.02) { // ← EASIER: lowered thresholds significantly
      stringsConfidence = Math.min(1.0, midLevel * 6.0 + trebleLevel * 4.0); // ← INCREASED: was 5.0 + 3.0
      stringsConfidence *= (0.7 + Math.sin(Date.now() * 0.001) * 0.3); // ← INCREASED base from 0.5
    }

    // Apply minimum threshold and add some randomness for realism
    const minThreshold = 0.05;
    const randomFactor = 0.9 + Math.random() * 0.2; // ±10% randomness

    // COMPREHENSIVE DETECTION DEBUGGING
    console.log('🎵 INSTRUMENT DETECTION DEBUG - Raw Confidences:', {
      drums: drumsConfidence.toFixed(4),
      guitar: guitarConfidence.toFixed(4),
      bass: bassConfidence.toFixed(4),
      vocals: vocalsConfidence.toFixed(4),
      piano: pianoConfidence.toFixed(4),
      strings: stringsConfidence.toFixed(4),
      minThreshold: minThreshold.toFixed(4),
      randomFactor: randomFactor.toFixed(3)
    });

    const result = {
      drums: Math.max(0, drumsConfidence - minThreshold) * randomFactor,
      guitar: Math.max(0, guitarConfidence - minThreshold) * randomFactor,
      bass: Math.max(0, bassConfidence - minThreshold) * randomFactor,
      vocals: Math.max(0, vocalsConfidence - minThreshold) * randomFactor,
      piano: Math.max(0, pianoConfidence - minThreshold) * randomFactor,
      strings: Math.max(0, stringsConfidence - minThreshold) * randomFactor
    };

    console.log('🎵 INSTRUMENT DETECTION DEBUG - Final Results:', {
      drums: result.drums.toFixed(4),
      guitar: result.guitar.toFixed(4),
      bass: result.bass.toFixed(4),
      vocals: result.vocals.toFixed(4),
      piano: result.piano.toFixed(4),
      strings: result.strings.toFixed(4),
      anyDetected: Object.values(result).some(v => v > 0.01)
    });

    return result;
  }

  private extractBasicFeatures(timeData: Float32Array, frequencyData: Float32Array): any {
    // Convert frequency data from dB to linear scale
    const linearAmplitudes = new Float32Array(frequencyData.length);
    for (let i = 0; i < frequencyData.length; i++) {
      linearAmplitudes[i] = Math.pow(10, frequencyData[i] / 20);
    }

    // Calculate frequency band levels
    const bassEnd = Math.floor(250 * linearAmplitudes.length / 24000);
    const midEnd = Math.floor(4000 * linearAmplitudes.length / 24000);
    
    let bassLevel = 0, midLevel = 0, trebleLevel = 0;
    
    for (let i = 1; i < bassEnd; i++) bassLevel += linearAmplitudes[i];
    for (let i = bassEnd; i < midEnd; i++) midLevel += linearAmplitudes[i];
    for (let i = midEnd; i < linearAmplitudes.length; i++) trebleLevel += linearAmplitudes[i];
    
    bassLevel /= (bassEnd - 1);
    midLevel /= (midEnd - bassEnd);
    trebleLevel /= (linearAmplitudes.length - midEnd);

    // Calculate RMS and overall level
    let rms = 0;
    for (let i = 0; i < timeData.length; i++) {
      rms += timeData[i] * timeData[i];
    }
    const overallLevel = Math.sqrt(rms / timeData.length);

    // Find dominant frequency
    let maxAmplitude = 0;
    let dominantFrequency = 0;
    for (let i = 1; i < linearAmplitudes.length; i++) {
      if (linearAmplitudes[i] > maxAmplitude) {
        maxAmplitude = linearAmplitudes[i];
        dominantFrequency = (i * 24000) / linearAmplitudes.length;
      }
    }

    // Simple beat detection based on energy
    const beatDetected = overallLevel > 0.1;
    const tempo = 120; // Simplified - could be enhanced

    // **REALISTIC INSTRUMENT DETECTION SIMULATION**
    // Based on frequency content and energy patterns
    console.log('🎵 AUDIO PIPELINE DEBUG - Input Levels:', {
      bassLevel: bassLevel.toFixed(4),
      midLevel: midLevel.toFixed(4),
      trebleLevel: trebleLevel.toFixed(4),
      overallLevel: overallLevel.toFixed(4),
      dominantFrequency: dominantFrequency.toFixed(0),
      beatDetected,
      amplitudeRange: `${Math.min(...linearAmplitudes).toFixed(4)} - ${Math.max(...linearAmplitudes).toFixed(4)}`
    });
    
    const instrumentDetection = this.simulateInstrumentDetection({
      bassLevel,
      midLevel, 
      trebleLevel,
      overallLevel,
      dominantFrequency,
      beatDetected,
      linearAmplitudes
    });
    
    console.log('🎵 AUDIO PIPELINE DEBUG - Instrument Detection Result:', instrumentDetection);

    // BALANCED BOOSTING: Equal treatment for all instruments when overall level is reasonable
    let finalInstrumentDetection = instrumentDetection;
    if (overallLevel > 0.01) {
      // Much more balanced - all instruments get similar baseline boost
      const baseBoost = overallLevel * 0.5; // Base boost for all instruments
      finalInstrumentDetection = {
        drums: Math.max(instrumentDetection.drums, baseBoost + overallLevel * 0.1), // Total: 0.6
        guitar: Math.max(instrumentDetection.guitar, baseBoost + overallLevel * 0.1), // Total: 0.6
        bass: Math.max(instrumentDetection.bass, baseBoost + overallLevel * 0.05), // Total: 0.55
        vocals: Math.max(instrumentDetection.vocals, baseBoost + overallLevel * 0.1), // Total: 0.6
        piano: Math.max(instrumentDetection.piano, baseBoost + overallLevel * 0.1), // Total: 0.6
        strings: Math.max(instrumentDetection.strings, baseBoost + overallLevel * 0.1) // Total: 0.6
      };
      console.log('🎵 BALANCED BOOSTING - Equal opportunity for all instruments:', {
        drums: finalInstrumentDetection.drums.toFixed(3),
        guitar: finalInstrumentDetection.guitar.toFixed(3), 
        bass: finalInstrumentDetection.bass.toFixed(3),
        vocals: finalInstrumentDetection.vocals.toFixed(3),
        piano: finalInstrumentDetection.piano.toFixed(3),
        strings: finalInstrumentDetection.strings.toFixed(3)
      });
    }

    return {
      bassLevel: Math.min(1.0, bassLevel * 5),
      midLevel: Math.min(1.0, midLevel * 3),
      trebleLevel: Math.min(1.0, trebleLevel * 2),
      overallLevel: Math.min(1.0, overallLevel * 10),
      beatDetected,
      tempo,
      dominantFrequency,
      instrumentDetection: finalInstrumentDetection // ← ADD BOOSTED INSTRUMENT DETECTION DATA
    };
  }

  private initialize(): void {
    // Prevent double initialization
    if (this.isInitialized || this.isInitializing) {
      console.log('Already initialized or initializing, skipping...');
      return;
    }
    
    this.isInitializing = true;
    console.log('=== INITIALIZING MUSIC VISUALIZER RENDERER ===');
    
    this.initializeUI();
    
    // Set up event listeners after UI is created
    this.setupEventListeners();
    
    // Legacy setup for backwards compatibility
    this.setupUI();
    this.setupAudioEventListeners();
    this.initializeVisualizer();
    
    this.isInitialized = true;
    this.isInitializing = false;
    console.log('=== MUSIC VISUALIZER RENDERER INITIALIZED ===');
  }

  private initializeUI(): void {
    console.log('=== INITIALIZING UI ===');
    
    // Clear the existing app content and rebuild with our UI (only if not already cleared)
    const appEl = document.getElementById('app');
    if (appEl && appEl.children.length > 0) {
      console.log('Found app element with content, clearing and rebuilding...');
      appEl.innerHTML = '';
    } else if (appEl) {
      console.log('Found empty app element, proceeding...');
    }

    // Audio Controls Panel
    this.audioControlsEl = document.createElement('div');
    this.audioControlsEl.className = 'audio-controls';
    this.audioControlsEl.id = 'audio-controls'; // Add ID for debugging
    this.audioControlsEl.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
      background: rgba(20, 25, 40, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid rgba(100, 120, 200, 0.3);
      color: #e0e5ff;
      font-family: 'Inter', sans-serif;
      min-width: 300px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    this.audioControlsEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
        <h3 style="margin: 0; color: #8b5cf6; font-size: 16px;">🎵 Music Visualizer</h3>
        <button id="music-visualizer-pin" class="pin-button" style="
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 14px;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        " title="Pin/Unpin Panel">📌</button>
      </div>
      <input type="file" id="fileInput" accept=".wav" style="
        width: 100%;
        padding: 8px;
        margin-bottom: 10px;
        border: 1px solid rgba(100, 120, 200, 0.5);
        border-radius: 6px;
        background: rgba(30, 35, 50, 0.8);
        color: #e0e5ff;
        font-size: 12px;
      ">
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; margin-bottom: 10px;">
        <button id="playPauseBtn" style="padding: 8px; border: none; border-radius: 6px; background: #10b981; color: white; cursor: pointer; font-size: 11px;">▶ Play</button>
        <button id="stopBtn" style="padding: 8px; border: none; border-radius: 6px; background: #ef4444; color: white; cursor: pointer; font-size: 11px;">⏹ Stop</button>
      </div>
      <div style="margin-bottom: 10px;">
        <button id="testToneBtn" style="width: 100%; padding: 8px; border: none; border-radius: 6px; background: #6366f1; color: white; cursor: pointer; font-size: 11px;">🔊 Test Audio System</button>
      </div>
      <div style="margin-bottom: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
          <span style="color: #94a3b8; font-size: 10px;" id="currentTime">0:00</span>
          <span style="color: #8b5cf6; font-size: 10px;">⏱ Progress</span>
          <span style="color: #94a3b8; font-size: 10px;" id="totalTime">0:00</span>
        </div>
        <input type="range" id="progressSlider" min="0" max="100" value="0" style="
          width: 100%;
          height: 6px;
          margin-bottom: 10px;
          background: linear-gradient(to right, #8b5cf6 0%, #8b5cf6 0%, rgba(30, 35, 50, 0.8) 0%);
          border-radius: 3px;
          appearance: none;
          cursor: pointer;
        ">
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="color: #94a3b8; font-size: 11px; margin-right: 8px;">🔊 Volume:</span>
        <input type="range" id="volumeSlider" min="0" max="100" value="100" style="
          flex: 1;
          margin-right: 8px;
          background: rgba(30, 35, 50, 0.8);
        ">
        <span id="volumeDisplay" style="color: #94a3b8; font-size: 11px; min-width: 30px;">100%</span>
      </div>
      <div id="status" style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">Ready - Select a WAV file to begin</div>
    `;

    console.log('Audio controls panel created');

    // Features Display Panel
    this.featuresDisplayEl = document.createElement('div');
    this.featuresDisplayEl.className = 'features-display';
    this.featuresDisplayEl.id = 'features-display'; // Add ID for debugging
    this.featuresDisplayEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      background: rgba(20, 25, 40, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 15px;
      border: 1px solid rgba(100, 120, 200, 0.3);
      color: #e0e5ff;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      min-width: 250px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    this.featuresDisplayEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <h4 style="margin: 0; color: #8b5cf6; font-size: 12px;">🎛 Audio Features</h4>
        <button id="audio-features-pin" class="pin-button" style="
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 12px;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        " title="Pin/Unpin Panel">📌</button>
      </div>
      <div id="features-content">No audio loaded</div>
    `;

    console.log('Features display panel created');

    // Extended Features Panel
    const extendedFeaturesEl = document.createElement('div');
    extendedFeaturesEl.className = 'extended-features-panel';
    extendedFeaturesEl.id = 'extended-features-panel'; // Add ID for debugging
    extendedFeaturesEl.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 1000;
      background: rgba(20, 25, 40, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 15px;
      border: 1px solid rgba(100, 120, 200, 0.3);
      color: #e0e5ff;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      min-width: 600px;
      max-height: 300px;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    
    extendedFeaturesEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <h4 style="margin: 0; color: #8b5cf6; font-size: 12px;">🎵 Advanced Audio Analysis</h4>
        <button id="advanced-analysis-pin" class="pin-button" style="
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 12px;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        " title="Pin/Unpin Panel">📌</button>
      </div>
      <div class="features-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div class="instrument-detection">
          <h5 style="margin: 0 0 5px 0; color: #06b6d4;">🎸 Instruments</h5>
          <div id="instruments-display">No data available</div>
        </div>
        <div class="spectral-features">
          <h5 style="margin: 0 0 5px 0; color: #10b981;">📊 Spectral</h5>
          <div id="spectral-display">No data available</div>
        </div>
        <div class="musical-analysis">
          <h5 style="margin: 0 0 5px 0; color: #f59e0b;">🎼 Musical</h5>
          <div id="musical-display">No data available</div>
        </div>
        <div class="dynamic-features">
          <h5 style="margin: 0 0 5px 0; color: #ef4444;">⚡ Dynamics</h5>
          <div id="dynamic-display">No data available</div>
        </div>
      </div>
    `;

    console.log('Extended features panel created');

    // Cosmic Effects Controls Panel
    const cosmicEffectsEl = document.createElement('div');
    cosmicEffectsEl.className = 'cosmic-effects-panel';
    cosmicEffectsEl.id = 'cosmic-effects-panel';
    cosmicEffectsEl.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      background: rgba(20, 25, 40, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 15px;
      border: 1px solid rgba(100, 120, 200, 0.3);
      color: #e0e5ff;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      min-width: 280px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    
    cosmicEffectsEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
        <h4 style="margin: 0; color: #8b5cf6; font-size: 12px;">🌌 Cosmic Effects</h4>
        <button id="cosmic-effects-pin" class="pin-button" style="
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 12px;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        " title="Pin/Unpin Panel">📌</button>
      </div>
      <div class="effects-controls" style="display: grid; gap: 8px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="nebulae-enabled" checked style="margin-right: 8px; accent-color: #8b5cf6;">
          <span style="color: #e0e5ff;">🌫️ Nebulae Systems</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="portals-enabled" checked style="margin-right: 8px; accent-color: #06b6d4;">
          <span style="color: #e0e5ff;">🌀 Energy Portals</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="plasma-enabled" checked style="margin-right: 8px; accent-color: #10b981;">
          <span style="color: #e0e5ff;">⚡ Plasma Waves</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="gravity-enabled" checked style="margin-right: 8px; accent-color: #f59e0b;">
          <span style="color: #e0e5ff;">🕳️ Gravitational Lenses</span>
        </label>
      </div>
      <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(100, 120, 200, 0.2);">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="color: #94a3b8; font-size: 10px; margin-right: 8px;">Intensity:</span>
          <input type="range" id="cosmic-intensity" min="0" max="100" value="80" style="
            flex: 1;
            margin-right: 8px;
            accent-color: #8b5cf6;
          ">
          <span id="intensity-display" style="color: #94a3b8; font-size: 10px; min-width: 30px;">80%</span>
        </div>
        <div style="display: flex; align-items: center;">
          <span style="color: #94a3b8; font-size: 10px; margin-right: 8px;">Responsiveness:</span>
          <input type="range" id="cosmic-responsiveness" min="0" max="100" value="70" style="
            flex: 1;
            margin-right: 8px;
            accent-color: #06b6d4;
          ">
          <span id="responsiveness-display" style="color: #94a3b8; font-size: 10px; min-width: 30px;">70%</span>
        </div>
      </div>
      <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(100, 120, 200, 0.2);">
        <h5 style="margin: 0 0 8px 0; color: #94a3b8; font-size: 10px;">📊 Effects Status</h5>
        <div id="cosmic-effects-status" style="font-size: 9px; line-height: 1.3; color: #6b7280;">
          No audio data available
        </div>
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(100, 120, 200, 0.2);">
        <h5 style="margin: 0 0 8px 0; color: #94a3b8; font-size: 10px;">🧪 Test Effects</h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
          <button id="test-portal" style="padding: 4px; border: none; border-radius: 4px; background: #06b6d4; color: white; cursor: pointer; font-size: 9px;">Portal</button>
          <button id="test-plasma" style="padding: 4px; border: none; border-radius: 4px; background: #10b981; color: white; cursor: pointer; font-size: 9px;">Plasma</button>
          <button id="test-gravity" style="padding: 4px; border: none; border-radius: 4px; background: #f59e0b; color: white; cursor: pointer; font-size: 9px;">Gravity</button>
          <button id="test-nebulae" style="padding: 4px; border: none; border-radius: 4px; background: #8b5cf6; color: white; cursor: pointer; font-size: 9px;">Nebulae</button>
        </div>
      </div>
    `;

    console.log('Cosmic effects panel created');

    // Instrument Avatars Controls Panel 
    const avatarControlsEl = document.createElement('div');
    avatarControlsEl.className = 'avatar-controls-panel';
    avatarControlsEl.id = 'avatar-controls-panel';
    avatarControlsEl.style.cssText = `
      position: fixed;
      bottom: 350px;
      right: 20px;
      z-index: 1000;
      background: rgba(20, 25, 40, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 15px;
      border: 1px solid rgba(100, 120, 200, 0.3);
      color: #e0e5ff;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      min-width: 280px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    
    avatarControlsEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
        <h4 style="margin: 0; color: #8b5cf6; font-size: 12px;">🎭 Instrument Avatars</h4>
        <button id="avatar-controls-pin" class="pin-button" style="
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 12px;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        " title="Pin/Unpin Panel">📌</button>
      </div>
      <div class="avatar-toggles" style="display: grid; gap: 8px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="drums-avatar-enabled" checked style="margin-right: 8px; accent-color: #ef4444;">
          <span style="color: #e0e5ff;">🥁 Drums Avatar</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="guitar-avatar-enabled" checked style="margin-right: 8px; accent-color: #22c55e;">
          <span style="color: #e0e5ff;">🎸 Guitar Avatar</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="bass-avatar-enabled" checked style="margin-right: 8px; accent-color: #3b82f6;">
          <span style="color: #e0e5ff;">🎵 Bass Avatar</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="vocals-avatar-enabled" checked style="margin-right: 8px; accent-color: #facc15;">
          <span style="color: #e0e5ff;">🎤 Vocals Avatar</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="piano-avatar-enabled" checked style="margin-right: 8px; accent-color: #ec4899;">
          <span style="color: #e0e5ff;">🎹 Piano Avatar</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="strings-avatar-enabled" checked style="margin-right: 8px; accent-color: #06b6d4;">
          <span style="color: #e0e5ff;">🎻 Strings Avatar</span>
        </label>
      </div>
      <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(100, 120, 200, 0.2);">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="color: #94a3b8; font-size: 10px; margin-right: 8px;">Opacity:</span>
          <input type="range" id="avatar-opacity" min="0" max="100" value="80" style="
            flex: 1;
            margin-right: 8px;
            accent-color: #8b5cf6;
          ">
          <span id="avatar-opacity-display" style="color: #94a3b8; font-size: 10px; min-width: 30px;">80%</span>
        </div>
        <div style="display: flex; align-items: center;">
          <span style="color: #94a3b8; font-size: 10px; margin-right: 8px;">Movement:</span>
          <input type="range" id="avatar-movement" min="0" max="100" value="70" style="
            flex: 1;
            margin-right: 8px;
            accent-color: #06b6d4;
          ">
          <span id="avatar-movement-display" style="color: #94a3b8; font-size: 10px; min-width: 30px;">70%</span>
        </div>
      </div>
      <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(100, 120, 200, 0.2);">
        <h5 style="margin: 0 0 8px 0; color: #94a3b8; font-size: 10px;">👻 Avatar Status</h5>
        <div id="avatar-status" style="font-size: 9px; line-height: 1.3; color: #6b7280;">
          No instrument detection data
        </div>
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(100, 120, 200, 0.2);">
        <h5 style="margin: 0 0 8px 0; color: #94a3b8; font-size: 10px;">🧪 Test Avatars</h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;">
          <button id="test-drums-avatar" style="padding: 4px; border: none; border-radius: 4px; background: #ef4444; color: white; cursor: pointer; font-size: 9px;">🥁</button>
          <button id="test-guitar-avatar" style="padding: 4px; border: none; border-radius: 4px; background: #22c55e; color: white; cursor: pointer; font-size: 9px;">🎸</button>
          <button id="test-bass-avatar" style="padding: 4px; border: none; border-radius: 4px; background: #3b82f6; color: white; cursor: pointer; font-size: 9px;">🎵</button>
          <button id="test-vocals-avatar" style="padding: 4px; border: none; border-radius: 4px; background: #facc15; color: white; cursor: pointer; font-size: 9px;">🎤</button>
          <button id="test-piano-avatar" style="padding: 4px; border: none; border-radius: 4px; background: #ec4899; color: white; cursor: pointer; font-size: 9px;">🎹</button>
          <button id="test-strings-avatar" style="padding: 4px; border: none; border-radius: 4px; background: #06b6d4; color: white; cursor: pointer; font-size: 9px;">🎻</button>
        </div>
      </div>
    `;

    console.log('Avatar controls panel created');

    // 3D Visualizer Container - reuse existing or create new
    this.visualizerContainerEl = document.getElementById('visualizer-container') as HTMLDivElement;
    if (!this.visualizerContainerEl) {
      console.log('Creating new visualizer container');
      this.visualizerContainerEl = document.createElement('div');
      this.visualizerContainerEl.id = 'visualizer-container';
    } else {
      console.log('Reusing existing visualizer container');
      this.visualizerContainerEl.innerHTML = ''; // Clear existing content
    }
    
    this.visualizerContainerEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
    `;

    console.log('Visualizer container prepared');

    // Add elements to DOM
    document.body.appendChild(this.visualizerContainerEl);
    document.body.appendChild(this.audioControlsEl);
    document.body.appendChild(this.featuresDisplayEl);
    document.body.appendChild(extendedFeaturesEl);
    document.body.appendChild(cosmicEffectsEl);
    document.body.appendChild(avatarControlsEl);

    console.log('=== UI ELEMENTS ADDED TO DOM ===');
    console.log('Audio controls element:', !!document.getElementById('audio-controls'));
    console.log('Test tone button element:', !!document.getElementById('testToneBtn'));
    console.log('Play button element:', !!document.getElementById('playBtn'));
  }

  private initializeVisualizer(): void {
    const visualizerContainer = document.getElementById('visualizer-container');
    if (visualizerContainer) {
      // Clear existing content
      visualizerContainer.innerHTML = '';
      
      try {
        // Create the Three.js visualizer
        this.visualizer = new MusicVisualizer(visualizerContainer);
        this.visualizer.start();
        console.log('3D Music Visualizer initialized successfully');
      } catch (error) {
        console.error('Failed to initialize 3D visualizer:', error);
        // Fallback to placeholder
        visualizerContainer.innerHTML = `
          <div class="visualizer-placeholder">
            <h3>3D Visualizer Failed to Load</h3>
            <p>Using fallback 2D visualization</p>
            <div id="frequency-display"></div>
          </div>
        `;
      }
    }
  }

  private setupUI(): void {
    const controlsPanel = document.getElementById('controls-panel');
    if (controlsPanel) {
      controlsPanel.innerHTML = `
        <div class="controls-container">
          <div class="audio-controls">
            <button id="load-file-btn" class="control-btn">Load Audio File</button>
            <button id="start-mic-btn" class="control-btn">Start Microphone</button>
            <button id="stop-btn" class="control-btn">Stop</button>
            <button id="pause-btn" class="control-btn">Pause</button>
            <button id="resume-btn" class="control-btn">Resume</button>
          </div>
          <div class="audio-info">
            <div id="current-source">No audio source</div>
            <div id="audio-features">Waiting for audio data...</div>
          </div>
        </div>
      `;

      this.setupEventListeners();
    }
  }

  private setupEventListeners(): void {
    console.log('=== SETTING UP EVENT LISTENERS ===');
    
    // File input handling
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    console.log('File input element found:', !!fileInput);
    fileInput?.addEventListener('change', async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('File selected:', {
          name: file.name,
          type: file.type,
          size: file.size,
          isWav: file.name.toLowerCase().endsWith('.wav')
        });
        
        // More lenient file type checking - prioritize file extension
        const isWavFile = file.name.toLowerCase().endsWith('.wav') || 
                         file.type.includes('wav') || 
                         file.type.includes('audio');
                         
        if (isWavFile) {
          await this.loadAudioFile(file);
        } else {
          this.updateStatus('❌ Please select a WAV audio file (.wav)');
          console.error('Invalid file type:', file.type);
        }
      }
    });

    // Audio control buttons
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const testToneBtn = document.getElementById('testToneBtn');
    
    console.log('Button elements found:', {
      playPauseBtn: !!playPauseBtn,
      stopBtn: !!stopBtn,
      testToneBtn: !!testToneBtn
    });
    
    if (!playPauseBtn || !stopBtn || !testToneBtn) {
      console.error('Missing button elements! DOM may not be ready yet.');
      console.log('DOM state:', {
        audioControlsInDOM: !!document.getElementById('audio-controls'),
        allButtons: {
          playPause: document.getElementById('playPauseBtn'),
          stop: document.getElementById('stopBtn'),
          test: document.getElementById('testToneBtn')
        }
      });
    }
    
    playPauseBtn?.addEventListener('click', async () => {
      console.log('=== PLAY/PAUSE BUTTON CLICKED ===');
      console.log('System state:', {
        isAudioLoaded: this.isAudioLoaded,
        currentFileName: this.currentFileName,
        audioPlayerExists: !!this.audioPlayer,
        visualizerExists: !!this.visualizer,
        isCurrentlyPlaying: this.audioPlayer.isCurrentlyPlaying()
      });
      
      if (!this.isAudioLoaded) {
        console.log('No audio file loaded');
        this.updateStatus('⚠️ No audio file loaded - Please select a WAV file first');
        return;
      }

      const isCurrentlyPlaying = this.audioPlayer.isCurrentlyPlaying();
      
      if (isCurrentlyPlaying) {
        // Currently playing, so pause
        console.log('Pausing audio...');
        this.audioPlayer.pause();
        this.stopProgressUpdates();
        this.updatePlayPauseButton(false);
        this.updateStatus('⏸ Audio paused');
      } else {
        // Currently not playing, so play
        try {
          console.log('Starting/resuming audio playback...');
          this.updateStatus('🎵 Starting playback...');
          
          await this.audioPlayer.play();
          this.startProgressUpdates();
          this.updatePlayPauseButton(true);
          
          console.log('AudioPlayer.play() completed successfully');
          this.updateStatus('🎵 Playing audio - Listen for sound!');
          
          // Verify playback state
          setTimeout(() => {
            const isPlaying = this.audioPlayer.isCurrentlyPlaying();
            console.log('Playback verification:', {
              isCurrentlyPlaying: isPlaying,
              currentTime: this.audioPlayer.getCurrentTime(),
              duration: this.audioPlayer.getDuration()
            });
            
            if (!isPlaying) {
              console.error('Audio should be playing but isCurrentlyPlaying() returns false');
              this.updateStatus('⚠️ Audio may not be playing - Check console for details');
              this.updatePlayPauseButton(false);
            }
          }, 500);
          
        } catch (error) {
          console.error('=== PLAYBACK ERROR ===');
          console.error('Playback failed:', error);
          this.updateStatus(`❌ Playback error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          this.updatePlayPauseButton(false);
        }
      }
    });

    stopBtn?.addEventListener('click', () => {
      console.log('Stop button clicked');
      this.audioPlayer.stop();
      this.stopProgressUpdates();
      this.resetProgress();
      this.updatePlayPauseButton(false);
      this.updateStatus('Audio stopped');
    });

    // Test tone button
    testToneBtn?.addEventListener('click', async () => {
      console.log('=== TEST TONE BUTTON CLICKED ===');
      await this.playTestTone();
    });
    
    // Confirm event listeners are attached
    const attachedListeners = {
      fileInput: !!fileInput,
      playPauseBtn: !!playPauseBtn,
      stopBtn: !!stopBtn,
      testToneBtn: !!testToneBtn
    };
    
    console.log('=== EVENT LISTENERS ATTACHED ===', attachedListeners);
    
    if (Object.values(attachedListeners).every(v => v)) {
      console.log('✅ All event listeners successfully attached!');
    } else {
      console.error('❌ Some event listeners failed to attach!', attachedListeners);
    }

    // Setup cosmic effects controls
    this.setupCosmicEffectsControls();
    
    // Setup avatar controls
    this.setupAvatarControls();
    
    // Setup smart UI auto-hide functionality
    this.setupSmartUIHiding();

    // Progress control
    const progressSlider = document.getElementById('progressSlider') as HTMLInputElement;
    let isUserSeeking = false;
    
    progressSlider?.addEventListener('mousedown', () => {
      isUserSeeking = true;
      console.log('User started seeking');
    });
    
    progressSlider?.addEventListener('mouseup', () => {
      if (isUserSeeking && this.isAudioLoaded) {
        const seekPercent = parseInt(progressSlider.value);
        const duration = this.audioPlayer.getDuration();
        const seekTime = (seekPercent / 100) * duration;
        
        console.log(`Seeking to ${seekTime.toFixed(2)}s (${seekPercent}%)`);
        this.audioPlayer.seek(seekTime);
      }
      isUserSeeking = false;
    });
    
    progressSlider?.addEventListener('input', (event) => {
      if (isUserSeeking && this.isAudioLoaded) {
        const seekPercent = parseInt((event.target as HTMLInputElement).value);
        const duration = this.audioPlayer.getDuration();
        const seekTime = (seekPercent / 100) * duration;
        
        // Update time display while dragging
        this.updateTimeDisplay(seekTime, duration);
      }
    });

    // Volume control
    const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
    const volumeDisplay = document.getElementById('volumeDisplay') as HTMLSpanElement;
    
    volumeSlider?.addEventListener('input', (event) => {
      const volume = parseInt((event.target as HTMLInputElement).value);
      const volumeNormalized = volume / 100;
      this.audioPlayer.setVolume(volumeNormalized);
      
      if (volumeDisplay) {
        volumeDisplay.textContent = `${volume}%`;
      }
    });

    // Legacy button handlers for compatibility
    document.getElementById('load-file-btn')?.addEventListener('click', async () => {
      try {
        const result = await window.electronAPI.openFileDialog();
        if (result.success && !result.canceled) {
          console.log('Loading file:', result.filePath);
          const loadResult = await window.electronAPI.audio.loadFile(result.filePath);
          if (loadResult.success) {
            this.updateStatus('File loaded successfully');
          } else {
            this.updateStatus(`Error loading file: ${loadResult.error}`);
          }
        }
      } catch (error) {
        console.error('Error loading file:', error);
        this.updateStatus('Error opening file dialog');
      }
    });

    document.getElementById('start-mic-btn')?.addEventListener('click', async () => {
      try {
        const result = await window.electronAPI.audio.startMicrophoneCapture();
        if (result.success) {
          this.updateStatus('Microphone started');
        } else {
          this.updateStatus(`Microphone error: ${result.error}`);
        }
      } catch (error) {
        console.error('Error starting microphone:', error);
        this.updateStatus('Error starting microphone');
      }
    });

    document.getElementById('pause-btn')?.addEventListener('click', async () => {
      await window.electronAPI.audio.pause();
      this.updateStatus('Audio paused');
    });

    document.getElementById('resume-btn')?.addEventListener('click', async () => {
      await window.electronAPI.audio.resume();
      this.updateStatus('Audio resumed');
    });
  }

  private async playTestTone(): Promise<void> {
    console.log('=== TEST TONE BUTTON CLICKED ===');
    console.log('Starting audio system test...');
    
    try {
      this.updateStatus('🔊 Testing audio system...');
      
      // Try to use the existing audio player's context first, fall back to new context
      let testContext: AudioContext;
      
      if (this.audioPlayer && (this.audioPlayer as any).audioContext) {
        console.log('Using existing audio context from AudioPlayer');
        testContext = (this.audioPlayer as any).audioContext;
      } else {
        console.log('Creating new audio context for test tone');
        testContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      console.log('Test context state:', testContext.state);
      console.log('Test context sample rate:', testContext.sampleRate);
      
      // Ensure audio context is running
      if (testContext.state === 'suspended') {
        console.log('Audio context is suspended, attempting to resume...');
        await testContext.resume();
        console.log('Audio context resumed, new state:', testContext.state);
      }
      
      if (testContext.state !== 'running') {
        throw new Error(`Audio context failed to start (state: ${testContext.state})`);
      }
      
      console.log('Creating oscillator and gain nodes...');
      
      // Create oscillator for test tone
      const oscillator = testContext.createOscillator();
      const gainNode = testContext.createGain();
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(testContext.destination);
      
      // Configure test tone (440Hz A note)
      oscillator.frequency.setValueAtTime(440, testContext.currentTime);
      oscillator.type = 'sine';
      
      console.log('Setting up tone envelope...');
      
      // Create envelope (fade in/out to avoid clicks)
      const now = testContext.currentTime;
      const fadeTime = 0.05; // 50ms fade
      const duration = 1.0; // 1 second total
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + fadeTime); // Fade in
      gainNode.gain.linearRampToValueAtTime(0.15, now + duration - fadeTime); // Hold
      gainNode.gain.linearRampToValueAtTime(0, now + duration); // Fade out
      
      console.log('Starting oscillator...');
      console.log('Tone will play from', now, 'to', now + duration);
      
      // Set up completion handler
      let completed = false;
      const cleanup = () => {
        if (!completed) {
          completed = true;
          console.log('=== TEST TONE COMPLETED ===');
          
          // Close context only if we created it
          if (!(this.audioPlayer && (this.audioPlayer as any).audioContext === testContext)) {
            console.log('Closing temporary test context');
            testContext.close();
          }
          
          this.updateStatus('✅ Audio test completed - You should have heard a 1-second tone at 440Hz');
        }
      };
      
      oscillator.onended = cleanup;
      
      // Start the oscillator
      oscillator.start(now);
      oscillator.stop(now + duration);
      
      console.log('Test tone started successfully');
      this.updateStatus('🎵 Playing test tone (440Hz for 1 second)...');
      
      // Fallback timeout in case onended doesn't fire
      setTimeout(() => {
        cleanup();
      }, duration * 1000 + 500); // Add 500ms buffer
      
    } catch (error) {
      console.error('=== TEST TONE FAILED ===');
      console.error('Error details:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      
      let errorMessage = 'Unknown audio error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      if (errorMessage.includes('suspended') || errorMessage.includes('not allowed')) {
        this.updateStatus('❌ Audio blocked by browser - Try clicking in the app first, then test again');
      } else if (errorMessage.includes('context')) {
        this.updateStatus('❌ Audio context error - Your browser may not support Web Audio API');
      } else {
        this.updateStatus(`❌ Audio test failed: ${errorMessage}`);
      }
    }
  }

  private async loadAudioFile(file: File): Promise<void> {
    try {
      this.updateStatus('Loading audio file...');
      
      console.log('=== LOADING AUDIO FILE ===');
      console.log('File details:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        lastModified: new Date(file.lastModified)
      });
      
      // Basic validation - just check file extension and size
      if (!file.name.toLowerCase().endsWith('.wav')) {
        throw new Error('Please select a WAV audio file (.wav extension required)');
      }
      
      // Check file size (limit to 100MB for performance)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        throw new Error('File too large. Please select a file smaller than 100MB');
      }
      
      if (file.size < 1000) { // Less than 1KB
        throw new Error('File too small. Please select a valid audio file');
      }
      
      // Read file as ArrayBuffer
      console.log('Reading file as ArrayBuffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('ArrayBuffer created successfully, size:', arrayBuffer.byteLength);
      
      // Load into AudioPlayer
      console.log('Loading into AudioPlayer...');
      await this.audioPlayer.loadAudioFile(arrayBuffer);
      
      this.isAudioLoaded = true;
      this.currentFileName = file.name;
      
      const duration = this.audioPlayer.getDuration();
      this.updateStatus(`✅ Loaded: ${file.name} (${duration.toFixed(1)}s) - Click Play to start`);
      
      // Initialize progress display
      this.updateTimeDisplay(0, duration);
      this.resetProgress();
      this.updatePlayPauseButton(false); // Reset to play state
      
      console.log('=== AUDIO FILE LOADED SUCCESSFULLY ===');
      console.log('Duration:', duration, 'seconds');
      console.log('Ready to play!');
      
    } catch (error) {
      console.error('=== AUDIO FILE LOADING FAILED ===');
      console.error('Error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading audio file';
      this.updateStatus(`❌ Error: ${errorMessage}`);
      this.isAudioLoaded = false;
    }
  }

  private setupAudioEventListeners(): void {
    // Listen for all audio events
    window.electronAPI.onAudioEvent((event: string, data: any) => {
      switch (event) {
        case 'source-changed':
          this.updateCurrentSource(data);
          break;
        case 'features-extracted':
          this.updateAudioFeatures(data);
          this.updateFeaturesDisplay(data.features);
          break;
        case 'extended-features-extracted':
          this.extendedFeatures = data;
          this.updateExtendedFeaturesDisplay();
          break;
        case 'data-available':
          // Handle raw audio data if needed
          break;
        case 'error':
          this.updateStatus(`Audio error: ${data.message}`);
          break;
      }
    });
  }

  private updateCurrentSource(source: any): void {
    const sourceElement = document.getElementById('current-source');
    if (sourceElement && source) {
      sourceElement.textContent = `Source: ${source.name} (${source.type})`;
    }
  }

  private updateAudioFeatures(analysisResult: any): void {
    this.audioFeatures = analysisResult;
    
    // Update the 3D visualizer with audio features
    if (this.visualizer && analysisResult?.features) {
      this.visualizer.updateAudioFeatures(analysisResult.features);
    }

    const featuresElement = document.getElementById('audio-features');
    if (featuresElement && analysisResult?.features) {
      const features = analysisResult.features;
      featuresElement.innerHTML = `
        <div class="features-grid">
          <span>Bass: ${features.bassLevel.toFixed(3)}</span>
          <span>Mid: ${features.midLevel.toFixed(3)}</span>
          <span>Treble: ${features.trebleLevel.toFixed(3)}</span>
          <span>Overall: ${features.overallLevel.toFixed(3)}</span>
          <span>Beat: ${features.beatDetected ? 'Yes' : 'No'}</span>
          <span>Tempo: ${features.tempo.toFixed(1)} BPM</span>
        </div>
      `;
    }

    // Update cosmic effects status display
    this.updateCosmicEffectsStatus(analysisResult?.features);

    // Update avatar status display
    this.updateAvatarStatus(analysisResult?.features);

    // Fallback frequency visualization if 3D failed
    this.updateFrequencyDisplay(analysisResult?.frequencyData);
  }

  private updateCosmicEffectsStatus(features: any): void {
    const statusElement = document.getElementById('cosmic-effects-status');
    if (!statusElement || !this.visualizer) return;

    const cosmicEffects = (this.visualizer as any).getCosmicEffects?.();
    if (!cosmicEffects) {
      statusElement.innerHTML = 'Cosmic effects not initialized';
      return;
    }

    const performanceInfo = cosmicEffects.getPerformanceInfo();
    const config = cosmicEffects.getCurrentConfig();

    if (!config || !performanceInfo) {
      statusElement.innerHTML = 'Status unavailable';
      return;
    }

    const statusLines = [
      `🎚️ Int: ${(config.intensity * 100).toFixed(0)}% | Resp: ${(config.responsiveness * 100).toFixed(0)}%`,
      `🌫️ Nebulae: ${config.nebulaeEnabled ? '✅' : '❌'} (${performanceInfo.nebulaeParticles} particles)`,
      `🌀 Portals: ${config.portalsEnabled ? '✅' : '❌'} (${performanceInfo.activePortals} active)`,
      `⚡ Plasma: ${config.plasmaEnabled ? '✅' : '❌'} (${performanceInfo.activePlasma} active)`,
      `🕳️ Gravity: ${config.gravityEnabled ? '✅' : '❌'} (${performanceInfo.activeGravity} active)`
    ];

    // Add performance indicator
    const fpsColor = performanceInfo.avgFPS > 50 ? '#10b981' : 
                     performanceInfo.avgFPS > 30 ? '#f59e0b' : '#ef4444';
    statusLines.push(`<span style="color: ${fpsColor};">⚡ ${performanceInfo.avgFPS} FPS</span>`);

    statusElement.innerHTML = statusLines.join('<br>');
  }

  private updateAvatarStatus(features: any): void {
    const statusElement = document.getElementById('avatar-status');
    if (!statusElement || !this.visualizer) return;

    const avatarManager = (this.visualizer as any).getAvatarManager?.();
    if (!avatarManager) {
      statusElement.innerHTML = 'Avatar system not initialized';
      return;
    }

    const performanceInfo = avatarManager.getPerformanceInfo();
    const activeAvatars = avatarManager.getActiveAvatars();

    if (!performanceInfo || !activeAvatars) {
      statusElement.innerHTML = 'Status unavailable';
      return;
    }

    const statusLines = [
      `👻 Active: ${performanceInfo.activeAvatars}/6 avatars`,
      `🔺 Vertices: ${performanceInfo.totalVertices}`,
      `⚡ Orbit radius: ${performanceInfo.orbitRadius}m`
    ];

    // Show which avatars are currently active
    const activeList = Object.entries(activeAvatars)
      .filter(([_, active]) => active)
      .map(([name, _]) => {
        const emoji = {
          drums: '🥁',
          guitar: '🎸', 
          bass: '🎵',
          vocals: '🎤',
          piano: '🎹',
          strings: '🎻'
        }[name] || '🎭';
        return emoji;
      })
      .join(' ');

    if (activeList) {
      statusLines.push(`🎭 Visible: ${activeList}`);
    } else {
      statusLines.push('💭 No avatars currently visible');
    }

    statusElement.innerHTML = statusLines.join('<br>');
  }

  private updateFrequencyDisplay(frequencyData: any): void {
    const displayElement = document.getElementById('frequency-display');
    if (displayElement && frequencyData?.amplitudes) {
      // Create a simple bar visualization
      const amplitudes = frequencyData.amplitudes;
      const barCount = Math.min(32, amplitudes.length); // Show first 32 frequency bins
      const maxHeight = 50;

      let html = '<div class="frequency-bars">';
      for (let i = 0; i < barCount; i++) {
        const height = Math.min(amplitudes[i] * 1000, maxHeight); // Scale for visibility
        html += `<div class="freq-bar" style="height: ${height}px"></div>`;
      }
      html += '</div>';

      displayElement.innerHTML = html;
    }
  }

  private updateExtendedFeaturesDisplay(): void {
    if (!this.extendedFeatures) return;

    // Update instrument detection display
    const instrumentsEl = document.getElementById('instruments-display');
    if (instrumentsEl && this.extendedFeatures.instrumentDetection) {
      const instruments = this.extendedFeatures.instrumentDetection;
      instrumentsEl.innerHTML = `
        <div style="line-height: 1.3;">
          🥁 Drums: ${this.formatPercentage(instruments.drums)}
          🎸 Guitar: ${this.formatPercentage(instruments.guitar)}
          🎵 Bass: ${this.formatPercentage(instruments.bass)}
          🎤 Vocals: ${this.formatPercentage(instruments.vocals)}
          🎹 Piano: ${this.formatPercentage(instruments.piano)}
          🎻 Strings: ${this.formatPercentage(instruments.strings)}
        </div>
      `;
    }

    // Update spectral features display
    const spectralEl = document.getElementById('spectral-display');
    if (spectralEl) {
      spectralEl.innerHTML = `
        <div style="line-height: 1.3;">
          Centroid: ${this.formatFrequency(this.extendedFeatures.spectralCentroid)}
          Rolloff: ${this.formatFrequency(this.extendedFeatures.spectralRolloff)}
          Flux: ${this.formatNumber(this.extendedFeatures.spectralFlux)}
          ZCR: ${this.formatNumber(this.extendedFeatures.zeroCrossingRate)}
        </div>
      `;
    }

    // Update musical analysis display
    const musicalEl = document.getElementById('musical-display');
    if (musicalEl) {
      musicalEl.innerHTML = `
        <div style="line-height: 1.3;">
          Key: ${this.extendedFeatures.musicalKey || 'Unknown'}
          Time: ${this.extendedFeatures.timeSignature || '4/4'}
          Complexity: ${this.formatPercentage(this.extendedFeatures.rhythmComplexity)}
          Beat Strength: ${this.formatPercentage(this.extendedFeatures.beatStrength)}
          Tempo Stability: ${this.formatPercentage(this.extendedFeatures.tempoStability)}
        </div>
      `;
    }

    // Update dynamic features display
    const dynamicEl = document.getElementById('dynamic-display');
    if (dynamicEl) {
      dynamicEl.innerHTML = `
        <div style="line-height: 1.3;">
          RMS: ${this.formatNumber(this.extendedFeatures.rms)}
          Peak: ${this.formatNumber(this.extendedFeatures.peak)}
          Dynamic Range: ${this.formatNumber(this.extendedFeatures.dynamicRange)}
          ${this.extendedFeatures.onsetDetection ? '🎯 Onset!' : ''}
        </div>
      `;
    }
  }

  private updateFeaturesDisplay(features: any): void {
    const featuresContent = document.getElementById('features-content');
    if (featuresContent && features) {
      featuresContent.innerHTML = `
        <div style="line-height: 1.4;">
          <div style="margin-bottom: 8px;">
            <span style="color: #ef4444;">🔴 Bass:</span> ${features.bassLevel.toFixed(3)}
            <span style="color: #10b981; margin-left: 10px;">🟢 Mid:</span> ${features.midLevel.toFixed(3)}
            <span style="color: #3b82f6; margin-left: 10px;">🔵 Treble:</span> ${features.trebleLevel.toFixed(3)}
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #8b5cf6;">📊 Overall:</span> ${features.overallLevel.toFixed(3)}
            <span style="color: #f59e0b; margin-left: 10px;">🎵 Dominant:</span> ${Math.round(features.dominantFrequency)} Hz
          </div>
          <div>
            <span style="color: ${features.beatDetected ? '#10b981' : '#6b7280'};">
              ${features.beatDetected ? '🥁 Beat!' : '⚪ No Beat'}
            </span>
            <span style="color: #06b6d4; margin-left: 10px;">⏱ Tempo:</span> ${features.tempo.toFixed(1)} BPM
          </div>
        </div>
      `;
    }
  }

  // Helper formatting functions
  private formatPercentage(value: number | undefined): string {
    if (value === undefined) return '0%';
    return `${Math.round(value * 100)}%`;
  }

  private formatFrequency(value: number | undefined): string {
    if (value === undefined) return '0 Hz';
    if (value > 1000) {
      return `${(value / 1000).toFixed(1)}k Hz`;
    }
    return `${Math.round(value)} Hz`;
  }

  private formatNumber(value: number | undefined): string {
    if (value === undefined) return '0';
    if (value < 0.01) {
      return value.toExponential(2);
    }
    return value.toFixed(3);
  }

  private updateStatus(message: string): void {
    console.log('Status:', message);
    
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.color = '#94a3b8'; // Default color
      
      // Add color coding for different message types
      if (message.includes('Error') || message.includes('Failed')) {
        statusElement.style.color = '#ef4444'; // Red for errors
      } else if (message.includes('Playing') || message.includes('Loaded')) {
        statusElement.style.color = '#10b981'; // Green for success
      } else if (message.includes('Paused') || message.includes('Stopped')) {
        statusElement.style.color = '#f59e0b'; // Orange for paused/stopped
      }
    }
  }

  private startProgressUpdates(): void {
    this.stopProgressUpdates(); // Clear any existing interval
    
    this.progressUpdateInterval = window.setInterval(() => {
      if (this.audioPlayer.isCurrentlyPlaying() && this.isAudioLoaded) {
        const currentTime = this.audioPlayer.getCurrentTime();
        const duration = this.audioPlayer.getDuration();
        this.updateProgress(currentTime, duration);
      }
    }, 100); // Update every 100ms for smooth progress
  }

  private stopProgressUpdates(): void {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = null;
    }
  }

  private updateProgress(currentTime: number, duration: number): void {
    const progressSlider = document.getElementById('progressSlider') as HTMLInputElement;
    
    if (progressSlider && duration > 0) {
      const progressPercent = (currentTime / duration) * 100;
      progressSlider.value = progressPercent.toString();
      
      // Update the visual progress bar background
      progressSlider.style.background = `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${progressPercent}%, rgba(30, 35, 50, 0.8) ${progressPercent}%)`;
    }
    
    this.updateTimeDisplay(currentTime, duration);
  }

  private updateTimeDisplay(currentTime: number, duration: number): void {
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    
    if (currentTimeEl) {
      currentTimeEl.textContent = this.formatTime(currentTime);
    }
    
    if (totalTimeEl) {
      totalTimeEl.textContent = this.formatTime(duration);
    }
  }

  private resetProgress(): void {
    const progressSlider = document.getElementById('progressSlider') as HTMLInputElement;
    
    if (progressSlider) {
      progressSlider.value = '0';
      progressSlider.style.background = `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 0%, rgba(30, 35, 50, 0.8) 0%)`;
    }
    
    this.updateTimeDisplay(0, this.audioPlayer.getDuration());
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private updatePlayPauseButton(isPlaying: boolean): void {
    const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
    if (playPauseBtn) {
      if (isPlaying) {
        playPauseBtn.innerHTML = '⏸ Pause';
        playPauseBtn.style.background = '#f59e0b';
      } else {
        playPauseBtn.innerHTML = '▶ Play';
        playPauseBtn.style.background = '#10b981';
      }
    }
  }

  private setupCosmicEffectsControls(): void {
    console.log('Setting up cosmic effects controls...');

    // Cosmic effects toggles
    const nebulaeCheckbox = document.getElementById('nebulae-enabled') as HTMLInputElement;
    const portalsCheckbox = document.getElementById('portals-enabled') as HTMLInputElement;
    const plasmaCheckbox = document.getElementById('plasma-enabled') as HTMLInputElement;
    const gravityCheckbox = document.getElementById('gravity-enabled') as HTMLInputElement;

    // Intensity and responsiveness sliders
    const intensitySlider = document.getElementById('cosmic-intensity') as HTMLInputElement;
    const responsivenessSlider = document.getElementById('cosmic-responsiveness') as HTMLInputElement;
    const intensityDisplay = document.getElementById('intensity-display') as HTMLSpanElement;
    const responsivenessDisplay = document.getElementById('responsiveness-display') as HTMLSpanElement;

    // Function to update cosmic effects configuration
    const updateCosmicConfig = () => {
      if (this.visualizer) {
        const cosmicEffects = (this.visualizer as any).getCosmicEffects?.();
        if (cosmicEffects) {
          const config = {
            nebulaeEnabled: nebulaeCheckbox?.checked ?? true,
            portalsEnabled: portalsCheckbox?.checked ?? true,
            plasmaEnabled: plasmaCheckbox?.checked ?? true,
            gravityEnabled: gravityCheckbox?.checked ?? true,
            intensity: (intensitySlider?.value ? parseInt(intensitySlider.value) : 80) / 100,
            responsiveness: (responsivenessSlider?.value ? parseInt(responsivenessSlider.value) : 70) / 100
          };
          
          cosmicEffects.updateConfiguration(config);
          console.log('Cosmic effects config updated:', config);
        }
      }
    };

    // Add event listeners for checkboxes
    nebulaeCheckbox?.addEventListener('change', updateCosmicConfig);
    portalsCheckbox?.addEventListener('change', updateCosmicConfig);
    plasmaCheckbox?.addEventListener('change', updateCosmicConfig);
    gravityCheckbox?.addEventListener('change', updateCosmicConfig);

    // Add event listeners for sliders
    intensitySlider?.addEventListener('input', (event) => {
      const value = (event.target as HTMLInputElement).value;
      if (intensityDisplay) {
        intensityDisplay.textContent = `${value}%`;
      }
      updateCosmicConfig();
    });

    responsivenessSlider?.addEventListener('input', (event) => {
      const value = (event.target as HTMLInputElement).value;
      if (responsivenessDisplay) {
        responsivenessDisplay.textContent = `${value}%`;
      }
      updateCosmicConfig();
    });

    // Test effect buttons
    const testPortal = document.getElementById('test-portal');
    const testPlasma = document.getElementById('test-plasma');
    const testGravity = document.getElementById('test-gravity');
    const testNebulae = document.getElementById('test-nebulae');

    testPortal?.addEventListener('click', () => {
      if (this.visualizer) {
        const cosmicEffects = (this.visualizer as any).getCosmicEffects?.();
        if (cosmicEffects) {
          cosmicEffects.triggerTestEffect('portal');
        }
      }
    });

    testPlasma?.addEventListener('click', () => {
      if (this.visualizer) {
        const cosmicEffects = (this.visualizer as any).getCosmicEffects?.();
        if (cosmicEffects) {
          cosmicEffects.triggerTestEffect('plasma');
        }
      }
    });

    testGravity?.addEventListener('click', () => {
      if (this.visualizer) {
        const cosmicEffects = (this.visualizer as any).getCosmicEffects?.();
        if (cosmicEffects) {
          cosmicEffects.triggerTestEffect('gravity');
        }
      }
    });

    testNebulae?.addEventListener('click', () => {
      if (this.visualizer) {
        const cosmicEffects = (this.visualizer as any).getCosmicEffects?.();
        if (cosmicEffects) {
          cosmicEffects.triggerTestEffect('nebulae');
        }
      }
    });

    console.log('Cosmic effects controls setup complete');
  }

  private setupAvatarControls(): void {
    console.log('Setting up avatar controls...');

    // Avatar toggles
    const drumsCheckbox = document.getElementById('drums-avatar-enabled') as HTMLInputElement;
    const guitarCheckbox = document.getElementById('guitar-avatar-enabled') as HTMLInputElement;
    const bassCheckbox = document.getElementById('bass-avatar-enabled') as HTMLInputElement;
    const vocalsCheckbox = document.getElementById('vocals-avatar-enabled') as HTMLInputElement;
    const pianoCheckbox = document.getElementById('piano-avatar-enabled') as HTMLInputElement;
    const stringsCheckbox = document.getElementById('strings-avatar-enabled') as HTMLInputElement;

    // Avatar sliders
    const opacitySlider = document.getElementById('avatar-opacity') as HTMLInputElement;
    const movementSlider = document.getElementById('avatar-movement') as HTMLInputElement;
    const opacityDisplay = document.getElementById('avatar-opacity-display') as HTMLSpanElement;
    const movementDisplay = document.getElementById('avatar-movement-display') as HTMLSpanElement;

    // Function to update avatar configuration
    const updateAvatarConfig = () => {
      if (this.visualizer) {
        const avatarManager = (this.visualizer as any).getAvatarManager?.();
        if (avatarManager) {
          const config = {
            masterEnabled: true,
            globalOpacity: (opacitySlider?.value ? parseInt(opacitySlider.value) : 80) / 100,
            movementSpeed: (movementSlider?.value ? parseInt(movementSlider.value) : 70) / 100,
            avatars: {
              drums: { enabled: drumsCheckbox?.checked ?? true, opacity: 0.8, scale: 1.0, movementSpeed: 1.2, particleIntensity: 0.7 },
              guitar: { enabled: guitarCheckbox?.checked ?? true, opacity: 0.7, scale: 1.0, movementSpeed: 1.0, particleIntensity: 0.6 },
              bass: { enabled: bassCheckbox?.checked ?? true, opacity: 0.8, scale: 1.2, movementSpeed: 0.8, particleIntensity: 0.8 },
              vocals: { enabled: vocalsCheckbox?.checked ?? true, opacity: 0.6, scale: 1.1, movementSpeed: 1.1, particleIntensity: 0.9 },
              piano: { enabled: pianoCheckbox?.checked ?? true, opacity: 0.7, scale: 1.0, movementSpeed: 0.9, particleIntensity: 0.5 },
              strings: { enabled: stringsCheckbox?.checked ?? true, opacity: 0.6, scale: 0.9, movementSpeed: 1.0, particleIntensity: 0.7 }
            }
          };
          
          avatarManager.updateConfiguration(config);
          console.log('Avatar config updated:', config);
        }
      }
    };

    // Add event listeners for checkboxes
    drumsCheckbox?.addEventListener('change', updateAvatarConfig);
    guitarCheckbox?.addEventListener('change', updateAvatarConfig);
    bassCheckbox?.addEventListener('change', updateAvatarConfig);
    vocalsCheckbox?.addEventListener('change', updateAvatarConfig);
    pianoCheckbox?.addEventListener('change', updateAvatarConfig);
    stringsCheckbox?.addEventListener('change', updateAvatarConfig);

    // Add event listeners for sliders
    opacitySlider?.addEventListener('input', (event) => {
      const value = (event.target as HTMLInputElement).value;
      if (opacityDisplay) {
        opacityDisplay.textContent = `${value}%`;
      }
      updateAvatarConfig();
    });

    movementSlider?.addEventListener('input', (event) => {
      const value = (event.target as HTMLInputElement).value;
      if (movementDisplay) {
        movementDisplay.textContent = `${value}%`;
      }
      updateAvatarConfig();
    });

    // Test avatar buttons
    const testDrums = document.getElementById('test-drums-avatar');
    const testGuitar = document.getElementById('test-guitar-avatar');
    const testBass = document.getElementById('test-bass-avatar');
    const testVocals = document.getElementById('test-vocals-avatar');
    const testPiano = document.getElementById('test-piano-avatar');
    const testStrings = document.getElementById('test-strings-avatar');

    testDrums?.addEventListener('click', () => {
      if (this.visualizer) {
        const avatarManager = (this.visualizer as any).getAvatarManager?.();
        if (avatarManager) {
          avatarManager.triggerAvatarEffect('drums', 0.8);
        }
      }
    });

    testGuitar?.addEventListener('click', () => {
      if (this.visualizer) {
        const avatarManager = (this.visualizer as any).getAvatarManager?.();
        if (avatarManager) {
          avatarManager.triggerAvatarEffect('guitar', 0.8);
        }
      }
    });

    testBass?.addEventListener('click', () => {
      if (this.visualizer) {
        const avatarManager = (this.visualizer as any).getAvatarManager?.();
        if (avatarManager) {
          avatarManager.triggerAvatarEffect('bass', 0.8);
        }
      }
    });

    testVocals?.addEventListener('click', () => {
      if (this.visualizer) {
        const avatarManager = (this.visualizer as any).getAvatarManager?.();
        if (avatarManager) {
          avatarManager.triggerAvatarEffect('vocals', 0.8);
        }
      }
    });

    testPiano?.addEventListener('click', () => {
      if (this.visualizer) {
        const avatarManager = (this.visualizer as any).getAvatarManager?.();
        if (avatarManager) {
          avatarManager.triggerAvatarEffect('piano', 0.8);
        }
      }
    });

    testStrings?.addEventListener('click', () => {
      if (this.visualizer) {
        const avatarManager = (this.visualizer as any).getAvatarManager?.();
        if (avatarManager) {
          avatarManager.triggerAvatarEffect('strings', 0.8);
        }
      }
    });

    console.log('Avatar controls setup complete');
  }

  private setupSmartUIHiding(): void {
    console.log('Setting up smart UI auto-hiding...');

    // Panel configurations
    const panels = [
      {
        id: 'audio-controls',
        pinButtonId: 'music-visualizer-pin',
        triggerArea: { left: 0, bottom: 0, width: 400, height: 200 }
      },
      {
        id: 'features-display',
        pinButtonId: 'audio-features-pin',
        triggerArea: { right: 0, top: 0, width: 300, height: 200 }
      },
      {
        id: 'extended-features-panel',
        pinButtonId: 'advanced-analysis-pin',
        triggerArea: { left: 0, bottom: 0, width: 650, height: 320 }
      },
      {
        id: 'cosmic-effects-panel',
        pinButtonId: 'cosmic-effects-pin',
        triggerArea: { right: 0, bottom: 0, width: 320, height: 450 }
      },
      {
        id: 'avatar-controls-panel',
        pinButtonId: 'avatar-controls-pin',
        triggerArea: { right: 0, bottom: 350, width: 320, height: 250 }
      }
    ];

    // State tracking
    const panelStates = new Map<string, { pinned: boolean; visible: boolean; timeout?: number }>();

    // Initialize panel states
    panels.forEach(panel => {
      panelStates.set(panel.id, { pinned: false, visible: true });
    });

    // Function to show/hide panel
    const setPanelVisibility = (panelId: string, visible: boolean, immediate = false) => {
      const panel = document.getElementById(panelId);
      const state = panelStates.get(panelId);
      
      if (!panel || !state) return;

      // Clear any existing timeout
      if (state.timeout) {
        clearTimeout(state.timeout);
        state.timeout = undefined;
      }

      state.visible = visible;

      if (visible) {
        // Show panel immediately
        panel.style.transition = immediate ? 'none' : 'opacity 0.3s ease, transform 0.3s ease';
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0) translateX(0)';
        panel.style.pointerEvents = 'auto';
      } else {
        // Hide panel with delay if not pinned
        if (!state.pinned) {
          const hidePanel = () => {
            panel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            panel.style.opacity = '0';
            
            // Different hide animations based on panel position
            if (panelId === 'features-display') {
              panel.style.transform = 'translateY(-20px) translateX(20px)';
            } else if (panelId === 'cosmic-effects-panel') {
              panel.style.transform = 'translateY(20px) translateX(20px)';
            } else {
              panel.style.transform = 'translateY(20px)';
            }
            
            panel.style.pointerEvents = 'none';
          };

          state.timeout = window.setTimeout(hidePanel, 1000); // 1 second delay
        }
      }
    };

    // Function to check if mouse is in trigger area
    const isInTriggerArea = (x: number, y: number, area: any) => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Calculate actual bounds
      const bounds = {
        left: area.left !== undefined ? area.left : windowWidth - (area.right || 0) - area.width,
        top: area.top !== undefined ? area.top : windowHeight - (area.bottom || 0) - area.height,
        width: area.width,
        height: area.height
      };

      return x >= bounds.left && 
             x <= bounds.left + bounds.width && 
             y >= bounds.top && 
             y <= bounds.top + bounds.height;
    };

    // Mouse move handler
    const handleMouseMove = (event: MouseEvent) => {
      const { clientX: x, clientY: y } = event;

      panels.forEach(panel => {
        const state = panelStates.get(panel.id);
        if (!state) return;

        const inArea = isInTriggerArea(x, y, panel.triggerArea);
        
        // Show panel if mouse is in area or panel is pinned
        if (inArea || state.pinned) {
          if (!state.visible) {
            setPanelVisibility(panel.id, true);
          }
        } else {
          if (state.visible && !state.pinned) {
            setPanelVisibility(panel.id, false);
          }
        }
      });
    };

    // Pin button handlers
    panels.forEach(panel => {
      const pinButton = document.getElementById(panel.pinButtonId);
      if (pinButton) {
        pinButton.addEventListener('click', () => {
          const state = panelStates.get(panel.id);
          if (!state) return;

          state.pinned = !state.pinned;
          
          // Update pin button appearance
          if (state.pinned) {
            pinButton.style.color = '#8b5cf6';
            pinButton.title = 'Unpin Panel';
            setPanelVisibility(panel.id, true, true);
          } else {
            pinButton.style.color = '#6b7280';
            pinButton.title = 'Pin Panel';
          }

          console.log(`Panel ${panel.id} ${state.pinned ? 'pinned' : 'unpinned'}`);
        });

        // Hover effect for pin button
        pinButton.addEventListener('mouseenter', () => {
          if (!panelStates.get(panel.id)?.pinned) {
            pinButton.style.color = '#9ca3af';
          }
        });

        pinButton.addEventListener('mouseleave', () => {
          if (!panelStates.get(panel.id)?.pinned) {
            pinButton.style.color = '#6b7280';
          }
        });
      }
    });

    // Add global mouse move listener
    document.addEventListener('mousemove', handleMouseMove);

    // Initially hide all unpinned panels after a delay
    setTimeout(() => {
      panels.forEach(panel => {
        const state = panelStates.get(panel.id);
        if (state && !state.pinned) {
          setPanelVisibility(panel.id, false);
        }
      });
    }, 3000); // 3 second initial delay

    console.log('Smart UI auto-hiding setup complete');
  }

  private destroy(): void {
    this.stopProgressUpdates();
    
    if (this.audioPlayer) {
      this.audioPlayer.destroy();
    }
    
    if (this.visualizer) {
      // Add cleanup if visualizer has destroy method
    }
  }
}

new MusicVisualizerRenderer();
