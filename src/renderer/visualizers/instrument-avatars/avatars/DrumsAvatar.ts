import * as THREE from 'three';
import { BaseAvatar, AvatarUpdateData } from './BaseAvatar';
import { EtherealMaterialPresets } from '../materials/EtherealMaterial';

export class DrumsAvatar extends BaseAvatar {
  private drumKit!: THREE.Group;
  private kickDrum!: THREE.Mesh;
  private snareDrum!: THREE.Mesh;
  private hiHat!: THREE.Mesh;
  private crash!: THREE.Mesh;
  private drumSticks!: THREE.Group;
  
  // Animation state
  private kickPulse = 0;
  private snareHit = 0;
  private hiHatOpen = 0;
  private stickRotation = 0;

  constructor(scene: THREE.Scene) {
    super(scene, 'Drums', new THREE.Color(0xff4444)); // Red
  }

  protected initializeMaterials(primaryColor: THREE.Color): void {
    this.etherealMaterial = EtherealMaterialPresets.createDrums();
  }

  protected createGeometry(): void {
    this.drumKit = new THREE.Group();
    this.group.add(this.drumKit);

    // Create kick drum (large cylinder)
    const kickGeometry = new THREE.CylinderGeometry(1.2, 1.4, 0.8, 16);
    this.kickDrum = new THREE.Mesh(kickGeometry, this.etherealMaterial.getMaterial());
    this.kickDrum.position.set(0, -0.5, 0);
    this.kickDrum.rotation.x = Math.PI / 2;
    this.drumKit.add(this.kickDrum);

    // Create snare drum (medium cylinder)
    const snareGeometry = new THREE.CylinderGeometry(0.6, 0.7, 0.4, 12);
    this.snareDrum = new THREE.Mesh(snareGeometry, this.etherealMaterial.getMaterial());
    this.snareDrum.position.set(-1.5, 0.5, 0);
    this.drumKit.add(this.snareDrum);

    // Create hi-hat (two small discs)
    const hiHatGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 12);
    this.hiHat = new THREE.Mesh(hiHatGeometry, this.etherealMaterial.getMaterial());
    this.hiHat.position.set(1.5, 1.0, 0);
    this.drumKit.add(this.hiHat);

    // Create crash cymbal (thin disc)
    const crashGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.03, 16);
    this.crash = new THREE.Mesh(crashGeometry, this.etherealMaterial.getMaterial());
    this.crash.position.set(0, 2.0, -1.0);
    this.crash.rotation.x = Math.PI / 8;
    this.drumKit.add(this.crash);

    // Create drum sticks
    this.drumSticks = new THREE.Group();
    const stickGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
    
    const leftStick = new THREE.Mesh(stickGeometry, this.etherealMaterial.getMaterial());
    leftStick.position.set(-0.3, 1.5, 0.5);
    leftStick.rotation.z = -Math.PI / 6;
    this.drumSticks.add(leftStick);

    const rightStick = new THREE.Mesh(stickGeometry, this.etherealMaterial.getMaterial());
    rightStick.position.set(0.3, 1.5, 0.5);
    rightStick.rotation.z = Math.PI / 6;
    this.drumSticks.add(rightStick);

    this.drumKit.add(this.drumSticks);

    console.log('DrumsAvatar: Drum kit geometry created');
  }

  protected performInstrumentSpecificAnimation(updateData: AvatarUpdateData): void {
    const { audioFeatures, deltaTime, intensity, beatDetected } = updateData;
    
    // Extract drum-specific frequencies
    const bassLevel = audioFeatures.bassLevel || 0;
    const midLevel = audioFeatures.midLevel || 0;
    const trebleLevel = audioFeatures.trebleLevel || 0;

    // Animate kick drum based on bass frequencies
    if (bassLevel > 0.6) {
      this.kickPulse = Math.max(this.kickPulse, bassLevel);
    }
    this.kickPulse *= 0.95; // Decay
    
    const kickScale = 1.0 + this.kickPulse * 0.3;
    this.kickDrum.scale.set(kickScale, 1.0, kickScale);

    // Animate snare based on mid frequencies
    if (midLevel > 0.5) {
      this.snareHit = Math.max(this.snareHit, midLevel);
    }
    this.snareHit *= 0.92;
    
    const snareScale = 1.0 + this.snareHit * 0.4;
    this.snareDrum.scale.set(snareScale, snareScale, snareScale);
    this.snareDrum.rotation.y += this.snareHit * deltaTime * 0.01;

    // Animate hi-hat based on treble
    if (trebleLevel > 0.4) {
      this.hiHatOpen = Math.max(this.hiHatOpen, trebleLevel);
    }
    this.hiHatOpen *= 0.9;
    
    this.hiHat.position.y = 1.0 + this.hiHatOpen * 0.2;
    this.hiHat.rotation.y += deltaTime * 0.005 * (1 + this.hiHatOpen);

    // Animate crash cymbal
    if (intensity > 0.7) {
      this.crash.rotation.z += deltaTime * 0.01 * intensity;
    }

    // Animate drum sticks
    this.stickRotation += deltaTime * 0.005 * (1 + intensity);
    this.drumSticks.children.forEach((stick, index) => {
      const stick3D = stick as THREE.Mesh;
      stick3D.rotation.x = Math.sin(this.stickRotation + index * Math.PI) * 0.3 * intensity;
      stick3D.position.y = 1.5 + Math.abs(Math.sin(this.stickRotation * 2 + index * Math.PI)) * 0.3 * intensity;
    });

    // Overall kit movement
    this.drumKit.rotation.y += deltaTime * 0.002 * intensity;
  }

  protected onBeatDetected(intensity: number): void {
    super.onBeatDetected(intensity);
    
    // Trigger dramatic drum hit effects
    this.kickPulse = Math.max(this.kickPulse, intensity);
    this.snareHit = Math.max(this.snareHit, intensity * 0.8);
    this.hiHatOpen = Math.max(this.hiHatOpen, intensity * 0.6);
    
    // Animate sticks hitting
    this.drumSticks.children.forEach((stick) => {
      const stick3D = stick as THREE.Mesh;
      stick3D.position.y = 1.2; // Strike position
    });

    console.log(`🥁 Drums avatar beat response (intensity: ${(intensity * 100).toFixed(0)}%)`);
  }

  public triggerSpecialEffect(intensity: number): void {
    super.triggerSpecialEffect(intensity);
    
    // Epic drum solo effect
    this.kickPulse = intensity;
    this.snareHit = intensity * 0.9;
    this.hiHatOpen = intensity * 0.7;
    
    // Spin the whole kit
    const currentRotation = this.drumKit.rotation.y;
    const targetRotation = currentRotation + Math.PI * 2 * intensity;
    
    const spinAnimation = (startTime: number) => {
      const elapsed = performance.now() - startTime;
      const duration = 1000 * intensity; // Duration based on intensity
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      this.drumKit.rotation.y = THREE.MathUtils.lerp(currentRotation, targetRotation, easeOut);
      
      if (progress < 1) {
        requestAnimationFrame(() => spinAnimation(startTime));
      }
    };
    
    spinAnimation(performance.now());
    
    console.log('🥁 Epic drum solo effect triggered!');
  }
} 