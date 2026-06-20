// src/entities/SanctuaryCreature.ts
import Phaser from 'phaser';
import { OwnedCreature, Creature } from '../data/types';
import { DataLoader } from '../data/DataLoader';
import { EconomySystem } from '../systems/EconomySystem';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { SaveSystem } from '../systems/SaveSystem';
import { CreatureVisuals } from '../utils/CreatureVisuals';

export class SanctuaryCreature extends Phaser.GameObjects.Container {
  public ownedData: OwnedCreature;
  public creatureData: Creature;
  
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Graphics;
  private nameTagBg!: Phaser.GameObjects.Graphics;
  private nameTagText!: Phaser.GameObjects.Text;
  private baseScale: number;
  
  private coinTimer!: Phaser.Time.TimerEvent;
  private hopTimer!: Phaser.Time.TimerEvent;
  private onClickCallback: (c: SanctuaryCreature) => void;

  private homeX: number;
  private homeY: number;
  private bounds?: { minX: number; maxX: number; minY: number; maxY: number };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    ownedData: OwnedCreature,
    onClick: (c: SanctuaryCreature) => void,
    bounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ) {
    super(scene, x, y);
    this.ownedData = ownedData;
    this.onClickCallback = onClick;
    this.bounds = bounds;
    this.creatureData = DataLoader.getCreature(ownedData.creatureId)!;

    this.homeX = x;
    this.homeY = y;

    // 1. Sprite matching using subspecies variation system
    const visuals = CreatureVisuals.getVisuals(this.creatureData);
    this.baseScale = 1.4 * visuals.scaleMult * (1 + (this.ownedData.level - 1) * 0.05);

    // 2. Shadow underneath scaled to size
    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.15);
    const shadowW = 12 * this.baseScale;
    const shadowH = 4 * this.baseScale;
    this.shadow.fillEllipse(0, 10, shadowW, shadowH);
    this.add(this.shadow);

    if (!scene.textures.exists(visuals.spriteKey)) {
      this.setVisible(false);
      this.sprite = scene.add.sprite(0, 0, 'creature_slime');
      this.sprite.setVisible(false);
      this.add(this.sprite);
      return;
    }

    this.sprite = scene.add.sprite(0, 0, visuals.spriteKey);
    this.sprite.setTint(visuals.tint);
    this.sprite.setScale(this.baseScale);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setInteractive({ useHandCursor: true });
    this.add(this.sprite);

    // Click behavior
    this.sprite.on('pointerdown', () => {
      this.onClickCallback(this);
    });

    // 3. Floating Name tag
    const dispName = ownedData.nickname || this.creatureData.name;
    this.nameTagText = scene.add.text(0, -20, `${dispName} Lvl.${ownedData.level}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#5c4832',
      stroke: '#fff7e6',
      strokeThickness: 1.5
    }).setOrigin(0.5);

    const txtW = this.nameTagText.width;
    this.nameTagBg = scene.add.graphics();
    this.nameTagBg.fillStyle(0xfff7e6, 0.85); // Creamy tag
    this.nameTagBg.lineStyle(1, 0xd1b48c, 0.9);
    this.nameTagBg.fillRoundedRect(-txtW / 2 - 4, -25, txtW + 8, 10, 2);
    this.nameTagBg.strokeRoundedRect(-txtW / 2 - 4, -25, txtW + 8, 10, 2);

    this.add(this.nameTagBg);
    this.add(this.nameTagText);

    this.nameTagText.setDepth(1);

    // 4. Update scale when leveled up
    EventBus.on('creatureLeveledUp', (data: { instanceId: string }) => {
      if (!this.scene) return; // Prevent updating destroyed creatures
      if (this.ownedData.instanceId === data.instanceId) {
        const state = SaveSystem.getState();
        const updatedData = state.ownedCreatures.find((c: OwnedCreature) => c.instanceId === data.instanceId);
        if (updatedData) {
          this.ownedData = updatedData;
          this.baseScale = 1.4 * visuals.scaleMult * (1 + (this.ownedData.level - 1) * 0.05);
          this.sprite.setScale(this.baseScale);
          
          const newDispName = this.ownedData.nickname || this.creatureData.name;
          this.nameTagText.setText(`${newDispName} Lvl.${this.ownedData.level}`);
          
          const newTxtW = this.nameTagText.width;
          this.nameTagBg.clear();
          this.nameTagBg.fillStyle(0xfff7e6, 0.85);
          this.nameTagBg.lineStyle(1, 0xd1b48c, 0.9);
          this.nameTagBg.fillRoundedRect(-newTxtW / 2 - 4, -25, newTxtW + 8, 10, 2);
          this.nameTagBg.strokeRoundedRect(-newTxtW / 2 - 4, -25, newTxtW + 8, 10, 2);
        }
      }
    });

    // 4. Idle Squash/Stretch or play Phaser animation
    if (visuals.isAnimated) {
      this.sprite.play(`animal_${visuals.animalType}_idle_down`);
    } else {
      scene.tweens.add({
        targets: this.sprite,
        scaleY: this.baseScale * 1.1,
        scaleX: this.baseScale * 1.25,
        y: 1,
        duration: 1200 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // 5. Setup periodic coin ticking
    this.startCoinProduction();

    // 6. Setup dynamic slot-local hopping
    this.startHopping();
  }

  public updateData(newOwnedData: OwnedCreature): void {
    this.ownedData = newOwnedData;
    const dispName = newOwnedData.nickname || this.creatureData.name;
    this.nameTagText.setText(`${dispName} Lvl.${newOwnedData.level}`);
    
    // Resize nameTag bg
    const txtW = this.nameTagText.width;
    this.nameTagBg.clear();
    this.nameTagBg.fillStyle(0xfff7e6, 0.85);
    this.nameTagBg.lineStyle(1, 0xd1b48c, 0.9);
    this.nameTagBg.fillRoundedRect(-txtW / 2 - 4, -25, txtW + 8, 10, 2);
    this.nameTagBg.strokeRoundedRect(-txtW / 2 - 4, -25, txtW + 8, 10, 2);

    this.startCoinProduction();
  }

  private startCoinProduction(): void {
    if (this.coinTimer) {
      this.coinTimer.destroy();
    }

    const intervalMs = this.creatureData.coinInterval * 1000;

    this.coinTimer = this.scene.time.addEvent({
      delay: intervalMs,
      callback: () => this.produceCoins(),
      loop: true
    });
  }

  private startHopping(): void {
    this.hopTimer = this.scene.time.addEvent({
      delay: 4000 + Math.random() * 6000,
      callback: () => this.hopAroundSlot(),
      loop: true
    });
  }

  private hopAroundSlot(): void {
    if (!this.scene) return;

    const visuals = CreatureVisuals.getVisuals(this.creatureData);

    // Hop range: within a small radius of 20px around slot coordinate
    // Hop range: wider for enclosures, smaller for slots
    const angle = Math.random() * Math.PI * 2;
    const dist = this.bounds ? 15 + Math.random() * 30 : 8 + Math.random() * 12;
    const targetX = this.homeX + Math.cos(angle) * dist;
    const targetY = this.homeY + Math.sin(angle) * dist;

    // Keep within boundaries
    let clampedX = targetX;
    let clampedY = targetY;

    if (this.bounds) {
      clampedX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, targetX));
      clampedY = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, targetY));
      
      // Update homeX, homeY to the new position occasionally so they drift naturally around the pen
      if (Math.random() < 0.4) {
        this.homeX = clampedX;
        this.homeY = clampedY;
      }
    } else {
      clampedX = Math.max(50, Math.min(this.scene.cameras.main.width - 50, targetX));
      clampedY = Math.max(135, Math.min(this.scene.cameras.main.height - 40, targetY));
    }

    const duration = 400;

    const dx = clampedX - this.x;
    const dy = clampedY - this.y;
    let hopDir = 'down';
    if (Math.abs(dx) > Math.abs(dy)) {
      hopDir = dx < 0 ? 'left' : 'right';
    } else {
      hopDir = dy < 0 ? 'up' : 'down';
    }

    if (visuals.isAnimated) {
      this.sprite.play(`animal_${visuals.animalType}_walk_${hopDir}`);
    }

    this.scene.tweens.add({
      targets: this,
      x: clampedX,
      y: clampedY,
      duration: duration,
      ease: 'Linear'
    });

    if (visuals.isAnimated) {
      this.scene.tweens.add({
        targets: this.sprite,
        y: -10,
        duration: duration / 2,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.sprite.y = 0;
          this.sprite.play(`animal_${visuals.animalType}_idle_${hopDir}`);
        }
      });
    } else {
      this.scene.tweens.add({
        targets: this.sprite,
        y: -10,
        scaleY: this.baseScale * 1.3,
        scaleX: this.baseScale * 0.95,
        duration: duration / 2,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.sprite,
            scaleY: this.baseScale * 0.9,
            scaleX: this.baseScale * 1.2,
            y: 2,
            duration: 80,
            yoyo: true,
            onComplete: () => {
              this.sprite.y = 0;
              this.sprite.setScale(this.baseScale);
            }
          });
        }
      });
    }

    this.scene.tweens.add({
      targets: this.shadow,
      scale: 0.6,
      alpha: 0.05,
      duration: duration / 2,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  private produceCoins(): void {
    if (!this.scene) return;

    const rate = EconomySystem.getCreatureCoinRate(this.creatureData, this.ownedData.level);
    
    // Add coins to player state
    const state = SaveSystem.getState();
    state.coins += Math.floor(rate);
    
    // Track lifetime coins metric
    if (!state.achievementProgress['lifetime_coins']) {
      state.achievementProgress['lifetime_coins'] = 0;
    }
    state.achievementProgress['lifetime_coins'] += Math.floor(rate);

    SaveSystem.markDirty();
    EventBus.emit('coinsChanged', state.coins);

    this.triggerCoinPopEffect(Math.floor(rate));
  }

  private triggerCoinPopEffect(amount: number): void {
    if (!this.scene) return;

    AudioManager.playSfx('coin_tick');

    const txt = this.scene.add.text(this.x, this.y - 15, `+${amount}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8.5px',
      fontStyle: 'bold',
      color: '#d4af37', // shiny gold color
      stroke: '#2c1e15',
      strokeThickness: 2
    }).setOrigin(0.5);
    
    txt.setDepth(this.y + 100);
    this.scene.tweens.add({
      targets: txt,
      y: txt.y - 30,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy()
    });

    // Bounce the creature sprite briefly on cash out
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: this.baseScale * 1.25,
      scaleX: this.baseScale * 0.92,
      y: -4,
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  public destroy(): void {
    if (this.coinTimer) {
      this.coinTimer.destroy();
    }
    if (this.hopTimer) {
      this.hopTimer.destroy();
    }
    super.destroy();
  }
}
