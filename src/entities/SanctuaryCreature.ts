// src/entities/SanctuaryCreature.ts
import Phaser from 'phaser';
import { OwnedCreature, Creature } from '../data/types';
import { DataLoader } from '../data/DataLoader';
import { EconomySystem } from '../systems/EconomySystem';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { SaveSystem } from '../systems/SaveSystem';

export class SanctuaryCreature extends Phaser.GameObjects.Container {
  public ownedData: OwnedCreature;
  public creatureData: Creature;
  
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Graphics;
  private nameTagBg!: Phaser.GameObjects.Graphics;
  private nameTagText!: Phaser.GameObjects.Text;
  
  private coinTimer!: Phaser.Time.TimerEvent;
  private onClickCallback: (c: SanctuaryCreature) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, ownedData: OwnedCreature, onClick: (c: SanctuaryCreature) => void) {
    super(scene, x, y);
    this.ownedData = ownedData;
    this.onClickCallback = onClick;
    this.creatureData = DataLoader.getCreature(ownedData.creatureId)!;

    // 1. Shadow underneath
    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.15);
    this.shadow.fillEllipse(0, 8, 14, 4);
    this.add(this.shadow);

    // 2. Sprite matching fallback
    let spriteKey = 'creature_meadow';
    if (this.creatureData.area === 'whisper_forest') spriteKey = 'creature_forest';
    else if (this.creatureData.area === 'crystal_mountain') spriteKey = 'creature_mountain';
    else if (this.creatureData.area === 'golden_dunes') spriteKey = 'creature_dunes';
    else if (this.creatureData.area === 'sky_island') spriteKey = 'creature_sky';

    this.sprite = scene.add.sprite(0, 0, spriteKey);
    this.sprite.setScale(0.65); // Smaller size!
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

    // 4. Idle Squash/Stretch
    scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.65 * 1.1,
      scaleX: 0.65 * 1.25,
      y: 1,
      duration: 1200 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 5. Setup periodic coin ticking
    this.startCoinProduction();
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

    const popContainer = this.scene.add.container(this.x, this.y - 12);
    
    const coinImg = this.scene.add.image(-12, 0, 'coin').setScale(0.9);
    const textStr = `+${amount}`;
    const txt = this.scene.add.text(4, 0, textStr, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#8a5200'
    }).setOrigin(0, 0.5);

    popContainer.add([coinImg, txt]);
    popContainer.setDepth(10);
    this.scene.add.existing(popContainer);

    this.scene.tweens.add({
      targets: popContainer,
      y: popContainer.y - 45,
      alpha: 0,
      scale: 1.1,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => popContainer.destroy()
    });

    // Bounce the creature sprite briefly on cash out
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.65 * 1.3,
      scaleX: 0.65 * 0.9,
      y: -5,
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  public destroy(): void {
    if (this.coinTimer) {
      this.coinTimer.destroy();
    }
    super.destroy();
  }
}
