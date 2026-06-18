// src/scenes/MainMenuScene.ts
import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';


export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Beautiful Cozy Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2d4438, 0x2d4438, 0x141e19, 0x141e19, 1);
    bg.fillRect(0, 0, width, height);

    // Dynamic drifting clouds in background
    this.createDriftingClouds(width, height);

    // 2. Title Card (styled, cozy and premium)
    const titleContainer = this.add.container(width / 2, height / 2 - 80);

    const titleShadow = this.add.text(4, 4, 'WILD HAVEN', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#0d1511'
    }).setOrigin(0.5);

    const titleText = this.add.text(0, 0, 'WILD HAVEN', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#8fd14f'
    }).setOrigin(0.5);

    const subtitleText = this.add.text(0, 50, 'Cozy Creature Sanctuary', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'normal',
      color: '#fff7e6'
    }).setOrigin(0.5);

    titleContainer.add([titleShadow, titleText, subtitleText]);
    
    // Pulse animation for title
    this.tweens.add({
      targets: titleContainer,
      y: height / 2 - 90,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 3. Interactive Menu Buttons
    const buttonY = height / 2 + 80;
    
    this.createMenuButton(width / 2, buttonY, 'Enter Sanctuary', () => {
      AudioManager.playSfx('ui_confirm');
      this.cameras.main.fadeOut(800, 26, 35, 30);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('SanctuaryScene');
      });
    });

    this.createMenuButton(width / 2, buttonY + 70, 'Settings', () => {
      AudioManager.playSfx('ui_tap');
      // UIScene will be started in parallel later when Sanctuary starts, or we can launch it to show settings
      this.scene.launch('UIScene');
      this.time.delayedCall(50, () => {
        const uiScene = this.scene.get('UIScene') as any;
        if (uiScene && uiScene.showSettingsPanel) {
          uiScene.showSettingsPanel();
        }
      });
    });

    // Decorative creature hopping in the corner
    const creature = this.add.sprite(width / 2 - 300, height / 2 + 120, 'creature_meadow');
    creature.setScale(3);
    creature.setInteractive({ useHandCursor: true });
    
    // Bounce animation on tap
    creature.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.tweens.add({
        targets: creature,
        scaleY: 2.2,
        scaleX: 3.8,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: creature,
            y: creature.y - 60,
            scaleY: 3.5,
            scaleX: 2.6,
            duration: 250,
            yoyo: true,
            ease: 'Quad.easeInOut'
          });
        }
      });
    });

    // Gentle breathing idle animation for creature
    this.tweens.add({
      targets: creature,
      scaleY: 3.2,
      scaleX: 2.9,
      y: creature.y + 4,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createMenuButton(x: number, y: number, text: string, callback: () => void): void {
    const container = this.add.container(x, y);

    // Golden frame/wood styled button
    const btnBg = this.add.nineslice(0, 0, 'button', 0, 200, 48, 8, 8, 8, 8);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 0, text, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#5c4832' // Dark wood tone
    }).setOrigin(0.5);

    container.add([btnBg, btnText]);

    // Hover / Touch interaction
    btnBg.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.05,
        duration: 100,
        ease: 'Power1'
      });
      // Synthetic button hover SFX
      AudioManager.playSfx('button_hover');
    });

    btnBg.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1.0,
        duration: 100,
        ease: 'Power1'
      });
    });

    btnBg.on('pointerdown', callback);
  }

  private createDriftingClouds(width: number, height: number): void {
    for (let i = 0; i < 4; i++) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff, 0.04);
      graphics.fillEllipse(0, 0, 180 + Math.random() * 100, 60 + Math.random() * 30);
      
      const cloud = this.add.container(Math.random() * width, Math.random() * height * 0.4 + 50);
      cloud.add(graphics);

      const speed = 15000 + Math.random() * 20000;
      this.tweens.add({
        targets: cloud,
        x: width + 200,
        duration: speed,
        loop: -1,
        ease: 'Linear',
        onLoop: () => {
          cloud.x = -200;
          cloud.y = Math.random() * height * 0.4 + 50;
        }
      });
    }
  }
}
