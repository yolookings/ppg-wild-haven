import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { DialogueManager } from '../systems/DialogueManager';

export class Player extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body;

  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Graphics;
  private lassoGraphics!: Phaser.GameObjects.Graphics;

  private mountSprite: Phaser.GameObjects.Sprite | null = null;
  private wingsLeft: Phaser.GameObjects.Graphics | null = null;
  private wingsRight: Phaser.GameObjects.Graphics | null = null;

  private maxSpeed = 180;
  private velocityX = 0;
  private velocityY = 0;

  private moveTarget: Phaser.Math.Vector2 | null = null;

  // Animation states
  private playerState: 'idle' | 'walking' | 'casting' = 'idle';
  private facingDirection: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right' = 'down';

  // Input keys
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.shadow = scene.add.graphics();
    this.add(this.shadow);

    this.sprite = scene.add.sprite(0, -12, 'aztec_leader_idle'); // initial texture, animations override
    this.sprite.setScale(0.9);
    this.sprite.setOrigin(0.5, 0.5);
    this.add(this.sprite);

    this.lassoGraphics = scene.add.graphics();
    this.add(this.lassoGraphics);

    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);
    // Narrow feet-only physical hitbox (16px width x 8px height, located at the bottom of the scaled sprite)
    this.body.setSize(16, 8);
    this.body.setOffset(-8, 10);

    if (scene.input.keyboard) {
      this.keys = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
        leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
        downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
        rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT
      }) as any;
    }

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (DialogueManager.isDialogueActive() || (scene as any).isQteActive || pointer.y > scene.cameras.main.height - 85 || pointer.y < 85) {
        return;
      }
      this.setMoveTarget(pointer.worldX, pointer.worldY);
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        if (DialogueManager.isDialogueActive() || (scene as any).isQteActive || pointer.y > scene.cameras.main.height - 85 || pointer.y < 85) {
          return;
        }
        this.setMoveTarget(pointer.worldX, pointer.worldY);
      }
    });

    this.drawShadow();
  }

  private drawShadow(): void {
    this.shadow.clear();
    this.shadow.fillStyle(0x000000, 0.25);
    this.shadow.fillEllipse(0, 16, 24, 8);
  }

  private updateSpriteFrame(): void {
    const skin = 'lana_leader';
    const dir = this.facingDirection;

    let animDir = 'down';
    if (dir === 'up') animDir = 'up';
    else if (dir === 'down') animDir = 'down';
    else if (dir === 'left' || dir === 'up-left' || dir === 'down-left') animDir = 'left';
    else if (dir === 'right' || dir === 'up-right' || dir === 'down-right') animDir = 'right';

    let animKey = `${skin}_idle_${animDir}`;
    if (this.playerState === 'walking') {
      animKey = `${skin}_walk_${animDir}`;
    }

    if (this.sprite.anims) {
      if (this.sprite.anims.currentAnim?.key !== animKey) {
        this.sprite.play(animKey);
      }
    }
    
    this.sprite.setFlipX(false);
  }

  public setMoveTarget(x: number, y: number): void {
    this.moveTarget = new Phaser.Math.Vector2(x, y);
  }

  public stopMovement(): void {
    this.moveTarget = null;
    this.velocityX = 0;
    this.velocityY = 0;
    this.body.setVelocity(0, 0);
  }

  public updateMountVisuals(creatureArea: string | null, isFlyable: boolean): void {
    if (creatureArea) {
      let spriteKey = 'creature_meadow';
      if (creatureArea === 'whisper_forest') spriteKey = 'creature_forest';
      else if (creatureArea === 'crystal_mountain') spriteKey = 'creature_mountain';
      else if (creatureArea === 'golden_dunes') spriteKey = 'creature_dunes';
      else if (creatureArea === 'sky_island') spriteKey = 'creature_sky';

      if (!this.mountSprite) {
        this.mountSprite = this.scene.add.sprite(0, 4, spriteKey);
        this.mountSprite.setScale(1.25);
        this.addAt(this.mountSprite, 1);
      } else {
        this.mountSprite.setTexture(spriteKey);
      }
      this.mountSprite.setVisible(true);
      this.maxSpeed = isFlyable ? 340 : 260;
      this.sprite.setVisible(false);
    } else {
      if (this.mountSprite) {
        this.mountSprite.setVisible(false);
      }
      this.maxSpeed = 180;
      this.sprite.setVisible(true);
    }

    if (isFlyable) {
      if (!this.wingsLeft) {
        this.wingsLeft = this.scene.add.graphics();
        this.wingsLeft.fillStyle(0xffffff, 0.95);
        this.wingsLeft.fillEllipse(0, 0, 24, 10);
        this.wingsLeft.lineStyle(1.5, 0x141f2a, 1);
        this.wingsLeft.strokeEllipse(0, 0, 24, 10);
        this.wingsLeft.setAngle(-25);
        this.addAt(this.wingsLeft, 1);
      }
      this.wingsLeft.setVisible(true);

      if (!this.wingsRight) {
        this.wingsRight = this.scene.add.graphics();
        this.wingsRight.fillStyle(0xffffff, 0.95);
        this.wingsRight.fillEllipse(0, 0, 24, 10);
        this.wingsRight.lineStyle(1.5, 0x141f2a, 1);
        this.wingsRight.strokeEllipse(0, 0, 24, 10);
        this.wingsRight.setAngle(25);
        this.addAt(this.wingsRight, 1);
      }
      this.wingsRight.setVisible(true);
    } else {
      if (this.wingsLeft) this.wingsLeft.setVisible(false);
      if (this.wingsRight) this.wingsRight.setVisible(false);
    }
  }

  public playCastAnimation(targetX: number, targetY: number, onComplete: () => void): void {
    this.playerState = 'casting';
    this.body.setVelocity(0, 0);

    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const deg = Phaser.Math.RadToDeg(angle);
    if (deg > -45 && deg <= 45) this.facingDirection = 'right';
    else if (deg > 45 && deg <= 135) this.facingDirection = 'down';
    else if (deg > -135 && deg <= -45) this.facingDirection = 'up';
    else this.facingDirection = 'left';
    this.updateSpriteFrame();

    AudioManager.playSfx('rope_throw');

    this.scene.time.delayedCall(600, () => {
      onComplete();
    });

    this.scene.time.delayedCall(1600, () => {
      if (this.playerState === 'casting') {
        this.playerState = 'idle';
      }
    });
  }

  update(_time: number, delta: number): void {
    if (DialogueManager.isDialogueActive()) {
      this.body.setVelocity(0, 0);
      this.playerState = 'idle';
      return;
    }

    const dt = delta / 1000;
    let inputX = 0;
    let inputY = 0;

    if (this.playerState !== 'casting') {
      if (this.keys.left?.isDown || this.keys.leftArrow?.isDown) {
        inputX = -1;
        this.moveTarget = null;
      } else if (this.keys.right?.isDown || this.keys.rightArrow?.isDown) {
        inputX = 1;
        this.moveTarget = null;
      }

      if (this.keys.up?.isDown || this.keys.upArrow?.isDown) {
        inputY = -1;
        this.moveTarget = null;
      } else if (this.keys.down?.isDown || this.keys.downArrow?.isDown) {
        inputY = 1;
        this.moveTarget = null;
      }
    }

    let targetVx = 0;
    let targetVy = 0;

    if (inputX !== 0 || inputY !== 0) {
      if (inputX !== 0 && inputY !== 0) {
        inputX *= 0.7071;
        inputY *= 0.7071;
      }
      targetVx = inputX * this.maxSpeed;
      targetVy = inputY * this.maxSpeed;

      if (inputY < 0) {
        this.facingDirection = inputX < 0 ? 'up-left' : inputX > 0 ? 'up-right' : 'up';
      } else if (inputY > 0) {
        this.facingDirection = inputX < 0 ? 'down-left' : inputX > 0 ? 'down-right' : 'down';
      } else {
        this.facingDirection = inputX < 0 ? 'left' : 'right';
      }
      this.playerState = 'walking';
    } else if (this.moveTarget && this.playerState !== 'casting') {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
      if (dist < 8) {
        this.stopMovement();
        this.playerState = 'idle';
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
        
        // Dynamic smooth braking when close to destination to prevent overshooting
        let speed = this.maxSpeed;
        if (dist < 32) {
          speed = this.maxSpeed * (dist / 32);
        }
        
        targetVx = Math.cos(angle) * speed;
        targetVy = Math.sin(angle) * speed;

        if (Math.abs(targetVx) > Math.abs(targetVy)) {
          this.facingDirection = targetVx < 0 ? 'left' : 'right';
        } else {
          this.facingDirection = targetVy < 0 ? 'up' : 'down';
        }
        this.playerState = 'walking';
      }
    } else {
      if (this.playerState !== 'casting') {
        this.playerState = 'idle';
      }
    }

    // Apply snappy momentum (0.1s acceleration to feel responsive, 0.12s deceleration to stop cleanly)
    const accelRate = this.maxSpeed / 0.10;
    const decelRate = this.maxSpeed / 0.12;

    // X Velocity update
    if (targetVx !== 0) {
      if (Math.abs(this.velocityX - targetVx) < accelRate * dt) {
        this.velocityX = targetVx;
      } else {
        this.velocityX += Math.sign(targetVx - this.velocityX) * accelRate * dt;
      }
    } else {
      if (Math.abs(this.velocityX) < decelRate * dt) {
        this.velocityX = 0;
      } else {
        this.velocityX -= Math.sign(this.velocityX) * decelRate * dt;
      }
    }

    // Y Velocity update
    if (targetVy !== 0) {
      if (Math.abs(this.velocityY - targetVy) < accelRate * dt) {
        this.velocityY = targetVy;
      } else {
        this.velocityY += Math.sign(targetVy - this.velocityY) * accelRate * dt;
      }
    } else {
      if (Math.abs(this.velocityY) < decelRate * dt) {
        this.velocityY = 0;
      } else {
        this.velocityY -= Math.sign(this.velocityY) * decelRate * dt;
      }
    }

    this.body.setVelocity(this.velocityX, this.velocityY);

    if (this.mountSprite && this.mountSprite.visible) {
      const isLeft = this.facingDirection === 'left' || this.facingDirection === 'up-left' || this.facingDirection === 'down-left';
      this.mountSprite.setScale(isLeft ? -1.25 : 1.25, 1.25);
    }

    this.updateSpriteFrame();
    this.setDepth(this.y);
  }
}
