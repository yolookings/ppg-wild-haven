// src/scenes/ExploreScene.ts
import Phaser from 'phaser';
import { AreaId, Creature } from '../data/types';
import { DataLoader } from '../data/DataLoader';
import { SaveSystem } from '../systems/SaveSystem';
import { WildCreature } from '../entities/WildCreature';
import { Player } from '../entities/Player';
import { CaptureResult } from '../systems/CaptureSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { AchievementSystem } from '../systems/AchievementSystem';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';

export class ExploreScene extends Phaser.Scene {
  private areaId!: AreaId;
  private areaData: any;
  private activeCreatures: WildCreature[] = [];
  
  // Player entity
  private player!: Player;
  
  // Environmental particles
  private weatherGroup!: Phaser.GameObjects.Group;
  
  // Map collectibles arrays
  private collectibles: Phaser.GameObjects.Container[] = [];
  private collectiblesGroup!: Phaser.Physics.Arcade.Group;
  private skyDropTimer!: Phaser.Time.TimerEvent;

  // Physical Interactive structures
  private merchantStall: Phaser.GameObjects.Container | null = null;
  private merchantShopPanel: Phaser.GameObjects.Container | null = null;
  private sellBoxContainer: Phaser.GameObjects.Container | null = null;
  private sellPanel: Phaser.GameObjects.Container | null = null;
  private sanctuaryPortalContainer: Phaser.GameObjects.Container | null = null;

  // Interaction prompt bubble
  private interactBubble!: Phaser.GameObjects.Container;
  private interactBubbleBg!: Phaser.GameObjects.NineSlice;
  private interactBubbleText!: Phaser.GameObjects.Text;
  private nearestInteractable: any = null;
  private nearestInteractableType: 'creature' | 'merchant' | 'portal' | 'sellbox' | null = null;

