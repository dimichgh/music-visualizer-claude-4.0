import * as THREE from 'three';
import { SceneManager } from './scene-manager';
import { ParticleSystem } from './particle-system';
import { CosmicEffectsManager, AudioData } from './cosmic-effects/CosmicEffectsManager';
import { GraphicsConfig, ParticleSystemConfig } from '@shared/types/visualizer';

export class MusicVisualizer {
  private sceneManager!: SceneManager;
  private particleSystems: ParticleSystem[] = [];
  private cosmicEffects!: CosmicEffectsManager;
  private audioFeatures: any = null;
  private isInitialized = false;

  constructor(container: HTMLElement) {
    const config: GraphicsConfig = {
      width: container.clientWidth,
      height: container.clientHeight,
      pixelRatio: window.devicePixelRatio,
      antialias: true,
      alpha: true,
    };

    this.sceneManager = new SceneManager(container, config);
    this.initializeVisualizations();
    this.initializeCosmicEffects();
    this.setupRenderLoop();
    this.isInitialized = true;
  }

  private initializeVisualizations(): void {
    // Create cosmic dust particles
    const dustConfig: ParticleSystemConfig = {
      count: 1000,
      size: 2,
      speed: 0.1,
      color: '#ffffff',
      opacity: 0.6,
      spread: 50,
    };
    const dustSystem = new ParticleSystem(dustConfig, true);
    this.particleSystems.push(dustSystem);
    this.sceneManager.addToScene(dustSystem.getParticles());

    // Create energy wave particles
    const energyConfig: ParticleSystemConfig = {
      count: 300,
      size: 8,
      speed: 0.5,
      color: '#00ffff',
      opacity: 0.8,
      spread: 30,
    };
    const energySystem = new ParticleSystem(energyConfig, true);
    this.particleSystems.push(energySystem);
    this.sceneManager.addToScene(energySystem.getParticles());

    // Create beat-reactive particles
    const beatConfig: ParticleSystemConfig = {
      count: 150,
      size: 15,
      speed: 1.0,
      color: '#ff00ff',
      opacity: 0.9,
      spread: 20,
    };
    const beatSystem = new ParticleSystem(beatConfig, true);
    this.particleSystems.push(beatSystem);
    this.sceneManager.addToScene(beatSystem.getParticles());

    // Add background starfield
    this.createStarField();
  }

  private initializeCosmicEffects(): void {
    // Initialize the cosmic effects manager with scene and camera
    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();
    this.cosmicEffects = new CosmicEffectsManager(scene, camera);
    
    console.log('Cosmic effects system initialized!');
  }

  private createStarField(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = (Math.random() - 0.5) * 200;
      positions[i + 2] = (Math.random() - 0.5) * 200;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      transparent: true,
      opacity: 0.8,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    this.sceneManager.addToScene(stars);
  }

  private setupRenderLoop(): void {
    this.sceneManager.addRenderCallback((deltaTime: number) => {
      this.updateVisualizations(deltaTime);
    });
  }

  private updateVisualizations(deltaTime: number): void {
    // Update all particle systems with current audio features
    this.particleSystems.forEach(system => {
      system.update(deltaTime, this.audioFeatures);
    });

    // Update cosmic effects with audio data
    if (this.audioFeatures && this.cosmicEffects) {
      const audioData: AudioData = this.convertToAudioData(this.audioFeatures);
      this.cosmicEffects.updateAudioFeatures(audioData);
    }

    // Camera movement based on audio
    if (this.audioFeatures) {
      const camera = this.sceneManager.getCamera();
      const bassLevel = this.audioFeatures.bassLevel || 0;
      const tempo = this.audioFeatures.tempo || 120;

      // Gentle camera rotation based on tempo
      camera.position.x = Math.sin(Date.now() * 0.0001 * tempo / 60) * 2;
      camera.position.z = 10 + Math.cos(Date.now() * 0.0001 * tempo / 60) * 5;
      
      // Bass-reactive camera shake
      if (this.audioFeatures.beatDetected) {
        camera.position.y += (Math.random() - 0.5) * bassLevel * 2;
      }

      camera.lookAt(0, 0, 0);
    }
  }

  private convertToAudioData(audioFeatures: any): AudioData {
    return {
      bassLevel: audioFeatures.bassLevel || 0,
      midLevel: audioFeatures.midLevel || 0,
      trebleLevel: audioFeatures.trebleLevel || 0,
      overallLevel: audioFeatures.overallLevel || 0,
      beatDetected: audioFeatures.beatDetected || false,
      tempo: audioFeatures.tempo || 120,
      dominantFrequency: audioFeatures.dominantFrequency || 440,
      
      // Extended features if available
      spectralCentroid: audioFeatures.spectralCentroid,
      spectralRolloff: audioFeatures.spectralRolloff,
      spectralFlux: audioFeatures.spectralFlux,
      instrumentDetection: audioFeatures.instrumentDetection
    };
  }

  public updateAudioFeatures(audioFeatures: any): void {
    this.audioFeatures = audioFeatures;
  }

  public start(): void {
    if (this.isInitialized) {
      this.sceneManager.startRenderLoop();
    }
  }

  public stop(): void {
    this.sceneManager.stopRenderLoop();
  }

  public getCosmicEffects() {
    return this.cosmicEffects;
  }

  public dispose(): void {
    this.particleSystems.forEach(system => system.dispose());
    if (this.cosmicEffects) {
      this.cosmicEffects.cleanup();
    }
    this.sceneManager.dispose();
  }
} 