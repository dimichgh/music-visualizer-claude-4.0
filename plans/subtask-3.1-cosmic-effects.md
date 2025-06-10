# Sub-task 3.1: Advanced Cosmic Effects - Nebulae, Portals & Plasma

## Objective
Create spectacular cosmic visual effects that respond to advanced audio analysis, including swirling nebulae clouds, energy portals that open on beat drops, plasma waves, and wormhole effects synchronized to musical elements.

## Technical Requirements
- Volumetric rendering for nebulae and cosmic clouds
- Portal/wormhole effects with procedural generation
- Plasma and energy wave simulations
- Advanced shader effects with noise functions
- GPU-accelerated particle systems for cosmic dust
- Real-time fluid dynamics simulation
- Bloom and post-processing effects
- Performance optimization for complex scenes

## Implementation Steps

### Step 1: Nebulae Cloud System
Create `src/renderer/visualizers/effects/nebulae-system.ts`:
```typescript
export class NebulaeSystem {
  private cloudGeometry: THREE.PlaneGeometry[];
  private cloudMaterials: THREE.ShaderMaterial[];
  private noiseTextures: THREE.DataTexture[];
  private cloudMeshes: THREE.Mesh[];

  constructor() {
    this.initializeNoiseTextures();
    this.createCloudLayers();
    this.setupNebulaeShaders();
  }

  private createNebulaeShader(): string {
    return `
      uniform float time;
      uniform float bassLevel;
      uniform float midLevel;
      uniform float trebleLevel;
      uniform vec3 nebulaColor1;
      uniform vec3 nebulaColor2;
      uniform vec3 nebulaColor3;
      uniform sampler2D noiseTexture1;
      uniform sampler2D noiseTexture2;
      uniform sampler2D noiseTexture3;
      
      varying vec2 vUv;
      
      // Simplex noise functions
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      
      float snoise(vec3 v) {
        // 3D Simplex noise implementation
        // ... (full implementation)
      }
      
      void main() {
        vec2 uv = vUv;
        
        // Multi-octave noise for realistic cloud structure
        float noise1 = snoise(vec3(uv * 2.0, time * 0.1));
        float noise2 = snoise(vec3(uv * 4.0, time * 0.15)) * 0.5;
        float noise3 = snoise(vec3(uv * 8.0, time * 0.2)) * 0.25;
        
        float combinedNoise = noise1 + noise2 + noise3;
        
        // Audio-reactive density modulation
        float density = combinedNoise * (0.5 + bassLevel * 2.0);
        density = smoothstep(0.2, 0.8, density);
        
        // Color mixing based on audio frequencies
        vec3 color = mix(nebulaColor1, nebulaColor2, midLevel);
        color = mix(color, nebulaColor3, trebleLevel);
        
        // Add energy wisps and flowing effects
        float flow = sin(time * 0.3 + uv.x * 10.0) * cos(time * 0.2 + uv.y * 8.0);
        density += flow * trebleLevel * 0.3;
        
        gl_FragColor = vec4(color, density * 0.6);
      }
    `;
  }

  public update(audioFeatures: AdvancedAudioFeatures, deltaTime: number): void {
    // Update nebulae based on musical key and instrument detection
    const keyColors = this.getKeyBasedNebulaColors(audioFeatures.musicalKey);
    
    this.cloudMaterials.forEach((material, index) => {
      material.uniforms.time.value += deltaTime;
      material.uniforms.bassLevel.value = audioFeatures.bassLevel;
      material.uniforms.midLevel.value = audioFeatures.midLevel;
      material.uniforms.trebleLevel.value = audioFeatures.trebleLevel;
      material.uniforms.nebulaColor1.value.setHex(keyColors[0]);
      material.uniforms.nebulaColor2.value.setHex(keyColors[1]);
      material.uniforms.nebulaColor3.value.setHex(keyColors[2]);
      
      // Instrument-specific nebula behavior
      if (audioFeatures.instrumentDetection.strings > 0.7) {
        // Strings create flowing, ethereal clouds
        material.uniforms.flowSpeed = { value: 2.0 };
      } else if (audioFeatures.instrumentDetection.drums > 0.7) {
        // Drums create explosive, expanding clouds
        material.uniforms.explosionForce = { value: audioFeatures.beatStrength * 3.0 };
      }
    });
  }
}
```

### Step 2: Energy Portal System
Create `src/renderer/visualizers/effects/portal-system.ts":
```typescript
export class PortalSystem {
  private portalGeometry: THREE.RingGeometry;
  private portalMaterial: THREE.ShaderMaterial;
  private portalMesh: THREE.Mesh;
  private isActive: boolean = false;
  private activationThreshold: number = 0.8;

