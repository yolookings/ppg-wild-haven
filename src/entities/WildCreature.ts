// src/entities/WildCreature.ts
import Phaser from 'phaser';
import { Creature } from '../data/types';

export class WildCreature extends Phaser.GameObjects.Container {
  public creatureData: Creature;
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Graphics;

  private jumpTimer!: Phaser.Time.TimerEvent;
  private onInteractCallback: (c: WildCreature) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, creatureData: Creature, onInteract: (c: WildCreature) => void) {
    super(scene, x, y);
    this.creatureData = creatureData;
    this.onInteractCallback = onInteract;

    // 1. Shadow underneath
    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.2);
    this.shadow.fillEllipse(0, 8, 14, 5);
    this.add(this.shadow);

    // 2. Glow ring based on rarity
    this.glow = scene.add.graphics();
    let rarityColor = 0xb5b5b5; // Common
    if (creatureData.rarity === 'Rare') rarityColor = 0x4fa3e3;
    else if (creatureData.rarity === 'Epic') rarityColor = 0xb05fe0;
    else if (creatureData.rarity === 'Legendary') rarityColor = 0xffc93c;
    else if (creatureData.rarity === 'Mythic') rarityColor = 0xff5c8a;

    this.glow.lineStyle(1.5, rarityColor, 0.6);
    this.glow.strokeCircle(0, 4, 13);
    this.add(this.glow);

    // Subtle breathing animation for glow
    scene.tweens.add({
      targets: this.glow,
      alpha: 0.2,
      scale: 1.15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 3. Creature Sprite mapping fallback
    let spriteKey = 'creature_meadow';
    if (creatureData.area === 'whisper_forest') spriteKey = 'creature_forest';
    else if (creatureData.area === 'crystal_mountain') spriteKey = 'creature_mountain';
    else if (creatureData.area === 'golden_dunes') spriteKey = 'creature_dunes';
    else if (creatureData.area === 'sky_island') spriteKey = 'creature_sky';

    this.sprite = scene.add.sprite(0, 0, spriteKey);
    this.sprite.setScale(0.65); // Smaller size as requested!
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setInteractive({ useHandCursor: true });
    this.add(this.sprite);

    // Click behavior
    this.sprite.on('pointerdown', () => {
      this.onInteractCallback(this);
    });

    // 4. Idle Squash/Stretch
    scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.65 * 1.1,
      scaleX: 0.65 * 1.25,
      y: 1,
      duration: 1000 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Start hopping movement script
    this.startHoppings();
  }

  private startHoppings(): void {
    // Every 3-6 seconds, make the creature hop to a nearby position
    this.jumpTimer = this.scene.time.addEvent({
      delay: 3000 + Math.random() * 4000,
      callback: () => this.hopRandomly(),
      loop: true
    });
  }

  private hopRandomly(): void {
    if (!this.scene) return;

    // Hop range: within a radius of 60px
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 40;
    const targetX = this.x + Math.cos(angle) * dist;
    const targetY = this.y + Math.sin(angle) * dist;

    // Keep within reasonable explore bounds
    const clampedX = Math.max(100, Math.min(this.scene.cameras.main.width - 100, targetX));
    const clampedY = Math.max(150, Math.min(this.scene.cameras.main.height - 150, targetY));

    const duration = 400;

    this.scene.tweens.add({
      targets: this,
      x: clampedX,
      y: clampedY,
      duration: duration,
      ease: 'Linear'
    });

    // Arc jump Y offset
    this.scene.tweens.add({
      targets: this.sprite,
      y: -15,
      scaleY: 0.65 * 1.4,
      scaleX: 0.65 * 1.0,
      duration: duration / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Squash on land
        this.scene.tweens.add({
          targets: this.sprite,
          scaleY: 0.65 * 0.9,
          scaleX: 0.65 * 1.35,
          y: 3,
          duration: 80,
          yoyo: true,
          ease: 'Quad.easeInOut',
          onComplete: () => {
            this.sprite.y = 0;
            this.sprite.setScale(0.65);
          }
        });
      }
    });

    // Scaling shadow size during jump
    this.scene.tweens.add({
      targets: this.shadow,
      scale: 0.6,
      alpha: 0.1,
      duration: duration / 2,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  public destroy(): void {
    if (this.jumpTimer) {
      this.jumpTimer.destroy();
    }
    super.destroy();
  }
}
