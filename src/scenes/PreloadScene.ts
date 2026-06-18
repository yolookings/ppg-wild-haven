// src/scenes/PreloadScene.ts
import Phaser from 'phaser';
import { DataLoader } from '../data/DataLoader';
import { AudioManager } from '../systems/AudioManager';
import { SaveSystem } from '../systems/SaveSystem';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create a beautiful, cozy loading screen
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a231e, 0x1a231e, 0x111613, 0x111613, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    const titleText = this.add.text(width / 2, height / 2 - 60, 'WILD HAVEN', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#8fd14f'
    }).setOrigin(0.5);
    
    const subText = this.add.text(width / 2, height / 2 - 20, 'Preparing Sanctuary...', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      color: '#a8d8b9'
    }).setOrigin(0.5);

    // Progress Bar Background
    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x2d3b32, 1);
    progressBarBg.fillRoundedRect(width / 2 - 160, height / 2 + 30, 320, 20, 10);

    // Progress Bar Foreground
    const progressBar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x8fd14f, 1);
      progressBar.fillRoundedRect(width / 2 - 158, height / 2 + 32, 316 * value, 16, 8);
      subText.setText(`Loading Resources... ${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBarBg.destroy();
      titleText.destroy();
      subText.destroy();
      bg.destroy();
    });

    // 1. Load JSON configurations
    this.load.json('creatures_data', 'assets/data/creatures.json');
    this.load.json('areas_data', 'assets/data/areas.json');
    this.load.json('ropes_data', 'assets/data/ropes.json');
    this.load.json('whips_data', 'assets/data/whips.json');
    this.load.json('breeding_recipes_data', 'assets/data/breeding_recipes.json');
    this.load.json('achievements_data', 'assets/data/achievements.json');

    // 2. Load Sprite Sheets and Images
    // Creatures (using standard 5 placeholder sprites)
    this.load.image('creature_meadow', 'assets/sprites/creatures/rabbit_meadow_common.png');
    this.load.image('creature_forest', 'assets/sprites/creatures/fox_forest_rare.png');
    this.load.image('creature_mountain', 'assets/sprites/creatures/turtle_mountain_epic.png');
    this.load.image('creature_dunes', 'assets/sprites/creatures/golem_dunes_legendary.png');
    this.load.image('creature_sky', 'assets/sprites/creatures/phoenix_skyisland_mythic.png');

    // Icons
    this.load.image('coin', 'assets/sprites/icons/coin.png');
    this.load.image('gem', 'assets/sprites/icons/gem.png');
    this.load.image('xp_star', 'assets/sprites/icons/xp_star.png');
    this.load.image('rope_basic', 'assets/sprites/icons/rope_basic.png');
    this.load.image('rope_strong', 'assets/sprites/icons/rope_strong.png');
    this.load.image('rope_magic', 'assets/sprites/icons/rope_magic.png');
    this.load.image('rope_divine', 'assets/sprites/icons/rope_divine.png');

    // UI
    this.load.image('button', 'assets/sprites/ui/button.png');
    this.load.image('panel_frame', 'assets/sprites/ui/panel_frame.png');
  }

  create(): void {
    // Initialize systems
    DataLoader.initialize(this.cache);
    AudioManager.initialize();
    SaveSystem.loadGame();

    // Start playing background music (menu music)
    AudioManager.playMusic('music_menu');

    // Go to Main Menu
    this.scene.start('MainMenuScene');
  }
}
