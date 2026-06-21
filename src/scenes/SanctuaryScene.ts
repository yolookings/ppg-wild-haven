// src/scenes/SanctuaryScene.ts
import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { SanctuaryCreature } from '../entities/SanctuaryCreature';
import { WildCreature } from '../entities/WildCreature';
import { Player } from '../entities/Player';
import { AudioManager } from '../systems/AudioManager';
import { EventBus } from '../systems/EventBus';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { AchievementSystem } from '../systems/AchievementSystem';
import { MapSelectionPanel } from '../ui/MapSelectionPanel';
import { DataLoader } from '../data/DataLoader';

interface Habitat {
  id: string;
  name: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  gateX: number;
  gateY: number;
  capacity: number;
  allowedBiomes: string[];
  decorations: string[];
}

export class SanctuaryScene extends Phaser.Scene {
  private player!: Player;
  private obstaclesGroup!: Phaser.Physics.Arcade.StaticGroup;
  private creaturesGroup!: Phaser.GameObjects.Group;

  // Tethered delivery system
  private tetheredCreature: WildCreature | null = null;
  private tetherRopeGraphics!: Phaser.GameObjects.Graphics;

  // Habitats layout
  private habitats: Habitat[] = [];
  private capacityTexts: Record<string, Phaser.GameObjects.Text> = {};
  private activeReleasePrompt: { txt: Phaser.GameObjects.Text; btn: Phaser.GameObjects.Container } | null = null;

  // Portals
  private portals: { areaId: string; x: number; y: number; container: Phaser.GameObjects.Container }[] = [];
  private activePortalPrompt: { txt: Phaser.GameObjects.Text; btn: Phaser.GameObjects.Container } | null = null;
  private nearestPortal: { areaId: string; x: number; y: number; container: Phaser.GameObjects.Container }[] | any = null;

  // Ambients
  private ambientParticles: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super('SanctuaryScene');
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Start UIScene HUD overlay if not active
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
    this.scene.bringToTop('UIScene');

    // Update Area Name in HUD
    this.time.delayedCall(100, () => {
      const uiScene = this.scene.get('UIScene') as any;
      if (uiScene && uiScene.setAreaText) {
        uiScene.setAreaText('🏰 Sanctuary');
      }
    });

    // Fade in camera
    this.cameras.main.fadeIn(500, 26, 35, 30);
    AudioManager.playMusic('music_medieval');

    // Setup world boundaries (1200 x 900 map size)
    const mapW = 1200;
    const mapH = 900;
    this.physics.world.setBounds(0, 0, mapW, mapH);

    // ==========================================
    // 1. Tiled Grass Ground Background
    // ==========================================
    this.createGroundTexture();
    const ground = this.add.tileSprite(mapW / 2, mapH / 2, mapW, mapH, 'sanctuary_ground_texture');
    ground.setDepth(0);

    // Removed dirt paths for a cleaner, cohesive grass look

    // ==========================================
    // 3. Initialize Groups & Objects
    // ==========================================
    this.obstaclesGroup = this.physics.add.staticGroup();
    this.creaturesGroup = this.add.group();
    this.tetherRopeGraphics = this.add.graphics();
    this.tetherRopeGraphics.setDepth(100);

    // Define Habitats config - Single Sanctuary Area
    this.habitats = [
      {
        id: 'sanctuary',
        name: 'Wild Haven Sanctuary',
        x1: 60, x2: 1140, y1: 60, y2: 840,
        gateX: 600, gateY: 840,
        capacity: 100,
        allowedBiomes: ['green_meadow', 'whisper_forest', 'crystal_mountain', 'golden_dunes', 'sky_island'],
        decorations: []
      }
    ];

    // ==========================================
    // 4. Draw Habitats, Fences & Water Sources
    // ==========================================
    this.habitats.forEach(h => {
      this.buildEnclosure(h);
    });

    // ==========================================
    // 5. Instantiate Player
    // ==========================================
    // Center Spawn (Near Campfire)
    this.player = new Player(this, 600, 520);
    this.add.existing(this.player);
    this.physics.add.collider(this.player, this.obstaclesGroup);

    // Camera configuration
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // ==========================================
    // 6. Setup Portals Switchers (Center Plaza)
    // ==========================================
    this.createPortalsPlaza();

    // ==========================================
    // 7. Spawn Resident Creatures & Trailing Companions
    // ==========================================
    this.refreshSanctuary();

