import * as THREE from 'three';
import { NebulaSystem } from './nebulae/NebulaSystem';
import { EnergyPortal } from './portals/EnergyPortal';
import { PlasmaWave } from './plasma/PlasmaWave';
import { GravitationalLens } from './gravity/GravitationalLens';

export interface CosmicEffectsConfig {
  nebulaeEnabled: boolean;
  portalsEnabled: boolean;
  plasmaEnabled: boolean;
  gravityEnabled: boolean;
  intensity: number; // 0.0 to 1.0
  responsiveness: number; // 0.0 to 1.0
}

export interface AudioData {
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  overallLevel: number;
  beatDetected: boolean;
  tempo: number;
  dominantFrequency: number;
  
  // Extended features
  spectralCentroid?: number;
  spectralRolloff?: number;
  spectralFlux?: number;
  instrumentDetection?: {
    drums: number;
    guitar: number;
    bass: number;
    vocals: number;
    piano: number;
    strings: number;
  };
}

export class CosmicEffectsManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private config: CosmicEffectsConfig;
  
  // Effect Systems
  private nebulaeSystem!: NebulaSystem;
  private energyPortals: EnergyPortal[] = [];
  private plasmaWaves: PlasmaWave[] = [];
  private gravitationalLenses: GravitationalLens[] = [];
  
  // Audio Analysis
  private audioHistory: AudioData[] = [];
  private readonly historyLength = 60; // 1 second at 60fps
  
  // Performance tracking
  private lastUpdateTime = 0;
  private frameCount = 0;
  private avgFPS = 60;
  
  // Effect pools for performance
  private portalPool: EnergyPortal[] = [];
  private plasmaPool: PlasmaWave[] = [];
  private readonly maxPortals = 5;
  private readonly maxPlasmaWaves = 8;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    this.config = {
      nebulaeEnabled: true,
      portalsEnabled: true,
      plasmaEnabled: true,
      gravityEnabled: true,
      intensity: 0.8,
      responsiveness: 0.7
    };

    this.initializeEffectSystems();
    this.initializeEffectPools();
  }

  private initializeEffectSystems(): void {
    // Initialize Nebulae System
    this.nebulaeSystem = new NebulaSystem(this.scene);
    
    console.log('CosmicEffectsManager: Effect systems initialized');
  }

  private initializeEffectPools(): void {
    // Pre-create portal effects for performance
    for (let i = 0; i < this.maxPortals; i++) {
      const portal = new EnergyPortal(this.scene);
      portal.setVisible(false);
      this.portalPool.push(portal);
    }

    // Pre-create plasma wave effects
    for (let i = 0; i < this.maxPlasmaWaves; i++) {
      const plasma = new PlasmaWave(this.scene);
      plasma.setVisible(false);
      this.plasmaPool.push(plasma);
    }

    console.log('CosmicEffectsManager: Effect pools initialized');
  }

  public updateAudioFeatures(audioData: AudioData): void {
    // Store audio history for analysis
    this.audioHistory.push(audioData);
    if (this.audioHistory.length > this.historyLength) {
      this.audioHistory.shift();
    }

    // Update performance tracking
    const now = performance.now();
    if (this.lastUpdateTime > 0) {
      const deltaTime = now - this.lastUpdateTime;
      const fps = 1000 / deltaTime;
      this.avgFPS = this.avgFPS * 0.9 + fps * 0.1; // Smooth FPS calculation
    }
    this.lastUpdateTime = now;
    this.frameCount++;

    // Update all effect systems with current audio data
    this.updateEffectSystems(audioData);
    
    // Trigger special effects based on audio analysis
    this.analyzeAudioTriggers(audioData);
  }

  private updateEffectSystems(audioData: AudioData): void {
    const deltaTime = 16.67; // Assume 60fps for now
    const intensity = this.config.intensity;
    const responsiveness = this.config.responsiveness;

    // Update Nebulae System - responds to bass and overall energy
    if (this.config.nebulaeEnabled && this.nebulaeSystem) {
      const nebulaeIntensity = audioData.bassLevel * 0.7 + audioData.overallLevel * 0.3;
      this.nebulaeSystem.update(deltaTime, nebulaeIntensity * intensity, audioData);
    }

    // Update active Energy Portals
    if (this.config.portalsEnabled) {
      this.energyPortals.forEach(portal => {
        if (portal.isActive()) {
          const portalIntensity = audioData.midLevel * 0.6 + audioData.overallLevel * 0.4;
          portal.update(deltaTime, portalIntensity * intensity, audioData);
        }
      });
    }

    // Update active Plasma Waves
    if (this.config.plasmaEnabled) {
      this.plasmaWaves.forEach(plasma => {
        if (plasma.isActive()) {
          const plasmaIntensity = audioData.trebleLevel * 0.8 + audioData.overallLevel * 0.2;
          plasma.update(deltaTime, plasmaIntensity * intensity, audioData);
        }
      });
    }

    // Update Gravitational Lenses
    if (this.config.gravityEnabled) {
      this.gravitationalLenses.forEach(lens => {
        if (lens.isActive()) {
          const gravityIntensity = audioData.overallLevel;
          lens.update(deltaTime, gravityIntensity * intensity, audioData);
        }
      });
    }
  }

  private analyzeAudioTriggers(audioData: AudioData): void {
    const responsiveness = this.config.responsiveness;

    // Beat Detection - Trigger Energy Portals
    if (audioData.beatDetected && this.config.portalsEnabled) {
      this.triggerEnergyPortal(audioData);
    }

    // High-frequency spikes - Trigger Plasma Waves
    if (audioData.trebleLevel > 0.7 && this.config.plasmaEnabled) {
      if (Math.random() < audioData.trebleLevel * responsiveness * 0.3) {
        this.triggerPlasmaWave(audioData);
      }
    }

    // Dramatic moments - Trigger Gravitational Lensing
    const energyGradient = this.calculateEnergyGradient();
    if (energyGradient > 0.5 && audioData.overallLevel > 0.6 && this.config.gravityEnabled) {
      if (Math.random() < energyGradient * responsiveness * 0.2) {
        this.triggerGravitationalLens(audioData);
      }
    }

    // Instrument-specific effects
    if (audioData.instrumentDetection) {
      this.handleInstrumentTriggers(audioData);
    }
  }

  private triggerEnergyPortal(audioData: AudioData): void {
    // Find an available portal from the pool
    const availablePortal = this.portalPool.find(portal => !portal.isActive());
    if (availablePortal) {
      // Position portal in 3D space
      const position = this.generateRandomPosition(15, 30);
      const intensity = audioData.overallLevel * this.config.intensity;
      
      availablePortal.trigger(position, intensity, audioData);
      
      // Add to active portals if not already there
      if (!this.energyPortals.includes(availablePortal)) {
        this.energyPortals.push(availablePortal);
      }

      console.log('Triggered Energy Portal at:', position);
    }
  }

  private triggerPlasmaWave(audioData: AudioData): void {
    // Find an available plasma wave from the pool
    const availablePlasma = this.plasmaPool.find(plasma => !plasma.isActive());
    if (availablePlasma) {
      // Position plasma wave in 3D space
      const startPos = this.generateRandomPosition(10, 25);
      const endPos = this.generateRandomPosition(10, 25);
      const intensity = audioData.trebleLevel * this.config.intensity;
      
      availablePlasma.trigger(startPos, endPos, intensity, audioData);
      
      // Add to active plasma waves if not already there
      if (!this.plasmaWaves.includes(availablePlasma)) {
        this.plasmaWaves.push(availablePlasma);
      }

      console.log('Triggered Plasma Wave from:', startPos, 'to:', endPos);
    }
  }

  private triggerGravitationalLens(audioData: AudioData): void {
    // Create new gravitational lens (these are less frequent and more dramatic)
    const lens = new GravitationalLens(this.scene);
    const position = this.generateRandomPosition(20, 40);
    const intensity = audioData.overallLevel * this.config.intensity;
    
    lens.trigger(position, intensity, audioData);
    this.gravitationalLenses.push(lens);

    console.log('Triggered Gravitational Lens at:', position);
  }

  private handleInstrumentTriggers(audioData: AudioData): void {
    const instruments = audioData.instrumentDetection!;
    const threshold = 0.6;

    // Drums - Extra energy portals
    if (instruments.drums > threshold && this.config.portalsEnabled) {
      if (Math.random() < instruments.drums * 0.4) {
        this.triggerEnergyPortal(audioData);
      }
    }

    // Guitar - Enhanced plasma effects
    if (instruments.guitar > threshold && this.config.plasmaEnabled) {
      if (Math.random() < instruments.guitar * 0.3) {
        this.triggerPlasmaWave(audioData);
      }
    }

    // Vocals - Nebulae color shifts
    if (instruments.vocals > threshold && this.config.nebulaeEnabled) {
      this.nebulaeSystem.triggerColorShift(instruments.vocals);
    }
  }

  private calculateEnergyGradient(): number {
    if (this.audioHistory.length < 10) return 0;

    const recent = this.audioHistory.slice(-10);
    const older = this.audioHistory.slice(-20, -10);

    const recentAvg = recent.reduce((sum, data) => sum + data.overallLevel, 0) / recent.length;
    const olderAvg = older.reduce((sum, data) => sum + data.overallLevel, 0) / older.length;

    return Math.max(0, recentAvg - olderAvg);
  }

  private generateRandomPosition(minRadius: number, maxRadius: number): THREE.Vector3 {
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  public updateConfiguration(newConfig: Partial<CosmicEffectsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('CosmicEffectsManager: Configuration updated', this.config);
  }

  public getPerformanceInfo() {
    return {
      avgFPS: Math.round(this.avgFPS),
      activePortals: this.energyPortals.filter(p => p.isActive()).length,
      activePlasma: this.plasmaWaves.filter(p => p.isActive()).length,
      activeGravity: this.gravitationalLenses.filter(l => l.isActive()).length,
      nebulaeParticles: this.nebulaeSystem ? this.nebulaeSystem.getParticleCount() : 0
    };
  }

  public cleanup(): void {
    // Clean up all effect systems
    if (this.nebulaeSystem) {
      this.nebulaeSystem.dispose();
    }

    [...this.energyPortals, ...this.portalPool].forEach(portal => portal.dispose());
    [...this.plasmaWaves, ...this.plasmaPool].forEach(plasma => plasma.dispose());
    this.gravitationalLenses.forEach(lens => lens.dispose());

    console.log('CosmicEffectsManager: Cleanup completed');
  }
} 