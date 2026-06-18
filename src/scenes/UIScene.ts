// src/scenes/UIScene.ts
import Phaser from 'phaser';
import { HUD } from '../ui/HUD';
import { SettingsPanel } from '../ui/SettingsPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { CollectionBookPanel } from '../ui/CollectionBookPanel';
import { CreatureDetailPanel } from '../ui/CreatureDetailPanel';
import { ShopPanel } from '../ui/ShopPanel';
import { AchievementPanel } from '../ui/AchievementPanel';
import { BreedingPanel } from '../ui/BreedingPanel';
import { SaveSystem } from '../systems/SaveSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { EventBus } from '../systems/EventBus';
import { AudioManager } from '../systems/AudioManager';
import { AchievementSystem } from '../systems/AchievementSystem';

export class UIScene extends Phaser.Scene {
  private hud!: HUD;
  
  // UI Panels
  private settingsPanel!: SettingsPanel;
  private inventoryPanel!: InventoryPanel;
  private collectionPanel!: CollectionBookPanel;
  private detailPanel!: CreatureDetailPanel;
  private shopPanel!: ShopPanel;
  private achievementPanel!: AchievementPanel;
  private breedingPanel!: BreedingPanel;

  // Active overlay panel tracker
  private activePanel: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Build persistent HUD
    this.hud = new HUD(this, {
      onSanctuary: () => this.handleSanctuaryTransition(),
      onExplore: () => this.handleExploreTransition(),
      onInventory: () => this.togglePanel(this.inventoryPanel),
      onCollection: () => this.togglePanel(this.collectionPanel),
      onShop: () => this.togglePanel(this.shopPanel),
      onAchievements: () => this.togglePanel(this.achievementPanel),
      onSettings: () => this.togglePanel(this.settingsPanel),
      onBreed: () => this.togglePanel(this.breedingPanel)
    });
    this.add.existing(this.hud);

    // 2. Instantiate all Panels (centered)
    this.settingsPanel = new SettingsPanel(this, width / 2, height / 2);
    this.inventoryPanel = new InventoryPanel(this, width / 2, height / 2, (oc) => {
      this.togglePanel(this.detailPanel);
      this.detailPanel.show(oc);
    });
    this.collectionPanel = new CollectionBookPanel(this, width / 2, height / 2, (oc) => {
      this.togglePanel(this.detailPanel);
      this.detailPanel.show(oc);
    });
    this.detailPanel = new CreatureDetailPanel(this, width / 2, height / 2);
    this.shopPanel = new ShopPanel(this, width / 2, height / 2);
    this.achievementPanel = new AchievementPanel(this, width / 2, height / 2);
    this.breedingPanel = new BreedingPanel(this, width / 2, height / 2);

    this.add.existing(this.settingsPanel);
    this.add.existing(this.inventoryPanel);
    this.add.existing(this.collectionPanel);
    this.add.existing(this.detailPanel);
    this.add.existing(this.shopPanel);
    this.add.existing(this.achievementPanel);
    this.add.existing(this.breedingPanel);

    // 3. Register Global Event Listeners for notifications
    EventBus.on('achievementUnlocked', (data: any) => this.showNotification('🏆 Achievement!', `${data.name}\n${data.rewards}`));
    EventBus.on('levelUp', (data: any) => this.showNotification('⭐ Level Up!', `You reached Level ${data.level}!\nEarned: +${data.coinsEarned} Coins, +${data.gemsEarned} Gems!`));
    EventBus.on('dailyRewardAvailable', (data: any) => this.showDailyClaimModal(data));

    // Handle screen resizing
    this.scale.on('resize', this.handleResize, this);

