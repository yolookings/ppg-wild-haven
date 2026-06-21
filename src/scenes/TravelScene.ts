// src/scenes/TravelScene.ts
import Phaser from 'phaser';
import { AreaId } from '../data/types';
import { CreatureVisuals } from '../utils/CreatureVisuals';
import { AudioManager } from '../systems/AudioManager';

const TRAVEL_TIPS = [
  "Tip: Lead captured animals back to Sanctuary pen gates to release them and claim rewards!",
  "Tip: Upgrading your Sanctuary level unlocks larger enclosures for more creatures.",
  "Tip: Legendary and Mythic creatures are found in high-level explore biomes.",
  "Tip: Star Rabbits and Celestial Stags prefer the floating Sky Island region.",
  "Tip: Tap Spacebar or click the equipped Lasso button on-screen to throw your rope.",
  "Tip: Different ropes have higher capture modifiers. Equip them at the Shop NPC!",
  "Tip: Rare animals yield larger Coins and XP rewards upon sanctuary delivery.",
  "Tip: Let your sanctuary residents roam in pens to generate passive coins!",
  "Tip: Rare creatures appear more often during special weather conditions.",
  "Tip: Creatures generate passive coins while resting in your Sanctuary.",
  "Tip: Upgrading ropes improves your capture success chance significantly.",
  "Tip: Complete achievements to earn gems and unlock exclusive rewards.",
  "Tip: Feed your creatures to level them up and boost coin production!",
  "Tip: Visit different biomes to discover unique creature species.",
  "Tip: The Collection Book tracks every creature you've discovered.",
  "Tip: Offline earnings accumulate — come back to collect your rewards!",
  "Tip: Mythic creatures are incredibly rare — prepare your best rope!"
];

export class TravelScene extends Phaser.Scene {
  private targetScene!: string;
  private targetAreaId?: AreaId;

  private progressBar!: Phaser.GameObjects.Graphics;
  private spinnerIcon!: Phaser.GameObjects.Sprite;
  private progressPercentText!: Phaser.GameObjects.Text;
  private progress = 0;

  constructor() {
    super('TravelScene');
  }

