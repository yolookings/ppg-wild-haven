// src/ui/SettingsPanel.ts
import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioManager } from '../systems/AudioManager';


export class SettingsPanel extends Phaser.GameObjects.Container {
  private panelBg!: Phaser.GameObjects.NineSlice;
  

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const width = 700;
    const height = 600;

    // Background Panel
    this.panelBg = scene.add.nineslice(0, 0, 'modal_window', 0, width, height, 32, 32, 32, 32);
    this.add(this.panelBg);

    // Title
    const title = scene.add.text(0, -height / 2 + 35, 'SETTINGS', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '24px',
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

    const state = SaveSystem.getState();

    // Volume Sliders Container
    let startY = -height / 2 + 90;

    // Music Volume
    const musicLabel = scene.add.text(-180, startY, 'Music Volume', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      fontStyle: 'normal',
      color: '#5c4832'
    });
    this.add(musicLabel);
    
    const musicSlider = new Slider(scene, 30, startY + 8, 250, state.settings.musicVolume, (val) => {
      state.settings.musicVolume = val;
      SaveSystem.markDirty();
      AudioManager.updateVolumes();
    });
    this.add(musicSlider);

    // SFX Volume
    startY += 50;
    const sfxLabel = scene.add.text(-180, startY, 'SFX Volume', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      fontStyle: 'normal',
      color: '#5c4832'
    });
    this.add(sfxLabel);

    const sfxSlider = new Slider(scene, 30, startY + 8, 250, state.settings.sfxVolume, (val) => {
      state.settings.sfxVolume = val;
      SaveSystem.markDirty();
      AudioManager.updateVolumes();
    });
    this.add(sfxSlider);

    // Mute Toggle
    startY += 55;
    const muteLabel = scene.add.text(-180, startY, 'Mute Audio', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      fontStyle: 'normal',
      color: '#5c4832'
    });
    this.add(muteLabel);

    const muteToggle = scene.add.text(50, startY, state.settings.muted ? 'ON' : 'OFF', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: state.settings.muted ? '#b05fe0' : '#5c4832'
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    
    muteToggle.on('pointerdown', () => {
      state.settings.muted = !state.settings.muted;
      muteToggle.setText(state.settings.muted ? 'ON' : 'OFF');
      muteToggle.setColor(state.settings.muted ? '#b05fe0' : '#5c4832');
      SaveSystem.markDirty();
      AudioManager.updateVolumes();
      AudioManager.playSfx('ui_tap');
    });
    this.add(muteToggle);

    // Reduce Motion Toggle
    startY += 40;
    const motionLabel = scene.add.text(-180, startY, 'Reduce Motion', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      fontStyle: 'normal',
      color: '#5c4832'
    });
    this.add(motionLabel);

    const motionToggle = scene.add.text(50, startY, state.settings.reduceMotion ? 'ON' : 'OFF', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: state.settings.reduceMotion ? '#b05fe0' : '#5c4832'
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

    motionToggle.on('pointerdown', () => {
      state.settings.reduceMotion = !state.settings.reduceMotion;
      motionToggle.setText(state.settings.reduceMotion ? 'ON' : 'OFF');
      motionToggle.setColor(state.settings.reduceMotion ? '#b05fe0' : '#5c4832');
      SaveSystem.markDirty();
      AudioManager.playSfx('ui_tap');
    });
    this.add(motionToggle);

    // Save Export/Import Actions
    startY += 65;
    
    this.createActionButton(-110, startY, 'Copy Save Code', () => {
      const code = SaveSystem.exportSaveCode();
      navigator.clipboard.writeText(code).then(() => {
        alert('Save code copied to clipboard!');
      });
      AudioManager.playSfx('ui_confirm');
    });

    this.createActionButton(110, startY, 'Paste Save Code', () => {
      const code = prompt('Paste your save code here:');
      if (code) {
        const success = SaveSystem.importSaveCode(code);
        if (success) {
          alert('Save game imported successfully! Reloading...');
          window.location.reload();
        } else {
          alert('Invalid save code. Please try again.');
        }
      }
      AudioManager.playSfx('ui_tap');
    });

    // Back to Homescreen & Reset Progress
    startY += 60;
    this.createActionButton(-110, startY, 'Back to Homescreen', () => {
      SaveSystem.forceSave();
      AudioManager.fadeOutAndStop(800);
      this.scene.cameras.main.fadeOut(800, 26, 35, 30);
      this.scene.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.scene.stop('SanctuaryScene');
        this.scene.scene.stop('ExploreScene');
        this.scene.scene.start('MainMenuScene');
      });
    });

    this.createActionButton(110, startY, 'RESET ALL PROGRESS', () => {
      if (confirm('Are you absolutely sure you want to delete all your progress? This cannot be undone.')) {
        SaveSystem.resetGame();
        alert('Your sanctuary has been reset. Starting anew!');
        window.location.reload();
      }
    }, '#ff5c8a');

    // Credits
    const credits = scene.add.text(0, height / 2 - 25, 'Wild Haven v1.0 • Built with Phaser & love', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '11px',
      color: '#8c765c'
    }).setOrigin(0.5);
    this.add(credits);

    this.setVisible(false);
  }

  private createActionButton(x: number, y: number, text: string, callback: () => void, color = '#5c4832'): void {
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.nineslice(0, 0, 'button', 0, 190, 38, 18, 18, 12, 12);
    bg.setInteractive({ useHandCursor: true });
    
    const txt = this.scene.add.text(0, -2, text, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: color
    }).setOrigin(0.5);

    container.add([bg, txt]);

    bg.on('pointerover', () => {
      bg.setTexture('button_hover');
      this.scene.tweens.add({
        targets: container,
        scale: 1.05,
        duration: 80
      });
      AudioManager.playSfx('button_hover');
    });

    bg.on('pointerout', () => {
      bg.setTexture('button');
      bg.y = 0;
      txt.y = -2;
      this.scene.tweens.add({
        targets: container,
        scale: 1.0,
        duration: 80
      });
    });

    bg.on('pointerdown', () => {
      bg.setTexture('button_click');
      bg.y = 2; // Y translation downwards by 2px
      txt.y = 0;
      this.scene.tweens.add({
        targets: container,
        scale: 0.95, // 0.95x scale reduction
        duration: 40
      });
    });

    bg.on('pointerup', () => {
      bg.setTexture('button_hover');
      bg.y = 0;
      txt.y = -2;
      this.scene.tweens.add({
        targets: container,
        scale: 1.05,
        duration: 40
      });
      callback();
    });

    this.add(container);
  }
}

