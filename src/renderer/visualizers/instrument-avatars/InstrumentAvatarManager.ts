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
  
  // Enhanced positioning system
  private centerPosition = new THREE.Vector3(0, 0, 0);
  private orbitRadius = 18; // Increased base orbital distance for better separation
  private currentTime = 0;
  
  // Instrument-specific positioning data
  private instrumentPositions = {
    drums: { heightLevel: -2, radiusMultiplier: 1.2, rotationOffset: 0 },
    bass: { heightLevel: -1, radiusMultiplier: 1.1, rotationOffset: Math.PI / 3 },
    guitar: { heightLevel: 0, radiusMultiplier: 1.0, rotationOffset: Math.PI / 6 },
    vocals: { heightLevel: 2, radiusMultiplier: 0.9, rotationOffset: Math.PI / 2 },
    piano: { heightLevel: 1, radiusMultiplier: 1.05, rotationOffset: (Math.PI * 2) / 3 },
    strings: { heightLevel: 0.5, radiusMultiplier: 0.95, rotationOffset: (Math.PI * 5) / 6 },
  };
  
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
    console.log('🎭 Positioning avatars with enhanced 3D separation...');
    
    this.avatars.forEach((avatar, name) => {
      const posData = this.instrumentPositions[name as keyof typeof this.instrumentPositions];
      
      if (posData) {
        // Calculate unique position for each instrument
        const instrumentRadius = this.orbitRadius * posData.radiusMultiplier;
        const height = posData.heightLevel * 3; // 3 units per level for clear separation
        const angle = posData.rotationOffset;
        
        const basePosition = new THREE.Vector3(
          Math.cos(angle) * instrumentRadius,
          height,
          Math.sin(angle) * instrumentRadius
        );

        avatar.setBasePosition(basePosition);
        avatar.setOrbitalAngle(angle);
        
        console.log(`🎭 ${name.toUpperCase()} positioned at:`, {
          radius: instrumentRadius.toFixed(1),
          height: height.toFixed(1),
          angle: (angle * 180 / Math.PI).toFixed(0) + '°'
        });
      }
    });
    
    console.log('🎭 All avatars positioned with no overlapping!');
  }

  public updateAudioFeatures(audioFeatures: AudioFeatures): void {
    if (!this.config.masterEnabled) {
      console.log('🎭 Avatar Manager: DISABLED - masterEnabled = false');
      return;
    }

    this.frameCount++;
    const now = performance.now();
    const deltaTime = this.lastUpdateTime > 0 ? now - this.lastUpdateTime : 16.67;
    this.lastUpdateTime = now;
    this.currentTime += deltaTime * 0.001; // Convert to seconds

    // COMPREHENSIVE DEBUGGING
    console.log('🎭 Avatar Manager - Audio Update:', {
      overallLevel: audioFeatures.overallLevel?.toFixed(3) || 'undefined',
      bassLevel: audioFeatures.bassLevel?.toFixed(3) || 'undefined',
      midLevel: audioFeatures.midLevel?.toFixed(3) || 'undefined',
      trebleLevel: audioFeatures.trebleLevel?.toFixed(3) || 'undefined',
      hasInstrumentDetection: !!audioFeatures.instrumentDetection,
      instrumentData: audioFeatures.instrumentDetection
    });

    // Update each avatar with instrument detection data
    if (audioFeatures.instrumentDetection) {
      console.log('🎭 Updating instrument avatars with detection data...');
      this.updateInstrumentAvatars(audioFeatures, deltaTime);
    } else {
      console.warn('🎭 NO INSTRUMENT DETECTION DATA FOUND!');
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
    const positions: Map<string, THREE.Vector3> = new Map();
    
    // First pass: calculate intended positions
    this.avatars.forEach((avatar, name) => {
      const avatarConfig = this.config.avatars[name as keyof typeof this.config.avatars];
      if (!avatarConfig.enabled) return;

      const posData = this.instrumentPositions[name as keyof typeof this.instrumentPositions];
      if (!posData) return;

      // Calculate enhanced orbital motion with instrument-specific behavior
      const baseMovementSpeed = this.config.movementSpeed * avatarConfig.movementSpeed;
      const staggeredTime = this.currentTime + (posData.rotationOffset * 2); // Time offset for staggered motion
      const movementSpeed = baseMovementSpeed * (0.8 + Math.sin(staggeredTime * 0.3) * 0.4); // Variable speed
      
      const newAngle = avatar.getOrbitalAngle() + (deltaTime * 0.001 * movementSpeed * 0.15);
      avatar.setOrbitalAngle(newAngle);

      // Enhanced radius calculation with confidence and instrument-specific positioning
      const confidence = avatar.getCurrentConfidence();
      const baseRadius = this.orbitRadius * posData.radiusMultiplier;
      const confidenceModifier = 1.0 + (confidence - 0.5) * 0.2; // Subtle movement based on confidence
      const breathingEffect = 1.0 + Math.sin(staggeredTime * 1.5) * 0.1; // Gentle breathing motion
      const currentRadius = baseRadius * confidenceModifier * breathingEffect;

      // Calculate 3D position with enhanced vertical movement
      const height = posData.heightLevel * 3 + Math.sin(staggeredTime * 1.8 + newAngle) * 1.2; // Layered floating
      
      const orbitalPosition = new THREE.Vector3(
        Math.cos(newAngle) * currentRadius,
        height,
        Math.sin(newAngle) * currentRadius
      );

      positions.set(name, orbitalPosition);
    });

    // Second pass: apply collision avoidance and update positions
    this.avatars.forEach((avatar, name) => {
      const intendedPosition = positions.get(name);
      if (!intendedPosition) return;

      // Check for potential collisions with other avatars
      const finalPosition = this.applyCollisionAvoidance(name, intendedPosition, positions);
      avatar.updatePosition(finalPosition);
    });
  }

  private applyCollisionAvoidance(
    currentName: string, 
    intendedPosition: THREE.Vector3, 
    allPositions: Map<string, THREE.Vector3>
  ): THREE.Vector3 {
    const minDistance = 8.0; // Minimum distance between avatars
    const avoidanceForce = new THREE.Vector3();
    let needsAdjustment = false;

    // Check distance to all other avatars
    allPositions.forEach((otherPosition, otherName) => {
      if (otherName === currentName) return;

      const distance = intendedPosition.distanceTo(otherPosition);
      if (distance < minDistance) {
        // Calculate repulsion vector
        const repulsion = intendedPosition.clone().sub(otherPosition).normalize();
        const forceStrength = (minDistance - distance) / minDistance;
        avoidanceForce.add(repulsion.multiplyScalar(forceStrength * 2.0));
        needsAdjustment = true;
      }
    });

    if (needsAdjustment) {
      // Apply gentle avoidance force
      const adjustedPosition = intendedPosition.clone().add(avoidanceForce);
      return adjustedPosition;
    }

    return intendedPosition;
  }

  public updateConfiguration(newConfig: Partial<InstrumentAvatarsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    console.log('🎭 Configuration updated:', {
      masterEnabled: this.config.masterEnabled,
      globalOpacity: (this.config.globalOpacity * 100).toFixed(0) + '%',
      movementSpeed: (this.config.movementSpeed * 100).toFixed(0) + '%'
    });
    
    // IMPORTANT: Don't force avatars visible here! Let them manage their own visibility based on confidence
    // The previous code was calling setVisible(true) which bypassed confidence-based visibility
    
    // Only hide all avatars if master is explicitly disabled
    if (newConfig.masterEnabled === false) {
      console.log('🎭 Master disabled - hiding all avatars');
      this.avatars.forEach(avatar => {
        avatar.setVisible(false);
      });
    }

    // Update individual avatar settings
    if (newConfig.avatars) {
      Object.entries(newConfig.avatars).forEach(([name, config]) => {
        const avatar = this.avatars.get(name);
        if (avatar && config) {
          console.log(`🎭 Updating ${name} config:`, {
            enabled: config.enabled,
            opacity: (config.opacity * 100).toFixed(0) + '%'
          });
          avatar.updateConfiguration(config);
        }
      });
    }
  }

  public triggerAvatarEffect(instrumentName: string, intensity: number = 0.8): void {
    const avatar = this.avatars.get(instrumentName);
    const avatarConfig = this.config.avatars[instrumentName as keyof typeof this.config.avatars];
    
    if (avatar && avatarConfig) {
      // Calculate proper opacity based on configuration
      const effectiveConfidence = intensity * avatarConfig.opacity * this.config.globalOpacity;
      
      console.log(`🎭 MANUAL TRIGGER ${instrumentName.toUpperCase()}:`, {
        intensity: (intensity * 100).toFixed(0) + '%',
        configOpacity: (avatarConfig.opacity * 100).toFixed(0) + '%',
        globalOpacity: (this.config.globalOpacity * 100).toFixed(0) + '%',
        effectiveConfidence: (effectiveConfidence * 100).toFixed(0) + '%',
        currentVisibility: avatar.isVisible(),
        currentConfidence: avatar.getCurrentConfidence().toFixed(3)
      });
      
      // FIX 1: FORCE PROPER POSITIONING for manual tests
      const posData = this.instrumentPositions[instrumentName as keyof typeof this.instrumentPositions];
      if (posData) {
        const instrumentRadius = this.orbitRadius * posData.radiusMultiplier;
        const height = posData.heightLevel * 3;
        const angle = posData.rotationOffset;
        
        const testPosition = new THREE.Vector3(
          Math.cos(angle) * instrumentRadius,
          height,
          Math.sin(angle) * instrumentRadius
        );
        
        console.log(`🎭 FORCING ${instrumentName} to test position:`, {
          x: testPosition.x.toFixed(1),
          y: testPosition.y.toFixed(1),
          z: testPosition.z.toFixed(1),
          radius: instrumentRadius.toFixed(1),
          angle: (angle * 180 / Math.PI).toFixed(0) + '°'
        });
        
        avatar.updatePosition(testPosition);
      }
      
      // FIX 2: FORCE VISIBILITY AND HIGH CONFIDENCE
      console.log(`🎭 FORCING ${instrumentName} to be visible for manual test...`);
      avatar.setVisible(true);
      
      // FIX 3: Use much higher confidence for manual tests to ensure visibility
      const manualTestConfidence = 0.8; // Fixed high confidence instead of calculated
      
      // Update avatar with proper audio data structure
      avatar.updateWithAudio({
        confidence: manualTestConfidence, // ← FIXED: Use high confidence
        audioFeatures: {
          bassLevel: 0.5,
          midLevel: 0.5,
          trebleLevel: 0.5,
          overallLevel: intensity,
          beatDetected: true,
          tempo: 120,
          dominantFrequency: 440
        },
        deltaTime: 16.67,
        beatDetected: true,
        intensity: intensity,
        config: avatarConfig
      });
      
      // Also trigger special effects
      avatar.triggerSpecialEffect(intensity);
      
      console.log(`🎭 ${instrumentName} avatar FORCED VISIBLE, POSITIONED, and triggered with high confidence!`);
      
      // Log current state after update
      setTimeout(() => {
        console.log(`🎭 ${instrumentName} POST-UPDATE STATE:`, {
          isVisible: avatar.isVisible(),
          confidence: avatar.getCurrentConfidence().toFixed(3),
          position: `${avatar.getBasePosition().x.toFixed(1)}, ${avatar.getBasePosition().y.toFixed(1)}, ${avatar.getBasePosition().z.toFixed(1)}`,
          manualTestConfidence: manualTestConfidence
        });
      }, 100);
      
    } else {
      console.warn(`🎭 Failed to trigger ${instrumentName}: avatar or config not found`);
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