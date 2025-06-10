import * as THREE from 'three';
import { BaseAvatar } from './avatars/BaseAvatar';
import { DrumsAvatar } from './avatars/DrumsAvatar';
import { GuitarAvatar } from './avatars/GuitarAvatar';
import { BassAvatar } from './avatars/BassAvatar';
import { VocalsAvatar } from './avatars/VocalsAvatar';
import { PianoAvatar } from './avatars/PianoAvatar';
import { StringsAvatar } from './avatars/StringsAvatar';

export interface AvatarConfig {
  enabled: boolean;
  opacity: number; // 0.0 to 1.0
  scale: number;   // Size multiplier
  movementSpeed: number; // Orbital speed multiplier
  particleIntensity: number; // 0.0 to 1.0
}

export interface InstrumentAvatarsConfig {
  masterEnabled: boolean;
  globalOpacity: number;
  movementSpeed: number;
  avatars: {
    drums: AvatarConfig;
    guitar: AvatarConfig;
    bass: AvatarConfig;
    vocals: AvatarConfig;
    piano: AvatarConfig;
    strings: AvatarConfig;
  };
}

export interface InstrumentData {
  drums: number;
  guitar: number;
  bass: number;
  vocals: number;
  piano: number;
  strings: number;
}

export interface AudioFeatures {
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  overallLevel: number;
  beatDetected: boolean;
  tempo: number;
  dominantFrequency: number;
  spectralCentroid?: number;
  instrumentDetection?: InstrumentData;
}

