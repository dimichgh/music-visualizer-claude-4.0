# Sub-task 2.1: Graphics Foundation - Three.js & Cosmic Visualizations

## Objective
Set up a comprehensive 3D graphics engine using Three.js with WebGL rendering, particle systems, and cosmic-themed visual effects synchronized to audio data from the completed audio infrastructure.

## Technical Requirements
- Three.js 3D graphics engine with WebGL renderer
- Particle systems for cosmic dust, nebulae, and energy effects
- Real-time audio-visual synchronization (60+ FPS)
- Camera controls and scene management
- Shader pipeline for ethereal effects
- Responsive design for different window sizes
- Memory-efficient rendering for long sessions

## Implementation Steps

### Step 1: Install Graphics Dependencies
```bash
# Three.js and related graphics libraries
npm install --save three
npm install --save-dev @types/three

# GUI controls for development/debugging
npm install --save dat.gui
npm install --save-dev @types/dat.gui

# Additional utilities for advanced effects
npm install --save simplex-noise
npm install --save chroma-js
npm install --save-dev @types/chroma-js
```

### Step 2: Graphics Types and Configuration
Create `src/shared/types/graphics.ts`:
```typescript
export interface VisualizationConfig {
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
```

### Step 3: Scene Manager
Create `src/renderer/visualizers/scene-manager.ts`:
```typescript
import * as THREE from 'three';
import { VisualizationConfig, CameraConfig } from '@shared/types';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private animationId: number | null = null;
  private onRenderCallbacks: Array<(deltaTime: number) => void> = [];

  constructor(container: HTMLElement, config: VisualizationConfig) {
    this.container = container;
    this.initializeScene(config);
    this.setupRenderer(config);
    this.setupCamera();
    this.setupLighting();
    this.setupEventListeners();
  }

  private initializeScene(config: VisualizationConfig): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Deep space black
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0025); // Cosmic fog
  }

  private setupRenderer(config: VisualizationConfig): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: config.antialias,
      alpha: config.alpha,
      powerPreference: 'high-performance',
    });

    this.renderer.setSize(config.width, config.height);
    this.renderer.setPixelRatio(Math.min(config.pixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    
    // Enable advanced features
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 10);
  }

  private setupLighting(): void {
    // Ambient light for cosmic glow
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    // Directional light for depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  public addRenderCallback(callback: (deltaTime: number) => void): void {
    this.onRenderCallbacks.push(callback);
  }

  public startRenderLoop(): void {
    let lastTime = 0;
    
    const animate = (currentTime: number) => {
      this.animationId = requestAnimationFrame(animate);
      
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Call all registered render callbacks
      this.onRenderCallbacks.forEach(callback => callback(deltaTime));

      this.renderer.render(this.scene, this.camera);
    };

    animate(0);
  }

  public stopRenderLoop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public dispose(): void {
    this.stopRenderLoop();
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
```

