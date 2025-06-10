import * as THREE from 'three';
import { EtherealMaterial } from '../materials/EtherealMaterial';
import { AvatarConfig } from '../InstrumentAvatarManager';

export interface AvatarUpdateData {
  confidence: number;
  audioFeatures: any;
  deltaTime: number;
  beatDetected: boolean;
  intensity: number;
  config: AvatarConfig;
}

export abstract class BaseAvatar {
  protected scene: THREE.Scene;
  protected group: THREE.Group;
  protected etherealMaterial!: EtherealMaterial;
  
  // Position and movement
  protected basePosition = new THREE.Vector3();
  protected currentPosition = new THREE.Vector3();
  protected orbitalAngle = 0;
  
  // Animation state
  protected currentConfidence = 0;
  protected targetConfidence = 0;
  protected isVisibleFlag = false;
  protected animationTime = 0;
  protected beatPhase = 0;
  
  // Fade timing
  protected fadeInDelay = 0;
  protected fadeOutDelay = 0;
  protected readonly fadeInThreshold = 0.01; // DEBUGGING: Very low threshold - appear at 1% (was 15%)
  protected readonly fadeOutThreshold = 0.005; // DEBUGGING: Very low threshold - disappear at 0.5% (was 5%)
  protected readonly fadeOutDelayTime = 2000; // 2 second delay before fade out
  
  // Configuration
  protected config: AvatarConfig = {
    enabled: true,
    opacity: 0.7,
    scale: 1.0,
    movementSpeed: 1.0,
    particleIntensity: 0.6
  };

  constructor(scene: THREE.Scene, instrumentName: string, primaryColor: THREE.Color) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = `${instrumentName}Avatar`;
    
    this.scene.add(this.group);
    console.log(`👻 ${instrumentName} added to scene`);
    
    this.initializeMaterials(primaryColor);
    console.log(`👻 ${instrumentName} materials initialized`);
    
    this.createGeometry();
    console.log(`👻 ${instrumentName} geometry created - children count: ${this.group.children.length}`);
    
    this.setVisible(false);
    
