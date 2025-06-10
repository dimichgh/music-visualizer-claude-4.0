import * as THREE from 'three';

export class PlasmaWave {
  private scene: THREE.Scene;
  private plasmaGroup: THREE.Group;
  private lightningBolts: LightningBolt[] = [];
  private electricField!: THREE.Points;
  private plasmaSphere!: THREE.Mesh;
  
  // Geometry and materials
  private fieldGeometry!: THREE.BufferGeometry;
  private fieldMaterial!: THREE.PointsMaterial;
  private sphereGeometry!: THREE.SphereGeometry;
  private sphereMaterial!: THREE.ShaderMaterial;
  
  // Animation state
  private active = false;
  private intensity = 0;
  private lifetime = 0;
  private maxLifetime = 4000; // 4 seconds
  private electricityPhase = 0;
  
  // Plasma properties
  private startPosition = new THREE.Vector3();
  private endPosition = new THREE.Vector3();
  private centerPosition = new THREE.Vector3();
  
  // Electric field data
  private fieldPositions!: Float32Array;
  private fieldColors!: Float32Array;
  private fieldSizes!: Float32Array;
  private fieldCount = 150;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.plasmaGroup = new THREE.Group();
    this.scene.add(this.plasmaGroup);
    
    this.initializePlasma();
    this.setVisible(false);
  }

  private initializePlasma(): void {
    this.createElectricField();
    this.createPlasmaSphere();
    this.createLightningBolts();
  }

  private createElectricField(): void {
    this.fieldGeometry = new THREE.BufferGeometry();
    
    // Initialize electric field particles
    this.fieldPositions = new Float32Array(this.fieldCount * 3);
    this.fieldColors = new Float32Array(this.fieldCount * 3);
    this.fieldSizes = new Float32Array(this.fieldCount);

    // Generate particles around the plasma area
    for (let i = 0; i < this.fieldCount; i++) {
      const i3 = i * 3;
      
      // Random positions in a cylindrical area
      const radius = 2 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 12;
      
      this.fieldPositions[i3] = Math.cos(angle) * radius;
      this.fieldPositions[i3 + 1] = height;
      this.fieldPositions[i3 + 2] = Math.sin(angle) * radius;
      
      // Electric blue-white colors
      this.fieldColors[i3] = 0.8 + Math.random() * 0.2;     // Red
      this.fieldColors[i3 + 1] = 0.9 + Math.random() * 0.1; // Green
      this.fieldColors[i3 + 2] = 1.0;                       // Blue
      
      this.fieldSizes[i] = 0.5 + Math.random() * 1.0;
    }

    this.fieldGeometry.setAttribute('position', new THREE.BufferAttribute(this.fieldPositions, 3));
    this.fieldGeometry.setAttribute('color', new THREE.BufferAttribute(this.fieldColors, 3));
    this.fieldGeometry.setAttribute('size', new THREE.BufferAttribute(this.fieldSizes, 1));

    this.fieldMaterial = new THREE.PointsMaterial({
      size: 3.0,
      sizeAttenuation: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });

    this.electricField = new THREE.Points(this.fieldGeometry, this.fieldMaterial);
    this.plasmaGroup.add(this.electricField);
  }

  private createPlasmaSphere(): void {
    this.sphereGeometry = new THREE.SphereGeometry(1.5, 16, 12);
    
    // Plasma sphere with electric effects
    this.sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0 },
        electricColor: { value: new THREE.Color(0x00FFFF) },
        coreColor: { value: new THREE.Color(0xFFFFFF) }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        uniform float time;
        uniform float intensity;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          
          // Add electric distortion
          vec3 pos = position;
          float distortion = sin(time * 8.0 + pos.x * 5.0) * 
                           sin(time * 6.0 + pos.y * 5.0) * 
                           sin(time * 7.0 + pos.z * 5.0);
          pos += normal * distortion * 0.1 * intensity;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform vec3 electricColor;
        uniform vec3 coreColor;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          // Create electric surface effect
          float electric = sin(time * 10.0 + vPosition.x * 8.0) * 
                          cos(time * 12.0 + vPosition.y * 8.0) * 
                          sin(time * 9.0 + vPosition.z * 8.0);
          
          // Edge glow effect
          float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          fresnel = pow(fresnel, 2.0);
          
          float energy = (electric * 0.5 + 0.5) * intensity;
          energy += fresnel * 0.8;
          
          vec3 color = mix(electricColor, coreColor, energy);
          float alpha = energy * 0.9;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.plasmaSphere = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
    this.plasmaGroup.add(this.plasmaSphere);
  }

  private createLightningBolts(): void {
    // Create multiple lightning bolts for variety
    const boltCount = 5;
    
    for (let i = 0; i < boltCount; i++) {
      const bolt = new LightningBolt(this.scene);
      this.lightningBolts.push(bolt);
      this.plasmaGroup.add(bolt.getMesh());
    }
  }

  public trigger(startPos: THREE.Vector3, endPos: THREE.Vector3, intensity: number, audioData: any): void {
    this.active = true;
    this.startPosition.copy(startPos);
    this.endPosition.copy(endPos);
    this.centerPosition.lerpVectors(startPos, endPos, 0.5);
    this.intensity = intensity;
    this.lifetime = 0;
    this.electricityPhase = 0;
    
    // Position plasma at center
    this.plasmaGroup.position.copy(this.centerPosition);
    
    // Update colors based on audio frequency
    if (audioData.dominantFrequency) {
      const freqFactor = Math.min(audioData.dominantFrequency / 8000, 1.0);
      const electricColor = new THREE.Color().setHSL(0.5 + freqFactor * 0.2, 1.0, 0.7);
      const coreColor = new THREE.Color().setHSL(0.6 + freqFactor * 0.1, 0.8, 0.9);
      
      this.sphereMaterial.uniforms.electricColor.value = electricColor;
      this.sphereMaterial.uniforms.coreColor.value = coreColor;
    }
    
    // Trigger lightning bolts
    this.triggerLightningBolts();
    
    this.setVisible(true);
    
    console.log('PlasmaWave triggered from:', startPos, 'to:', endPos, 'intensity:', intensity);
  }

  private triggerLightningBolts(): void {
    const direction = new THREE.Vector3().subVectors(this.endPosition, this.startPosition);
    const distance = direction.length();
    
    this.lightningBolts.forEach((bolt, index) => {
      // Create branching lightning paths
      const branchFactor = (index / this.lightningBolts.length) - 0.5;
      const perpendicular = new THREE.Vector3()
        .crossVectors(direction, new THREE.Vector3(0, 1, 0))
        .normalize()
        .multiplyScalar(branchFactor * distance * 0.3);
      
      const boltStart = this.startPosition.clone().add(perpendicular);
      const boltEnd = this.endPosition.clone().add(perpendicular);
      
      bolt.trigger(boltStart, boltEnd, this.intensity);
    });
  }

  public update(deltaTime: number, intensity: number, audioData: any): void {
    if (!this.active) return;
    
    this.lifetime += deltaTime;
    this.electricityPhase += deltaTime * 0.01;
    
    // Update intensity
    this.intensity = this.intensity * 0.7 + intensity * 0.3;
    
    // Update shader uniforms
    this.sphereMaterial.uniforms.time.value = this.lifetime * 0.001;
    this.sphereMaterial.uniforms.intensity.value = this.intensity;
    
    // Update electric field
    this.updateElectricField(deltaTime);
    
    // Update lightning bolts
    this.lightningBolts.forEach(bolt => {
      bolt.update(deltaTime, this.intensity);
    });
    
    // Pulsation effects
    const pulsation = Math.sin(this.electricityPhase * 8) * 0.2 + 1.0;
    this.plasmaGroup.scale.setScalar(pulsation * this.intensity);
    
    // Fade out over lifetime
    if (this.lifetime > this.maxLifetime * 0.6) {
      const fadeProgress = (this.lifetime - this.maxLifetime * 0.6) / (this.maxLifetime * 0.4);
      const fade = 1.0 - fadeProgress;
      this.fieldMaterial.opacity = 0.7 * fade;
      
      if (this.lifetime > this.maxLifetime) {
        this.active = false;
        this.setVisible(false);
      }
    }
  }

  private updateElectricField(deltaTime: number): void {
    for (let i = 0; i < this.fieldCount; i++) {
      const i3 = i * 3;
      
      // Electric field disturbance
      const time = this.lifetime * 0.001;
      const disturbance = Math.sin(time * 10 + i * 0.1) * 0.5;
      
      // Update positions with electric jitter
      this.fieldPositions[i3] += (Math.random() - 0.5) * 0.1 * this.intensity;
      this.fieldPositions[i3 + 1] += (Math.random() - 0.5) * 0.1 * this.intensity;
      this.fieldPositions[i3 + 2] += (Math.random() - 0.5) * 0.1 * this.intensity;
      
      // Update colors with electric flicker
      const flicker = 0.8 + Math.random() * 0.2;
      this.fieldColors[i3] = flicker * this.intensity;
      this.fieldColors[i3 + 1] = flicker * this.intensity;
      this.fieldColors[i3 + 2] = 1.0 * flicker;
      
      // Size varies with intensity and disturbance
      this.fieldSizes[i] = (0.5 + Math.random() * 1.0) * this.intensity * (1.0 + disturbance);
    }
    
    // Update geometry
    this.fieldGeometry.attributes.position.needsUpdate = true;
    this.fieldGeometry.attributes.color.needsUpdate = true;
    this.fieldGeometry.attributes.size.needsUpdate = true;
  }

  public isActive(): boolean {
    return this.active;
  }

  public setVisible(visible: boolean): void {
    this.plasmaGroup.visible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.plasmaGroup);
    
    // Dispose geometries
    this.fieldGeometry?.dispose();
    this.sphereGeometry?.dispose();
    
    // Dispose materials
    this.fieldMaterial?.dispose();
    this.sphereMaterial?.dispose();
    
    // Dispose lightning bolts
    this.lightningBolts.forEach(bolt => bolt.dispose());
    
    console.log('PlasmaWave disposed');
  }
}

