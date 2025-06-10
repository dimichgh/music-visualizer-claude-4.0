import * as THREE from 'three';
import { BaseAvatar, AvatarUpdateData } from './BaseAvatar';
import { EtherealMaterialPresets } from '../materials/EtherealMaterial';

export class VocalsAvatar extends BaseAvatar {
  private figure!: THREE.Group;
  private head!: THREE.Mesh;
  private body!: THREE.Mesh;
  private energyWaves!: THREE.Group;
  private waveIntensity = 0;

  constructor(scene: THREE.Scene) {
    super(scene, 'Vocals', new THREE.Color(0xffff44)); // Yellow
  }

  protected initializeMaterials(): void {
    this.etherealMaterial = EtherealMaterialPresets.createVocals();
  }

  protected createGeometry(): void {
    this.figure = new THREE.Group();
    this.group.add(this.figure);

    // Head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.5, 12, 8);
    this.head = new THREE.Mesh(headGeometry, this.etherealMaterial.getMaterial());
    this.head.position.set(0, 1.5, 0);
    this.figure.add(this.head);

    // Body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.6, 2.0, 8);
    this.body = new THREE.Mesh(bodyGeometry, this.etherealMaterial.getMaterial());
    this.figure.add(this.body);

    // Energy waves around figure
    this.energyWaves = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const waveGeometry = new THREE.TorusGeometry(1.5 + i * 0.5, 0.05, 8, 16);
      const wave = new THREE.Mesh(waveGeometry, this.etherealMaterial.getMaterial());
      wave.rotation.x = Math.PI / 2;
      wave.position.y = i * 0.3;
      this.energyWaves.add(wave);
    }
    this.figure.add(this.energyWaves);
  }

  protected performInstrumentSpecificAnimation(updateData: AvatarUpdateData): void {
    const { intensity, audioFeatures } = updateData;
    
    // Vocal energy waves
    this.waveIntensity = Math.max(this.waveIntensity * 0.95, intensity);
    
    this.energyWaves.children.forEach((wave, index) => {
      const waveMesh = wave as THREE.Mesh;
      const scale = 1.0 + this.waveIntensity * 0.3 + Math.sin(this.animationTime * 2 + index) * 0.1;
      waveMesh.scale.setScalar(scale);
      waveMesh.rotation.z += updateData.deltaTime * 0.005 * (index + 1);
    });

    // Head movement (like singing)
    this.head.rotation.y = Math.sin(this.animationTime * 3) * 0.2 * intensity;
    this.head.scale.setScalar(1.0 + Math.sin(this.animationTime * 4) * 0.1 * intensity);
  }
} 