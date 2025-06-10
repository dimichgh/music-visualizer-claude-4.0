# Sub-task 3.2: Instrument Avatars - Transparent Musical Figures

## Objective
Create ethereal, transparent musical figures and shadow avatars that materialize based on instrument detection, showing silhouettes of musicians playing different instruments synchronized to the music.

## Technical Requirements
- 3D humanoid figure generation and animation
- Instrument-specific avatar models and animations
- Transparency and silhouette rendering effects
- Real-time morphing between different instrument poses
- Particle integration with avatar movements
- Advanced lighting for shadow and glow effects
- Performance optimization for multiple avatars

## Implementation Steps

### Step 1: Avatar Base System
Create `src/renderer/visualizers/avatars/avatar-system.ts`:
```typescript
export interface InstrumentAvatar {
  mesh: THREE.Group;
  skeleton: THREE.Skeleton;
  animations: { [key: string]: THREE.AnimationClip };
  instrumentType: string;
  opacity: number;
  isActive: boolean;
}

export class AvatarSystem {
  private avatars: Map<string, InstrumentAvatar> = new Map();
  private scene: THREE.Scene;
  private mixer: THREE.AnimationMixer;
  private shadowMaterial: THREE.ShadowMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeAvatars();
    this.setupShadowSystem();
  }

  private initializeAvatars(): void {
    // Create avatar for each instrument type
    const instruments = ['drums', 'guitar', 'bass', 'vocals', 'piano', 'strings'];
    
    instruments.forEach(instrument => {
      const avatar = this.createInstrumentAvatar(instrument);
      this.avatars.set(instrument, avatar);
      this.scene.add(avatar.mesh);
    });
  }

  private createInstrumentAvatar(instrumentType: string): InstrumentAvatar {
    const geometry = this.createHumanoidGeometry();
    const material = this.createAvatarMaterial(instrumentType);
    
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(geometry.body, material);
    const head = new THREE.Mesh(geometry.head, material);
    const leftArm = new THREE.Mesh(geometry.leftArm, material);
    const rightArm = new THREE.Mesh(geometry.rightArm, material);
    const leftLeg = new THREE.Mesh(geometry.leftLeg, material);
    const rightLeg = new THREE.Mesh(geometry.rightLeg, material);

    // Position body parts
    head.position.set(0, 1.7, 0);
    leftArm.position.set(-0.8, 1.2, 0);
    rightArm.position.set(0.8, 1.2, 0);
    leftLeg.position.set(-0.3, 0, 0);
    rightLeg.position.set(0.3, 0, 0);

    mesh.add(body, head, leftArm, rightArm, leftLeg, rightLeg);

    // Add instrument prop
    const instrumentProp = this.createInstrumentProp(instrumentType);
    if (instrumentProp) {
      mesh.add(instrumentProp);
    }

    return {
      mesh,
      skeleton: this.createSkeleton(mesh),
      animations: this.createInstrumentAnimations(instrumentType),
      instrumentType,
      opacity: 0,
      isActive: false
    };
  }

  private createAvatarMaterial(instrumentType: string): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0 },
        instrumentActivity: { value: 0 },
        glowColor: { value: this.getInstrumentColor(instrumentType) },
        rimPower: { value: 2.0 }
      },
      vertexShader: this.getAvatarVertexShader(),
      fragmentShader: this.getAvatarFragmentShader(),
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
  }

  private getAvatarVertexShader(): string {
    return `
      uniform float time;
      uniform float instrumentActivity;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        // Slight movement based on instrument activity
        vec3 pos = position;
        pos += normal * sin(time * 2.0 + position.y * 5.0) * instrumentActivity * 0.02;
        
        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
  }

  private getAvatarFragmentShader(): string {
    return `
      uniform float time;
      uniform float opacity;
      uniform float instrumentActivity;
      uniform vec3 glowColor;
      uniform float rimPower;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        
        // Rim lighting effect
        float rim = 1.0 - max(0.0, dot(normal, viewDirection));
        rim = pow(rim, rimPower);
        
        // Pulsing based on instrument activity
        float pulse = 1.0 + sin(time * 3.0) * instrumentActivity * 0.5;
        
        // Energy flow effect
        float flow = sin(time * 2.0 + vPosition.y * 10.0) * 0.5 + 0.5;
        
        vec3 color = glowColor * (rim + flow * 0.3) * pulse;
        float alpha = (rim * 0.8 + flow * 0.2) * opacity * pulse;
        
        gl_FragColor = vec4(color, alpha);
      }
    `;
  }
}
```

### Step 2: Instrument-Specific Animations
Create `src/renderer/visualizers/avatars/instrument-animations.ts`:
```typescript
export class InstrumentAnimations {
  public static createDrummerAnimation(): THREE.AnimationClip {
    // Drumming motion: alternating arm movements
    const tracks: THREE.KeyframeTrack[] = [];
    
    // Right arm drumming motion
    const rightArmTimes = [0, 0.25, 0.5, 0.75, 1.0];
    const rightArmValues = [
      0, -1.2, 0,     // Up
      0.5, -0.8, 0.3, // Down-forward
      0, -1.2, 0,     // Up
      -0.3, -1.0, 0.2, // Slight variation
      0, -1.2, 0      // Back to start
    ];
    
    tracks.push(new THREE.VectorKeyframeTrack(
      'rightArm.rotation',
      rightArmTimes,
      rightArmValues
    ));

    // Left arm offset drumming
    const leftArmTimes = [0, 0.125, 0.375, 0.625, 0.875, 1.0];
    const leftArmValues = [
      0.3, -1.0, 0.2,  // Slightly down
      0, -1.2, 0,      // Up
      0.5, -0.8, 0.3,  // Down-forward
      0, -1.2, 0,      // Up
      0.5, -0.8, 0.3,  // Down-forward
      0.3, -1.0, 0.2   // Back to start
    ];

    tracks.push(new THREE.VectorKeyframeTrack(
      'leftArm.rotation',
      leftArmTimes,
      leftArmValues
    ));

    return new THREE.AnimationClip('drumming', 1.0, tracks);
  }

