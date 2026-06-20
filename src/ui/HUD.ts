// src/ui/HUD.ts
import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { ResponsiveUtils } from '../utils/ResponsiveUtils';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { QuestManager } from '../systems/QuestManager';

export class HUD extends Phaser.GameObjects.Container {
  // UI Elements
  private coinsText!: Phaser.GameObjects.Text;
  private gemsText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpProgressGraphics!: Phaser.GameObjects.Graphics;
  
  private areaText!: Phaser.GameObjects.Text;

  // Quest Tracker Elements
  private questTrackerBg!: Phaser.GameObjects.Graphics;
  private questTitleText!: Phaser.GameObjects.Text;
  private questObjectivesText!: Phaser.GameObjects.Text;

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
    this.buildQuestTracker();
    this.buildTopRightHUD();
    this.buildBottomDock();

    // Initial position layout
    this.reposition();

    // Event listeners to update HUD values
    EventBus.on('coinsChanged', (val: number) => {
      this.coinsText.setText(val.toLocaleString());
      this.refreshQuestTracker();
    });
    EventBus.on('gemsChanged', (val: number) => this.gemsText.setText(val.toLocaleString()));
    EventBus.on('xpChanged', () => {
      this.updateXpBar();
      this.refreshQuestTracker();
    });
    EventBus.on('levelUp', (data: any) => {
      this.levelText.setText(`Lvl ${data.level}`);
      this.updateXpBar();
      this.refreshQuestTracker();
    });
    EventBus.on('questTurnedIn', () => this.refreshQuestTracker());
    EventBus.on('sanctuaryUpdated', () => this.refreshQuestTracker());

