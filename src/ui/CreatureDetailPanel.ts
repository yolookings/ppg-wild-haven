// src/ui/CreatureDetailPanel.ts
import Phaser from 'phaser';
import { OwnedCreature, Creature } from '../data/types';
import { DataLoader } from '../data/DataLoader';
import { EconomySystem } from '../systems/EconomySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';

export class CreatureDetailPanel extends Phaser.GameObjects.Container {
  private panelBg!: Phaser.GameObjects.NineSlice;
  private creatureSprite!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private rarityBadge!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  
  private feedBtnContainer!: Phaser.GameObjects.Container;
  private feedBtnText!: Phaser.GameObjects.Text;
  private renameBtnText!: Phaser.GameObjects.Text;

  private currentOwned: OwnedCreature | null = null;
  private currentCreature: Creature | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const width = 460;
    const height = 450;

    // Background
    this.panelBg = scene.add.nineslice(0, 0, 'panel_frame', 0, width, height, 16, 16, 16, 16);
    this.add(this.panelBg);

    // Close Button
    const closeBtn = scene.add.text(width / 2 - 30, -height / 2 + 30, '❌', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '18px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.setVisible(false);
    });
    this.add(closeBtn);

    // 1. Large Sprite Display
    this.creatureSprite = scene.add.image(0, -110, 'creature_meadow');
    this.creatureSprite.setScale(1.6); // Smaller detail preview
    this.add(this.creatureSprite);

    // 2. Creature Name / Nickname
    this.nameText = scene.add.text(0, -20, 'Meadow Rabbit', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#5c4832',
      stroke: '#fff7e6',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.add(this.nameText);

    // Rename text / button
    this.renameBtnText = scene.add.text(0, 5, '✏️ Rename', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '12px',
      fontStyle: 'normal',
      color: '#8c765c'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.renameBtnText.on('pointerdown', () => this.promptRename());
    this.add(this.renameBtnText);

    // Rarity Badge
    this.rarityBadge = scene.add.text(0, 30, 'Common', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#b5b5b5',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);
    this.add(this.rarityBadge);

    // 3. Lore Description
    this.descText = scene.add.text(0, 85, 'A fluffy rabbit that loves clover...', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      color: '#7a644e',
      align: 'center',
      wordWrap: { width: 380, useAdvancedWrap: true }
    }).setOrigin(0.5);
    this.add(this.descText);

    // 4. Stats: Coin Generation and Level
    this.statsText = scene.add.text(0, 145, 'Level 1 • Passive Income: 1 coin / 10s', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#5c4832',
      stroke: '#fff7e6',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.add(this.statsText);

    // 5. Feed / Train Level Up Button
    this.feedBtnContainer = scene.add.container(0, 195);
    
    const feedBg = scene.add.nineslice(0, 0, 'button', 0, 240, 42, 8, 8, 8, 8);
    feedBg.setInteractive({ useHandCursor: true });
    feedBg.on('pointerdown', () => this.feedCreature());

    feedBg.on('pointerover', () => this.feedBtnContainer.setScale(1.03));
    feedBg.on('pointerout', () => this.feedBtnContainer.setScale(1.0));

    this.feedBtnText = scene.add.text(0, 0, '☘️ Feed (100 Coins)', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    this.feedBtnContainer.add([feedBg, this.feedBtnText]);
    this.add(this.feedBtnContainer);

    this.setVisible(false);

    // Repopulate details when state changes
    EventBus.on('coinsChanged', () => {
      if (this.visible && this.currentOwned) {
        this.updateDetails();
      }
    });
  }

  public show(owned: OwnedCreature): void {
    this.currentOwned = owned;
    this.currentCreature = DataLoader.getCreature(owned.creatureId) || null;

    if (!this.currentCreature) return;

    // Set sprite based on area fallback
    let spriteKey = 'creature_meadow';
    if (this.currentCreature.area === 'whisper_forest') spriteKey = 'creature_forest';
    else if (this.currentCreature.area === 'crystal_mountain') spriteKey = 'creature_mountain';
    else if (this.currentCreature.area === 'golden_dunes') spriteKey = 'creature_dunes';
    else if (this.currentCreature.area === 'sky_island') spriteKey = 'creature_sky';
    this.creatureSprite.setTexture(spriteKey);

    this.updateDetails();
    this.setVisible(true);
  }

  private updateDetails(): void {
    if (!this.currentOwned || !this.currentCreature) return;

    const owned = this.currentOwned;
    const c = this.currentCreature;

    // Display Nickname if present, otherwise base name
    const dispName = owned.nickname ? `"${owned.nickname}" (${c.name})` : c.name;
    this.nameText.setText(dispName);

    // Rarity Color
    let rarityColor = '#b5b5b5'; // Common
    if (c.rarity === 'Rare') rarityColor = '#4fa3e3';
    else if (c.rarity === 'Epic') rarityColor = '#b05fe0';
    else if (c.rarity === 'Legendary') rarityColor = '#ffc93c';
    else if (c.rarity === 'Mythic') rarityColor = '#ff5c8a';

    this.rarityBadge.setText(c.rarity);
    // Draw background color manually using canvas style
    this.rarityBadge.setBackgroundColor(rarityColor);

    this.descText.setText(c.description);

    // Income calculations
    const curRate = EconomySystem.getCreatureCoinRate(c, owned.level);
    const rateText = `${curRate.toFixed(1)} coins / 10s`;
    
    // Check if placed in slot
    const isPlaced = (owned as any).placedSlot !== undefined && (owned as any).placedSlot !== null;
    const placementText = isPlaced ? `Slot ${(owned as any).placedSlot + 1}` : 'Sanctuary Enclosure';

    this.statsText.setText(`Level ${owned.level} • ${rateText}\nLocation: ${placementText}`);

    // Level up feed button
    const levelUpCost = EconomySystem.getCreatureLevelUpCost(c, owned.level);
    const state = SaveSystem.getState();

    if (levelUpCost === -1) {
      this.feedBtnText.setText('MAX LEVEL (10)');
      this.feedBtnContainer.setAlpha(0.6);
    } else {
      this.feedBtnText.setText(`☘️ Feed & Train (${levelUpCost} Coins)`);
      this.feedBtnContainer.setAlpha(state.coins >= levelUpCost ? 1 : 0.6);
    }
  }

  private feedCreature(): void {
    if (!this.currentOwned || !this.currentCreature) return;

    const success = EconomySystem.levelUpCreature(this.currentOwned.instanceId);
    if (success) {
      AudioManager.playSfx('ui_confirm');
      this.updateDetails();
      // Animate the creature jumping happily!
      this.scene.tweens.add({
        targets: this.creatureSprite,
        y: -140,
        scaleY: 5.5,
        scaleX: 3.5,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    } else {
      AudioManager.playSfx('capture_fail');
    }
  }

  private promptRename(): void {
    if (!this.currentOwned) return;

    const newNick = prompt('Enter a new nickname for this creature:', this.currentOwned.nickname || '');
    if (newNick !== null) {
      this.currentOwned.nickname = newNick.trim().substring(0, 16) || undefined;
      SaveSystem.markDirty();
      SaveSystem.forceSave();
      this.updateDetails();
      EventBus.emit('sanctuaryUpdated');
    }
  }
}