  public static createGuitaristAnimation(): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];
    
    // Strumming motion for right arm
    const rightArmTimes = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const rightArmValues = [
      0.5, -0.8, 0.5,   // Down strum
      0.3, -0.9, 0.3,   // Up strum
      0.5, -0.8, 0.5,   // Down strum
      0.3, -0.9, 0.3,   // Up strum
      0.5, -0.8, 0.5,   // Down strum
      0.5, -0.8, 0.5    // Reset
    ];

    tracks.push(new THREE.VectorKeyframeTrack(
      'rightArm.rotation',
      rightArmTimes,
      rightArmValues
    ));

    // Fretting motion for left arm (stays relatively still)
    tracks.push(new THREE.VectorKeyframeTrack(
      'leftArm.rotation',
      [0, 1.0],
      [-0.8, -0.5, 0.8, -0.8, -0.5, 0.8] // Slight fingering motion
    ));

    return new THREE.AnimationClip('guitar', 2.0, tracks);
  }

  public static createPianistAnimation(): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];
    
    // Piano playing: both hands moving over keys
    const handMotion = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    
    // Right hand
    const rightHandValues = handMotion.flatMap(t => [
      Math.sin(t * Math.PI * 4) * 0.3, // X movement
      -0.8 + Math.sin(t * Math.PI * 8) * 0.1, // Y (pressing keys)
      0.6 + Math.cos(t * Math.PI * 2) * 0.2  // Z (hand position)
    ]);

    tracks.push(new THREE.VectorKeyframeTrack(
      'rightArm.rotation',
      handMotion,
      rightHandValues
    ));

    // Left hand (bass notes, slower movement)
    const leftHandValues = handMotion.flatMap(t => [
      Math.sin(t * Math.PI * 2) * 0.4, // X movement
      -0.8 + Math.sin(t * Math.PI * 4) * 0.1, // Y (pressing keys)
      0.6 + Math.cos(t * Math.PI) * 0.2  // Z (hand position)
    ]);

    tracks.push(new THREE.VectorKeyframeTrack(
      'leftArm.rotation',
      handMotion,
      leftHandValues
    ));

    return new THREE.AnimationClip('piano', 2.0, tracks);
  }

  public static createVocalistAnimation(): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];
    
    // Subtle swaying and breathing motion
    const bodyTimes = [0, 0.5, 1.0];
    const bodyValues = [
      0, 0, 0.1,     // Slight lean
      0.1, 0, -0.05, // Opposite lean
      0, 0, 0.1      // Back to start
    ];

    tracks.push(new THREE.VectorKeyframeTrack(
      'body.rotation',
      bodyTimes,
      bodyValues
    ));

    // Head movement (breathing/singing)
    const headTimes = [0, 0.25, 0.75, 1.0];
    const headValues = [
      0, 0.1, 0,     // Slight up
      0, 0.05, 0,    // Neutral
      0, 0.1, 0,     // Slight up
      0, 0.1, 0      // Reset
    ];

    tracks.push(new THREE.VectorKeyframeTrack(
      'head.rotation',
      headTimes,
      headValues
    ));

    return new THREE.AnimationClip('vocals', 3.0, tracks);
  }
}
```

### Step 3: Avatar Materialization System
Create `src/renderer/visualizers/avatars/materialization.ts`:
```typescript
export class AvatarMaterialization {
  private materializing: Map<string, number> = new Map();
  private dematerializing: Map<string, number> = new Map();

