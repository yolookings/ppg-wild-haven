// src/ui/ShopPanel.ts
import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { DataLoader } from '../data/DataLoader';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';

export class ShopPanel extends Phaser.GameObjects.Container {
  private panelBg!: Phaser.GameObjects.NineSlice;
  private gridItems: Phaser.GameObjects.Container[] = [];
  
  private ropesTabBtn!: Phaser.GameObjects.Container;
  private upgradesTabBtn!: Phaser.GameObjects.Container;
  private activeTab: 'ropes' | 'upgrades' = 'ropes';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const width = 600;
    const height = 450;

    // Background
    this.panelBg = scene.add.nineslice(0, 0, 'panel_frame', 0, width, height, 16, 16, 16, 16);
    this.add(this.panelBg);

    // Title
    const title = scene.add.text(0, -height / 2 + 25, 'SANCTUARY SHOP', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.add(title);

    // Close Button
    const closeBtn = scene.add.text(width / 2 - 30, -height / 2 + 25, '❌', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '18px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.setVisible(false);
    });
    this.add(closeBtn);

    // Setup Tabs
    this.createTabs(width, height);

    this.setVisible(false);

    // Listen to changes to redraw the shop cards
    EventBus.on('coinsChanged', () => { if (this.visible) this.refresh(); });
    EventBus.on('gemsChanged', () => { if (this.visible) this.refresh(); });
    EventBus.on('ropePurchased', () => { if (this.visible) this.refresh(); });
    EventBus.on('sanctuaryUpgraded', () => { if (this.visible) this.refresh(); });
  }

  public show(): void {
    this.refresh();
    this.setVisible(true);
  }

  private createTabs(_panelWidth: number, panelHeight: number): void {
    const yPos = -panelHeight / 2 + 65;
    
    // Ropes Tab
    this.ropesTabBtn = this.scene.add.container(-80, yPos);
    const ropesBg = this.scene.add.nineslice(0, 0, 'button', 0, 140, 30, 6, 6, 6, 6);
    ropesBg.setInteractive({ useHandCursor: true });
    ropesBg.on('pointerdown', () => {
      if (this.activeTab !== 'ropes') {
        AudioManager.playSfx('ui_tap');
        this.activeTab = 'ropes';
        this.refresh();
      }
    });
    const ropesTxt = this.scene.add.text(0, 0, 'Ropes & Gear', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.ropesTabBtn.add([ropesBg, ropesTxt]);
    this.add(this.ropesTabBtn);

    // Upgrades Tab
    this.upgradesTabBtn = this.scene.add.container(80, yPos);
    const upgradesBg = this.scene.add.nineslice(0, 0, 'button', 0, 140, 30, 6, 6, 6, 6);
    upgradesBg.setInteractive({ useHandCursor: true });
    upgradesBg.on('pointerdown', () => {
      if (this.activeTab !== 'upgrades') {
        AudioManager.playSfx('ui_tap');
        this.activeTab = 'upgrades';
        this.refresh();
      }
    });
    const upgradesTxt = this.scene.add.text(0, 0, 'Sanctuary Perks', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.upgradesTabBtn.add([upgradesBg, upgradesTxt]);
    this.add(this.upgradesTabBtn);
  }

  public refresh(): void {
    // Highlight active tab button
    const rBg = this.ropesTabBtn.list[0] as Phaser.GameObjects.NineSlice;
    const rTxt = this.ropesTabBtn.list[1] as Phaser.GameObjects.Text;
    const uBg = this.upgradesTabBtn.list[0] as Phaser.GameObjects.NineSlice;
    const uTxt = this.upgradesTabBtn.list[1] as Phaser.GameObjects.Text;

    if (this.activeTab === 'ropes') {
      rBg.setTint(0xffe9a8);
      rTxt.setColor('#8a5200');
      uBg.clearTint();
      uTxt.setColor('#5c4832');
    } else {
      uBg.setTint(0xffe9a8);
      uTxt.setColor('#8a5200');
      rBg.clearTint();
      rTxt.setColor('#5c4832');
    }

    // Clear old items
    this.gridItems.forEach(item => item.destroy());
    this.gridItems = [];

    if (this.activeTab === 'ropes') {
      this.renderRopesList();
    } else {
      this.renderUpgradesList();
    }
  }

  private renderRopesList(): void {
    const ropes = DataLoader.getRopes();
    const state = SaveSystem.getState();

    // Ropes starts at index 1 (skip index 0 basic rope as it is always owned)
    const purchasableRopes = ropes.slice(1);

    const startX = -170;
    const startY = -40;
    const spacingX = 170;
    const spacingY = 140; // 3 columns, 2 rows max

    purchasableRopes.forEach((rope, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);

      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const card = this.scene.add.container(x, y);

      // Card Background
      const cardBg = this.scene.add.nineslice(0, 0, 'button', 0, 150, 125, 8, 8, 8, 8);
      card.add(cardBg);

      // Rope Icon
      const icon = this.scene.add.image(0, -32, rope.id);
      icon.setScale(1.5);
      card.add(icon);

      // Rope Name
      const name = this.scene.add.text(0, -2, rope.name, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#5c4832'
      }).setOrigin(0.5);
      card.add(name);

      // Rope Desc
      const desc = this.scene.add.text(0, 20, `Power: ${rope.capturePower}\n${rope.description.split('.')[0]}.`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '9px',
        color: '#7a644e',
        align: 'center',
        wordWrap: { width: 130 }
      }).setOrigin(0.5);
      card.add(desc);

      // Buy Button/Status
      const buyBtnY = 48;
      const isOwned = state.ropesOwned.includes(rope.id);
      const isEquipped = state.currentRopeId === rope.id;

      if (isEquipped) {
        const status = this.scene.add.text(0, buyBtnY, 'EQUIPPED', {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#8fd14f'
        }).setOrigin(0.5);
        card.add(status);
      } else if (isOwned) {
        const equipBtn = this.scene.add.nineslice(0, buyBtnY, 'button', 0, 90, 22, 6, 6, 6, 6);
        equipBtn.setInteractive({ useHandCursor: true });
        equipBtn.on('pointerdown', () => {
          AudioManager.playSfx('ui_confirm');
          ProgressionSystem.equipRope(rope.id);
          this.refresh();
        });
        const equipTxt = this.scene.add.text(0, buyBtnY, 'EQUIP', {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#5c4832'
        }).setOrigin(0.5);
        card.add([equipBtn, equipTxt]);
      } else {
        // Can buy
        let costText = `${rope.cost} Coins`;
        if (rope.requiresGems) costText += ` + ${rope.requiresGems} Gems`;

        // Check locks
        const hasAchievementLock = rope.requiresAchievement && !state.achievementsUnlocked.includes(rope.requiresAchievement);
        
        if (hasAchievementLock) {
          const status = this.scene.add.text(0, buyBtnY, 'LOCKED (Ach)', {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#ff5c8a'
          }).setOrigin(0.5);
          card.add(status);
          
          cardBg.setInteractive({ useHandCursor: true });
          cardBg.on('pointerdown', () => {
            alert(`Locked! Requires Achievement: ${rope.requiresAchievement}`);
          });
        } else {
          // Normal purchase button
          const buyBtn = this.scene.add.nineslice(0, buyBtnY, 'button', 0, 110, 24, 6, 6, 6, 6);
          buyBtn.setTint(0xffd9a0);
          buyBtn.setInteractive({ useHandCursor: true });
          buyBtn.on('pointerdown', () => {
            const res = ProgressionSystem.buyRope(rope.id);
            if (res.success) {
              this.refresh();
            } else {
              alert(res.error);
            }
          });
          const buyTxt = this.scene.add.text(0, buyBtnY, costText, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#8a5200'
          }).setOrigin(0.5);
          card.add([buyBtn, buyTxt]);
        }
      }

      this.gridItems.push(card);
      this.add(card);
    });
  }

  private renderUpgradesList(): void {
    const state = SaveSystem.getState();
    
    // Upgrades list card structure
    // Enclosure Expansion
    const capacityCard = this.createUpgradeCard(-120, 20, 'Enclosure Expansion', 
      `Expand slot capacity: ${EconomySystem.getSanctuaryCapacity(state.sanctuaryLevel)} ➔ ${EconomySystem.getSanctuaryCapacity(state.sanctuaryLevel + 1)} slots.`,
      EconomySystem.getUpgradeCost(state.sanctuaryLevel),
      () => {
        const res = EconomySystem.upgradeSanctuary();
        if (!res) {
          alert('Not enough coins to expand sanctuary enclosure!');
        }
      },
      state.sanctuaryLevel >= 5
    );
    this.gridItems.push(capacityCard);
    this.add(capacityCard);

    // Capture Perk
    // Let's check how many levels are unlocked
    const currentPerkLevel = Math.min(10, state.sanctuaryLevel - 1) * 2;
    const perkCost = Math.floor(1200 * Math.pow(state.sanctuaryLevel, 1.8));

    const perkCard = this.createUpgradeCard(120, 20, 'Capture Training',
      `Increase capture rate bonus: +${currentPerkLevel}% ➔ +${currentPerkLevel + 2}% global success bonus.`,
      perkCost,
      () => {
        // Simple coin sink perk: raises a permanent success bonus in state
        // For simplicity, we just tied perk to sanctuaryLevel. Let's make it so they can buy it directly to increment sanctuary level as a combined growth
        const res = EconomySystem.upgradeSanctuary();
        if (!res) {
          alert('Not enough coins for Capture Training!');
        }
      },
      state.sanctuaryLevel >= 5
    );
    this.gridItems.push(perkCard);
    this.add(perkCard);
  }

  private createUpgradeCard(x: number, y: number, name: string, desc: string, cost: number, onBuy: () => void, isMaxed: boolean): Phaser.GameObjects.Container {
    const card = this.scene.add.container(x, y);

    // Larger background card
    const bg = this.scene.add.nineslice(0, 0, 'button', 0, 220, 160, 8, 8, 8, 8);
    card.add(bg);

    const titleText = this.scene.add.text(0, -50, name, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    card.add(titleText);

    const descText = this.scene.add.text(0, -10, desc, {
      fontFamily: 'Inter, sans-serif',
      fontSize: '10px',
      color: '#7a644e',
      align: 'center',
      wordWrap: { width: 190 }
    }).setOrigin(0.5);
    card.add(descText);

    const btnY = 46;

    if (isMaxed) {
      const maxText = this.scene.add.text(0, btnY, 'MAXED OUT (Lvl 5)', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#8fd14f'
      }).setOrigin(0.5);
      card.add(maxText);
    } else {
      const buyBtn = this.scene.add.nineslice(0, btnY, 'button', 0, 170, 32, 6, 6, 6, 6);
      buyBtn.setTint(0xffd9a0);
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on('pointerdown', () => {
        onBuy();
        this.refresh();
      });

      buyBtn.on('pointerover', () => card.setScale(1.02));
      buyBtn.on('pointerout', () => card.setScale(1.0));

      const buyText = this.scene.add.text(0, btnY, `☘️ Upgrade (${cost} Coins)`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#8a5200'
      }).setOrigin(0.5);
      card.add([buyBtn, buyText]);
    }

    return card;
  }
}
