// Visualizer types will be defined in Phase 2
// Placeholder for now to avoid import errors

export interface VisualizationConfig {
  width: number;
  height: number;
  fps: number;
}

export interface GraphicsConfig {
  width: number;
  height: number;
  pixelRatio: number;
  antialias: boolean;
  alpha: boolean;
}

export interface ParticleSystemConfig {
  count: number;
  size: number;
  speed: number;
  color: string;
  opacity: number;
  spread: number;
}

export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export interface CosmicEffectConfig {
  nebulaeIntensity: number;
  starFieldDensity: number;
  energyWaveSpeed: number;
  colorPalette: string[];
  psychedelicIntensity: number;
}

export interface AudioVisualizationMapping {
  bassParticles: ParticleSystemConfig;
  midFreqColors: string[];
  trebleEffects: number;
  beatPulseScale: number;
  tempoRotation: number;
} 