import * as THREE from 'three';

export interface NebulaConfig {
  particleCount: number;
  baseSize: number;
  maxSize: number;
  expansionRate: number;
  colorShiftRate: number;
  opacity: number;
}

export class NebulaSystem {
  private scene: THREE.Scene;
  private nebulae: EmissionNebula[] = [];
  private darkNebulae: DarkNebula[] = [];
  private config: NebulaConfig;
  
  // Color palettes for different moods
  private colorPalettes = {
    cosmic: [
      new THREE.Color(0x8B0DFF), // Deep purple
      new THREE.Color(0xFF0D8B), // Magenta
      new THREE.Color(0x0D8BFF), // Cyan
      new THREE.Color(0xFF8B0D), // Orange
    ],
    ethereal: [
      new THREE.Color(0x4A90E2), // Soft blue
      new THREE.Color(0xE24A90), // Pink
      new THREE.Color(0x90E24A), // Green
      new THREE.Color(0xE2904A), // Amber
    ],
    fiery: [
      new THREE.Color(0xFF4500), // Red orange
      new THREE.Color(0xFF6347), // Tomato
      new THREE.Color(0xFF7F50), // Coral
      new THREE.Color(0xFFD700), // Gold
    ]
  };
  
  private currentPalette: THREE.Color[] = this.colorPalettes.cosmic;
  private totalParticles = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    this.config = {
      particleCount: 2000,
      baseSize: 0.5,
      maxSize: 3.0,
      expansionRate: 1.2,
      colorShiftRate: 0.5,
      opacity: 0.6
    };

    this.initializeNebulae();
  }

  private initializeNebulae(): void {
    // Create multiple emission nebulae at different positions
    const nebulaCount = 4;
    
    for (let i = 0; i < nebulaCount; i++) {
      const position = this.generateNebulaPosition(i, nebulaCount);
      const nebula = new EmissionNebula(
        this.scene,
        position,
        this.config.particleCount / nebulaCount,
        this.currentPalette[i % this.currentPalette.length]
      );
      this.nebulae.push(nebula);
      this.totalParticles += this.config.particleCount / nebulaCount;
    }

    // Create dark nebulae for contrast
    const darkNebulaCount = 2;
    for (let i = 0; i < darkNebulaCount; i++) {
      const position = this.generateNebulaPosition(i + nebulaCount, nebulaCount + darkNebulaCount);
      const darkNebula = new DarkNebula(
        this.scene,
        position,
        this.config.particleCount / (nebulaCount * 2)
      );
      this.darkNebulae.push(darkNebula);
      this.totalParticles += this.config.particleCount / (nebulaCount * 2);
    }

    console.log(`NebulaSystem: Initialized ${this.nebulae.length} emission nebulae and ${this.darkNebulae.length} dark nebulae with ${this.totalParticles} total particles`);
  }

  private generateNebulaPosition(index: number, total: number): THREE.Vector3 {
    // Distribute nebulae in a spherical pattern around the origin
    const radius = 25 + Math.random() * 15; // 25-40 units from center
    const theta = (index / total) * Math.PI * 2 + Math.random() * 0.5; // Slight randomization
    const phi = Math.random() * Math.PI; // Random vertical position

    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) * 0.3, // Flatter distribution vertically
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  public update(deltaTime: number, intensity: number, audioData: any): void {
    // Update all emission nebulae
    this.nebulae.forEach((nebula, index) => {
      // Calculate individual nebula intensity based on frequency analysis
      let nebulaIntensity = intensity;
      
      // Add some variation based on dominant frequency
      if (audioData.dominantFrequency) {
        const freqFactor = Math.sin((audioData.dominantFrequency / 1000) * Math.PI + index);
        nebulaIntensity *= (1.0 + freqFactor * 0.3);
      }
      
      nebula.update(deltaTime, nebulaIntensity, audioData);
    });

    // Update dark nebulae
    this.darkNebulae.forEach((darkNebula, index) => {
      // Dark nebulae respond less intensely and with inverse relationship
      const darkIntensity = (1.0 - intensity * 0.7) * 0.5;
      darkNebula.update(deltaTime, darkIntensity, audioData);
    });
  }

  public triggerColorShift(intensity: number): void {
    // Change color palette based on intensity
    if (intensity > 0.8) {
      this.currentPalette = this.colorPalettes.fiery;
    } else if (intensity > 0.5) {
      this.currentPalette = this.colorPalettes.cosmic;
    } else {
      this.currentPalette = this.colorPalettes.ethereal;
    }

    // Apply new colors to nebulae
    this.nebulae.forEach((nebula, index) => {
      const newColor = this.currentPalette[index % this.currentPalette.length];
      nebula.setTargetColor(newColor);
    });

    console.log('NebulaSystem: Color shift triggered with intensity', intensity);
  }

  public getParticleCount(): number {
    return this.totalParticles;
  }

  public dispose(): void {
    this.nebulae.forEach(nebula => nebula.dispose());
    this.darkNebulae.forEach(darkNebula => darkNebula.dispose());
    this.nebulae = [];
    this.darkNebulae = [];
    console.log('NebulaSystem: Disposed');
  }
}