    // Check if player has a tethered creature
    const state = SaveSystem.getState();
    if (state.tetheredCreatureId) {
      const creatureData = DataLoader.getCreature(state.tetheredCreatureId);
      if (creatureData) {
        // Spawn right behind player
        const tethered = new WildCreature(this, this.player.x - 50, this.player.y + 40, creatureData, () => {});
        tethered.isTethered = true;
        this.add.existing(tethered);
        this.tetheredCreature = tethered;
      }
    }

    // Setup interactive prompt container on camera (scroll factor 0)
    this.createReleasePromptUI(width, height);
    this.createPortalPromptUI(width, height);

    // Build village area and organic map density
    this.createSanctuaryVillage();
    this.createOrganicDensity();
    this.createEnrichedDecorations();

    // ==========================================
    // 8. Event Registers & Ambient Effects
    // ==========================================
    EventBus.on('sanctuaryUpdated', this.refreshSanctuary, this);

    this.createAmbientDecorations(mapW, mapH);

    // Clean up events on shutdown
    this.events.once('shutdown', () => {
      EventBus.off('sanctuaryUpdated', this.refreshSanctuary, this);
      this.ambientParticles.forEach(p => p.destroy());
      this.ambientParticles = [];
      if (this.tetheredCreature) {
        this.tetheredCreature.destroy();
      }
    });