### Step 4: Particle System Engine
Create `src/renderer/visualizers/particle-system.ts`:
```typescript
import * as THREE from 'three';
import { ParticleSystemConfig } from '@shared/types';

export class ParticleSystem {
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial | THREE.ShaderMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private config: ParticleSystemConfig;
  private time: number = 0;

  constructor(config: ParticleSystemConfig, useShader: boolean = false) {
    this.config = config;
    this.initializeGeometry();
    this.initializeMaterial(useShader);
    this.createParticles();
  }

  private initializeGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    
    // Initialize arrays
    this.positions = new Float32Array(this.config.count * 3);
    this.velocities = new Float32Array(this.config.count * 3);
    this.colors = new Float32Array(this.config.count * 3);
    this.sizes = new Float32Array(this.config.count);

    // Generate initial particle data
    for (let i = 0; i < this.config.count; i++) {
      const i3 = i * 3;

      // Random positions in sphere
      const radius = Math.random() * this.config.spread;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      this.positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = radius * Math.cos(phi);

      // Random velocities
      this.velocities[i3] = (Math.random() - 0.5) * this.config.speed;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * this.config.speed;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * this.config.speed;

      // Random colors (will be influenced by audio)
      this.colors[i3] = Math.random();
      this.colors[i3 + 1] = Math.random();
      this.colors[i3 + 2] = Math.random();

      // Random sizes
      this.sizes[i] = Math.random() * this.config.size;
    }

    // Set attributes
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('velocity', new THREE.BufferAttribute(this.velocities, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  private initializeMaterial(useShader: boolean): void {
    if (useShader) {
      this.material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          audioLevel: { value: 0 },
          beatPulse: { value: 0 },
        },
        vertexShader: this.getVertexShader(),
        fragmentShader: this.getFragmentShader(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
    } else {
      this.material = new THREE.PointsMaterial({
        size: this.config.size,
        color: new THREE.Color(this.config.color),
        transparent: true,
        opacity: this.config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      });
    }
  }

  private getVertexShader(): string {
    return `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float time;
      uniform float audioLevel;
      uniform float beatPulse;

      void main() {
        vColor = color;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Audio-reactive size
        float reactiveSize = size * (1.0 + audioLevel * 2.0 + beatPulse * 3.0);
        
        gl_PointSize = reactiveSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
  }

  private getFragmentShader(): string {
    return `
      varying vec3 vColor;
      uniform float time;

      void main() {
        // Create circular particle with glow
        vec2 center = gl_PointCoord - vec2(0.5);
        float distance = length(center);
        
        if (distance > 0.5) discard;
        
        // Glow effect
        float alpha = 1.0 - smoothstep(0.0, 0.5, distance);
        alpha *= alpha; // Quadratic falloff
        
        // Color cycling
        vec3 finalColor = vColor * (1.0 + sin(time + vColor.x * 10.0) * 0.3);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;
  }

  private createParticles(): void {
    this.particles = new THREE.Points(this.geometry, this.material);
  }

  public update(deltaTime: number, audioFeatures: any): void {
    this.time += deltaTime;

    // Update shader uniforms if using shader material
    if (this.material instanceof THREE.ShaderMaterial) {
      this.material.uniforms.time.value = this.time;
      if (audioFeatures) {
        this.material.uniforms.audioLevel.value = audioFeatures.overallLevel || 0;
        this.material.uniforms.beatPulse.value = audioFeatures.beatDetected ? 1.0 : 0.0;
      }
    }

    // Update particle positions based on audio
    this.updateParticlePositions(deltaTime, audioFeatures);

    // Mark geometry as needing update
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private updateParticlePositions(deltaTime: number, audioFeatures: any): void {
    const bassInfluence = audioFeatures?.bassLevel || 0;
    const midInfluence = audioFeatures?.midLevel || 0;
    const trebleInfluence = audioFeatures?.trebleLevel || 0;

    for (let i = 0; i < this.config.count; i++) {
      const i3 = i * 3;

      // Apply velocity with audio influence
      const speedMultiplier = 1 + bassInfluence * 5;
      
      this.positions[i3] += this.velocities[i3] * deltaTime * speedMultiplier;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime * speedMultiplier;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime * speedMultiplier;

      // Audio-reactive colors
      this.colors[i3] = 0.5 + Math.sin(this.time + bassInfluence * 10) * 0.5;
      this.colors[i3 + 1] = 0.5 + Math.sin(this.time + midInfluence * 10 + 2) * 0.5;
      this.colors[i3 + 2] = 0.5 + Math.sin(this.time + trebleInfluence * 10 + 4) * 0.5;

      // Boundary checking - respawn particles
      const distance = Math.sqrt(
        this.positions[i3] ** 2 + 
        this.positions[i3 + 1] ** 2 + 
        this.positions[i3 + 2] ** 2
      );

      if (distance > this.config.spread * 2) {
        // Respawn at center with new velocity
        this.positions[i3] = (Math.random() - 0.5) * 2;
        this.positions[i3 + 1] = (Math.random() - 0.5) * 2;
        this.positions[i3 + 2] = (Math.random() - 0.5) * 2;
      }
    }
  }

  public getParticles(): THREE.Points {
    return this.particles;
  }

  public dispose(): void {
    this.geometry.dispose();
    if (this.material instanceof THREE.Material) {
      this.material.dispose();
    }
  }
}
```

### Step 5: Main Visualization Engine
Create `src/renderer/visualizers/music-visualizer.ts`:
```typescript
import * as THREE from 'three';
import { SceneManager } from './scene-manager';
import { ParticleSystem } from './particle-system';
import { VisualizationConfig, ParticleSystemConfig } from '@shared/types';

export class MusicVisualizer {
  private sceneManager: SceneManager;
  private particleSystems: ParticleSystem[] = [];
  private audioFeatures: any = null;
  private isInitialized = false;

  constructor(container: HTMLElement) {
    const config: VisualizationConfig = {
      width: container.clientWidth,
      height: container.clientHeight,
      pixelRatio: window.devicePixelRatio,
      antialias: true,
      alpha: true,
    };

    this.sceneManager = new SceneManager(container, config);
    this.initializeVisualizations();
    this.setupRenderLoop();
    this.isInitialized = true;
  }

  private initializeVisualizations(): void {
    // Create cosmic dust particles
    const dustConfig: ParticleSystemConfig = {
      count: 2000,
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
      count: 500,
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
      count: 200,
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

  private createStarField(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
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

  public dispose(): void {
    this.particleSystems.forEach(system => system.dispose());
    this.sceneManager.dispose();
  }
}
```

## Acceptance Criteria
- [ ] **Three.js Setup**: Scene, camera, renderer properly configured
- [ ] **Particle Systems**: Multiple particle systems with different behaviors
- [ ] **Audio Integration**: Visuals react to bass, mid, treble, and beat detection
- [ ] **Performance**: Maintains 60+ FPS with 3000+ particles
- [ ] **Shaders**: Custom shaders for ethereal particle effects
- [ ] **Camera Control**: Dynamic camera movement synchronized to music
- [ ] **Cosmic Theme**: Starfield, cosmic dust, energy waves
- [ ] **Real-time Sync**: < 50ms latency between audio and visual response

## Status Tracking
- [ ] **TODO**: Implement all steps above
- [ ] **IN PROGRESS**: Currently implementing
- [ ] **COMPLETED**: All acceptance criteria met
- [ ] **TESTED**: Verified with various audio sources

## Dependencies for Next Sub-task
This provides the graphics foundation for Sub-task 2.2 (Audio-Visual Mapping), which will add advanced synchronization algorithms and more sophisticated visual effects.

## Notes
- Start with basic Three.js setup and verify rendering
- Implement particle systems incrementally
- Test performance with various particle counts
- Ensure proper cleanup to prevent memory leaks 