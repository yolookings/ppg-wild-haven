// src/ui/DialoguePanel.ts
import Phaser from 'phaser';
import { DialogueStep } from '../systems/QuestManager';
import { DialogueManager } from '../systems/DialogueManager';
import { EventBus } from '../systems/EventBus';
import { AudioManager } from '../systems/AudioManager';

export class DialoguePanel extends Phaser.GameObjects.Container {
  private boxBg!: Phaser.GameObjects.Image;
  private speakerText!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private nextIndicator!: Phaser.GameObjects.Text;

  private portraitGraphics!: Phaser.GameObjects.Graphics;
  private portraitContainer!: Phaser.GameObjects.Container;
  private lunaPortraitImage!: Phaser.GameObjects.Image;
  private lunaBlinkTimer?: Phaser.Time.TimerEvent;

  private continueBtn!: Phaser.GameObjects.Image;
  private continueTxt!: Phaser.GameObjects.Text;
  private skipBtn!: Phaser.GameObjects.Image;
  private skipTxt!: Phaser.GameObjects.Text;

  private currentText = '';
  private fullText = '';
  private typingTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const width = 640;
    const height = 150;

    // 1. Text Box Background (using text-box.png asset)
    const scaleX = width / 1062;
    const scaleY = height / 315;
    this.boxBg = scene.add.image(0, 0, 'text-box').setScale(scaleX, scaleY);
    this.boxBg.setInteractive({ useHandCursor: true });
    this.add(this.boxBg);