  init(data: { targetScene: string; areaId?: AreaId }): void {
    this.targetScene = data.targetScene;
    this.targetAreaId = data.areaId;
    this.progress = 0;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Hide UI during loading travel
    if (this.scene.isActive('UIScene')) {
      this.scene.setVisible(false, 'UIScene');
    }

    const isMobile = width < 768;
    const globalScale = isMobile ? 0.75 : 1.2;

    // Detect destination type to style loading screen
    let destName = "Sanctuary";
    let illustColor = 0x8fd14f;
    let creaturesToIllustrate: string[] = [];
    let illustProps: string[] = [];

    const isSanctuary = this.targetScene === 'SanctuaryScene';
    const destAreaId = isSanctuary ? 'sanctuary' : this.targetAreaId;

    if (destAreaId === 'sanctuary') {
      destName = "Ranch Sanctuary";
      illustColor = 0x3498db;
      creaturesToIllustrate = ['meadow_rabbit', 'silver_fox', 'pebble_goat', 'golden_hare', 'crystal_turtle'];
      illustProps = [];
    } else if (destAreaId === 'green_meadow') {
      destName = "Green Meadow";
      illustColor = 0x2ecc71;
      creaturesToIllustrate = ['meadow_rabbit', 'spotted_fawn', 'golden_hare', 'field_sparrow', 'clover_stag'];
      illustProps = ['flower_1', 'flower_2', 'bush_1'];
    } else if (destAreaId === 'whisper_forest') {
      destName = "Whisper Forest";
      illustColor = 0x1abc9c;
      creaturesToIllustrate = ['silver_fox', 'forest_squirrel', 'elder_owl', 'luminous_moth', 'mossy_toad'];
      illustProps = ['tree_1', 'log_1', 'bush_3'];
    } else if (destAreaId === 'crystal_mountain') {
      destName = "Crystal Mountain";
      illustColor = 0x9b59b6;
      creaturesToIllustrate = ['pebble_goat', 'snow_fox', 'aurora_wolf', 'crystal_turtle', 'frost_hare'];
      illustProps = ['stone_3', 'stone_1', 'log_2'];
    } else if (destAreaId === 'golden_dunes') {
      destName = "Golden Dunes";
      illustColor = 0xe67e22;
      creaturesToIllustrate = ['desert_lizard', 'mirage_jackal', 'desert_spirit', 'sun_falcon', 'cactus_camel'];
      illustProps = ['stone_2', 'stone_4'];
    } else if (destAreaId === 'sky_island') {
      destName = "Sky Island";
      illustColor = 0xff5c8a;
      creaturesToIllustrate = ['pegasus', 'celestial_stag', 'phoenix', 'star_rabbit', 'cloud_sprite'];
      illustProps = ['cloud_image_1', 'cloud_image_2'];
    }

    // Play travel transition sound
    AudioManager.playSfx('ui_confirm');

    const bgImage = this.add.image(width / 2, height / 2, isSanctuary ? 'back-to-sanctuary' : 'loading_bg');
    bgImage.setDisplaySize(width, height);
    bgImage.setAlpha(isSanctuary ? 1 : 0.4);
    bgImage.setDepth(0);

    const bgOverlay = this.add.graphics();
    bgOverlay.fillStyle(0x000000, 0.25);
    bgOverlay.fillRect(0, 0, width, height);
    bgOverlay.setDepth(0);

    // 2. Draw Subtle Clouds Drift
    this.createDecorClouds(width, height);

    // 3. Illustrate Destination Props & Animals
    this.createThemedIllustrations(width, height, creaturesToIllustrate, illustProps, globalScale);

    // 4. Headline Titles
    this.add.text(width / 2, height * 0.2, "TRAVELING TO:", {
      fontFamily: 'Outfit, sans-serif',
      fontSize: isMobile ? '16px' : '22px',
      fontStyle: 'bold',
      color: '#ffedd5',
      stroke: '#2c1e15',
      strokeThickness: 3
    }).setOrigin(0.5);

    const destTitle = this.add.text(width / 2, height * 0.26, destName.toUpperCase(), {
      fontFamily: 'Outfit, sans-serif',
      fontSize: isMobile ? '32px' : '52px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1e272c',
      strokeThickness: isMobile ? 6 : 9
    }).setOrigin(0.5);

    // Give destination name a nice color tint
    destTitle.setTint(illustColor);

    // 5. Travel Tips Panel (bottom)
    const tipBoxWidth = Math.min(width - 40, 640);
    const tipBox = this.add.nineslice(width / 2, height * 0.76, 'text-bar', 0, tipBoxWidth, 90, 16, 16, 16, 16);
    tipBox.setOrigin(0.5);

    const randomTip = Phaser.Utils.Array.GetRandom(TRAVEL_TIPS);
    this.add.text(width / 2, height * 0.76, randomTip, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: isMobile ? '12px' : '15px',
      fontStyle: 'normal',
      color: '#5c4832',
      align: 'center',
      wordWrap: { width: tipBoxWidth - 40 }
    }).setOrigin(0.5);

    // 6. Loading Progress Bars & Spinner
    const barW = Math.min(width - 100, 360);
    const barH = 16;
    const barX = width / 2;
    const barY = height * 0.88;

    // Progress Bar Background
    const progBg = this.add.graphics();
    progBg.fillStyle(0x1e272c, 0.6);
    progBg.fillRoundedRect(barX - barW / 2, barY - barH / 2, barW, barH, 6);

    this.progressBar = this.add.graphics();

    this.progressPercentText = this.add.text(barX, barY - 18, "Preparing Scene... 0%", {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fff7e6'
    }).setOrigin(0.5);

    this.spinnerIcon = this.add.sprite(barX - barW / 2 - 25, barY, 'xp_star').setScale(0.2);
    this.spinnerIcon.setDepth(10);

