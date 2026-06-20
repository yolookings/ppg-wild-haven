// src/ui/CreatureDetailPanel.ts
import Phaser from 'phaser';
import { OwnedCreature, Creature } from '../data/types';
import { DataLoader } from '../data/DataLoader';
import { EconomySystem } from '../systems/EconomySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { CreatureVisuals } from '../utils/CreatureVisuals';

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

  private mountBtnContainer!: Phaser.GameObjects.Container;
  private mountBtnText!: Phaser.GameObjects.Text;


  private currentOwned: OwnedCreature | null = null;
  private currentCreature: Creature | null = null;
  private baseScale = 1.6;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const width = 660;
    const height = 600;

    // Background
    this.panelBg = scene.add.nineslice(0, 0, 'modal_window', 0, width, height, 32, 32, 32, 32);
    this.add(this.panelBg);

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
    this.add(this.renameBtnText);

    this.renameBtnText.on('pointerover', () => {
      scene.tweens.add({ targets: this.renameBtnText, scale: 1.05, duration: 80 });
      AudioManager.playSfx('button_hover');
    });
    this.renameBtnText.on('pointerout', () => {
      this.renameBtnText.y = 5;
      scene.tweens.add({ targets: this.renameBtnText, scale: 1.0, duration: 80 });
    });
    this.renameBtnText.on('pointerdown', () => {
      this.renameBtnText.y = 7;
      scene.tweens.add({ targets: this.renameBtnText, scale: 0.95, duration: 40 });
    });
    this.renameBtnText.on('pointerup', () => {
      this.renameBtnText.y = 5;
      scene.tweens.add({ targets: this.renameBtnText, scale: 1.05, duration: 40 });
      AudioManager.playSfx('ui_tap');
      this.promptRename();
    });

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
    this.statsText = scene.add.text(0, 130, 'Level 1 • Passive Income: 1 coin / 10s', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832',
      stroke: '#fff7e6',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);
    this.add(this.statsText);

    // 5. Feed / Train Level Up Button
    this.feedBtnContainer = scene.add.container(0, 175);
    
    const feedBg = scene.add.nineslice(0, 0, 'button', 0, 240, 36, 18, 18, 12, 12);
    feedBg.setInteractive({ useHandCursor: true });

    this.feedBtnText = scene.add.text(0, -2, '☘️ Feed (100 Coins)', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    this.feedBtnContainer.add([feedBg, this.feedBtnText]);
    this.add(this.feedBtnContainer);

    feedBg.on('pointerover', () => {
      feedBg.setTexture('button_hover');
      scene.tweens.add({ targets: this.feedBtnContainer, scale: 1.05, duration: 80 });
      AudioManager.playSfx('button_hover');
    });
    feedBg.on('pointerout', () => {
      feedBg.setTexture('button');
      feedBg.y = 0;
      this.feedBtnText.y = -2;
      scene.tweens.add({ targets: this.feedBtnContainer, scale: 1.0, duration: 80 });
    });
    feedBg.on('pointerdown', () => {
      feedBg.setTexture('button_click');
      feedBg.y = 2; // Y translation
      this.feedBtnText.y = 0;
      scene.tweens.add({ targets: this.feedBtnContainer, scale: 0.95, duration: 40 });
    });
    feedBg.on('pointerup', () => {
      feedBg.setTexture('button_hover');
      feedBg.y = 0;
      this.feedBtnText.y = -2;
      scene.tweens.add({ targets: this.feedBtnContainer, scale: 1.05, duration: 40 });
      this.feedCreature();
    });

    // 6. Mount / Dismount Button
    this.mountBtnContainer = scene.add.container(0, 215);
    
    const mountBg = scene.add.nineslice(0, 0, 'button', 0, 240, 36, 18, 18, 12, 12);
    mountBg.setInteractive({ useHandCursor: true });

    this.mountBtnText = scene.add.text(0, -2, '🏇 Mount Pet', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    this.mountBtnContainer.add([mountBg, this.mountBtnText]);
    this.add(this.mountBtnContainer);
    this.mountBtnContainer.setVisible(false);

    mountBg.on('pointerover', () => {
      mountBg.setTexture('button_hover');
      scene.tweens.add({ targets: this.mountBtnContainer, scale: 1.05, duration: 80 });
      AudioManager.playSfx('button_hover');
    });
    mountBg.on('pointerout', () => {
      mountBg.setTexture('button');
      mountBg.y = 0;
      this.mountBtnText.y = -2;
      scene.tweens.add({ targets: this.mountBtnContainer, scale: 1.0, duration: 80 });
    });
    mountBg.on('pointerdown', () => {
      mountBg.setTexture('button_click');
      mountBg.y = 2; // Y translation
      this.mountBtnText.y = 0;
      scene.tweens.add({ targets: this.mountBtnContainer, scale: 0.95, duration: 40 });
    });
    mountBg.on('pointerup', () => {
      mountBg.setTexture('button_hover');
      mountBg.y = 0;
      this.mountBtnText.y = -2;
      scene.tweens.add({ targets: this.mountBtnContainer, scale: 1.05, duration: 40 });
      this.toggleMountState();
    });

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

    // Query dynamic visuals for correct sprite texture, tint, and scale factor
    const visuals = CreatureVisuals.getVisuals(this.currentCreature);
    this.creatureSprite.setTexture(visuals.spriteKey);
    this.creatureSprite.clearTint();
    this.creatureSprite.setTint(visuals.tint);
    
    this.baseScale = 1.6 * visuals.scaleMult * (1 + (owned.level - 1) * 0.05);
    this.creatureSprite.setScale(this.baseScale);

    this.updateDetails();
    this.setVisible(true);
  }

  private updateDetails(): void {
    if (!this.currentOwned || !this.currentCreature) return;

    const owned = this.currentOwned;
    const c = this.currentCreature;
    
    // Update visual scale based on level
    const visuals = CreatureVisuals.getVisuals(c);
    this.baseScale = 1.6 * visuals.scaleMult * (1 + (owned.level - 1) * 0.05);
    this.creatureSprite.setScale(this.baseScale);

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

    let traitsStr = '';
    if (owned.trait === 'Rideable') traitsStr += '🏇 Rideable';
    if (owned.canFly) traitsStr += (traitsStr ? ' • ' : '') + '🕊️ Flying (Wings)';
    if (!traitsStr) traitsStr = 'None';

    this.statsText.setText(`Level ${owned.level} • ${rateText}\nLocation: ${placementText}\nTraits: ${traitsStr}`);

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

    // Mount Button
    const canMount = owned.trait === 'Rideable' || owned.canFly;
    if (canMount) {
      this.mountBtnContainer.setVisible(true);
      if (state.activeMountInstanceId === owned.instanceId) {
        this.mountBtnText.setText('❌ Dismount Pet');
      } else {
        const actionLabel = owned.canFly ? '🕊️ Fly Pet' : '🏇 Ride Pet';
        this.mountBtnText.setText(actionLabel);
      }
    } else {
      this.mountBtnContainer.setVisible(false);
    }
  }

  private toggleMountState(): void {
    if (!this.currentOwned) return;
    const state = SaveSystem.getState();
    const owned = this.currentOwned;

    if (state.activeMountInstanceId === owned.instanceId) {
      state.activeMountInstanceId = undefined;
      AudioManager.playSfx('ui_confirm');
      alert('Dismounted creature!');
    } else {
      state.activeMountInstanceId = owned.instanceId;
      AudioManager.playSfx('ui_confirm');
      alert(`Mounted: ${owned.nickname || this.currentCreature?.name || 'Creature'}!`);
    }

    SaveSystem.markDirty();
    SaveSystem.forceSave();
    this.updateDetails();
    
    EventBus.emit('mountStateChanged');
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
        scaleY: this.baseScale * 1.35,
        scaleX: this.baseScale * 0.7,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.creatureSprite.y = -110;
          this.creatureSprite.setScale(this.baseScale);
          EventBus.emit('creatureLeveledUp', { instanceId: this.currentOwned!.instanceId });
        }
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
