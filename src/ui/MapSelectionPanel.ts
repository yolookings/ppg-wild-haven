import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioManager } from '../systems/AudioManager';

export class MapSelectionPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // Dim overlay
    const overlay = scene.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0, 0);
    overlay.setInteractive(); // block clicks
    this.add(overlay);

    const panelBg = scene.add.nineslice(width / 2, height / 2, 'modal_window', 0, 800, 500, 32, 32, 32, 32);
    this.add(panelBg);

    const title = scene.add.text(width / 2, height / 2 - 210, 'SELECT MAP', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#4a3b2c'
    }).setOrigin(0.5);
    this.add(title);

    // Close button
    const closeBtn = scene.add.text(width / 2 + 350, height / 2 - 210, '✖', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ff5c8a'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerup', () => {
      AudioManager.playSfx('ui_close');
      this.destroy();
    });
    this.add(closeBtn);

    const areasData = scene.cache.json.get('areas_data').areas;
    const state = SaveSystem.getState();

    // Show top 3 areas (since we changed the json to have exactly 3)
    const cardsY = height / 2 + 20;
    const cardWidth = 220;
    const cardSpacing = 250;
    const startX = width / 2 - cardSpacing;

    areasData.forEach((area: any, idx: number) => {
      const isUnlocked = state.unlockedAreas.includes(area.id) || area.unlockCost === 0 || area.id === 'green_meadow';
      const cardX = startX + idx * cardSpacing;
      
      const cardContainer = scene.add.container(cardX, cardsY);
      
      const cardBg = scene.add.nineslice(0, 0, 'button', 0, cardWidth, 320, 16, 16, 16, 16);
      if (!isUnlocked) cardBg.setTint(0xaaaaaa);
      cardContainer.add(cardBg);

      // Thumbnail (mockup since we don't have all thumbnails, use colors or undead bg)
      const thumbH = 120;
      let thumb;
      if (area.id === 'undead_map') {
        thumb = scene.add.image(0, -90, 'undead_background').setDisplaySize(cardWidth - 24, thumbH);
      } else if (area.id === 'green_meadow') {
        thumb = scene.add.image(0, -90, 'homepage_bg').setDisplaySize(cardWidth - 24, thumbH);
      } else {
        thumb = scene.add.rectangle(0, -90, cardWidth - 24, thumbH, parseInt(area.palette[0].replace('#','0x')));
      }
      if (!isUnlocked) thumb.setAlpha(0.5);
      cardContainer.add(thumb);

      const areaName = scene.add.text(0, -10, area.name, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#4a3b2c'
      }).setOrigin(0.5);
      cardContainer.add(areaName);

      const areaDesc = scene.add.text(0, 40, area.description, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '12px',
        color: '#5c4832',
        align: 'center',
        wordWrap: { width: cardWidth - 30 }
      }).setOrigin(0.5);
      cardContainer.add(areaDesc);

      // Action button
      if (isUnlocked) {
        const actionBtn = scene.add.nineslice(0, 120, 'button_small', 0, 140, 40, 12, 12, 12, 12);
        actionBtn.setInteractive({ useHandCursor: true });
        const actionTxt = scene.add.text(0, 122, 'TRAVEL', {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#5c4832'
        }).setOrigin(0.5);
        cardContainer.add([actionBtn, actionTxt]);

        actionBtn.on('pointerdown', () => {
          AudioManager.playSfx('ui_confirm');
          this.destroy();
          
          // Determine the current active game scene
          const activeScene = scene.scene.manager.scenes.find(s => 
            (s.scene.key === 'SanctuaryScene' || s.scene.key === 'ExploreScene') && s.scene.isActive()
          );
          
          if (activeScene) {
            activeScene.cameras.main.fadeOut(400, 0, 0, 0);
            activeScene.cameras.main.once('camerafadeoutcomplete', () => {
              activeScene.scene.start('TravelScene', { targetScene: 'ExploreScene', areaId: area.id });
            });
          } else {
            scene.scene.start('TravelScene', { targetScene: 'ExploreScene', areaId: area.id });
          }
        });
      } else {
        const reqTxtStr = area.id === 'coming_soon' ? '🔒 Future Update' : `🔒 Unlocks at Lvl ${area.unlockLevel}`;
        const reqTxt = scene.add.text(0, 120, reqTxtStr, {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#e86868'
        }).setOrigin(0.5);
        cardContainer.add(reqTxt);
      }

      this.add(cardContainer);
    });

    scene.add.existing(this);
  }
}
