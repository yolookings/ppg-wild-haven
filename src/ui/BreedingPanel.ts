// src/ui/BreedingPanel.ts
import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { DataLoader } from '../data/DataLoader';
import { Creature } from '../data/types';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { AchievementSystem } from '../systems/AchievementSystem';

export class BreedingPanel extends Phaser.GameObjects.Container {
  private panelBg!: Phaser.GameObjects.NineSlice;
  private parentASlot!: Phaser.GameObjects.NineSlice;
  private parentBSlot!: Phaser.GameObjects.NineSlice;
  private parentASprite!: Phaser.GameObjects.Image;
  private parentBSprite!: Phaser.GameObjects.Image;
  private parentAText!: Phaser.GameObjects.Text;
  private parentBText!: Phaser.GameObjects.Text;

  private selectSubPanel!: Phaser.GameObjects.Container;
  private subPanelBg!: Phaser.GameObjects.NineSlice;
  private selectGridItems: any[] = [];
  
  private breedBtnContainer!: Phaser.GameObjects.Container;
  private breedBtnText!: Phaser.GameObjects.Text;
  private recipeText!: Phaser.GameObjects.Text;
  
  // Selection tracking
  private selectedParentAIdx: number | null = null;
  private selectedParentBIdx: number | null = null;
  private choosingSlot: 'A' | 'B' | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const width = 820;
    const height = 620;

    // Main Panel Background
    this.panelBg = scene.add.nineslice(0, 0, 'modal_window', 0, width, height, 32, 32, 32, 32);
    this.add(this.panelBg);

    // Title
    const title = scene.add.text(0, -height / 2 + 25, 'PET BREEDING LAB', {
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
      this.closePanel();
    });
    this.add(closeBtn);

