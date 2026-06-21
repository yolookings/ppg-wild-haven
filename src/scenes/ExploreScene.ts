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
import { QuestManager, DialogueStep } from '../systems/QuestManager';
import { BiomeManager } from '../systems/BiomeManager';
import { DialogueManager } from '../systems/DialogueManager';

export class ExploreScene extends Phaser.Scene {
  private areaId!: AreaId;
  private areaData: any;
  private activeCreatures: WildCreature[] = [];
  private tetheredCreature: WildCreature | null = null;
  private tetherRopeGraphics!: Phaser.GameObjects.Graphics;
  
  // Player entity
  private player!: Player;
  private playerObstacleCollider!: Phaser.Physics.Arcade.Collider;
  
  // Environmental particles
  private weatherGroup!: Phaser.GameObjects.Group;
  private leaves: Phaser.GameObjects.Container[] = [];
  
  // Map collectibles arrays
  private collectibles: Phaser.GameObjects.Container[] = [];
  private collectiblesGroup!: Phaser.Physics.Arcade.Group;
  private obstaclesGroup!: Phaser.Physics.Arcade.StaticGroup;
  private skyDropTimer!: Phaser.Time.TimerEvent;

  // Physical Interactive structures
  private merchantStall: Phaser.GameObjects.Container | null = null;
  private merchantShopPanel: Phaser.GameObjects.Container | null = null;
  private sellBoxContainer: Phaser.GameObjects.Container | null = null;
  private sellPanel: Phaser.GameObjects.Container | null = null;
  private sanctuaryPortalContainer: Phaser.GameObjects.Container | null = null;
  private researchLabContainer: Phaser.GameObjects.Container | null = null;
  private baseHqContainer: Phaser.GameObjects.Container | null = null;
  private lunaNpcContainer: Phaser.GameObjects.Container | null = null;
  private lunaSprite: Phaser.GameObjects.Sprite | null = null;

  // Interaction prompt bubble
  private interactBubble!: Phaser.GameObjects.Container;
  private interactBubbleBg!: Phaser.GameObjects.Graphics;
  private interactBubbleText!: Phaser.GameObjects.Text;
  private nearestInteractable: any = null;
  private nearestInteractableType: 'creature' | 'merchant' | 'portal' | 'sellbox' | 'research_lab' | 'base_hq' | 'luna_npc' | null = null;

  // Tug-of-War Capture Minigame properties
  private activeCreatureForCapture: WildCreature | null = null;
  private qteContainer: Phaser.GameObjects.Container | null = null;
  private isQteActive = false;
  private qteBarGraphics: Phaser.GameObjects.Graphics | null = null;
  private qteRopeGraphics!: Phaser.GameObjects.Graphics;
  private qtePullEffect!: Phaser.GameObjects.Graphics;
  private towProgress = 45;
  private towTimerRemaining = 15.0;
  private towClickPower = 5.0;
  private towResistance = 8.0;
  private towProgressText: Phaser.GameObjects.Text | null = null;
  private towTimerText: Phaser.GameObjects.Text | null = null;
  private areaSelectPanel: Phaser.GameObjects.Container | null = null;
  
  private returnPortalBtn!: Phaser.GameObjects.Container;
  private areaSwitchBtn!: Phaser.GameObjects.Container;
  
  private resizeTimer?: Phaser.Time.TimerEvent;

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

    // Map size constants
    const mapW = 2400;
    const mapH = 1800;

    // Launch UI Overlay Scene if not running
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
    this.scene.bringToTop('UIScene');

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

    // 2. Render Parallax Background (Fixed/low scroll for sky and hills)
    this.createBiomeBackground(width, height);
    this.createParallaxClouds(width, height);

    // 3. Generate Ground repeating tile texture on the fly per biome
    this.createGroundTexture();

    // Setup repeating Ground TileSprite spanning full map walk area (ground Y starts at 400 to 1800)
    const groundY = 400;
    const groundHeight = mapH - groundY;
    const ground = this.add.tileSprite(mapW / 2, groundY + groundHeight / 2, mapW, groundHeight, `ground_texture_${this.areaId}`);
    ground.setOrigin(0.5, 0.5);
    ground.setDepth(-5);

    // Draw winding road path overlay on the grass ground (stretching across the larger 2400x1800 map)
    const pathG = this.add.graphics();
    pathG.fillStyle(0xdfb78c, 0.75); // cozy sand/dirt path
    pathG.lineStyle(3.5, 0xcda075, 0.65); // path border outline
    
    pathG.beginPath();
    pathG.moveTo(0, 600);
    pathG.lineTo(600, 500);
    pathG.lineTo(1200, 700);
    pathG.lineTo(1800, 600);
    pathG.lineTo(2400, 800);
    pathG.lineTo(2400, 950);
    pathG.lineTo(1800, 750);
    pathG.lineTo(1200, 850);
    pathG.lineTo(600, 650);
    pathG.lineTo(0, 750);
    pathG.closePath();
    pathG.fillPath();
    pathG.strokePath();

    pathG.beginPath();
    pathG.moveTo(1200, 450);
    pathG.lineTo(1350, 450);
    pathG.lineTo(1350, 1750);
    pathG.lineTo(1200, 1750);
    pathG.closePath();
    pathG.fillPath();
    pathG.strokePath();
    pathG.setDepth(-4);

    // 4. Environmental Particles
    this.weatherGroup = this.add.group();
    this.createWeatherEffects(width, height);
    this.createWindLeaves();

    // Set Arcade physics boundaries for top-down walking (only on ground area)
    this.physics.world.setBounds(0, groundY, mapW, groundHeight - 40);

    // Initialize collectibles physics group
    this.collectiblesGroup = this.physics.add.group();

    // Initialize obstacles physics group
    this.obstaclesGroup = this.physics.add.staticGroup();

    // Spawn 50 stylized procedural obstacles on the map that collide with the player, avoiding key interactables
    let obstacleTypes = ['tree', 'rock', 'fence', 'log'];
    let count = 90;
    if (this.areaId === 'whisper_forest') {
      obstacleTypes = ['tree', 'tree', 'log', 'tree', 'fence']; // denser trees/logs
      count = 130;
    } else if (this.areaId === 'crystal_mountain') {
      obstacleTypes = ['rock', 'rock', 'log', 'crystal', 'ruin_stone']; // crystals & ruins
      count = 110;
    } else if (this.areaId === 'green_meadow') {
      obstacleTypes = ['tree', 'rock', 'fence', 'log'];
      count = 100;
    } else if (this.areaId === 'golden_dunes') {
      obstacleTypes = ['rock', 'log', 'rock'];
      count = 90;
    }

    const obstacleSpawns: Array<{ x: number; y: number; type: string }> = [];
    const avoidSpots = [
      { x: 600, y: 700, radius: 120 },   // Merchant Stall
      { x: 1800, y: 800, radius: 120 },  // Portal
      { x: 1200, y: 1200, radius: 120 }, // Sell Box
      { x: 1200, y: 1000, radius: 150 }, // Player Spawn
      { x: 1080, y: 880, radius: 120 }   // Luna NPC
    ];

    // Spawn small ponds in Green Meadow
    if (this.areaId === 'green_meadow') {
      const pondPositions = [
        { x: 400, y: 1100 },
        { x: 1500, y: 1300 }
      ];
      pondPositions.forEach((pos) => {
        const pond = this.add.graphics();
        pond.fillStyle(0x4ba3e3, 0.8); // shiny pond blue
        pond.fillEllipse(pos.x, pos.y, 70, 45);
        pond.lineStyle(2, 0xffffff, 0.6);
        pond.strokeEllipse(pos.x, pos.y, 70, 45);
        pond.setDepth(pos.y - 10);
        
        // Add solid collision for pond
        const pondCol = this.add.zone(pos.x, pos.y, 70, 45);
        this.obstaclesGroup.add(pondCol);
        (pondCol.body as Phaser.Physics.Arcade.StaticBody).setSize(64, 36).setOffset(-32, -18);

        // Spawn a flower/lilypad on the pond
        const pad = this.add.image(pos.x - 15, pos.y - 5, 'flower_3').setScale(0.8);
        pad.setDepth(pos.y - 5);
        pad.setTint(0x81c784); // lilypad green tint
      });
    }

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let tooClose = true;
      let attempts = 0;

      while (tooClose && attempts < 100) {
        attempts++;
        x = 100 + Math.random() * 2200;
        y = 450 + Math.random() * 1250; // ground area is 400 to 1760

        tooClose = false;
        for (const spot of avoidSpots) {
          const dist = Phaser.Math.Distance.Between(x, y, spot.x, spot.y);
          if (dist < spot.radius) {
            tooClose = true;
            break;
          }
        }
      }

