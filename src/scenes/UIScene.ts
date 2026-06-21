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
import { DialoguePanel } from '../ui/DialoguePanel';
import { DialogueManager } from '../systems/DialogueManager';
import { SaveSystem } from '../systems/SaveSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { EventBus } from '../systems/EventBus';
import { AudioManager } from '../systems/AudioManager';
import { AchievementSystem } from '../systems/AchievementSystem';
import { QuestManager } from '../systems/QuestManager';

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
  private dialoguePanel!: DialoguePanel;

  // Active overlay panel tracker
  private activePanel: Phaser.GameObjects.Container | null = null;

  // Tutorial
  private tutorialPanel!: Phaser.GameObjects.Container;
  private tutorialText!: Phaser.GameObjects.Text;
  private tutorialArrow!: Phaser.GameObjects.Graphics;
  private lastTutorialStepDialoguePlayed = -1;

  private hasCheckedOfflineEarnings = false;

  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create(): void {
    // Clear all static event listeners from previous sessions to prevent zombie duplicate handler crashes
    EventBus.removeAllListeners();

    this.scene.bringToTop();
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

    // Dialogue Overlay
    this.dialoguePanel = new DialoguePanel(this, width / 2, height - 95);
    this.dialoguePanel.setDepth(250);
    this.add.existing(this.dialoguePanel);

    // Tutorial Overlay
    this.tutorialArrow = this.add.graphics();
    this.tutorialArrow.setDepth(300);
    this.buildTutorialUI(width, height);

    // 3. Register Global Event Listeners for notifications
    EventBus.on('achievementUnlocked', (data: any) => this.showNotification('🏆 Achievement!', `${data.name}\n${data.rewards}`));
    EventBus.on('levelUp', (data: any) => this.showNotification('⭐ Level Up!', `You reached Level ${data.level}!\nEarned: +${data.coinsEarned} Coins, +${data.gemsEarned} Gems!`));
    EventBus.on('creatureCaptured', (data: any) => this.showNotification('🦊 Creature Tethered!', `Leading ${data.name} back to Sanctuary!\nRelease them in pen gates for rewards.`));
    EventBus.on('questTurnedIn', (questId: string) => {
      const q = QuestManager.getQuest(questId);
      if (q) {
        this.showNotification('📋 Quest Completed!', `Finished: ${q.title}\nRewards claimed! Check level progression.`);
      }
    });
    EventBus.on('biomeUnlocked', (biomeId: string) => {
      const areasData = this.cache.json.get('areas_data');
      const area = areasData?.areas?.find((a: any) => a.id === biomeId);
      const biomeName = area ? area.name : biomeId.replace('_', ' ');
      this.showNotification('🧭 New Biome Unlocked!', `You can now travel to the ${biomeName}!`);
    });
    EventBus.on('dailyRewardAvailable', (data: any) => this.showDailyClaimModal(data));
    EventBus.on('dialogueStarted', () => this.closeAllPanels());

    // Handle screen resizing
    this.scale.on('resize', this.handleResize, this);

    // Offline checks are deferred until we are in-game (handled in update)
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

    if (this.dialoguePanel) {
      this.dialoguePanel.setPosition(width / 2, height - 95);
    }

    if (this.tutorialPanel) {
      this.tutorialPanel.setPosition(width / 2, height - 120);
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
    
    if (this.scene.isActive('ExploreScene')) {
      this.scene.stop('ExploreScene');
    }
    this.scene.start('TravelScene', { targetScene: 'SanctuaryScene' });
  }

  private handleExploreTransition(): void {
    if (this.scene.isActive('ExploreScene')) return;

    AudioManager.playSfx('ui_confirm');
    this.closeAllPanels();

    // Open Map Selection Screen
    import('../ui/MapSelectionPanel').then(({ MapSelectionPanel }) => {
      new MapSelectionPanel(this);
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

      const modalBg = this.add.nineslice(0, 0, 'modal_window', 0, 680, 400, 32, 32, 32, 32);
      modal.add(modalBg);

      const title = this.add.text(0, -110, 'WELCOME BACK!', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#5c4832'
      }).setOrigin(0.5);

      const desc = this.add.text(0, -50, `Your creatures were busy while you were away!\nSanctuary active for ${hours} hours.\n\nOffline earnings cap: ${result.maxHours} hours.`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        color: '#7a644e',
        align: 'center'
      }).setOrigin(0.5);

      const coinGroup = this.add.container(0, 25);
      
      const coinVal = this.add.text(0, 0, `+${result.coinsEarned.toLocaleString()} Coins`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#8a5200'
      }).setOrigin(0.5, 0.5);

      const textWidth = coinVal.width;
      const coinIconScale = 0.25; // drastically reduced
      const coinIcon = this.add.image(-textWidth / 2 - 25, 0, 'coin').setScale(coinIconScale);

      coinGroup.add([coinVal, coinIcon]);

      // Add subtle pixel-art sparkle effects
      const sparkles: Phaser.GameObjects.Graphics[] = [];
      for(let i = 0; i < 5; i++) {
        const sp = this.add.graphics();
        sp.fillStyle(0xffd700, 1);
        sp.fillRect(-2, -2, 4, 4);
        sp.setPosition((Math.random() - 0.5) * (textWidth + 60), (Math.random() - 0.5) * 50);
        sparkles.push(sp);
        
        this.tweens.add({
          targets: sp,
          alpha: { start: 0, to: 1 },
          scale: { start: 0.5, to: 1.5 },
          y: sp.y - 15,
          duration: 600 + Math.random() * 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
      coinGroup.add(sparkles);

      // Increase Claim button width to ~60% of popup width (420 * 0.6 = 252)
      const claimBtn = this.add.nineslice(0, 100, 'button', 0, 300, 48, 18, 18, 12, 12);
      claimBtn.setInteractive({ useHandCursor: true });
      const claimTxt = this.add.text(0, 98, 'CLAIM REWARDS', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#5c4832'
      }).setOrigin(0.5);

      claimBtn.on('pointerover', () => {
        claimBtn.setTexture('button_hover');
        this.tweens.add({ targets: [claimBtn, claimTxt], scale: 1.05, duration: 80 });
        AudioManager.playSfx('button_hover');
      });
      claimBtn.on('pointerout', () => {
        claimBtn.setTexture('button');
        claimBtn.y = 90;
        claimTxt.y = 88;
        this.tweens.add({ targets: [claimBtn, claimTxt], scale: 1.0, duration: 80 });
      });
      claimBtn.on('pointerdown', () => {
        claimBtn.setTexture('button_click');
        claimBtn.y = 92; 
        claimTxt.y = 90;
        this.tweens.add({ targets: [claimBtn, claimTxt], scale: 0.95, duration: 40 });
      });
      claimBtn.on('pointerup', () => {
        AudioManager.playSfx('ui_confirm');

        // Reward collection animation
        const globalPos = coinIcon.getWorldTransformMatrix();
        const flyingCoin = this.add.image(globalPos.tx, globalPos.ty, 'coin').setScale(coinIconScale).setDepth(200);
        
        modal.destroy();

        // Target coordinates for coin HUD (topRight - 139, 9)
        const targetX = this.cameras.main.width - 139;
        const targetY = 9;

        this.tweens.add({
          targets: flyingCoin,
          x: targetX,
          y: targetY,
          scale: 0.13, // hud icon scale
          duration: 800,
          ease: 'Power2',
          onComplete: () => {
            flyingCoin.destroy();
          }
        });
      });

      modal.add([title, desc, coinGroup, claimBtn, claimTxt]);

      // Pop open effect (0.8 -> 1.05 -> 1.0)
      modal.setScale(0.8);
      this.tweens.chain({
        targets: modal,
        tweens: [
          { scale: 1.05, duration: 200, ease: 'Sine.easeOut' },
          { scale: 1.0, duration: 150, ease: 'Sine.easeIn' }
        ]
      });
    }
  }

  private showDailyClaimModal(data: any): void {
    const modal = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
    modal.setDepth(101);

    const bg = this.add.nineslice(0, 0, 'modal_window', 0, 420, 340, 32, 32, 32, 32);
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

      const boxBg = this.add.nineslice(0, 0, 'button', 0, boxWidth, 75, 18, 18, 12, 12);
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
    const claimBtn = this.add.nineslice(0, 110, 'button', 0, 180, 38, 18, 18, 12, 12);
    claimBtn.setInteractive({ useHandCursor: true });
    const claimTxt = this.add.text(0, 108, 'Claim Reward', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    claimBtn.on('pointerover', () => {
      claimBtn.setTexture('button_hover');
      this.tweens.add({ targets: [claimBtn, claimTxt], scale: 1.05, duration: 80 });
      AudioManager.playSfx('button_hover');
    });
    claimBtn.on('pointerout', () => {
      claimBtn.setTexture('button');
      claimBtn.y = 110;
      claimTxt.y = 108;
      this.tweens.add({ targets: [claimBtn, claimTxt], scale: 1.0, duration: 80 });
    });
    claimBtn.on('pointerdown', () => {
      claimBtn.setTexture('button_click');
      claimBtn.y = 112; // Y translation downwards by 2px
      claimTxt.y = 110;
      this.tweens.add({ targets: [claimBtn, claimTxt], scale: 0.95, duration: 40 });
    });
    claimBtn.on('pointerup', () => {
      AudioManager.playSfx('ui_confirm');
      AchievementSystem.claimDailyReward();
      modal.destroy();
    });
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

    const toastBg = this.add.nineslice(0, 0, 'modal_window', 0, 360, 80, 32, 32, 32, 32);
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

  update(_time: number, _delta: number): void {
    // Auto-hide HUD and Tutorial if MainMenuScene is the active scene
    if (this.scene.manager.isActive('MainMenuScene')) {
      if (this.hud && this.hud.visible) {
        this.hud.setVisible(false);
      }
      if (this.tutorialPanel && this.tutorialPanel.visible) {
        this.tutorialPanel.setVisible(false);
        this.tutorialArrow.clear();
      }
      return;
    }

    this.checkTutorialProgress();
    this.updateTutorialArrow();

    if (this.hud && !this.hud.visible) {
      this.hud.setVisible(true);
    }
    
    // Perform offline checks once we enter the game
    if (!this.hasCheckedOfflineEarnings) {
      this.hasCheckedOfflineEarnings = true;
      this.time.delayedCall(500, () => {
        this.checkOfflineEarnings();
        AchievementSystem.checkDailyStreak();
      });
    }
  }

  private checkTutorialProgress(): void {
    const state = SaveSystem.getState();
    if (state.tutorialStep === undefined || state.tutorialStep < 0) {
      if (this.tutorialPanel && this.tutorialPanel.visible) {
        this.tutorialPanel.setVisible(false);
        this.tutorialArrow.clear();
      }
      return;
    }

    const activeScene = this.scene.manager.scenes.find(s => (s.scene.key === 'SanctuaryScene' || s.scene.key === 'ExploreScene') && s.scene.isActive()) as any;
    if (!activeScene) return;

    if (state.tutorialStep !== this.lastTutorialStepDialoguePlayed) {
      this.lastTutorialStepDialoguePlayed = state.tutorialStep;
      this.triggerTutorialDialogue(state.tutorialStep);
    }

    if (state.tutorialStep === 0) {
      // Movement check
      if (activeScene.scene.key === 'SanctuaryScene' && activeScene.player) {
        const dist = Phaser.Math.Distance.Between(activeScene.player.x, activeScene.player.y, 600, 480);
        if (dist > 75) {
          state.tutorialStep = 1;
          SaveSystem.markDirty();
          SaveSystem.forceSave();
          this.updateTutorialText();
          AudioManager.playSfx('ui_confirm');
        }
      }
    } else if (state.tutorialStep === 1) {
      // Goal: Enter Meadow portal (active scene becomes ExploreScene)
      if (activeScene.scene.key === 'ExploreScene') {
        state.tutorialStep = 2;
        SaveSystem.markDirty();
        SaveSystem.forceSave();
        this.updateTutorialText();
        AudioManager.playSfx('ui_confirm');

        // Spawn a rabbit close to the player in ExploreScene
        if (activeScene.spawnWildCreatureNearPlayer) {
          activeScene.spawnWildCreatureNearPlayer('meadow_rabbit');
        }
      }
    } else if (state.tutorialStep === 2) {
      // Goal: Capture creature (tetheredCreature becomes active)
      if (activeScene.scene.key === 'ExploreScene' && activeScene.tetheredCreature) {
        state.tutorialStep = 3;
        SaveSystem.markDirty();
        SaveSystem.forceSave();
        this.updateTutorialText();
        AudioManager.playSfx('ui_confirm');
      }
    } else if (state.tutorialStep === 3) {
      // Goal: Return to Sanctuary (scene becomes SanctuaryScene and tetheredCreature is present)
      if (activeScene.scene.key === 'SanctuaryScene') {
        state.tutorialStep = 4;
        SaveSystem.markDirty();
        SaveSystem.forceSave();
        this.updateTutorialText();
        AudioManager.playSfx('ui_confirm');
      }
    } else if (state.tutorialStep === 4) {
      // Goal: Deliver creature to Meadow pen (tetheredCreature becomes null)
      if (activeScene.scene.key === 'SanctuaryScene' && !activeScene.tetheredCreature) {
        state.tutorialStep = 5;
        SaveSystem.markDirty();
        SaveSystem.forceSave();
        this.updateTutorialText();
        AudioManager.playSfx('ui_confirm');
      }
    } else if (state.tutorialStep === 6) {
      // Goal: Open Shop panel
      if (this.shopPanel && this.shopPanel.visible) {
        state.tutorialStep = 7;
        SaveSystem.markDirty();
        SaveSystem.forceSave();
        this.updateTutorialText();
        AudioManager.playSfx('ui_confirm');
      }
    }
  }

  private updateTutorialArrow(): void {
    this.tutorialArrow.clear();
    const state = SaveSystem.getState();
    if (state.tutorialStep === undefined || state.tutorialStep < 0 || state.tutorialStep >= 7) {
      return;
    }

    const activeScene = this.scene.manager.scenes.find(s => (s.scene.key === 'SanctuaryScene' || s.scene.key === 'ExploreScene') && s.scene.isActive()) as any;
    if (!activeScene || !activeScene.player) return;

    const player = activeScene.player;
    let tx = 0, ty = 0;
    let showArrow = false;

    if (state.tutorialStep === 1) {
      // Point to Meadow Portal in Sanctuary
      if (activeScene.scene.key === 'SanctuaryScene') {
        tx = 440;
        ty = 360;
        showArrow = true;
      }
    } else if (state.tutorialStep === 2) {
      // Point to Meadow Rabbit in Explore
      if (activeScene.scene.key === 'ExploreScene') {
        // Find nearest wild creature
        const nearest = activeScene.activeCreatures?.[0];
        if (nearest) {
          tx = nearest.x;
          ty = nearest.y;
          showArrow = true;
        } else {
          tx = 1200;
          ty = 850;
          showArrow = true;
        }
      }
    } else if (state.tutorialStep === 3) {
      // Point to return portal in Explore
      if (activeScene.scene.key === 'ExploreScene') {
        tx = 1800;
        ty = 800;
        showArrow = true;
      }
    } else if (state.tutorialStep === 4) {
      // Point to Meadow Pen gate in Sanctuary
      if (activeScene.scene.key === 'SanctuaryScene') {
        tx = 380;
        ty = 160;
        showArrow = true;
      }
    }

    if (showArrow) {
      const cam = activeScene.cameras.main;
      const sx = (player.x - cam.scrollX) * cam.zoom;
      const sy = (player.y - cam.scrollY - 30) * cam.zoom;

      const angle = Phaser.Math.Angle.Between(player.x, player.y, tx, ty);

      // Draw a small cozy green pointer arrow pointing at the target
      this.tutorialArrow.fillStyle(0x8fd14f, 0.95);
      this.tutorialArrow.lineStyle(1.5, 0xffffff, 1);

      this.tutorialArrow.beginPath();
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const length = 20;
      
      // Tip of arrow
      const tipX = sx + cos * (length + 10);
      const tipY = sy + sin * (length + 10);

      // Left back corner
      const lbX = sx + Math.cos(angle + 2.5) * length;
      const lbY = sy + Math.sin(angle + 2.5) * length;

      // Right back corner
      const rbX = sx + Math.cos(angle - 2.5) * length;
      const rbY = sy + Math.sin(angle - 2.5) * length;

      this.tutorialArrow.moveTo(tipX, tipY);
      this.tutorialArrow.lineTo(lbX, lbY);
      this.tutorialArrow.lineTo(sx, sy);
      this.tutorialArrow.lineTo(rbX, rbY);
      this.tutorialArrow.closePath();
      
      this.tutorialArrow.fillPath();
      this.tutorialArrow.strokePath();
    }
  }

  private buildTutorialUI(width: number, height: number): void {
    const isMobile = width < 768;
    this.tutorialPanel = this.add.container(width / 2, height - 120);
    this.tutorialPanel.setDepth(200);

    const frameW = Math.min(width - 40, 480);
    const frameH = 54;
    const frame = this.add.nineslice(0, 0, 'text-bar', 0, frameW, frameH, 16, 16, 16, 16);
    frame.setInteractive({ useHandCursor: true });
    this.tutorialPanel.add(frame);

    this.tutorialText = this.add.text(0, -2, '', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: isMobile ? '10px' : '11.5px',
      fontStyle: 'bold',
      color: '#5c4832',
      align: 'center',
      wordWrap: { width: frameW - 32 }
    }).setOrigin(0.5);
    this.tutorialPanel.add(this.tutorialText);

    frame.on('pointerdown', () => {
      this.handleTutorialPanelClick();
    });

    this.updateTutorialText();
  }

  private handleTutorialPanelClick(): void {
    const state = SaveSystem.getState();
    if (state.tutorialStep === 5) {
      state.tutorialStep = 6;
      SaveSystem.markDirty();
      SaveSystem.forceSave();
      this.updateTutorialText();
      AudioManager.playSfx('ui_confirm');
    } else if (state.tutorialStep === 7) {
      // Completed! Reward time!
      state.tutorialStep = -1;
      state.coins += 500;
      
      // Add first creature to inventory (Meadow Rabbit)
      state.ownedCreatures.push({
        instanceId: `tutorial_${Date.now()}`,
        creatureId: 'meadow_rabbit',
        level: 1,
        capturedAt: Date.now()
      });

      SaveSystem.markDirty();
      SaveSystem.forceSave();

      EventBus.emit('coinsChanged', state.coins);
      this.showNotification('🎉 Tutorial Completed!', 'Earned: +500 Coins, Meadow Rabbit unlocked!');
      
      this.tutorialPanel.setVisible(false);
      this.tutorialArrow.clear();
      AudioManager.playSfx('ui_confirm');
    }
  }

  private updateTutorialText(): void {
    const state = SaveSystem.getState();
    if (state.tutorialStep === undefined || state.tutorialStep < 0) {
      this.tutorialPanel.setVisible(false);
      return;
    }

    this.tutorialPanel.setVisible(true);
    let text = '';
    switch (state.tutorialStep) {
      case 0:
        text = 'TUTORIAL (1/7): MOVEMENT\nUse W, A, S, D or Arrow Keys to walk around the Sanctuary.';
        break;
      case 1:
        text = 'TUTORIAL (2/7): CHOOSE BIOME\nWalk to the Green Meadow Portal (glowing green circle to the left) and press [E] to travel.';
        break;
      case 2:
        text = 'TUTORIAL (3/7): RESCUE ANIMAL\nWalk up to the Meadow Rabbit and throw your lasso using [SPACE] or click.';
        break;
      case 3:
        text = 'TUTORIAL (4/7): ESCORT BACK\nThe rabbit is trailing you! Return to the exit portal and press [E] to travel.';
        break;
      case 4:
        text = 'TUTORIAL (5/7): DELIVER\nLead the rabbit to the Meadow Pen Gate (top-left pen) and press [E] or Click to Release.';
        break;
      case 5:
        text = 'TUTORIAL (6/7): PASSIVE INCOME\nReleased creatures generate Coins passively! Click here to continue.';
        break;
      case 6:
        text = 'TUTORIAL (7/7): UPGRADE SHOP\nOpen the Shop (Click [🛒 Shop] on bottom dock) to purchase stronger ropes.';
        break;
      case 7:
        text = 'TUTORIAL COMPLETED!\nYou earned: 🪙500 Coins, Meadow Rabbit unlocked! Click here to collect rewards.';
        break;
    }
    this.tutorialText.setText(text);
  }

  private triggerTutorialDialogue(step: number): void {
    const activeScene = this.scene.manager.scenes.find(s => (s.scene.key === 'SanctuaryScene' || s.scene.key === 'ExploreScene') && s.scene.isActive());
    if (!activeScene) return;

    if (step === 0) {
      DialogueManager.startDialogue([
        {
          speaker: 'Luna',
          portrait: 'luna_information',
          portraitSide: 'left',
          text: 'Welcome to Wild Haven! Let me show you how creature taming works. Let\'s start by walking around the sanctuary! Use WASD or Arrow Keys to move.'
        }
      ]);
    } else if (step === 2) {
      DialogueManager.startDialogue([
        {
          speaker: 'Luna',
          portrait: 'luna_information',
          portraitSide: 'left',
          text: 'Look, a wild Meadow Rabbit! Try throwing your rope toward that creature to rescue it. Click or press [SPACE] to throw the lasso!'
        }
      ]);
    } else if (step === 4) {
      DialogueManager.startDialogue([
        {
          speaker: 'Luna',
          portrait: 'luna_information',
          portraitSide: 'left',
          text: 'Good job bringing the rabbit back! Creatures placed inside pens will generate coins over time. Walk to the Meadow Pen Gate and Click or press [E] to Release.'
        }
      ]);
    } else if (step === 5) {
      DialogueManager.startDialogue([
        {
          speaker: 'Luna',
          portrait: 'luna_information',
          portraitSide: 'left',
          text: 'Success! The creature is safe and happy. Released creatures generate Coins passively! Click the coins floating above them to collect.'
        }
      ]);
    } else if (step === 6) {
      DialogueManager.startDialogue([
        {
          speaker: 'Luna',
          portrait: 'luna_information',
          portraitSide: 'left',
          text: 'Coins can purchase better ropes and upgrades! Let\'s open the Shop to see what\'s available. Click [🛒 Shop] on the bottom dock to continue.'
        }
      ]);
    }
  }
}
