import * as THREE from 'three';

export class GravitationalLens {
  private scene: THREE.Scene;
  private lensGroup: THREE.Group;
  private distortionField!: THREE.Mesh;
  private accretionDisk!: THREE.Points;
  private gravityWaves: THREE.Mesh[] = [];
  
  // Geometry and materials
  private fieldGeometry!: THREE.PlaneGeometry;
  private fieldMaterial!: THREE.ShaderMaterial;
  private diskGeometry!: THREE.BufferGeometry;
  private diskMaterial!: THREE.PointsMaterial;
  
  // Animation state
  private active = false;
  private intensity = 0;
  private lifetime = 0;
  private maxLifetime = 10000; // 10 seconds
  private gravitationalPhase = 0;
  
  // Lens properties
  private position = new THREE.Vector3();
  private distortionStrength = 0;
  private targetDistortion = 0;
  
  // Accretion disk data
  private diskPositions!: Float32Array;
  private diskVelocities!: Float32Array;
  private diskColors!: Float32Array;
  private diskSizes!: Float32Array;
  private diskCount = 300;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lensGroup = new THREE.Group();
    this.scene.add(this.lensGroup);
    
    this.initializeGravitationalLens();
    this.setVisible(false);
  }

  private initializeGravitationalLens(): void {
    this.createDistortionField();
    this.createAccretionDisk();
    this.createGravityWaves();
  }

  private createDistortionField(): void {
    // Large invisible plane for distortion effects
    this.fieldGeometry = new THREE.PlaneGeometry(20, 20, 64, 64);
    
    // Shader material for gravitational lensing distortion
    this.fieldMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0 },
        distortionStrength: { value: 0 },
        lensPosition: { value: new THREE.Vector3() },
        gravityColor: { value: new THREE.Color(0x4A0E4E) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        
        uniform float time;
        uniform float intensity;
        uniform float distortionStrength;
        uniform vec3 lensPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          
          // Create gravitational distortion
          float distanceToLens = distance(worldPosition.xyz, lensPosition);
          float gravityEffect = 1.0 / (1.0 + distanceToLens * distanceToLens * 0.1);
          
          vec3 pos = position;
          
          // Bend space-time
          float curvature = sin(distanceToLens * 2.0 - time * 1.5) * gravityEffect * distortionStrength;
          pos.z += curvature * 2.0;
          
          // Orbital motion simulation
          float orbital = time * (1.0 + gravityEffect) * 0.5;
          pos.x += sin(orbital) * gravityEffect * distortionStrength;
          pos.y += cos(orbital) * gravityEffect * distortionStrength;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform float distortionStrength;
        uniform vec3 gravityColor;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          // Event horizon effect
          float horizon = 1.0 - smoothstep(0.0, 0.3, dist);
          horizon = pow(horizon, 3.0);
          
          // Gravitational wave distortion
          float wave1 = sin(dist * 20.0 - time * 3.0) * 0.5 + 0.5;
          float wave2 = cos(dist * 15.0 - time * 2.5 + 1.57) * 0.5 + 0.5;
          float waves = (wave1 * wave2) * horizon;
          
          // Lensing effect - bend light
          vec2 lensedUV = vUv;
          float lensEffect = horizon * distortionStrength;
          lensedUV += (lensedUV - center) * lensEffect * 0.3;
          
          // Create energy distortion colors
          float energy = waves * intensity * horizon;
          vec3 color = gravityColor * energy;
          
          // Add bright core
          float core = 1.0 - smoothstep(0.0, 0.1, dist);
          color += vec3(1.0, 0.8, 1.0) * core * intensity * 0.5;
          
          float alpha = energy * 0.7 + core * 0.3;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.distortionField = new THREE.Mesh(this.fieldGeometry, this.fieldMaterial);
    this.lensGroup.add(this.distortionField);
  }

  private createAccretionDisk(): void {
    this.diskGeometry = new THREE.BufferGeometry();
    
    // Initialize accretion disk particles
    this.diskPositions = new Float32Array(this.diskCount * 3);
    this.diskVelocities = new Float32Array(this.diskCount * 3);
    this.diskColors = new Float32Array(this.diskCount * 3);
    this.diskSizes = new Float32Array(this.diskCount);

    // Generate particles in a disk formation
    for (let i = 0; i < this.diskCount; i++) {
      const i3 = i * 3;
      
      // Spiral disk distribution
      const radius = 2 + Math.random() * 15;
      const angle = (i / this.diskCount) * Math.PI * 8 + Math.random() * 0.5; // Multiple spirals
      const height = (Math.random() - 0.5) * 0.5; // Thin disk
      
      this.diskPositions[i3] = Math.cos(angle) * radius;
      this.diskPositions[i3 + 1] = height;
      this.diskPositions[i3 + 2] = Math.sin(angle) * radius;
      
      // Orbital velocity (closer = faster)
      const orbitalSpeed = Math.sqrt(1.0 / radius); // Realistic orbital mechanics
      this.diskVelocities[i3] = -Math.sin(angle) * orbitalSpeed * 0.1;
      this.diskVelocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      this.diskVelocities[i3 + 2] = Math.cos(angle) * orbitalSpeed * 0.1;
      
      // Temperature-based colors (inner = hotter = bluer)
      const temperature = 1.0 / (1.0 + radius * 0.1);
      this.diskColors[i3] = 0.8 + temperature * 0.2;     // Red
      this.diskColors[i3 + 1] = 0.5 + temperature * 0.5; // Green
      this.diskColors[i3 + 2] = 0.3 + temperature * 0.7; // Blue
      
      this.diskSizes[i] = 0.3 + Math.random() * 0.7 + temperature * 1.0;
    }

    this.diskGeometry.setAttribute('position', new THREE.BufferAttribute(this.diskPositions, 3));
    this.diskGeometry.setAttribute('color', new THREE.BufferAttribute(this.diskColors, 3));
    this.diskGeometry.setAttribute('size', new THREE.BufferAttribute(this.diskSizes, 1));

    this.diskMaterial = new THREE.PointsMaterial({
      size: 4.0,
      sizeAttenuation: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    this.accretionDisk = new THREE.Points(this.diskGeometry, this.diskMaterial);
    this.lensGroup.add(this.accretionDisk);
  }

  private createGravityWaves(): void {
    // Create concentric gravity wave rings
    const waveCount = 4;
    
    for (let i = 0; i < waveCount; i++) {
      const radius = 8 + i * 4;
      const waveGeometry = new THREE.RingGeometry(radius, radius + 0.5, 32);
      const waveMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.75, 0.8, 0.3 + i * 0.1),
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      
      const wave = new THREE.Mesh(waveGeometry, waveMaterial);
      wave.rotation.x = Math.PI / 2; // Lay flat
      wave.position.y = 0;
      
      this.gravityWaves.push(wave);
      this.lensGroup.add(wave);
    }
  }

  public trigger(position: THREE.Vector3, intensity: number, audioData: any): void {
    this.active = true;
    this.position.copy(position);
    this.intensity = intensity;
    this.lifetime = 0;
    this.gravitationalPhase = 0;
    
    // Set lens position
    this.lensGroup.position.copy(this.position);
    
    // Set distortion strength based on intensity
    this.targetDistortion = intensity * 0.8;
    this.distortionStrength = 0;
    
    // Update shader uniforms
    this.fieldMaterial.uniforms.lensPosition.value = this.position;
    
    // Update colors based on audio
    if (audioData.dominantFrequency) {
      const freqFactor = audioData.dominantFrequency / 4000;
      const gravityColor = new THREE.Color().setHSL(0.7 + freqFactor * 0.3, 0.9, 0.4);
      this.fieldMaterial.uniforms.gravityColor.value = gravityColor;
    }
    
    this.setVisible(true);
    
    console.log('GravitationalLens triggered at:', position, 'intensity:', intensity);
  }

  public update(deltaTime: number, intensity: number, audioData: any): void {
    if (!this.active) return;
    
    this.lifetime += deltaTime;
    this.gravitationalPhase += deltaTime * 0.002;
    
    // Update intensity
    this.intensity = this.intensity * 0.9 + intensity * 0.1;
    
    // Gradually build up distortion
    this.distortionStrength += (this.targetDistortion - this.distortionStrength) * 0.02;
    
    // Update shader uniforms
    this.fieldMaterial.uniforms.time.value = this.lifetime * 0.001;
    this.fieldMaterial.uniforms.intensity.value = this.intensity;
    this.fieldMaterial.uniforms.distortionStrength.value = this.distortionStrength;
    
    // Update accretion disk
    this.updateAccretionDisk(deltaTime);
    
    // Update gravity waves
    this.updateGravityWaves(deltaTime);
    
    // Rotation of the entire lens system
    this.lensGroup.rotation.y += deltaTime * 0.0005 * this.intensity;
    
    // Fade out over lifetime
    if (this.lifetime > this.maxLifetime * 0.7) {
      const fadeProgress = (this.lifetime - this.maxLifetime * 0.7) / (this.maxLifetime * 0.3);
      const fade = 1.0 - fadeProgress;
      
      this.distortionStrength *= fade;
      this.diskMaterial.opacity = 0.8 * fade;
      
      if (this.lifetime > this.maxLifetime) {
        this.active = false;
        this.setVisible(false);
      }
    }
  }

  private updateAccretionDisk(deltaTime: number): void {
    for (let i = 0; i < this.diskCount; i++) {
      const i3 = i * 3;
      
      // Update positions with orbital motion
      this.diskPositions[i3] += this.diskVelocities[i3] * deltaTime * 0.1;
      this.diskPositions[i3 + 1] += this.diskVelocities[i3 + 1] * deltaTime * 0.1;
      this.diskPositions[i3 + 2] += this.diskVelocities[i3 + 2] * deltaTime * 0.1;
      
      // Calculate distance from center for orbital mechanics
      const radius = Math.sqrt(
        this.diskPositions[i3] ** 2 + 
        this.diskPositions[i3 + 2] ** 2
      );
      
      // Apply gravitational acceleration toward center
      if (radius > 0.1) {
        const gravityStrength = this.intensity * 0.00001;
        this.diskVelocities[i3] -= (this.diskPositions[i3] / radius) * gravityStrength * deltaTime;
        this.diskVelocities[i3 + 2] -= (this.diskPositions[i3 + 2] / radius) * gravityStrength * deltaTime;
      }
      
      // Update colors based on temperature and distance
      const temperature = 1.0 / (1.0 + radius * 0.1);
      const energyFactor = this.intensity * (1.0 + temperature);
      
      this.diskColors[i3] = (0.8 + temperature * 0.2) * energyFactor;
      this.diskColors[i3 + 1] = (0.5 + temperature * 0.5) * energyFactor;
      this.diskColors[i3 + 2] = (0.3 + temperature * 0.7) * energyFactor;
      
      // Size varies with temperature and intensity
      this.diskSizes[i] = (0.3 + Math.random() * 0.7 + temperature * 1.0) * this.intensity;
    }
    
    // Update geometry
    this.diskGeometry.attributes.position.needsUpdate = true;
    this.diskGeometry.attributes.color.needsUpdate = true;
    this.diskGeometry.attributes.size.needsUpdate = true;
  }

  private updateGravityWaves(deltaTime: number): void {
    this.gravityWaves.forEach((wave, index) => {
      // Rotate waves at different speeds
      wave.rotation.z += deltaTime * 0.0005 * (index + 1) * this.intensity;
      
      // Pulsation effect
      const pulsation = Math.sin(this.gravitationalPhase * 3 + index * 0.5) * 0.1 + 1.0;
      wave.scale.setScalar(pulsation * this.intensity);
      
      // Update opacity
      const baseOpacity = 0.2 * this.intensity;
      const waveEffect = Math.sin(this.gravitationalPhase * 2 + index) * 0.1;
      (wave.material as THREE.MeshBasicMaterial).opacity = baseOpacity + waveEffect;
    });
  }

  public isActive(): boolean {
    return this.active;
  }

  public setVisible(visible: boolean): void {
    this.lensGroup.visible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.lensGroup);
    
    // Dispose geometries
    this.fieldGeometry?.dispose();
    this.diskGeometry?.dispose();
    this.gravityWaves.forEach(wave => wave.geometry.dispose());
    
    // Dispose materials
    this.fieldMaterial?.dispose();
    this.diskMaterial?.dispose();
    this.gravityWaves.forEach(wave => (wave.material as THREE.Material).dispose());
    
    console.log('GravitationalLens disposed');
  }
} 