// Lightning Bolt - Individual electric discharge
class LightningBolt {
  private scene: THREE.Scene;
  private mesh: THREE.Line;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.LineBasicMaterial;
  
  private active = false;
  private intensity = 0;
  private lifetime = 0;
  private maxLifetime = 2000; // 2 seconds
  
  private startPos = new THREE.Vector3();
  private endPos = new THREE.Vector3();
  private segments: THREE.Vector3[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeBolt();
    this.mesh = new THREE.Line(this.geometry, this.material);
  }

  private initializeBolt(): void {
    this.geometry = new THREE.BufferGeometry();
    
    this.material = new THREE.LineBasicMaterial({
      color: 0x00FFFF,
      linewidth: 3,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
  }

  public trigger(startPos: THREE.Vector3, endPos: THREE.Vector3, intensity: number): void {
    this.active = true;
    this.startPos.copy(startPos);
    this.endPos.copy(endPos);
    this.intensity = intensity;
    this.lifetime = 0;
    
    // Generate jagged lightning path
    this.generateLightningPath();
    this.updateGeometry();
    
    this.mesh.visible = true;
  }

  private generateLightningPath(): void {
    this.segments = [];
    
    const segmentCount = 8 + Math.floor(Math.random() * 8);
    const direction = new THREE.Vector3().subVectors(this.endPos, this.startPos);
    
    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const point = this.startPos.clone().add(direction.clone().multiplyScalar(t));
      
      // Add jagged variation
      if (i > 0 && i < segmentCount) {
        const perpendicular1 = new THREE.Vector3()
          .crossVectors(direction, new THREE.Vector3(0, 1, 0))
          .normalize()
          .multiplyScalar((Math.random() - 0.5) * 2.0);
        
        const perpendicular2 = new THREE.Vector3()
          .crossVectors(direction, perpendicular1)
          .normalize()
          .multiplyScalar((Math.random() - 0.5) * 2.0);
        
        point.add(perpendicular1).add(perpendicular2);
      }
      
      this.segments.push(point);
    }
  }

  private updateGeometry(): void {
    const positions = new Float32Array(this.segments.length * 3);
    
    this.segments.forEach((point, index) => {
      const i3 = index * 3;
      positions[i3] = point.x;
      positions[i3 + 1] = point.y;
      positions[i3 + 2] = point.z;
    });
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.attributes.position.needsUpdate = true;
  }

  public update(deltaTime: number, intensity: number): void {
    if (!this.active) return;
    
    this.lifetime += deltaTime;
    
    // Flicker effect
    const flicker = Math.random() > 0.3 ? 1.0 : 0.3;
    this.material.opacity = flicker * intensity;
    
    // Random color variation
    const hue = 0.5 + (Math.random() - 0.5) * 0.1;
    this.material.color.setHSL(hue, 1.0, 0.8);
    
    // Regenerate path occasionally for electric jitter
    if (Math.random() < 0.1) {
      this.generateLightningPath();
      this.updateGeometry();
    }
    
    // Fade out
    if (this.lifetime > this.maxLifetime) {
      this.active = false;
      this.mesh.visible = false;
    }
  }

  public getMesh(): THREE.Line {
    return this.mesh;
  }

  public dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
  }
} 