  public materializeAvatar(avatar: InstrumentAvatar, speed: number = 2.0): void {
    if (!this.materializing.has(avatar.instrumentType)) {
      this.materializing.set(avatar.instrumentType, 0);
      avatar.isActive = true;
    }
  }

  public dematerializeAvatar(avatar: InstrumentAvatar, speed: number = 1.0): void {
    if (!this.dematerializing.has(avatar.instrumentType)) {
      this.dematerializing.set(avatar.instrumentType, avatar.opacity);
    }
  }

  public update(avatars: Map<string, InstrumentAvatar>, deltaTime: number): void {
    // Handle materialization
    this.materializing.forEach((progress, instrumentType) => {
      const avatar = avatars.get(instrumentType);
      if (avatar) {
        const newProgress = Math.min(1.0, progress + deltaTime * 2.0);
        avatar.opacity = this.easeInOut(newProgress);
        
        // Update material uniforms
        const material = avatar.mesh.children[0].material as THREE.ShaderMaterial;
        material.uniforms.opacity.value = avatar.opacity;
        
        // Add particle effects during materialization
        this.addMaterializationParticles(avatar, newProgress);
        
        if (newProgress >= 1.0) {
          this.materializing.delete(instrumentType);
        } else {
          this.materializing.set(instrumentType, newProgress);
        }
      }
    });

    // Handle dematerialization
    this.dematerializing.forEach((progress, instrumentType) => {
      const avatar = avatars.get(instrumentType);
      if (avatar) {
        const newProgress = Math.max(0.0, progress - deltaTime * 1.0);
        avatar.opacity = newProgress;
        
        // Update material uniforms
        const material = avatar.mesh.children[0].material as THREE.ShaderMaterial;
        material.uniforms.opacity.value = avatar.opacity;
        
        if (newProgress <= 0.0) {
          this.dematerializing.delete(instrumentType);
          avatar.isActive = false;
        } else {
          this.dematerializing.set(instrumentType, newProgress);
        }
      }
    });
  }

  private easeInOut(t: number): number {
    // Smooth materialization curve
    return t * t * (3.0 - 2.0 * t);
  }

  private addMaterializationParticles(avatar: InstrumentAvatar, progress: number): void {
    // Create sparkle/energy particles around materializing avatar
    if (Math.random() < progress * 0.3) {
      // Create particle at random position around avatar
      const position = avatar.mesh.position.clone();
      position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ));
      
      // Add to particle system
      // This would integrate with existing particle systems
    }
  }
}
```

### Step 4: Shadow and Silhouette Effects
Create `src/renderer/visualizers/avatars/shadow-effects.ts`:
```typescript
export class ShadowEffects {
  private shadowGeometry: THREE.PlaneGeometry;
  private shadowMaterial: THREE.ShaderMaterial;
  private shadowMeshes: Map<string, THREE.Mesh> = new Map();

  constructor() {
    this.shadowGeometry = new THREE.PlaneGeometry(3, 2);
    this.shadowMaterial = this.createShadowMaterial();
    this.initializeShadows();
  }

  private createShadowMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        shadowOpacity: { value: 0 },
        instrumentActivity: { value: 0 },
        shadowColor: { value: new THREE.Color(0x000000) }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float shadowOpacity;
        uniform float instrumentActivity;
        uniform vec3 shadowColor;
        
        varying vec2 vUv;
        
        void main() {
          vec2 center = vec2(0.5, 0.2);
          float dist = distance(vUv, center);
          
          // Create shadow silhouette
          float shadow = 1.0 - smoothstep(0.1, 0.4, dist);
          
          // Add subtle movement
          shadow *= 1.0 + sin(time * 2.0 + vUv.x * 10.0) * instrumentActivity * 0.1;
          
          gl_FragColor = vec4(shadowColor, shadow * shadowOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  public createInstrumentShadow(instrumentType: string, position: THREE.Vector3): void {
    const shadowMesh = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial.clone());
    shadowMesh.position.copy(position);
    shadowMesh.position.y = -0.8; // Ground level
    shadowMesh.rotation.x = -Math.PI / 2; // Lay flat
    
    this.shadowMeshes.set(instrumentType, shadowMesh);
  }

  public updateShadows(audioFeatures: AdvancedAudioFeatures, deltaTime: number): void {
    this.shadowMeshes.forEach((shadowMesh, instrumentType) => {
      const material = shadowMesh.material as THREE.ShaderMaterial;
      const activity = audioFeatures.instrumentDetection[instrumentType] || 0;
      
      material.uniforms.time.value += deltaTime;
      material.uniforms.instrumentActivity.value = activity;
      material.uniforms.shadowOpacity.value = activity * 0.6;
    });
  }
}
```

### Step 5: Avatar Manager Integration
Create `src/renderer/visualizers/avatars/avatar-manager.ts`:
```typescript
export class AvatarManager {
  private avatarSystem: AvatarSystem;
  private materialization: AvatarMaterialization;
  private shadowEffects: ShadowEffects;
  private animationMixers: Map<string, THREE.AnimationMixer> = new Map();
  private activeThreshold: number = 0.3;

