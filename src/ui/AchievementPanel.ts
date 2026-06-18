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

    const width = 560;
    const height = 430;

    // Background
    this.panelBg = scene.add.nineslice(0, 0, 'panel_frame', 0, width, height, 16, 16, 16, 16);
    this.add(this.panelBg);

    // Title
    const title = scene.add.text(0, -height / 2 + 25, 'ACHIEVEMENTS', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.add(title);

    // Close Button
    const closeBtn = scene.add.text(width / 2 - 30, -height / 2 + 25, '❌', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '18px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
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

    this.prevBtn = scene.add.text(-80, height / 2 - 25, '◀ Prev', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.prevBtn.on('pointerdown', () => this.changePage(-1));
    this.add(this.prevBtn);

    this.nextBtn = scene.add.text(80, height / 2 - 25, 'Next ▶', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.nextBtn.on('pointerdown', () => this.changePage(1));
    this.add(this.nextBtn);

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

    this.prevBtn.setAlpha(this.currentPage === 0 ? 0.3 : 1);
    this.prevBtn.setInteractive(this.currentPage > 0);
    this.nextBtn.setAlpha(this.currentPage === totalPages - 1 ? 0.3 : 1);
    this.nextBtn.setInteractive(this.currentPage < totalPages - 1);

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
      const rowBg = this.scene.add.nineslice(0, 0, 'button', 0, 500, 48, 6, 6, 6, 6);
      if (isUnlocked) {
        rowBg.setTint(0xfff7e6); // goldish tint
      } else {
        rowBg.setTint(0xe5dcd3); // grayish tint
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
        color: '#5c4832'
      }).setOrigin(0, 0.5);
      rowContainer.add(title);

      // Achievement Description
      const desc = this.scene.add.text(-190, 8, ach.description, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '10px',
        color: '#8c765c'
      }).setOrigin(0, 0.5);
      rowContainer.add(desc);

      // Progress value text (e.g. 5/10)
      const progValText = this.scene.add.text(120, -10, `${Math.min(ach.goal, progressValue)} / ${ach.goal}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#5c4832'
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
