// src/ui/InventoryPanel.ts
import Phaser from 'phaser';
import { OwnedCreature } from '../data/types';
import { SaveSystem } from '../systems/SaveSystem';
import { DataLoader } from '../data/DataLoader';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { CreatureVisuals } from '../utils/CreatureVisuals';

export class InventoryPanel extends Phaser.GameObjects.Container {
  private panelBg!: Phaser.GameObjects.NineSlice;
  private gridItems: any[] = [];
  private pageText!: Phaser.GameObjects.Text;
  private prevBtn!: Phaser.GameObjects.Text;
  private nextBtn!: Phaser.GameObjects.Text;

  private currentPage = 0;
  private itemsPerPage = 12; // 3 rows of 4 (4x3 grid)
  private onCreatureSelect: (oc: OwnedCreature) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onCreatureSelect: (oc: OwnedCreature) => void) {
    super(scene, x, y);
    this.onCreatureSelect = onCreatureSelect;

    const width = 780;
    const height = 560;

    // Background
    this.panelBg = scene.add.nineslice(0, 0, 'modal_window', 0, width, height, 32, 32, 32, 32);
    this.add(this.panelBg);

    // Title
    const title = scene.add.text(0, -height / 2 + 35, 'MY CREATURES', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '24px',
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
    });
    this.add(closeBtn);

    // Page Text
    this.pageText = scene.add.text(0, height / 2 - 35, 'Page 1 of 1', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'normal',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.add(this.pageText);

    // Prev Button
    const prevContainer = scene.add.container(-100, height / 2 - 35);
    const prevBg = scene.add.image(0, 0, 'button_small').setScale(0.85).setInteractive({ useHandCursor: true });
    const prevTxt = scene.add.text(0, -2, '◀', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    prevContainer.add([prevBg, prevTxt]);
    this.prevBtn = prevTxt;
    this.add(prevContainer);

    prevBg.on('pointerover', () => {
      if (this.currentPage > 0) {
        prevBg.setTexture('button_small_hover');
        scene.tweens.add({ targets: prevContainer, scale: 1.05, duration: 80 });
        AudioManager.playSfx('button_hover');
      }
    });
    prevBg.on('pointerout', () => {
      prevBg.setTexture('button_small');
      prevBg.y = 0;
      prevTxt.y = -2;
      scene.tweens.add({ targets: prevContainer, scale: 1.0, duration: 80 });
    });
    prevBg.on('pointerdown', () => {
      if (this.currentPage > 0) {
        prevBg.setTexture('button_small_click');
        prevBg.y = 2; // Y translation downwards by 2px
        prevTxt.y = 0;
        scene.tweens.add({ targets: prevContainer, scale: 0.95, duration: 40 });
      }
    });
    prevBg.on('pointerup', () => {
      if (this.currentPage > 0) {
        prevBg.setTexture('button_small_hover');
        prevBg.y = 0;
        prevTxt.y = -2;
        scene.tweens.add({ targets: prevContainer, scale: 1.05, duration: 40 });
        this.changePage(-1);
      }
    });

    // Next Button
    const nextContainer = scene.add.container(100, height / 2 - 35);
    const nextBg = scene.add.image(0, 0, 'button_small').setScale(0.85).setInteractive({ useHandCursor: true });
    const nextTxt = scene.add.text(0, -2, '▶', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    nextContainer.add([nextBg, nextTxt]);
    this.nextBtn = nextTxt;
    this.add(nextContainer);

    nextBg.on('pointerover', () => {
      const state = SaveSystem.getState();
      const totalPages = Math.max(1, Math.ceil(state.ownedCreatures.length / this.itemsPerPage));
      if (this.currentPage < totalPages - 1) {
        nextBg.setTexture('button_small_hover');
        scene.tweens.add({ targets: nextContainer, scale: 1.05, duration: 80 });
        AudioManager.playSfx('button_hover');
      }
    });
    nextBg.on('pointerout', () => {
      nextBg.setTexture('button_small');
      nextBg.y = 0;
      nextTxt.y = -2;
      scene.tweens.add({ targets: nextContainer, scale: 1.0, duration: 80 });
    });
    nextBg.on('pointerdown', () => {
      const state = SaveSystem.getState();
      const totalPages = Math.max(1, Math.ceil(state.ownedCreatures.length / this.itemsPerPage));
      if (this.currentPage < totalPages - 1) {
        nextBg.setTexture('button_small_click');
        nextBg.y = 2; // Y translation downwards by 2px
        nextTxt.y = 0;
        scene.tweens.add({ targets: nextContainer, scale: 0.95, duration: 40 });
      }
    });
    nextBg.on('pointerup', () => {
      const state = SaveSystem.getState();
      const totalPages = Math.max(1, Math.ceil(state.ownedCreatures.length / this.itemsPerPage));
      if (this.currentPage < totalPages - 1) {
        nextBg.setTexture('button_small_hover');
        nextBg.y = 0;
        nextTxt.y = -2;
        scene.tweens.add({ targets: nextContainer, scale: 1.05, duration: 40 });
        this.changePage(1);
      }
    });

    this.setVisible(false);

    // Refresh when sanctuary changes or is saved
    EventBus.on('sanctuaryUpdated', () => {
      if (this.visible) {
        this.refresh();
      }
    });
  }

  public show(): void {
    this.currentPage = 0;
    this.refresh();
    this.setVisible(true);
  }

  public changePage(dir: number): void {
    const state = SaveSystem.getState();
    const totalPages = Math.max(1, Math.ceil(state.ownedCreatures.length / this.itemsPerPage));
    const target = this.currentPage + dir;

    if (target >= 0 && target < totalPages) {
      AudioManager.playSfx('ui_tap');
      this.currentPage = target;
      this.refresh();
    }
  }

  public refresh(): void {
    // Clear old items
    this.gridItems.forEach(item => item.destroy());
    this.gridItems = [];

    const state = SaveSystem.getState();
    const creatures = state.ownedCreatures;
    const totalPages = Math.max(1, Math.ceil(creatures.length / this.itemsPerPage));

    if (this.currentPage >= totalPages) {
      this.currentPage = totalPages - 1;
    }

    this.pageText.setText(`Page ${this.currentPage + 1} of ${totalPages}`);
    
    // Toggle prev/next button alphas
    const prevBg = this.prevBtn.parentContainer?.list[0] as Phaser.GameObjects.Image;
    if (prevBg) {
      if (this.currentPage === 0) {
        prevBg.disableInteractive();
        this.prevBtn.parentContainer.setAlpha(0.3);
      } else {
        prevBg.setInteractive({ useHandCursor: true });
        this.prevBtn.parentContainer.setAlpha(1.0);
      }
    }

    const nextBg = this.nextBtn.parentContainer?.list[0] as Phaser.GameObjects.Image;
    if (nextBg) {
      if (this.currentPage === totalPages - 1) {
        nextBg.disableInteractive();
        this.nextBtn.parentContainer.setAlpha(0.3);
      } else {
        nextBg.setInteractive({ useHandCursor: true });
        this.nextBtn.parentContainer.setAlpha(1.0);
      }
    }

    if (creatures.length === 0) {
      const emptyText = this.scene.add.text(0, 0, 'No creatures captured yet!\nUnlock areas and explore to find them.', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
        color: '#8c765c',
        align: 'center'
      }).setOrigin(0.5);
      this.gridItems.push(emptyText);
      this.add(emptyText);
      return;
    }

    // Render Grid (4 columns, 3 rows = 12 slots)
    const cols = 4;
    
    const startX = -165;
    const startY = -80;
    const spacingX = 110;
    const spacingY = 85;

    const startIdx = this.currentPage * this.itemsPerPage;
    const endIdx = Math.min(creatures.length, startIdx + this.itemsPerPage);

    for (let i = startIdx; i < endIdx; i++) {
      const oc = creatures[i];
      const creature = DataLoader.getCreature(oc.creatureId);
      if (!creature) continue;

      const gridIdx = i - startIdx;
      const col = gridIdx % cols;
      const row = Math.floor(gridIdx / cols);

      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const itemContainer = this.scene.add.container(x, y);

      // Card Background (Downscaled to 100x75)
      const cardBg = this.scene.add.nineslice(0, 0, 'button', 0, 100, 75, 18, 18, 12, 12);
      cardBg.setInteractive({ useHandCursor: true });
      itemContainer.add(cardBg);

      // Rarity Color Code Border indicator
      let rarityColor = 0xb5b5b5; // Common
      if (creature.rarity === 'Rare') rarityColor = 0x4fa3e3;
      else if (creature.rarity === 'Epic') rarityColor = 0xb05fe0;
      else if (creature.rarity === 'Legendary') rarityColor = 0xffc93c;
      else if (creature.rarity === 'Mythic') rarityColor = 0xff5c8a;

      const borderGlow = this.scene.add.graphics();
      borderGlow.lineStyle(3, rarityColor, 0.85);
      borderGlow.strokeRoundedRect(-48, -35, 96, 70, 6);
      itemContainer.add(borderGlow);

      // Sprite based on species variation utility
      const visuals = CreatureVisuals.getVisuals(creature);
      const sprite = this.scene.add.image(0, -8, visuals.spriteKey);
      sprite.setOrigin(0.5, 0.5);

      // Strict aspect ratio fit sizing inside 44x44 frame
      const targetSize = 44;
      const w = sprite.width;
      const h = sprite.height;
      if (w > 0 && h > 0) {
        const ratio = w / h;
        if (ratio > 1) {
          sprite.setDisplaySize(targetSize, targetSize / ratio);
        } else {
          sprite.setDisplaySize(targetSize * ratio, targetSize);
        }
      } else {
        sprite.setDisplaySize(targetSize, targetSize);
      }

      sprite.setTint(visuals.tint); // Apply subspecies color tint
      itemContainer.add(sprite);

      // Level Badge
      const lvlText = this.scene.add.text(-40, -31, `L. ${oc.level}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#5c4832',
        padding: { x: 3, y: 1 }
      });
      itemContainer.add(lvlText);

      // Display name
      const dispName = oc.nickname || creature.name;
      const nameText = this.scene.add.text(0, 24, dispName, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#5c4832',
        stroke: '#fff7e6',
        strokeThickness: 1.5,
        wordWrap: { width: 90 },
        align: 'center'
      }).setOrigin(0.5);
      itemContainer.add(nameText);

      // Trigger detail view
      cardBg.on('pointerdown', () => {
        AudioManager.playSfx('ui_tap');
        this.onCreatureSelect(oc);
      });

      cardBg.on('pointerover', () => {
        itemContainer.setScale(1.05);
      });
      cardBg.on('pointerout', () => {
        itemContainer.setScale(1.0);
      });

      this.gridItems.push(itemContainer);
      this.add(itemContainer);
    }
  }
}
