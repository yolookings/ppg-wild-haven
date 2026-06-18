// src/ui/HUD.ts
import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { ResponsiveUtils } from '../utils/ResponsiveUtils';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { ProgressionSystem } from '../systems/ProgressionSystem';

export class HUD extends Phaser.GameObjects.Container {
  // UI Elements
  private coinsText!: Phaser.GameObjects.Text;
  private gemsText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpProgressGraphics!: Phaser.GameObjects.Graphics;
  
  private areaText!: Phaser.GameObjects.Text;

  // Sub Containers for docking
  private topLeftGroup!: Phaser.GameObjects.Container;
  private topRightGroup!: Phaser.GameObjects.Container;
  private bottomDockGroup!: Phaser.GameObjects.Container;

  // Callbacks
  private onSanctuaryClick: () => void;
  private onExploreClick: () => void;
  private onInventoryClick: () => void;
  private onCollectionClick: () => void;
  private onShopClick: () => void;
  private onAchievementsClick: () => void;
  private onSettingsClick: () => void;
  private onBreedClick: () => void;

  constructor(
    scene: Phaser.Scene,
    callbacks: {
      onSanctuary: () => void;
      onExplore: () => void;
      onInventory: () => void;
      onCollection: () => void;
      onShop: () => void;
      onAchievements: () => void;
      onSettings: () => void;
      onBreed: () => void;
    }
  ) {
    super(scene, 0, 0);

    this.onSanctuaryClick = callbacks.onSanctuary;
    this.onExploreClick = callbacks.onExplore;
    this.onInventoryClick = callbacks.onInventory;
    this.onCollectionClick = callbacks.onCollection;
    this.onShopClick = callbacks.onShop;
    this.onAchievementsClick = callbacks.onAchievements;
    this.onSettingsClick = callbacks.onSettings;
    this.onBreedClick = callbacks.onBreed;

    // Create Groups
    this.topLeftGroup = scene.add.container(0, 0);
    this.topRightGroup = scene.add.container(0, 0);
    this.bottomDockGroup = scene.add.container(0, 0);

    this.add([this.topLeftGroup, this.topRightGroup, this.bottomDockGroup]);

    this.buildTopLeftHUD();
    this.buildTopRightHUD();
    this.buildBottomDock();

    // Initial position layout
    this.reposition();

    // Event listeners to update HUD values
    EventBus.on('coinsChanged', (val: number) => this.coinsText.setText(val.toLocaleString()));
    EventBus.on('gemsChanged', (val: number) => this.gemsText.setText(val.toLocaleString()));
    EventBus.on('xpChanged', () => this.updateXpBar());
    EventBus.on('levelUp', (data: any) => {
      this.levelText.setText(`Lvl ${data.level}`);
      this.updateXpBar();
    });
  }

  public setAreaName(name: string): void {
    this.areaText.setText(name);
  }

  public reposition(): void {
    const anchors = ResponsiveUtils.getUIAnchors(this.scene);
    
    // Position Groups
    this.topLeftGroup.setPosition(anchors.topLeft.x, anchors.topLeft.y);
    this.topRightGroup.setPosition(anchors.topRight.x, anchors.topRight.y);
    this.bottomDockGroup.setPosition(anchors.bottomCenter.x, anchors.bottomCenter.y - 35);

    // Reflow layouts if portrait or landscape
    const dockBg = this.bottomDockGroup.list[0] as Phaser.GameObjects.NineSlice;
    const buttons = this.bottomDockGroup.list.slice(1);

    if (anchors.isPortrait) {
      // Portrait layout
      dockBg.setSize(anchors.width - 16, 60);
      
      const space = (anchors.width - 24) / buttons.length;
      const startBtnX = -(anchors.width - 24) / 2 + space / 2;
      buttons.forEach((btn, idx) => {
        (btn as Phaser.GameObjects.Container).setPosition(startBtnX + idx * space, 0);
        (btn as Phaser.GameObjects.Container).setScale(0.72); // slightly smaller to fit 7 buttons
      });
    } else {
      // Landscape layout (holds 7 buttons)
      dockBg.setSize(635, 50);
      
      const space = 88;
      const startBtnX = -((buttons.length - 1) * space) / 2;
      buttons.forEach((btn, idx) => {
        (btn as Phaser.GameObjects.Container).setPosition(startBtnX + idx * space, 0);
        (btn as Phaser.GameObjects.Container).setScale(0.95);
      });
    }

    this.updateXpBar();
  }

