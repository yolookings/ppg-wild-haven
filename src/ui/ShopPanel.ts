// src/ui/ShopPanel.ts
import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { DataLoader } from '../data/DataLoader';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { OwnedCreature } from '../data/types';

export class ShopPanel extends Phaser.GameObjects.Container {
  private panelBg!: Phaser.GameObjects.NineSlice;
  private gridItems: Phaser.GameObjects.Container[] = [];
  
  private ropesTabBtn!: Phaser.GameObjects.Container;
  private upgradesTabBtn!: Phaser.GameObjects.Container;
  private mountsTabBtn!: Phaser.GameObjects.Container;
  private activeTab: 'ropes' | 'upgrades' | 'mounts' = 'ropes';

  private selectPetPanel!: Phaser.GameObjects.Container;
  private selectPetGridItems: any[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const width = 800;
    const height = 600;

    // Background
    this.panelBg = scene.add.nineslice(0, 0, 'modal_window', 0, width, height, 32, 32, 32, 32);
    this.add(this.panelBg);

    // Title
    const title = scene.add.text(0, -height / 2 + 25, 'SANCTUARY SHOP', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    title.setVisible(false);
    this.add(title);

    // Close Button
    const closeBtn = scene.add.text(width / 2 - 14, -height / 2 + 16, '✕', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => {
      closeBtn.setColor('#8f6f4a');
      AudioManager.playSfx('button_hover');
    });
    closeBtn.on('pointerout', () => {
      closeBtn.setColor('#5c4832');
    });
    closeBtn.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.setVisible(false);
      this.selectPetPanel.setVisible(false);
    });
    this.add(closeBtn);

    // Setup Tabs
    this.createTabs(width, height);

    // Setup Pet Selection Panel
    this.selectPetPanel = scene.add.container(0, 0);
    const subPanelBg = scene.add.nineslice(0, 0, 'modal_window', 0, 440, 360, 32, 32, 32, 32);
    subPanelBg.setTint(0xfff7e6);
    this.selectPetPanel.add(subPanelBg);