    // 2. Speaker Name Tag
    this.speakerText = scene.add.text(-width / 2 + 130, -height / 2 + 16, 'Speaker', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px', // Larger font for RPG speaker tag
      fontStyle: 'bold',
      color: '#8a5200',
      stroke: '#fff7e6',
      strokeThickness: 3
    });
    this.add(this.speakerText);

    // 3. Dialogue Text Block (with wrapping)
    this.dialogueText = scene.add.text(-width / 2 + 130, -height / 2 + 45, '', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '17px', // Substantially larger font for dialogue readability
      color: '#5c4832',
      wordWrap: { width: 460, useAdvancedWrap: true },
      lineSpacing: 6 // Better line spacing
    });
    this.add(this.dialogueText);

    // 4. Portrait Panel
    this.portraitContainer = scene.add.container(-width / 2 + 65, 0);
    this.portraitGraphics = scene.add.graphics();
    this.portraitContainer.add(this.portraitGraphics);
    
    // Add pre-loaded Luna Image inside portrait container (starts hidden)
    this.lunaPortraitImage = scene.add.image(0, 0, 'luna_information');
    this.lunaPortraitImage.setScale(0.35);
    this.lunaPortraitImage.setVisible(false);
    this.portraitContainer.add(this.lunaPortraitImage);
    
    this.add(this.portraitContainer);

    // 5. Blinking 'Next' indicator
    this.nextIndicator = scene.add.text(width / 2 - 30, height / 2 - 25, '▶', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#8a5200'
    }).setOrigin(0.5);
    this.add(this.nextIndicator);

    // Blink indicator
    scene.tweens.add({
      targets: this.nextIndicator,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeInOut'
    });

    // 6. Visual SKIP and CONTINUE Buttons using small button assets
    this.continueBtn = scene.add.image(width / 2 - 45, height / 2 - 22, 'button_small').setScale(0.55).setInteractive({ useHandCursor: true });
    this.continueTxt = scene.add.text(width / 2 - 45, height / 2 - 22, 'NEXT', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    this.skipBtn = scene.add.image(width / 2 - 110, height / 2 - 22, 'button_small').setScale(0.55).setInteractive({ useHandCursor: true });
    this.skipTxt = scene.add.text(width / 2 - 110, height / 2 - 22, 'SKIP', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    this.add([this.continueBtn, this.continueTxt, this.skipBtn, this.skipTxt]);

    // Button interactions:
    this.continueBtn.on('pointerover', () => {
      this.continueBtn.setTexture('button_small_hover');
      scene.tweens.add({
        targets: [this.continueBtn, this.continueTxt],
        scale: 0.60,
        duration: 80
      });
      AudioManager.playSfx('button_hover');
    });
    this.continueBtn.on('pointerout', () => {
      this.continueBtn.setTexture('button_small');
      this.continueBtn.y = height / 2 - 22;
      this.continueTxt.y = height / 2 - 22;
      scene.tweens.add({
        targets: [this.continueBtn, this.continueTxt],
        scale: 0.55,
        duration: 50
      });
    });
    this.continueBtn.on('pointerdown', (pointer: any) => {
      pointer.downX = 0; // prevent dual triggers
      this.continueBtn.setTexture('button_small_click');
      this.continueBtn.y = height / 2 - 20; // Y translation downwards by 2px
      this.continueTxt.y = height / 2 - 20;
      scene.tweens.add({
        targets: [this.continueBtn, this.continueTxt],
        scale: 0.45, // scale reduction
        duration: 50
      });
    });
    this.continueBtn.on('pointerup', () => {
      this.continueBtn.setTexture('button_small_hover');
      this.continueBtn.y = height / 2 - 22;
      this.continueTxt.y = height / 2 - 22;
      scene.tweens.add({
        targets: [this.continueBtn, this.continueTxt],
        scale: 0.52,
        duration: 40
      });
      AudioManager.playSfx('ui_tap');
      DialogueManager.next();
    });

    this.skipBtn.on('pointerover', () => {
      this.skipBtn.setTexture('button_small_hover');
      scene.tweens.add({
        targets: [this.skipBtn, this.skipTxt],
        scale: 0.52,
        duration: 50
      });
      AudioManager.playSfx('button_hover');
    });
    this.skipBtn.on('pointerout', () => {
      this.skipBtn.setTexture('button_small');
      this.skipBtn.y = height / 2 - 22;
      this.skipTxt.y = height / 2 - 22;
      scene.tweens.add({
        targets: [this.skipBtn, this.skipTxt],
        scale: 0.55,
        duration: 50
      });
    });
    this.skipBtn.on('pointerdown', (pointer: any) => {
      pointer.downX = 0;
      this.skipBtn.setTexture('button_small_click');
      this.skipBtn.y = height / 2 - 20; // Y translation downwards by 2px
      this.skipTxt.y = height / 2 - 20;
      scene.tweens.add({
        targets: [this.skipBtn, this.skipTxt],
        scale: 0.45, // scale reduction
        duration: 40
      });
    });
    this.skipBtn.on('pointerup', () => {
      this.skipBtn.setTexture('button_small_hover');
      this.skipBtn.y = height / 2 - 22;
      this.skipTxt.y = height / 2 - 22;
      scene.tweens.add({
        targets: [this.skipBtn, this.skipTxt],
        scale: 0.52,
        duration: 40
      });
      AudioManager.playSfx('ui_tap');
      DialogueManager.endDialogue();
    });

    // Advance on clicking the box
    this.boxBg.on('pointerdown', (pointer: any) => {
      // Don't trigger box advance if buttons are clicked
      if (pointer.y > this.y + height / 2 - 40 && pointer.x > this.x + width / 2 - 160) {
        return;
      }
      AudioManager.playSfx('ui_tap');
      DialogueManager.next();
    });

    // Advance/skip on pressing SPACE or ENTER when dialogue is active
    scene.input.keyboard?.on('keydown-SPACE', () => {
      if (this.visible && DialogueManager.isDialogueActive()) {
        AudioManager.playSfx('ui_tap');
        DialogueManager.next();
      }
    });

    scene.input.keyboard?.on('keydown-ENTER', () => {
      if (this.visible && DialogueManager.isDialogueActive()) {
        AudioManager.playSfx('ui_tap');
        DialogueManager.next();
      }
    });

    this.setVisible(false);

    // Register Event Listeners
    EventBus.on('dialogueStarted', (step: DialogueStep) => this.showStep(step));
    EventBus.on('dialogueNextStep', (step: DialogueStep) => this.showStep(step));
    EventBus.on('dialogueSkipTyping', () => this.skipTyping());
    EventBus.on('dialogueEnded', () => this.hide());
  }

  private showStep(step: DialogueStep): void {
    this.setVisible(true);

    // Set Speaker
    this.speakerText.setText(step.speaker.toUpperCase());

    // Position speaker text and dialogue text depending on portrait side
    const width = 640;
    if (step.portraitSide === 'left') {
      this.portraitContainer.setPosition(-width / 2 + 65, 0);
      this.speakerText.setX(-width / 2 + 130);
      this.dialogueText.setX(-width / 2 + 130);
      this.dialogueText.setWordWrapWidth(460);
    } else {
      this.portraitContainer.setPosition(width / 2 - 65, 0);
      this.speakerText.setX(-width / 2 + 30);
      this.dialogueText.setX(-width / 2 + 30);
      this.dialogueText.setWordWrapWidth(460);
    }

    // Draw Portrait
    this.drawPortrait(step.portrait);

    // Type text
    this.typeText(step.text);
  }

  private typeText(text: string): void {
    this.fullText = text;
    this.currentText = '';
    this.dialogueText.setText('');
    DialogueManager.setTyping(true);

    if (this.typingTimer) {
      this.typingTimer.destroy();
    }

    let charIdx = 0;
    this.typingTimer = this.scene.time.addEvent({
      delay: 25, // Typewriter speed (25ms per character)
      callback: () => {
        if (!this.scene) return;
        this.currentText += text[charIdx];
        this.dialogueText.setText(this.currentText);
        charIdx++;

        if (charIdx >= text.length) {
          if (this.typingTimer) this.typingTimer.destroy();
          DialogueManager.setTyping(false);
        }
      },
      repeat: text.length - 1
    });
  }

  private skipTyping(): void {
    if (this.typingTimer) {
      this.typingTimer.destroy();
    }
    this.dialogueText.setText(this.fullText);
    DialogueManager.setTyping(false);
  }

  private hide(): void {
    if (this.typingTimer) {
      this.typingTimer.destroy();
    }
    if (this.lunaBlinkTimer) {
      this.lunaBlinkTimer.destroy();
    }
    this.setVisible(false);
  }

  private drawPortrait(_portraitType: string): void {
    const pg = this.portraitGraphics;
    pg.clear();

    if (this.lunaPortraitImage) {
      this.lunaPortraitImage.setVisible(false);
    }
    if (this.lunaBlinkTimer) {
      this.lunaBlinkTimer.destroy();
    }

    this.lunaPortraitImage.setVisible(true);
    this.lunaPortraitImage.setScale(0.35);
    this.lunaPortraitImage.setY(0);
    this.lunaPortraitImage.setAlpha(1.0);

    // Highlight / bobbing animation for Luna portrait
    this.scene.tweens.killTweensOf(this.lunaPortraitImage);
    this.scene.tweens.add({
      targets: this.lunaPortraitImage,
      y: -4,
      scaleX: 0.365,
      scaleY: 0.335,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Blinking loop for Luna to make her feel alive
    this.lunaBlinkTimer = this.scene.time.addEvent({
      delay: 2800 + Math.random() * 1500,
      loop: true,
      callback: () => {
        if (!this.lunaPortraitImage || !this.lunaPortraitImage.visible) return;
        this.scene.tweens.add({
          targets: this.lunaPortraitImage,
          alpha: 0.5,
          duration: 80,
          yoyo: true,
          repeat: 1
        });
      }
    });
  }

  public destroy(): void {
    if (this.typingTimer) {
      this.typingTimer.destroy();
    }
    if (this.lunaBlinkTimer) {
      this.lunaBlinkTimer.destroy();
    }
    super.destroy();
  }
}