    // Instructions popup floating message on start
    this.time.delayedCall(1200, () => {
      if (this.tetheredCreature) {
        this.createRewardFloatingText(this.player.x, this.player.y - 30, 'Lead your captured creature to the\nmatching Pen Gate to release it!', '#8fd14f');
      } else {
        this.createRewardFloatingText(this.player.x, this.player.y - 30, 'Ranch Sanctuary Hub\nStep into portals to explore!', '#ffe0b2');
      }
    });
  }

  update(time: number, delta: number): void {
    // 1. Update Player
    if (this.player) {
      this.player.update(time, delta);
    }

    // 2. Tether Follow & Rope Drawing Logic
    this.tetherRopeGraphics.clear();
    if (this.tetheredCreature && this.tetheredCreature.active) {
      const dist = Phaser.Math.Distance.Between(this.tetheredCreature.x, this.tetheredCreature.y, this.player.x, this.player.y);

      // Follow logic with delay
      if (dist > 75) {
        const angle = Phaser.Math.Angle.Between(this.tetheredCreature.x, this.tetheredCreature.y, this.player.x, this.player.y);
        const speed = 110; // Follow velocity
        this.tetheredCreature.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      } else if (dist < 45) {
        this.tetheredCreature.body.setVelocity(0, 0);
      } else {
        // Linear dampening velocity to a stop
        this.tetheredCreature.body.setVelocity(this.tetheredCreature.body.velocity.x * 0.85, this.tetheredCreature.body.velocity.y * 0.85);
      }

      // Draw rope visual
      const px = this.player.x;
      const py = this.player.y;
      const cx = this.tetheredCreature.x;
      const cy = this.tetheredCreature.y;

      const midX = (px + cx) / 2;
      const sag = Math.max(0, 30 - dist * 0.15); // sags when close
      const midY = (py + cy) / 2 + sag;

      // Draw shadow
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

    // 3. Proximity Check for Enclosure gates (Deliver) & Portals (Teleport)
    this.handleProximityDetection();
  }

  private handleProximityDetection(): void {
    if (!this.player) return;

    const px = this.player.x;
    const py = this.player.y;

    // A. Check Portal Overlaps (Proximity Prompt)
    let nearPortal = false;
    for (const portal of this.portals) {
      const dist = Phaser.Math.Distance.Between(px, py, portal.x, portal.y);
      if (dist < 60) {
        nearPortal = true;
        if (this.nearestPortal !== portal) {
          if (this.nearestPortal) {
            this.nearestPortal.container.setScale(1.0);
          }
          this.nearestPortal = portal;
          portal.container.setScale(1.12);
          AudioManager.playSfx('button_hover');
        }
        this.showPortalPrompt(portal);
        break;
      }
    }

    if (!nearPortal) {
      if (this.nearestPortal) {
        this.nearestPortal.container.setScale(1.0);
        this.nearestPortal = null;
      }
      this.hidePortalPrompt();
    }

    // B. Check Pen Gates Deliver Prompt (Modified: Show anywhere)
    if (this.tetheredCreature) {
      const targetHabId = this.getCreatureHabitat(this.tetheredCreature.creatureData.id);
      const habitat = this.habitats.find(h => h.id === targetHabId);
      
      if (habitat) {
        if (this.activeReleasePrompt && !this.activeReleasePrompt.btn.visible) {
          this.showReleasePrompt(habitat);
        }
      }
    } else {
      if (this.activeReleasePrompt && this.activeReleasePrompt.btn.visible) {
        this.hideReleasePrompt();
      }
    }
  }

  public triggerPortalInteraction(areaId: string): void {
    if (areaId === 'explore_menu') {
      new MapSelectionPanel(this);
      return;
    }
    const state = SaveSystem.getState();
    const areaData = this.cache.json.get('areas_data').areas.find((a: any) => a.id === areaId);
    if (!areaData) return;

    const isUnlocked = state.unlockedAreas.includes(areaId as any);

    if (isUnlocked) {
      // Teleport to Explore Scene!
      this.player.stopMovement();
      AudioManager.playSfx('ui_confirm');
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('TravelScene', { targetScene: 'ExploreScene', areaId });
      });
    } else {
      // Attempt Unlock
      if (state.level >= areaData.unlockLevel) {
        if (state.coins >= areaData.unlockCost) {
          // Deduct & Unlock!
          state.coins -= areaData.unlockCost;
          state.unlockedAreas.push(areaId as any);
          SaveSystem.markDirty();
          SaveSystem.forceSave();

          EventBus.emit('coinsChanged', state.coins);
          AudioManager.playSfx('ui_confirm');
          this.createRewardFloatingText(this.player.x, this.player.y - 30, `Unlocked ${areaData.name}!`, '#8fd14f');
          
          // Re-draw portals plaza to show unlocked status
          this.createPortalsPlaza();
        } else {
          this.createRewardFloatingText(this.player.x, this.player.y - 30, `Locked! Need ${areaData.unlockCost} Coins to unlock.`, '#ff5c8a');
        }
      } else {
        this.createRewardFloatingText(this.player.x, this.player.y - 30, `Locked! Requires Level ${areaData.unlockLevel}.`, '#ff5c8a');
      }
      
      // Knock player back slightly so they don't loop-trigger locked text
      const angle = Phaser.Math.Angle.Between(600, 450, this.player.x, this.player.y);
      this.player.setPosition(this.player.x + Math.cos(angle) * 15, this.player.y + Math.sin(angle) * 15);
      this.player.stopMovement();
    }
  }

  private createReleasePromptUI(width: number, height: number): void {
    const container = this.add.container(width / 2, height - 75);
    container.setScrollFactor(0);
    container.setDepth(200);
    container.setVisible(false);

    // Frame panel behind instruction text
    const frame = this.add.nineslice(0, 0, 'button_long', 0, 320, 56, 18, 18, 12, 12);
    frame.setInteractive({ useHandCursor: true });
    container.add(frame);

    const txt = this.add.text(0, -3, 'Press [E] or Click to Release Creature', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#5c4832',
      align: 'center'
    }).setOrigin(0.5);
    container.add(txt);

    // Register click interaction on the button
    frame.on('pointerdown', () => {
      if (container.visible && this.tetheredCreature) {
        const targetHabId = this.getCreatureHabitat(this.tetheredCreature.creatureData.id);
        const habitat = this.habitats.find(h => h.id === targetHabId);
        if (habitat) {
          this.releaseCreatureToPen(habitat);
        }
      }
    });

    // Key listener for 'E' key delivery shortcut
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-E', () => {
        if (this.tetheredCreature) {
          const targetHabId = this.getCreatureHabitat(this.tetheredCreature.creatureData.id);
          const habitat = this.habitats.find(h => h.id === targetHabId);
          if (habitat) {
            this.releaseCreatureToPen(habitat);
          }
        }
      });
    }

    this.activeReleasePrompt = { txt, btn: container };
  }

  private showReleasePrompt(habitat: Habitat): void {
    if (!this.activeReleasePrompt || !this.tetheredCreature) return;

    const state = SaveSystem.getState();
    const count = state.ownedCreatures.filter(oc => this.getCreatureHabitat(oc.creatureId) === habitat.id).length;

    this.activeReleasePrompt.txt.setText(
      `DELIVER: ${this.tetheredCreature.creatureData.name}\nPress [E] or Tap Here to Release (${count}/${habitat.capacity})`
    );
    this.activeReleasePrompt.btn.setVisible(true);
  }

  private hideReleasePrompt(): void {
    if (this.activeReleasePrompt) {
      this.activeReleasePrompt.btn.setVisible(false);
    }
  }

  private releaseCreatureToPen(habitat: Habitat): void {
    if (!this.tetheredCreature) return;

    const state = SaveSystem.getState();
    const count = state.ownedCreatures.filter(oc => this.getCreatureHabitat(oc.creatureId) === habitat.id).length;

    if (count >= habitat.capacity) {
      this.createRewardFloatingText(this.player.x, this.player.y - 40, 'This enclosure is full!\nUpgrade Sanctuary level or remove animals.', '#ff5c8a');
      AudioManager.playSfx('ui_tap');
      return;
    }

    // Confirm delivery!
    AudioManager.playSfx('capture_success_epic');

    const creature = this.tetheredCreature;
    const rarity = creature.creatureData.rarity;

    let xp = 20;
    let coins = 10;
    switch (rarity) {
      case 'Common': xp = 20; coins = 10; break;
      case 'Rare': xp = 45; coins = 25; break;
      case 'Epic': xp = 100; coins = 75; break;
      case 'Legendary': xp = 250; coins = 200; break;
      case 'Mythic': xp = 600; coins = 500; break;
    }

    // Award Rewards
    state.coins += coins;
    ProgressionSystem.addXp(xp);

    // Track Achievements
    AchievementSystem.trackMetric('captures_total', 1);
    if (rarity === 'Rare') AchievementSystem.trackMetric('rare_captures', 1);
    else if (rarity === 'Epic') AchievementSystem.trackMetric('epic_captures', 1);
    else if (rarity === 'Legendary') AchievementSystem.trackMetric('legendary_captures', 1);
    else if (rarity === 'Mythic') AchievementSystem.trackMetric('mythic_captures', 1);

    // Save as owned
    const instanceId = 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newOwned = {
      instanceId,
      creatureId: creature.creatureData.id,
      capturedAt: Date.now(),
      level: 1
    };
    state.ownedCreatures.push(newOwned);

    // Clear tether
    state.tetheredCreatureId = null;
    this.tetheredCreature = null;

    SaveSystem.markDirty();
    SaveSystem.forceSave();

    // Event signals
    EventBus.emit('coinsChanged', state.coins);
    
    // Jump animation of the released creature moving inside the enclosure
    creature.body.setVelocity(0, 0);
    creature.isTethered = false;

    // Destination inside pen
    const targetX = habitat.x1 + 40 + Math.random() * (habitat.x2 - habitat.x1 - 80);
    const targetY = habitat.y1 + 40 + Math.random() * (habitat.y2 - habitat.y1 - 80);

    this.tweens.add({
      targets: creature,
      x: targetX,
      y: targetY,
      duration: 1000,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        creature.destroy();
        // Trigger UI rebuild
        EventBus.emit('sanctuaryUpdated');
      }
    });

    // Make it hop up and down during release jump
    const sprite = creature.first as Phaser.GameObjects.Sprite;
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        y: -30,
        duration: 500,
        yoyo: true,
        repeat: 0,
        ease: 'Quad.easeOut'
      });
    }

    this.createRewardFloatingText(this.player.x, this.player.y - 30, `Delivered: ${creature.creatureData.name}!\n+${coins} Coins  +${xp} XP`, '#8fd14f');
    this.hideReleasePrompt();
  }

  private buildEnclosure(h: Habitat): void {
    // 1. Draw Fenced borders (obstacles)
    const spacing = 32;

    // Top fence border
    for (let x = h.x1; x <= h.x2; x += spacing) {
      if (Math.abs(x - h.gateX) < 20 && Math.abs(h.y1 - h.gateY) < 20) continue;
      const f = this.add.image(x, h.y1, 'fence_1').setScale(1.2).setOrigin(0.5, 1);
      f.setDepth(h.y1);
      this.obstaclesGroup.add(f);
    }
    // Bottom fence border
    for (let x = h.x1; x <= h.x2; x += spacing) {
      if (Math.abs(x - h.gateX) < 20 && Math.abs(h.y2 - h.gateY) < 20) continue;
      const f = this.add.image(x, h.y2, 'fence_1').setScale(1.2).setOrigin(0.5, 1);
      f.setDepth(h.y2);
      this.obstaclesGroup.add(f);
    }
    // Left fence border
    for (let y = h.y1; y <= h.y2; y += spacing) {
      if (Math.abs(h.x1 - h.gateX) < 20 && Math.abs(y - h.gateY) < 20) continue;
      const f = this.add.image(h.x1, y, 'fence_2').setScale(1.2).setOrigin(0.5, 1);
      f.setDepth(y);
      this.obstaclesGroup.add(f);
    }
    // Right fence border
    for (let y = h.y1; y <= h.y2; y += spacing) {
      if (Math.abs(h.x2 - h.gateX) < 20 && Math.abs(y - h.gateY) < 20) continue;
      const f = this.add.image(h.x2, y, 'fence_2').setScale(1.2).setOrigin(0.5, 1);
      f.setDepth(y);
      this.obstaclesGroup.add(f);
    }

    // 2. Draw Food and Water Bowls inside Enclosure (Bottom-left corner of each pen)
    this.drawEnclosureBowls(h.x1 + 35, h.y2 - 25);

    // 3. Create Gate Visuals (Stone Path, Wooden Gate, Lamps)
    // Stone path
    const path = this.add.graphics();
    path.fillStyle(0x8a9597, 0.8);
    path.fillRoundedRect(h.gateX - 40, h.gateY - 20, 80, 50, 8);
    path.setDepth(1);
    
    // Wooden Gate Pillars
    if (this.textures.exists('button')) {
      const pillarL = this.add.nineslice(h.gateX - 35, h.gateY + 10, 'button', 0, 12, 50, 4, 4, 4, 4);
      pillarL.setTint(0x5c4033);
      pillarL.setOrigin(0.5, 1);
      pillarL.setDepth(h.gateY + 5);
      this.obstaclesGroup.add(pillarL);
      
      const pillarR = this.add.nineslice(h.gateX + 35, h.gateY + 10, 'button', 0, 12, 50, 4, 4, 4, 4);
      pillarR.setTint(0x5c4033);
      pillarR.setOrigin(0.5, 1);
      pillarR.setDepth(h.gateY + 5);
      this.obstaclesGroup.add(pillarR);
      
      const arch = this.add.nineslice(h.gateX, h.gateY - 40, 'button', 0, 82, 12, 4, 4, 4, 4);
      arch.setTint(0x4a3225);
      arch.setOrigin(0.5, 0.5);
      arch.setDepth(h.gateY + 5);
    }

    // Decorative Lamps
    const lampL = this.add.circle(h.gateX - 35, h.gateY - 48, 5, 0xffd700);
    lampL.setDepth(h.gateY + 6);
    const glowL = this.add.circle(h.gateX - 35, h.gateY - 48, 15, 0xffaa00, 0.3);
    glowL.setDepth(h.gateY + 5);

    const lampR = this.add.circle(h.gateX + 35, h.gateY - 48, 5, 0xffd700);
    lampR.setDepth(h.gateY + 6);
    const glowR = this.add.circle(h.gateX + 35, h.gateY - 48, 15, 0xffaa00, 0.3);
    glowR.setDepth(h.gateY + 5);

    // 4. Create Capacity sign boards on the arch
    const boardTxt = this.add.text(h.gateX, h.gateY - 40, `${h.name}\n0 / ${h.capacity}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#fff',
      align: 'center'
    }).setOrigin(0.5);
    boardTxt.setDepth(h.gateY + 7);

    this.capacityTexts[h.id] = boardTxt;
  }

  private drawEnclosureBowls(x: number, y: number): void {
    const bowl = this.add.graphics();
    bowl.setDepth(y - 1);
    
    // Food bowl (drawn with cozy brown details)
    bowl.fillStyle(0x8d6e63, 1); 
    bowl.fillEllipse(x, y, 14, 8);
    bowl.fillStyle(0xd7ccc8, 1); // food
    bowl.fillEllipse(x, y, 10, 5);
    
    // Water bowl (drawn with grey & blue details)
    bowl.fillStyle(0x78909c, 1); 
    bowl.fillEllipse(x + 20, y, 14, 8);
    bowl.fillStyle(0x29b6f6, 1); // water
    bowl.fillEllipse(x + 20, y, 10, 5);
  }

  private createPortalsPlaza(): void {
    // Clear old portal containers
    this.portals.forEach(p => p.container.destroy());
    this.portals = [];

    const state = SaveSystem.getState();

    const portalConfigs = [
      { areaId: 'explore_menu', x: 1050, y: 150, color: 0x9b59b6 }
    ];

    portalConfigs.forEach(cfg => {
      const container = this.add.container(cfg.x, cfg.y);
      container.setDepth(cfg.y + 10);

      const isUnlocked = cfg.areaId === 'explore_menu' || state.unlockedAreas.includes(cfg.areaId as any);
      const glowColor = isUnlocked ? cfg.color : 0x3e2723;

      // A. Drawing Portal Core with concentric rings & glow
      const core = this.add.graphics();
      if (isUnlocked) {
        // 1. Ground Marking ring
        core.lineStyle(1.5, 0xffffff, 0.5);
        core.strokeEllipse(0, 0, 42, 18);

        // 2. Soft glow base
        core.fillStyle(glowColor, 0.22);
        core.fillEllipse(0, 0, 48, 20);

        // 3. Central animated portal core
        core.fillStyle(glowColor, 0.55);
        core.fillEllipse(0, 0, 36, 16);
        core.lineStyle(1.5, 0xffffff, 0.75);
        core.strokeEllipse(0, 0, 36, 16);
        
        // Pulser tween
        this.tweens.add({
          targets: core,
          alpha: 0.25,
          scale: 1.15,
          duration: 1200 + Math.random() * 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else {
        // Locked portal
        core.fillStyle(0x3e2723, 0.7);
        core.fillEllipse(0, 0, 30, 14);
        core.lineStyle(1, 0x7f8c8d, 0.5);
        core.strokeEllipse(0, 0, 30, 14);
      }
      container.add(core);

      // Spawn portal particles (floating leaves & sparkles)
      this.time.addEvent({
        delay: 300,
        loop: true,
        callback: () => {
          if (!this.sys.isActive() || !container.active) return;
          
          const px = cfg.x + (Math.random() * 24 - 12);
          const py = cfg.y + (Math.random() * 10 - 5);
          const p = this.add.graphics();
          p.setDepth(cfg.y + 5);
          
          const isLeaf = Math.random() > 0.5;
          if (isLeaf) {
            const leafColor = isUnlocked ? cfg.color : 0x7f8c8d;
            p.fillStyle(leafColor, 0.7);
            p.fillRect(-2, -2, 4, 3);
          } else {
            const sparkleColor = isUnlocked ? 0xfff200 : 0xd2d2d2;
            p.fillStyle(sparkleColor, 0.9);
            p.fillCircle(0, 0, 1.5);
          }
          p.setPosition(px, py);
          
          this.tweens.add({
            targets: p,
            y: py - (20 + Math.random() * 25),
            x: px + (Math.random() * 16 - 8),
            alpha: 0,
            scale: 1.5,
            angle: Math.random() * 180,
            duration: 1200 + Math.random() * 800,
            onComplete: () => {
              p.destroy();
            }
          });
        }
      });

      // B. Floating destination sign
      const areaData = this.cache.json.get('areas_data').areas.find((a: any) => a.id === cfg.areaId);
      const nameText = cfg.areaId === 'explore_menu' ? 'Explore Maps' : (areaData ? areaData.name : cfg.areaId.replace('_', ' '));

      const signFrame = this.add.nineslice(0, -32, 'button', 0, 100, 24, 18, 18, 12, 12).setScale(0.85);
      container.add(signFrame);

      let displayText = nameText;
      let displayColor = '#5c4832';
      if (!isUnlocked) {
        displayText = `🔒 ${nameText}`;
        displayColor = '#7f8c8d';
      }

      const signTxt = this.add.text(0, -33, displayText, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '7.5px',
        fontStyle: 'bold',
        color: displayColor
      }).setOrigin(0.5);
      container.add(signTxt);

      // Float sign board
      this.tweens.add({
        targets: [signFrame, signTxt],
        y: '=-3',
        duration: 1500 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.portals.push({ areaId: cfg.areaId, x: cfg.x, y: cfg.y, container });
    });
  }

  private refreshSanctuary(): void {
    // 1. Destroy old sanctuary creatures
    this.creaturesGroup.clear(true, true);

    const state = SaveSystem.getState();

    // 2. Spawn resident creatures inside their enclosure zones
    state.ownedCreatures.forEach(oc => {
      const habId = this.getCreatureHabitat(oc.creatureId);
      const h = this.habitats.find(hab => hab.id === habId);

      if (h) {
        // Spawn at random coordinates inside enclosure
        const rx = h.x1 + 35 + Math.random() * (h.x2 - h.x1 - 70);
        const ry = h.y1 + 35 + Math.random() * (h.y2 - h.y1 - 70);

        const bounds = { minX: h.x1 + 16, maxX: h.x2 - 16, minY: h.y1 + 16, maxY: h.y2 - 16 };

        const creature = new SanctuaryCreature(this, rx, ry, oc, (c) => {
          // Open details overlay
          const uiScene = this.scene.get('UIScene') as any;
          if (uiScene && uiScene.togglePanel && uiScene.detailPanel) {
            uiScene.togglePanel(uiScene.detailPanel);
            uiScene.detailPanel.show(c.ownedData);
          }
        }, bounds);

        creature.setDepth(ry);
        this.add.existing(creature);
        this.creaturesGroup.add(creature);
      }
    });

    // 3. Re-calculate capacity limits texts
    this.updateCapacityTexts();
  }

  private updateCapacityTexts(): void {
    const state = SaveSystem.getState();
    this.habitats.forEach(h => {
      const count = state.ownedCreatures.filter(oc => this.getCreatureHabitat(oc.creatureId) === h.id).length;
      const txt = this.capacityTexts[h.id];
      if (txt) {
        txt.setText(`${h.name}\n${count} / ${h.capacity}`);
      }
    });
  }

  private getCreatureHabitat(_creatureId: string): string {
    return 'sanctuary';
  }

  private createGroundTexture(): void {
    const key = 'sanctuary_ground_texture';
    if (this.textures.exists(key)) return;

    const canvasTexture = this.textures.createCanvas(key, 64, 64);
    if (!canvasTexture) return;
    const ctx = canvasTexture.context;
    if (!ctx) return;

    // Grass color theme
    const primaryColor = '#8FD14F';
    const secondaryColor = '#7ec23e';
    const patternColor = '#C6F28C';

    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, 64, 64);

    const tileset = this.textures.get('field_tiles');
    if (tileset && tileset.key) {
      const img = tileset.getSourceImage() as HTMLImageElement;
      ctx.globalAlpha = 0.45;
      ctx.globalCompositeOperation = 'source-over';

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
    }

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

  private createAmbientDecorations(mapW: number, mapH: number): void {
    // 1. Spawning glowing fireflies in the Forest Pen
    for (let i = 0; i < 8; i++) {
      const f = this.add.graphics();
      f.fillStyle(0xfff200, 0.85);
      f.fillCircle(0, 0, 2);
      f.setDepth(480); // Depth sorted with forest
      
      const rx = 100 + Math.random() * 250;
      const ry = 400 + Math.random() * 140;
      f.setPosition(rx, ry);

      this.tweens.add({
        targets: f,
        y: ry - 40,
        x: rx + (Math.random() * 30 - 15),
        alpha: 0,
        duration: 3000 + Math.random() * 1500,
        loop: -1,
        yoyo: false,
        onLoop: () => {
          f.setPosition(100 + Math.random() * 250, 400 + Math.random() * 140);
          f.setAlpha(0.85);
        }
      });
      this.ambientParticles.push(f);
    }

    // 2. Spawning fluttering butterflies in the Meadow Pen
    const colors = [0xff7675, 0xfdcb6e, 0x0984e3, 0xe056fd];
    for (let i = 0; i < 6; i++) {
      const color = Phaser.Utils.Array.GetRandom(colors);
      const b = this.add.graphics();
      b.fillStyle(color, 0.95);
      b.fillCircle(0, 0, 2.5);
      b.setDepth(200);

      const rx = 100 + Math.random() * 250;
      const ry = 100 + Math.random() * 120;
      b.setPosition(rx, ry);

      this.tweens.add({
        targets: b,
        x: rx + 25,
        y: ry - 15,
        scaleX: 0.45,
        duration: 300 + Math.random() * 200,
        yoyo: true,
        repeat: -1
      });
      this.tweens.add({
        targets: b,
        x: { from: rx - 20, to: rx + 30 },
        y: { from: ry - 20, to: ry + 20 },
        duration: 4000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1
      });
      this.ambientParticles.push(b);
    }

    // 3. Falling leaves blowing in wind
    for (let i = 0; i < 15; i++) {
      const leaf = this.add.graphics();
      const color = Math.random() > 0.5 ? 0x8ecb53 : 0xff9f43;
      leaf.fillStyle(color, 0.7);
      leaf.fillRect(-3, -3, 6, 4);
      leaf.setDepth(150);

      const rx = Math.random() * mapW;
      const ry = -50 - Math.random() * 150;
      leaf.setPosition(rx, ry);

      this.tweens.add({
        targets: leaf,
        y: mapH + 50,
        x: rx + (Math.random() * 180 - 90),
        angle: 360,
        duration: 9000 + Math.random() * 4000,
        loop: -1,
        onLoop: () => {
          leaf.setPosition(Math.random() * mapW, -50);
        }
      });
      this.ambientParticles.push(leaf);
    }
  }

  private createRewardFloatingText(x: number, y: number, text: string, color = '#ffffff'): void {
    const container = this.add.container(x, y);
    container.setDepth(200);

    const txt = this.add.text(0, 0, text, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color,
      stroke: '#2c1e15',
      strokeThickness: 3.5,
      align: 'center'
    }).setOrigin(0.5);
    container.add(txt);

    this.tweens.add({
      targets: container,
      y: y - 45,
      alpha: 0,
      duration: 2500,
      ease: 'Quad.easeOut',
      onComplete: () => container.destroy()
    });
  }

  private createPortalPromptUI(_width: number, _height: number): void {
    const container = this.add.container(0, 0);
    container.setDepth(300);
    container.setVisible(false);

    const frame = this.add.nineslice(0, 0, 'panel_frame', 0, 130, 32, 20, 20, 20, 20);
    frame.setTint(0xfff5e6);
    frame.setInteractive({ useHandCursor: true });
    container.add(frame);

    const txt = this.add.text(0, 0, '', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '8.5px',
      fontStyle: 'bold',
      color: '#5c4832',
      align: 'center'
    }).setOrigin(0.5);
    container.add(txt);

    frame.on('pointerdown', () => {
      if (container.visible && this.nearestPortal) {
        this.triggerPortalInteraction(this.nearestPortal.areaId);
      }
    });

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-E', () => {
        if (container.visible && this.nearestPortal) {
          this.triggerPortalInteraction(this.nearestPortal.areaId);
        }
      });
    }

    this.activePortalPrompt = { txt, btn: container };
  }

  private showPortalPrompt(portal: any): void {
    if (!this.activePortalPrompt) return;

    let promptText = '';
    
    if (portal.areaId === 'explore_menu') {
      promptText = '[E] Open World Map';
    } else {
      const state = SaveSystem.getState();
      const areaData = this.cache.json.get('areas_data').areas.find((a: any) => a.id === portal.areaId);
      if (!areaData) return;

      const isUnlocked = state.unlockedAreas.includes(portal.areaId);
      
      const displayName = areaData.name
        .replace(' Biome', '')
        .replace(' Area', '')
        .replace('Whisper ', '')
        .replace('Crystal ', '')
        .replace('Golden ', '')
        .replace('Green ', '');

      if (isUnlocked) {
        promptText = `[E] Travel to ${displayName}`;
      } else {
        promptText = `[E] Unlock ${displayName}\nLvl ${areaData.unlockLevel} | 🪙${areaData.unlockCost}`;
      }
    }

    this.activePortalPrompt.txt.setText(promptText);
    this.activePortalPrompt.btn.setPosition(portal.x, portal.y - 50);
    this.activePortalPrompt.btn.setVisible(true);
  }

  private hidePortalPrompt(): void {
    if (this.activePortalPrompt) {
      this.activePortalPrompt.btn.setVisible(false);
    }
  }

  private createSanctuaryVillage(): void {
    // Campfire at center focal point
    const campfire = this.add.sprite(600, 450, 'campfire_fire', 0);
    campfire.setScale(1.2);
    campfire.setDepth(450);
    if (this.anims.exists('campfire_burn')) {
      campfire.play('campfire_burn');
    }

    // Glow effect behind campfire
    const glow = this.add.graphics();
    glow.fillStyle(0xff6600, 0.15);
    glow.fillCircle(600, 460, 60);
    glow.setDepth(449);
    this.tweens.add({
      targets: glow,
      alpha: 0.05,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add logs around campfire
    const log1 = this.add.image(560, 460, 'log_2');
    log1.setDepth(460);
    const log2 = this.add.image(640, 460, 'log_2');
    log2.setDepth(460);
    log2.setFlipX(true);
  }

  private createOrganicDensity(): void {
    // Add natural trees, grass, flowers randomly inside the sanctuary
    const decorations = [
      { key: 'tree_1', count: 15 },
      { key: 'tree_2', count: 15 },
      { key: 'bush_1', count: 10 },
      { key: 'bush_2', count: 10 },
      { key: 'flower_1', count: 20 },
      { key: 'flower_2', count: 20 }
    ];
    
    decorations.forEach(dec => {
      if (!this.textures.exists(dec.key)) return;
      for (let i = 0; i < dec.count; i++) {
        const x = Phaser.Math.Between(80, 1120);
        const y = Phaser.Math.Between(80, 820);
        
        // Don't place near campfire
        if (Phaser.Math.Distance.Between(x, y, 600, 450) < 120) continue;
        
        const img = this.add.image(x, y, dec.key);
        img.setOrigin(0.5, 1);
        img.setDepth(y); // dynamic depth based on Y
      }
    });
  }

  private createEnrichedDecorations(): void {
    // Empty per instructions
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
