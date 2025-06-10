import * as THREE from 'three';

export class EnergyPortal {
  private scene: THREE.Scene;
  private portalGroup: THREE.Group;
  private eventHorizon!: THREE.Mesh;
  private particleStream!: THREE.Points;
  private energyRings: THREE.Mesh[] = [];
  
  // Geometry and materials
  private horizonGeometry!: THREE.RingGeometry;
  private horizonMaterial!: THREE.ShaderMaterial;
  private streamGeometry!: THREE.BufferGeometry;
  private streamMaterial!: THREE.PointsMaterial;
  
  // Animation state
  private active = false;
  private intensity = 0;
  private rotationSpeed = 0;
  private lifetime = 0;
  private maxLifetime = 8000; // 8 seconds
  private pulsePhase = 0;
  
  // Portal properties
  private position = new THREE.Vector3();
  private scale = 1.0;
  private targetScale = 1.0;
  
  // Particle stream data
  private streamPositions!: Float32Array;
  private streamVelocities!: Float32Array;
  private streamColors!: Float32Array;
  private streamSizes!: Float32Array;
  private streamCount = 200;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.portalGroup = new THREE.Group();
    this.scene.add(this.portalGroup);
    
    this.initializePortal();
    this.setVisible(false);
  }

  private initializePortal(): void {
    this.createEventHorizon();
    this.createParticleStream();
    this.createEnergyRings();
  }

  private createEventHorizon(): void {
    // Create portal ring geometry
    this.horizonGeometry = new THREE.RingGeometry(1.5, 3.0, 32);
    
    // Shader material for the portal effect
    this.horizonMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0 },
        portalColor: { value: new THREE.Color(0x8B0DFF) },
        centerColor: { value: new THREE.Color(0x0D8BFF) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        uniform float time;
        uniform float intensity;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          // Add some warping effect
          vec3 pos = position;
          float warp = sin(time * 2.0 + length(pos.xy) * 4.0) * 0.1 * intensity;
          pos.z += warp;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform vec3 portalColor;
        uniform vec3 centerColor;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          // Create spiral pattern
          float angle = atan(vUv.y - center.y, vUv.x - center.x);
          float spiral = sin(angle * 8.0 + time * 4.0 - dist * 10.0);
          
          // Energy waves
          float wave = sin(dist * 20.0 - time * 6.0) * 0.5 + 0.5;
          
          // Combine effects
          float energy = (spiral * 0.3 + wave * 0.7) * intensity;
          energy *= smoothstep(0.3, 0.7, dist); // Fade toward center
          energy *= smoothstep(1.0, 0.8, dist); // Fade toward edge
          
          vec3 color = mix(centerColor, portalColor, dist);
          color *= energy;
          
          gl_FragColor = vec4(color, energy * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.eventHorizon = new THREE.Mesh(this.horizonGeometry, this.horizonMaterial);
    this.portalGroup.add(this.eventHorizon);
  }

  private createParticleStream(): void {
    this.streamGeometry = new THREE.BufferGeometry();
    
    // Initialize particle data
    this.streamPositions = new Float32Array(this.streamCount * 3);
    this.streamVelocities = new Float32Array(this.streamCount * 3);
    this.streamColors = new Float32Array(this.streamCount * 3);
    this.streamSizes = new Float32Array(this.streamCount);

    // Generate particles flowing through the portal
    for (let i = 0; i < this.streamCount; i++) {
      const i3 = i * 3;
      
      // Start particles at random positions in a cylinder
      const radius = Math.random() * 2.5;
      const angle = Math.random() * Math.PI * 2;
      const z = (Math.random() - 0.5) * 10;
      
      this.streamPositions[i3] = Math.cos(angle) * radius;
      this.streamPositions[i3 + 1] = Math.sin(angle) * radius;
      this.streamPositions[i3 + 2] = z;
      
      // Velocities point toward the portal center with some spiral
      this.streamVelocities[i3] = -this.streamPositions[i3] * 0.1;
      this.streamVelocities[i3 + 1] = -this.streamPositions[i3 + 1] * 0.1;
      this.streamVelocities[i3 + 2] = -z * 0.05;
      
      // Bright colors
      this.streamColors[i3] = 0.5 + Math.random() * 0.5;     // Red
      this.streamColors[i3 + 1] = 0.3 + Math.random() * 0.7; // Green
      this.streamColors[i3 + 2] = 0.8 + Math.random() * 0.2; // Blue
      
      this.streamSizes[i] = 0.5 + Math.random() * 1.5;
    }

    // Set geometry attributes
    this.streamGeometry.setAttribute('position', new THREE.BufferAttribute(this.streamPositions, 3));
    this.streamGeometry.setAttribute('color', new THREE.BufferAttribute(this.streamColors, 3));
    this.streamGeometry.setAttribute('size', new THREE.BufferAttribute(this.streamSizes, 1));

    // Create material
    this.streamMaterial = new THREE.PointsMaterial({
      size: 2.0,
      sizeAttenuation: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    this.particleStream = new THREE.Points(this.streamGeometry, this.streamMaterial);
    this.portalGroup.add(this.particleStream);
  }

  private createEnergyRings(): void {
    // Create multiple energy rings around the portal
    const ringCount = 3;
    
    for (let i = 0; i < ringCount; i++) {
      const ringGeometry = new THREE.RingGeometry(3.2 + i * 0.5, 3.5 + i * 0.5, 24);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.7 + i * 0.1, 1.0, 0.5),
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.z = (i - 1) * 0.2;
      
      this.energyRings.push(ring);
      this.portalGroup.add(ring);
    }
  }

  public trigger(position: THREE.Vector3, intensity: number, audioData: any): void {
    this.active = true;
    this.position.copy(position);
    this.intensity = intensity;
    this.lifetime = 0;
    this.pulsePhase = 0;
    
    // Set portal position and orientation
    this.portalGroup.position.copy(this.position);
    this.portalGroup.lookAt(0, 0, 0); // Face toward center
    
    // Set initial scale and rotation
    this.scale = 0.1;
    this.targetScale = 0.8 + intensity * 0.5;
    this.rotationSpeed = (0.5 + intensity * 1.5) * (Math.random() > 0.5 ? 1 : -1);
    
    // Update portal colors based on audio
    if (audioData.dominantFrequency) {
      const hue = (audioData.dominantFrequency / 2000) % 1.0;
      const portalColor = new THREE.Color().setHSL(hue, 1.0, 0.6);
      const centerColor = new THREE.Color().setHSL((hue + 0.3) % 1.0, 1.0, 0.8);
      
      this.horizonMaterial.uniforms.portalColor.value = portalColor;
      this.horizonMaterial.uniforms.centerColor.value = centerColor;
    }
    
    this.setVisible(true);
    
    console.log('EnergyPortal triggered at:', position, 'intensity:', intensity);
  }

  public update(deltaTime: number, intensity: number, audioData: any): void {
    if (!this.active) return;
    
    this.lifetime += deltaTime;
    this.pulsePhase += deltaTime * 0.005;
    
    // Update intensity based on current audio
    this.intensity = this.intensity * 0.8 + intensity * 0.2;
    
    // Scale animation
    this.scale += (this.targetScale - this.scale) * 0.05;
    const pulsation = Math.sin(this.pulsePhase * 3) * 0.1 * this.intensity;
    const finalScale = this.scale * (1.0 + pulsation);
    
    this.portalGroup.scale.setScalar(finalScale);
    
    // Rotation
    this.eventHorizon.rotation.z += this.rotationSpeed * deltaTime * 0.001;
    
    // Update shader uniforms
    this.horizonMaterial.uniforms.time.value = this.lifetime * 0.001;
    this.horizonMaterial.uniforms.intensity.value = this.intensity;
    
    // Update particle stream
    this.updateParticleStream(deltaTime);
    
    // Update energy rings
    this.energyRings.forEach((ring, index) => {
      ring.rotation.z += this.rotationSpeed * 0.5 * (index + 1) * deltaTime * 0.001;
      const opacity = 0.3 * this.intensity * (1.0 + Math.sin(this.pulsePhase * 2 + index) * 0.3);
      (ring.material as THREE.MeshBasicMaterial).opacity = opacity;
    });
    
    // Fade out over lifetime
    if (this.lifetime > this.maxLifetime * 0.7) {
      const fadeProgress = (this.lifetime - this.maxLifetime * 0.7) / (this.maxLifetime * 0.3);
      const fade = 1.0 - fadeProgress;
      this.portalGroup.scale.multiplyScalar(fade);
      
      if (this.lifetime > this.maxLifetime) {
        this.active = false;
        this.setVisible(false);
      }
    }
  }

  private updateParticleStream(deltaTime: number): void {
    for (let i = 0; i < this.streamCount; i++) {
      const i3 = i * 3;
      
      // Update positions
      this.streamPositions[i3] += this.streamVelocities[i3] * deltaTime * 0.1;
      this.streamPositions[i3 + 1] += this.streamVelocities[i3 + 1] * deltaTime * 0.1;
      this.streamPositions[i3 + 2] += this.streamVelocities[i3 + 2] * deltaTime * 0.1;
      
      // Reset particles that get too close to center
      const distance = Math.sqrt(
        this.streamPositions[i3] ** 2 + 
        this.streamPositions[i3 + 1] ** 2 + 
        this.streamPositions[i3 + 2] ** 2
      );
      
      if (distance < 0.5) {
        // Respawn at edge
        const radius = 2.5 + Math.random() * 1.0;
        const angle = Math.random() * Math.PI * 2;
        const z = (Math.random() - 0.5) * 8;
        
        this.streamPositions[i3] = Math.cos(angle) * radius;
        this.streamPositions[i3 + 1] = Math.sin(angle) * radius;
        this.streamPositions[i3 + 2] = z;
        
        // Update velocity toward center with spiral
        this.streamVelocities[i3] = -this.streamPositions[i3] * 0.1;
        this.streamVelocities[i3 + 1] = -this.streamPositions[i3 + 1] * 0.1;
        this.streamVelocities[i3 + 2] = -z * 0.05;
      }
      
      // Update colors based on distance and intensity
      const colorIntensity = this.intensity * (1.0 - distance / 5.0);
      this.streamColors[i3] = 0.5 + colorIntensity * 0.5;
      this.streamColors[i3 + 1] = 0.3 + colorIntensity * 0.7;
      this.streamColors[i3 + 2] = 0.8 + colorIntensity * 0.2;
      
      // Size varies with intensity and distance
      this.streamSizes[i] = (0.5 + Math.random() * 1.5) * this.intensity * (1.0 + distance * 0.1);
    }
    
    // Update geometry
    this.streamGeometry.attributes.position.needsUpdate = true;
    this.streamGeometry.attributes.color.needsUpdate = true;
    this.streamGeometry.attributes.size.needsUpdate = true;
  }

  public isActive(): boolean {
    return this.active;
  }

  public setVisible(visible: boolean): void {
    this.portalGroup.visible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.portalGroup);
    
    // Dispose geometries
    this.horizonGeometry?.dispose();
    this.streamGeometry?.dispose();
    this.energyRings.forEach(ring => ring.geometry.dispose());
    
    // Dispose materials
    this.horizonMaterial?.dispose();
    this.streamMaterial?.dispose();
    this.energyRings.forEach(ring => (ring.material as THREE.Material).dispose());
    
    console.log('EnergyPortal disposed');
  }
} 