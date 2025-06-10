import * as THREE from 'three';
import { ParticleSystemConfig } from '@shared/types';

export class ParticleSystem {
  private particles!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial | THREE.ShaderMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private config: ParticleSystemConfig;
  private time: number = 0;

  constructor(config: ParticleSystemConfig, useShader: boolean = false) {
    this.config = config;
    this.positions = new Float32Array(config.count * 3);
    this.velocities = new Float32Array(config.count * 3);
    this.colors = new Float32Array(config.count * 3);
    this.sizes = new Float32Array(config.count);
    
    this.initializeGeometry();
    this.initializeMaterial(useShader);
    this.createParticles();
  }

  private initializeGeometry(): void {
    this.geometry = new THREE.BufferGeometry();

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