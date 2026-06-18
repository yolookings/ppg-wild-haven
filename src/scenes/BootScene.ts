// src/scenes/BootScene.ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Load minimal asset required for the preload progress bar (if any)
    // We will just draw graphics in PreloadScene, so we transition immediately.
  }

  create(): void {
    console.log("Booting game...");
    this.scene.start('PreloadScene');
  }
}