  private createPortalShader(): string {
    return `
      uniform float time;
      uniform float activation;
      uniform float beatPulse;
      uniform vec3 portalColor;
      uniform float rimPower;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      
      void main() {
        vec2 center = vec2(0.5, 0.5);
        vec2 uv = vUv;
        float dist = distance(uv, center);
        
        // Create swirling portal effect
        float angle = atan(uv.y - center.y, uv.x - center.x);
        float spiral = sin(angle * 8.0 + time * 3.0 - dist * 20.0);
        
        // Energy rings
        float rings = sin(dist * 30.0 - time * 5.0) * 0.5 + 0.5;
        
        // Portal rim glow
        float rim = 1.0 - smoothstep(0.3, 0.5, dist);
        rim = pow(rim, rimPower);
        
        // Beat-reactive pulsing
        float pulse = 1.0 + beatPulse * 2.0;
        
        // Combine effects
        float intensity = (spiral * rings + rim) * activation * pulse;
        
        // Distortion effect for portal opening
        vec2 distortion = vec2(
          sin(time * 2.0 + dist * 10.0) * activation * 0.1,
          cos(time * 1.5 + dist * 8.0) * activation * 0.1
        );
        
        gl_FragColor = vec4(portalColor, intensity);
      }
    `;
  }

  public update(audioFeatures: AdvancedAudioFeatures): void {
    // Portal opens on strong beat drops or tempo changes
    const shouldActivate = audioFeatures.beatStrength > this.activationThreshold || 
                          audioFeatures.instrumentDetection.bass > 0.8;
    
    if (shouldActivate && !this.isActive) {
      this.openPortal(audioFeatures);
    } else if (!shouldActivate && this.isActive) {
      this.closePortal();
    }
    
    if (this.isActive) {
      this.portalMaterial.uniforms.beatPulse.value = audioFeatures.beatDetected ? 1.0 : 0.0;
      this.portalMaterial.uniforms.activation.value = Math.min(1.0, audioFeatures.beatStrength * 1.5);
    }
  }

  private openPortal(audioFeatures: AdvancedAudioFeatures): void {
    this.isActive = true;
    // Animate portal opening with scale and opacity
    // Position based on beat strength and current tempo
  }
}
```

### Step 3: Plasma Wave System
Create `src/renderer/visualizers/effects/plasma-system.ts`:
```typescript
export class PlasmaSystem {
  private plasmaGeometry: THREE.PlaneGeometry;
  private plasmaMaterial: THREE.ShaderMaterial;
  private plasmaMesh: THREE.Mesh;

  private createPlasmaShader(): string {
    return `
      uniform float time;
      uniform float bassLevel;
      uniform float midLevel;
      uniform float trebleLevel;
      uniform vec2 resolution;
      uniform float waveSpeed;
      uniform float waveAmplitude;
      
      varying vec2 vUv;
      
      // Plasma wave generation
      float plasma(vec2 p, float time) {
        float c = sin(p.x * 10.0 + time);
        c += sin(p.y * 10.0 + time);
        c += sin((p.x + p.y) * 10.0 + time);
        c += sin(sqrt(p.x * p.x + p.y * p.y) * 10.0 + time);
        return c;
      }
      
      void main() {
        vec2 uv = vUv;
        vec2 p = (uv - 0.5) * 2.0;
        
        // Generate plasma field
        float plasmaField = plasma(p, time * waveSpeed);
        
        // Audio-reactive modulation
        plasmaField += sin(time * 2.0) * bassLevel * 2.0;
        plasmaField += cos(time * 3.0 + p.x * 5.0) * midLevel * 1.5;
        plasmaField += sin(time * 4.0 + p.y * 7.0) * trebleLevel;
        
        // Color mapping
        vec3 color1 = vec3(1.0, 0.2, 0.8); // Magenta
        vec3 color2 = vec3(0.2, 0.8, 1.0); // Cyan
        vec3 color3 = vec3(1.0, 0.8, 0.2); // Yellow
        
        vec3 finalColor = mix(color1, color2, sin(plasmaField) * 0.5 + 0.5);
        finalColor = mix(finalColor, color3, cos(plasmaField * 0.7) * 0.5 + 0.5);
        
        // Intensity based on audio energy
        float intensity = (bassLevel + midLevel + trebleLevel) / 3.0;
        
        gl_FragColor = vec4(finalColor * intensity, intensity * 0.8);
      }
    `;
  }
}
```

### Step 4: Wormhole Effect System
Create `src/renderer/visualizers/effects/wormhole-system.ts`:
```typescript
export class WormholeSystem {
  private wormholeGeometry: THREE.CylinderGeometry;
  private wormholeMaterial: THREE.ShaderMaterial;
  private wormholeMesh: THREE.Mesh;
  private tunnelSegments: THREE.Mesh[] = [];

