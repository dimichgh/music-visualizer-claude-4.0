import * as THREE from 'three';

export interface EtherealProperties {
  opacity: number;
  intensity: number;
  time: number;
}

export class EtherealMaterial {
  private material: THREE.ShaderMaterial;
  private primaryColor: THREE.Color;
  private secondaryColor: THREE.Color;
  
  // Shader uniforms
  private uniforms = {
    uTime: { value: 0.0 },
    uOpacity: { value: 0.7 },
    uIntensity: { value: 0.5 },
    uPrimaryColor: { value: new THREE.Color() },
    uSecondaryColor: { value: new THREE.Color() },
    uGlowStrength: { value: 2.0 },
    uFresnelPower: { value: 3.0 },
    uNoiseScale: { value: 1.0 },
    uAnimationSpeed: { value: 1.0 },
  };

  constructor(primaryColor: THREE.Color) {
    this.primaryColor = primaryColor.clone();
    this.secondaryColor = primaryColor.clone().multiplyScalar(0.6).lerp(new THREE.Color(1, 1, 1), 0.3);
    
    this.uniforms.uPrimaryColor.value.copy(this.primaryColor);
    this.uniforms.uSecondaryColor.value.copy(this.secondaryColor);
    
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true
    });
  }

  private getVertexShader(): string {
    return `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vFresnel;
      
      uniform float uTime;
      uniform float uNoiseScale;
      
      // Simple noise function
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
      }
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        
        // Add ethereal movement with noise
        vec3 pos = position;
        float noiseOffset = noise(position * uNoiseScale + uTime * 0.5) * 0.1;
        pos += normal * noiseOffset;
        
        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPosition.xyz;
        vPosition = pos;
        
        // Calculate fresnel for glow effect
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
        vec3 worldViewDir = normalize(cameraPosition - worldPosition.xyz);
        vFresnel = 1.0 - abs(dot(worldNormal, worldViewDir));
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
  }

  private getFragmentShader(): string {
    return `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vFresnel;
      
      uniform float uTime;
      uniform float uOpacity;
      uniform float uIntensity;
      uniform vec3 uPrimaryColor;
      uniform vec3 uSecondaryColor;
      uniform float uGlowStrength;
      uniform float uFresnelPower;
      uniform float uAnimationSpeed;
      
      // Enhanced noise function
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
      }
      
      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for(int i = 0; i < 4; i++) {
          value += amplitude * noise(p * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        
        return value;
      }
      
      void main() {
        // Base ethereal effect with flowing patterns
        float time = uTime * uAnimationSpeed;
        vec3 pos = vWorldPosition * 0.1;
        
        // Multiple noise layers for complex ethereal patterns
        float noise1 = fbm(pos + time * 0.5);
        float noise2 = fbm(pos * 2.0 - time * 0.3);
        float noise3 = noise(pos * 4.0 + time * 0.8);
        
        // Combine noise patterns
        float etherealPattern = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
        
        // Fresnel-based glow
        float fresnel = pow(vFresnel, uFresnelPower);
        float glow = fresnel * uGlowStrength;
        
        // Color mixing based on patterns and intensity
        vec3 color = mix(uSecondaryColor, uPrimaryColor, etherealPattern);
        color = mix(color, vec3(1.0), glow * 0.3); // Add white glow
        
        // Pulsing effect
        float pulse = sin(time * 2.0) * 0.1 + 0.9;
        color *= pulse;
        
        // Energy ripples
        float ripple = sin(length(vPosition) * 10.0 - time * 4.0) * 0.1 + 1.0;
        color *= ripple;
        
        // Final intensity and opacity
        color *= uIntensity * 2.0;
        float alpha = uOpacity * (etherealPattern * 0.7 + 0.3) * (glow * 0.5 + 0.5);
        
        // Ensure minimum visibility when active
        alpha = max(alpha, uOpacity * 0.2);
        
        gl_FragColor = vec4(color, alpha);
      }
    `;
  }

  public updateProperties(properties: EtherealProperties): void {
    this.uniforms.uTime.value = properties.time;
    this.uniforms.uOpacity.value = properties.opacity;
    this.uniforms.uIntensity.value = properties.intensity;
  }

  public updateColor(primaryColor: THREE.Color, intensity: number = 1.0): void {
    this.primaryColor.copy(primaryColor);
    this.secondaryColor.copy(primaryColor).multiplyScalar(0.6 * intensity).lerp(new THREE.Color(1, 1, 1), 0.3);
    
    this.uniforms.uPrimaryColor.value.copy(this.primaryColor);
    this.uniforms.uSecondaryColor.value.copy(this.secondaryColor);
  }

  public setGlowStrength(strength: number): void {
    this.uniforms.uGlowStrength.value = strength;
  }

  public setAnimationSpeed(speed: number): void {
    this.uniforms.uAnimationSpeed.value = speed;
  }

  public setNoiseScale(scale: number): void {
    this.uniforms.uNoiseScale.value = scale;
  }

  public getMaterial(): THREE.ShaderMaterial {
    return this.material;
  }

  public dispose(): void {
    this.material.dispose();
  }
}

// Preset ethereal materials for different instruments
export class EtherealMaterialPresets {
  static createDrums(): EtherealMaterial {
    const material = new EtherealMaterial(new THREE.Color(0xff4444)); // Red
    material.setGlowStrength(3.0);
    material.setAnimationSpeed(1.5);
    return material;
  }

  static createGuitar(): EtherealMaterial {
    const material = new EtherealMaterial(new THREE.Color(0x44ff44)); // Green  
    material.setGlowStrength(2.5);
    material.setAnimationSpeed(1.0);
    return material;
  }

  static createBass(): EtherealMaterial {
    const material = new EtherealMaterial(new THREE.Color(0x4444ff)); // Blue
    material.setGlowStrength(2.8);
    material.setAnimationSpeed(0.8);
    material.setNoiseScale(0.8);
    return material;
  }

  static createVocals(): EtherealMaterial {
    const material = new EtherealMaterial(new THREE.Color(0xffff44)); // Yellow
    material.setGlowStrength(2.2);
    material.setAnimationSpeed(1.3);
    material.setNoiseScale(1.2);
    return material;
  }

  static createPiano(): EtherealMaterial {
    const material = new EtherealMaterial(new THREE.Color(0xff44ff)); // Magenta
    material.setGlowStrength(2.0);
    material.setAnimationSpeed(0.9);
    return material;
  }

  static createStrings(): EtherealMaterial {
    const material = new EtherealMaterial(new THREE.Color(0x44ffff)); // Cyan
    material.setGlowStrength(2.6);
    material.setAnimationSpeed(1.1);
    material.setNoiseScale(1.1);
    return material;
  }
} 