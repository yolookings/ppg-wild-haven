import Phaser from 'phaser';
import { Creature } from '../data/types';
import { CreatureVisuals } from '../utils/CreatureVisuals';

type CreatureState = 'IDLE' | 'WANDER';

export class WildCreature extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body;

  public creatureData: Creature;
  private creatureSprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Graphics;
  private baseScale: number;

  private fsmState: CreatureState = 'IDLE';
  private stateTimer = 0;
  private wanderAngle = 0;
  private wanderSpeed = 60;
  private facingDirection: 'down' | 'up' | 'left' | 'right' = 'down';

  // Acceleration variables for realistic movement
  private currentVx = 0;
  private currentVy = 0;
  private targetVx = 0;
  private targetVy = 0;

  private onInteractCallback: (c: WildCreature) => void;

  // Biome boundary constraints
  private readonly MIN_X = 50;
  private readonly MAX_X = 2350;
  private readonly MIN_Y = 450;
  private readonly MAX_Y = 1750;

  constructor(scene: Phaser.Scene, x: number, y: number, creatureData: Creature, onInteract: (c: WildCreature) => void) {
    super(scene, x, y);
    this.creatureData = creatureData;
    this.onInteractCallback = onInteract;
    const isBoss = creatureData.rarity === 'Mythic';
    const visuals = CreatureVisuals.getVisuals(creatureData);
    const scaleFactor = isBoss ? 3.50 : 1.75;
    this.baseScale = scaleFactor * visuals.scaleMult;
    const ringRadius = (isBoss ? 20 : 13) * visuals.scaleMult * scaleFactor;
    const shadowW = (isBoss ? 20 : 14) * visuals.scaleMult * scaleFactor;
    const shadowH = (isBoss ? 7 : 4) * visuals.scaleMult * scaleFactor;

    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.2);
    this.shadow.fillEllipse(0, 8, shadowW, shadowH);
    this.add(this.shadow);

    this.glow = scene.add.graphics();
    let rarityColor = 0xb5b5b5;
    if (creatureData.rarity === 'Rare') rarityColor = 0x4fa3e3;
    else if (creatureData.rarity === 'Epic') rarityColor = 0xb05fe0;
    else if (creatureData.rarity === 'Legendary') rarityColor = 0xffc93c;
    else if (creatureData.rarity === 'Mythic') rarityColor = 0xff5c8a;

    this.glow.lineStyle(2, rarityColor, 0.8);
    this.glow.strokeCircle(0, 4, ringRadius);
    this.add(this.glow);

    scene.tweens.add({
      targets: this.glow,
      alpha: 0.2,
      scale: 1.15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    if (!scene.textures.exists(visuals.spriteKey)) {
      this.setVisible(false);
      this.creatureSprite = scene.add.sprite(0, 0, 'creature_slime');
      this.creatureSprite.setVisible(false);
      this.add(this.creatureSprite);
      return;
    }

    this.creatureSprite = scene.add.sprite(0, 0, visuals.spriteKey);
    this.creatureSprite.setTint(visuals.tint);
    this.creatureSprite.setScale(this.baseScale);
    this.creatureSprite.setOrigin(0.5, 0.5);
    this.creatureSprite.setInteractive({ useHandCursor: true });
    this.add(this.creatureSprite);

    this.creatureSprite.on('pointerdown', () => {
      this.onInteractCallback(this);
    });

    if (!visuals.isAnimated) {
      scene.tweens.add({
        targets: this.creatureSprite,
        scaleY: this.baseScale * 1.1,
        scaleX: this.baseScale * 1.25,
        y: 1,
        duration: 1000 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    scene.physics.add.existing(this);
    this.body.setSize(20, 6);
    this.body.setOffset(-10, 6);

    this.enterIdle();
  }

  private enterIdle(): void {
    this.fsmState = 'IDLE';
    this.targetVx = 0;
    this.targetVy = 0;
    // Idle duration between 1.5 and 3.5 seconds
    this.stateTimer = 1.5 + Math.random() * 2.0;
  }

  private enterWander(): void {
    this.fsmState = 'WANDER';
    // Calculate structure free-movement
    this.wanderAngle = Math.random() * Math.PI * 2; // angle 0 to 360 degrees
    this.stateTimer = 1.0 + Math.random() * 2.0; // wander duration 1-3 seconds
    this.wanderSpeed = 25 + Math.random() * 25; // slower max speed for creatures: 25 to 50

    // Vektor kecepatan target
    this.targetVx = Math.cos(this.wanderAngle) * this.wanderSpeed;
    this.targetVy = Math.sin(this.wanderAngle) * this.wanderSpeed;
  }

  private constrainPosition(): void {
    let needsAdjust = false;
    if (this.x < this.MIN_X) {
      this.x = this.MIN_X;
      this.targetVx = -this.targetVx;
      needsAdjust = true;
    }
    if (this.x > this.MAX_X) {
      this.x = this.MAX_X;
      this.targetVx = -this.targetVx;
      needsAdjust = true;
    }
    if (this.y < this.MIN_Y) {
      this.y = this.MIN_Y;
      this.targetVy = -this.targetVy;
      needsAdjust = true;
    }
    if (this.y > this.MAX_Y) {
      this.y = this.MAX_Y;
      this.targetVy = -this.targetVy;
      needsAdjust = true;
    }
    if (needsAdjust) {
      // Re-calculate bounce angle to keep wander smooth
      this.wanderAngle = Math.atan2(this.targetVy, this.targetVx);
    }
  }

  public isTethered = false;

  update(_time: number, delta: number): void {
    if (!this.scene || !this.scene.scene.isActive()) return;

    const visuals = CreatureVisuals.getVisuals(this.creatureData);

    if (this.isTethered) {
      const vx = this.body.velocity.x;
      const vy = this.body.velocity.y;

      if (vx !== 0 || vy !== 0) {
        if (Math.abs(vx) > Math.abs(vy)) {
          this.facingDirection = vx < 0 ? 'left' : 'right';
        } else {
          this.facingDirection = vy < 0 ? 'up' : 'down';
        }
      }

      if (visuals.isAnimated) {
        let animKey = `animal_${visuals.animalType}_idle_${this.facingDirection}`;
        if (vx !== 0 || vy !== 0) {
          animKey = `animal_${visuals.animalType}_walk_${this.facingDirection}`;
        }
        if (this.creatureSprite.anims) {
          if (this.creatureSprite.anims.currentAnim?.key !== animKey) {
            this.creatureSprite.play(animKey);
          }
        }
        this.creatureSprite.setFlipX(false);
      } else {
        if (vx !== 0) {
          this.creatureSprite.setFlipX(vx < 0);
        }
      }
      return;
    }

    const dt = delta / 1000;
    this.stateTimer -= dt;

    // Realistic Acceleration & Deceleration for Creature AI
    // We accelerate/decelerate towards target velocities at a rate of 80 units/s^2
    const accelRate = 80;
    if (Math.abs(this.currentVx - this.targetVx) < accelRate * dt) {
      this.currentVx = this.targetVx;
    } else {
      this.currentVx += Math.sign(this.targetVx - this.currentVx) * accelRate * dt;
    }

    if (Math.abs(this.currentVy - this.targetVy) < accelRate * dt) {
      this.currentVy = this.targetVy;
    } else {
      this.currentVy += Math.sign(this.targetVy - this.currentVy) * accelRate * dt;
    }

    this.body.setVelocity(this.currentVx, this.currentVy);

    // Apply sprite flip or play Phaser animations
    if (this.currentVx !== 0 || this.currentVy !== 0) {
      if (Math.abs(this.currentVx) > Math.abs(this.currentVy)) {
        this.facingDirection = this.currentVx < 0 ? 'left' : 'right';
      } else {
        this.facingDirection = this.currentVy < 0 ? 'up' : 'down';
      }
    }

    if (visuals.isAnimated) {
      let animKey = `animal_${visuals.animalType}_idle_${this.facingDirection}`;
      if (this.fsmState === 'WANDER' && (this.currentVx !== 0 || this.currentVy !== 0)) {
        // Since wandering speed is slow, we can use walk
        animKey = `animal_${visuals.animalType}_walk_${this.facingDirection}`;
      }
      if (this.creatureSprite.anims) {
        if (this.creatureSprite.anims.currentAnim?.key !== animKey) {
          this.creatureSprite.play(animKey);
        }
      }
      this.creatureSprite.setFlipX(false);
    } else {
      if (this.currentVx !== 0) {
        this.creatureSprite.setFlipX(this.currentVx < 0);
      }
    }

    // State Machine logic
    if (this.fsmState === 'IDLE') {
      if (this.stateTimer <= 0) {
        this.enterWander();
      }
    } else if (this.fsmState === 'WANDER') {
      this.constrainPosition();

      if (this.stateTimer <= 0) {
        // Roll chance: 20% chance after each wander cycle to enter IDLE
        if (Math.random() < 0.20) {
          this.enterIdle();
        } else {
          this.enterWander();
        }
      }
    }
  }

  public destroy(): void {
    super.destroy();
  }
}
