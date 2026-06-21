// src/scenes/PreloadScene.ts
import Phaser from 'phaser';
import { DataLoader } from '../data/DataLoader';
import { AudioManager } from '../systems/AudioManager';
import { SaveSystem } from '../systems/SaveSystem';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const bg = this.add.image(width / 2, height / 2, 'loading_bg');
    bg.setDisplaySize(width, height);
    bg.setAlpha(0.5);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.35);
    overlay.fillRect(0, 0, width, height);

    const titleText = this.add.text(width / 2, height / 2 - 80, 'WILD HAVEN', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#8fd14f',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);
    // Hint / Loading Text Background
    const hintBg = this.add.nineslice(width / 2, height / 2 - 25, 'text-bar', 0, 340, 50, 16, 16, 16, 16);
    hintBg.setOrigin(0.5);

    const subText = this.add.text(width / 2, height / 2 - 25, 'Preparing Sanctuary...', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '18px',
      color: '#fff7e6',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Progress Bar Background
    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x000000, 0.5);
    progressBarBg.fillRoundedRect(width / 2 - 160, height / 2 + 30, 320, 22, 11);

    // Progress Bar Foreground
    const progressBar = this.add.graphics();

    const animalTypes = ['hare', 'fox', 'deer', 'boar'];
    const animals: Phaser.GameObjects.Sprite[] = [];
    animalTypes.forEach((type, i) => {
      const startX = i % 2 === 0 ? -60 : width + 60;
      const startY = height * 0.75 + Math.sin(i * 1.5) * 30;

      if (this.anims.exists(`animal_${type}_walk_right`)) {
        const animal = this.add.sprite(startX, startY, `animal_${type}_idle`);
        animal.setScale(1.5);
        animal.setDepth(5);

        if (i % 2 === 0) {
          animal.play(`animal_${type}_walk_right`);
          animal.setFlipX(false);
        } else {
          animal.play(`animal_${type}_walk_left`);
          animal.setFlipX(true);
        }

        this.tweens.add({
          targets: animal,
          x: i % 2 === 0 ? width + 100 : -100,
          duration: 8000 + Math.random() * 4000,
          delay: i * 1500,
          repeat: -1,
        });

        animals.push(animal);
      }
    });

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x8fd14f, 1);
      progressBar.fillRoundedRect(width / 2 - 158, height / 2 + 32, 316 * value, 18, 9);
      subText.setText(`Loading... ${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBarBg.destroy();
      titleText.destroy();
      hintBg.destroy();
      subText.destroy();
      bg.destroy();
      overlay.destroy();
      animals.forEach(a => a.destroy());
    });

    // 1. Load JSON configurations
    this.load.json('creatures_data', 'assets/data/creatures.json');
    this.load.json('areas_data', 'assets/data/areas.json');
    this.load.json('ropes_data', 'assets/data/ropes.json');
    this.load.json('whips_data', 'assets/data/whips.json');
    this.load.json('breeding_recipes_data', 'assets/data/breeding_recipes.json');
    this.load.json('achievements_data', 'assets/data/achievements.json');

    // 2. Load Master Spritesheet (char.png - all character/creature sprites)
    // 1024x559 PNG, 32x32 pixel frames: 32 cols × 17 rows
    this.load.spritesheet('char_sprites', 'assets/screenshot/char.png', {
      frameWidth: 32,
      frameHeight: 32
    });

    // 3. Load individual placeholder sprites (fallback)
    // Creatures (using standard 5 placeholder sprites)
    this.load.image('creature_meadow', 'assets/sprites/creatures/rabbit_meadow_common.png');
    this.load.image('creature_forest', 'assets/sprites/creatures/fox_forest_rare.png');
    this.load.image('creature_mountain', 'assets/sprites/creatures/turtle_mountain_epic.png');
    this.load.image('creature_dunes', 'assets/sprites/creatures/golem_dunes_legendary.png');
    this.load.image('creature_sky', 'assets/sprites/creatures/phoenix_skyisland_mythic.png');

    // Icons
    this.load.image('coin', 'assets/Island-game-gui/png/images/coin.png');
    this.load.image('gem', 'assets/Island-game-gui/png/images/crystal.png');
    this.load.image('xp_star', 'assets/Island-game-gui/png/images/star.png');
    this.load.image('rope_basic', 'assets/sprites/icons/rope_basic.png');
    this.load.image('rope_strong', 'assets/sprites/icons/rope_strong.png');
    this.load.image('rope_magic', 'assets/sprites/icons/rope_magic.png');
    this.load.image('rope_divine', 'assets/sprites/icons/rope_divine.png');

    // UI
    this.load.image('button', 'assets/button.png');
    this.load.image('button_hover', 'assets/button.png');
    this.load.image('button_click', 'assets/button.png');
    this.load.image('button_long', 'assets/Island-game-gui/png/buttons/normal/long.png');
    this.load.image('button_long_hover', 'assets/Island-game-gui/png/buttons/hover/long.png');
    this.load.image('button_long_click', 'assets/Island-game-gui/png/buttons/click/long.png');
    this.load.image('button_small', 'assets/button.png');
    this.load.image('button_small_hover', 'assets/button.png');
    this.load.image('button_small_click', 'assets/button.png');
    this.load.image('panel_frame', 'assets/Island-game-gui/png/frames/warning.png');
    this.load.image('text-box', 'assets/text-box.png');
    this.load.image('back-to-sanctuary', 'assets/back-to-sanctuary.png');
    
    // Background and Luna info portrait
    this.load.image('menu_bg', 'assets/Island-game-gui/png/background1.png');
    this.load.image('homepage_bg', 'assets/homepage-background.png');
    this.load.image('loading_bg', 'assets/loading-background.png');
    this.load.image('luna_information', 'assets/character/luna/luna-information.png');
    this.load.image('luna_npc', 'assets/character/luna/luna-top-down.png');
    this.load.image('modal_window', 'assets/modal-window.png');
    this.load.image('undead_background', 'assets/undead-background.png');
    this.load.image('credit_photo', 'assets/credit.jpeg');
    this.load.image('developer_photo', 'assets/lana.png');

    // Headlines
    
    // Cozy themed panel frames

    // 4. Load Optimized Characters (Aztec, Maya, Nordic Leaders)
    this.load.spritesheet('aztec_leader_idle', 'assets/character/optimized/aztec_leader_idle.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('aztec_leader_walk', 'assets/character/optimized/aztec_leader_walk.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('maya_leader_idle', 'assets/character/optimized/maya_leader_idle.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('maya_leader_walk', 'assets/character/optimized/maya_leader_walk.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('nordic_leader_idle', 'assets/character/optimized/nordic_leader_idle.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('nordic_leader_walk', 'assets/character/optimized/nordic_leader_walk.png', { frameWidth: 64, frameHeight: 64 });

    // 5. Load High Quality Animal Spritesheets
    // Hare
    this.load.spritesheet('animal_hare_idle', 'assets/animals-pack-assets/PNG/Without_shadow/Hare/Hare_Idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('animal_hare_walk', 'assets/animals-pack-assets/PNG/Without_shadow/Hare/Hare_Walk.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('animal_hare_run', 'assets/animals-pack-assets/PNG/Without_shadow/Hare/Hare_Run.png', { frameWidth: 32, frameHeight: 32 });
    // Fox
    this.load.spritesheet('animal_fox_idle', 'assets/animals-pack-assets/PNG/Without_shadow/Fox/Fox_Idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('animal_fox_walk', 'assets/animals-pack-assets/PNG/Without_shadow/Fox/Fox_walk.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('animal_fox_run', 'assets/animals-pack-assets/PNG/Without_shadow/Fox/Fox_Run.png', { frameWidth: 32, frameHeight: 32 });
    // Deer
    this.load.spritesheet('animal_deer_idle', 'assets/animals-pack-assets/PNG/Without_shadow/Deer/Deer_Idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('animal_deer_walk', 'assets/animals-pack-assets/PNG/Without_shadow/Deer/Deer_Walk.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('animal_deer_run', 'assets/animals-pack-assets/PNG/Without_shadow/Deer/Deer_Run.png', { frameWidth: 32, frameHeight: 32 });
    // Boar
    this.load.spritesheet('animal_boar_idle', 'assets/animals-pack-assets/PNG/Without_shadow/Boar/Boar_Idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('animal_boar_walk', 'assets/animals-pack-assets/PNG/Without_shadow/Boar/Boar_Walk.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('animal_boar_run', 'assets/animals-pack-assets/PNG/Without_shadow/Boar/Boar_Run.png', { frameWidth: 32, frameHeight: 32 });
    // Black Grouse
    this.load.spritesheet('animal_black_grouse_idle', 'assets/animals-pack-assets/PNG/Without_shadow/Black_grouse/Black_grouse_Idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('animal_black_grouse_walk', 'assets/animals-pack-assets/PNG/Without_shadow/Black_grouse/Black_grouse_Walk.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('animal_black_grouse_flight', 'assets/animals-pack-assets/PNG/Without_shadow/Black_grouse/Black_grouse_Flight.png', { frameWidth: 32, frameHeight: 32 });

    // 6. Load Medieval Field & Decor Assets
    this.load.spritesheet('field_tiles', 'assets/medieval-field-assets/1 Tiles/FieldsTileset.png', { frameWidth: 32, frameHeight: 32 });
    
    // Stones
    this.load.image('stone_1', 'assets/medieval-field-assets/2 Objects/4 Stone/1.png');
    this.load.image('stone_2', 'assets/medieval-field-assets/2 Objects/4 Stone/3.png');
    this.load.image('stone_3', 'assets/medieval-field-assets/2 Objects/4 Stone/5.png');
    this.load.image('stone_4', 'assets/medieval-field-assets/2 Objects/4 Stone/10.png');
    // Fences
    this.load.image('fence_1', 'assets/medieval-field-assets/2 Objects/2 Fence/1.png');
    this.load.image('fence_2', 'assets/medieval-field-assets/2 Objects/2 Fence/3.png');
    // Grass & Flowers
    this.load.image('grass_decor_1', 'assets/medieval-field-assets/2 Objects/5 Grass/1.png');
    this.load.image('grass_decor_2', 'assets/medieval-field-assets/2 Objects/5 Grass/3.png');
    this.load.image('flower_1', 'assets/medieval-field-assets/2 Objects/6 Flower/1.png');
    this.load.image('flower_2', 'assets/medieval-field-assets/2 Objects/6 Flower/3.png');
    this.load.image('flower_3', 'assets/medieval-field-assets/2 Objects/6 Flower/5.png');
    this.load.image('flower_4', 'assets/medieval-field-assets/2 Objects/6 Flower/8.png');
    // Bushes
    this.load.image('bush_1', 'assets/medieval-field-assets/2 Objects/9 Bush/1.png');
    this.load.image('bush_2', 'assets/medieval-field-assets/2 Objects/9 Bush/3.png');
    this.load.image('bush_3', 'assets/medieval-field-assets/2 Objects/9 Bush/5.png');

    // Trees & Logs
    this.load.image('tree_1', 'assets/medieval-field-assets/2 Objects/7 Decor/Tree1.png');
    this.load.image('tree_2', 'assets/medieval-field-assets/2 Objects/7 Decor/Tree2.png');
    this.load.image('log_1', 'assets/medieval-field-assets/2 Objects/7 Decor/Log1.png');
    this.load.image('log_2', 'assets/medieval-field-assets/2 Objects/7 Decor/Log2.png');
    
    // Campfire Fire
    this.load.spritesheet('campfire_fire', 'assets/medieval-field-assets/3 Animated Objects/2 Campfire/1.png', { frameWidth: 32, frameHeight: 64 });

    this.load.image('flag_1', 'assets/medieval-field-assets/3 Animated Objects/1 Flag/1.png');
    this.load.image('flag_2', 'assets/medieval-field-assets/3 Animated Objects/1 Flag/2.png');
    this.load.image('flag_3', 'assets/medieval-field-assets/3 Animated Objects/1 Flag/3.png');
    this.load.image('flag_4', 'assets/medieval-field-assets/3 Animated Objects/1 Flag/4.png');
    this.load.image('flag_5', 'assets/medieval-field-assets/3 Animated Objects/1 Flag/5.png');

    // 7. Load Clouds from cloud-assets (robust filenames with no spaces)
    this.load.image('cloud_image_1', 'assets/cloud-assets/PNG/Clouds_white/Shape1/cloud_shape1_1.png');
    this.load.image('cloud_image_2', 'assets/cloud-assets/PNG/Clouds_white/Shape2/cloud_shape2_1.png');
    this.load.image('cloud_image_3', 'assets/cloud-assets/PNG/Clouds_white/Shape3/cloud_shape3_1.png');
    this.load.image('cloud_image_4', 'assets/cloud-assets/PNG/Clouds_white/Shape4/cloud_shape4_1.png');
    this.load.image('cloud_image_5', 'assets/cloud-assets/PNG/Clouds_white/Shape5/cloud_shape5_1.png');

    // 8. Load Medieval City Buildings & Decors
    this.load.image('building_caretaker', 'assets/medieval-city-assets/PNG/buildings/building_3/building_1.png');
    this.load.image('building_workshop', 'assets/medieval-city-assets/PNG/buildings/building_5/building_1.png');
    this.load.image('building_storage', 'assets/medieval-city-assets/PNG/buildings/building_11/building_1.png');
    this.load.image('building_research', 'assets/medieval-city-assets/PNG/buildings/building_2/building_1.png');

    this.load.image('city_tree_1', 'assets/medieval-city-assets/PNG/decor/tree_1.png');
    this.load.image('city_tree_2', 'assets/medieval-city-assets/PNG/decor/tree_2.png');
    this.load.image('city_stones', 'assets/medieval-city-assets/PNG/decor/stones_1.png');
    this.load.image('city_decor_barrel', 'assets/medieval-city-assets/PNG/decor/decor_1.png');
    this.load.image('city_decor_well', 'assets/medieval-city-assets/PNG/decor/decor_8.png');
    this.load.image('city_decor_bench', 'assets/medieval-city-assets/PNG/decor/decor_11.png');
    this.load.image('city_decor_mailbox', 'assets/medieval-city-assets/PNG/decor/decor_16.png');

    // 9. Load Audio
    this.load.audio('medieval_audio', 'assets/medieval-audio.mp3');
  }

  private unsafeExtractTexture(name: string, img: CanvasImageSource, row: number, col: number): void {
    if (this.textures.exists(name)) {
      this.textures.remove(name);
    }
    const canvas = this.textures.createCanvas(name, 32, 32);
    if (!canvas) return;
    const ctx = canvas.context;
    if (!ctx) return;
    ctx.drawImage(img, col * 32, row * 32, 32, 32, 0, 0, 32, 32);
    canvas.refresh();
  }

  private extractCharSprites(): void {
    const sheet = this.textures.get('char_sprites');
    if (!sheet || !sheet.key) return;
    const img = sheet.getSourceImage();
    if (!img) return;

    const extract = (name: string, row: number, col: number) => {
      this.unsafeExtractTexture(name, img as HTMLImageElement, row, col);
    };

    // A. Karakter Pemain (The Keeper) - Row 1 (0-indexed row 0)
    extract('player_down_0', 0, 0);
    extract('player_up_0', 0, 1);
    extract('player_left_0', 0, 2);
    extract('player_right_0', 0, 3);

    // Keep old aliases for compatibility
    extract('char_player_down', 0, 0);
    extract('char_player_up', 0, 1);
    extract('char_player_left', 0, 2);
    extract('char_player_right', 0, 3);

    // B. Dr. Evelyn - Row 2 (0-indexed row 1)
    extract('evelyn_down_0', 1, 0);
    extract('evelyn_up_0', 1, 1);
    extract('evelyn_left_0', 1, 2);

    // Keep old aliases for compatibility
    extract('char_evelyn_down', 1, 0);
    extract('char_evelyn_up', 1, 1);
    extract('char_evelyn_left', 1, 2);

    // C. Makhluk (Wild Creatures) - Frame 1 (IDLE) from their respective rows
    extract('creature_meadow_rabbit_idle', 2, 0);
    extract('creature_forest_fox_idle', 3, 0);
    extract('creature_mountain_turtle_idle', 4, 0);
    extract('creature_dunes_golem_idle', 5, 0);
    extract('creature_sky_phoenix_idle', 6, 0);

    // Keep old aliases for compatibility
    extract('char_creature_meadow_rabbit', 2, 0);
    extract('char_creature_forest_fox', 3, 0);
    extract('char_creature_mountain_turtle', 4, 0);
    extract('char_creature_dunes_golem', 5, 0);
    extract('char_creature_sky_phoenix', 6, 0);

    // Override preloaded PNGs with char.png frames for backward compat
    extract('creature_meadow', 2, 0);
    extract('creature_forest', 3, 0);
    extract('creature_mountain', 4, 0);
    extract('creature_dunes', 5, 0);
    extract('creature_sky', 6, 0);
  }

  private createAnimations(): void {
    // 1. Create Leader Animations (Aztec, Maya, Nordic)
    const leaders = ['aztec_leader', 'maya_leader', 'nordic_leader'];
    leaders.forEach(leader => {
      // Idle
      this.anims.create({ key: `${leader}_idle_down`, frames: this.anims.generateFrameNumbers(`${leader}_idle`, { start: 0, end: 15 }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: `${leader}_idle_up`, frames: this.anims.generateFrameNumbers(`${leader}_idle`, { start: 16, end: 31 }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: `${leader}_idle_left`, frames: this.anims.generateFrameNumbers(`${leader}_idle`, { start: 32, end: 47 }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: `${leader}_idle_right`, frames: this.anims.generateFrameNumbers(`${leader}_idle`, { start: 48, end: 63 }), frameRate: 12, repeat: -1 });

      // Walk
      this.anims.create({ key: `${leader}_walk_down`, frames: this.anims.generateFrameNumbers(`${leader}_walk`, { start: 0, end: 19 }), frameRate: 16, repeat: -1 });
      this.anims.create({ key: `${leader}_walk_up`, frames: this.anims.generateFrameNumbers(`${leader}_walk`, { start: 20, end: 39 }), frameRate: 16, repeat: -1 });
      this.anims.create({ key: `${leader}_walk_left`, frames: this.anims.generateFrameNumbers(`${leader}_walk`, { start: 40, end: 59 }), frameRate: 16, repeat: -1 });
      this.anims.create({ key: `${leader}_walk_right`, frames: this.anims.generateFrameNumbers(`${leader}_walk`, { start: 60, end: 79 }), frameRate: 16, repeat: -1 });
    });

    // 2. Create Animal Animations
    const animals = ['hare', 'fox', 'deer', 'boar', 'black_grouse'];
    animals.forEach(animal => {
      // Idle (4 frames per direction)
      this.anims.create({ key: `animal_${animal}_idle_down`, frames: this.anims.generateFrameNumbers(`animal_${animal}_idle`, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: `animal_${animal}_idle_up`, frames: this.anims.generateFrameNumbers(`animal_${animal}_idle`, { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: `animal_${animal}_idle_left`, frames: this.anims.generateFrameNumbers(`animal_${animal}_idle`, { start: 8, end: 11 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: `animal_${animal}_idle_right`, frames: this.anims.generateFrameNumbers(`animal_${animal}_idle`, { start: 12, end: 15 }), frameRate: 6, repeat: -1 });

      // Walk (Hare: 5 frames. Boar: 6. Fox: 6. Deer: 6. Black Grouse: 6.)
      // Since generateFrameNumbers handles start/end safely, we can create custom frame counts
      const walkFramesCount = animal === 'hare' ? 5 : 6;
      this.anims.create({ key: `animal_${animal}_walk_down`, frames: this.anims.generateFrameNumbers(`animal_${animal}_walk`, { start: 0, end: walkFramesCount - 1 }), frameRate: 8, repeat: -1 });
      this.anims.create({ key: `animal_${animal}_walk_up`, frames: this.anims.generateFrameNumbers(`animal_${animal}_walk`, { start: walkFramesCount, end: (walkFramesCount * 2) - 1 }), frameRate: 8, repeat: -1 });
      this.anims.create({ key: `animal_${animal}_walk_left`, frames: this.anims.generateFrameNumbers(`animal_${animal}_walk`, { start: walkFramesCount * 2, end: (walkFramesCount * 3) - 1 }), frameRate: 8, repeat: -1 });
      this.anims.create({ key: `animal_${animal}_walk_right`, frames: this.anims.generateFrameNumbers(`animal_${animal}_walk`, { start: walkFramesCount * 3, end: (walkFramesCount * 4) - 1 }), frameRate: 8, repeat: -1 });

      // Run / Flight (Hare: 6. Boar: 5. Fox: 6. Deer: 6. Black Grouse Flight: 6.)
      const runSheetKey = animal === 'black_grouse' ? `animal_black_grouse_flight` : `animal_${animal}_run`;
      const runFramesCount = animal === 'boar' ? 5 : 6;
      this.anims.create({ key: `animal_${animal}_run_down`, frames: this.anims.generateFrameNumbers(runSheetKey, { start: 0, end: runFramesCount - 1 }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: `animal_${animal}_run_up`, frames: this.anims.generateFrameNumbers(runSheetKey, { start: runFramesCount, end: (runFramesCount * 2) - 1 }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: `animal_${animal}_run_left`, frames: this.anims.generateFrameNumbers(runSheetKey, { start: runFramesCount * 2, end: (runFramesCount * 3) - 1 }), frameRate: 12, repeat: -1 });
      this.anims.create({ key: `animal_${animal}_run_right`, frames: this.anims.generateFrameNumbers(runSheetKey, { start: runFramesCount * 3, end: (runFramesCount * 4) - 1 }), frameRate: 12, repeat: -1 });
    });

    // 3. Lana (Keeper) Animations - reuse aztec_leader spritesheets
    this.anims.create({ key: 'lana_leader_idle_down', frames: this.anims.generateFrameNumbers('aztec_leader_idle', { start: 0, end: 15 }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'lana_leader_idle_up', frames: this.anims.generateFrameNumbers('aztec_leader_idle', { start: 16, end: 31 }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'lana_leader_idle_left', frames: this.anims.generateFrameNumbers('aztec_leader_idle', { start: 32, end: 47 }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'lana_leader_idle_right', frames: this.anims.generateFrameNumbers('aztec_leader_idle', { start: 48, end: 63 }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'lana_leader_walk_down', frames: this.anims.generateFrameNumbers('aztec_leader_walk', { start: 0, end: 19 }), frameRate: 16, repeat: -1 });
    this.anims.create({ key: 'lana_leader_walk_up', frames: this.anims.generateFrameNumbers('aztec_leader_walk', { start: 20, end: 39 }), frameRate: 16, repeat: -1 });
    this.anims.create({ key: 'lana_leader_walk_left', frames: this.anims.generateFrameNumbers('aztec_leader_walk', { start: 40, end: 59 }), frameRate: 16, repeat: -1 });
    this.anims.create({ key: 'lana_leader_walk_right', frames: this.anims.generateFrameNumbers('aztec_leader_walk', { start: 60, end: 79 }), frameRate: 16, repeat: -1 });

    // Luna NPC is now loaded as a static image, so no animations are created here.

    // 4. Campfire Animation
    this.anims.create({
      key: 'campfire_burn',
      frames: this.anims.generateFrameNumbers('campfire_fire', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });

    // 5. Generate procedural creature textures for visual diversity
    this.generateCreatureTextures();
  }

  private generateCreatureTextures(): void {
    // Generate unique procedural textures for creatures that don't have spritesheets
    // This adds visual variety beyond the 5 animal sprite types
    const creatureCanvas: Array<{key: string; draw: (ctx: CanvasRenderingContext2D) => void}> = [
      // Spirit-type creatures: luminous_moth, cloud_sprite, wind_serpent, desert_spirit
      {
        key: 'creature_glow_orb',
        draw: (ctx) => {
          ctx.fillStyle = '#80e0ff';
          ctx.beginPath();
          ctx.arc(16, 16, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(13, 12, 3, 0, Math.PI * 2);
          ctx.fill();
          // Outer glow ring
          ctx.strokeStyle = '#80e0ff';
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(16, 16, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      },
      // Slime/blob type: mossy_toad, dune_beetle, crystal_turtle
      {
        key: 'creature_slime',
        draw: (ctx) => {
          ctx.fillStyle = '#709050';
          ctx.beginPath();
          ctx.ellipse(16, 18, 10, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          // Top bump
          ctx.beginPath();
          ctx.ellipse(14, 10, 6, 5, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(11, 12, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(18, 12, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#222222';
          ctx.beginPath();
          ctx.arc(12, 12, 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(19, 12, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      // Dragon/reptile type: thunder_drake, dragon, geode_golem
      {
        key: 'creature_dragon',
        draw: (ctx) => {
          // Body
          ctx.fillStyle = '#d50000';
          ctx.beginPath();
          ctx.ellipse(16, 18, 9, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Head
          ctx.beginPath();
          ctx.ellipse(22, 12, 6, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          // Eye
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.arc(24, 11, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#222';
          ctx.beginPath();
          ctx.arc(24, 11, 1, 0, Math.PI * 2);
          ctx.fill();
          // Wings
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.moveTo(14, 10);
          ctx.lineTo(6, 2);
          ctx.lineTo(12, 12);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(12, 10);
          ctx.lineTo(4, 8);
          ctx.lineTo(10, 14);
          ctx.fill();
          // Spikes
          ctx.fillStyle = '#ffaa00';
          for (let i = 0; i < 4; i++) {
            const sx = 12 + i * 3;
            ctx.beginPath();
            ctx.moveTo(sx, 12);
            ctx.lineTo(sx + 1, 6);
            ctx.lineTo(sx + 2, 12);
            ctx.fill();
          }
        }
      },
      // Celestial type: celestial_stag, moonlight_unicorn, aurora_wolf, star_rabbit
      {
        key: 'creature_celestial',
        draw: (ctx) => {
          ctx.fillStyle = '#8a2be2';
          ctx.beginPath();
          ctx.ellipse(16, 18, 8, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Neck/head
          ctx.beginPath();
          ctx.ellipse(16, 8, 4, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Stars
          ctx.fillStyle = '#ffffff';
          [[8, 12], [22, 10], [10, 20], [20, 22], [14, 14]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          });
          // Horn/antler
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(16, 3);
          ctx.lineTo(14, -2);
          ctx.lineTo(12, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(16, 3);
          ctx.lineTo(18, -2);
          ctx.lineTo(20, 0);
          ctx.stroke();
        }
      },
      // Shell/crustacean type: crystal_turtle, pebble_goat, cactus_camel
      {
        key: 'creature_shell',
        draw: (ctx) => {
          // Shell dome
          ctx.fillStyle = '#40e0d0';
          ctx.beginPath();
          ctx.ellipse(16, 16, 11, 9, 0, Math.PI, 0);
          ctx.fill();
          // Underbelly
          ctx.fillStyle = '#a0e0d0';
          ctx.beginPath();
          ctx.ellipse(16, 18, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          // Shell pattern
          ctx.strokeStyle = '#20c0b0';
          ctx.lineWidth = 1;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(12 + i * 4, 12, 2.5 + Math.random(), 0, Math.PI * 2);
            ctx.stroke();
          }
          // Head
          ctx.fillStyle = '#80e8d8';
          ctx.beginPath();
          ctx.ellipse(6, 16, 4, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          // Eye
          ctx.fillStyle = '#222';
          ctx.beginPath();
          ctx.arc(5, 15, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      // Flame type: phoenix, desert_spirit, sun_falcon
      {
        key: 'creature_flame',
        draw: (ctx) => {
          // Body
          ctx.fillStyle = '#ff5722';
          ctx.beginPath();
          ctx.ellipse(16, 18, 8, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          // Flame wisps
          const colors = ['#ff5722', '#ff8a00', '#ffcc00'];
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = colors[i % colors.length];
            ctx.globalAlpha = 0.5 + Math.random() * 0.3;
            const fx = 10 + Math.random() * 12;
            const fy = 6 + Math.random() * 6;
            ctx.beginPath();
            ctx.ellipse(fx, fy, 2 + Math.random() * 3, 3 + Math.random() * 3, Math.random() * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          // Eye
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(14, 16, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#222';
          ctx.beginPath();
          ctx.arc(14, 16, 1, 0, Math.PI * 2);
          ctx.fill();
          // Crown flame
          ctx.fillStyle = '#ffcc00';
          ctx.beginPath();
          ctx.moveTo(14, 10);
          ctx.lineTo(16, 4);
          ctx.lineTo(18, 10);
          ctx.fill();
        }
      },
      // Jellyfish/tentacle type: wind_serpent, mirage_jackal
      {
        key: 'creature_jelly',
        draw: (ctx) => {
          // Dome
          ctx.fillStyle = '#70e0b0';
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.ellipse(16, 14, 10, 7, 0, Math.PI, 0);
          ctx.fill();
          ctx.globalAlpha = 1;
          // Inner
          ctx.fillStyle = '#a0ffd0';
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.ellipse(16, 14, 6, 4, 0, Math.PI, 0);
          ctx.fill();
          ctx.globalAlpha = 1;
          // Tentacles
          ctx.strokeStyle = '#70e0b0';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 4; i++) {
            const tx = 10 + i * 4;
            ctx.beginPath();
            ctx.moveTo(tx, 20);
            ctx.lineTo(tx - 2 + Math.random() * 4, 26 + Math.random() * 4);
            ctx.stroke();
          }
          // Eyes
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(12, 13, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(20, 13, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#222';
          ctx.beginPath();
          ctx.arc(13, 13, 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(21, 13, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      // Golem/rock type: geode_golem, pebble_goat, dune_beetle
      {
        key: 'creature_golem',
        draw: (ctx) => {
          // Rocky body
          ctx.fillStyle = '#9040c0';
          ctx.beginPath();
          ctx.moveTo(8, 24);
          ctx.lineTo(4, 14);
          ctx.lineTo(8, 6);
          ctx.lineTo(14, 3);
          ctx.lineTo(20, 4);
          ctx.lineTo(26, 8);
          ctx.lineTo(28, 16);
          ctx.lineTo(24, 24);
          ctx.closePath();
          ctx.fill();
          // Crystal facets
          ctx.fillStyle = '#b070e0';
          ctx.strokeStyle = '#7030a0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(10, 18);
          ctx.lineTo(8, 12);
          ctx.lineTo(14, 8);
          ctx.lineTo(18, 12);
          ctx.lineTo(14, 18);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Eye glow
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(12, 12, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ff00ff';
          ctx.beginPath();
          ctx.arc(12, 12, 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(20, 12, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ff00ff';
          ctx.beginPath();
          ctx.arc(20, 12, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      // Three-headed (Cerberus)
      {
        key: 'creature_threeheads',
        draw: (ctx) => {
          // Body
          ctx.fillStyle = '#503030';
          ctx.beginPath();
          ctx.ellipse(16, 20, 11, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          // Three heads
          const heads = [[8, 12], [16, 10], [24, 12]];
          heads.forEach(([hx, hy]) => {
            ctx.beginPath();
            ctx.ellipse(hx, hy, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes (angry red)
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(hx - 1.5, hy - 1, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(hx + 1.5, hy - 1, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#503030';
          });
          // Fire breath
          ctx.fillStyle = '#ff6600';
          ctx.globalAlpha = 0.6;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(16 + (i - 1) * 8 + 4, 10 + Math.random() * 3, 2 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      },
      // Winged horse (Pegasus)
      {
        key: 'creature_winged',
        draw: (ctx) => {
          // Body
          ctx.fillStyle = '#f0f5ff';
          ctx.beginPath();
          ctx.ellipse(16, 18, 9, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Neck/head
          ctx.beginPath();
          ctx.ellipse(16, 8, 4, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Wings
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.moveTo(8, 12);
          ctx.lineTo(0, 4);
          ctx.lineTo(4, 8);
          ctx.lineTo(-2, 6);
          ctx.lineTo(6, 14);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(24, 12);
          ctx.lineTo(32, 4);
          ctx.lineTo(28, 8);
          ctx.lineTo(34, 6);
          ctx.lineTo(26, 14);
          ctx.fill();
          ctx.globalAlpha = 1;
          // Eye
          ctx.fillStyle = '#222';
          ctx.beginPath();
          ctx.arc(14, 7, 1.5, 0, Math.PI * 2);
          ctx.fill();
          // Stardust
          ctx.fillStyle = '#ffd700';
          [[6, 16], [10, 22], [18, 20], [24, 16]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      },
    ];

    creatureCanvas.forEach(({ key, draw }) => {
      if (this.textures.exists(key)) return;
      const canvas = this.textures.createCanvas(key, 32, 32);
      if (!canvas) return;
      const ctx = canvas.context;
      if (!ctx) return;
      draw(ctx);
      canvas.refresh();
    });

    if (!this.textures.exists('rope_texture')) {
      const ropeCanvas = this.textures.createCanvas('rope_texture', 16, 8);
      if (ropeCanvas && ropeCanvas.context) {
        const ctx = ropeCanvas.context;
        // Draw braided rope pattern
        ctx.fillStyle = '#8a5200'; // Dark brown shadow/border
        ctx.fillRect(0, 0, 16, 8);
        ctx.fillStyle = '#cda075'; // Lighter brown
        ctx.fillRect(0, 1, 16, 6);
        ctx.fillStyle = '#fce4c4'; // Highlight
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(6, 0);
        ctx.lineTo(8, 0);
        ctx.lineTo(2, 6);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8, 6);
        ctx.lineTo(14, 0);
        ctx.lineTo(16, 0);
        ctx.lineTo(10, 6);
        ctx.fill();
        ropeCanvas.refresh();
      }
    }

    // Generate Rope Icons for Shop
    const ropeIcons = [
      { key: 'rope_basic', color: '#cda075', hl: '#fce4c4' },
      { key: 'rope_strong', color: '#888888', hl: '#cccccc' },
      { key: 'rope_magic', color: '#9b59b6', hl: '#e8b9f7' },
      { key: 'rope_divine', color: '#ffd700', hl: '#ffffe0' }
    ];

    ropeIcons.forEach(({ key, color, hl }) => {
      if (this.textures.exists(key)) return;
      const cvs = this.textures.createCanvas(key, 64, 64);
      if (!cvs || !cvs.context) return;
      const ctx = cvs.context;

      // Draw a coiled rope icon
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#3e2723';
      ctx.beginPath();
      ctx.arc(32, 32, 22, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(32, 32, 22, 0, Math.PI * 2);
      ctx.stroke();

      // Inner coil
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#3e2723';
      ctx.beginPath();
      ctx.arc(32, 32, 14, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.lineWidth = 3;
      ctx.strokeStyle = hl;
      ctx.beginPath();
      ctx.arc(32, 32, 14, 0, Math.PI * 2);
      ctx.stroke();

      cvs.refresh();
    });
  }

  create(): void {
    // Extract named textures from char.png spritesheet
    this.extractCharSprites();

    // Create all new animations from loaded sheets
    this.createAnimations();

    // Initialize systems
    DataLoader.initialize(this.cache);
    AudioManager.initialize();
    SaveSystem.loadGame();

    // Start playing background music (menu music)
    AudioManager.playMusic('music_menu');

    // Go to Main Menu
    this.scene.start('MainMenuScene');
  }
}
