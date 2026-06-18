// src/scenes/SanctuaryScene.ts
import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { SanctuaryCreature } from '../entities/SanctuaryCreature';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { OwnedCreature } from '../data/types';

export class SanctuaryScene extends Phaser.Scene {
  private creaturesGroup!: Phaser.GameObjects.Group;
  private slotGraphics: Phaser.GameObjects.Graphics[] = [];
  private slotClickZones: Phaser.GameObjects.Zone[] = [];
  
  // Coordinate locations on the grass lawn for up to 20 slots
  private slotPositions: { x: number; y: number }[] = [];

  constructor() {
    super('SanctuaryScene');
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Start UIScene overlay if not active
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    // Update Area Name in HUD
    this.time.delayedCall(100, () => {
      const uiScene = this.scene.get('UIScene') as any;
      if (uiScene && uiScene.setAreaText) {
        uiScene.setAreaText('🏰 Sanctuary');
      }
    });

    // Fade in camera
    this.cameras.main.fadeIn(500, 26, 35, 30);

    // Play Sanctuary Music
    AudioManager.playMusic('music_sanctuary');

    // 1. Draw Sanctuary Environment (Grass lawn, trees, path, fence)
    this.drawBackground(width, height);

    // Initialize slots positions array based on current dimensions
    this.initSlotPositions(width, height);

    this.creaturesGroup = this.add.group();

    // 2. Render Slots and placed creatures
    this.refreshSanctuary();

    // Listeners for updates
    EventBus.on('sanctuaryUpdated', this.refreshSanctuary, this);

    // Resize handler
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(_gameSize: Phaser.Structs.Size): void {
    // Redraw backgrounds
    this.scene.restart(); // Simple and clean reload of positioning
  }

  private initSlotPositions(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2 + 10;
    
    // We want 20 pre-defined non-overlapping positions on the lawn
    this.slotPositions = [
      // Row 1 (y - 90)
      { x: centerX - 240, y: centerY - 100 },
      { x: centerX - 80, y: centerY - 100 },
      { x: centerX + 80, y: centerY - 100 },
      { x: centerX + 240, y: centerY - 100 },
      
      // Row 2 (y - 30)
      { x: centerX - 320, y: centerY - 40 },
      { x: centerX - 160, y: centerY - 40 },
      { x: centerX, y: centerY - 40 },
      { x: centerX + 160, y: centerY - 40 },
      { x: centerX + 320, y: centerY - 40 },

      // Row 3 (y + 30)
      { x: centerX - 320, y: centerY + 30 },
      { x: centerX - 160, y: centerY + 30 },
      { x: centerX, y: centerY + 30 },
      { x: centerX + 160, y: centerY + 30 },
      { x: centerX + 320, y: centerY + 30 },

      // Row 4 (y + 90)
      { x: centerX - 240, y: centerY + 95 },
      { x: centerX - 80, y: centerY + 95 },
      { x: centerX + 80, y: centerY + 95 },
      { x: centerX + 240, y: centerY + 95 },

      // Back Row
      { x: centerX - 120, y: centerY - 160 },
      { x: centerX + 120, y: centerY - 160 }
    ];
  }

  private drawBackground(width: number, height: number): void {
    const lawnY = 120;
    
    // Sky
    const sky = this.add.graphics();
    sky.fillGradientStyle(0xc6f28c, 0xc6f28c, 0x8fd14f, 0x8fd14f, 1);
    sky.fillRect(0, 0, width, lawnY);

    // Lawn / Ground
    const lawn = this.add.graphics();
    lawn.fillStyle(0x2d4438, 1);
    lawn.fillRect(0, lawnY, width, height - lawnY);

    // Cozy river/pond on the side
    const pond = this.add.graphics();
    pond.fillStyle(0x7ec8e3, 0.8);
    pond.fillEllipse(80, height - 100, 180, 80);
    // Draw pond outline
    pond.lineStyle(3, 0xffffff, 0.4);
    pond.strokeEllipse(80, height - 100, 180, 80);

    // Cozy fence along the sky edge
    const fence = this.add.graphics();
    fence.lineStyle(4, 0x5c4832, 0.95);
    for (let f = 10; f < width; f += 25) {
      // Draw posts
      fence.lineBetween(f, lawnY - 10, f, lawnY + 10);
      // Rails
      if (f + 25 < width) {
        fence.lineBetween(f, lawnY - 5, f + 25, -5 + lawnY);
        fence.lineBetween(f, lawnY + 5, f + 25, 5 + lawnY);
      }
    }
  }

  private refreshSanctuary(): void {
    // 1. Destroy old sanctuary creatures
    this.creaturesGroup.clear(true, true);
    
    // Clear old slot UI indicators
    this.slotGraphics.forEach(g => g.destroy());
    this.slotClickZones.forEach(z => z.destroy());
    this.slotGraphics = [];
    this.slotClickZones = [];

    const state = SaveSystem.getState();
    const capacity = EconomySystem.getSanctuaryCapacity(state.sanctuaryLevel);

    // 2. Render all Enclosure Slots (up to capacity)
    for (let idx = 0; idx < capacity; idx++) {
      const pos = this.slotPositions[idx];
      if (!pos) continue;

      // Check if there is an active creature assigned to this slot
      const assigned = state.ownedCreatures.find(oc => (oc as any).placedSlot === idx);

      if (assigned) {
        // RENDER CREATURE IN SLOT
        const creature = new SanctuaryCreature(this, pos.x, pos.y, assigned, (c) => {
          // Open Creature Details panel
          const uiScene = this.scene.get('UIScene') as any;
          if (uiScene && uiScene.togglePanel && uiScene.detailPanel) {
            uiScene.togglePanel(uiScene.detailPanel);
            uiScene.detailPanel.show(c.ownedData);
          }
        });
        this.add.existing(creature);
        this.creaturesGroup.add(creature);
      } else {
        // RENDER EMPTY SLOT UI (Parchment grass ring with '+' sign)
        const slotG = this.add.graphics();
        slotG.fillStyle(0xfff7e6, 0.12);
        slotG.lineStyle(2, 0xfff7e6, 0.25);
        slotG.fillCircle(pos.x, pos.y, 20);
        slotG.strokeCircle(pos.x, pos.y, 20);
        
        // Draw little '+' symbol
        slotG.lineStyle(2, 0xfff7e6, 0.4);
        slotG.lineBetween(pos.x - 5, pos.y, pos.x + 5, pos.y);
        slotG.lineBetween(pos.x, pos.y - 5, pos.x, pos.y + 5);

        this.slotGraphics.push(slotG);

        // Click Zone to assign creature
        const clickZone = this.add.zone(pos.x, pos.y, 45, 45).setOrigin(0.5);
        clickZone.setInteractive({ useHandCursor: true });
        clickZone.on('pointerdown', () => {
          AudioManager.playSfx('ui_tap');
          // Open inventory to assign
          const uiScene = this.scene.get('UIScene') as any;
          if (uiScene && uiScene.togglePanel && uiScene.inventoryPanel) {
            // Setup assignment callback in InventoryPanel if we want it manual
            // In our system, if they select a creature, we'll assign it to this slot!
            uiScene.inventoryPanel.show();
            // Temporarily set a listener or target slot index so inventory can assign to it
            uiScene.inventoryPanel.onCreatureSelect = (oc: OwnedCreature) => {
              const assignedSuccess = EconomySystem.placeCreatureInSlot(oc.instanceId, idx);
              if (assignedSuccess) {
                AudioManager.playSfx('ui_confirm');
                uiScene.inventoryPanel.setVisible(false);
              }
            };
          }
        });
        this.slotClickZones.push(clickZone);
      }
    }
  }

  destroy(): void {
    EventBus.off('sanctuaryUpdated', this.refreshSanctuary, this);
  }
}