    console.log(`👻 ${instrumentName} avatar fully initialized:`, {
      childrenCount: this.group.children.length,
      hasEtherealMaterial: !!this.etherealMaterial,
      position: `${this.group.position.x}, ${this.group.position.y}, ${this.group.position.z}`,
      inScene: !!this.scene.getObjectByName(this.group.name)
    });
  }

  protected initializeMaterials(primaryColor: THREE.Color): void {
    this.etherealMaterial = new EtherealMaterial(primaryColor);
  }

  protected abstract createGeometry(): void;

  public updateWithAudio(updateData: AvatarUpdateData): void {
    const { confidence, deltaTime, beatDetected, intensity, config } = updateData;
    
    this.animationTime += deltaTime * 0.001; // Convert to seconds
    this.config = config;
    
    // Update confidence with smoothing (but skip smoothing for high manual test confidence)
    this.targetConfidence = confidence;
    
    // BYPASS SMOOTHING for manual tests with high confidence
    if (confidence > 0.7) {
      console.log(`👻 ${this.group.name} BYPASSING SMOOTHING for manual test - setting confidence directly to ${confidence.toFixed(3)}`);
      this.currentConfidence = confidence; // Direct assignment for manual tests
    } else {
      this.currentConfidence += (this.targetConfidence - this.currentConfidence) * 0.1; // Normal smoothing
    }
    
    // DEBUG CONFIDENCE FLOW
    console.log(`👻 ${this.group.name} updateWithAudio:`, {
      inputConfidence: confidence.toFixed(3),
      targetConfidence: this.targetConfidence.toFixed(3),
      currentConfidence: this.currentConfidence.toFixed(3),
      fadeInThreshold: this.fadeInThreshold,
      fadeOutThreshold: this.fadeOutThreshold,
      currentlyVisible: this.isVisibleFlag,
      shouldFadeIn: this.currentConfidence > this.fadeInThreshold,
      shouldFadeOut: this.currentConfidence < this.fadeOutThreshold
    });
    
    // Handle visibility based on confidence thresholds
    this.updateVisibility(deltaTime);
    
    // Update animations if visible
    if (this.isVisibleFlag) {
      this.updateAnimations(updateData);
      this.updateMaterialProperties();
    }
    
    // Handle beat detection
    if (beatDetected) {
      this.onBeatDetected(intensity);
    }
  }

  private updateVisibility(deltaTime: number): void {
    // Fade in logic
    if (this.currentConfidence > this.fadeInThreshold && !this.isVisibleFlag) {
      if (this.fadeInDelay <= 0) {
        this.setVisible(true);
        this.fadeInDelay = 0;
      } else {
        this.fadeInDelay -= deltaTime;
      }
    }
    
    // Fade out logic
    if (this.currentConfidence < this.fadeOutThreshold && this.isVisibleFlag) {
      if (this.fadeOutDelay <= 0) {
        this.fadeOutDelay = this.fadeOutDelayTime;
      }
      
      this.fadeOutDelay -= deltaTime;
      
      if (this.fadeOutDelay <= 0) {
        this.setVisible(false);
      }
    } else if (this.currentConfidence >= this.fadeOutThreshold) {
      // Reset fade out delay if confidence recovers
      this.fadeOutDelay = 0;
    }
  }

  protected updateAnimations(updateData: AvatarUpdateData): void {
    // Scale based on confidence and configuration
    const baseScale = this.config.scale;
    const confidenceScale = 0.5 + (this.currentConfidence * 1.5); // Scale 0.5 to 2.0
    const pulsation = 1.0 + Math.sin(this.animationTime * 4) * 0.1 * this.currentConfidence;
    
    const finalScale = baseScale * confidenceScale * pulsation;
    this.group.scale.setScalar(finalScale);
    
    // Rotation based on time and confidence
    this.group.rotation.y += updateData.deltaTime * 0.001 * this.currentConfidence;
    
    // Custom animation implementation in derived classes
    this.performInstrumentSpecificAnimation(updateData);
  }

  protected updateMaterialProperties(): void {
    // Update ethereal material based on current state
    const opacity = this.config.opacity * this.currentConfidence;
    const intensity = this.currentConfidence;
    
    console.log(`👻 ${this.group.name} updateMaterialProperties:`, {
      configOpacity: this.config.opacity,
      currentConfidence: this.currentConfidence,
      calculatedOpacity: opacity,
      intensity: intensity,
      animationTime: this.animationTime.toFixed(2),
      materialExists: !!this.etherealMaterial
    });
    
    if (this.etherealMaterial) {
      this.etherealMaterial.updateProperties({
        opacity,
        intensity,
        time: this.animationTime
      });
      console.log(`👻 ${this.group.name} material updated successfully`);
    } else {
      console.warn(`👻 ${this.group.name} NO ETHEREAL MATERIAL FOUND!`);
    }
  }

  protected abstract performInstrumentSpecificAnimation(updateData: AvatarUpdateData): void;

  protected onBeatDetected(intensity: number): void {
    // Default beat response - can be overridden
    this.beatPhase = 0;
    
    // Trigger a quick scale pulse
    const currentScale = this.group.scale.x;
    const pulseScale = currentScale * (1.0 + intensity * 0.3);
    
    // Animate scale pulse
    const pulseAnimation = (time: number) => {
      const progress = Math.min(time / 200, 1); // 200ms pulse
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const scale = THREE.MathUtils.lerp(pulseScale, currentScale, easeOut);
      
      this.group.scale.setScalar(scale);
      
      if (progress < 1) {
        requestAnimationFrame(() => pulseAnimation(time + 16));
      }
    };
    
    pulseAnimation(0);
  }

  public setVisible(visible: boolean): void {
    this.isVisibleFlag = visible;
    this.group.visible = visible;
    
    console.log(`👻 ${this.group.name} setVisible(${visible}):`, {
      position: `${this.group.position.x.toFixed(1)}, ${this.group.position.y.toFixed(1)}, ${this.group.position.z.toFixed(1)}`,
      scale: this.group.scale.x.toFixed(3),
      childrenCount: this.group.children.length,
      groupVisible: this.group.visible,
      hasEtherealMaterial: !!this.etherealMaterial
    });
    
    if (visible) {
      // Reset fade delays when becoming visible
      this.fadeInDelay = 0;
      this.fadeOutDelay = 0;
      
      // DEBUG: Force update material properties when making visible
      if (this.etherealMaterial) {
        const debugOpacity = this.config.opacity * Math.max(0.5, this.currentConfidence); // Ensure some opacity
        console.log(`👻 ${this.group.name} FORCE UPDATING MATERIAL:`, {
          configOpacity: this.config.opacity,
          currentConfidence: this.currentConfidence,
          calculatedOpacity: debugOpacity,
          materialExists: !!this.etherealMaterial
        });
        
        this.etherealMaterial.updateProperties({
          opacity: debugOpacity,
          intensity: Math.max(0.5, this.currentConfidence),
          time: this.animationTime
        });
      }
    }
  }

  public isVisible(): boolean {
    return this.isVisibleFlag;
  }

  public getCurrentConfidence(): number {
    return this.currentConfidence;
  }

  public setBasePosition(position: THREE.Vector3): void {
    this.basePosition.copy(position);
  }

  public getBasePosition(): THREE.Vector3 {
    return this.basePosition.clone();
  }

  public setOrbitalAngle(angle: number): void {
    this.orbitalAngle = angle;
  }

  public getOrbitalAngle(): number {
    return this.orbitalAngle;
  }

  public updatePosition(newPosition: THREE.Vector3): void {
    this.currentPosition.copy(newPosition);
    this.group.position.copy(newPosition);
    
    console.log(`👻 ${this.group.name} updatePosition:`, {
      x: newPosition.x.toFixed(1),
      y: newPosition.y.toFixed(1), 
      z: newPosition.z.toFixed(1),
      distance: newPosition.length().toFixed(1),
      isVisible: this.isVisibleFlag
    });
  }

  public updateConfiguration(config: AvatarConfig): void {
    this.config = { ...this.config, ...config };
    
    // Apply immediate configuration changes
    if (!config.enabled) {
      this.setVisible(false);
    }
  }

  public triggerSpecialEffect(intensity: number): void {
    // Default special effect - can be overridden
    console.log(`Triggering special effect for ${this.group.name} with intensity ${intensity}`);
    
    // Create a burst of particles or special animation
    this.onBeatDetected(intensity * 1.5);
  }

  public getVertexCount(): number {
    let totalVertices = 0;
    
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const positionAttribute = child.geometry.getAttribute('position');
        if (positionAttribute) {
          totalVertices += positionAttribute.count;
        }
      }
    });
    
    return totalVertices;
  }

  public dispose(): void {
    // Clean up geometries
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    // Remove from scene
    this.scene.remove(this.group);
    
    // Dispose ethereal material
    if (this.etherealMaterial) {
      this.etherealMaterial.dispose();
    }
    
    console.log(`BaseAvatar: ${this.group.name} disposed`);
  }
} 