    const subTitle = scene.add.text(0, -150, 'SELECT PET FOR ITEM', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    const subClose = scene.add.text(440 / 2 - 14, -146, '✕', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    subClose.on('pointerover', () => {
      subClose.setColor('#8f6f4a');
      AudioManager.playSfx('button_hover');
    });
    subClose.on('pointerout', () => {
      subClose.setColor('#5c4832');
    });
    subClose.on('pointerdown', () => {
      this.selectPetPanel.setVisible(false);
    });
    this.selectPetPanel.add([subTitle, subClose]);
    this.add(this.selectPetPanel);
    this.selectPetPanel.setDepth(200);
    this.selectPetPanel.setVisible(false);

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
    this.ropesTabBtn = this.scene.add.container(-150, yPos);
    const ropesBg = this.scene.add.nineslice(0, 0, 'button', 0, 130, 30, 18, 18, 12, 12);
    ropesBg.setInteractive({ useHandCursor: true });
    const ropesTxt = this.scene.add.text(0, -2, 'Ropes & Gear', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.ropesTabBtn.add([ropesBg, ropesTxt]);
    this.add(this.ropesTabBtn);

    ropesBg.on('pointerover', () => {
      ropesBg.setTexture('button_hover');
      this.scene.tweens.add({ targets: this.ropesTabBtn, scale: 1.05, duration: 80 });
      AudioManager.playSfx('button_hover');
    });
    ropesBg.on('pointerout', () => {
      ropesBg.setTexture('button');
      ropesBg.y = 0;
      ropesTxt.y = -2;
      this.scene.tweens.add({ targets: this.ropesTabBtn, scale: 1.0, duration: 80 });
    });
    ropesBg.on('pointerdown', () => {
      ropesBg.setTexture('button_click');
      ropesBg.y = 2; // Y translation
      ropesTxt.y = 0;
      this.scene.tweens.add({ targets: this.ropesTabBtn, scale: 0.95, duration: 40 });
    });
    ropesBg.on('pointerup', () => {
      ropesBg.setTexture('button_hover');
      ropesBg.y = 0;
      ropesTxt.y = -2;
      this.scene.tweens.add({ targets: this.ropesTabBtn, scale: 1.05, duration: 40 });
      if (this.activeTab !== 'ropes') {
        AudioManager.playSfx('ui_tap');
        this.activeTab = 'ropes';
        this.refresh();
      }
    });

    // Upgrades Tab
    this.upgradesTabBtn = this.scene.add.container(0, yPos);
    const upgradesBg = this.scene.add.nineslice(0, 0, 'button', 0, 130, 30, 18, 18, 12, 12);
    upgradesBg.setInteractive({ useHandCursor: true });
    const upgradesTxt = this.scene.add.text(0, -2, 'Sanctuary Perks', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.upgradesTabBtn.add([upgradesBg, upgradesTxt]);
    this.add(this.upgradesTabBtn);

    upgradesBg.on('pointerover', () => {
      upgradesBg.setTexture('button_hover');
      this.scene.tweens.add({ targets: this.upgradesTabBtn, scale: 1.05, duration: 80 });
      AudioManager.playSfx('button_hover');
    });
    upgradesBg.on('pointerout', () => {
      upgradesBg.setTexture('button');
      upgradesBg.y = 0;
      upgradesTxt.y = -2;
      this.scene.tweens.add({ targets: this.upgradesTabBtn, scale: 1.0, duration: 80 });
    });
    upgradesBg.on('pointerdown', () => {
      upgradesBg.setTexture('button_click');
      upgradesBg.y = 2; // Y translation
      upgradesTxt.y = 0;
      this.scene.tweens.add({ targets: this.upgradesTabBtn, scale: 0.95, duration: 40 });
    });
    upgradesBg.on('pointerup', () => {
      upgradesBg.setTexture('button_hover');
      upgradesBg.y = 0;
      upgradesTxt.y = -2;
      this.scene.tweens.add({ targets: this.upgradesTabBtn, scale: 1.05, duration: 40 });
      if (this.activeTab !== 'upgrades') {
        AudioManager.playSfx('ui_tap');
        this.activeTab = 'upgrades';
        this.refresh();
      }
    });

    // Mounts Tab
    this.mountsTabBtn = this.scene.add.container(150, yPos);
    const mountsBg = this.scene.add.nineslice(0, 0, 'button', 0, 130, 30, 18, 18, 12, 12);
    mountsBg.setInteractive({ useHandCursor: true });
    const mountsTxt = this.scene.add.text(0, -2, 'Traits & Mounts', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.mountsTabBtn.add([mountsBg, mountsTxt]);
    this.add(this.mountsTabBtn);

    mountsBg.on('pointerover', () => {
      mountsBg.setTexture('button_hover');
      this.scene.tweens.add({ targets: this.mountsTabBtn, scale: 1.05, duration: 80 });
      AudioManager.playSfx('button_hover');
    });
    mountsBg.on('pointerout', () => {
      mountsBg.setTexture('button');
      mountsBg.y = 0;
      mountsTxt.y = -2;
      this.scene.tweens.add({ targets: this.mountsTabBtn, scale: 1.0, duration: 80 });
    });
    mountsBg.on('pointerdown', () => {
      mountsBg.setTexture('button_click');
      mountsBg.y = 2; // Y translation
      mountsTxt.y = 0;
      this.scene.tweens.add({ targets: this.mountsTabBtn, scale: 0.95, duration: 40 });
    });
    mountsBg.on('pointerup', () => {
      mountsBg.setTexture('button_hover');
      mountsBg.y = 0;
      mountsTxt.y = -2;
      this.scene.tweens.add({ targets: this.mountsTabBtn, scale: 1.05, duration: 40 });
      if (this.activeTab !== 'mounts') {
        AudioManager.playSfx('ui_tap');
        this.activeTab = 'mounts';
        this.refresh();
      }
    });
  }

  public refresh(): void {
    // Highlight active tab button
    const rBg = this.ropesTabBtn.list[0] as Phaser.GameObjects.NineSlice;
    const rTxt = this.ropesTabBtn.list[1] as Phaser.GameObjects.Text;
    const uBg = this.upgradesTabBtn.list[0] as Phaser.GameObjects.NineSlice;
    const uTxt = this.upgradesTabBtn.list[1] as Phaser.GameObjects.Text;
    const mBg = this.mountsTabBtn.list[0] as Phaser.GameObjects.NineSlice;
    const mTxt = this.mountsTabBtn.list[1] as Phaser.GameObjects.Text;

    rBg.clearTint();
    rTxt.setColor('#5c4832');
    uBg.clearTint();
    uTxt.setColor('#5c4832');
    mBg.clearTint();
    mTxt.setColor('#5c4832');

    if (this.activeTab === 'ropes') {
      rBg.setTint(0xffe9a8);
      rTxt.setColor('#8a5200');
    } else if (this.activeTab === 'upgrades') {
      uBg.setTint(0xffe9a8);
      uTxt.setColor('#8a5200');
    } else {
      mBg.setTint(0xffe9a8);
      mTxt.setColor('#8a5200');
    }

    // Clear old items
    this.gridItems.forEach(item => item.destroy());
    this.gridItems = [];

    if (this.activeTab === 'ropes') {
      this.renderRopesList();
    } else if (this.activeTab === 'upgrades') {
      this.renderUpgradesList();
    } else {
      this.renderMountsList();
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
      const cardBg = this.scene.add.nineslice(0, 0, 'button', 0, 150, 125, 18, 18, 12, 12);
      card.add(cardBg);

      // Rope Icon
      const icon = this.scene.add.image(0, -32, rope.id);
      icon.setScale(0.6);
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
        const equipBtn = this.scene.add.nineslice(0, buyBtnY, 'button', 0, 90, 22, 18, 18, 12, 12);
        equipBtn.setInteractive({ useHandCursor: true });
        const equipTxt = this.scene.add.text(0, buyBtnY - 2, 'EQUIP', {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#5c4832'
        }).setOrigin(0.5);
        card.add([equipBtn, equipTxt]);

        equipBtn.on('pointerover', () => {
          equipBtn.setTexture('button_hover');
          this.scene.tweens.add({ targets: equipBtn, scale: 1.05, duration: 80 });
          AudioManager.playSfx('button_hover');
        });
        equipBtn.on('pointerout', () => {
          equipBtn.setTexture('button');
          equipBtn.y = buyBtnY;
          equipTxt.y = buyBtnY - 2;
          this.scene.tweens.add({ targets: equipBtn, scale: 1.0, duration: 80 });
        });
        equipBtn.on('pointerdown', () => {
          equipBtn.setTexture('button_click');
          equipBtn.y = buyBtnY + 2; // Y translation downwards by 2px
          equipTxt.y = buyBtnY;
          this.scene.tweens.add({ targets: equipBtn, scale: 0.95, duration: 40 });
        });
        equipBtn.on('pointerup', () => {
          equipBtn.setTexture('button_hover');
          equipBtn.y = buyBtnY;
          equipTxt.y = buyBtnY - 2;
          this.scene.tweens.add({ targets: equipBtn, scale: 1.05, duration: 40 });
          AudioManager.playSfx('ui_confirm');
          ProgressionSystem.equipRope(rope.id);
          this.refresh();
        });
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
          const buyBtn = this.scene.add.nineslice(0, buyBtnY, 'button', 0, 110, 24, 18, 18, 12, 12);
          buyBtn.setTint(0xffd9a0);
          buyBtn.setInteractive({ useHandCursor: true });
          const buyTxt = this.scene.add.text(0, buyBtnY - 2, costText, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#8a5200'
          }).setOrigin(0.5);
          card.add([buyBtn, buyTxt]);

          buyBtn.on('pointerover', () => {
            buyBtn.setTexture('button_hover');
            this.scene.tweens.add({ targets: buyBtn, scale: 1.05, duration: 80 });
            AudioManager.playSfx('button_hover');
          });
          buyBtn.on('pointerout', () => {
            buyBtn.setTexture('button');
            buyBtn.y = buyBtnY;
            buyTxt.y = buyBtnY - 2;
            this.scene.tweens.add({ targets: buyBtn, scale: 1.0, duration: 80 });
          });
          buyBtn.on('pointerdown', () => {
            buyBtn.setTexture('button_click');
            buyBtn.y = buyBtnY + 2; // Y translation downwards by 2px
            buyTxt.y = buyBtnY;
            this.scene.tweens.add({ targets: buyBtn, scale: 0.95, duration: 40 });
          });
          buyBtn.on('pointerup', () => {
            buyBtn.setTexture('button_hover');
            buyBtn.y = buyBtnY;
            buyTxt.y = buyBtnY - 2;
            this.scene.tweens.add({ targets: buyBtn, scale: 1.05, duration: 40 });
            const res = ProgressionSystem.buyRope(rope.id);
            if (res.success) {
              this.refresh();
            } else {
              alert(res.error);
            }
          });
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

  private renderMountsList(): void {
    // Card 1: Trait Machine Roll
    const traitCard = this.createUpgradeCard(-120, 20, 'Trait Machine',
      `Cost: 500 Coins\nRoll a random trait for a pet.\n(20% chance to get "Rideable" trait!)`,
      500,
      () => {
        this.openPetSelector('trait');
      },
      false, // Never maxed
      '⚙️ Roll'
    );
    this.gridItems.push(traitCard);
    this.add(traitCard);

    // Card 2: Fly Potion
    const flyCard = this.createUpgradeCard(120, 20, 'Fly Potion (Wings)',
      `Cost: 3,000 Coins\nGrant wings to a pet, allowing you to fly over obstacles!`,
      3000,
      () => {
        this.openPetSelector('fly');
      },
      false, // Never maxed
      '🧪 Buy'
    );
    this.gridItems.push(flyCard);
    this.add(flyCard);
  }

  private openPetSelector(actionType: 'trait' | 'fly'): void {
    this.selectPetPanel.setVisible(true);
    this.refreshPetSelectorGrid(actionType);
  }

  private refreshPetSelectorGrid(actionType: 'trait' | 'fly'): void {
    this.selectPetGridItems.forEach(item => item.destroy());
    this.selectPetGridItems = [];

    const state = SaveSystem.getState();
    const owned = state.ownedCreatures;

    if (owned.length === 0) {
      const emptyText = this.scene.add.text(0, 0, 'No pets in sanctuary!', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '14px',
        color: '#8c765c'
      }).setOrigin(0.5);
      this.selectPetGridItems.push(emptyText);
      this.selectPetPanel.add(emptyText);
      return;
    }

    const cols = 4;
    const startX = -150;
    const startY = -90;
    const spacingX = 100;
    const spacingY = 90;

    owned.forEach((oc, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      if (idx >= 12) return;

      const item = this.scene.add.container(x, y);

      const card = this.scene.add.nineslice(0, 0, 'button', 0, 80, 75, 18, 18, 12, 12);
      card.setInteractive({ useHandCursor: true });
      item.add(card);

      card.on('pointerover', () => {
        item.setScale(1.05);
      });
      card.on('pointerout', () => {
        item.setScale(1.0);
      });

      const cData = DataLoader.getCreature(oc.creatureId);
      if (cData) {
        let spriteKey = 'creature_meadow';
        if (cData.area === 'whisper_forest') spriteKey = 'creature_forest';
        else if (cData.area === 'crystal_mountain') spriteKey = 'creature_mountain';
        else if (cData.area === 'golden_dunes') spriteKey = 'creature_dunes';
        else if (cData.area === 'sky_island') spriteKey = 'creature_sky';

        const sprite = this.scene.add.image(0, -12, spriteKey).setScale(1.6);
        item.add(sprite);

        const nameTxt = this.scene.add.text(0, 14, oc.nickname || cData.name, {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '8px',
          fontStyle: 'bold',
          color: '#5c4832',
          wordWrap: { width: 75 },
          align: 'center'
        }).setOrigin(0.5);
        item.add(nameTxt);

        let traitStr = '';
        if (oc.trait === 'Rideable') traitStr += '🏇Ride';
        if (oc.canFly) traitStr += (traitStr ? ' ' : '') + '🕊️Fly';
        if (!traitStr) traitStr = 'No Traits';

        const traitTxt = this.scene.add.text(0, 26, traitStr, {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '7px',
          fontStyle: 'bold',
          color: oc.trait === 'Rideable' || oc.canFly ? '#8fd14f' : '#8c765c'
        }).setOrigin(0.5);
        item.add(traitTxt);
      }

      card.on('pointerdown', () => {
        this.selectPetForAction(oc, actionType);
      });

      this.selectPetGridItems.push(item);
      this.selectPetPanel.add(item);
    });
  }

  private selectPetForAction(oc: OwnedCreature, actionType: 'trait' | 'fly'): void {
    const state = SaveSystem.getState();
    const cData = DataLoader.getCreature(oc.creatureId);
    if (!cData) return;

    if (actionType === 'trait') {
      const cost = 500;
      if (state.coins < cost) {
        alert('Not enough coins for Trait Machine Roll!');
        return;
      }
      state.coins -= cost;
      
      const roll = Math.random();
      const success = roll < 0.20;
      oc.trait = success ? 'Rideable' : 'None';

      AudioManager.playSfx(success ? 'level_up' : 'capture_fail');
      alert(
        success 
          ? `🎉 Success! ${oc.nickname || cData.name} obtained the RIDEABLE trait!` 
          : `Misfire! ${oc.nickname || cData.name} got No Traits.`
      );
    } else {
      const cost = 3000;
      if (state.coins < cost) {
        alert('Not enough coins for Fly Potion!');
        return;
      }
      state.coins -= cost;
      oc.canFly = true;

      AudioManager.playSfx('level_up');
      alert(`🎉 Success! ${oc.nickname || cData.name} drank the Fly Potion and grew wings!`);
    }

    SaveSystem.markDirty();
    SaveSystem.forceSave();
    EventBus.emit('coinsChanged', state.coins);
    EventBus.emit('sanctuaryUpdated');
    
    this.selectPetPanel.setVisible(false);
    this.refresh();
  }

  private createUpgradeCard(x: number, y: number, name: string, desc: string, cost: number, onBuy: () => void, isMaxed: boolean, btnText?: string): Phaser.GameObjects.Container {
    const card = this.scene.add.container(x, y);

    // Larger background card
    const bg = this.scene.add.nineslice(0, 0, 'button', 0, 220, 160, 18, 18, 12, 12);
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
      const buyBtn = this.scene.add.nineslice(0, btnY, 'button', 0, 170, 32, 18, 18, 12, 12);
      buyBtn.setTint(0xffd9a0);
      buyBtn.setInteractive({ useHandCursor: true });
      
      const displayLabel = btnText ? `${btnText} (${cost} Coins)` : `☘️ Upgrade (${cost} Coins)`;
      const buyText = this.scene.add.text(0, btnY - 2, displayLabel, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#8a5200'
      }).setOrigin(0.5);
      card.add([buyBtn, buyText]);

      buyBtn.on('pointerover', () => {
        buyBtn.setTexture('button_hover');
        this.scene.tweens.add({ targets: buyBtn, scale: 1.05, duration: 80 });
        card.setScale(1.02);
        AudioManager.playSfx('button_hover');
      });
      buyBtn.on('pointerout', () => {
        buyBtn.setTexture('button');
        buyBtn.y = btnY;
        buyText.y = btnY - 2;
        this.scene.tweens.add({ targets: buyBtn, scale: 1.0, duration: 80 });
        card.setScale(1.0);
      });
      buyBtn.on('pointerdown', () => {
        buyBtn.setTexture('button_click');
        buyBtn.y = btnY + 2; // Y translation downwards by 2px
        buyText.y = btnY;
        this.scene.tweens.add({ targets: buyBtn, scale: 0.95, duration: 40 });
      });
      buyBtn.on('pointerup', () => {
        buyBtn.setTexture('button_hover');
        buyBtn.y = btnY;
        buyText.y = btnY - 2;
        this.scene.tweens.add({ targets: buyBtn, scale: 1.05, duration: 40 });
        onBuy();
        this.refresh();
      });
    }

    return card;
  }
}
