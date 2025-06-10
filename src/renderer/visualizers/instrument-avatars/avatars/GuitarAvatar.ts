import * as THREE from 'three';
import { BaseAvatar, AvatarUpdateData } from './BaseAvatar';
import { EtherealMaterialPresets } from '../materials/EtherealMaterial';

export class GuitarAvatar extends BaseAvatar {
  private guitar!: THREE.Group;
  private body!: THREE.Mesh;
  private neck!: THREE.Mesh;
  private strings!: THREE.Group;
  private stringVibration = 0;

  constructor(scene: THREE.Scene) {
    super(scene, 'Guitar', new THREE.Color(0x44ff44)); // Green
  }

  protected initializeMaterials(): void {
    this.etherealMaterial = EtherealMaterialPresets.createGuitar();
  }

  protected createGeometry(): void {
    this.guitar = new THREE.Group();
    this.group.add(this.guitar);

    // Guitar body (rounded box)
    const bodyGeometry = new THREE.BoxGeometry(1.5, 2.0, 0.3);
    this.body = new THREE.Mesh(bodyGeometry, this.etherealMaterial.getMaterial());
    this.guitar.add(this.body);

    // Guitar neck
    const neckGeometry = new THREE.BoxGeometry(0.3, 3.0, 0.2);
    this.neck = new THREE.Mesh(neckGeometry, this.etherealMaterial.getMaterial());
    this.neck.position.set(0, 2.5, 0);
    this.guitar.add(this.neck);

    // Guitar strings
    this.strings = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const stringGeometry = new THREE.BoxGeometry(0.02, 2.8, 0.01);
      const string = new THREE.Mesh(stringGeometry, this.etherealMaterial.getMaterial());
      string.position.set((i - 2.5) * 0.08, 2.5, 0.1);
      this.strings.add(string);
    }
    this.guitar.add(this.strings);

    console.log('GuitarAvatar: Guitar geometry created');
  }

  protected performInstrumentSpecificAnimation(updateData: AvatarUpdateData): void {
    const { intensity } = updateData;
    
    // String vibration animation
    this.stringVibration += updateData.deltaTime * 0.01 * intensity;
    this.strings.children.forEach((string, index) => {
      const stringMesh = string as THREE.Mesh;
      stringMesh.rotation.x = Math.sin(this.stringVibration + index * 0.5) * 0.1 * intensity;
    });

    // Body resonance
    const bodyScale = 1.0 + Math.sin(this.animationTime * 3) * 0.05 * intensity;
    this.body.scale.set(bodyScale, bodyScale, 1.0);
  }
} 