// Emission Nebula - Bright, colorful nebula
class EmissionNebula {
  private scene: THREE.Scene;
  private particles!: THREE.Points;
  private material!: THREE.PointsMaterial;
  private geometry!: THREE.BufferGeometry;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private velocities!: Float32Array;
  
  private basePosition: THREE.Vector3;
  private currentColor: THREE.Color;
  private targetColor: THREE.Color;
  private baseSize: number;
  private expansionFactor = 1.0;
  
  // Animation properties
  private time = 0;
  private pulsationPhase = Math.random() * Math.PI * 2;

  constructor(
    scene: THREE.Scene, 
    position: THREE.Vector3, 
    particleCount: number, 
    color: THREE.Color
  ) {
    this.scene = scene;
    this.basePosition = position.clone();
    this.currentColor = color.clone();
    this.targetColor = color.clone();
    this.baseSize = 0.8;

    this.initializeGeometry(particleCount);
    this.initializeMaterial();
    this.createParticleSystem();
  }

  private initializeGeometry(particleCount: number): void {
    this.geometry = new THREE.BufferGeometry();
    
    // Initialize arrays
    this.positions = new Float32Array(particleCount * 3);
    this.colors = new Float32Array(particleCount * 3);
    this.sizes = new Float32Array(particleCount);
    this.velocities = new Float32Array(particleCount * 3);

    // Generate particles in a spherical distribution
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Spherical distribution with some clustering
      const radius = Math.pow(Math.random(), 0.7) * 8; // Bias toward center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      this.positions[i3] = this.basePosition.x + radius * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = this.basePosition.y + radius * Math.cos(phi);
      this.positions[i3 + 2] = this.basePosition.z + radius * Math.sin(phi) * Math.sin(theta);

      // Random colors within the nebula's color range
      const colorVariation = 0.3;
      this.colors[i3] = this.currentColor.r + (Math.random() - 0.5) * colorVariation;
      this.colors[i3 + 1] = this.currentColor.g + (Math.random() - 0.5) * colorVariation;
      this.colors[i3 + 2] = this.currentColor.b + (Math.random() - 0.5) * colorVariation;

      // Random sizes
      this.sizes[i] = this.baseSize * (0.5 + Math.random() * 1.5);

      // Small random velocities for gentle movement
      this.velocities[i3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    // Set attributes
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  private initializeMaterial(): void {
    // Create texture for particles
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    
    // Create gradient for nebula particle
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 2.0,
      sizeAttenuation: true,
      map: texture,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
  }

  private createParticleSystem(): void {
    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  public update(deltaTime: number, intensity: number, audioData: any): void {
    this.time += deltaTime * 0.001; // Convert to seconds
    
    // Update expansion factor based on audio intensity
    const targetExpansion = 1.0 + intensity * 0.5;
    this.expansionFactor += (targetExpansion - this.expansionFactor) * 0.1;

    // Update color transition
    this.currentColor.lerp(this.targetColor, 0.02);

    // Update particles
    const particleCount = this.positions.length / 3;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Apply gentle movement
      this.positions[i3] += this.velocities[i3] * deltaTime * 0.1;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime * 0.1;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime * 0.1;

      // Pulsation effect
      const pulsation = Math.sin(this.time * 2 + this.pulsationPhase + i * 0.01);
      const sizeFactor = this.expansionFactor * (1.0 + pulsation * 0.2 * intensity);
      this.sizes[i] = this.baseSize * sizeFactor * (0.5 + Math.random() * 0.5);

      // Color updates with slight variation
      const colorIntensity = intensity * (0.8 + pulsation * 0.2);
      this.colors[i3] = this.currentColor.r * colorIntensity;
      this.colors[i3 + 1] = this.currentColor.g * colorIntensity;
      this.colors[i3 + 2] = this.currentColor.b * colorIntensity;
    }

    // Update buffer attributes
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    // Update material opacity based on intensity
    this.material.opacity = 0.6 + intensity * 0.4;
  }

  public setTargetColor(color: THREE.Color): void {
    this.targetColor = color.clone();
  }

  public dispose(): void {
    this.scene.remove(this.particles);
    this.geometry.dispose();
    this.material.dispose();
  }
}

// Dark Nebula - Shadowy, mysterious nebula
class DarkNebula {
  private scene: THREE.Scene;
  private particles!: THREE.Points;
  private material!: THREE.PointsMaterial;
  private geometry!: THREE.BufferGeometry;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  
  private basePosition: THREE.Vector3;
  private time = 0;

  constructor(scene: THREE.Scene, position: THREE.Vector3, particleCount: number) {
    this.scene = scene;
    this.basePosition = position.clone();

    this.initializeGeometry(particleCount);
    this.initializeMaterial();
    this.createParticleSystem();
  }

  private initializeGeometry(particleCount: number): void {
    this.geometry = new THREE.BufferGeometry();
    
    this.positions = new Float32Array(particleCount * 3);
    this.colors = new Float32Array(particleCount * 3);
    this.sizes = new Float32Array(particleCount);

    // Generate dark particles
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      const radius = Math.pow(Math.random(), 0.5) * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      this.positions[i3] = this.basePosition.x + radius * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = this.basePosition.y + radius * Math.cos(phi);
      this.positions[i3 + 2] = this.basePosition.z + radius * Math.sin(phi) * Math.sin(theta);

      // Dark colors with subtle variations
      const darkness = 0.1 + Math.random() * 0.2;
      this.colors[i3] = darkness * 0.5;     // Red
      this.colors[i3 + 1] = darkness * 0.3; // Green  
      this.colors[i3 + 2] = darkness;       // Blue (slightly more blue)

      this.sizes[i] = 1.0 + Math.random() * 2.0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  private initializeMaterial(): void {
    this.material = new THREE.PointsMaterial({
      size: 3.0,
      sizeAttenuation: true,
      vertexColors: true,
      blending: THREE.SubtractiveBlending, // Dark effect
      transparent: true,
      opacity: 0.4
    });
  }

  private createParticleSystem(): void {
    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  public update(deltaTime: number, intensity: number, audioData: any): void {
    this.time += deltaTime * 0.001;
    
    // Dark nebulae move more slowly and mysteriously
    const particleCount = this.positions.length / 3;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Slow, mysterious movement
      const movement = Math.sin(this.time * 0.5 + i * 0.1) * 0.01;
      this.positions[i3 + 1] += movement * deltaTime;
      
      // Size variation based on inverse intensity
      const sizeFactor = 1.0 + (1.0 - intensity) * 0.5;
      this.sizes[i] = (1.0 + Math.random() * 2.0) * sizeFactor;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    
    // Adjust opacity - darker when music is more intense
    this.material.opacity = 0.4 * (1.0 - intensity * 0.5);
  }

  public dispose(): void {
    this.scene.remove(this.particles);
    this.geometry.dispose();
    this.material.dispose();
  }
} 