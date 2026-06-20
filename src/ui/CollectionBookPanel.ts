// src/ui/CollectionBookPanel.ts
import Phaser from 'phaser';
import { AreaId, OwnedCreature } from '../data/types';
import { SaveSystem } from '../systems/SaveSystem';
import { DataLoader } from '../data/DataLoader';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { CreatureVisuals } from '../utils/CreatureVisuals';

export class CollectionBookPanel extends Phaser.GameObjects.Container {
  private panelBg!: Phaser.GameObjects.NineSlice;
  private gridItems: Phaser.GameObjects.Container[] = [];
  
  private tabs: Record<AreaId, Phaser.GameObjects.Container> = {} as any;
  private activeArea: AreaId = 'green_meadow';

  private progressText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;

  private onCreatureSelect: (oc: OwnedCreature) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onCreatureSelect: (oc: OwnedCreature) => void) {
    super(scene, x, y);
    this.onCreatureSelect = onCreatureSelect;

    const width = 840;
    const height = 620;

    // Background
    this.panelBg = scene.add.nineslice(0, 0, 'modal_window', 0, width, height, 32, 32, 32, 32);
    this.add(this.panelBg);

    // Title
    const title = scene.add.text(0, -height / 2 + 25, 'COLLECTION BOOK', {
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
    });
    this.add(closeBtn);

    // Progress Bar Background
    this.progressBar = scene.add.graphics();
    this.add(this.progressBar);

    this.progressText = scene.add.text(0, -height / 2 + 105, 'Meadow: 0/6 Captured (0%)', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#8c765c'
    }).setOrigin(0.5);
    this.add(this.progressText);

    // Create Tabs for the 5 areas
    this.createAreaTabs(width, height);

    this.setVisible(false);

    // Refresh when state changes
    EventBus.on('sanctuaryUpdated', () => {
      if (this.visible) {
        this.refresh();
      }
    });
  }

  public show(): void {
    this.refresh();
    this.setVisible(true);
  }

  private createAreaTabs(_panelWidth: number, panelHeight: number): void {
    const areas = DataLoader.getAreas();
    const tabCount = areas.length;
    const tabWidth = 110;
    const startX = -((tabCount - 1) * tabWidth) / 2;
    const yPos = -panelHeight / 2 + 65;

    areas.forEach((area, idx) => {
      const xPos = startX + idx * tabWidth;
      const tabContainer = this.scene.add.container(xPos, yPos);

      const tabBg = this.scene.add.nineslice(0, 0, 'button', 0, tabWidth - 4, 30, 18, 18, 12, 12);
      tabBg.setInteractive({ useHandCursor: true });

      const tabText = this.scene.add.text(0, -2, area.name.split(' ')[0], {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#5c4832'
      }).setOrigin(0.5);

      tabContainer.add([tabBg, tabText]);
      this.tabs[area.id] = tabContainer;
      this.add(tabContainer);

      tabBg.on('pointerover', () => {
        tabBg.setTexture('button_hover');
        this.scene.tweens.add({ targets: tabContainer, scale: 1.05, duration: 80 });
        AudioManager.playSfx('button_hover');
      });
      tabBg.on('pointerout', () => {
        tabBg.setTexture('button');
        tabBg.y = 0;
        tabText.y = -2;
        this.scene.tweens.add({ targets: tabContainer, scale: area.id === this.activeArea ? 1.05 : 1.0, duration: 80 });
      });
      tabBg.on('pointerdown', () => {
        tabBg.setTexture('button_click');
        tabBg.y = 2; // Y translation
        tabText.y = 0;
        this.scene.tweens.add({ targets: tabContainer, scale: 0.95, duration: 40 });
      });
      tabBg.on('pointerup', () => {
        tabBg.setTexture('button_hover');
        tabBg.y = 0;
        tabText.y = -2;
        this.scene.tweens.add({ targets: tabContainer, scale: 1.05, duration: 40 });
        if (this.activeArea !== area.id) {
          AudioManager.playSfx('ui_tap');
          this.activeArea = area.id;
          this.refresh();
        }
      });
    });
  }

  public refresh(): void {
    // 1. Highlight active tab
    const areas = DataLoader.getAreas();
    areas.forEach(area => {
      const tab = this.tabs[area.id];
      if (tab) {
        const bg = tab.list[0] as Phaser.GameObjects.NineSlice;
        const txt = tab.list[1] as Phaser.GameObjects.Text;
        if (area.id === this.activeArea) {
          bg.setTint(0xffe9a8); // Highlighted tint
          txt.setColor('#8a5200');
          tab.setScale(1.05);
        } else {
          bg.clearTint();
          txt.setColor('#5c4832');
          tab.setScale(1.0);
        }
      }
    });

    // 2. Clear grid items
    this.gridItems.forEach(item => item.destroy());
    this.gridItems = [];

    const state = SaveSystem.getState();
    const area = DataLoader.getArea(this.activeArea);
    if (!area) return;

    const creatures = DataLoader.getCreaturesByArea(this.activeArea);
    const owned = state.ownedCreatures;
    
    // Count captured in this area
    const uniqueCaptured = new Set(owned.map(o => o.creatureId));
    const capturedInArea = creatures.filter(c => uniqueCaptured.has(c.id)).length;
    const pct = Math.floor((capturedInArea / creatures.length) * 100);

    this.progressText.setText(`${area.name} Completion: ${capturedInArea}/${creatures.length} (${pct}%)`);

    // Draw area progress bar
    this.progressBar.clear();
    this.progressBar.fillStyle(0xd5c4b4, 1);
    this.progressBar.fillRoundedRect(-150, -480 / 2 + 122, 300, 10, 5);
    if (pct > 0) {
      // Color matches area order or green meadow
      this.progressBar.fillStyle(0x8fd14f, 1);
      this.progressBar.fillRoundedRect(-150, -480 / 2 + 122, 300 * (pct / 100), 10, 5);
    }

    // 3. Render Grid of creatures for this area
    const cols = 4;
    const startX = -210;
    const startY = -60;
    const spacingX = 140;
    const spacingY = 120;

    creatures.forEach((creature, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const itemContainer = this.scene.add.container(x, y);

      const isCaptured = uniqueCaptured.has(creature.id);
      const isDiscovered = state.discoveredCreatureIds.includes(creature.id) || isCaptured;

      // Card Background
      const cardBg = this.scene.add.nineslice(0, 0, 'button', 0, 120, 105, 18, 18, 12, 12);
      itemContainer.add(cardBg);

      // Sprite and tint/scale based on subspecies/rarity
      const visuals = CreatureVisuals.getVisuals(creature);
      const sprite = this.scene.add.image(0, -10, visuals.spriteKey);
      sprite.setOrigin(0.5, 0.5);

      // Strict aspect ratio fit sizing inside 48x48 frame
      const targetSize = 48;
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

      // Name Text
      const nameText = this.scene.add.text(0, 34, '???', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#8c765c',
        stroke: '#fff7e6',
        strokeThickness: 1.5
      }).setOrigin(0.5);
      itemContainer.add(nameText);

      // Rarity outline
      let rarityColor = 0xb5b5b5; // Common
      if (creature.rarity === 'Rare') rarityColor = 0x4fa3e3;
      else if (creature.rarity === 'Epic') rarityColor = 0xb05fe0;
      else if (creature.rarity === 'Legendary') rarityColor = 0xffc93c;
      else if (creature.rarity === 'Mythic') rarityColor = 0xff5c8a;

      if (isCaptured) {
        // STATE 3: CAPTURED
        sprite.clearTint();
        sprite.setTint(visuals.tint); // Apply subspecies color tint
        nameText.setText(creature.name).setColor('#5c4832');

        const border = this.scene.add.graphics();
        border.lineStyle(3, rarityColor, 0.85);
        border.strokeRoundedRect(-57, -50, 114, 99, 6);
        itemContainer.add(border);

        // Click to open detail
        cardBg.setInteractive({ useHandCursor: true });
        cardBg.on('pointerdown', () => {
          AudioManager.playSfx('ui_tap');
          // Find first owned instance
          const firstOwned = owned.find(o => o.creatureId === creature.id);
          if (firstOwned) {
            this.onCreatureSelect(firstOwned);
          } else {
            // Mock an owned creature structure just for viewing detail
            this.onCreatureSelect({
              instanceId: 'temp',
              creatureId: creature.id,
              capturedAt: Date.now(),
              level: 1
            });
          }
        });
        
        cardBg.on('pointerover', () => itemContainer.setScale(1.05));
        cardBg.on('pointerout', () => itemContainer.setScale(1.0));

      } else if (isDiscovered) {
        // STATE 2: SEEN BUT NOT CAPTURED
        sprite.setTint(0x333333); // Silhouette
        nameText.setText(creature.name).setColor('#8c765c');

        const border = this.scene.add.graphics();
        border.lineStyle(2, 0xd5c4b4, 0.5);
        border.strokeRoundedRect(-57, -50, 114, 99, 6);
        itemContainer.add(border);

        // Seen Badge
        const seenText = this.scene.add.text(0, -38, 'SEEN', {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#8c765c',
          padding: { x: 4, y: 1 }
        }).setOrigin(0.5);
        itemContainer.add(seenText);
      } else {
        // STATE 1: UNDISCOVERED
        sprite.setTint(0x000000); // Black silhouette
        nameText.setText('???').setColor('#a89b8d');

        const border = this.scene.add.graphics();
        border.lineStyle(1, 0xd5c4b4, 0.3);
        border.strokeRoundedRect(-57, -50, 114, 99, 6);
        itemContainer.add(border);
      }

      itemContainer.add(sprite);
      // Bring sprite to front of background card but behind border/text
      itemContainer.sendToBack(sprite);
      itemContainer.sendToBack(cardBg);

      this.gridItems.push(itemContainer);
      this.add(itemContainer);
    });
  }
}