  private createWormholeShader(): string {
    return `
      uniform float time;
      uniform float tempoChange;
      uniform float rhythmComplexity;
      uniform vec3 tunnelColor;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vec2 uv = vUv;
        
        // Create tunnel effect
        float tunnel = length(uv - vec2(0.5)) * 2.0;
        tunnel = 1.0 - tunnel;
        tunnel = pow(tunnel, 3.0);
        
        // Moving rings effect
        float rings = sin((tunnel + time * 2.0) * 20.0) * 0.5 + 0.5;
        
        // Tempo-reactive distortion
        float distortion = sin(time * tempoChange * 0.1 + vPosition.z * 0.5);
        tunnel += distortion * rhythmComplexity * 0.3;
        
        // Energy flowing through tunnel
        float flow = sin(time * 5.0 + tunnel * 10.0);
        
        vec3 color = tunnelColor * (rings + flow * 0.5);
        float alpha = tunnel * (0.6 + rhythmComplexity * 0.4);
        
        gl_FragColor = vec4(color, alpha);
      }
    `;
  }

  public update(audioFeatures: AdvancedAudioFeatures): void {
    // Wormhole appears during tempo changes or complex rhythms
    if (audioFeatures.tempoStability < 0.5 || audioFeatures.rhythmComplexity > 0.7) {
      this.activateWormhole(audioFeatures);
    }
  }
}
```

### Step 5: Post-Processing Effects
Create `src/renderer/visualizers/effects/post-processor.ts`:
```typescript
export class PostProcessor {
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private filmPass: FilmPass;
  private glitchPass: GlitchPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    
    // Bloom effect for cosmic glow
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    );
    
    // Film grain for texture
    this.filmPass = new FilmPass(0.35, 0.025, 648, false);
    
    // Glitch effect for beat drops
    this.glitchPass = new GlitchPass();
    
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.filmPass);
  }

  public update(audioFeatures: AdvancedAudioFeatures): void {
    // Adjust bloom based on overall energy
    this.bloomPass.strength = 1.0 + audioFeatures.overallLevel * 2.0;
    this.bloomPass.radius = 0.4 + audioFeatures.bassLevel * 0.3;
    
    // Add glitch effect on strong beats
    if (audioFeatures.beatDetected && audioFeatures.beatStrength > 0.8) {
      this.composer.addPass(this.glitchPass);
    } else {
      this.composer.removePass(this.glitchPass);
    }
  }

  public render(): void {
    this.composer.render();
  }
}
```

### Step 6: Cosmic Effect Manager
Create `src/renderer/visualizers/effects/cosmic-effects-manager.ts`:
```typescript
export class CosmicEffectsManager {
  private nebulaeSystem: NebulaeSystem;
  private portalSystem: PortalSystem;
  private plasmaSystem: PlasmaSystem;
  private wormholeSystem: WormholeSystem;
  private postProcessor: PostProcessor;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    this.nebulaeSystem = new NebulaeSystem();
    this.portalSystem = new PortalSystem();
    this.plasmaSystem = new PlasmaSystem();
    this.wormholeSystem = new WormholeSystem();
    this.postProcessor = new PostProcessor(renderer, scene, camera);
    
    // Add all effects to scene
    scene.add(this.nebulaeSystem.getMesh());
    scene.add(this.portalSystem.getMesh());
    scene.add(this.plasmaSystem.getMesh());
    scene.add(this.wormholeSystem.getMesh());
  }

  public update(audioFeatures: AdvancedAudioFeatures, deltaTime: number): void {
    this.nebulaeSystem.update(audioFeatures, deltaTime);
    this.portalSystem.update(audioFeatures);
    this.plasmaSystem.update(audioFeatures);
    this.wormholeSystem.update(audioFeatures);
    this.postProcessor.update(audioFeatures);
  }

  public render(): void {
    this.postProcessor.render();
  }
}
```

## Required Dependencies
```bash
npm install --save three/examples/jsm/postprocessing/EffectComposer
npm install --save three/examples/jsm/postprocessing/RenderPass  
npm install --save three/examples/jsm/postprocessing/UnrealBloomPass
npm install --save three/examples/jsm/postprocessing/FilmPass
npm install --save three/examples/jsm/postprocessing/GlitchPass
```

## Acceptance Criteria
- [ ] **Nebulae Clouds**: Realistic volumetric clouds that respond to audio
- [ ] **Energy Portals**: Portals open/close based on beat drops and bass
- [ ] **Plasma Waves**: Dynamic plasma effects synchronized to mid/treble
- [ ] **Wormhole Effects**: Tunnel effects during tempo changes
- [ ] **Post-processing**: Bloom, film grain, and glitch effects
- [ ] **Performance**: Maintains 45+ FPS with all effects active
- [ ] **Audio Sync**: < 100ms latency for effect triggers
- [ ] **Visual Coherence**: Effects complement each other harmoniously

## Status Tracking
- [ ] **TODO**: Implement all cosmic effect systems
- [ ] **IN PROGRESS**: Currently implementing
- [ ] **COMPLETED**: All acceptance criteria met
- [ ] **TESTED**: Verified with various music types

## Dependencies for Next Sub-task
This provides the cosmic environment foundation for Sub-task 3.2 (Instrument Avatars), which will add transparent musical figures within these cosmic effects. 