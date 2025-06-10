import * as THREE from 'three';
import { BaseAvatar, AvatarUpdateData } from './BaseAvatar';
import { EtherealMaterialPresets } from '../materials/EtherealMaterial';

export class PianoAvatar extends BaseAvatar {
  private piano!: THREE.Group;
  private keys!: THREE.Group;
  private keyAnimations: number[] = [];

  constructor(scene: THREE.Scene) {
    super(scene, 'Piano', new THREE.Color(0xff44ff)); // Magenta
  }

  protected initializeMaterials(): void {
    this.etherealMaterial = EtherealMaterialPresets.createPiano();
  }

  protected createGeometry(): void {
    this.piano = new THREE.Group();
    this.group.add(this.piano);

    // Piano keys
    this.keys = new THREE.Group();
    this.keyAnimations = [];
    
    for (let i = 0; i < 12; i++) {
      const keyGeometry = new THREE.BoxGeometry(0.2, 0.1, 1.0);
      const key = new THREE.Mesh(keyGeometry, this.etherealMaterial.getMaterial());
      key.position.set((i - 5.5) * 0.25, 0, 0);
      this.keys.add(key);
      this.keyAnimations.push(0);
    }
    this.piano.add(this.keys);
  }

  protected performInstrumentSpecificAnimation(updateData: AvatarUpdateData): void {
    const { intensity } = updateData;
    
    // Animate random keys pressing
    this.keyAnimations.forEach((anim, index) => {
      if (Math.random() < intensity * 0.1) {
        this.keyAnimations[index] = 1.0;
      }
      this.keyAnimations[index] *= 0.9;
      
      const key = this.keys.children[index] as THREE.Mesh;
      key.position.y = -this.keyAnimations[index] * 0.2;
    });

    // Keyboard floating motion
    this.piano.rotation.y += updateData.deltaTime * 0.003 * intensity;
  }
} 