  // Tug-of-War Capture Minigame properties
  private activeCreatureForCapture: WildCreature | null = null;
  private qteContainer: Phaser.GameObjects.Container | null = null;
  private isQteActive = false;
  private qteBarGraphics: Phaser.GameObjects.Graphics | null = null;
  private towProgress = 45;
  private towTimerRemaining = 15.0;
  private towClickPower = 5.0;
  private towResistance = 8.0;
  private towProgressText: Phaser.GameObjects.Text | null = null;
  private towTimerText: Phaser.GameObjects.Text | null = null;
  private areaSelectPanel: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('ExploreScene');
  }

  init(data: { areaId?: AreaId }): void {
    const state = SaveSystem.getState();
    this.areaId = data.areaId || (state.unlockedAreas[state.unlockedAreas.length - 1] as AreaId) || 'green_meadow';
    this.areaData = DataLoader.getArea(this.areaId)!;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Launch UI Overlay Scene if not running
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    // Update Area label in HUD
    this.time.delayedCall(100, () => {
      const uiScene = this.scene.get('UIScene') as any;
      if (uiScene && uiScene.setAreaText) {
        uiScene.setAreaText(`🧭 ${this.areaData.name}`);
      }
    });

    this.cameras.main.fadeIn(500, 26, 35, 30);

    // 1. Play Theme Music
    AudioManager.playMusic(this.areaData.musicTrack);

    // 2. Render Parallax Background
    this.createBiomeBackground(width, height);

    // 3. Environmental Particles
    this.weatherGroup = this.add.group();
    this.createWeatherEffects(width, height);

    // Set Arcade physics boundaries for top-down walking (only on ground lawn/road area)
    const groundY = height * 0.45;
    this.physics.world.setBounds(0, groundY, width, height - groundY - 40);

    // Initialize collectibles physics group
    this.collectiblesGroup = this.physics.add.group();

    // 4. Return to Sanctuary Portal
    this.createPortalToSanctuary(width, height); // Button UI
    this.createSanctuaryPortal(width, height);   // Physical Gate on map

    // Area Switcher trigger button
    this.createAreaSwitchButton(width, height);

    // 5. Spawn Merchant Stall
    this.createMerchantStall(width, height);

    // Spawn Physical Sell Box
    this.createSellBox(width, height);

    // 6. Spawn Wild Creatures
    this.spawnWildCreatures();

    // Instantiate Player
    this.player = new Player(this, width / 2, height * 0.7);
    this.add.existing(this.player);

    // 7. Spawn Map Collectibles
    this.spawnMapCollectibles(width, height);

    // Overlap checks between Player and Collectibles
    this.physics.add.overlap(this.player, this.collectiblesGroup, (_player, collectible) => {
      const container = collectible as Phaser.GameObjects.Container;
      if (container.getData('isChest')) {
        this.collectChest(container);
      } else if (container.getData('isSkyDrop')) {
        this.collectSkyDrop(container);
      } else {
        this.collectMagicFruit(container);
      }
    });

    // 8. Start Sky Drops Scheduler (Every 25 seconds)
    this.skyDropTimer = this.time.addEvent({
      delay: 25000,
      callback: () => this.spawnSkyDrop(width, height),
      loop: true
    });

    // Proximity interact bubble prompt
    this.interactBubble = this.add.container(0, 0);
    this.interactBubbleBg = this.add.nineslice(0, 0, 'button', 0, 110, 22, 4, 4, 4, 4);
    this.interactBubbleText = this.add.text(0, 0, '[SPACE] INTERACT', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#5c4832',
      stroke: '#fff7e6',
      strokeThickness: 1.5
    }).setOrigin(0.5);
    this.interactBubble.add([this.interactBubbleBg, this.interactBubbleText]);
    this.interactBubble.setDepth(120);
    this.interactBubble.setVisible(false);

    // Interaction key listener
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.nearestInteractable && !this.isQteActive && !this.sellPanel && !this.merchantShopPanel) {
        if (this.nearestInteractableType === 'creature') {
          this.startCaptureMinigame(this.nearestInteractable);
        } else if (this.nearestInteractableType === 'merchant') {
          this.openMerchantShop();
        } else if (this.nearestInteractableType === 'portal') {
          this.transitionToSanctuary();
        } else if (this.nearestInteractableType === 'sellbox') {
          this.openSellBoxPanel();
        }
      }
    });

    // Resize handler
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(_gameSize: Phaser.Structs.Size): void {
    this.scene.restart({ areaId: this.areaId });
  }

  private createBiomeBackground(width: number, height: number): void {
    const p = this.areaData.palette;
    
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      Phaser.Display.Color.HexStringToColor(p[3] || p[0]).color,
      Phaser.Display.Color.HexStringToColor(p[3] || p[0]).color,
      Phaser.Display.Color.HexStringToColor(p[0]).color,
      Phaser.Display.Color.HexStringToColor(p[0]).color,
      1
    );
    bg.fillRect(0, 0, width, height);

    const layerCount = 3;
    for (let l = 0; l < layerCount; l++) {
      const g = this.add.graphics();
      let layerColorStr = p[1];
      if (l === 0) layerColorStr = p[0];
      else if (l === 2) layerColorStr = p[2] || p[1];

      const layerColor = Phaser.Display.Color.HexStringToColor(layerColorStr).color;
      g.fillStyle(layerColor, 0.45 + l * 0.25);

      const points: Phaser.Geom.Point[] = [];
      const segmentCount = 8;
      const segmentW = width / segmentCount;

      points.push(new Phaser.Geom.Point(0, height));
      const horizonY = height * 0.45 + l * 80;
      const amplitude = 30 + l * 15;

      for (let i = 0; i <= segmentCount; i++) {
        const x = i * segmentW;
        const y = horizonY + Math.cos((i + l) * 1.5) * amplitude;
        points.push(new Phaser.Geom.Point(x, y));
      }

      points.push(new Phaser.Geom.Point(width, height));
      g.fillPoints(points);

      this.tweens.add({
        targets: g,
        x: l % 2 === 0 ? 15 : -15,
        duration: 8000 + l * 5000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createWeatherEffects(width: number, height: number): void {
    const effectCount = 15;
    for (let i = 0; i < effectCount; i++) {
      const dot = this.add.graphics();
      let color = 0xffffff;
      let alpha = 0.5;
      let size = 3;

      if (this.areaId === 'green_meadow') {
        color = 0xffe9a8;
        size = 2.5;
      } else if (this.areaId === 'whisper_forest') {
        color = 0xfff9a8;
        size = 3.5;
        alpha = 0.8;
      } else if (this.areaId === 'crystal_mountain') {
        color = 0xffffff;
        size = 4;
      } else if (this.areaId === 'golden_dunes') {
        color = 0xff9f45;
        size = 2;
        alpha = 0.4;
      } else if (this.areaId === 'sky_island') {
        color = 0xffd9a0;
        size = 3;
      }

      dot.fillStyle(color, alpha);
      dot.fillCircle(0, 0, size);
      
      const star = this.add.container(Math.random() * width, Math.random() * height * 0.8);
      star.add(dot);
      this.weatherGroup.add(star);

      this.tweens.add({
        targets: star,
        x: star.x + (Math.random() * 80 - 40),
        y: star.y + (this.areaId === 'crystal_mountain' ? 120 : -60),
        alpha: { start: 0, to: alpha },
        duration: 3000 + Math.random() * 3000,
        repeat: -1,
        yoyo: this.areaId !== 'crystal_mountain',
        ease: 'Sine.easeInOut',
        onRepeat: () => {
          if (this.areaId === 'crystal_mountain') {
            star.y = 0;
            star.x = Math.random() * width;
          }
        }
      });
    }
  }

  private createPortalToSanctuary(_width: number, height: number): void {
    const portal = this.add.container(65, height - 70);
    const gateBg = this.add.nineslice(0, 0, 'button', 0, 100, 36, 6, 6, 6, 6);
    gateBg.setInteractive({ useHandCursor: true });
    
    const gateTxt = this.add.text(0, 0, '🏰 Return', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    portal.add([gateBg, gateTxt]);

    gateBg.on('pointerdown', () => {
      AudioManager.playSfx('ui_confirm');
      this.cameras.main.fadeOut(500, 26, 35, 30);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop();
        this.scene.start('SanctuaryScene');
      });
    });

    gateBg.on('pointerover', () => portal.setScale(1.04));
    gateBg.on('pointerout', () => portal.setScale(1.0));
  }

  private createAreaSwitchButton(width: number, height: number): void {
    const btn = this.add.container(width - 75, height - 70);
    const bg = this.add.nineslice(0, 0, 'button', 0, 120, 36, 6, 6, 6, 6);
    bg.setInteractive({ useHandCursor: true });
    
    const txt = this.add.text(0, 0, '🗺️ Biomes', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    btn.add([bg, txt]);

    bg.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.showAreaSelectPanel();
    });

    bg.on('pointerover', () => btn.setScale(1.04));
    bg.on('pointerout', () => btn.setScale(1.0));
  }

  // 🏪 TRAVELING MERCHANT ENTITY
  private createMerchantStall(width: number, height: number): void {
    const stallX = width * 0.15;
    const stallY = height * 0.45;

    this.merchantStall = this.add.container(stallX, stallY);

    // Procedural Stall Awning Graphic
    const awning = this.add.graphics();
    awning.fillStyle(0xff5c8a, 1); // Red stripes
    awning.fillRoundedRect(-30, -35, 60, 15, 3);
    awning.fillStyle(0xffffff, 1); // White stripes
    awning.fillRect(-15, -35, 10, 15);
    awning.fillRect(15, -35, 10, 15);
    awning.lineStyle(2, 0x5c4832, 1);
    awning.strokeRoundedRect(-30, -35, 60, 15, 3);

    // Wooden stall frame
    const frame = this.add.graphics();
    frame.fillStyle(0xa8763d, 1); // wood base
    frame.fillRect(-26, -20, 52, 28);
    frame.lineStyle(2, 0x5c4832, 1);
    frame.strokeRect(-26, -20, 52, 28);
    // Stall poles
    frame.lineStyle(3, 0x5c4832, 1);
    frame.lineBetween(-28, -20, -28, -35);
    frame.lineBetween(28, -20, 28, -35);

    this.merchantStall.add([frame, awning]);

    // Merchant sign
    const sign = this.add.text(0, -45, '🏪 MERCHANT', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#5c4832',
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5);
    this.merchantStall.add(sign);

    // Make interactive
    const clickZone = this.add.zone(0, -10, 70, 70).setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', () => {
      AudioManager.playSfx('ui_confirm');
      this.openMerchantShop();
    });
    this.merchantStall.add(clickZone);

    this.tweens.add({
      targets: this.merchantStall,
      y: stallY + 3,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // 🎒 SPAWN MAP COLLECTIBLES (Chests & Magic Fruits)
  private spawnMapCollectibles(width: number, height: number): void {
    if (this.collectiblesGroup) {
      this.collectiblesGroup.clear(true, true);
    }
    this.collectibles = [];

    // Spawn 2 chests and 3 magic fruits randomly on coordinates
    const spawnsCount = 2 + Math.floor(Math.random() * 2);

    for (let c = 0; c < spawnsCount; c++) {
      const rx = 100 + Math.random() * (width - 200);
      const ry = height * 0.45 + Math.random() * (height * 0.35);

      const isChest = Math.random() > 0.4;
      const container = this.add.container(rx, ry);
      container.setData('isChest', isChest);

      if (isChest) {
        // Draw Treasure Chest procedurally
        const box = this.add.graphics();
        box.fillStyle(0xf2c879, 1); // Gold top
        box.fillRect(-12, -8, 24, 16);
        box.fillStyle(0x8a5200, 1); // dark wood bands
        box.fillRect(-12, -2, 24, 4);
        box.fillRect(-4, -8, 8, 16);
        box.lineStyle(2, 0x5c4832, 1);
        box.strokeRect(-12, -8, 24, 16);
        container.add(box);

        const click = this.add.zone(0, 0, 36, 36).setInteractive({ useHandCursor: true });
        click.on('pointerdown', () => this.collectChest(container));
        container.add(click);
      } else {
        // Draw Magic Fruit (Purple berry)
        const berry = this.add.graphics();
        berry.fillStyle(0xb05fe0, 1); // Purple circle
        berry.fillCircle(0, 2, 8);
        berry.fillStyle(0x8fd14f, 1); // Green leaf
        berry.fillTriangle(-4, -6, 2, -7, 0, -2);
        berry.lineStyle(1.5, 0x5c4832, 1);
        berry.strokeCircle(0, 2, 8);
        container.add(berry);

        const click = this.add.zone(0, 0, 30, 30).setInteractive({ useHandCursor: true });
        click.on('pointerdown', () => this.collectMagicFruit(container));
        container.add(click);
      }

      // Small hover bounce
      this.tweens.add({
        targets: container,
        y: ry - 4,
        duration: 1200 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Enable physics for collision overlaps
      this.physics.add.existing(container);
      const body = container.body as Phaser.Physics.Arcade.Body;
      body.setImmovable(true);
      body.setSize(30, 30);
      body.setOffset(-15, -15);
      
      this.collectiblesGroup.add(container);
      this.collectibles.push(container);
    }
  }

  private collectChest(container: Phaser.GameObjects.Container): void {
    if (!container.active) return;
    AudioManager.playSfx('coin_collect');
    
    const state = SaveSystem.getState();
    const goldReward = 50 + Math.floor(Math.random() * 150);
    const gemReward = Math.random() > 0.8 ? 2 : 0;

    state.coins += goldReward;
    state.gems += gemReward;
    
    AchievementSystem.trackMetric('lifetime_coins', goldReward);
    SaveSystem.markDirty();
    SaveSystem.forceSave();

    EventBus.emit('coinsChanged', state.coins);
    if (gemReward > 0) EventBus.emit('gemsChanged', state.gems);

    // Sparkles
    let textReward = `+${goldReward} Coins`;
    if (gemReward > 0) textReward += `\n+${gemReward} Gems!`;
    this.createRewardFloatingText(container.x, container.y - 12, textReward);

    this.collectibles = this.collectibles.filter(item => item !== container);
    this.collectiblesGroup.remove(container);
    container.destroy();
  }

  private collectMagicFruit(container: Phaser.GameObjects.Container): void {
    if (!container.active) return;
    AudioManager.playSfx('ui_confirm');
    
    const state = SaveSystem.getState();
    state.magicFruits = (state.magicFruits || 0) + 1;
    SaveSystem.markDirty();

    this.createRewardFloatingText(container.x, container.y - 12, `+1 Magic Fruit ☘️`);

    this.collectibles = this.collectibles.filter(item => item !== container);
    this.collectiblesGroup.remove(container);
    container.destroy();
  }

  // ✈️ SKY DROPS CRATE
  private spawnSkyDrop(width: number, height: number): void {
    const rx = 100 + Math.random() * (width - 200);
    const ry = height * 0.45 + Math.random() * (height * 0.35);

    const crate = this.add.container(rx, -50);
    crate.setData('isSkyDrop', true);

    // Draw parachute and crate
    const g = this.add.graphics();
    // Parachute
    g.fillStyle(0xffffff, 0.7);
    g.fillEllipse(0, -32, 28, 14);
    g.lineStyle(1, 0x5c4832, 1);
    g.strokeEllipse(0, -32, 28, 14);
    // Parachute strings
    g.lineStyle(1, 0x5c4832, 0.5);
    g.lineBetween(-10, -28, -6, -10);
    g.lineBetween(10, -28, 6, -10);
    // Crate
    g.fillStyle(0xc18a4d, 1);
    g.fillRect(-8, -10, 16, 16);
    g.lineStyle(2, 0x5c4832, 1);
    g.strokeRect(-8, -10, 16, 16);
    // Diagonal brace
    g.lineBetween(-8, -10, 8, 6);

    crate.add(g);

    // Crate label text
    const label = this.add.text(0, 10, '🎁 DROP', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '7px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#ff5c8a',
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5);
    crate.add(label);

    const clickZone = this.add.zone(0, 0, 32, 50).setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', () => {
      this.collectSkyDrop(crate);
    });
    crate.add(clickZone);

    this.add.existing(crate);

    // Drifts down from sky
    this.tweens.add({
      targets: crate,
      y: ry,
      duration: 5000,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Remove parachute graphics and let crate sit on grass
        g.clear();
        g.fillStyle(0xc18a4d, 1);
        g.fillRect(-8, -10, 16, 16);
        g.lineStyle(2, 0x5c4832, 1);
        g.strokeRect(-8, -10, 16, 16);
        g.lineBetween(-8, -10, 8, 6);

        // Add physics on landing
        this.physics.add.existing(crate);
        const body = crate.body as Phaser.Physics.Arcade.Body;
        body.setImmovable(true);
        body.setSize(24, 24);
        body.setOffset(-12, -12);
        
        this.collectiblesGroup.add(crate);
      }
    });
  }

  private collectSkyDrop(crate: Phaser.GameObjects.Container): void {
    if (!crate.active) return;
    AudioManager.playSfx('achievement_unlock');
    
    const state = SaveSystem.getState();
    const roll = Math.random();
    
    if (roll > 0.6) {
      // Strong Rope drop
      if (!state.ropesOwned.includes('rope_strong')) {
        state.ropesOwned.push('rope_strong');
        this.createRewardFloatingText(crate.x, crate.y - 12, 'Unlocked:\nStrong Lasso! 🧭');
        EventBus.emit('ropePurchased', 'rope_strong');
      } else {
        state.coins += 500;
        this.createRewardFloatingText(crate.x, crate.y - 12, '+500 Coins 🪙');
        EventBus.emit('coinsChanged', state.coins);
      }
    } else {
      // Magic berry or coins
      state.coins += 350;
      this.createRewardFloatingText(crate.x, crate.y - 12, '+350 Coins 🪙');
      EventBus.emit('coinsChanged', state.coins);
    }

    SaveSystem.markDirty();
    SaveSystem.forceSave();
    
    this.collectiblesGroup.remove(crate);
    crate.destroy();
  }

  private spawnWildCreatures(): void {
    this.activeCreatures.forEach(c => c.destroy());
    this.activeCreatures = [];

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const spawns = [
      { x: width * 0.32, y: height * 0.52 },
      { x: width * 0.52, y: height * 0.48 },
      { x: width * 0.72, y: height * 0.55 },
      { x: width * 0.42, y: height * 0.68 },
      { x: width * 0.62, y: height * 0.65 }
    ];

    const count = 2 + Math.floor(Math.random() * 2);
    const shuffledSpawns = [...spawns].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const pos = shuffledSpawns[i];
      if (!pos) continue;

      const creatureData = this.rollCreatureForArea();
      if (!creatureData) continue;

      const state = SaveSystem.getState();
      if (!state.discoveredCreatureIds.includes(creatureData.id)) {
        state.discoveredCreatureIds.push(creatureData.id);
        SaveSystem.markDirty();
      }

      const wild = new WildCreature(this, pos.x, pos.y, creatureData, (c) => this.startCaptureMinigame(c));
      this.add.existing(wild);
      this.activeCreatures.push(wild);
    }
  }

  private rollCreatureForArea(): Creature | null {
    const state = SaveSystem.getState();
    const roster = DataLoader.getCreaturesByArea(this.areaId);

    const available = roster.filter(c => state.level >= c.unlockLevel);
    if (available.length === 0) return null;

    const roll = Math.random() * 100;
    let targetRarity = 'Common';

    if (roll < 0.5) targetRarity = 'Mythic';
    else if (roll < 5.0) targetRarity = 'Legendary';
    else if (roll < 17.0) targetRarity = 'Epic';
    else if (roll < 45.0) targetRarity = 'Rare';
    else targetRarity = 'Common';

    let pool = available.filter(c => c.rarity === targetRarity);
    if (pool.length === 0) pool = available;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 🏹 TUG OF WAR CAPTURE SYSTEM (V2)
  private startCaptureMinigame(creature: WildCreature): void {
    if (this.isQteActive) return;
    this.isQteActive = true;
    this.activeCreatureForCapture = creature;
    
    // Stop character movement
    this.player.stopMovement();

    this.towProgress = 45; // Starts at 45%
    this.towTimerRemaining = 15.0; // 15 seconds limit

    AudioManager.playSfx('capture_start');

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Get equipped rope config
    const state = SaveSystem.getState();
    const ropeId = state.currentRopeId || 'rope_basic';
    
    let ropeMult = 1.0;
    let resRed = 0.0;
    
    if (ropeId === 'rope_strong') {
      ropeMult = 1.5;
      resRed = 0.15;
    } else if (ropeId === 'rope_magic') {
      ropeMult = 2.2;
      resRed = 0.35;
    } else if (ropeId === 'rope_divine') {
      ropeMult = 3.5;
      resRed = 0.55;
    }

    // Get creature specifications
    let baseClickInc = 10.0;
    let baseRes = 6.0;
    const rarity = creature.creatureData.rarity;
    
    if (rarity === 'Rare') {
      baseClickInc = 7.0;
      baseRes = 9.0;
    } else if (rarity === 'Epic') {
      baseClickInc = 5.0;
      baseRes = 14.0;
    } else if (rarity === 'Legendary') {
      baseClickInc = 3.5;
      baseRes = 20.0;
    } else if (rarity === 'Mythic') {
      baseClickInc = 2.0;
      baseRes = 28.0;
    }

    this.towClickPower = baseClickInc * ropeMult;
    this.towResistance = baseRes * (1 - resRed);

    // Build the Tug-of-War panel
    this.qteContainer = this.add.container(width / 2, height * 0.68);

    const qteBg = this.add.nineslice(0, 0, 'panel_frame', 0, 360, 150, 8, 8, 8, 8);
    this.qteContainer.add(qteBg);

    const inst = this.add.text(0, -55, `TUG-OF-WAR: Capturing ${creature.creatureData.name}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#5c4832',
      stroke: '#fff7e6',
      strokeThickness: 1.5
    }).setOrigin(0.5);
    this.qteContainer.add(inst);

    const subInst = this.add.text(0, -40, 'TAP SPACE OR CLICK PULL QUICKLY!', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#8c765c'
    }).setOrigin(0.5);
    this.qteContainer.add(subInst);

    // Draw progress bar
    this.qteBarGraphics = this.add.graphics();
    this.qteContainer.add(this.qteBarGraphics);
    this.drawTowBar();

    // Progress Text
    this.towProgressText = this.add.text(0, 10, 'Progress: 45%', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);
    this.qteContainer.add(this.towProgressText);

    // Timer Text
    this.towTimerText = this.add.text(0, 26, 'Time Left: 15.0s', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ff5c8a',
      stroke: '#fff7e6',
      strokeThickness: 1
    }).setOrigin(0.5);
    this.qteContainer.add(this.towTimerText);

    // Pull Button (Tarik)
    const btnW = 120;
    const btnH = 28;
    const pullBtn = this.add.container(0, 52);
    
    const pullBg = this.add.nineslice(0, 0, 'button', 0, btnW, btnH, 6, 6, 6, 6).setTint(0xffd9a0);
    pullBg.setInteractive({ useHandCursor: true });
    pullBg.on('pointerdown', () => this.pullRope());
    
    const pullTxt = this.add.text(0, 0, '🎯 PULL (Tarik)', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#8a5200'
    }).setOrigin(0.5);
    
    pullBtn.add([pullBg, pullTxt]);
    this.qteContainer.add(pullBtn);

    // Register space/enter keys to Pull
    this.input.keyboard?.on('keydown-SPACE', this.pullRope, this);
    this.input.keyboard?.on('keydown-ENTER', this.pullRope, this);
  }

  private drawTowBar(): void {
    if (!this.qteBarGraphics) return;

    this.qteBarGraphics.clear();

    const barWidth = 280;
    const barHeight = 16;
    const barY = -16;

    // Background track (Miss)
    this.qteBarGraphics.fillStyle(0xd5c4b4, 1);
    this.qteBarGraphics.fillRoundedRect(-barWidth / 2, barY - barHeight / 2, barWidth, barHeight, 4);

    // Progress fill
    const fillW = barWidth * (this.towProgress / 100);
    if (fillW > 0) {
      this.qteBarGraphics.fillStyle(0x8fd14f, 1);
      this.qteBarGraphics.fillRoundedRect(-barWidth / 2, barY - barHeight / 2, fillW, barHeight, 4);
    }

    // Border outline
    this.qteBarGraphics.lineStyle(2, 0x5c4832, 1);
    this.qteBarGraphics.strokeRoundedRect(-barWidth / 2, barY - barHeight / 2, barWidth, barHeight, 4);
  }

  private pullRope(): void {
    if (!this.isQteActive || !this.activeCreatureForCapture) return;

    AudioManager.playSfx('rope_throw');

    // Bounce the creature to show tug tension
    this.tweens.add({
      targets: this.activeCreatureForCapture,
      scaleX: 0.65 * 1.3,
      scaleY: 0.65 * 0.75,
      yoyo: true,
      duration: 80
    });

    this.towProgress = Math.min(100, this.towProgress + this.towClickPower);
    this.drawTowBar();

    if (this.towProgressText) {
      this.towProgressText.setText(`Progress: ${Math.floor(this.towProgress)}%`);
    }

    if (this.towProgress >= 100) {
      this.endTowMinigame(true);
    }
  }

  private endTowMinigame(success: boolean): void {
    if (!this.isQteActive) return;

    // Unregister keyboard events
    this.input.keyboard?.off('keydown-SPACE', this.pullRope, this);
    this.input.keyboard?.off('keydown-ENTER', this.pullRope, this);

    const creature = this.activeCreatureForCapture!;

    if (this.qteContainer) {
      this.qteContainer.destroy();
      this.qteContainer = null;
      this.qteBarGraphics = null;
      this.towProgressText = null;
      this.towTimerText = null;
    }

    this.isQteActive = false;
    this.activeCreatureForCapture = null;

    if (success) {
      // Reward calculation based on rarity
      let xpAwarded = 20;
      let coinsAwarded = 10;
      switch (creature.creatureData.rarity) {
        case 'Common': xpAwarded = 20; coinsAwarded = 10; break;
        case 'Rare': xpAwarded = 45; coinsAwarded = 25; break;
        case 'Epic': xpAwarded = 100; coinsAwarded = 75; break;
        case 'Legendary': xpAwarded = 250; coinsAwarded = 200; break;
        case 'Mythic': xpAwarded = 600; coinsAwarded = 500; break;
      }

      this.handleCaptureSuccess(creature, {
        success: true,
        successChance: 100,
        roll: 1,
        timingGrade: 'Perfect',
        xpAwarded,
        coinsAwarded
      });
    } else {
      const resText = this.add.text(creature.x, creature.y - 40, 'FAILED!', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ff5c8a',
        stroke: '#141f2a',
        strokeThickness: 4
      }).setOrigin(0.5);

      this.tweens.add({
        targets: resText,
        y: resText.y - 30,
        alpha: 0,
        duration: 1000,
        onComplete: () => resText.destroy()
      });

      this.handleCaptureFail(creature);
    }
  }

  private handleCaptureSuccess(creature: WildCreature, result: CaptureResult): void {
    let sfx = 'capture_success_common';
    if (creature.creatureData.rarity === 'Rare') sfx = 'capture_success_rare';
    else if (creature.creatureData.rarity === 'Epic' || creature.creatureData.rarity === 'Legendary' || creature.creatureData.rarity === 'Mythic') {
      sfx = 'capture_success_epic';
    }
    AudioManager.playSfx(sfx);

    const state = SaveSystem.getState();
    const instanceId = 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    const newOwned = {
      instanceId,
      creatureId: creature.creatureData.id,
      capturedAt: Date.now(),
      level: 1
    };
    
    state.ownedCreatures.push(newOwned);
    state.coins += result.coinsAwarded;

    AchievementSystem.trackMetric('captures_total', 1);
    if (creature.creatureData.rarity === 'Rare') AchievementSystem.trackMetric('rare_captures', 1);
    else if (creature.creatureData.rarity === 'Epic') AchievementSystem.trackMetric('epic_captures', 1);
    else if (creature.creatureData.rarity === 'Legendary') AchievementSystem.trackMetric('legendary_captures', 1);
    else if (creature.creatureData.rarity === 'Mythic') AchievementSystem.trackMetric('mythic_captures', 1);

    ProgressionSystem.addXp(result.xpAwarded);

    SaveSystem.markDirty();
    SaveSystem.forceSave();

    EventBus.emit('coinsChanged', state.coins);
    EventBus.emit('sanctuaryUpdated');

    this.createRewardFloatingText(creature.x, creature.y - 10, `+${result.coinsAwarded} Coins\n+${result.xpAwarded} XP`);

    this.tweens.add({
      targets: creature,
      scaleX: 0,
      scaleY: 0,
      angle: 180,
      alpha: 0,
      duration: 500,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.activeCreatures = this.activeCreatures.filter(c => c !== creature);
        creature.destroy();
        this.isQteActive = false;
        this.activeCreatureForCapture = null;

        this.time.delayedCall(4000, () => {
          if (this.scene.isActive()) this.spawnWildCreatures();
        });
      }
    });
  }

  private handleCaptureFail(creature: WildCreature): void {
    AudioManager.playSfx('capture_fail');
    const dir = Math.random() > 0.5 ? 1 : -1;
    
    this.tweens.add({
      targets: creature,
      x: creature.x + dir * 350,
      y: creature.y - 80,
      scaleX: 1.5,
      alpha: 0,
      duration: 600,
      ease: 'Power1.easeIn',
      onComplete: () => {
        this.activeCreatures = this.activeCreatures.filter(c => c !== creature);
        creature.destroy();
        this.isQteActive = false;
        this.activeCreatureForCapture = null;

        this.time.delayedCall(5000, () => {
          if (this.scene.isActive()) this.spawnWildCreatures();
        });
      }
    });
  }

  private createRewardFloatingText(x: number, y: number, text: string): void {
    const rew = this.add.text(x, y, text, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#fff7e6',
      align: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
      stroke: '#141f2a',
      strokeThickness: 2,
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: rew,
      y: rew.y - 65,
      alpha: 0,
      duration: 1600,
      ease: 'Sine.easeOut',
      onComplete: () => rew.destroy()
    });
  }

  // ⛺ TRAVELING MERCHANT PANEL SHOP UI
  private openMerchantShop(): void {
    if (this.merchantShopPanel) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.merchantShopPanel = this.add.container(width / 2, height / 2);
    this.merchantShopPanel.setDepth(160);

    const bg = this.add.nineslice(0, 0, 'panel_frame', 0, 480, 340, 16, 16, 16, 16);
    this.merchantShopPanel.add(bg);

    const title = this.add.text(0, -130, '⛺ TRAVELING MERCHANT', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    const closeBtn = this.add.text(480 / 2 - 25, -130, '❌', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.merchantShopPanel?.destroy();
      this.merchantShopPanel = null;
    });

    this.merchantShopPanel.add([title, closeBtn]);

    // Render 3 Merchant Offers: Whips & buying magic berries
    const state = SaveSystem.getState();
    const whips = DataLoader.getWhips();

    // Find next Whip that player doesn't own
    const nextWhip = whips.find(w => !state.whipsOwned.includes(w.id));

    // Offer 1: Whip Upgrade
    let whipCard = this.add.container(-130, -10);
    const whipCardBg = this.add.nineslice(0, 0, 'button', 0, 110, 180, 6, 6, 6, 6);
    whipCard.add(whipCardBg);

    if (nextWhip) {
      const wTitle = this.add.text(0, -65, 'Whip Upgrade', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#8c765c'
      }).setOrigin(0.5);
      
      const wName = this.add.text(0, -40, nextWhip.name, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#5c4832',
        align: 'center'
      }).setOrigin(0.5);

      const wDesc = this.add.text(0, 0, `Power: ${nextWhip.weakeningPower}\nWeakens difficulty of wild beasts!`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '8px',
        color: '#7a644e',
        align: 'center',
        wordWrap: { width: 95 }
      }).setOrigin(0.5);

      const buyWhipBtn = this.add.nineslice(0, 55, 'button', 0, 95, 26, 6, 6, 6, 6).setTint(0xffd9a0);
      buyWhipBtn.setInteractive({ useHandCursor: true });
      buyWhipBtn.on('pointerdown', () => {
        if (state.coins >= nextWhip.cost) {
          state.coins -= nextWhip.cost;
          state.whipsOwned.push(nextWhip.id);
          state.currentWhipId = nextWhip.id;
          SaveSystem.markDirty();
          SaveSystem.forceSave();
          AudioManager.playSfx('ui_confirm');
          EventBus.emit('coinsChanged', state.coins);
          this.merchantShopPanel?.destroy();
          this.merchantShopPanel = null;
          alert(`Bought & Equipped: ${nextWhip.name}!`);
        } else {
          alert('Not enough coins for this whip!');
        }
      });
      const buyWhipTxt = this.add.text(0, 55, `🪙 ${nextWhip.cost}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#8a5200'
      }).setOrigin(0.5);

      whipCard.add([wTitle, wName, wDesc, buyWhipBtn, buyWhipTxt]);
    } else {
      const maxText = this.add.text(0, 0, 'All Whips\nOwned!\n🏆', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#8fd14f',
        align: 'center'
      }).setOrigin(0.5);
      whipCard.add(maxText);
    }
    this.merchantShopPanel.add(whipCard);

    // Offer 2: Buy Magic Fruit
    let buyFruitCard = this.add.container(0, -10);
    const buyFruitBg = this.add.nineslice(0, 0, 'button', 0, 110, 180, 6, 6, 6, 6);
    buyFruitCard.add(buyFruitBg);

    const fTitle = this.add.text(0, -65, 'Buy Magic Fruit', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#8c765c'
    }).setOrigin(0.5);

    const fDesc = this.add.text(0, -15, 'Magic berry that attracts creatures.\n(Useful for breeding fusion!)', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '8px',
      color: '#7a644e',
      align: 'center',
      wordWrap: { width: 95 }
    }).setOrigin(0.5);

    const buyFruitBtn = this.add.nineslice(0, 55, 'button', 0, 95, 26, 6, 6, 6, 6).setTint(0xffd9a0);
    buyFruitBtn.setInteractive({ useHandCursor: true });
    buyFruitBtn.on('pointerdown', () => {
      const cost = 300;
      if (state.coins >= cost) {
        state.coins -= cost;
        state.magicFruits = (state.magicFruits || 0) + 1;
        SaveSystem.markDirty();
        SaveSystem.forceSave();
        AudioManager.playSfx('ui_confirm');
        EventBus.emit('coinsChanged', state.coins);
        alert('Bought 1 Magic Fruit!');
        this.merchantShopPanel?.destroy();
        this.merchantShopPanel = null;
      } else {
        alert('Not enough coins!');
      }
    });
    const buyFruitTxt = this.add.text(0, 55, '🪙 300', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#8a5200'
    }).setOrigin(0.5);
    buyFruitCard.add([fTitle, fDesc, buyFruitBtn, buyFruitTxt]);
    this.merchantShopPanel.add(buyFruitCard);

    // Offer 3: Sell Magic Fruits
    let sellFruitCard = this.add.container(130, -10);
    const sellFruitBg = this.add.nineslice(0, 0, 'button', 0, 110, 180, 6, 6, 6, 6);
    sellFruitCard.add(sellFruitBg);

    const sTitle = this.add.text(0, -65, 'Sell Fruit', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#8c765c'
    }).setOrigin(0.5);

    const sDesc = this.add.text(0, -15, `Trade berries for cash.\nOwned: ${state.magicFruits || 0} Fruits`, {
      fontFamily: 'Inter, sans-serif',
      fontSize: '8px',
      color: '#7a644e',
      align: 'center',
      wordWrap: { width: 95 }
    }).setOrigin(0.5);

    const sellFruitBtn = this.add.nineslice(0, 55, 'button', 0, 95, 26, 6, 6, 6, 6).setTint(0xffd9a0);
    sellFruitBtn.setInteractive({ useHandCursor: true });
    sellFruitBtn.on('pointerdown', () => {
      if ((state.magicFruits || 0) > 0) {
        state.magicFruits -= 1;
        state.coins += 180;
        SaveSystem.markDirty();
        SaveSystem.forceSave();
        AudioManager.playSfx('ui_confirm');
        EventBus.emit('coinsChanged', state.coins);
        alert('Sold 1 Magic Fruit for 180 Coins!');
        this.merchantShopPanel?.destroy();
        this.merchantShopPanel = null;
      } else {
        alert('You have no fruits to sell!');
      }
    });
    const sellFruitTxt = this.add.text(0, 55, 'Earn 🪙 180', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#8a5200'
    }).setOrigin(0.5);
    sellFruitCard.add([sTitle, sDesc, sellFruitBtn, sellFruitTxt]);
    this.merchantShopPanel.add(sellFruitCard);

    // Pop open effect
    this.merchantShopPanel.setScale(0.1);
    this.tweens.add({
      targets: this.merchantShopPanel,
      scale: 1.0,
      duration: 250,
      ease: 'Back.easeOut'
    });
  }

  // 🏰 PHYSICAL SANCTUARY PORTAL ON MAP
  private createSanctuaryPortal(width: number, height: number): void {
    const portalX = width * 0.82;
    const portalY = height * 0.48;

    this.sanctuaryPortalContainer = this.add.container(portalX, portalY);

    const gateG = this.add.graphics();
    // Cozy stones archway
    gateG.lineStyle(2, 0x141f2a, 1);
    
    // Left pillar
    gateG.fillStyle(0x7f8c8d, 1);
    gateG.fillRect(-22, -30, 8, 45);
    gateG.strokeRect(-22, -30, 8, 45);
    
    // Right pillar
    gateG.fillStyle(0x7f8c8d, 1);
    gateG.fillRect(14, -30, 8, 45);
    gateG.strokeRect(14, -30, 8, 45);
    
    // Top arch header
    gateG.fillStyle(0x95a5a6, 1);
    gateG.fillRect(-22, -38, 44, 8);
    gateG.strokeRect(-22, -38, 44, 8);

    // Green portal glow inside
    gateG.fillStyle(0x2ecc71, 0.35);
    gateG.fillRect(-14, -30, 28, 45);

    this.sanctuaryPortalContainer.add(gateG);

    // Label Text
    const label = this.add.text(0, -48, '🏰 TO SANCTUARY', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#27ae60',
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5);
    this.sanctuaryPortalContainer.add(label);

    // Make interactive
    const clickZone = this.add.zone(0, 0, 50, 60).setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', () => {
      this.transitionToSanctuary();
    });
    this.sanctuaryPortalContainer.add(clickZone);

    // Enable physics for position overlap checks
    this.physics.add.existing(this.sanctuaryPortalContainer);
    const body = this.sanctuaryPortalContainer.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setSize(44, 45);
    body.setOffset(-22, -30);
  }

  private transitionToSanctuary(): void {
    AudioManager.playSfx('ui_confirm');
    this.cameras.main.fadeOut(500, 26, 35, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.start('SanctuaryScene');
    });
  }

  // 🪙 PHYSICAL SELL BOX ON MAP
  private createSellBox(width: number, height: number): void {
    const boxX = width * 0.82;
    const boxY = height * 0.70;

    this.sellBoxContainer = this.add.container(boxX, boxY);

    const boxG = this.add.graphics();
    boxG.lineStyle(2, 0x141f2a, 1);
    
    // Wooden box structure
    boxG.fillStyle(0x7a4d2b, 1);
    boxG.fillRect(-18, -14, 36, 28);
    boxG.strokeRect(-18, -14, 36, 28);

    // Golden lock/band trim
    boxG.fillStyle(0xd4af37, 1);
    boxG.fillRect(-4, -14, 8, 4); // slot frame
    boxG.fillRect(-3, -2, 6, 8); // pad plate

    // Coin slot line
    boxG.fillStyle(0x1a0f08, 1);
    boxG.fillRect(-8, -13, 16, 2);

    this.sellBoxContainer.add(boxG);

    // Label Text
    const label = this.add.text(0, -25, '🪙 SELL BOX', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#7e5109',
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5);
    this.sellBoxContainer.add(label);

    // Make interactive
    const clickZone = this.add.zone(0, 0, 40, 36).setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', () => {
      this.openSellBoxPanel();
    });
    this.sellBoxContainer.add(clickZone);

    // Enable physics for position overlap checks
    this.physics.add.existing(this.sellBoxContainer);
    const body = this.sellBoxContainer.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setSize(36, 28);
    body.setOffset(-18, -14);
  }

  // 🪙 OPEN SELL DEPOSIT BOX PANEL
  private openSellBoxPanel(): void {
    if (this.sellPanel) return;

    AudioManager.playSfx('ui_confirm');

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.sellPanel = this.add.container(width / 2, height / 2);
    this.sellPanel.setDepth(170);

    const bg = this.add.nineslice(0, 0, 'panel_frame', 0, 480, 340, 16, 16, 16, 16);
    this.sellPanel.add(bg);

    const title = this.add.text(0, -130, '🪙 PET SELL DEPOSIT BOX', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    const closeBtn = this.add.text(480 / 2 - 25, -130, '❌', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.sellPanel?.destroy();
      this.sellPanel = null;
    });

    this.sellPanel.add([title, closeBtn]);

    // Populate unplaced pets
    this.refreshSellPanelContent();

    // Pop open effect
    this.sellPanel.setScale(0.1);
    this.tweens.add({
      targets: this.sellPanel,
      scale: 1.0,
      duration: 250,
      ease: 'Back.easeOut'
    });
  }

  private refreshSellPanelContent(): void {
    if (!this.sellPanel) return;

    // Remove old sub-components that aren't the title or close button
    const toRemove = this.sellPanel.list.slice(2);
    toRemove.forEach(c => c.destroy());

    const state = SaveSystem.getState();
    
    // Filter unplaced creatures (placedSlot is undefined or null)
    const unplaced = state.ownedCreatures.filter(
      oc => (oc as any).placedSlot === undefined || (oc as any).placedSlot === null
    );

    if (unplaced.length === 0) {
      const emptyText = this.add.text(0, 0, 'No captured creatures in your bag to sell!\n(Placed creatures in Sanctuary slots cannot be sold)', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '12px',
        color: '#8c765c',
        align: 'center',
        wordWrap: { width: 380 }
      }).setOrigin(0.5);
      this.sellPanel.add(emptyText);
      return;
    }

    // Render up to 4 creatures in a 2x2 grid
    const cols = 2;
    const cardW = 210;
    const cardH = 75;
    const startX = -110;
    const startY = -40;
    const spacingX = 220;
    const spacingY = 85;

    const visibleCount = Math.min(4, unplaced.length);

    for (let i = 0; i < visibleCount; i++) {
      const oc = unplaced[i];
      const creature = DataLoader.getCreature(oc.creatureId);
      if (!creature) continue;

      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const card = this.add.container(x, y);

      // Card Background
      const cardBg = this.add.nineslice(0, 0, 'button', 0, cardW, cardH, 6, 6, 6, 6);
      card.add(cardBg);

      // Rarity outline
      let rarityColor = 0xb5b5b5;
      if (creature.rarity === 'Rare') rarityColor = 0x4fa3e3;
      else if (creature.rarity === 'Epic') rarityColor = 0xb05fe0;
      else if (creature.rarity === 'Legendary') rarityColor = 0xffc93c;
      else if (creature.rarity === 'Mythic') rarityColor = 0xff5c8a;

      const outline = this.add.graphics();
      outline.lineStyle(2.5, rarityColor, 0.85);
      outline.strokeRoundedRect(-cardW / 2 + 1, -cardH / 2 + 1, cardW - 2, cardH - 2, 6);
      card.add(outline);

      // Creature icon thumbnail
      let spriteKey = 'creature_meadow';
      if (creature.area === 'whisper_forest') spriteKey = 'creature_forest';
      else if (creature.area === 'crystal_mountain') spriteKey = 'creature_mountain';
      else if (creature.area === 'golden_dunes') spriteKey = 'creature_dunes';
      else if (creature.area === 'sky_island') spriteKey = 'creature_sky';

      const icon = this.add.image(-65, 0, spriteKey).setScale(0.85);
      card.add(icon);

      // Name & Level text
      const dispName = oc.nickname || creature.name;
      const infoText = this.add.text(-25, -15, `${dispName}\nLvl ${oc.level}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#5c4832'
      }).setOrigin(0, 0.5);
      card.add(infoText);

      // Sell Price Tag
      const price = this.getCreatureSellPrice(oc.creatureId, oc.level);
      const priceText = this.add.text(-25, 15, `🪙 ${price}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#8a5200'
      }).setOrigin(0, 0.5);
      card.add(priceText);

      // Individual Sell Button
      const sellBtn = this.add.nineslice(65, 0, 'button', 0, 52, 28, 4, 4, 4, 4).setTint(0x8fd14f);
      sellBtn.setInteractive({ useHandCursor: true });
      sellBtn.on('pointerdown', () => {
        this.sellSingleCreature(oc.instanceId, price, dispName);
      });

      const sellBtnText = this.add.text(65, 0, 'SELL', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#27ae60',
        strokeThickness: 1
      }).setOrigin(0.5);

      card.add([sellBtn, sellBtnText]);
      this.sellPanel.add(card);
    }

    // Sell All Button at the bottom
    let totalAllValue = 0;
    unplaced.forEach(oc => {
      totalAllValue += this.getCreatureSellPrice(oc.creatureId, oc.level);
    });

    const sellAllBtnContainer = this.add.container(0, 115);
    
    const sellAllBg = this.add.nineslice(0, 0, 'button', 0, 240, 36, 8, 8, 8, 8).setTint(0xffd9a0);
    sellAllBg.setInteractive({ useHandCursor: true });
    sellAllBg.on('pointerdown', () => {
      this.sellAllUnplacedCreatures(unplaced, totalAllValue);
    });

    const sellAllText = this.add.text(0, 0, `SELL ALL UNPLACED ( Earn 🪙 ${totalAllValue} )`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#8a5200'
    }).setOrigin(0.5);

    sellAllBtnContainer.add([sellAllBg, sellAllText]);
    this.sellPanel.add(sellAllBtnContainer);

    if (unplaced.length > 4) {
      const extraText = this.add.text(0, 75, `... and ${unplaced.length - 4} more in bag`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#8c765c'
      }).setOrigin(0.5);
      this.sellPanel.add(extraText);
    }
  }

  private sellSingleCreature(instanceId: string, price: number, name: string): void {
    AudioManager.playSfx('coin_collect');
    
    const state = SaveSystem.getState();
    state.ownedCreatures = state.ownedCreatures.filter(oc => oc.instanceId !== instanceId);
    state.coins += price;
    
    AchievementSystem.trackMetric('lifetime_coins', price);
    SaveSystem.markDirty();
    SaveSystem.forceSave();

    EventBus.emit('coinsChanged', state.coins);
    EventBus.emit('sanctuaryUpdated');

    this.createRewardFloatingText(this.cameras.main.width / 2, this.cameras.main.height / 2 - 30, `Sold ${name} for +${price} Coins!`);
    
    this.refreshSellPanelContent();
  }

  private sellAllUnplacedCreatures(unplacedList: any[], totalValue: number): void {
    if (unplacedList.length === 0) return;

    AudioManager.playSfx('coin_collect');
    
    const state = SaveSystem.getState();
    const unplacedIds = new Set(unplacedList.map(u => u.instanceId));
    
    state.ownedCreatures = state.ownedCreatures.filter(oc => !unplacedIds.has(oc.instanceId));
    state.coins += totalValue;

    AchievementSystem.trackMetric('lifetime_coins', totalValue);
    SaveSystem.markDirty();
    SaveSystem.forceSave();

    EventBus.emit('coinsChanged', state.coins);
    EventBus.emit('sanctuaryUpdated');

    this.createRewardFloatingText(this.cameras.main.width / 2, this.cameras.main.height / 2 - 30, `Sold ${unplacedList.length} pets for +${totalValue} Coins! 🪙`);

    this.refreshSellPanelContent();
  }

  private getCreatureSellPrice(creatureId: string, level: number): number {
    const creature = DataLoader.getCreature(creatureId);
    if (!creature) return 0;

    let basePrice = 150;
    switch (creature.rarity) {
      case 'Common': basePrice = 150; break;
      case 'Rare': basePrice = 400; break;
      case 'Epic': basePrice = 1200; break;
      case 'Legendary': basePrice = 4000; break;
      case 'Mythic': basePrice = 18000; break;
    }

    return Math.floor(basePrice * (1 + (level - 1) * 0.15));
  }

  private showAreaSelectPanel(): void {
    if (this.areaSelectPanel) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.areaSelectPanel = this.add.container(width / 2, height / 2);
    this.areaSelectPanel.setDepth(150);

    const bg = this.add.nineslice(0, 0, 'panel_frame', 0, 480, 320, 16, 16, 16, 16);
    this.areaSelectPanel.add(bg);

    const title = this.add.text(0, -120, 'BIOME MAP', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    const closeBtn = this.add.text(480 / 2 - 30, -120, '❌', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.areaSelectPanel?.destroy();
      this.areaSelectPanel = null;
    });

    this.areaSelectPanel.add([title, closeBtn]);

    const areas = DataLoader.getAreas();
    const state = SaveSystem.getState();

    const cardW = 82;
    const startX = -((5 - 1) * (cardW + 6)) / 2;

    areas.forEach((area, idx) => {
      const cardX = startX + idx * (cardW + 6);
      const card = this.add.container(cardX, -10);

      const cardBg = this.add.nineslice(0, 0, 'button', 0, cardW, 160, 6, 6, 6, 6);
      cardBg.setInteractive({ useHandCursor: true });

      const isUnlocked = state.unlockedAreas.includes(area.id);

      if (this.areaId === area.id) {
        cardBg.setTint(0xffe9a8);
      } else if (!isUnlocked) {
        cardBg.setTint(0xe5dcd3);
      }

      card.add(cardBg);

      const numTxt = this.add.text(0, -60, `BIOME ${idx + 1}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#8c765c'
      }).setOrigin(0.5);

      const nameTxt = this.add.text(0, -35, area.name.split(' ').join('\n'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#5c4832',
        align: 'center'
      }).setOrigin(0.5);

      card.add([numTxt, nameTxt]);

      const statY = 40;
      if (isUnlocked) {
        const unlockTxt = this.add.text(0, statY, this.areaId === area.id ? 'CURRENT' : 'ENTER', {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: this.areaId === area.id ? '#8fd14f' : '#8a5200'
        }).setOrigin(0.5);
        card.add(unlockTxt);

        if (this.areaId !== area.id) {
          cardBg.on('pointerdown', () => {
            AudioManager.playSfx('ui_confirm');
            this.areaSelectPanel?.destroy();
            this.areaSelectPanel = null;
            this.cameras.main.fadeOut(500, 26, 35, 30);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.restart({ areaId: area.id });
            });
          });
        }
      } else {
        const lockIcon = this.add.text(0, 0, '🔒', {
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px'
        }).setOrigin(0.5);
        card.add(lockIcon);

        if (state.level >= area.unlockLevel) {
          const costTxt = this.add.text(0, statY, `🪙 ${area.unlockCost.toLocaleString()}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '8px',
            fontStyle: 'bold',
            color: '#8a5200'
          }).setOrigin(0.5);
          card.add(costTxt);

          cardBg.on('pointerdown', () => {
            const res = ProgressionSystem.unlockArea(area.id);
            if (res.success) {
              this.areaSelectPanel?.destroy();
              this.areaSelectPanel = null;
              this.cameras.main.fadeOut(500, 26, 35, 30);
              this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.restart({ areaId: area.id });
              });
            } else {
              alert(res.error);
            }
          });
        } else {
          const lvlReq = this.add.text(0, statY, `Lvl ${area.unlockLevel}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#ff5c8a'
          }).setOrigin(0.5);
          card.add(lvlReq);
        }
      }

      cardBg.on('pointerover', () => card.setScale(1.04));
      cardBg.on('pointerout', () => card.setScale(1.0));

      this.areaSelectPanel!.add(card);
    });

    this.areaSelectPanel!.setScale(0.1);
    this.tweens.add({
      targets: this.areaSelectPanel,
      scale: 1.0,
      duration: 250,
      ease: 'Back.easeOut'
    });
  }

  update(time: number, delta: number): void {
    // 1. Update Player position and logic
    if (this.player) {
      this.player.update(time, delta);
    }

    // 2. Tug-of-War Capture Minigame ticking logic
    if (this.isQteActive && this.activeCreatureForCapture) {
      const deltaSec = delta / 1000;
      
      this.towProgress = Math.max(0, this.towProgress - this.towResistance * deltaSec);
      this.towTimerRemaining = Math.max(0, this.towTimerRemaining - deltaSec);
      
      if (this.towProgressText) {
        this.towProgressText.setText(`Progress: ${Math.floor(this.towProgress)}%`);
      }
      if (this.towTimerText) {
        this.towTimerText.setText(`Time Left: ${this.towTimerRemaining.toFixed(1)}s`);
      }
      
      this.drawTowBar();

      if (this.towProgress <= 0 || this.towTimerRemaining <= 0) {
        this.endTowMinigame(false);
      }
    }

    // 3. Proximity Interaction detection
    this.handleProximityDetection();
  }

  private handleProximityDetection(): void {
    if (!this.player || this.isQteActive || this.sellPanel || this.merchantShopPanel) {
      if (this.interactBubble) this.interactBubble.setVisible(false);
      this.nearestInteractable = null;
      this.nearestInteractableType = null;
      return;
    }

    let closestDist = Infinity;
    let closestTarget: any = null;
    let targetType: 'creature' | 'merchant' | 'portal' | 'sellbox' | null = null;

    // Check Creatures
    for (const c of this.activeCreatures) {
      if (!c.active) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = c;
        targetType = 'creature';
      }
    }

    // Check Merchant Stall
    if (this.merchantStall) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.merchantStall.x, this.merchantStall.y + 10);
      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = this.merchantStall;
        targetType = 'merchant';
      }
    }

    // Check Sanctuary Portal
    if (this.sanctuaryPortalContainer) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.sanctuaryPortalContainer.x, this.sanctuaryPortalContainer.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = this.sanctuaryPortalContainer;
        targetType = 'portal';
      }
    }

    // Check Sell Box
    if (this.sellBoxContainer) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.sellBoxContainer.x, this.sellBoxContainer.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = this.sellBoxContainer;
        targetType = 'sellbox';
      }
    }

    const maxInteractDist = 65;

    if (closestDist <= maxInteractDist && closestTarget) {
      this.nearestInteractable = closestTarget;
      this.nearestInteractableType = targetType;

      // Update text bubble prompt text
      let promptText = '[SPACE] INTERACT';
      if (targetType === 'creature') {
        promptText = `[SPACE] CATCH ${closestTarget.creatureData.name.toUpperCase()}`;
      } else if (targetType === 'merchant') {
        promptText = '[SPACE] MERCH SHOP';
      } else if (targetType === 'portal') {
        promptText = '[SPACE] GO SANCTUARY';
      } else if (targetType === 'sellbox') {
        promptText = '[SPACE] SELL CREATURES';
      }

      this.interactBubbleText.setText(promptText);

      // Adjust text bubble width based on text
      const padding = 16;
      this.interactBubbleBg.setSize(this.interactBubbleText.width + padding, 20);

      // Position bubble above player's head
      this.interactBubble.setPosition(this.player.x, this.player.y - 40);
      this.interactBubble.setVisible(true);
    } else {
      if (this.interactBubble) this.interactBubble.setVisible(false);
      this.nearestInteractable = null;
      this.nearestInteractableType = null;
    }
  }

  destroy(): void {
    if (this.skyDropTimer) this.skyDropTimer.destroy();
  }
}