  private buildTopLeftHUD(): void {
    const state = SaveSystem.getState();
    const scene = this.scene;

    // Coins Panel
    const coinsBg = scene.add.nineslice(0, 0, 'button', 0, 110, 26, 6, 6, 6, 6).setOrigin(0, 0);
    const coinIcon = scene.add.image(10, 13, 'coin').setScale(1.2);
    this.coinsText = scene.add.text(28, 13, state.coins.toLocaleString(), {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#8a5200'
    }).setOrigin(0, 0.5);
    const coinsContainer = scene.add.container(0, 0, [coinsBg, coinIcon, this.coinsText]);
    this.topLeftGroup.add(coinsContainer);

    // Gems Panel
    const gemsBg = scene.add.nineslice(120, 0, 'button', 0, 90, 26, 6, 6, 6, 6).setOrigin(0, 0);
    const gemIcon = scene.add.image(130, 13, 'gem').setScale(1.2);
    this.gemsText = scene.add.text(148, 13, state.gems.toLocaleString(), {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#7b1fa2'
    }).setOrigin(0, 0.5);
    const gemsContainer = scene.add.container(0, 0, [gemsBg, gemIcon, this.gemsText]);
    this.topLeftGroup.add(gemsContainer);

    // Level & XP Bar Panel
    const xpContainer = scene.add.container(0, 34);
    const lvlBg = scene.add.nineslice(0, 0, 'button', 0, 55, 20, 4, 4, 4, 4).setOrigin(0, 0);
    lvlBg.setTint(0xffd9a0);
    
    this.levelText = scene.add.text(27, 10, `Lvl ${state.level}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#8a5200'
    }).setOrigin(0.5);
    xpContainer.add([lvlBg, this.levelText]);

    this.xpProgressGraphics = scene.add.graphics();
    xpContainer.add(this.xpProgressGraphics);
    
    this.topLeftGroup.add(xpContainer);
  }

  private updateXpBar(): void {
    const state = SaveSystem.getState();
    const req = ProgressionSystem.getRequiredXpForLevel(state.level);
    const pct = Math.min(1.0, state.xp / req);

    this.xpProgressGraphics.clear();
    this.xpProgressGraphics.fillStyle(0xd5c4b4, 1);
    this.xpProgressGraphics.fillRoundedRect(60, 6, 120, 8, 4);
    if (pct > 0) {
      this.xpProgressGraphics.fillStyle(0x8fd14f, 1);
      this.xpProgressGraphics.fillRoundedRect(60, 6, 120 * pct, 8, 4);
    }
  }

  private buildTopRightHUD(): void {
    const scene = this.scene;

    const areaBg = scene.add.nineslice(-140, 0, 'button', 0, 130, 26, 6, 6, 6, 6).setOrigin(0, 0);
    this.areaText = scene.add.text(-75, 13, 'Sanctuary', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    const areaContainer = scene.add.container(0, 0, [areaBg, this.areaText]);
    this.topRightGroup.add(areaContainer);

    const setBg = scene.add.nineslice(-26, 0, 'button', 0, 26, 26, 6, 6, 6, 6).setOrigin(0, 0);
    setBg.setInteractive({ useHandCursor: true });
    setBg.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.onSettingsClick();
    });
    
    const setIcon = scene.add.text(-13, 13, '⚙️', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '13px'
    }).setOrigin(0.5);
    
    const settingsContainer = scene.add.container(0, 0, [setBg, setIcon]);
    this.topRightGroup.add(settingsContainer);
  }

  private buildBottomDock(): void {
    const scene = this.scene;

    const dockBg = scene.add.nineslice(0, 0, 'panel_frame', 0, 635, 50, 8, 8, 8, 8);
    this.bottomDockGroup.add(dockBg);

    const btnSanctuary = this.createDockButton('🏰 Sanctuary', this.onSanctuaryClick);
    const btnExplore = this.createDockButton('🧭 Explore', this.onExploreClick);
    const btnInventory = this.createDockButton('🦊 Inventory', this.onInventoryClick);
    const btnBreed = this.createDockButton('🧬 Breed', this.onBreedClick);
    const btnBook = this.createDockButton('📖 Book', this.onCollectionClick);
    const btnShop = this.createDockButton('🛒 Shop', this.onShopClick);
    const btnAch = this.createDockButton('🏆 Ach', this.onAchievementsClick);

    this.bottomDockGroup.add([
      btnSanctuary,
      btnExplore,
      btnInventory,
      btnBreed,
      btnBook,
      btnShop,
      btnAch
    ]);
  }

  private createDockButton(label: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    const bg = this.scene.add.nineslice(0, 0, 'button', 0, 80, 34, 6, 6, 6, 6);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      AudioManager.playSfx('ui_confirm');
      callback();
    });

    const txt = this.scene.add.text(0, 0, label, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    container.add([bg, txt]);
    
    bg.on('pointerover', () => container.setScale(1.05));
    bg.on('pointerout', () => container.setScale(1.0));

    return container;
  }
}
