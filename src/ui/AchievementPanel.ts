// src/ui/AchievementPanel.ts
import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { DataLoader } from '../data/DataLoader';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';

export class AchievementPanel extends Phaser.GameObjects.Container {
  private panelBg!: Phaser.GameObjects.NineSlice;
  private rows: Phaser.GameObjects.Container[] = [];
  
  private pageText!: Phaser.GameObjects.Text;
  private prevBtn!: Phaser.GameObjects.Text;
  private nextBtn!: Phaser.GameObjects.Text;
  
  private currentPage = 0;
  private itemsPerPage = 5;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const width = 760;
    const height = 580;

    // Main Panel Background
    this.panelBg = scene.add.nineslice(0, 0, 'modal_window', 0, width, height, 32, 32, 32, 32);
    this.add(this.panelBg);

    // Title
    const title = scene.add.text(0, -height / 2 + 25, 'ACHIEVEMENTS', {
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

    // Page Navigation
    this.pageText = scene.add.text(0, height / 2 - 25, 'Page 1 of 4', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.add(this.pageText);

    // Prev Button
    const prevContainer = scene.add.container(-100, height / 2 - 25);
    const prevBg = scene.add.image(0, 0, 'button_small').setScale(0.85).setInteractive({ useHandCursor: true });
    const prevTxt = scene.add.text(0, -2, '◀', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    prevContainer.add([prevBg, prevTxt]);
    this.prevBtn = prevTxt;
    this.add(prevContainer);

    prevBg.on('pointerover', () => {
      if (this.currentPage > 0) {
        prevBg.setTexture('button_small_hover');
        scene.tweens.add({ targets: prevContainer, scale: 1.05, duration: 80 });
        AudioManager.playSfx('button_hover');
      }
    });
    prevBg.on('pointerout', () => {
      prevBg.setTexture('button_small');
      prevBg.y = 0;
      prevTxt.y = -2;
      scene.tweens.add({ targets: prevContainer, scale: 1.0, duration: 80 });
    });
    prevBg.on('pointerdown', () => {
      if (this.currentPage > 0) {
        prevBg.setTexture('button_small_click');
        prevBg.y = 2; // Y translation downwards by 2px
        prevTxt.y = 0;
        scene.tweens.add({ targets: prevContainer, scale: 0.95, duration: 40 });
      }
    });
    prevBg.on('pointerup', () => {
      if (this.currentPage > 0) {
        prevBg.setTexture('button_small_hover');
        prevBg.y = 0;
        prevTxt.y = -2;
        scene.tweens.add({ targets: prevContainer, scale: 1.05, duration: 40 });
        this.changePage(-1);
      }
    });

    // Next Button
    const nextContainer = scene.add.container(100, height / 2 - 25);
    const nextBg = scene.add.image(0, 0, 'button_small').setScale(0.85).setInteractive({ useHandCursor: true });
    const nextTxt = scene.add.text(0, -2, '▶', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    nextContainer.add([nextBg, nextTxt]);
    this.nextBtn = nextTxt;
    this.add(nextContainer);

    nextBg.on('pointerover', () => {
      const achievements = DataLoader.getAchievements();
      const totalPages = Math.max(1, Math.ceil(achievements.length / this.itemsPerPage));
      if (this.currentPage < totalPages - 1) {
        nextBg.setTexture('button_small_hover');
        scene.tweens.add({ targets: nextContainer, scale: 1.05, duration: 80 });
        AudioManager.playSfx('button_hover');
      }
    });
    nextBg.on('pointerout', () => {
      nextBg.setTexture('button_small');
      nextBg.y = 0;
      nextTxt.y = -2;
      scene.tweens.add({ targets: nextContainer, scale: 1.0, duration: 80 });
    });
    nextBg.on('pointerdown', () => {
      const achievements = DataLoader.getAchievements();
      const totalPages = Math.max(1, Math.ceil(achievements.length / this.itemsPerPage));
      if (this.currentPage < totalPages - 1) {
        nextBg.setTexture('button_small_click');
        nextBg.y = 2; // Y translation downwards by 2px
        nextTxt.y = 0;
        scene.tweens.add({ targets: nextContainer, scale: 0.95, duration: 40 });
      }
    });
    nextBg.on('pointerup', () => {
      const achievements = DataLoader.getAchievements();
      const totalPages = Math.max(1, Math.ceil(achievements.length / this.itemsPerPage));
      if (this.currentPage < totalPages - 1) {
        nextBg.setTexture('button_small_hover');
        nextBg.y = 0;
        nextTxt.y = -2;
        scene.tweens.add({ targets: nextContainer, scale: 1.05, duration: 40 });
        this.changePage(1);
      }
    });

    this.setVisible(false);

    // Re-draw when progress increments
    EventBus.on('achievementUnlocked', () => {
      if (this.visible) this.refresh();
    });
  }

  public show(): void {
    this.currentPage = 0;
    this.refresh();
    this.setVisible(true);
  }

  private changePage(dir: number): void {
    const achievements = DataLoader.getAchievements();
    const totalPages = Math.max(1, Math.ceil(achievements.length / this.itemsPerPage));
    const target = this.currentPage + dir;

    if (target >= 0 && target < totalPages) {
      AudioManager.playSfx('ui_tap');
      this.currentPage = target;
      this.refresh();
    }
  }

  public refresh(): void {
    this.rows.forEach(r => r.destroy());
    this.rows = [];

    const state = SaveSystem.getState();
    const achievements = DataLoader.getAchievements();
    const totalPages = Math.max(1, Math.ceil(achievements.length / this.itemsPerPage));

    if (this.currentPage >= totalPages) {
      this.currentPage = totalPages - 1;
    }

    this.pageText.setText(`Page ${this.currentPage + 1} of ${totalPages}`);

    const prevBg = this.prevBtn.parentContainer?.list[0] as Phaser.GameObjects.Image;
    if (prevBg) {
      if (this.currentPage === 0) {
        prevBg.disableInteractive();
        this.prevBtn.parentContainer.setAlpha(0.3);
      } else {
        prevBg.setInteractive({ useHandCursor: true });
        this.prevBtn.parentContainer.setAlpha(1.0);
      }
    }

    const nextBg = this.nextBtn.parentContainer?.list[0] as Phaser.GameObjects.Image;
    if (nextBg) {
      if (this.currentPage === totalPages - 1) {
        nextBg.disableInteractive();
        this.nextBtn.parentContainer.setAlpha(0.3);
      } else {
        nextBg.setInteractive({ useHandCursor: true });
        this.nextBtn.parentContainer.setAlpha(1.0);
      }
    }

    const startIdx = this.currentPage * this.itemsPerPage;
    const endIdx = Math.min(achievements.length, startIdx + this.itemsPerPage);

    const startY = -120;
    const rowHeight = 55;

    for (let i = startIdx; i < endIdx; i++) {
      const ach = achievements[i];
      const isUnlocked = state.achievementsUnlocked.includes(ach.id);
      
      // Calculate current progress
      const progressValue = state.achievementProgress[ach.metric] || 0;
      const progressPercent = Math.min(1.0, progressValue / ach.goal);

      const rowIdx = i - startIdx;
      const y = startY + rowIdx * rowHeight;

      const rowContainer = this.scene.add.container(0, y);

      // Row background slot
      const rowBg = this.scene.add.nineslice(0, 0, 'button', 0, 500, 48, 18, 18, 12, 12);
      if (isUnlocked) {
        rowBg.setTint(0x8a5200); // darker gold/brown tint for contrast
      } else {
        rowBg.setTint(0x4a3b2c); // dark brown tint for contrast
      }
      rowContainer.add(rowBg);

      // Status Badge Icon
      const badgeText = isUnlocked ? '🏆' : '🔒';
      const badge = this.scene.add.text(-225, 0, badgeText, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '18px'
      }).setOrigin(0.5);
      rowContainer.add(badge);

      // Achievement Title
      const title = this.scene.add.text(-190, -10, ach.name, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      rowContainer.add(title);

      // Achievement Description
      const desc = this.scene.add.text(-190, 8, ach.description, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '10px',
        color: '#e0e0e0'
      }).setOrigin(0, 0.5);
      rowContainer.add(desc);

      // Progress value text (e.g. 5/10)
      const progValText = this.scene.add.text(120, -10, `${Math.min(ach.goal, progressValue)} / ${ach.goal}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
      rowContainer.add(progValText);

      // Mini Progress bar graphic
      const miniBar = this.scene.add.graphics();
      // BG
      miniBar.fillStyle(0xd5c4b4, 1);
      miniBar.fillRoundedRect(60, 4, 120, 6, 3);
      // FG
      if (progressPercent > 0) {
        miniBar.fillStyle(isUnlocked ? 0x8fd14f : 0xd1b48c, 1);
        miniBar.fillRoundedRect(60, 4, 120 * progressPercent, 6, 3);
      }
      rowContainer.add(miniBar);

      // Rewards display text
      let rewStr = '';
      if (ach.reward.coins) rewStr += `💰${ach.reward.coins} `;
      if (ach.reward.gems) rewStr += `💎${ach.reward.gems} `;
      if (ach.reward.xp) rewStr += `⭐${ach.reward.xp} `;
      if (ach.reward.title) rewStr += `🏷️"${ach.reward.title}" `;
      if (ach.reward.unlocks) rewStr += `🔓Gear `;

      const rewardText = this.scene.add.text(210, 0, rewStr.trim(), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#8a5200'
      }).setOrigin(0.5);
      rowContainer.add(rewardText);

      this.rows.push(rowContainer);
      this.add(rowContainer);
    }
  }
}
