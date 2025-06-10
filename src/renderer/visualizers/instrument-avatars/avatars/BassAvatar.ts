import * as THREE from 'three';
import { BaseAvatar, AvatarUpdateData } from './BaseAvatar';
import { EtherealMaterialPresets } from '../materials/EtherealMaterial';

export class BassAvatar extends BaseAvatar {
  private bass!: THREE.Group;
  private body!: THREE.Mesh;
  private strings!: THREE.Group;
  private pulseIntensity = 0;

  constructor(scene: THREE.Scene) {
    super(scene, 'Bass', new THREE.Color(0x4444ff)); // Blue
  }

  protected initializeMaterials(): void {
    this.etherealMaterial = EtherealMaterialPresets.createBass();
  }

  protected createGeometry(): void {
    this.bass = new THREE.Group();
    this.group.add(this.bass);

    // Bass body (larger than guitar)
    const bodyGeometry = new THREE.BoxGeometry(1.8, 2.5, 0.4);
    this.body = new THREE.Mesh(bodyGeometry, this.etherealMaterial.getMaterial());
    this.bass.add(this.body);

    // Bass strings (4 strings)
    this.strings = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const stringGeometry = new THREE.BoxGeometry(0.04, 2.2, 0.02);
      const string = new THREE.Mesh(stringGeometry, this.etherealMaterial.getMaterial());
      string.position.set((i - 1.5) * 0.15, 0, 0.2);
      this.strings.add(string);
    }
    this.bass.add(this.strings);
  }

  protected performInstrumentSpecificAnimation(updateData: AvatarUpdateData): void {
    const { intensity, audioFeatures } = updateData;
    const bassLevel = audioFeatures.bassLevel || 0;
    
    // Deep bass pulsation
    this.pulseIntensity = Math.max(this.pulseIntensity * 0.9, bassLevel);
    const scale = 1.0 + this.pulseIntensity * 0.2;
    this.body.scale.set(scale, scale, 1.0);

    // String vibration (slower than guitar)
    this.strings.children.forEach((string, index) => {
      const stringMesh = string as THREE.Mesh;
      stringMesh.rotation.x = Math.sin(this.animationTime + index) * 0.15 * intensity;
    });
  }
} 