    // Ticking timeline simulating loading progress
    this.tweens.add({
      targets: this,
      progress: 100,
      duration: 2500 + Math.random() * 800,
      ease: 'Linear',
      onUpdate: () => {
        const val = Math.floor(this.progress);
        this.progressPercentText.setText(`Traveling... ${val}%`);

        this.progressBar.clear();
        this.progressBar.fillStyle(illustColor, 1);
        this.progressBar.fillRoundedRect(barX - barW / 2 + 2, barY - barH / 2 + 2, (barW - 4) * (this.progress / 100), barH - 4, 4);

        this.spinnerIcon.angle += 3;
      },
      onComplete: () => {
        this.cameras.main.fadeOut(400, 26, 35, 30);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(this.targetScene, { areaId: this.targetAreaId });
        });
      }
    });
  }

  private createThemedIllustrations(width: number, height: number, creatures: string[], props: string[], globalScale: number): void {
    const isMobile = width < 768;
    const centerIllustX = width / 2;
    const centerIllustY = height * 0.5;

    // A. Draw props in background of illustrations
    props.forEach((propKey, idx) => {
      const offsetMultiplier = idx === 0 ? -1 : 1;
      const px = centerIllustX + offsetMultiplier * (isMobile ? 80 : 160);
      const py = centerIllustY + 20;

      const pImg = this.add.image(px, py, propKey);
      pImg.setScale((propKey.startsWith('building') ? 0.95 : 0.8) * globalScale);
      pImg.setOrigin(0.5, 1);
      pImg.setAlpha(0.7);
    });

    // B. Draw creatures in foreground of illustrations
    creatures.forEach((cId, idx) => {
      const spacing = isMobile ? 65 : 120;
      const count = creatures.length;
      const cx = centerIllustX + (idx - (count - 1) / 2) * spacing;
      const cy = centerIllustY + 30;

      // Query mock or data
      const data = { id: cId, name: cId.replace('_', ' ') };
      const visuals = CreatureVisuals.getVisuals(data as any);
      const scale = visuals.scaleMult * 1.25 * globalScale;

      // Container for shadow + sprite
      const container = this.add.container(cx, cy);

      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.18);
      shadow.fillEllipse(0, 10, 14 * scale, 5 * scale);
      container.add(shadow);

      const sprite = this.add.sprite(0, 0, visuals.spriteKey);
      sprite.setTint(visuals.tint);
      sprite.setScale(scale);
      sprite.setOrigin(0.5, 0.5);
      
      if (idx % 2 === 0) {
        sprite.setFlipX(true);
      }

      container.add(sprite);

      // Play anims
      if (visuals.isAnimated && visuals.animalType) {
        sprite.play(`animal_${visuals.animalType}_idle_down`);
      } else {
        // Floating/breathing tween
        this.tweens.add({
          targets: sprite,
          scaleY: scale * 1.1,
          scaleX: scale * 0.9,
          y: 2,
          duration: 900 + Math.random() * 500,
          yoyo: true,
          repeat: -1
        });
      }
    });
  }

  private createDecorClouds(width: number, height: number): void {
    const cloudKeys = ['cloud_image_1', 'cloud_image_2', 'cloud_image_3', 'cloud_image_4', 'cloud_image_5'];
    for (let i = 0; i < 4; i++) {
      const key = Phaser.Utils.Array.GetRandom(cloudKeys);
      const cx = Math.random() * width;
      const cy = Math.random() * height * 0.45;
      const cloud = this.add.image(cx, cy, key);
      cloud.setScale(0.5 + Math.random() * 0.5);
      cloud.setAlpha(0.12 + Math.random() * 0.12);

      this.tweens.add({
        targets: cloud,
        x: width + 150,
        duration: 20000 + Math.random() * 20000,
        loop: -1,
        ease: 'Linear',
        onLoop: () => {
          cloud.x = -150;
          cloud.y = Math.random() * height * 0.45;
        }
      });
    }
  }
}