      if (!tooClose) {
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        obstacleSpawns.push({ x, y, type });
      }
    }

    obstacleSpawns.forEach((obs) => {
      const container = this.add.container(obs.x, obs.y);

      if (obs.type === 'tree') {
        const sprite = this.add.sprite(0, 0, `tree_${1 + Math.floor(Math.random() * 2)}`);
        sprite.setScale(0.7 + Math.random() * 0.4);
        sprite.setOrigin(0.5, 0.85); // Tree origin is lower for depth sorting!
        
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.18);
        shadow.fillEllipse(0, 2, 22, 6);
        container.add(shadow);
        container.add(sprite);
        
        this.obstaclesGroup.add(container);
        const body = container.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(18, 12);
        body.setOffset(-9, -6);
      } else if (obs.type === 'rock') {
        const sprite = this.add.sprite(0, 0, `stone_${1 + Math.floor(Math.random() * 4)}`);
        sprite.setScale(0.9 + Math.random() * 0.2);
        sprite.setOrigin(0.5, 0.5);
        
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillEllipse(0, 4, 16, 4);
        container.add(shadow);
        container.add(sprite);
        
        this.obstaclesGroup.add(container);
        const body = container.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(16, 12);
        body.setOffset(-8, -6);
      } else if (obs.type === 'fence') {
        const sprite = this.add.sprite(0, 0, `fence_${1 + Math.floor(Math.random() * 2)}`);
        sprite.setScale(0.9);
        sprite.setOrigin(0.5, 0.5);
        
        container.add(sprite);
        this.obstaclesGroup.add(container);
        const body = container.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(20, 8);
        body.setOffset(-10, -4);
      } else if (obs.type === 'log') {
        const sprite = this.add.sprite(0, 0, `log_${1 + Math.floor(Math.random() * 2)}`);
        sprite.setScale(0.9);
        sprite.setOrigin(0.5, 0.5);
        
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillEllipse(0, 3, 16, 4);
        container.add(shadow);
        container.add(sprite);
        
        this.obstaclesGroup.add(container);
        const body = container.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(18, 10);
        body.setOffset(-9, -5);
      } else if (obs.type === 'crystal') {
        const sprite = this.add.sprite(0, 0, 'gem');
        sprite.setTint(0x00e5ff); // beautiful cyan glow
        sprite.setScale(1.2 + Math.random() * 0.6);
        sprite.setOrigin(0.5, 0.85);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillEllipse(0, 2, 18, 5);
        container.add(shadow);
        container.add(sprite);

        this.obstaclesGroup.add(container);
        const body = container.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(16, 10);
        body.setOffset(-8, -5);
      } else if (obs.type === 'ruin_stone') {
        const base = this.add.sprite(0, 0, 'stone_1');
        base.setScale(1.4);
        base.setTint(0x8ba3a1); // weathered stone tint
        base.setOrigin(0.5, 0.85);
        
        const pillar = this.add.sprite(0, -18, 'stone_3');
        pillar.setScale(1.1);
        pillar.setTint(0x8ba3a1);
        pillar.setOrigin(0.5, 0.85);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillEllipse(0, 2, 24, 7);
        
        container.add(shadow);
        container.add(base);
        container.add(pillar);

        this.obstaclesGroup.add(container);
        const body = container.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(22, 14);
        body.setOffset(-11, -7);
      }
    });

    // 4.5. Spawn 280 static decorative details (grass/flowers/bushes/crystals)
    const detailTypes = ['grass_decor_1', 'grass_decor_2', 'flower_1', 'flower_2', 'flower_3', 'flower_4', 'bush_1', 'bush_2', 'bush_3'];
    if (this.areaId === 'whisper_forest') {
      detailTypes.push('log_1', 'log_2');
    } else if (this.areaId === 'crystal_mountain') {
      detailTypes.push('gem', 'stone_1', 'stone_3');
    } else if (this.areaId === 'golden_dunes') {
      detailTypes.push('stone_2', 'stone_4', 'city_stones');
    }

    for (let d = 0; d < 280; d++) {
      const rx = 100 + Math.random() * 2200;
      const ry = 450 + Math.random() * 1250;
      
      let tooClose = false;
      for (const spot of avoidSpots) {
        const dist = Phaser.Math.Distance.Between(rx, ry, spot.x, spot.y);
        if (dist < spot.radius) { tooClose = true; break; }
      }
      if (tooClose) continue;
      
      const type = detailTypes[Math.floor(Math.random() * detailTypes.length)];
      const detail = this.add.image(rx, ry, type);
      
      if (type === 'gem') {
        detail.setTint(0x00ffff); // Cyan glowing crystal formations
        detail.setScale(0.7 + Math.random() * 0.4);
      } else {
        detail.setScale(0.8 + Math.random() * 0.3);
      }
      detail.setDepth(ry - 5); // depth sort!
    }

    // 5. Create screen-fixed UI Buttons
    this.createPortalToSanctuary(width, height); // Return UI Button (bottom-left)
    this.createAreaSwitchButton(width, height);  // Biomes UI Button (bottom-right)

    // 6. Create physical interactable structures in world coordinates
    this.createSanctuaryPortal(width, height); // physical gate on map at (1800, 800)
    this.createMerchantStall(width, height);   // physical merchant stall on map at (600, 700)
    this.createSellBox(width, height);         // physical sell box on map at (1200, 1200)

    // Hub buildings spawned in starting Meadow
    if (this.areaId === 'green_meadow') {
      this.createResearchLab();
      this.createBaseHQ();
      this.createHubDecorations();
      this.createLunaNPC();
    }

    this.spawnExploreCivilization();

    // 7. Spawn Wild Creatures
    this.spawnWildCreatures();

    // 8. Instantiate Player in the center of the large world map
    this.player = new Player(this, 1200, 1000);
    this.add.existing(this.player);

    // Camera following setup
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Add physical collision between Player and Static Obstacles
    this.playerObstacleCollider = this.physics.add.collider(this.player, this.obstaclesGroup);

    // 9. Spawn Map Collectibles across the large world coordinates
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

    // Initial Prologue Dialogue Trigger
    this.time.delayedCall(1500, () => {
      const state = SaveSystem.getState();
      if ((!state.completedQuestIds || state.completedQuestIds.length === 0) && state.activeQuestId === 'quest_meadow_main') {
        const quest = QuestManager.getActiveQuest();
        if (quest) {
          DialogueManager.startDialogue(quest.dialogueIntro);
        }
      }
    });

    // 10. Start Sky Drops Scheduler (Every 25 seconds)
    this.skyDropTimer = this.time.addEvent({
      delay: 25000,
      callback: () => this.spawnSkyDrop(width, height),
      loop: true
    });

    // QTE visual helpers
    this.qteRopeGraphics = this.add.graphics();
    this.qteRopeGraphics.setDepth(130);
    this.qteRopeGraphics.setVisible(false);
    this.qtePullEffect = this.add.graphics();
    this.qtePullEffect.setDepth(131);
    this.qtePullEffect.setVisible(false);

    this.tetherRopeGraphics = this.add.graphics();
    this.tetherRopeGraphics.setDepth(120);

    // Proximity interact bubble prompt
    this.interactBubble = this.add.container(0, 0);
    this.interactBubbleBg = this.add.graphics();
    this.interactBubbleBg.setInteractive(new Phaser.Geom.Rectangle(-60, -15, 120, 30), Phaser.Geom.Rectangle.Contains);
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

    this.interactBubbleBg.on('pointerdown', () => {
      if (this.nearestInteractable && !this.isQteActive && !this.sellPanel && !this.merchantShopPanel && !DialogueManager.isDialogueActive()) {
        if (this.nearestInteractableType === 'creature') {
          this.initiateCapture(this.nearestInteractable);
        } else if (this.nearestInteractableType === 'merchant') {
          this.openMerchantShop();
        } else if (this.nearestInteractableType === 'portal') {
          this.transitionToSanctuary();
        } else if (this.nearestInteractableType === 'sellbox') {
          this.openSellBoxPanel();
        } else if (this.nearestInteractableType === 'research_lab') {
          this.interactWithResearchLab();
        } else if (this.nearestInteractableType === 'base_hq') {
          this.interactWithBaseHq();
        } else if (this.nearestInteractableType === 'luna_npc') {
          this.interactWithLuna();
        }
      }
    });

    // Interaction key listener (hooks initiateCapture for creatures)
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.nearestInteractable && !this.isQteActive && !this.sellPanel && !this.merchantShopPanel && !DialogueManager.isDialogueActive()) {
        if (this.nearestInteractableType === 'creature') {
          this.initiateCapture(this.nearestInteractable);
        } else if (this.nearestInteractableType === 'merchant') {
          this.openMerchantShop();
        } else if (this.nearestInteractableType === 'portal') {
          this.transitionToSanctuary();
        } else if (this.nearestInteractableType === 'sellbox') {
          this.openSellBoxPanel();
        } else if (this.nearestInteractableType === 'research_lab') {
          this.interactWithResearchLab();
        } else if (this.nearestInteractableType === 'base_hq') {
          this.interactWithBaseHq();
        } else if (this.nearestInteractableType === 'luna_npc') {
          this.interactWithLuna();
        }
      }
    });

    this.input.keyboard?.on('keydown-E', () => {
      if (this.tetheredCreature) {
        this.releaseTetheredCreature();
      } else if (this.nearestInteractable && !this.isQteActive && !this.sellPanel && !this.merchantShopPanel && !DialogueManager.isDialogueActive()) {
        if (this.nearestInteractableType === 'portal') {
          this.transitionToSanctuary();
        }
      }
    });

    // Resize handler
    this.scale.on('resize', this.handleResize, this);

    // Mount visual and speed listeners
    EventBus.on('mountStateChanged', this.updateMountSpeedAndVisuals, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('mountStateChanged', this.updateMountSpeedAndVisuals, this);
      this.scale.off('resize', this.handleResize, this);
    });

    this.updateMountSpeedAndVisuals();
  }

  private handleResize(_gameSize: Phaser.Structs.Size): void {
    if (this.resizeTimer) {
      this.resizeTimer.destroy();
    }
    this.resizeTimer = this.time.delayedCall(300, () => {
      if (!this.scene.isActive()) return;
      const w = this.cameras.main.width;
      const h = this.cameras.main.height;
      
      // Reposition screen-fixed UI buttons instead of restarting scene
      if (this.returnPortalBtn) {
        this.returnPortalBtn.setPosition(65, h - 70);
      }
      if (this.areaSwitchBtn) {
        this.areaSwitchBtn.setPosition(w - 75, h - 70);
      }
      // Reposition QTE container if active
      if (this.qteContainer && this.isQteActive) {
        this.qteContainer.setPosition(w / 2, h * 0.68);
      }
      // Reposition open panels
      if (this.merchantShopPanel) {
        this.merchantShopPanel.setPosition(w / 2, h / 2);
      }
      if (this.sellPanel) {
        this.sellPanel.setPosition(w / 2, h / 2);
      }
      if (this.areaSelectPanel) {
        this.areaSelectPanel.setPosition(w / 2, h / 2);
      }
      // Update leaf tweens to use new dimensions
      this.leaves.forEach(leaf => {
        if (leaf.active && leaf.y > h + 20) {
          leaf.y = -20;
          leaf.x = Math.random() * w;
        }
      });
    });
  }

  private createBiomeBackground(width: number, _height: number): void {
    const p = this.areaData.palette;
    
    // Draw sky gradient, fixed on screen
    const sky = this.add.graphics();
    sky.fillGradientStyle(
      Phaser.Display.Color.HexStringToColor(p[3] || p[0]).color,
      Phaser.Display.Color.HexStringToColor(p[3] || p[0]).color,
      Phaser.Display.Color.HexStringToColor(p[0]).color,
      Phaser.Display.Color.HexStringToColor(p[0]).color,
      1
    );
    sky.fillRect(0, 0, width, 400); // Sky occupies top section of viewport
    sky.setScrollFactor(0);
    sky.setDepth(-10);

    const layerCount = 3;
    for (let l = 0; l < layerCount; l++) {
      const g = this.add.graphics();
      let layerColorStr = p[1];
      if (l === 0) layerColorStr = p[0];
      else if (l === 2) layerColorStr = p[2] || p[1];

      const layerColor = Phaser.Display.Color.HexStringToColor(layerColorStr).color;
      g.fillStyle(layerColor, 0.45 + l * 0.25);

      const points: Phaser.Geom.Point[] = [];
      const segmentCount = 10;
      // We make the hills wider than the screen to support parallax scroll
      const layerW = width * 1.5;
      const segmentW = layerW / segmentCount;

      points.push(new Phaser.Geom.Point(0, 420));
      const horizonY = 250 + l * 45;
      const amplitude = 20 + l * 10;

      for (let i = 0; i <= segmentCount; i++) {
        const x = i * segmentW;
        const y = horizonY + Math.cos((i + l) * 1.5) * amplitude;
        points.push(new Phaser.Geom.Point(x, y));
      }

      points.push(new Phaser.Geom.Point(layerW, 420));
      g.fillPoints(points);

      // Parallax scroll factor: l = 0 is furthest, l = 2 is closest
      g.setScrollFactor(0.1 + l * 0.08, 0); // Only scroll horizontally
      g.setDepth(-9 + l);

      this.tweens.add({
        targets: g,
        x: l % 2 === 0 ? 10 : -10,
        duration: 10000 + l * 6000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createParallaxClouds(width: number, _height: number): void {
    const cloudKeys = ['cloud_image_1', 'cloud_image_2', 'cloud_image_3'];
    for (let i = 0; i < 8; i++) {
      const key = cloudKeys[i % cloudKeys.length];
      const cloud = this.add.image(0, 0, key);
      
      cloud.setAlpha(0.40 + Math.random() * 0.25);
      cloud.setScale(0.7 + Math.random() * 0.9);
      cloud.setTint(0xffffff);
      
      const cloudContainer = this.add.container(Math.random() * width * 2, 30 + Math.random() * 180);
      cloudContainer.add(cloud);
      cloudContainer.setScrollFactor(0.08 + Math.random() * 0.06, 0);
      cloudContainer.setDepth(-10);
      
      const speed = 50000 + Math.random() * 50000;
      const startX = -400 + Math.random() * -200;
      cloudContainer.x = startX;
      this.tweens.add({
        targets: cloudContainer,
        x: width + 400,
        duration: speed,
        repeat: -1,
        onRepeat: () => {
          cloudContainer.x = -400;
          cloudContainer.y = 30 + Math.random() * 180;
        }
      });
    }
  }

  private createGroundTexture(): void {
    const key = `ground_texture_${this.areaId}`;
    if (this.textures.exists(key)) return;

    const canvasTexture = this.textures.createCanvas(key, 64, 64);
    if (!canvasTexture) return;
    const ctx = canvasTexture.context;
    if (!ctx) return;

    // Get color details based on biome
    let primaryColor = '#8FD14F';
    let secondaryColor = '#81bd43';
    let patternColor = '#c6f28c';

    if (this.areaId === 'green_meadow') {
      primaryColor = '#8FD14F';
      secondaryColor = '#7ec23e';
      patternColor = '#C6F28C';
    } else if (this.areaId === 'whisper_forest') {
      primaryColor = '#2A5C38';
      secondaryColor = '#224a2c';
      patternColor = '#3F7D4D';
    } else if (this.areaId === 'crystal_mountain') {
      primaryColor = '#e0f7f6';
      secondaryColor = '#c4efed';
      patternColor = '#A0E7E5';
    } else if (this.areaId === 'golden_dunes') {
      primaryColor = '#F2C879';
      secondaryColor = '#e3b55d';
      patternColor = '#E8A23D';
    } else if (this.areaId === 'sky_island') {
      primaryColor = '#bbf2f6';
      secondaryColor = '#a1e4eb';
      patternColor = '#FFFFFF';
    }

    // Fill primary background
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, 64, 64);

    // Blended field tiles pattern layer
    const tileset = this.textures.get('field_tiles');
    if (tileset && tileset.key) {
      const img = tileset.getSourceImage() as HTMLImageElement;
      ctx.globalAlpha = 0.70;
      ctx.globalCompositeOperation = 'source-over';

      // Draw 2x2 grid of tiles (using varied tilled ground textures)
      const tileIndices = [0, 2, 8, 10, 16, 18, 24, 26];
      tileIndices.forEach((tileIdx, idx) => {
        const col = tileIdx % 8;
        const row = Math.floor(tileIdx / 8);
        const tx = (idx % 4) * 16;
        const ty = Math.floor(idx / 4) * 16;
        if (img) {
          ctx.drawImage(img, col * 32, row * 32, 32, 32, tx, ty, 16, 16);
        }
      });

      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Draw some custom detail noise blocks to make ground even more textured
    ctx.fillStyle = secondaryColor;
    for (let i = 0; i < 2; i++) {
      const rx = Math.floor(Math.random() * 56);
      const ry = Math.floor(Math.random() * 56);
      ctx.fillRect(rx, ry, 8, 8);
    }

    ctx.fillStyle = patternColor;
    for (let i = 0; i < 2; i++) {
      const rx = Math.floor(Math.random() * 56);
      const ry = Math.floor(Math.random() * 56);
      ctx.fillRect(rx, ry, 4, 4);
    }

    canvasTexture.refresh();
  }

  private createWindLeaves(): void {
    if (this.areaId !== 'green_meadow' && this.areaId !== 'whisper_forest') return;

    const key = 'leaf_particle';
    if (!this.textures.exists(key)) {
      const canvasTexture = this.textures.createCanvas(key, 12, 12);
      if (!canvasTexture) return;
      const ctx = canvasTexture.context;
      if (ctx) {
        ctx.fillStyle = this.areaId === 'green_meadow' ? '#a3d977' : '#d48837'; // green vs forest orange/brown
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.bezierCurveTo(12, 3, 12, 9, 6, 12);
        ctx.bezierCurveTo(0, 9, 0, 3, 6, 0);
        ctx.fill();
        canvasTexture.refresh();
      }
    }

    const leafCount = 15;
    for (let i = 0; i < leafCount; i++) {
      const leaf = this.add.image(0, 0, key);
      leaf.setAngle(Math.random() * 360);
      
      const leafContainer = this.add.container(Math.random() * this.cameras.main.width, -20);
      leafContainer.add(leaf);
      leafContainer.setScrollFactor(0); // Float in front of camera
      leafContainer.setDepth(110);      // In front of player
      
      this.leaves.push(leafContainer);

      // Start the infinite spinning/yoyo animation here ONCE!
      this.tweens.add({
        targets: leaf,
        angle: '+=360',
        scaleX: 0.4,
        duration: 1200 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      this.animateLeaf(leafContainer);
    }
  }

  private animateLeaf(leaf: Phaser.GameObjects.Container): void {
    if (!this.scene || !this.scene.isActive()) return;

    const startTop = Math.random() > 0.3;
    if (startTop) {
      leaf.x = Math.random() * this.cameras.main.width;
      leaf.y = -20;
    } else {
      leaf.x = -20;
      leaf.y = Math.random() * this.cameras.main.height * 0.8;
    }

    leaf.alpha = 0.6 + Math.random() * 0.4;
    const scale = 0.5 + Math.random() * 0.6;
    leaf.setScale(scale);

    const duration = 4000 + Math.random() * 4000;
    const targetX = leaf.x + 150 + Math.random() * 150;
    const targetY = this.cameras.main.height + 20;

    this.tweens.add({
      targets: leaf,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        this.animateLeaf(leaf);
      }
    });
  }

  private initiateCapture(creature: WildCreature): void {
    if (this.isQteActive) return;
    if (this.tetheredCreature) {
      this.createRewardFloatingText(this.player.x, this.player.y - 35, "Already leading a creature!\nDeliver it to Sanctuary first!", "#ff5c8a");
      AudioManager.playSfx('ui_tap');
      return;
    }
    this.player.stopMovement();
    this.isQteActive = true;

    this.player.playCastAnimation(creature.x, creature.y, () => {
      this.startCaptureMinigame(creature);
    });
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
      star.setScrollFactor(0); // Floating on screen viewport
      star.setDepth(115);
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
    this.returnPortalBtn = this.add.container(65, height - 70);
    this.returnPortalBtn.setScrollFactor(0);
    this.returnPortalBtn.setDepth(150);
    
    const gateBg = this.add.nineslice(0, 0, 'button', 0, 100, 36, 18, 18, 12, 12);
    gateBg.setInteractive({ useHandCursor: true });
    
    const gateTxt = this.add.text(0, 0, '🏰 Return', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    this.returnPortalBtn.add([gateBg, gateTxt]);

    gateBg.on('pointerdown', () => {
      AudioManager.playSfx('ui_confirm');
      this.scene.start('TravelScene', { targetScene: 'SanctuaryScene' });
    });

    gateBg.on('pointerover', () => this.returnPortalBtn.setScale(1.04));
    gateBg.on('pointerout', () => this.returnPortalBtn.setScale(1.0));
  }

  private createAreaSwitchButton(width: number, height: number): void {
    this.areaSwitchBtn = this.add.container(width - 75, height - 70);
    this.areaSwitchBtn.setScrollFactor(0);
    this.areaSwitchBtn.setDepth(150);
    
    const bg = this.add.nineslice(0, 0, 'button', 0, 120, 36, 18, 18, 12, 12);
    bg.setInteractive({ useHandCursor: true });
    
    const txt = this.add.text(0, 0, '🗺️ Biomes', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#5c4832'
    }).setOrigin(0.5);

    this.areaSwitchBtn.add([bg, txt]);

    bg.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      this.showAreaSelectPanel();
    });

    bg.on('pointerover', () => this.areaSwitchBtn.setScale(1.04));
    bg.on('pointerout', () => this.areaSwitchBtn.setScale(1.0));
  }

  // 🏪 TRAVELING MERCHANT ENTITY
  private createMerchantStall(_width: number, _height: number): void {
    const stallX = 600;
    const stallY = 700;

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

    // Add cozy Campfire left of merchant stall
    const campfire = this.add.sprite(stallX - 60, stallY + 15, 'campfire_fire');
    campfire.play('campfire_burn');
    campfire.setScale(1.25);
    campfire.setDepth(stallY + 15);
    
    const fireShadow = this.add.graphics();
    fireShadow.fillStyle(0x000000, 0.15);
    fireShadow.fillEllipse(stallX - 60, stallY + 28, 22, 6);
    fireShadow.setDepth(stallY + 14);

    const fireGlow = this.add.graphics();
    fireGlow.fillStyle(0xffaa44, 0.12);
    fireGlow.fillCircle(stallX - 60, stallY + 15, 52);
    fireGlow.setDepth(stallY + 13);
    
    this.tweens.add({
      targets: fireGlow,
      alpha: 0.22,
      scale: 1.25,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // 🎒 SPAWN MAP COLLECTIBLES (Chests & Magic Fruits)
  private spawnMapCollectibles(_width: number, _height: number): void {
    if (this.collectiblesGroup) {
      this.collectiblesGroup.clear(true, true);
    }
    this.collectibles = [];

    // Spawn 6 to 10 collectibles randomly across the large map walk coordinates
    const spawnsCount = 6 + Math.floor(Math.random() * 5);

    for (let c = 0; c < spawnsCount; c++) {
      const rx = 100 + Math.random() * 2200;
      const ry = 450 + Math.random() * 1250;

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
  private spawnSkyDrop(_width: number, _height: number): void {
    const rx = 100 + Math.random() * 2200;
    const ry = 450 + Math.random() * 1250;

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

  public spawnWildCreatureNearPlayer(creatureId: string): void {
    if (!this.player) return;
    const px = this.player.x;
    const py = this.player.y - 120; // Spawn slightly north of player spawn
    const cData = DataLoader.getCreature(creatureId);
    if (!cData) return;
    // Clear other creatures for tutorial focus
    this.activeCreatures.forEach(c => c.destroy());
    this.activeCreatures = [];
    const wild = new WildCreature(this, px, py, cData, (target) => {
      this.initiateCapture(target);
    });
    this.add.existing(wild);
    this.activeCreatures.push(wild);
  }

  private spawnWildCreatures(): void {
    this.activeCreatures.forEach(c => c.destroy());
    this.activeCreatures = [];
    this.tetheredCreature = null;

    // Spawn trailing tethered creature if present in player state
    const state = SaveSystem.getState();
    if (state.tetheredCreatureId) {
      const creatureData = DataLoader.getCreature(state.tetheredCreatureId);
      if (creatureData) {
        const px = this.player ? this.player.x : 1200;
        const py = this.player ? this.player.y : 1000;
        const tethered = new WildCreature(this, px - 50, py + 40, creatureData, () => {});
        tethered.isTethered = true;
        this.add.existing(tethered);
        this.tetheredCreature = tethered;
        this.activeCreatures.push(tethered);
      }
    }

    const count = 14 + Math.floor(Math.random() * 7); // 14 to 20 creatures
    const avoidSpots = [
      { x: 600, y: 700, radius: 100 },   // Merchant Stall
      { x: 1800, y: 800, radius: 100 },  // Portal
      { x: 1200, y: 1200, radius: 100 }, // Sell Box
      { x: 1200, y: 1000, radius: 150 }  // Player Spawn
    ];

    for (let i = 0; i < count; i++) {
      let rx = 0;
      let ry = 0;
      let tooClose = true;
      let attempts = 0;

      while (tooClose && attempts < 50) {
        attempts++;
        rx = 150 + Math.random() * 2100;
        ry = 480 + Math.random() * 1150; // Y: 480 to 1630

        tooClose = false;
        for (const spot of avoidSpots) {
          const dist = Phaser.Math.Distance.Between(rx, ry, spot.x, spot.y);
          if (dist < spot.radius) {
            tooClose = true;
            break;
          }
        }
      }

      const creatureData = this.rollCreatureForArea();
      if (!creatureData) continue;

      const state = SaveSystem.getState();
      if (!state.discoveredCreatureIds.includes(creatureData.id)) {
        state.discoveredCreatureIds.push(creatureData.id);
        SaveSystem.markDirty();
      }

      // Hook click event to initiateCapture (which plays throwing animation first)
      const wild = new WildCreature(this, rx, ry, creatureData, (c) => this.initiateCapture(c));
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
      baseClickInc = 1.5;
      baseRes = 35.0;
    }

    this.towClickPower = baseClickInc * ropeMult;
    this.towResistance = baseRes * (1 - resRed);

    // Show rope visual between player and creature
    this.qteRopeGraphics.setVisible(true);
    this.qtePullEffect.setVisible(true);

    // Build the Tug-of-War panel
    this.qteContainer = this.add.container(width / 2, height * 0.68);

    const qteBg = this.add.nineslice(0, 0, 'panel_frame', 0, 360, 150, 24, 24, 24, 24);
    this.qteContainer.add(qteBg);

    const isBoss = rarity === 'Mythic';
    const instColor = isBoss ? '#ff5c8a' : '#5c4832';
    const instLabel = isBoss ? `🚨 BOSS: Capturing ${creature.creatureData.name}` : `TUG-OF-WAR: Capturing ${creature.creatureData.name}`;

    const inst = this.add.text(0, -55, instLabel, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: instColor,
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
    
    const pullBg = this.add.nineslice(0, 0, 'button', 0, btnW, btnH, 18, 18, 12, 12).setTint(0xffd9a0);
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
    const pct = this.towProgress / 100;

    // Background track
    this.qteBarGraphics.fillStyle(0xd5c4b4, 1);
    this.qteBarGraphics.fillRoundedRect(-barWidth / 2, barY - barHeight / 2, barWidth, barHeight, 4);

    // Progress fill with dynamic color: green → yellow → red as progress drops
    const fillW = barWidth * pct;
    if (fillW > 0) {
      let barColor: number;
      if (pct >= 0.6) barColor = 0x8fd14f;      // green
      else if (pct >= 0.35) barColor = 0xf0c040; // yellow
      else barColor = 0xff5c8a;                   // red
    
      this.qteBarGraphics.fillStyle(barColor, 1);
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

    this.qteRopeGraphics.setVisible(false);
    this.qteRopeGraphics.clear();
    this.qtePullEffect.setVisible(false);
    this.qtePullEffect.clear();

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

  private handleCaptureSuccess(creature: WildCreature, _result: CaptureResult): void {
    const rarity = creature.creatureData.rarity;
    let sfx = 'capture_success_common';
    if (rarity === 'Rare') sfx = 'capture_success_rare';
    else if (rarity === 'Epic' || rarity === 'Legendary' || rarity === 'Mythic') {
      sfx = 'capture_success_epic';
    }
    AudioManager.playSfx(sfx);

    // Rarity-colored particle burst on capture success
    this.createCaptureParticles(creature.x, creature.y, rarity);

    // Disable interactions so you can't click on it or start QTE again
    creature.disableInteractive();
    creature.each((child: any) => {
      if (child.disableInteractive) child.disableInteractive();
    });

    // Rarity-tiered reward text and effects
    let rewardText = 'Captured!';
    let rewardColor = '#8fd14f';
    if (rarity === 'Rare') {
      rewardText = `Rare Catch!\n${creature.creatureData.name}`;
      rewardColor = '#4fa3e3';
    } else if (rarity === 'Epic') {
      rewardText = `Epic Catch!\n${creature.creatureData.name}`;
      rewardColor = '#b05fe0';
    } else if (rarity === 'Legendary') {
      rewardText = `Legendary!\n${creature.creatureData.name}`;
      rewardColor = '#ffc93c';
    } else if (rarity === 'Mythic') {
      rewardText = `Mythic!\n${creature.creatureData.name}`;
      rewardColor = '#ff5c8a';
    }
    this.createRewardFloatingText(creature.x, creature.y - 12, rewardText, rewardColor);

    // Camera effects for higher rarities: flash + subtle shake for Epic+
    if (rarity === 'Epic' || rarity === 'Legendary' || rarity === 'Mythic') {
      this.cameras.main.flash(300, 255, 255, 255, false, (_cam: any, progress: number) => {
        if (progress === 1) {
          this.cameras.main.resetFX();
        }
      });
      if (rarity === 'Legendary' || rarity === 'Mythic') {
        this.cameras.main.shake(400, 0.008);
      }
    }

    this.isQteActive = false;
    this.activeCreatureForCapture = null;

    // Tether immediately instead of showing a modal
    this.time.delayedCall(800, () => {
      if (this.tetheredCreature && this.tetheredCreature !== creature) {
        this.tetheredCreature.destroy();
      }

      this.tetheredCreature = creature;
      creature.isTethered = true;
      creature.setInteractive(); // enable if we need it later, though E is global
      
      const state = SaveSystem.getState();
      state.tetheredCreatureId = creature.creatureData.id;

      // Calculate XP and Coins immediately upon capture
      let xp = 20, coins = 10;
      switch (creature.creatureData.rarity) {
        case 'Rare': xp = 45; coins = 25; break;
        case 'Epic': xp = 100; coins = 75; break;
        case 'Legendary': xp = 250; coins = 200; break;
        case 'Mythic': xp = 600; coins = 500; break;
      }
      state.coins += coins;
      ProgressionSystem.addXp(xp);
      AchievementSystem.trackMetric('captures_total', 1);

      SaveSystem.markDirty();
      SaveSystem.forceSave();

      this.createRewardFloatingText(this.player.x, this.player.y - 30, '+ Tethered! (Press E to release)', '#8fd14f');
    });
  }

  private releaseTetheredCreature(): void {
    if (!this.tetheredCreature) return;
    
    // Gentle release animation
    this.tweens.add({
      targets: this.tetheredCreature,
      alpha: 0,
      y: this.tetheredCreature.y - 20,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        this.tetheredCreature?.destroy();
        this.tetheredCreature = null;
        
        const state = SaveSystem.getState();
        state.tetheredCreatureId = null;
        SaveSystem.markDirty();
        SaveSystem.forceSave();
      }
    });
    
    AudioManager.playSfx('ui_close');
    this.createRewardFloatingText(this.player.x, this.player.y - 30, 'Released peacefully...', '#b5b5b5');
  }



  private createCaptureParticles(x: number, y: number, rarity: string): void {
    let particleColor: number;
    let particleCount: number;
    let particleSize: number;

    switch (rarity) {
      case 'Common':
        particleColor = 0xb5b5b5;
        particleCount = 8;
        particleSize = 3;
        break;
      case 'Rare':
        particleColor = 0x4fa3e3;
        particleCount = 14;
        particleSize = 4;
        break;
      case 'Epic':
        particleColor = 0xb05fe0;
        particleCount = 22;
        particleSize = 5;
        break;
      case 'Legendary':
        particleColor = 0xffc93c;
        particleCount = 30;
        particleSize = 6;
        break;
      case 'Mythic':
        particleColor = 0xff5c8a;
        particleCount = 40;
        particleSize = 7;
        break;
      default:
        particleColor = 0xb5b5b5;
        particleCount = 8;
        particleSize = 3;
    }

    for (let i = 0; i < particleCount; i++) {
      const p = this.add.graphics();
      p.fillStyle(particleColor, 0.9);
      p.fillCircle(0, 0, particleSize * (0.5 + Math.random() * 0.5));
      p.setPosition(x, y);
      p.setDepth(500);

      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
      const dist = 30 + Math.random() * 50;

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 15,
        alpha: 0,
        scale: 0.2 + Math.random() * 0.3,
        duration: 500 + Math.random() * 400,
        ease: 'Power2.easeOut',
        onComplete: () => p.destroy()
      });
    }
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

  private createRewardFloatingText(x: number, y: number, text: string, color = '#fff7e6'): void {
    const rew = this.add.text(x, y, text, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: color,
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

    const bg = this.add.nineslice(0, 0, 'panel_frame', 0, 480, 340, 24, 24, 24, 24);
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
    const whipCardBg = this.add.nineslice(0, 0, 'button', 0, 110, 180, 18, 18, 12, 12);
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

      const buyWhipBtn = this.add.nineslice(0, 55, 'button', 0, 95, 26, 18, 18, 12, 12).setTint(0xffd9a0);
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
    const buyFruitBg = this.add.nineslice(0, 0, 'button', 0, 110, 180, 18, 18, 12, 12);
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

    const buyFruitBtn = this.add.nineslice(0, 55, 'button', 0, 95, 26, 18, 18, 12, 12).setTint(0xffd9a0);
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
    const sellFruitBg = this.add.nineslice(0, 0, 'button', 0, 110, 180, 18, 18, 12, 12);
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

    const sellFruitBtn = this.add.nineslice(0, 55, 'button', 0, 95, 26, 18, 18, 12, 12).setTint(0xffd9a0);
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
  private createSanctuaryPortal(_width: number, _height: number): void {
    const portalX = 1800;
    const portalY = 800;

    this.sanctuaryPortalContainer = this.add.container(portalX, portalY);

    // Glowing ground circle portal core
    const core = this.add.graphics();
    // 1. Ground marking ring
    core.lineStyle(1.5, 0xffffff, 0.5);
    core.strokeEllipse(0, 0, 42, 18);

    // 2. Soft glow base
    core.fillStyle(0x2ecc71, 0.22);
    core.fillEllipse(0, 0, 48, 20);

    // 3. Central animated portal core
    core.fillStyle(0x2ecc71, 0.55);
    core.fillEllipse(0, 0, 36, 16);
    core.lineStyle(1.5, 0xffffff, 0.75);
    core.strokeEllipse(0, 0, 36, 16);

    this.sanctuaryPortalContainer.add(core);

    // Pulser tween
    this.tweens.add({
      targets: core,
      alpha: 0.25,
      scale: 1.15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Spawning particles for the return portal
    this.time.addEvent({
      delay: 350,
      loop: true,
      callback: () => {
        if (!this.sys.isActive() || !this.sanctuaryPortalContainer || !this.sanctuaryPortalContainer.active) return;
        const px = portalX + (Math.random() * 24 - 12);
        const py = portalY + (Math.random() * 10 - 5);
        
        const isLeaf = Math.random() > 0.5;
        const p = this.add.graphics();
        p.setDepth(portalY + 5);
        
        if (isLeaf) {
          p.fillStyle(0x2ecc71, 0.7); // green leaf
          p.fillRect(-2, -2, 4, 3);
        } else {
          p.fillStyle(0xfff200, 0.9); // golden sparkle
          p.fillCircle(0, 0, 1.5);
        }
        p.setPosition(px, py);
        
        this.tweens.add({
          targets: p,
          y: py - (30 + Math.random() * 20),
          x: px + (Math.random() * 16 - 8),
          alpha: 0,
          scale: 1.5,
          angle: Math.random() * 180,
          duration: 1200 + Math.random() * 600,
          onComplete: () => {
            p.destroy();
          }
        });
      }
    });

    // Label Text
    const label = this.add.text(0, -28, '🏰 TO SANCTUARY', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#27ae60',
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5);
    this.sanctuaryPortalContainer.add(label);

    // Make interactive
    const clickZone = this.add.zone(0, 0, 50, 40).setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', () => {
      this.transitionToSanctuary();
    });
    this.sanctuaryPortalContainer.add(clickZone);

    // Enable physics for position overlap checks
    this.physics.add.existing(this.sanctuaryPortalContainer);
    const body = this.sanctuaryPortalContainer.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setSize(44, 20);
    body.setOffset(-22, -10);
  }

  private transitionToSanctuary(): void {
    AudioManager.playSfx('ui_confirm');
    if (this.player) this.player.stopMovement();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TravelScene', { targetScene: 'SanctuaryScene' });
    });
  }

  // 🪙 PHYSICAL SELL BOX ON MAP
  private createSellBox(_width: number, _height: number): void {
    const boxX = 1200;
    const boxY = 1200;

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
    this.sellPanel.setScrollFactor(0);

    const bg = this.add.nineslice(0, 0, 'panel_frame', 0, 480, 340, 24, 24, 24, 24);
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
      const cardBg = this.add.nineslice(0, 0, 'button', 0, cardW, cardH, 18, 18, 12, 12);
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

      const icon = this.add.image(-65, 0, this.getAreaSpriteKey(creature.area)).setScale(0.85);
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
      const sellBtn = this.add.nineslice(65, 0, 'button', 0, 52, 28, 18, 18, 12, 12).setTint(0x8fd14f);
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
    
    const sellAllBg = this.add.nineslice(0, 0, 'button', 0, 240, 36, 18, 18, 12, 12).setTint(0xffd9a0);
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

    const bg = this.add.nineslice(0, 0, 'panel_frame', 0, 480, 320, 24, 24, 24, 24);
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

      const cardBg = this.add.nineslice(0, 0, 'button', 0, cardW, 160, 18, 18, 12, 12);
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

        // Check if quest completed
        const travelCheck = BiomeManager.canTravelTo(area.id);
        if (travelCheck.allowed) {
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
          // Quest is not completed! Explain the quest lock
          const questGateId = (BiomeManager as any).biomeGates[area.id];
          const questObj = QuestManager.getQuest(questGateId);
          const reqText = this.add.text(0, statY, `Gate: Quest\n"${questObj?.title || 'Story Quest'}"`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '8px',
            fontStyle: 'bold',
            color: '#ff5c8a',
            align: 'center'
          }).setOrigin(0.5);
          card.add(reqText);
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
    // Clear trailing rope graphics
    this.tetherRopeGraphics.clear();

    // 1. Update Player position and logic
    if (this.player) {
      this.player.update(time, delta);
    }

    // Lead trailing tethered creature if exists
    if (this.tetheredCreature && this.tetheredCreature.active) {
      const dist = Phaser.Math.Distance.Between(this.tetheredCreature.x, this.tetheredCreature.y, this.player.x, this.player.y);

      if (dist > 75) {
        const angle = Phaser.Math.Angle.Between(this.tetheredCreature.x, this.tetheredCreature.y, this.player.x, this.player.y);
        const speed = 110;
        this.tetheredCreature.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      } else if (dist < 45) {
        this.tetheredCreature.body.setVelocity(0, 0);
      } else {
        const vx = this.tetheredCreature.body.velocity.x;
        const vy = this.tetheredCreature.body.velocity.y;
        this.tetheredCreature.body.setVelocity(vx * 0.85, vy * 0.85);
      }

      // Draw the tether rope graphics
      const px = this.player.x;
      const py = this.player.y;
      const cx = this.tetheredCreature.x;
      const cy = this.tetheredCreature.y;

      const midX = (px + cx) / 2;
      const sag = Math.max(0, 30 - dist * 0.15);
      const midY = (py + cy) / 2 + sag;

      // Draw rope shadow
      this.tetherRopeGraphics.lineStyle(3, 0x000000, 0.2);
      this.tetherRopeGraphics.beginPath();
      this.tetherRopeGraphics.moveTo(px, py + 8);
      this.tetherRopeGraphics.lineTo(midX, midY + 8);
      this.tetherRopeGraphics.lineTo(cx, cy + 8);
      this.tetherRopeGraphics.strokePath();

      // Draw rope
      this.tetherRopeGraphics.lineStyle(2, this.getEquippedRopeColor(), 0.95);
      this.tetherRopeGraphics.beginPath();
      this.tetherRopeGraphics.moveTo(px, py);
      this.tetherRopeGraphics.lineTo(midX, midY);
      this.tetherRopeGraphics.lineTo(cx, cy);
      this.tetherRopeGraphics.strokePath();

      this.tetheredCreature.update(time, delta);
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

      // Draw rope visual between player and creature
      this.qteRopeGraphics.clear();
      const px = this.player.x;
      const py = this.player.y;
      const cx = this.activeCreatureForCapture.x;
      const cy = this.activeCreatureForCapture.y;
      const progress = this.towProgress / 100;
      
      // Rope curve - sags more at low progress, pulls taut at high progress
      const sag = (1 - progress) * 30;
      const midX = (px + cx) / 2;
      const midY = (py + cy) / 2 - sag;
      
      // Rope shadow
      this.qteRopeGraphics.lineStyle(4, 0x000000, 0.2);
      this.qteRopeGraphics.beginPath();
      this.qteRopeGraphics.moveTo(px, py);
      this.qteRopeGraphics.lineTo(midX, midY);
      this.qteRopeGraphics.lineTo(cx, cy);
      this.qteRopeGraphics.strokePath();
      
      // Rope line
      const baseRopeColor = this.getEquippedRopeColor();
      const ropeColor = progress > 0.6 ? baseRopeColor : progress > 0.3 ? 0xd4a574 : 0xe86868;
      this.qteRopeGraphics.lineStyle(3, ropeColor, 0.9);
      this.qteRopeGraphics.beginPath();
      this.qteRopeGraphics.moveTo(px, py);
      this.qteRopeGraphics.lineTo(midX, midY);
      this.qteRopeGraphics.lineTo(cx, cy);
      this.qteRopeGraphics.strokePath();
      
      // Pull effect - pulses when pulled
      this.qtePullEffect.clear();
      this.qtePullEffect.fillStyle(0xffd9a0, 0.3);
      this.qtePullEffect.fillCircle(midX, midY, 6 + (1 - progress) * 8);
      this.qteRopeGraphics.setDepth(130);

      if (this.towProgress <= 0 || this.towTimerRemaining <= 0) {
        this.endTowMinigame(false);
      }
    }

    // 3. Update active wild creatures (FSM) with frustum culling
    const cam = this.cameras.main;
    const margin = 300;
    const camLeft = cam.scrollX - margin;
    const camRight = cam.scrollX + cam.width + margin;
    const camTop = cam.scrollY - margin;
    const camBottom = cam.scrollY + cam.height + margin;
    
    for (const c of this.activeCreatures) {
      if (c.active && c.x >= camLeft && c.x <= camRight && c.y >= camTop && c.y <= camBottom) {
        c.update(time, delta);
      }
    }

    // 4. Proximity Interaction detection
    this.handleProximityDetection();
  }

  private handleProximityDetection(): void {
    if (!this.player || this.isQteActive || this.sellPanel || this.merchantShopPanel || DialogueManager.isDialogueActive()) {
      if (this.interactBubble) this.interactBubble.setVisible(false);
      this.nearestInteractable = null;
      this.nearestInteractableType = null;
      return;
    }

    let closestDist = Infinity;
    let closestTarget: any = null;
    let targetType: 'creature' | 'merchant' | 'portal' | 'sellbox' | 'research_lab' | 'base_hq' | 'luna_npc' | null = null;

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

    // Check Research Lab
    if (this.researchLabContainer) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.researchLabContainer.x, this.researchLabContainer.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = this.researchLabContainer;
        targetType = 'research_lab';
      }
    }

    // Check Base HQ
    if (this.baseHqContainer) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.baseHqContainer.x, this.baseHqContainer.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = this.baseHqContainer;
        targetType = 'base_hq';
      }
    }

    // Check Luna NPC
    if (this.lunaNpcContainer) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lunaNpcContainer.x, this.lunaNpcContainer.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = this.lunaNpcContainer;
        targetType = 'luna_npc';
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
        promptText = '[E] Travel to Sanctuary';
      } else if (targetType === 'sellbox') {
        promptText = '[SPACE] SELL CREATURES';
      } else if (targetType === 'research_lab') {
        promptText = '[SPACE] ENTER RESEARCH LAB';
      } else if (targetType === 'base_hq') {
        promptText = '[SPACE] ENTER BASE HQ';
      } else if (targetType === 'luna_npc') {
        promptText = '[SPACE] TALK TO LUNA';
      }

      this.interactBubbleText.setText(promptText);

      // Adjust text bubble width based on text
      const padding = 16;
      const bubbleW = this.interactBubbleText.width + padding;
      const bubbleH = 20;
      this.interactBubbleBg.clear();
      this.interactBubbleBg.fillStyle(0xfff7e6, 0.95);
      this.interactBubbleBg.lineStyle(1.5, 0x8a5200, 1);
      this.interactBubbleBg.fillRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 4);
      this.interactBubbleBg.strokeRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 4);

      // Position bubble above player's head
      this.interactBubble.setPosition(this.player.x, this.player.y - 40);
      this.interactBubble.setVisible(true);
    } else {
      if (this.interactBubble) this.interactBubble.setVisible(false);
      this.nearestInteractable = null;
      this.nearestInteractableType = null;
    }
  }

  private updateMountSpeedAndVisuals(): void {
    const state = SaveSystem.getState();
    const activeMountId = state.activeMountInstanceId;

    if (activeMountId) {
      const pet = state.ownedCreatures.find(oc => oc.instanceId === activeMountId);
      if (pet) {
        const cData = DataLoader.getCreature(pet.creatureId);
        if (cData) {
          const isFlyable = !!pet.canFly;
          this.player.updateMountVisuals(cData.area, isFlyable);
          
          if (this.playerObstacleCollider) {
            this.playerObstacleCollider.active = !isFlyable; // Flying players bypass obstacles!
          }
          return;
        }
      }
    }

    // No mount
    this.player.updateMountVisuals(null, false);
    if (this.playerObstacleCollider) {
      this.playerObstacleCollider.active = true;
    }
  }

  private createResearchLab(): void {
    const labX = 900;
    const labY = 550;

    this.researchLabContainer = this.add.container(labX, labY);

    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x141f2a, 1);

    // Domed futuristic research lab
    graphics.fillStyle(0x7f8c8d, 1); // metallic wall
    graphics.fillRoundedRect(-40, -30, 80, 50, { tl: 35, tr: 35, bl: 2, br: 2 });
    graphics.strokeRoundedRect(-40, -30, 80, 50, { tl: 35, tr: 35, bl: 2, br: 2 });

    // Glass dome overlay (glowing light blue)
    graphics.fillStyle(0xa0e7e5, 0.6);
    graphics.fillCircle(0, -15, 20);
    graphics.strokeCircle(0, -15, 20);

    // Metal panel line
    graphics.lineBetween(-40, 5, 40, 5);

    // Doorway
    graphics.fillStyle(0x2d3436, 1);
    graphics.fillRect(-12, 5, 24, 15);
    graphics.strokeRect(-12, 5, 24, 15);

    // Cyan glowing computer screens inside the window
    graphics.fillStyle(0x00d2d3, 0.85);
    graphics.fillRect(-8, -20, 16, 10);
    graphics.lineStyle(1, 0x141f2a, 1);
    graphics.strokeRect(-8, -20, 16, 10);

    this.researchLabContainer.add(graphics);

    // Sign/Label text
    const label = this.add.text(0, -52, '🔬 RESEARCH LAB', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#2980b9',
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5);
    this.researchLabContainer.add(label);

    // Interaction Click Zone
    const clickZone = this.add.zone(0, 0, 90, 80).setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', () => {
      AudioManager.playSfx('ui_confirm');
      this.interactWithResearchLab();
    });
    this.researchLabContainer.add(clickZone);

    // Enable static physics body for collision
    this.physics.add.existing(this.researchLabContainer);
    const body = this.researchLabContainer.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setSize(80, 50);
    body.setOffset(-40, -30);

    // Add to static obstacles
    this.obstaclesGroup.add(this.researchLabContainer);
  }

  private createBaseHQ(): void {
    const hqX = 1500;
    const hqY = 550;

    this.baseHqContainer = this.add.container(hqX, hqY);

    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x141f2a, 1);

    // Large headquarters cabin (wooden / metallic hybrid)
    graphics.fillStyle(0xa8763d, 1); // Wood pillars
    graphics.fillRect(-45, -35, 90, 55);
    graphics.strokeRect(-45, -35, 90, 55);

    // Roof (red shingles procedural)
    graphics.fillStyle(0xd63031, 1);
    graphics.beginPath();
    graphics.moveTo(-52, -35);
    graphics.lineTo(0, -60);
    graphics.lineTo(52, -35);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    // Large double doors
    graphics.fillStyle(0x5c4832, 1);
    graphics.fillRect(-16, 2, 32, 18);
    graphics.strokeRect(-16, 2, 32, 18);

    // Center dividing door line
    graphics.lineBetween(0, 2, 0, 20);

    // Brass door handles
    graphics.fillStyle(0xf1c40f, 1);
    graphics.fillCircle(-3, 10, 2);
    graphics.fillCircle(3, 10, 2);

    // Flagpole
    graphics.lineStyle(3, 0x7f8c8d, 1);
    graphics.lineBetween(38, -35, 38, -68);
    // Red flag
    graphics.fillStyle(0xd63031, 1);
    graphics.fillTriangle(38, -68, 56, -62, 38, -56);

    this.baseHqContainer.add(graphics);

    // Sign/Label text
    const label = this.add.text(0, -75, '🏢 BASE HQ', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#27ae60',
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5);
    this.baseHqContainer.add(label);

    // Interaction Click Zone
    const clickZone = this.add.zone(0, 0, 100, 90).setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', () => {
      AudioManager.playSfx('ui_confirm');
      this.interactWithBaseHq();
    });
    this.baseHqContainer.add(clickZone);

    // Enable static physics body for collision
    this.physics.add.existing(this.baseHqContainer);
    const body = this.baseHqContainer.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setSize(90, 55);
    body.setOffset(-45, -35);

    // Add to static obstacles
    this.obstaclesGroup.add(this.baseHqContainer);
  }

  // 🌙 LUNA NPC - Companion character in Green Meadow
  private createLunaNPC(): void {
    const npcX = 1080;
    const npcY = 880;

    this.lunaNpcContainer = this.add.container(npcX, npcY);
    this.lunaNpcContainer.setDepth(npcY);

    if (this.textures.exists('luna_npc')) {
      this.lunaSprite = this.add.sprite(0, 0, 'luna_npc');
      // Set explicit pixel dimensions matching the main character's tile grid footprint
      this.lunaSprite.setDisplaySize(48, 48);
      this.lunaSprite.setOrigin(0.5, 0.5);
      this.lunaNpcContainer.add(this.lunaSprite);
    } else {
      // Fallback
      const body = this.add.graphics();
      body.fillStyle(0x9b59b6, 1);
      body.fillRoundedRect(-10, -2, 20, 28, 4);
      this.lunaNpcContainer.add(body);
    }

    // Sparkling aura effect around Luna
    const aura = this.add.graphics();
    aura.lineStyle(2, 0xd4a0ff, 0.4);
    aura.strokeCircle(0, 5, 24);
    this.lunaNpcContainer.add(aura);

    this.tweens.add({
      targets: aura,
      alpha: 0.1,
      scale: 1.3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Floating bob animation
    this.tweens.add({
      targets: this.lunaNpcContainer,
      y: npcY - 4,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Name label
    const label = this.add.text(0, -36, '🌙 LUNA', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#8e44ad',
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5);
    this.lunaNpcContainer.add(label);

    // Subtle greeting indicator
    const greet = this.add.text(0, 34, '[E] Talk to Luna', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#3e2723',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    this.lunaNpcContainer.add(greet);

    this.tweens.add({
      targets: greet,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Interactive zone
    const clickZone = this.add.zone(0, 0, 50, 60).setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', () => {
      AudioManager.playSfx('ui_confirm');
      this.interactWithLuna();
    });
    this.lunaNpcContainer.add(clickZone);

    // Enable physics body for collision
    this.physics.add.existing(this.lunaNpcContainer);
    const body2 = this.lunaNpcContainer.body as Phaser.Physics.Arcade.Body;
    body2.setImmovable(true);
    body2.setSize(30, 36);
    body2.setOffset(-15, -18);

    // Add to static obstacles
    this.obstaclesGroup.add(this.lunaNpcContainer);
  }

  private createHubDecorations(): void {
    // 1. Windmill at (750, 480)
    const windmillContainer = this.add.container(750, 480);
    const tower = this.add.graphics();
    tower.lineStyle(2, 0x141f2a, 1);
    tower.fillStyle(0xd5c4b4, 1);
    // Draw tower cone/trapezoid
    tower.beginPath();
    tower.moveTo(-15, 40);
    tower.lineTo(-6, -20);
    tower.lineTo(6, -20);
    tower.lineTo(15, 40);
    tower.closePath();
    tower.fillPath();
    tower.strokePath();
    // Dome cap
    tower.fillStyle(0x7e5109, 1);
    tower.fillCircle(0, -20, 8);
    tower.strokeCircle(0, -20, 8);
    windmillContainer.add(tower);

    // Blades container
    const blades = this.add.container(0, -20);
    const bladesG = this.add.graphics();
    bladesG.lineStyle(2, 0x141f2a, 1);
    bladesG.fillStyle(0xffffff, 0.9);
    // 4 sails/blades drawn along cardinal directions
    bladesG.fillRect(-2, 0, 4, 35); // down
    bladesG.strokeRect(-2, 0, 4, 35);
    bladesG.fillRect(0, -2, 35, 4); // right
    bladesG.strokeRect(0, -2, 35, 4);
    bladesG.fillRect(-2, -35, 4, 35); // up
    bladesG.strokeRect(-2, -35, 4, 35);
    bladesG.fillRect(-35, -2, 35, 4); // left
    bladesG.strokeRect(-35, -2, 35, 4);
    blades.add(bladesG);
    windmillContainer.add(blades);

    // Rotate blades tween
    this.tweens.add({
      targets: blades,
      angle: 360,
      duration: 5000,
      repeat: -1,
      ease: 'Linear'
    });

    // 2. Active Campsite at (1100, 520)
    const campfire = this.add.container(1100, 520);
    const logs = this.add.graphics();
    logs.lineStyle(1.5, 0x141f2a, 1);
    logs.fillStyle(0x5c4832, 1);
    logs.fillRect(-10, -3, 20, 6);
    logs.strokeRect(-10, -3, 20, 6);
    logs.fillRect(-3, -10, 6, 20);
    logs.strokeRect(-3, -10, 6, 20);
    campfire.add(logs);

    // Animated Fire
    const fire = this.add.graphics();
    fire.fillStyle(0xff7675, 0.95);
    fire.fillTriangle(-8, 0, 0, -16, 8, 0);
    fire.fillStyle(0xf1c40f, 0.95);
    fire.fillTriangle(-4, 0, 0, -10, 4, 0);
    campfire.add(fire);

    this.tweens.add({
      targets: fire,
      scaleY: 1.3,
      scaleX: 1.15,
      y: -1,
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: 'Bounce.easeInOut'
    });

    // Campsite Tent
    const campTent = this.add.graphics();
    campTent.lineStyle(2, 0x141f2a, 1);
    campTent.fillStyle(0xe67e22, 1); // Orange tent
    campTent.fillTriangle(-15, 0, 0, -25, 15, 0);
    campTent.strokeTriangle(-15, 0, 0, -25, 15, 0);
    campTent.fillStyle(0x7e5109, 1); // Opening flap
    campTent.fillTriangle(-7, 0, 0, -14, 7, 0);
    
    this.add.container(1060, 520, [campTent]);

    // 3. Signpost at (1160, 530)
    const signpost = this.add.container(1160, 530);
    const signG = this.add.graphics();
    signG.lineStyle(1.5, 0x141f2a, 1);
    // Wooden post
    signG.fillStyle(0xa8763d, 1);
    signG.fillRect(-2, -5, 4, 25);
    signG.strokeRect(-2, -5, 4, 25);
    // Sign board left
    signG.fillStyle(0xd5c4b4, 1);
    signG.fillRect(-22, -18, 20, 10);
    signG.strokeRect(-22, -18, 20, 10);
    // Sign board right
    signG.fillRect(2, -10, 20, 10);
    signG.strokeRect(2, -10, 20, 10);
    signpost.add(signG);

    // Tiny arrows texts
    const signTxt1 = this.add.text(-12, -14, '🔬', { fontSize: '6px' }).setOrigin(0.5);
    const signTxt2 = this.add.text(12, -6, '🏢', { fontSize: '6px' }).setOrigin(0.5);
    signpost.add([signTxt1, signTxt2]);

    // Signpost interactive Zone
    const clickZone = this.add.zone(0, 0, 50, 40).setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', () => {
      AudioManager.playSfx('ui_tap');
      DialogueManager.startDialogue([
        { speaker: 'Signpost', portrait: 'researcher', portraitSide: 'left', text: '🔬 Research Lab: West (Left) | 🏢 Base HQ: East (Right)' }
      ]);
    });
    signpost.add(clickZone);
    
    // Add obstacles
    this.physics.add.existing(windmillContainer);
    (windmillContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true).setSize(30, 60).setOffset(-15, -20);
    this.obstaclesGroup.add(windmillContainer);

    this.physics.add.existing(signpost);
    (signpost.body as Phaser.Physics.Arcade.Body).setImmovable(true).setSize(20, 20).setOffset(-10, 0);
    this.obstaclesGroup.add(signpost);
  }

  private interactWithResearchLab(): void {
    const activeQuest = QuestManager.getActiveQuest();
    if (!activeQuest) {
      DialogueManager.startDialogue([
        { speaker: 'Luna', portrait: 'luna_information', portraitSide: 'left', text: 'Welcome to the Research Lab! Keep up the good work exploring the biomes, Keeper!' }
      ]);
      return;
    }

    if (activeQuest.biome !== this.areaId) {
      DialogueManager.startDialogue([
        { speaker: 'Luna', portrait: 'luna_information', portraitSide: 'left', text: `Welcome back! You should focus on your active quest "${activeQuest.title}" in the ${this.getBiomeDisplayName(activeQuest.biome)}.` }
      ]);
      return;
    }

    if (QuestManager.canTurnInActiveQuest()) {
      const res = QuestManager.turnInActiveQuest();
      if (res.success) {
        DialogueManager.startDialogue(activeQuest.dialogueComplete, () => {
          if (res.unlockedBiome) {
            this.showCinematicBiomeUnlock(res.unlockedBiome);
          }
        });
      }
    } else {
      DialogueManager.startDialogue(activeQuest.dialogueIncomplete);
    }
  }

  private interactWithBaseHq(): void {
    const state = SaveSystem.getState();
    const activeQuest = QuestManager.getActiveQuest();
    
    const steps: DialogueStep[] = [];
    
    if (activeQuest && activeQuest.id === 'quest_meadow_main') {
      steps.push({ speaker: 'Elder Oak', portrait: 'elder_oak', portraitSide: 'left', text: 'Welcome to the Base Headquarters, young Keeper! I am Elder Oak.' });
      steps.push({ speaker: 'Elder Oak', portrait: 'elder_oak', portraitSide: 'left', text: 'We coordinate all sanctuary operations here. Luna runs the Research Lab next door.' });
      steps.push({ speaker: 'Elder Oak', portrait: 'elder_oak', portraitSide: 'left', text: 'Work with Luna to complete Meadow Research. Once the meadow is stable, we can explore further.' });
    } else {
      steps.push({ speaker: 'Elder Oak', portrait: 'elder_oak', portraitSide: 'left', text: `Welcome back to HQ, Keeper! Your level is currently ${state.level}.` });
      if (state.unlockedAreas.includes('sky_island')) {
        steps.push({ speaker: 'Elder Oak', portrait: 'elder_oak', portraitSide: 'left', text: 'Incredible... You have unlocked the path to Sky Island. Complete the research there, and you will achieve final mastery!' });
      } else {
        steps.push({ speaker: 'Elder Oak', portrait: 'elder_oak', portraitSide: 'left', text: 'Luna tells me you are doing wonderful work. Keep it up!' });
      }
    }

    DialogueManager.startDialogue(steps);
  }

  private interactWithLuna(): void {
    if (this.lunaNpcContainer && this.lunaSprite) {
      const dx = this.player.x - this.lunaNpcContainer.x;
      if (dx > 0) this.lunaSprite.setFlipX(false);
      else this.lunaSprite.setFlipX(true);
    }

    const steps: DialogueStep[] = [
      { speaker: 'Luna', portrait: 'luna_information', portraitSide: 'left', text: 'Welcome back to Wild Haven.' },
      { speaker: 'Luna', portrait: 'luna_information', portraitSide: 'left', text: 'The creatures seem happy today.' },
      { speaker: 'Luna', portrait: 'luna_information', portraitSide: 'left', text: 'Take your time exploring the sanctuary.' }
    ];

    DialogueManager.startDialogue(steps);
  }

  private getBiomeDisplayName(biome: string): string {
    switch (biome) {
      case 'green_meadow': return 'Green Meadow';
      case 'whisper_forest': return 'Whisper Forest';
      case 'crystal_mountain': return 'Crystal Mountain';
      case 'golden_dunes': return 'Golden Dunes';
      case 'sky_island': return 'Sky Island';
      default: return biome;
    }
  }

  private showCinematicBiomeUnlock(biomeId: string): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    AudioManager.playSfx('area_unlock');
    
    const container = this.add.container(width / 2, height / 2);
    container.setScrollFactor(0);
    container.setDepth(300);
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-width / 2, -height / 2, width, height);
    container.add(overlay);
    
    const frame = this.add.nineslice(0, 0, 'panel_frame', 0, 400, 180, 24, 24, 24, 24);
    container.add(frame);
    
    const text1 = this.add.text(0, -40, '✨ NARRATIVE MILESTONE ✨', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#e74c3c'
    }).setOrigin(0.5);
    
    const text2 = this.add.text(0, 0, 'NEW BIOME UNLOCKED!', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#2ecc71',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    
    const biomeName = this.getBiomeDisplayName(biomeId);
    const text3 = this.add.text(0, 40, `You can now travel to the ${biomeName}!`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      color: '#5c4832'
    }).setOrigin(0.5);
    
    container.add([text1, text2, text3]);
    
    container.setScale(0.01);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(3000, () => {
          if (!this.scene) return;
          this.tweens.add({
            targets: container,
            alpha: 0,
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => {
              container.destroy();
            }
          });
        });
      }
    });
  }

  private getAreaSpriteKey(area: string): string {
    switch (area) {
      case 'green_meadow': return 'creature_meadow';
      case 'whisper_forest': return 'creature_forest';
      case 'crystal_mountain': return 'creature_mountain';
      case 'golden_dunes': return 'creature_dunes';
      case 'sky_island': return 'creature_sky';
      default: return 'creature_meadow';
    }
  }

  destroy(): void {
    if (this.skyDropTimer) this.skyDropTimer.destroy();
  }

  private spawnExploreCivilization(): void {
    let houseKey = '';
    let houseX = 0;
    let houseY = 0;

    if (this.areaId === 'green_meadow') {
      houseKey = 'building_caretaker';
      houseX = 850;
      houseY = 550;
    } else if (this.areaId === 'whisper_forest') {
      houseKey = 'building_research';
      houseX = 1450;
      houseY = 1100;
    } else if (this.areaId === 'crystal_mountain') {
      houseKey = 'building_storage';
      houseX = 1050;
      houseY = 1450;
    } else if (this.areaId === 'golden_dunes') {
      houseKey = 'building_workshop';
      houseX = 1650;
      houseY = 1350;
    }

    if (houseKey) {
      const container = this.add.container(houseX, houseY);
      container.setDepth(houseY);

      // Building image
      const building = this.add.image(0, 0, houseKey).setScale(0.8).setOrigin(0.5, 0.85);
      container.add(building);

      // Collisions
      this.obstaclesGroup.add(container);
      const body = container.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(50, 30);
      body.setOffset(-25, -5);

      // Add decorations around the explorer hut
      const mailbox = this.add.image(houseX - 55, houseY + 10, 'city_decor_mailbox').setScale(1.1);
      mailbox.setDepth(houseY + 12);
      this.obstaclesGroup.add(mailbox);
      (mailbox.body as Phaser.Physics.Arcade.StaticBody).setSize(12, 12).setOffset(-6, -4);

      const barrel = this.add.image(houseX + 55, houseY + 5, 'city_decor_barrel').setScale(1.1);
      barrel.setDepth(houseY + 12);
      this.obstaclesGroup.add(barrel);
      (barrel.body as Phaser.Physics.Arcade.StaticBody).setSize(14, 14).setOffset(-7, -4);

      const bench = this.add.image(houseX - 45, houseY + 30, 'city_decor_bench').setScale(1.0);
      bench.setDepth(houseY + 32);
      this.obstaclesGroup.add(bench);
      (bench.body as Phaser.Physics.Arcade.StaticBody).setSize(24, 10).setOffset(-12, -4);
    }
  }

  private getEquippedRopeColor(): number {
    const state = SaveSystem.getState();
    const ropeId = state.currentRopeId || 'rope_basic';
    switch (ropeId) {
      case 'rope_strong': return 0xaaaaaa;
      case 'rope_magic': return 0xb05fe0;
      case 'rope_divine': return 0xffc93c;
      case 'rope_basic':
      default: return 0xcda075;
    }
  }
}
