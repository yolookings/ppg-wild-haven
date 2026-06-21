// src/scenes/MainMenuScene.ts
import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { SaveSystem } from '../systems/SaveSystem';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Play background ambience
    AudioManager.playMusic('music_menu');

    // ---------- 1. BACKGROUND SKY ----------
    this.createBackground(w, h);

    // ---------- 2. CLOUDS ----------
    this.createClouds(w, h);

    // ---------- 3. CAMPFIRES ----------
    this.createCampfires(w, h);

    // ---------- 4. DECORATIONS (trees, bushes, flowers) ----------
    this.createDecorations(w, h);

    // ---------- 5. FIREFLIES ----------
    this.createFireflies(w, h);

    // ---------- 6. VIGNETTE ----------
    this.createVignette(w, h);

    // ---------- 7. TITLE ----------
    this.createTitle(w, h);

    // ---------- 8. ATMOSPHERE ----------
    this.createSunlight(w, h);
    this.createFloatingParticles(w, h);
    this.createFloatingLeaves(w, h);

    // ---------- 9. BUTTONS ----------
    this.createButtons(w, h);

    // ---------- 10. ENTRANCE ----------
    this.playEntranceSequence();

    this.cameras.main.fadeIn(1200, 0, 0, 0);
  }

  // ================================================================
  //  BACKGROUND
  // ================================================================
  private createBackground(w: number, h: number): void {
    const bg = this.add.image(w / 2, h / 2, 'homepage_bg');
    bg.setDisplaySize(w, h);
    bg.setDepth(0);
  }

  // ================================================================
  //  CLOUDS
  // ================================================================
  private createClouds(w: number, h: number): void {
    const cloudTextures = ['cloud_image_1', 'cloud_image_2', 'cloud_image_3', 'cloud_image_4', 'cloud_image_5'];

    for (let i = 0; i < 12; i++) {
      const key = cloudTextures[i % cloudTextures.length];
      if (!this.textures.exists(key)) {
        console.warn(`[Asset Validation] Missing cloud texture: ${key}`);
        continue;
      }

      const startX = i < 6
        ? Phaser.Math.Between(-200, -80)
        : Phaser.Math.Between(w + 80, w + 200);
      const cloud = this.add.image(
        startX,
        Phaser.Math.Between(15, h * 0.28),
        key
      );
      cloud.setDepth(2);

      const scale = Phaser.Math.FloatBetween(0.3, 0.7);
      const alpha = Phaser.Math.FloatBetween(0.18, 0.35);
      cloud.setScale(scale);
      cloud.setAlpha(0);

      const speed = Phaser.Math.Between(40, 80);
      const totalDist = w + 400;
      const duration = (totalDist / speed) * 1000;

      this.tweens.add({
        targets: cloud,
        alpha: alpha,
        duration: 1500,
        delay: i * 400,
        ease: 'Sine.easeIn',
      });

      if (i < 6) {
        this.tweens.add({
          targets: cloud,
          x: cloud.x + totalDist,
          duration: duration,
          repeat: -1,
          delay: i * 800,
          onRepeat: () => {
            cloud.x = -100;
          },
        });
      } else {
        this.tweens.add({
          targets: cloud,
          x: cloud.x - totalDist,
          duration: duration,
          repeat: -1,
          delay: i * 800,
          onRepeat: () => {
            cloud.x = w + 100;
          },
        });
      }

      this.tweens.add({
        targets: cloud,
        y: cloud.y + Phaser.Math.FloatBetween(-8, 8),
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  // ================================================================
  //  CAMPFIRES
  // ================================================================
  private createCampfires(w: number, h: number): void {
    const hasFireTex = this.textures.exists('campfire_fire');
    const hasFireAnim = this.anims.exists('campfire_burn');

    const positions = [
      { x: w * 0.12, y: h * 0.70 },
      { x: w * 0.88, y: h * 0.70 },
    ];

    for (const pos of positions) {
      const cx = pos.x;
      const cy = pos.y;

      // Warm glow on ground (behind fire)
      const glow = this.add.graphics();
      glow.setDepth(6);
      glow.fillStyle(0xff6600, 0.05);
      glow.fillCircle(cx, cy + 10, 70);
      glow.fillStyle(0xffaa44, 0.03);
      glow.fillCircle(cx, cy + 10, 100);

      if (hasFireTex && hasFireAnim) {
        const fire = this.add.sprite(cx, cy, 'campfire_fire');
        fire.setDepth(8);
        fire.play('campfire_burn');
        fire.setScale(1.2);
        fire.setAlpha(0);
        (fire as any).__entranceDelay = 300;
        (fire as any).__entranceType = 'fade';
      }

      // Log / stone base using stone textures
      const stoneKeys = ['stone_1', 'stone_2', 'stone_3', 'stone_4'];
      for (let i = 0; i < 3; i++) {
        const sk = stoneKeys[i % stoneKeys.length];
        if (!this.textures.exists(sk)) {
          console.warn(`[Asset Validation] Missing stone texture: ${sk}`);
          continue;
        }
        const stone = this.add.image(
          cx + Phaser.Math.Between(-18, 18),
          cy + Phaser.Math.Between(6, 14),
          sk
        );
        stone.setOrigin(0.5, 0.5);
        stone.setScale(Phaser.Math.FloatBetween(0.4, 0.6));
        stone.setDepth(7);
        stone.setAlpha(0.6);
      }
    }
  }

  // ================================================================
  //  DECORATIONS
  // ================================================================
  private createDecorations(w: number, h: number): void {
    const flowerKeys = ['flower_1', 'flower_2', 'flower_3', 'flower_4'];

    const leftTrees = [
      { key: 'city_tree_2', x: 40, scale: 0.9 },
      { key: 'tree_1', x: 95, scale: 0.75 },
      { key: 'city_tree_1', x: -10, scale: 1.2 },
    ];
    for (const t of leftTrees) {
      if (!this.textures.exists(t.key)) {
        console.warn(`[Asset Validation] Missing tree texture: ${t.key}`);
        continue;
      }
      const img = this.add.image(t.x, h + 5, t.key);
      img.setOrigin(0.5, 1);
      img.setScale(t.scale);
      img.setDepth(5);
      img.setAlpha(0);
      img.setTint(0x1a2a1a);
      this.tweens.add({
        targets: img,
        alpha: 0.45,
        duration: 1000,
        delay: Phaser.Math.Between(200, 500),
        ease: 'Sine.easeOut',
      });
    }

    const rightTrees = [
      { key: 'city_tree_1', x: w - 50, scale: 1.0 },
      { key: 'tree_2', x: w - 110, scale: 0.7 },
      { key: 'city_tree_2', x: w + 5, scale: 1.1 },
    ];
    for (const t of rightTrees) {
      if (!this.textures.exists(t.key)) {
        console.warn(`[Asset Validation] Missing tree texture: ${t.key}`);
        continue;
      }
      const img = this.add.image(t.x, h + 5, t.key);
      img.setOrigin(0.5, 1);
      img.setScale(t.scale);
      img.setDepth(5);
      img.setAlpha(0);
      img.setTint(0x1a2a1a);
      this.tweens.add({
        targets: img,
        alpha: 0.45,
        duration: 1000,
        delay: Phaser.Math.Between(200, 500),
        ease: 'Sine.easeOut',
      });
    }

    const bushPositions = [
      { x: w * 0.08, key: 'bush_1' },
      { x: w * 0.25, key: 'bush_2' },
      { x: w * 0.75, key: 'bush_3' },
      { x: w * 0.92, key: 'bush_1' },
    ];
    for (const b of bushPositions) {
      if (!this.textures.exists(b.key)) {
        console.warn(`[Asset Validation] Missing bush texture: ${b.key}`);
        continue;
      }
      const bush = this.add.image(b.x, h * 0.78 + 10, b.key);
      bush.setOrigin(0.5, 0);
      bush.setScale(Phaser.Math.FloatBetween(0.5, 0.8));
      bush.setDepth(6);
      bush.setAlpha(0.5);
    }

    for (let i = 0; i < 8; i++) {
      const key = flowerKeys[i % flowerKeys.length];
      if (!this.textures.exists(key)) {
        console.warn(`[Asset Validation] Missing flower texture: ${key}`);
        continue;
      }
      const flower = this.add.image(
        Phaser.Math.Between(0, w),
        h * 0.78 + Phaser.Math.Between(5, 20),
        key
      );
      flower.setOrigin(0.5, 0);
      flower.setScale(Phaser.Math.FloatBetween(0.5, 0.9));
      flower.setDepth(7);
      flower.setAlpha(Phaser.Math.FloatBetween(0.35, 0.6));

      this.tweens.add({
        targets: flower,
        angle: { from: -2, to: 2 },
        duration: Phaser.Math.Between(2000, 3500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1500),
      });
    }

    const stoneKeys = ['stone_1', 'stone_2', 'stone_3', 'stone_4'];
    for (let i = 0; i < 4; i++) {
      const key = stoneKeys[i % stoneKeys.length];
      if (!this.textures.exists(key)) {
        console.warn(`[Asset Validation] Missing stone texture: ${key}`);
        continue;
      }
      const stone = this.add.image(
        Phaser.Math.Between(50, w - 50),
        h * 0.78 + Phaser.Math.Between(2, 12),
        key
      );
      stone.setOrigin(0.5, 0);
      stone.setScale(Phaser.Math.FloatBetween(0.5, 0.8));
      stone.setDepth(5);
      stone.setAlpha(0.4);
    }
  }

  // ================================================================
  //  FIREFLIES
  // ================================================================
  private createFireflies(w: number, h: number): void {
    for (let i = 0; i < 16; i++) {
      const g = this.add.graphics();
      g.setDepth(8);

      g.fillStyle(0xffffaa, 0.04);
      g.fillCircle(0, 0, 14);
      g.fillStyle(0xffff88, 0.10);
      g.fillCircle(0, 0, 8);
      g.fillStyle(0xffffee, 0.3);
      g.fillCircle(0, 0, 3);

      const startX = Phaser.Math.Between(30, w - 30);
      const startY = Phaser.Math.Between(h * 0.3, h * 0.72);
      g.setPosition(startX, startY);
      g.setAlpha(0);

      this.animateFirefly(g, i);
    }
  }

  private animateFirefly(g: Phaser.GameObjects.Graphics, index: number): void {
    const startDelay = 1500 + index * 120;
    const floatDuration = Phaser.Math.Between(4000, 8000);
    const targetX = g.x + Phaser.Math.Between(-50, 50);
    const targetY = g.y + Phaser.Math.Between(-40, 20);

    this.tweens.add({
      targets: g,
      alpha: { from: 0, to: Phaser.Math.FloatBetween(0.4, 0.7) },
      duration: 1000,
      delay: startDelay,
      ease: 'Sine.easeIn',
    });

    this.tweens.add({
      targets: g,
      x: targetX,
      y: targetY,
      duration: floatDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: startDelay + 1000,
    });

    this.tweens.add({
      targets: g,
      alpha: { from: Phaser.Math.FloatBetween(0.3, 0.6), to: Phaser.Math.FloatBetween(0.05, 0.2) },
      duration: Phaser.Math.Between(600, 1500),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: startDelay + 500 + Phaser.Math.Between(0, 2000),
    });
  }

  // ================================================================
  //  VIGNETTE
  // ================================================================
  private createVignette(w: number, h: number): void {
    const v = this.add.graphics();
    v.setDepth(20);

    v.fillStyle(0x000000, 0.20);
    v.fillRect(0, 0, w, 40);
    v.fillRect(0, h - 40, w, 40);
    v.fillRect(0, 0, 40, h);
    v.fillRect(w - 40, 0, 40, h);

    v.fillStyle(0x000000, 0.08);
    v.fillRect(40, 0, w - 80, 8);
    v.fillRect(40, h - 8, w - 80, 8);
    v.fillRect(0, 0, 8, h);
    v.fillRect(w - 8, 0, 8, h);
  }

  // ================================================================
  //  TITLE
  // ================================================================
  private createTitle(w: number, h: number): void {
    const cx = w / 2;
    const titleY = h * 0.185;

    const glowGraphics = this.add.graphics();
    glowGraphics.setDepth(10);
    glowGraphics.fillStyle(0x8fd14f, 0.06);
    glowGraphics.fillCircle(cx, titleY + 10, 180);
    glowGraphics.fillStyle(0x8fd14f, 0.04);
    glowGraphics.fillCircle(cx, titleY + 10, 260);

    const titleContainer = this.add.container(cx, titleY);
    titleContainer.setDepth(11);

    const shadowText = this.add.text(4, 4, 'WILD HAVEN', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '84px',
      fontStyle: 'bold',
      color: '#0d1511',
    }).setOrigin(0.5);

    const titleText = this.add.text(0, 0, 'WILD HAVEN', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '84px',
      fontStyle: 'bold',
      color: '#8fd14f',
    }).setOrigin(0.5);
    titleText.setShadow(0, 0, '#8fd14f', 20, true, true);

    const subtitleText = this.add.text(0, 56, 'Cozy Creature Sanctuary', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      color: '#fff7e6',
    }).setOrigin(0.5);
    subtitleText.setShadow(0, 0, '#000000', 6, true, true);

    titleContainer.add([shadowText, titleText, subtitleText]);

    this.tweens.add({
      targets: titleContainer,
      y: titleContainer.y - 7,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 2500,
    });

    titleContainer.setScale(0);
    titleContainer.setAlpha(0);
    (titleContainer as any).__entranceDelay = 400;
  }

  // ================================================================
  //  SUNLIGHT & LEAVES
  // ================================================================
  private createSunlight(w: number, h: number): void {
    const sunGlow = this.add.graphics();
    sunGlow.setDepth(14);
    sunGlow.fillStyle(0xfff0aa, 0.15);
    // Soft diagonal sunlight rays
    sunGlow.beginPath();
    sunGlow.moveTo(w * 0.8, -50);
    sunGlow.lineTo(w + 50, -50);
    sunGlow.lineTo(w * 0.4, h + 50);
    sunGlow.lineTo(w * 0.2, h + 50);
    sunGlow.closePath();
    sunGlow.fill();

    this.tweens.add({
      targets: sunGlow,
      alpha: { from: 0.15, to: 0.25 },
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createFloatingLeaves(w: number, h: number): void {
    for (let i = 0; i < 15; i++) {
      const leaf = this.add.graphics();
      leaf.setDepth(16);
      leaf.fillStyle(0x44aa44, 0.6);
      leaf.fillEllipse(0, 0, 6, 3);
      
      const startX = Phaser.Math.Between(0, w);
      const startY = Phaser.Math.Between(-50, h * 0.5);
      leaf.setPosition(startX, startY);
      
      this.tweens.add({
        targets: leaf,
        x: startX - Phaser.Math.Between(100, 300),
        y: startY + Phaser.Math.Between(100, 300),
        angle: 360,
        duration: Phaser.Math.Between(4000, 8000),
        repeat: -1,
        ease: 'Sine.linear',
        onRepeat: () => {
          leaf.setPosition(Phaser.Math.Between(0, w + 200), -20);
        }
      });
    }
  }

  // ================================================================
  //  BUTTONS (bigger)
  // ================================================================
  private createButtons(w: number, h: number): void {
    const cx = w / 2;
    const startY = h * 0.46; // adjusted up to fit more buttons
    let yOffset = 0;
    let entranceIdx = 0;

    const hasSave = localStorage.getItem('wildhaven_save_v1') !== null;

    this.createButton(cx, startY + yOffset, 'New Game', 300, 60, 24, () => {
      AudioManager.playSfx('ui_confirm');
      SaveSystem.resetGame();
      AudioManager.fadeOutAndStop(800);
      this.cameras.main.fadeOut(800, 26, 35, 30);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('TravelScene', { targetScene: 'SanctuaryScene' });
      });
    }, entranceIdx++);
    yOffset += 70;

    if (hasSave) {
      this.createButton(cx, startY + yOffset, 'Load Game', 300, 60, 24, () => {
        AudioManager.playSfx('ui_confirm');
        AudioManager.fadeOutAndStop(800);
        this.cameras.main.fadeOut(800, 26, 35, 30);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('TravelScene', { targetScene: 'SanctuaryScene' });
        });
      }, entranceIdx++);
      yOffset += 70;
    }

    this.createButton(cx, startY + yOffset, 'Settings', 300, 60, 24, () => {
      AudioManager.playSfx('ui_tap');
      this.scene.launch('UIScene');
      this.time.delayedCall(50, () => {
        const uiScene = this.scene.get('UIScene') as any;
        if (uiScene && uiScene.showSettingsPanel) {
          uiScene.showSettingsPanel();
        }
      });
    }, entranceIdx++);
    yOffset += 70;

    this.createButton(cx, startY + yOffset, 'Credit', 300, 60, 24, () => {
      AudioManager.playSfx('ui_tap');
      this.showCreditPanel(w, h);
    }, entranceIdx++);
    yOffset += 70;

    this.createButton(cx, startY + yOffset, 'Exit Game', 300, 60, 24, () => {
      AudioManager.playSfx('ui_tap');
      if (window.confirm("Are you sure you want to exit?")) {
        window.close();
      }
    }, entranceIdx++);
  }

  private showCreditPanel(w: number, h: number): void {
    const container = this.add.container(w / 2, h / 2);
    container.setDepth(100);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-w/2, -h/2, w, h);
    overlay.setInteractive(new Phaser.Geom.Rectangle(-w/2, -h/2, w, h), Phaser.Geom.Rectangle.Contains);
    
    const bg = this.add.nineslice(0, 0, 'modal_window', 0, 400, 500, 32, 32, 32, 32);

    const title = this.add.text(0, -200, 'CREDITS', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    // Photo from credit.jpeg
    const photoFrame = this.add.graphics();
    photoFrame.fillStyle(0x8c765c, 1);
    photoFrame.fillRoundedRect(-65, -150, 130, 130, 16);
    
    const photoImg = this.add.image(0, -85, 'developer_photo');
    // Scale photo to cover the 120x120 frame completely
    const side = Math.min(photoImg.width, photoImg.height);
    const scaleFactor = 120 / (side > 0 ? side : 1);
    photoImg.setScale(scaleFactor);
    
    // Optional: create a rounded mask for the photo to fit inside the frame nicely
    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRoundedRect(-60, -145, 120, 120, 12);
    // Position the mask geometry relative to the world position
    maskShape.setPosition(w / 2, h / 2);
    maskShape.setVisible(false); // Fix white background bug
    const mask = maskShape.createGeometryMask();
    photoImg.setMask(mask);
    
    const photoText = this.add.text(0, -15, 'Developer', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '11px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const bioTitle = this.add.text(0, 15, 'Maulana Ahmad Zahiri', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#8fd14f'
    }).setOrigin(0.5);

    const bioDesc = this.add.text(0, 85, 'NRP: 5027231010\nmaulanazahiri31@gmail.com\n\nKuliah Pengantar Pengembangan Game ITS 2026\nDosen: Imam Kuswardayan, S.Kom, M.T', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '13px',
      lineSpacing: 4,
      color: '#5c4832',
      align: 'center'
    }).setOrigin(0.5);

    const closeBtn = this.add.nineslice(0, 180, 'button', 0, 140, 45, 12, 12, 12, 12);
    closeBtn.setInteractive({ useHandCursor: true });
    
    const closeTxt = this.add.text(0, 180, 'Close', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    closeBtn.on('pointerover', () => {
      closeBtn.setTint(0xffeedd);
      AudioManager.playSfx('button_hover');
    });
    closeBtn.on('pointerout', () => {
      closeBtn.clearTint();
    });
    closeBtn.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      maskShape.destroy();
      container.destroy();
    });
    container.add([overlay, bg, title, photoFrame, photoImg, photoText, bioTitle, bioDesc, closeBtn, closeTxt]);

    // Popup animation
    container.setScale(0.1);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  private createButton(
    x: number, y: number,
    label: string,
    btnW: number, btnH: number, fontSize: number,
    callback: () => void,
    entranceIndex: number,
  ): void {
    if (!this.textures.exists('button')) return;

    const container = this.add.container(x, y);
    container.setDepth(12);
    container.setAlpha(0);
    container.setScale(0.7);

    const btnBg = this.add.nineslice(0, 0, 'button', 0, btnW, btnH, 8, 8, 8, 8);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 0, label, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color: '#5c4832',
    }).setOrigin(0.5);

    container.add([btnBg, btnText]);

    btnBg.on('pointerover', () => {
      AudioManager.playSfx('button_hover');
      this.tweens.add({
        targets: container,
        scale: 1.06,
        duration: 120,
        ease: 'Back.easeOut',
      });
      btnBg.setTint(0xffeedd);
    });

    btnBg.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1.0,
        duration: 120,
        ease: 'Sine.easeOut',
      });
      btnBg.clearTint();
    });

    btnBg.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scale: 0.95,
        duration: 50,
        yoyo: true,
        ease: 'Quad.easeIn',
        onComplete: callback,
      });
    });

    (container as any).__entranceDelay = 1000 + entranceIndex * 300;
  }

  // ================================================================
  //  FLOATING PARTICLES
  // ================================================================
  private createFloatingParticles(w: number, h: number): void {
    for (let i = 0; i < 10; i++) {
      const p = this.add.graphics();
      p.setDepth(15);

      const colors = [0xffdd88, 0xffaa66, 0xffeecc, 0x8fd14f];
      const color = colors[i % colors.length];
      p.fillStyle(color, 0.4);
      p.fillCircle(0, 0, 2 + Math.random() * 3);

      const startX = Phaser.Math.Between(w * 0.2, w * 0.8);
      const startY = Phaser.Math.Between(h * 0.1, h * 0.35);
      p.setPosition(startX, startY);
      p.setAlpha(0);

      this.tweens.add({
        targets: p,
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.2, 0.5) },
        duration: 1000,
        delay: 2000 + i * 300,
        ease: 'Sine.easeIn',
      });

      this.tweens.add({
        targets: p,
        x: startX + Phaser.Math.Between(-60, 60),
        y: startY + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 2500 + i * 300,
      });

      this.tweens.add({
        targets: p,
        alpha: { from: 0.3, to: 0.05 },
        duration: Phaser.Math.Between(800, 1500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 2500 + i * 200 + Phaser.Math.Between(0, 1000),
      });
    }
  }

  // ================================================================
  //  ENTRANCE SEQUENCE
  // ================================================================
  private playEntranceSequence(): void {
    const elements: Phaser.GameObjects.GameObject[] = [];
    this.children.each((child) => {
      if ((child as any).__entranceDelay !== undefined) {
        elements.push(child);
      }
    });
    elements.sort((a, b) => (a as any).__entranceDelay - (b as any).__entranceDelay);

    for (const el of elements) {
      const delay = (el as any).__entranceDelay as number;
      const entranceType = (el as any).__entranceType as string | undefined;

      if (el instanceof Phaser.GameObjects.Container) {
        this.tweens.add({
          targets: el,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          duration: 600,
          delay,
          ease: 'Back.easeOut',
        });
      } else if (el instanceof Phaser.GameObjects.Sprite) {
        if (entranceType === 'bounce') {
          this.tweens.add({
            targets: el,
            alpha: 1,
            y: (el as Phaser.GameObjects.Sprite).y - 18,
            duration: 650,
            delay,
            ease: 'Back.easeOut',
            onComplete: () => {
              this.tweens.add({
                targets: el,
                y: (el as Phaser.GameObjects.Sprite).y + 18,
                duration: 500,
                ease: 'Sine.easeOut',
              });
            },
          });
        } else {
          this.tweens.add({
            targets: el,
            alpha: 1,
            duration: 500,
            delay,
            ease: 'Sine.easeOut',
          });
        }
      }
    }
  }
}