    // Info description
    const info = scene.add.text(0, -170, 'Combine two pets to hatch a new rare species!\n⚠️ Breeding consumes the parent pets.', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '11px',
      color: '#ff5c8a',
      align: 'center'
    }).setOrigin(0.5);
    this.add(info);

    // 1. Parent A Slot (Left)
    const slotX = 120;
    this.parentASlot = scene.add.nineslice(-slotX, -40, 'button', 0, 120, 120, 18, 18, 12, 12);
    this.parentASlot.setInteractive({ useHandCursor: true });
    this.parentASlot.on('pointerdown', () => this.openSelector('A'));
    this.add(this.parentASlot);

    this.parentASprite = scene.add.image(-slotX, -50, 'creature_meadow').setScale(2.5).setVisible(false);
    this.add(this.parentASprite);

    this.parentAText = scene.add.text(-slotX, 0, 'Select Parent A\n(Click Here)', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#8c765c',
      align: 'center'
    }).setOrigin(0.5);
    this.add(this.parentAText);

    // Heart separator in middle
    const heart = scene.add.text(0, -40, '🧬', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '26px'
    }).setOrigin(0.5);
    this.add(heart);

    // 2. Parent B Slot (Right)
    this.parentBSlot = scene.add.nineslice(slotX, -40, 'button', 0, 120, 120, 18, 18, 12, 12);
    this.parentBSlot.setInteractive({ useHandCursor: true });
    this.parentBSlot.on('pointerdown', () => this.openSelector('B'));
    this.add(this.parentBSlot);

    this.parentBSprite = scene.add.image(slotX, -50, 'creature_meadow').setScale(2.5).setVisible(false);
    this.add(this.parentBSprite);

    this.parentBText = scene.add.text(slotX, 0, 'Select Parent B\n(Click Here)', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#8c765c',
      align: 'center'
    }).setOrigin(0.5);
    this.add(this.parentBText);

    // 3. Expected Outcome / Recipe preview text
    this.recipeText = scene.add.text(0, 50, 'Select parents to view combination recipe', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#5c4832',
      align: 'center',
      wordWrap: { width: 450 }
    }).setOrigin(0.5);
    this.add(this.recipeText);

    // 4. Breed Button
    this.breedBtnContainer = scene.add.container(0, 120);
    const breedBg = scene.add.nineslice(0, 0, 'button', 0, 220, 42, 18, 18, 12, 12);
    breedBg.setInteractive({ useHandCursor: true });

    this.breedBtnText = scene.add.text(0, -2, 'Start Fusion', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    
    this.breedBtnContainer.add([breedBg, this.breedBtnText]);
    this.add(this.breedBtnContainer);

    breedBg.on('pointerover', () => {
      breedBg.setTexture('button_hover');
      this.scene.tweens.add({ targets: this.breedBtnContainer, scale: 1.05, duration: 80 });
      AudioManager.playSfx('button_hover');
    });
    breedBg.on('pointerout', () => {
      breedBg.setTexture('button');
      breedBg.y = 0;
      this.breedBtnText.y = -2;
      this.scene.tweens.add({ targets: this.breedBtnContainer, scale: 1.0, duration: 80 });
    });
    breedBg.on('pointerdown', () => {
      breedBg.setTexture('button_click');
      breedBg.y = 2; // Y translation downwards by 2px
      this.breedBtnText.y = 0;
      this.scene.tweens.add({ targets: this.breedBtnContainer, scale: 0.95, duration: 40 });
    });
    breedBg.on('pointerup', () => {
      breedBg.setTexture('button_hover');
      breedBg.y = 0;
      this.breedBtnText.y = -2;
      this.scene.tweens.add({ targets: this.breedBtnContainer, scale: 1.05, duration: 40 });
      this.attemptBreed();
    });

    this.updateBreedButtonState();

    // 5. Select Sub Panel (grid modal for choosing parents)
    this.selectSubPanel = scene.add.container(0, 0);
    this.subPanelBg = scene.add.nineslice(0, 0, 'modal_window', 0, 440, 360, 32, 32, 32, 32);
    this.subPanelBg.setTint(0xfff7e6);
    this.selectSubPanel.add(this.subPanelBg);

    const subTitle = scene.add.text(0, -150, 'CHOOSE A PARENT', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    const subClose = scene.add.text(440 / 2 - 14, -146, '✕', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    subClose.on('pointerover', () => {
      subClose.setColor('#8f6f4a');
      AudioManager.playSfx('button_hover');
    });
    subClose.on('pointerout', () => {
      subClose.setColor('#5c4832');
    });
    subClose.on('pointerdown', () => {
      this.selectSubPanel.setVisible(false);
    });

    this.selectSubPanel.add([subTitle, subClose]);
    this.add(this.selectSubPanel);
    this.selectSubPanel.setVisible(false);

    this.setVisible(false);
  }

  public show(): void {
    this.selectedParentAIdx = null;
    this.selectedParentBIdx = null;
    this.choosingSlot = null;

    this.parentASprite.setVisible(false);
    this.parentBSprite.setVisible(false);
    this.parentAText.setText('Select Parent A\n(Click Here)').setVisible(true);
    this.parentBText.setText('Select Parent B\n(Click Here)').setVisible(true);

    this.updateRecipePreview();
    this.updateBreedButtonState();
    this.setVisible(true);
  }

  private closePanel(): void {
    this.setVisible(false);
    this.selectSubPanel.setVisible(false);
  }

  private openSelector(slot: 'A' | 'B'): void {
    AudioManager.playSfx('ui_tap');
    this.choosingSlot = slot;
    this.selectSubPanel.setVisible(true);
    this.refreshSelectorGrid();
  }

  private refreshSelectorGrid(): void {
    // Clear old items
    this.selectGridItems.forEach(item => item.destroy());
    this.selectGridItems = [];

    const state = SaveSystem.getState();
    const owned = state.ownedCreatures;

    // Filter available creatures (exclude whichever is chosen in the other slot)
    const otherIdx = this.choosingSlot === 'A' ? this.selectedParentBIdx : this.selectedParentAIdx;
    
    // Enclosure placed creatures can be bred, but we filter out temp objects
    const available = owned.filter((_oc, idx) => idx !== otherIdx);

    if (available.length === 0) {
      const emptyText = this.scene.add.text(0, 0, 'No eligible pets in inventory!', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '14px',
        color: '#8c765c'
      }).setOrigin(0.5);
      this.selectGridItems.push(emptyText);
      this.selectSubPanel.add(emptyText);
      return;
    }

    const cols = 4;
    const startX = -150;
    const startY = -90;
    const spacingX = 100;
    const spacingY = 90;

    available.forEach((oc, gridIdx) => {
      // Find actual index in global owned list
      const actualIdx = owned.findIndex(item => item.instanceId === oc.instanceId);

      const col = gridIdx % cols;
      const row = Math.floor(gridIdx / cols);

      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      // Limit grid size to 12 max to fit panel bounds
      if (gridIdx >= 12) return;

      const item = this.scene.add.container(x, y);

      const card = this.scene.add.nineslice(0, 0, 'button', 0, 80, 75, 18, 18, 12, 12);
      card.setInteractive({ useHandCursor: true });
      item.add(card);

      const cData = DataLoader.getCreature(oc.creatureId);
      if (cData) {
        let spriteKey = 'creature_meadow';
        if (cData.area === 'whisper_forest') spriteKey = 'creature_forest';
        else if (cData.area === 'crystal_mountain') spriteKey = 'creature_mountain';
        else if (cData.area === 'golden_dunes') spriteKey = 'creature_dunes';
        else if (cData.area === 'sky_island') spriteKey = 'creature_sky';

        const sprite = this.scene.add.image(0, -8, spriteKey).setScale(1.6);
        item.add(sprite);

        const nameTxt = this.scene.add.text(0, 22, oc.nickname || cData.name, {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '8px',
          fontStyle: 'bold',
          color: '#5c4832',
          wordWrap: { width: 75 },
          align: 'center'
        }).setOrigin(0.5);
        item.add(nameTxt);
      }

      card.on('pointerdown', () => {
        this.selectParent(actualIdx);
      });

      this.selectGridItems.push(item);
      this.selectSubPanel.add(item);
    });
  }

  private selectParent(index: number): void {
    AudioManager.playSfx('ui_confirm');
    const state = SaveSystem.getState();
    const oc = state.ownedCreatures[index];
    const cData = DataLoader.getCreature(oc.creatureId)!;

    let spriteKey = 'creature_meadow';
    if (cData.area === 'whisper_forest') spriteKey = 'creature_forest';
    else if (cData.area === 'crystal_mountain') spriteKey = 'creature_mountain';
    else if (cData.area === 'golden_dunes') spriteKey = 'creature_dunes';
    else if (cData.area === 'sky_island') spriteKey = 'creature_sky';

    if (this.choosingSlot === 'A') {
      this.selectedParentAIdx = index;
      this.parentASprite.setTexture(spriteKey).setVisible(true);
      this.parentAText.setText(oc.nickname || cData.name).setPosition(-120, 32);
    } else {
      this.selectedParentBIdx = index;
      this.parentBSprite.setTexture(spriteKey).setVisible(true);
      this.parentBText.setText(oc.nickname || cData.name).setPosition(120, 32);
    }

    this.selectSubPanel.setVisible(false);
    this.updateRecipePreview();
    this.updateBreedButtonState();
  }

  private updateRecipePreview(): void {
    if (this.selectedParentAIdx === null || this.selectedParentBIdx === null) {
      this.recipeText.setText('Select parents to view combination recipe');
      return;
    }

    const state = SaveSystem.getState();
    const ocA = state.ownedCreatures[this.selectedParentAIdx];
    const ocB = state.ownedCreatures[this.selectedParentBIdx];

    const recipe = DataLoader.getBreedingRecipe(ocA.creatureId, ocB.creatureId);

    if (recipe) {
      const outcome = DataLoader.getCreature(recipe.offspring)!;
      this.recipeText.setText(
        `Recipe Found: ${outcome.name} (${outcome.rarity})\n` +
        `Cost: 🪙${recipe.coinCost} | Success Chance: ${recipe.successRate}%`
      ).setColor('#8a5200');
    } else {
      // Random fallback breed outcome
      // Outcome rarity will be slightly higher or equal
      this.recipeText.setText(
        'Recipe: Unknown Hybrid Breeding\n' +
        'Cost: 🪙 500 | Outcome: Random Pet (Success: 100%)'
      ).setColor('#5c4832');
    }
  }

  private updateBreedButtonState(): void {
    const breedBg = this.breedBtnContainer.list[0] as Phaser.GameObjects.NineSlice;
    if (this.selectedParentAIdx === null || this.selectedParentBIdx === null) {
      this.breedBtnContainer.setAlpha(0.5);
      this.breedBtnText.setText('Select Parents');
      breedBg?.disableInteractive();
      return;
    }

    const state = SaveSystem.getState();
    const ocA = state.ownedCreatures[this.selectedParentAIdx];
    const ocB = state.ownedCreatures[this.selectedParentBIdx];
    const recipe = DataLoader.getBreedingRecipe(ocA.creatureId, ocB.creatureId);
    
    const cost = recipe ? recipe.coinCost : 500;

    if (state.coins < cost) {
      this.breedBtnContainer.setAlpha(0.5);
      this.breedBtnText.setText(`Short 🪙 ${cost - state.coins}`);
      breedBg?.disableInteractive();
    } else {
      this.breedBtnContainer.setAlpha(1.0);
      this.breedBtnText.setText(`☘️ Fuse Pets (🪙 ${cost})`);
      breedBg?.setInteractive({ useHandCursor: true });
    }
  }

  private attemptBreed(): void {
    if (this.selectedParentAIdx === null || this.selectedParentBIdx === null) return;

    const state = SaveSystem.getState();
    const ocA = state.ownedCreatures[this.selectedParentAIdx];
    const ocB = state.ownedCreatures[this.selectedParentBIdx];
    const recipe = DataLoader.getBreedingRecipe(ocA.creatureId, ocB.creatureId);

    const cost = recipe ? recipe.coinCost : 500;
    
    if (state.coins < cost) {
      AudioManager.playSfx('capture_fail');
      return;
    }

    // Spend coins
    state.coins -= cost;
    EventBus.emit('coinsChanged', state.coins);

    let finalOffspringId = '';
    let isSuccess = true;

    if (recipe) {
      const roll = Math.floor(Math.random() * 100) + 1;
      isSuccess = roll <= recipe.successRate;
      finalOffspringId = isSuccess ? recipe.offspring : ocA.creatureId; // keeps Parent A on failure
    } else {
      // Random pick from similar rarity
      const cA = DataLoader.getCreature(ocA.creatureId)!;
      const cB = DataLoader.getCreature(ocB.creatureId)!;
      
      const creatures = DataLoader.getCreatures();
      
      // Determine average rarity target
      const pool = creatures.filter(c => c.rarity === cA.rarity || c.rarity === cB.rarity);
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      finalOffspringId = chosen.id;
    }

    const outcomeCreature = DataLoader.getCreature(finalOffspringId)!;

    // Delete parents from owned array
    // Store IDs to delete
    const instIdA = ocA.instanceId;
    const instIdB = ocB.instanceId;

    state.ownedCreatures = state.ownedCreatures.filter(
      item => item.instanceId !== instIdA && item.instanceId !== instIdB
    );

    // Play sparkling breeding jingle
    AudioManager.playSfx('level_up');

    // Create egg reveal popup/animation
    this.triggerEggRevealEffect(outcomeCreature, isSuccess);

    // Save changes
    SaveSystem.markDirty();
    SaveSystem.forceSave();

    // Reset slots
    this.show();
    EventBus.emit('sanctuaryUpdated');
  }

  private triggerEggRevealEffect(creature: Creature, success: boolean): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    const modal = this.scene.add.container(width / 2, height / 2);
    modal.setDepth(210);

    const bg = this.scene.add.nineslice(0, 0, 'modal_window', 0, 380, 280, 32, 32, 32, 32);
    modal.add(bg);

    const titleStr = success ? 'SUCCESSFUL FUSION!' : 'FUSION MISFIRE!';
    const title = this.scene.add.text(0, -90, titleStr, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: success ? '#8fd14f' : '#ff5c8a'
    }).setOrigin(0.5);

    // Large floating egg or creature sprite
    let spriteKey = 'creature_meadow';
    if (creature.area === 'whisper_forest') spriteKey = 'creature_forest';
    else if (creature.area === 'crystal_mountain') spriteKey = 'creature_mountain';
    else if (creature.area === 'golden_dunes') spriteKey = 'creature_dunes';
    else if (creature.area === 'sky_island') spriteKey = 'creature_sky';

    const sprite = this.scene.add.image(0, -15, spriteKey).setScale(4.5);
    
    // Heart sparkles
    const sparkles = this.scene.add.graphics();
    sparkles.fillStyle(0xfff7e6, 0.4);
    sparkles.fillCircle(-40, -40, 6);
    sparkles.fillCircle(40, -10, 8);
    sparkles.fillCircle(-20, 20, 5);

    const name = this.scene.add.text(0, 50, success ? `You hatched: ${creature.name}` : `Fusion reverted to: ${creature.name}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    // Save offspring to player inventory
    const state = SaveSystem.getState();
    const newOwned = {
      instanceId: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      creatureId: creature.id,
      capturedAt: Date.now(),
      level: 1
    };
    state.ownedCreatures.push(newOwned);

    // Track collection book check
    AchievementSystem.checkAchievements();

    const claimBtn = this.scene.add.nineslice(0, 95, 'button', 0, 160, 36, 18, 18, 12, 12);
    claimBtn.setInteractive({ useHandCursor: true });
    claimBtn.on('pointerdown', () => {
      AudioManager.playSfx('ui_confirm');
      modal.destroy();
    });
    const claimTxt = this.scene.add.text(0, 95, 'Add to Sanctuary', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    modal.add([title, sparkles, sprite, name, claimBtn, claimTxt]);

    modal.setScale(0.1);
    this.scene.tweens.add({
      targets: modal,
      scale: 1.0,
      duration: 350,
      ease: 'Back.easeOut'
    });

    // Make the sprite pulse/breath
    this.scene.tweens.add({
      targets: sprite,
      scaleX: 5.2,
      scaleY: 3.8,
      duration: 350,
      yoyo: true,
      repeat: 2,
      ease: 'Quad.easeInOut'
    });
  }
}