export class InstrumentAvatarManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private config: InstrumentAvatarsConfig;
  
  // Avatar instances
  private avatars: Map<string, BaseAvatar> = new Map();
  
  // Positioning system
  private centerPosition = new THREE.Vector3(0, 0, 0);
  private orbitRadius = 12; // Base orbital distance
  private currentTime = 0;
  
  // Performance tracking
  private frameCount = 0;
  private lastUpdateTime = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    this.config = {
      masterEnabled: true,
      globalOpacity: 0.8,
      movementSpeed: 1.0,
      avatars: {
        drums: { enabled: true, opacity: 0.8, scale: 1.0, movementSpeed: 1.2, particleIntensity: 0.7 },
        guitar: { enabled: true, opacity: 0.7, scale: 1.0, movementSpeed: 1.0, particleIntensity: 0.6 },
        bass: { enabled: true, opacity: 0.8, scale: 1.2, movementSpeed: 0.8, particleIntensity: 0.8 },
        vocals: { enabled: true, opacity: 0.6, scale: 1.1, movementSpeed: 1.1, particleIntensity: 0.9 },
        piano: { enabled: true, opacity: 0.7, scale: 1.0, movementSpeed: 0.9, particleIntensity: 0.5 },
        strings: { enabled: true, opacity: 0.6, scale: 0.9, movementSpeed: 1.0, particleIntensity: 0.7 }
      }
    };

    this.initializeAvatars();
  }

  private initializeAvatars(): void {
    // Create avatar instances
    this.avatars.set('drums', new DrumsAvatar(this.scene));
    this.avatars.set('guitar', new GuitarAvatar(this.scene));
    this.avatars.set('bass', new BassAvatar(this.scene));
    this.avatars.set('vocals', new VocalsAvatar(this.scene));
    this.avatars.set('piano', new PianoAvatar(this.scene));
    this.avatars.set('strings', new StringsAvatar(this.scene));

    // Position avatars in initial orbital arrangement
    this.positionAvatars();

    console.log('InstrumentAvatarManager: Initialized all avatar types');
  }

  private positionAvatars(): void {
    const avatarNames = Array.from(this.avatars.keys());
    const angleStep = (Math.PI * 2) / avatarNames.length;

    avatarNames.forEach((name, index) => {
      const avatar = this.avatars.get(name)!;
      const angle = index * angleStep;
      
      // Base position in circular arrangement
      const basePosition = new THREE.Vector3(
        Math.cos(angle) * this.orbitRadius,
        Math.sin(index * 0.3) * 2, // Slight vertical variation
        Math.sin(angle) * this.orbitRadius
      );

      avatar.setBasePosition(basePosition);
      avatar.setOrbitalAngle(angle);
    });
  }

  public updateAudioFeatures(audioFeatures: AudioFeatures): void {
    if (!this.config.masterEnabled) return;

    this.frameCount++;
    const now = performance.now();
    const deltaTime = this.lastUpdateTime > 0 ? now - this.lastUpdateTime : 16.67;
    this.lastUpdateTime = now;
    this.currentTime += deltaTime * 0.001; // Convert to seconds

    // Update each avatar with instrument detection data
    if (audioFeatures.instrumentDetection) {
      this.updateInstrumentAvatars(audioFeatures, deltaTime);
    }

    // Update global positioning and movement
    this.updateAvatarPositions(deltaTime);

    // Performance logging every 5 seconds
    if (this.frameCount % 300 === 0) {
      this.logPerformanceInfo();
    }
  }

  private updateInstrumentAvatars(audioFeatures: AudioFeatures, deltaTime: number): void {
    const instruments = audioFeatures.instrumentDetection!;
    
    // Update each avatar based on its instrument confidence
    Object.entries(instruments).forEach(([instrumentName, confidence]) => {
      const avatar = this.avatars.get(instrumentName);
      const avatarConfig = this.config.avatars[instrumentName as keyof typeof this.config.avatars];
      
      if (avatar && avatarConfig && avatarConfig.enabled) {
        // Calculate effective confidence based on configuration
        const effectiveConfidence = confidence * avatarConfig.opacity * this.config.globalOpacity;
        
        // Update avatar with audio data
        avatar.updateWithAudio({
          confidence: effectiveConfidence,
          audioFeatures,
          deltaTime,
          beatDetected: audioFeatures.beatDetected,
          intensity: audioFeatures.overallLevel,
          config: avatarConfig
        });
      }
    });
  }

  private updateAvatarPositions(deltaTime: number): void {
    // Update orbital motion for all avatars
    this.avatars.forEach((avatar, name) => {
      const avatarConfig = this.config.avatars[name as keyof typeof this.config.avatars];
      if (!avatarConfig.enabled) return;

      // Calculate orbital motion
      const movementSpeed = this.config.movementSpeed * avatarConfig.movementSpeed;
      const newAngle = avatar.getOrbitalAngle() + (deltaTime * 0.001 * movementSpeed * 0.2);
      avatar.setOrbitalAngle(newAngle);

      // Update position based on orbital motion and confidence
      const confidence = avatar.getCurrentConfidence();
      const radiusModifier = 1.0 + (confidence - 0.5) * 0.3; // Move closer when more confident
      const currentRadius = this.orbitRadius * radiusModifier;

      const orbitalPosition = new THREE.Vector3(
        Math.cos(newAngle) * currentRadius,
        avatar.getBasePosition().y + Math.sin(this.currentTime * 2 + newAngle) * 1.5, // Gentle vertical floating
        Math.sin(newAngle) * currentRadius
      );

      avatar.updatePosition(orbitalPosition);
    });
  }

  public updateConfiguration(newConfig: Partial<InstrumentAvatarsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    console.log('InstrumentAvatarManager: Configuration updated');
    
    // Apply configuration changes to avatars
    if (newConfig.masterEnabled !== undefined) {
      this.avatars.forEach(avatar => {
        avatar.setVisible(newConfig.masterEnabled!);
      });
    }

    // Update individual avatar settings
    if (newConfig.avatars) {
      Object.entries(newConfig.avatars).forEach(([name, config]) => {
        const avatar = this.avatars.get(name);
        if (avatar && config) {
          avatar.updateConfiguration(config);
        }
      });
    }
  }

  public triggerAvatarEffect(instrumentName: string, intensity: number = 0.8): void {
    const avatar = this.avatars.get(instrumentName);
    if (avatar) {
      avatar.triggerSpecialEffect(intensity);
      console.log(`🎭 Triggered ${instrumentName} avatar effect (intensity: ${(intensity * 100).toFixed(0)}%)`);
    }
  }

  public getActiveAvatars(): { [key: string]: boolean } {
    const result: { [key: string]: boolean } = {};
    this.avatars.forEach((avatar, name) => {
      result[name] = avatar.isVisible() && avatar.getCurrentConfidence() > 0.1;
    });
    return result;
  }

  public getPerformanceInfo() {
    const activeCount = Object.values(this.getActiveAvatars()).filter(Boolean).length;
    const totalVertices = Array.from(this.avatars.values())
      .reduce((sum, avatar) => sum + avatar.getVertexCount(), 0);

    return {
      activeAvatars: activeCount,
      totalVertices,
      orbitRadius: this.orbitRadius,
      currentTime: this.currentTime.toFixed(1)
    };
  }

  private logPerformanceInfo(): void {
    const perfInfo = this.getPerformanceInfo();
    const activeAvatars = this.getActiveAvatars();
    
    console.log('🎭 Avatar Performance Info:');
    console.log(`  Active: ${perfInfo.activeAvatars}/6 avatars`);
    console.log(`  Vertices: ${perfInfo.totalVertices}`);
    console.log(`  Active avatars:`, Object.entries(activeAvatars)
      .filter(([_, active]) => active)
      .map(([name, _]) => name)
      .join(', ') || 'none');
  }

  public cleanup(): void {
    this.avatars.forEach(avatar => avatar.dispose());
    this.avatars.clear();
    console.log('InstrumentAvatarManager: Cleanup completed');
  }
} 