  constructor(scene: THREE.Scene) {
    this.avatarSystem = new AvatarSystem(scene);
    this.materialization = new AvatarMaterialization();
    this.shadowEffects = new ShadowEffects();
    this.setupAnimationMixers();
  }

  private setupAnimationMixers(): void {
    this.avatarSystem.avatars.forEach((avatar, instrumentType) => {
      const mixer = new THREE.AnimationMixer(avatar.mesh);
      
      // Add appropriate animation for each instrument
      Object.values(avatar.animations).forEach(clip => {
        const action = mixer.clipAction(clip);
        action.play();
      });
      
      this.animationMixers.set(instrumentType, mixer);
    });
  }

  public update(audioFeatures: AdvancedAudioFeatures, deltaTime: number): void {
    this.avatarSystem.avatars.forEach((avatar, instrumentType) => {
      const instrumentLevel = audioFeatures.instrumentDetection[instrumentType] || 0;
      
      // Materialize/dematerialize based on instrument detection
      if (instrumentLevel > this.activeThreshold && !avatar.isActive) {
        this.materialization.materializeAvatar(avatar);
        this.shadowEffects.createInstrumentShadow(instrumentType, avatar.mesh.position);
      } else if (instrumentLevel <= this.activeThreshold && avatar.isActive) {
        this.materialization.dematerializeAvatar(avatar);
      }
      
      // Update animation speed based on instrument activity
      const mixer = this.animationMixers.get(instrumentType);
      if (mixer && avatar.isActive) {
        mixer.timeScale = 0.5 + instrumentLevel * 1.5; // Vary animation speed
        mixer.update(deltaTime);
      }
      
      // Update material uniforms
      if (avatar.isActive) {
        const material = avatar.mesh.children[0].material as THREE.ShaderMaterial;
        material.uniforms.time.value += deltaTime;
        material.uniforms.instrumentActivity.value = instrumentLevel;
      }
    });

    // Update materialization effects
    this.materialization.update(this.avatarSystem.avatars, deltaTime);
    
    // Update shadow effects
    this.shadowEffects.updateShadows(audioFeatures, deltaTime);
  }

  public dispose(): void {
    this.animationMixers.forEach(mixer => mixer.stopAllAction());
    this.avatarSystem.dispose();
  }
}
```

## Integration with Main Visualizer
Update `src/renderer/visualizers/music-visualizer.ts`:
```typescript
export class MusicVisualizer {
  private avatarManager: AvatarManager;

  constructor(container: HTMLElement) {
    // ... existing code ...
    this.avatarManager = new AvatarManager(this.sceneManager.getScene());
  }

  private updateVisualizations(deltaTime: number): void {
    // ... existing particle and camera updates ...
    
    // Update avatar system
    if (this.audioFeatures) {
      this.avatarManager.update(this.audioFeatures, deltaTime);
    }
  }
}
```

## Acceptance Criteria
- [ ] **Multiple Avatars**: Support for 6+ instrument types (drums, guitar, bass, vocals, piano, strings)
- [ ] **Smooth Materialization**: Avatars appear/disappear smoothly based on instrument detection
- [ ] **Realistic Animations**: Instrument-specific realistic playing animations
- [ ] **Transparency Effects**: Ethereal, ghost-like appearance with rim lighting
- [ ] **Shadow System**: Ground shadows that respond to avatar activity
- [ ] **Particle Integration**: Materialization particles and energy effects
- [ ] **Performance**: 30+ FPS with all avatars active
- [ ] **Audio Sync**: < 200ms latency for avatar appearance/disappearance

## Status Tracking
- [ ] **TODO**: Implement all avatar systems
- [ ] **IN PROGRESS**: Currently implementing
- [ ] **COMPLETED**: All acceptance criteria met
- [ ] **TESTED**: Verified with various instrument combinations

## Dependencies for Next Sub-task
This completes the core visualization features. Sub-task 4.1 (Interface Design) will add user controls for avatar customization and settings. 