    // Check offline earnings and login streak on first boot
    this.time.delayedCall(800, () => {
      this.checkOfflineEarnings();
      AchievementSystem.checkDailyStreak();
    });
  }

  public showSettingsPanel(): void {
    this.togglePanel(this.settingsPanel);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    // Reposition panels to center of screen
    const panels = [
      this.settingsPanel,
      this.inventoryPanel,
      this.collectionPanel,
      this.detailPanel,
      this.shopPanel,
      this.achievementPanel,
      this.breedingPanel
    ];

    panels.forEach(p => {
      if (p) p.setPosition(width / 2, height / 2);
    });

    if (this.hud) {
      this.hud.reposition();
    }
  }

  public setAreaText(areaName: string): void {
    if (this.hud) {
      this.hud.setAreaName(areaName);
    }
  }

  private togglePanel(panel: Phaser.GameObjects.Container): void {
    const isVisible = panel.visible;

    // Close any active panel
    if (this.activePanel) {
      this.activePanel.setVisible(false);
      this.activePanel = null;
    }

    if (!isVisible) {
      panel.setVisible(true);
      this.activePanel = panel;
      
      // Call show/refresh if available
      const p = panel as any;
      if (p.refresh) p.refresh();
      if (p.show && p !== this.detailPanel && p !== this.inventoryPanel && p !== this.collectionPanel) p.show();
    }
  }

  private handleSanctuaryTransition(): void {
    // Check if we are already in SanctuaryScene
    if (this.scene.isActive('SanctuaryScene')) return;

    AudioManager.playSfx('ui_confirm');
    this.closeAllPanels();
    
    // Stop explore scene, launch Sanctuary
    this.cameras.main.fadeOut(500, 26, 35, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.scene.isActive('ExploreScene')) {
        this.scene.stop('ExploreScene');
      }
      this.scene.start('SanctuaryScene');
    });
  }

  private handleExploreTransition(): void {
    // Switch to ExploreScene
    if (this.scene.isActive('ExploreScene')) return;

    AudioManager.playSfx('ui_confirm');
    this.closeAllPanels();

    this.cameras.main.fadeOut(500, 26, 35, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.scene.isActive('SanctuaryScene')) {
        this.scene.stop('SanctuaryScene');
      }
      // Parameters initialized with meadow first or active area
      const state = SaveSystem.getState();
      const lastArea = state.unlockedAreas[state.unlockedAreas.length - 1] || 'green_meadow';
      this.scene.start('ExploreScene', { areaId: lastArea });
    });
  }

  private closeAllPanels(): void {
    if (this.activePanel) {
      this.activePanel.setVisible(false);
      this.activePanel = null;
    }
  }

  private checkOfflineEarnings(): void {
    const state = SaveSystem.getState();
    const result = EconomySystem.processOfflineEarnings(state);

    if (result.coinsEarned > 0) {
      const hours = (result.elapsedSeconds / 3600).toFixed(1);
      
      // Beautiful offline earnings welcome back pop-up modal
      const modal = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
      modal.setDepth(100);

      const modalBg = this.add.nineslice(0, 0, 'panel_frame', 0, 420, 260, 16, 16, 16, 16);
      modal.add(modalBg);

      const title = this.add.text(0, -90, 'WELCOME BACK!', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#5c4832'
      }).setOrigin(0.5);

      const desc = this.add.text(0, -30, `Your creatures were busy while you were away!\nSanctuary active for ${hours} hours.\n\nOffline earnings cap: ${result.maxHours} hours.`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        color: '#7a644e',
        align: 'center'
      }).setOrigin(0.5);

      const coinGroup = this.add.container(0, 30);
      const coinIcon = this.add.image(-50, 0, 'coin').setScale(1.5);
      const coinVal = this.add.text(-25, 0, `+${result.coinsEarned.toLocaleString()}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#8a5200'
      }).setOrigin(0, 0.5);
      coinGroup.add([coinIcon, coinVal]);

      const claimBtn = this.add.nineslice(0, 90, 'button', 0, 180, 38, 8, 8, 8, 8);
      claimBtn.setInteractive({ useHandCursor: true });
      claimBtn.on('pointerdown', () => {
        AudioManager.playSfx('ui_confirm');
        modal.destroy();
      });
      const claimTxt = this.add.text(0, 90, 'Claim & Enter', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#5c4832'
      }).setOrigin(0.5);

      modal.add([title, desc, coinGroup, claimBtn, claimTxt]);

      // Pop open effect
      modal.setScale(0.1);
      this.tweens.add({
        targets: modal,
        scale: 1.0,
        duration: 250,
        ease: 'Back.easeOut'
      });
    }
  }

  private showDailyClaimModal(data: any): void {
    const modal = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
    modal.setDepth(101);

    const bg = this.add.nineslice(0, 0, 'panel_frame', 0, 420, 340, 16, 16, 16, 16);
    modal.add(bg);

    const title = this.add.text(0, -130, 'DAILY REWARDS', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    modal.add(title);

    // Create 7 day boxes
    const boxWidth = 50;
    const startX = -((7 - 1) * (boxWidth + 6)) / 2;
    const yPos = -30;

    for (let d = 1; d <= 7; d++) {
      const boxX = startX + (d - 1) * (boxWidth + 6);
      const box = this.add.container(boxX, yPos);

      const boxBg = this.add.nineslice(0, 0, 'button', 0, boxWidth, 75, 4, 4, 4, 4);
      if (d === data.day) {
        boxBg.setTint(0xffd9a0); // Highlight today
        box.setScale(1.08);
      } else if (d < data.day) {
        boxBg.setTint(0xccdcd0); // Claimed
      } else {
        boxBg.setTint(0xe5dcd3); // Locked
      }
      box.add(boxBg);

      const dayTxt = this.add.text(0, -25, `Day ${d}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#5c4832'
      }).setOrigin(0.5);
      
      const giftIcon = this.add.text(0, -2, d === 7 ? '🎁' : '🪙', {
        fontFamily: 'Inter, sans-serif',
        fontSize: d === 7 ? '18px' : '15px'
      }).setOrigin(0.5);

      const amtTxt = this.add.text(0, 22, d === 7 ? '+1k +💎5' : `+${d * 100}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        color: '#8a5200'
      }).setOrigin(0.5);

      box.add([dayTxt, giftIcon, amtTxt]);
      modal.add(box);
    }

    const rewardDesc = this.add.text(0, 45, `Streak Day ${data.day}! Click claim to receive rewards!`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'normal',
      color: '#7a644e'
    }).setOrigin(0.5);
    modal.add(rewardDesc);

    // Claim button
    const claimBtn = this.add.nineslice(0, 110, 'button', 0, 180, 38, 8, 8, 8, 8);
    claimBtn.setInteractive({ useHandCursor: true });
    claimBtn.on('pointerdown', () => {
      AchievementSystem.claimDailyReward();
      modal.destroy();
    });
    const claimTxt = this.add.text(0, 110, 'Claim Reward', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    modal.add([claimBtn, claimTxt]);

    modal.setScale(0.1);
    this.tweens.add({
      targets: modal,
      scale: 1.0,
      duration: 250,
      ease: 'Back.easeOut'
    });
  }

  private showNotification(title: string, msg: string): void {
    const width = this.cameras.main.width;
    
    const toast = this.add.container(width / 2, -60);
    toast.setDepth(200);

    const toastBg = this.add.nineslice(0, 0, 'panel_frame', 0, 320, 65, 8, 8, 8, 8);
    toastBg.setTint(0xfff7e6);
    toast.add(toastBg);

    const titleTxt = this.add.text(0, -18, title, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#8a5200'
    }).setOrigin(0.5);

    const bodyTxt = this.add.text(0, 8, msg, {
      fontFamily: 'Inter, sans-serif',
      fontSize: '11px',
      fontStyle: 'normal',
      color: '#5c4832',
      align: 'center'
    }).setOrigin(0.5);

    toast.add([titleTxt, bodyTxt]);

    // Slide down, wait, slide back up
    this.tweens.add({
      targets: toast,
      y: 65,
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2500, () => {
          this.tweens.add({
            targets: toast,
            y: -70,
            duration: 300,
            ease: 'Power2.easeIn',
            onComplete: () => toast.destroy()
          });
        });
      }
    });
  }
}