    // Initial Quest Tracker refresh
    this.refreshQuestTracker();
  }

  public setAreaName(name: string): void {
    this.areaText.setText(name);
  }

  public reposition(): void {
    const anchors = ResponsiveUtils.getUIAnchors(this.scene);
    
    // Position Groups
    this.topLeftGroup.setPosition(anchors.topLeft.x, anchors.topLeft.y);
    this.topLeftGroup.setScale(1.05); // Enlarge left HUD elements for readability
    
    this.topRightGroup.setPosition(anchors.topRight.x, anchors.topRight.y);
    this.topRightGroup.setScale(1.0); // Cleaner, smaller capsules
    
    this.bottomDockGroup.setPosition(anchors.bottomCenter.x, anchors.bottomCenter.y - 35);
 
    // Reflow layouts if portrait or landscape
    const dockBg = this.bottomDockGroup.list[0] as Phaser.GameObjects.Graphics;
    const buttons = this.bottomDockGroup.list.slice(1);
 
    if (anchors.isPortrait) {
      const dockW = anchors.width - 16;
      dockBg.clear();
      dockBg.fillStyle(0x2d1f15, 0.9);
      dockBg.lineStyle(2.5, 0x5c4832, 1);
      dockBg.fillRoundedRect(-dockW / 2, -26, dockW, 52, 6);
      dockBg.strokeRoundedRect(-dockW / 2, -26, dockW, 52, 6);
      
      const space = (anchors.width - 24) / buttons.length;
      const startBtnX = -(anchors.width - 24) / 2 + space / 2;
      buttons.forEach((btn, idx) => {
        (btn as Phaser.GameObjects.Container).setPosition(startBtnX + idx * space, 0);
        (btn as Phaser.GameObjects.Container).setScale(0.7);
      });
    } else {
      dockBg.clear();
      dockBg.fillStyle(0x2d1f15, 0.9);
      dockBg.lineStyle(2.5, 0x5c4832, 1);
      dockBg.fillRoundedRect(-370, -25, 740, 50, 6);
      dockBg.strokeRoundedRect(-370, -25, 740, 50, 6);
      
      const space = 100;
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
 
    // 1. Level Text (larger)
    this.levelText = scene.add.text(0, 0, `LEVEL ${state.level}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffd14f', // gold
      stroke: '#2c1e15',
      strokeThickness: 3.5
    }).setOrigin(0, 0);
 
    // 2. XP Progress Graphics
    this.xpProgressGraphics = scene.add.graphics();
 
    const xpContainer = scene.add.container(0, 0, [this.levelText, this.xpProgressGraphics]);
    this.topLeftGroup.add(xpContainer);
  }
 
  private updateXpBar(): void {
    const state = SaveSystem.getState();
    const req = ProgressionSystem.getRequiredXpForLevel(state.level);
    const pct = Math.min(1.0, state.xp / req);
 
    this.xpProgressGraphics.clear();
    
    // Bar dimensions: x=0, y=22, w=200, h=12
    const bx = 0;
    const by = 22;
    const bw = 200;
    const bh = 12;
 
    // BG
    this.xpProgressGraphics.fillStyle(0x19100a, 0.85);
    this.xpProgressGraphics.fillRoundedRect(bx, by, bw, bh, 3);
 
    // Border
    this.xpProgressGraphics.lineStyle(1.5, 0x5c4832, 1);
    this.xpProgressGraphics.strokeRoundedRect(bx, by, bw, bh, 3);
 
    // Fill
    if (pct > 0) {
      this.xpProgressGraphics.fillStyle(0x8fd14f, 1);
      this.xpProgressGraphics.fillRoundedRect(bx + 1.5, by + 1.5, (bw - 3) * pct, bh - 3, 2);
    }
  }
 
  private buildTopRightHUD(): void {
    const state = SaveSystem.getState();
    const scene = this.scene;
 
    // 1. Coins compact capsule: x: -145, y: 0, w: 80, h: 18
    const coinsBg = scene.add.graphics();
    coinsBg.fillStyle(0x2d1f15, 0.85);
    coinsBg.lineStyle(1.2, 0x5c4832, 1);
    coinsBg.fillRoundedRect(-145, 0, 80, 18, 9);
    coinsBg.strokeRoundedRect(-145, 0, 80, 18, 9);
 
    const coinIcon = scene.add.image(-139, 9, 'coin').setScale(0.13);
    this.coinsText = scene.add.text(-131, 9, state.coins.toLocaleString(), {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#ffd14f' // gold
    }).setOrigin(0, 0.5);
 
    const coinsContainer = scene.add.container(0, 0, [coinsBg, coinIcon, this.coinsText]);
    this.topRightGroup.add(coinsContainer);
 
    // 2. Gems compact capsule: x: -58, y: 0, w: 50, h: 18
    const gemsBg = scene.add.graphics();
    gemsBg.fillStyle(0x2d1f15, 0.85);
    gemsBg.lineStyle(1.2, 0x5c4832, 1);
    gemsBg.fillRoundedRect(-58, 0, 50, 18, 9);
    gemsBg.strokeRoundedRect(-58, 0, 50, 18, 9);
 
    const gemIcon = scene.add.image(-53, 9, 'gem').setScale(0.13);
    this.gemsText = scene.add.text(-46, 9, state.gems.toLocaleString(), {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#e056fd' // purple/gem
    }).setOrigin(0, 0.5);
 
    const gemsContainer = scene.add.container(0, 0, [gemsBg, gemIcon, this.gemsText]);
    this.topRightGroup.add(gemsContainer);
 
    // 3. Settings Circle: x: -10, y: 9, r: 9
    const setBg = scene.add.graphics();
    setBg.fillStyle(0x2d1f15, 0.85);
    setBg.lineStyle(1.2, 0x5c4832, 1);
    setBg.fillCircle(-8, 9, 9);
    setBg.strokeCircle(-8, 9, 9);
 
    const setZone = scene.add.zone(-17, 0, 18, 18).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    setZone.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.onSettingsClick();
    });
 
    const setIcon = scene.add.text(-8, 9, '⚙️', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '9px'
    }).setOrigin(0.5);
    
    const settingsContainer = scene.add.container(0, 0, [setBg, setZone, setIcon]);
    this.topRightGroup.add(settingsContainer);
 
    // 4. Area Name Panel (Graphics): x: -145, y: 22, w: 137, h: 16
    const areaBg = scene.add.graphics();
    areaBg.fillStyle(0x2d1f15, 0.85);
    areaBg.lineStyle(1.2, 0x5c4832, 1);
    areaBg.fillRoundedRect(-145, 22, 137, 16, 8);
    areaBg.strokeRoundedRect(-145, 22, 137, 16, 8);
 
    this.areaText = scene.add.text(-76, 30, 'Sanctuary', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8.5px',
      fontStyle: 'bold',
      color: '#fff7e6'
    }).setOrigin(0.5);
    const areaContainer = scene.add.container(0, 0, [areaBg, this.areaText]);
    this.topRightGroup.add(areaContainer);
  }

  private buildBottomDock(): void {
    const scene = this.scene;

    // Custom Rounded Bottom Dock (Graphics)
    const dockBg = scene.add.graphics();
    dockBg.fillStyle(0x2d1f15, 0.9);
    dockBg.lineStyle(2.5, 0x5c4832, 1);
    dockBg.fillRoundedRect(-340, -25, 680, 50, 6);
    dockBg.strokeRoundedRect(-340, -25, 680, 50, 6);
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

    const bg = this.scene.add.nineslice(0, 0, 'button', 0, 110, 44, 18, 18, 12, 12);
    bg.setInteractive({ useHandCursor: true });

    const txt = this.scene.add.text(0, 0, label, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    container.add([bg, txt]);
    
    bg.on('pointerover', () => {
      bg.setTexture('button_hover');
      bg.setTint(0xfff0c2); // Hover tint feedback
      container.setScale(1.05);
    });
    bg.on('pointerout', () => {
      bg.setTexture('button');
      bg.clearTint();
      container.setScale(1.0);
      bg.setY(0);
      txt.setY(0);
    });
    bg.on('pointerdown', () => {
      bg.setTexture('button_click');
      bg.setTint(0xd1b080); // Click tint feedback
      container.setScale(0.95);
      bg.setY(2);
      txt.setY(2);
    });
    bg.on('pointerup', () => {
      bg.setTexture('button_hover');
      bg.setTint(0xfff0c2);
      container.setScale(1.05);
      bg.setY(0);
      txt.setY(0);
      AudioManager.playSfx('ui_confirm');
      callback();
    });

    return container;
  }

  private buildQuestTracker(): void {
    const scene = this.scene;
    
    this.questTrackerBg = scene.add.graphics();
    
    this.questTitleText = scene.add.text(8, 65, 'Active Quest:', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffd14f' // glowing gold
    });
 
    this.questObjectivesText = scene.add.text(8, 79, '', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '9.5px',
      color: '#fff7e6',
      wordWrap: { width: 204 },
      lineSpacing: 2
    });
 
    const trackerContainer = scene.add.container(0, 0, [this.questTrackerBg, this.questTitleText, this.questObjectivesText]);
    this.topLeftGroup.add(trackerContainer);
  }
 
  public refreshQuestTracker(): void {
    const active = QuestManager.getActiveQuest();
    if (!active || active.id === 'quest_completed_all') {
      this.questTrackerBg.setVisible(false);
      this.questTitleText.setVisible(false);
      this.questObjectivesText.setVisible(false);
      return;
    }
 
    this.questTrackerBg.setVisible(true);
    this.questTitleText.setVisible(true);
    this.questObjectivesText.setVisible(true);
 
    this.questTitleText.setText(`Active Quest: ${active.title}`);
 
    const progress = QuestManager.getObjectivesProgress();
    let text = '';
    progress.forEach(obj => {
      const isDone = obj.currentAmount >= obj.requiredAmount;
      const statusIcon = isDone ? '✅' : '⬜';
      text += `${statusIcon} ${obj.description} (${obj.currentAmount}/${obj.requiredAmount})\n`;
    });
 
    this.questObjectivesText.setText(text.trim());
    
    const height = 24 + progress.length * 14;
    this.questTrackerBg.clear();
    this.questTrackerBg.fillStyle(0x2d1f15, 0.85);
    this.questTrackerBg.lineStyle(1.5, 0x5c4832, 1);
    this.questTrackerBg.fillRoundedRect(0, 58, 220, height, 5);
    this.questTrackerBg.strokeRoundedRect(0, 58, 220, height, 5);
  }
}