// Simple custom slider helper class
class Slider extends Phaser.GameObjects.Container {
  
  private sliderWidth: number;
  private progress: number;
  private track!: Phaser.GameObjects.Graphics;
  private handle!: Phaser.GameObjects.Arc;
  private onChange: (val: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, startVal: number, onChange: (val: number) => void) {
    super(scene, x, y);
    this.sliderWidth = width;
    this.progress = startVal;
    this.onChange = onChange;

    this.track = scene.add.graphics();
    this.add(this.track);

    this.handle = scene.add.arc(this.progress * width, 0, 8, 0, 360, false, 0xd1b48c);
    this.handle.setInteractive({ useHandCursor: true, draggable: true });
    this.add(this.handle);

    this.drawTrack();

    scene.input.setDraggable(this.handle);
    
    this.handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const clampedX = Math.max(0, Math.min(this.sliderWidth, dragX));
      this.handle.x = clampedX;
      this.progress = clampedX / this.sliderWidth;
      this.drawTrack();
      this.onChange(this.progress);
    });
  }

  private drawTrack(): void {
    this.track.clear();
    // Track background
    this.track.fillStyle(0xd5c4b4, 1);
    this.track.fillRoundedRect(0, -3, this.sliderWidth, 6, 3);
    // Track progress
    this.track.fillStyle(0x5c4832, 1);
    this.track.fillRoundedRect(0, -3, this.handle.x, 6, 3);
  }
}
