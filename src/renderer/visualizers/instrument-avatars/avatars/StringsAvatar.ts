import * as THREE from 'three';
import { BaseAvatar, AvatarUpdateData } from './BaseAvatar';
import { EtherealMaterialPresets } from '../materials/EtherealMaterial';

export class StringsAvatar extends BaseAvatar {
  private instrument!: THREE.Group;
  private body!: THREE.Mesh;
  private bow!: THREE.Mesh;
  private bowMovement = 0;

  constructor(scene: THREE.Scene) {
    super(scene, 'Strings', new THREE.Color(0x44ffff)); // Cyan
  }

  protected initializeMaterials(): void {
    this.etherealMaterial = EtherealMaterialPresets.createStrings();
  }

  protected createGeometry(): void {
    this.instrument = new THREE.Group();
    this.group.add(this.instrument);

    // Violin/cello body (elongated sphere)
    const bodyGeometry = new THREE.SphereGeometry(0.8, 12, 16);
    bodyGeometry.scale(1, 1.5, 0.3);
    this.body = new THREE.Mesh(bodyGeometry, this.etherealMaterial.getMaterial());
    this.instrument.add(this.body);

    // Bow (thin box)
    const bowGeometry = new THREE.BoxGeometry(0.05, 2.0, 0.05);
    this.bow = new THREE.Mesh(bowGeometry, this.etherealMaterial.getMaterial());
    this.bow.position.set(1.5, 0, 0);
    this.instrument.add(this.bow);
  }

  protected performInstrumentSpecificAnimation(updateData: AvatarUpdateData): void {
    const { intensity } = updateData;
    
    // Bow movement simulation
    this.bowMovement += updateData.deltaTime * 0.005 * intensity;
    this.bow.position.y = Math.sin(this.bowMovement) * 0.5 * intensity;
    this.bow.rotation.z = Math.sin(this.bowMovement * 0.5) * 0.3 * intensity;

    // Body resonance
    const bodyScale = 1.0 + Math.sin(this.animationTime * 2) * 0.08 * intensity;
    this.body.scale.set(bodyScale, bodyScale, 1.0);
  }
} 