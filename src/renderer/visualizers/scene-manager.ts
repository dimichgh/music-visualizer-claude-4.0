import * as THREE from 'three';
import { GraphicsConfig } from '@shared/types';

export class SceneManager {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container: HTMLElement;
  private animationId: number | null = null;
  private onRenderCallbacks: Array<(deltaTime: number) => void> = [];

  constructor(container: HTMLElement, config: GraphicsConfig) {
    this.container = container;
    this.initializeScene(config);
    this.setupRenderer(config);
    this.setupCamera();
    this.setupLighting();
    this.setupEventListeners();
  }

  private initializeScene(config: GraphicsConfig): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Deep space black
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0025); // Cosmic fog
  }

  private setupRenderer(config: GraphicsConfig): void {
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
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

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