// src/entities/Player.ts
import Phaser from 'phaser';

export class Player extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body;
  
  private avatar!: Phaser.GameObjects.Graphics;
  private hat!: Phaser.GameObjects.Graphics;
  private shadow!: Phaser.GameObjects.Graphics;

  private speed = 180;
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private isMoving = false;
  private bobTime = 0;

  // Input keys
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // 1. Add shadow
    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.25);
    this.shadow.fillEllipse(0, 16, 24, 8);
    this.add(this.shadow);

    // 2. Draw procedural cute Keeper character
    this.avatar = scene.add.graphics();
    // Body (Cozy blue coat)
    this.avatar.fillStyle(0x2a5c91, 1);
    this.avatar.fillRoundedRect(-10, -12, 20, 24, 6);
    this.avatar.lineStyle(1.5, 0x141f2a, 1);
    this.avatar.strokeRoundedRect(-10, -12, 20, 24, 6);
    
    // Head/Face
    this.avatar.fillStyle(0xffdcd0, 1);
    this.avatar.fillCircle(0, -16, 9);
    this.avatar.strokeCircle(0, -16, 9);

    // Eyes
    this.avatar.fillStyle(0x141f2a, 1);
    this.avatar.fillCircle(-3, -17, 1.5);
    this.avatar.fillCircle(3, -17, 1.5);

    // Backpack (brown leather)
    this.avatar.fillStyle(0x8a5200, 1);
    this.avatar.fillRoundedRect(-13, -5, 6, 14, 2);
    this.avatar.strokeRoundedRect(-13, -5, 6, 14, 2);

    this.add(this.avatar);

    // 3. Keeper Hat (procedural safari/tamer hat)
    this.hat = scene.add.graphics();
    this.hat.fillStyle(0xc19a6b, 1); // Straw/safari color
    this.hat.fillEllipse(0, -22, 18, 5); // Brim
    this.hat.fillRoundedRect(-6, -28, 12, 8, 2); // Crown
    this.hat.lineStyle(1, 0x5c4832, 1);
    this.hat.strokeEllipse(0, -22, 18, 5);
    this.hat.strokeRoundedRect(-6, -28, 12, 8, 2);
    
    // Hat band (red)
    this.hat.fillStyle(0xff5c8a, 1);
    this.hat.fillRect(-6, -23, 12, 2);

    this.add(this.hat);

    // Enable arcade physics
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);
    this.body.setSize(24, 32);
    this.body.setOffset(-12, -16);

    // Setup keyboard controls
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

    // Tap-to-move listener
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Avoid tap to move if clicking UI elements or QTE minigame
      if ((scene as any).isQteActive || pointer.y > scene.cameras.main.height - 85 || pointer.y < 85) {
        return;
      }
      this.setMoveTarget(pointer.x, pointer.y);
    });
  }

  public setMoveTarget(x: number, y: number): void {
    this.moveTarget = new Phaser.Math.Vector2(x, y);
    this.isMoving = true;
  }

  public stopMovement(): void {
    this.moveTarget = null;
    this.isMoving = false;
    this.body.setVelocity(0, 0);
  }

  update(_time: number, delta: number): void {
    let vx = 0;
    let vy = 0;

    // Check keyboard inputs
    if (this.keys.left?.isDown || this.keys.leftArrow?.isDown) {
      vx = -this.speed;
      this.moveTarget = null; // Keyboard overrides tap-to-move
    } else if (this.keys.right?.isDown || this.keys.rightArrow?.isDown) {
      vx = this.speed;
      this.moveTarget = null;
    }

    if (this.keys.up?.isDown || this.keys.upArrow?.isDown) {
      vy = -this.speed;
      this.moveTarget = null;
    } else if (this.keys.down?.isDown || this.keys.downArrow?.isDown) {
      vy = this.speed;
      this.moveTarget = null;
    }

    // Process Keyboard Velocity
    if (vx !== 0 || vy !== 0) {
      this.isMoving = true;
      
      // Normalize speed diagonal
      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }
      this.body.setVelocity(vx, vy);

      // Flip character sprite left/right
      if (vx < 0) {
        this.avatar.setScale(-1, 1);
        this.hat.setScale(-1, 1);
      } else if (vx > 0) {
        this.avatar.setScale(1, 1);
        this.hat.setScale(1, 1);
      }
    } else if (this.moveTarget) {
      // Process Tap-to-move target
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
      if (dist < 10) {
        this.stopMovement();
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
        vx = Math.cos(angle) * this.speed;
        vy = Math.sin(angle) * this.speed;
        this.body.setVelocity(vx, vy);

        if (vx < 0) {
          this.avatar.setScale(-1, 1);
          this.hat.setScale(-1, 1);
        } else {
          this.avatar.setScale(1, 1);
          this.hat.setScale(1, 1);
        }
      }
    } else {
      this.isMoving = false;
      this.body.setVelocity(0, 0);
    }

    // Walking Bobbing Animation
    if (this.isMoving) {
      this.bobTime += delta * 0.012;
      const bobY = Math.sin(this.bobTime) * 3;
      // bob Y position of body elements
      this.avatar.y = bobY;
      this.hat.y = bobY;
      // Squeeze shadow based on bob Y
      this.shadow.setScale(1 + Math.sin(this.bobTime) * 0.1, 1);
    } else {
      this.avatar.y = 0;
      this.hat.y = 0;
      this.shadow.setScale(1, 1);
      this.bobTime = 0;
    }
  }
}
