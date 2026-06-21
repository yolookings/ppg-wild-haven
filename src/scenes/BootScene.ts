// src/scenes/BootScene.ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Load minimal asset required for the preload progress bar (if any)
    this.load.image('loading_bg', 'assets/loading-background.png');
    this.load.image('text-bar', 'assets/text-bar.png');
  }

  create(): void {
    console.log("Booting game...");
    this.scene.start('PreloadScene');
  }
}
