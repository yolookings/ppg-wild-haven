// src/ui/InventoryPanel.ts
import Phaser from 'phaser';
import { OwnedCreature } from '../data/types';
import { SaveSystem } from '../systems/SaveSystem';
import { DataLoader } from '../data/DataLoader';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';

export class InventoryPanel extends Phaser.GameObjects.Container {
  private panelBg!: Phaser.GameObjects.NineSlice;
  private gridItems: any[] = [];
  private pageText!: Phaser.GameObjects.Text;
  private prevBtn!: Phaser.GameObjects.Text;
  private nextBtn!: Phaser.GameObjects.Text;

  private currentPage = 0;
  private itemsPerPage = 8; // 2 rows of 4
  private onCreatureSelect: (oc: OwnedCreature) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onCreatureSelect: (oc: OwnedCreature) => void) {
    super(scene, x, y);
    this.onCreatureSelect = onCreatureSelect;

    const width = 580;
    const height = 400;

    // Background
    this.panelBg = scene.add.nineslice(0, 0, 'panel_frame', 0, width, height, 16, 16, 16, 16);
    this.add(this.panelBg);

    // Title
    const title = scene.add.text(0, -height / 2 + 35, 'MY CREATURES', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.add(title);

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

    // Page Text
    this.pageText = scene.add.text(0, height / 2 - 35, 'Page 1 of 1', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'normal',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.add(this.pageText);

    // Prev Button
    this.prevBtn = scene.add.text(-80, height / 2 - 35, '◀ Prev', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.prevBtn.on('pointerdown', () => this.changePage(-1));
    this.add(this.prevBtn);

    // Next Button
    this.nextBtn = scene.add.text(80, height / 2 - 35, 'Next ▶', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.nextBtn.on('pointerdown', () => this.changePage(1));
    this.add(this.nextBtn);

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
    this.prevBtn.setAlpha(this.currentPage === 0 ? 0.3 : 1);
    this.prevBtn.setInteractive(this.currentPage > 0);
    
    this.nextBtn.setAlpha(this.currentPage === totalPages - 1 ? 0.3 : 1);
    this.nextBtn.setInteractive(this.currentPage < totalPages - 1);

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

    // Render Grid
    const cols = 4;
    
    const startX = -195;
    const startY = -85;
    const spacingX = 130;
    const spacingY = 115;

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

      // Card Background
      const cardBg = this.scene.add.nineslice(0, 0, 'button', 0, 110, 100, 8, 8, 8, 8);
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
      borderGlow.strokeRoundedRect(-52, -47, 104, 94, 6);
      itemContainer.add(borderGlow);

      // Sprite based on area fallback
      let spriteKey = 'creature_meadow';
      if (creature.area === 'whisper_forest') spriteKey = 'creature_forest';
      else if (creature.area === 'crystal_mountain') spriteKey = 'creature_mountain';
      else if (creature.area === 'golden_dunes') spriteKey = 'creature_dunes';
      else if (creature.area === 'sky_island') spriteKey = 'creature_sky';

      const sprite = this.scene.add.image(0, -10, spriteKey);
      sprite.setScale(1.5);
      itemContainer.add(sprite);

      // Level Badge
      const lvlText = this.scene.add.text(-44, -38, `Lvl ${oc.level}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#5c4832',
        padding: { x: 4, y: 2 }
      });
      itemContainer.add(lvlText);

      // Display name
      const dispName = oc.nickname || creature.name;
      const nameText = this.scene.add.text(0, 32, dispName, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#5c4832',
        stroke: '#fff7e6',
        strokeThickness: 1.5,
        wordWrap: { width: 100 },
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
