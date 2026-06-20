# About Wild Haven

A cozy medieval-themed creature-collection sanctuary game — explore five biomes, capture unique creatures with ropes, and build a thriving sanctuary that generates passive income. Built with Phaser 3 + TypeScript.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Game Flow](#game-flow)
3. [Tutorial (FTUE)](#tutorial-ftue)
4. [Scenes](#scenes)
5. [Art Assets & Theme](#art-assets--theme)
6. [Areas (Biomes)](#areas-biomes)
7. [Creatures](#creatures)
8. [Ropes & Capture System](#ropes--capture-system)
9. [Breeding System](#breeding-system)
10. [Economy & Sanctuary](#economy--sanctuary)
11. [Progression (Levels & XP)](#progression-levels--xp)
12. [Achievements](#achievements)
13. [Quests (Story)](#quests-story)
14. [UI Panels & Controls](#ui-panels--controls)
15. [Systems Overview](#systems-overview)
16. [Saving & Persistence](#saving--persistence)
17. [Technical Stack](#technical-stack)

---

## Quick Start

```bash
npm install
npm run dev    # start dev server on localhost
npm run build  # production build to dist/
```

The game runs entirely in the browser — no backend required. All state is saved to LocalStorage.

---

## Game Flow

The core loop:

```
Main Menu → Sanctuary → Portal to Area → Explore → Spot Creature
  → Capture (timing minigame) → Lead creature home → Place in Pen
    → Creature generates coins passively → Buy better ropes/unlock areas
      → Explore harder biomes for rarer creatures → Repeat
```

**Player's Goal:** Unlock all 5 areas, fill the Collection Book (37 creatures), capture the Mythics (Phoenix, Moonlight Unicorn, Elder Dragon), and become the Ultimate Keeper.

---

## Tutorial (FTUE)

On first launch, a 7-step guided tutorial walks the player through the entire loop:

| Step | Prompt | Objective |
|------|--------|-----------|
| 0 | **"Welcome to Wild Haven! Move using WASD or Arrow keys, or tap to move on mobile."** | Move the player character 75px from spawn in Sanctuary |
| 1 | **"Great! Head to the glowing portal to explore the Green Meadow."** | Enter the ExploreScene portal in Sanctuary |
| 2 | **"A wild Meadow Rabbit is nearby! Walk up to it and click/tap to capture it."** | Capture the meadow_rabbit (spawned near player) |
| 3 | **"You caught it! Now lead it back to the Sanctuary portal to bring it home."** | Return to Sanctuary with tethered creature |
| 4 | **"Walk up to the Meadow pen gates to deliver the creature."** | Release creature at pen (tetheredCreature becomes null) |
| 5 | **"Nice! Creatures in pens earn coins over time. Use the Shop to buy a Strong Rope!"** | (manual click to advance) |
| 6 | **"Open the Shop from the bottom dock to buy better gear."** | Open Shop panel |

Tutorial steps are checked each frame via `UIScene.update()`. An arrow pointer highlights the next target (portal, creature, pen gate). Tutorial dialogue is triggered via `DialogueManager` with Dr. Evelyn's portrait.

To skip/complete the tutorial, set `tutorialStep = -1` in save state.

---

## Scenes

### BootScene
- Minimal scene; immediately transitions to PreloadScene.

### PreloadScene
- Loads ALL game assets (spritesheets, backgrounds, UI, audio).
- Background: `loading_bg` with a dark overlay.
- Animated animals (hare, fox, deer, boar) walk across the bottom of the screen during loading.
- Displays a progress bar + "Loading..." text.
- On completion → transitions to MainMenuScene.

### MainMenuScene
- Background: `homepage_bg`.
- Animated clouds drift horizontally in a continuous looping parallax across the sky.
- Title "WILD HAVEN" with subtitle.
- **New Game** / **Continue** buttons.
- BGM: `music_menu`.

### SanctuaryScene
- The home base hub. 1405 lines — the largest scene.
- Player character (`char_spritesheet`) spawns and can move with WASD/arrows or touch.
- **Habitats/Pens:** 5 biome-themed enclosures (Meadow, Forest, Mountain, Desert, Sky). Each has a gate for releasing tethered creatures.
- **Portal:** Takes player to the currently selected biome's ExploreScene.
- **Decorations:** Medieval buildings, trees, flowers, stones, bushes, fences, logs, grass, campfire, flags — all from `medieval-city-assets` and `medieval-field-assets`.
- **Flags:** 2 animated flags from `medieval-field-assets/3 Animated Objects/1 Flag/` cycle through 5 frames via a repeating timer.
- Sanctuary NPC (Merchant/Old Man) stands in the scene.
- Tethered creatures follow the player with leash-like behavior.
- **BGM:** `music_sanctuary` (or `music_sanctuary_sky` after Sky Island is unlocked).

### ExploreScene
- Procedural area exploration, parameterized per biome.
- Player moves through a large tilemap-based area.
- Wild creatures spawn at designated points on timers.
- Each area spawns creatures appropriate to its biome roster.
- Interaction key/click on a wild creature triggers the capture minigame.
- Portal back to Sanctuary is always accessible.
- BGM: area-specific (`music_meadow`, `music_forest`, etc.).

### TravelScene
- Transition screen when traveling between Sanctuary ↔ Explore.
- Background: `loading_bg`.
- **Spinner:** Tiny `xp_star` sprite (scale 0.2) rotates in the center.
- **Progress bar:** Shows travel progress (simulated 3-second delay).
- **Tips:** Random travel tips displayed below the spinner.
- On complete → launches target scene (ExploreScene or SanctuaryScene).

### UIScene
- Persistent overlay scene that runs parallel to Sanctuary/Explore.
- Manages all UI panels, HUD, tutorial UI, and dialogue.
- Uses `EventBus` for cross-scene communication.
- Contains the active panel tracker (`activePanel`) to ensure only one overlay is visible at a time.

---

## Art Assets & Theme

The game uses a **medieval fantasy** aesthetic. **All** decorations are sourced exclusively from:

### Asset Packs
| Pack | Path | Contents |
|------|------|----------|
| **Medieval City Assets** | `public/assets/medieval-city-assets/` | Buildings, city decor items |
| **Medieval Field Assets** | `public/assets/medieval-field-assets/` | Tiles, trees, stones, flowers, bushes, fences, logs, grass, campfire, animated flag |

### Core Image Assets
| Key | Path | Purpose |
|-----|------|---------|
| `homepage_bg` | `public/assets/homepage_bg.png` | Main menu background |
| `loading_bg` | `public/assets/loading_bg.png` | Preload + Travel scene background |
| `panel_frame` | `public/assets/panel_frame.png` | Nine-slice panel background for all UI panels |
| `button_small` | ... | Small button (used in dialogue, panel close) |
| `button_small_hover` | ... | Small button hover state |
| `button_small_click` | ... | Small button click state |
| `char_spritesheet` | ... | Player character animation spritesheet |
| `luna_information` | ... | Luna NPC portrait for dialogue |
| `xp_star` | ... | XP star icon, also used as travel spinner |

### Creature Sprites
All 37 creatures use `animal_*_idle` spritesheets (e.g. `animal_rabbit_idle`, `animal_fox_idle`, etc.). These are animated sprites with `isAnimated` flag and `animalType` for frame config.

Previous `char_creature_*` texture keys (from char.png spritesheet extraction) have been abandoned — all creatures now reference their dedicated `animal_*` spritesheets.

### Decor Objects (Sanctuary)
Specific items placed in SanctuaryScene:
- Buildings: `medieval-city-assets/4 Buildings/`
- Trees: `medieval-field-assets/2 Environment/2 Trees/`
- Stones: various path/stone tiles
- Flowers/bushes: field environment props
- Fences/logs: wooden barrier objects
- Grass tiles: ground cover
- Campfire: `medieval-field-assets/3 Animated Objects/2 Campfire/`
- Flags: `medieval-field-assets/3 Animated Objects/1 Flag/` (5 frames cycled via timer)

---

## Areas (Biomes)

5 areas, unlocked sequentially by player level + coin cost:

| # | Area | Unlock Level | Unlock Cost | Theme | Palette |
|---|------|-------------|-------------|-------|---------|
| 1 | **Green Meadow** | 1 | Free | Sunny rolling hills, wildflowers | `#8FD14F, #C6F28C, #FFF7E6, #7EC8E3` |
| 2 | **Whisper Forest** | 5 | 1,500 coins | Shaded canopy, fireflies | `#3F7D4D, #2A5C38, #A8D8B9, #FFE9A8` |
| 3 | **Crystal Mountain** | 10 | 6,000 coins | Snowy peaks, glowing crystals | `#A0E7E5, #6FC7C3, #D6C8FF, #FFFFFF` |
| 4 | **Golden Dunes** | 18 | 20,000 coins | Warm dunes, oases, golden hour | `#F2C879, #E8A23D, #FFE0B2, #FF9F45` |
| 5 | **Sky Island** | 28 | 75,000 coins | Floating islands above clouds | `#FFD9A0, #FFFFFF, #B89CFF, #FF5C8A` |

Each area has: unique creature roster (6-8 creatures), music track, ambience SFX, and color palette.

---

## Creatures

**37 creatures** across 5 rarities, grouped by area:

### Green Meadow (6)
| Creature | Rarity | Difficulty | Coin Rate |
|----------|--------|-----------|-----------|
| Meadow Rabbit | Common | 10 | 1/10s |
| Field Sparrow | Common | 12 | 1/10s |
| Spotted Fawn | Rare | 28 | 3/10s |
| Honey Badger | Rare | 32 | 3/10s |
| Clover Stag | Epic | 50 | 8/10s |
| Golden Hare | Legendary | 68 | 18/10s |

### Whisper Forest (6)
| Creature | Rarity | Difficulty | Coin Rate |
|----------|--------|-----------|-----------|
| Forest Squirrel | Common | 14 | 1/10s |
| Mossy Toad | Common | 15 | 2/10s |
| Silver Fox | Rare | 34 | 4/10s |
| Luminous Moth | Rare | 30 | 4/10s |
| Shadow Lynx | Epic | 54 | 9/10s |
| Elder Owl | Legendary | 70 | 20/10s |

### Crystal Mountain (6)
| Creature | Rarity | Difficulty | Coin Rate |
|----------|--------|-----------|-----------|
| Pebble Goat | Common | 18 | 2/10s |
| Frost Hare | Common | 20 | 2/10s |
| Crystal Turtle | Rare | 38 | 5/10s |
| Snow Fox | Rare | 36 | 5/10s |
| Geode Golem | Epic | 58 | 11/10s |
| Aurora Wolf | Legendary | 74 | 22/10s |

### Golden Dunes (6)
| Creature | Rarity | Difficulty | Coin Rate |
|----------|--------|-----------|-----------|
| Dune Beetle | Common | 16 | 2/10s |
| Desert Lizard | Common | 17 | 2/10s |
| Sun Falcon | Rare | 40 | 6/10s |
| Cactus Camel | Rare | 37 | 6/10s |
| Mirage Jackal | Epic | 62 | 13/10s |
| Desert Spirit | Legendary | 78 | 25/10s |

### Sky Island (8)
| Creature | Rarity | Difficulty | Coin Rate |
|----------|--------|-----------|-----------|
| Cloud Sprite | Common | 22 | 2/10s |
| Sky Mouse | Common | 24 | 2/10s |
| Wind Serpent | Rare | 44 | 7/10s |
| Star Rabbit | Rare | 42 | 7/10s |
| Thunder Drake | Epic | 66 | 15/10s |
| Celestial Stag | Legendary | 80 | 28/10s |
| Phoenix | Mythic | 90 | 45/10s |
| Moonlight Unicorn | Mythic | 95 | 50/10s |

### Special Breeding Creatures (5, any area)
| Creature | Rarity | Difficulty | Coin Rate |
|----------|--------|-----------|-----------|
| Mythical Jackalope | Rare | 40 | 6/10s |
| Cerberus Hound | Legendary | 80 | 26/10s |
| Pegasus | Legendary | 82 | 32/10s |
| Tyrannosaurus Rex | Legendary | 85 | 30/10s |
| Elder Dragon | Mythic | 96 | 55/10s |

### Creature Visuals
Mapped in `CreatureVisuals.ts`:
- Each creature has: sprite key (`animal_*_idle`), tint, scale, animation config (`isAnimated`, `animalType`, `frameWidth`, `frameHeight`, `idleFrames`, `walkFrames`).
- All 32 base creatures are animated. Breeding-only creatures also use dedicated sprites.
- Visual config centralized for easy adjustment.

---

## Ropes & Capture System

### Rope Tiers
| Rope | Tier | Capture Power | Cost | Requirements |
|------|------|--------------|------|-------------|
| Basic Rope | 1 | 20 | Free (starter) | — |
| Strong Rope | 2 | 45 | 1,200 coins | — |
| Magic Rope | 3 | 75 | 12,000 coins + 50 gems | — |
| Divine Rope | 4 | 100 | 60,000 coins + 250 gems | "Master Collector" achievement |

### Capture Formula
```
successChance% = clamp(
  50 (base)
  + (rope.capturePower - creature.captureDifficulty)
  + timingBonus           // Perfect: +20, Good: +10, Miss: +0
  + baitItemBonus         // optional: +5
  + sanctuaryPerkBonus,   // from upgrades
  minChance=5, maxChance=95
)
```

- **Never 0% or 100%** — always a sliver of luck and agency.
- Timing bar minigame: marker sweeps left-right; success zone width based on `(ropePower - difficulty)`. Higher rarities = faster sweep speed.
- **Whips** can weaken creatures: each whip hit reduces effective difficulty by `whipWeakeningPower`, but makes the minigame faster (speed ×0.82 per hit, min 0.35×).
- On success: creature tethered to player, must be led to Sanctuary pen.
- On failure: creature flees, no penalty, can retry later.
- XP/coins awarded scaled by rarity: Common 20/10 → Mythic 600/500.

---

## Breeding System

5 breeding recipes, accessible from the BreedingPanel:

| Recipe | Parent A | Parent B | Offspring | Rate | Cost |
|--------|---------|---------|-----------|------|------|
| Jackalope | Meadow Rabbit + Silver Fox | Mythical Jackalope | 75% | 350 coins |
| Pegasus | Sky Mouse + Spotted Fawn | Pegasus | 60% | 1,200 coins |
| T-Rex | Desert Lizard + Geode Golem | Tyrannosaurus Rex | 45% | 5,000 coins |
| Cerberus | Silver Fox + Aurora Wolf | Cerberus Hound | 50% | 4,000 coins |
| Dragon | Thunder Drake + Phoenix | Elder Dragon | 30% | 15,000 coins |

Breeding is defined in `public/assets/data/breeding_recipes.json`.

---

## Economy & Sanctuary

### Currencies
- **Coins:** Primary soft currency. Earned from:
  - Passive income from sanctuary pens (every 10 seconds)
  - Capture rewards (scaled by rarity)
  - Achievements
  - Daily rewards
  - Level-up bonuses
- **Gems:** Premium currency. Earned from:
  - Achievements
  - Level-ups (5 per level)
  - Daily streak day 7

### Sanctuary
- **Capacity:** Scales with sanctuary level (6 → 9 → 12 → 16 → 20 slots).
- **Upgrade costs:** 1,000 → 5,000 → 18,000 → 50,000 coins.
- **Passive income formula:** `sum of (creature.coinRate × (1 + (level - 1) × 0.08)) / 10` coins/sec per placed creature.
- **Creature leveling:** Upgrade creatures (max level 10) to increase coin rate by 8% per level. Cost scales by rarity and current level.
- **Offline earnings:** Capped at 8h base (12h at level 2, 16h at level 3, 24h at level 4+). Calculated on load via `EconomySystem.processOfflineEarnings()`. Presented as "Welcome back!" summary modal.

### Sanctuary Upgrades (coin sinks)
1. Enclosure expansion (increases capacity)
2. Decor slots (cosmetic placements)
3. Creature leveling (increases coin rate)
4. Capture perks (small passive capture bonuses)

---

## Progression (Levels & XP)

- **XP curve:** `xpToNextLevel = floor(100 × level^1.45)`
- **XP sources:** Captures (scaled by rarity + timing grade), achievements.
- **Level-up rewards:** 50 coins × new level, 5 gems.
- Level gates area unlocks, better rope access, and higher-rarity creature encounters.

---

## Achievements

19 achievements across 6 categories:

| Category | Achievements | Max Reward |
|----------|-------------|------------|
| **Captures** | First Friend, Budding Collector, Dedicated Ranger | 2,500 coins + 400 XP |
| **Rarity Milestones** | Something Special (Rare), Cut Above (Epic), Living Legend (Legendary), Myth Made Real (Mythic) | 20,000 coins + 2,000 XP + title |
| **Area Collection** | Meadow Master, Forest Whisperer, Peak Conqueror, Dune Wanderer, Sky Keeper | 30,000 coins + 3,000 XP + title |
| **Master Collection** | Master Collector (all 32 creatures) | 100,000 coins + 10,000 XP + unlocks Divine Rope |
| **Sanctuary** | Growing Sanctuary (Level 10) | 4,000 coins + 500 XP |
| **Economy** | Coin Hoarder (1M lifetime coins) | 100 gems + 1,500 XP |
| **Login Streak** | Weekly Visitor (7 days), Sanctuary Devotee (30 days) | 15,000 coins + 100 gems + title |

All achievements are data-driven from `public/assets/data/achievements.json`.

### Daily Rewards
- 7-day cycle: Day 1-6 = day × 100 coins; Day 7 = 1,000 coins + 10 gems.
- Streak resets after 48+ hours of absence; 18h window for same-day claim.
- Checked on load via `AchievementSystem.checkDailyStreak()`.

---

## Quests (Story)

5 main quests, each corresponding to an area, telling the story of Dr. Evelyn's research expedition:

| Quest | Biome | Objectives | Unlocks |
|-------|-------|-----------|---------|
| Meadow Explorer | Green Meadow | Catch 3 Meadow Rabbits + Earn 500 coins | Whisper Forest |
| Forest Guardian | Whisper Forest | Catch 1 Silver Fox + Reach Level 3 | Crystal Mountain |
| Mountain Climber | Crystal Mountain | Catch 1 Crystal Turtle + Earn 2,500 coins | Golden Dunes |
| Desert Excavator | Golden Dunes | Catch 1 Dune Beetle + Reach Level 5 | Sky Island |
| Sky Savior | Sky Island | Catch 1 Phoenix + Reach Level 8 | Endgame |

Quests are managed by `QuestManager` with dialogue-driven progression. Each quest has intro/incomplete/complete dialogue sequences featuring **Dr. Evelyn** (left portrait) and the **Keeper** (right portrait). Quest progress is checked dynamically against save state on each query.

---

## UI Panels & Controls

All panels open as overlay modals on top of the game world via `UIScene`. Each panel has a compact **✕** close button (20px text, replaced the original 701×701px `button_close` image).

### HUD
- **Top-left:** Coins (💰), Gems (💎), Player Level + XP bar.
- **Top-right:** Area name, Settings gear icon.
- **Bottom dock:** Sanctuary, Explore, Inventory, Collection Book, Shop, Achievements, Breeding icons.
- **Quest tracker:** Active quest title + objectives with progress bars.

### SettingsPanel
- Music/SFX volume sliders, Mute toggle.
- Reduce Motion toggle.
- Export/Import save code (base64).
- Reset Save button.
- Credits.

### ShopPanel
- Tabs: Ropes, Sanctuary Upgrades, Decor.
- Items show cost, owned/locked/available state, unlock requirements.

### InventoryPanel
- Grid of owned creatures not yet placed in sanctuary.
- Tap to view details or drag to sanctuary slot.

### CollectionBookPanel
- Tabbed by area. Grid of creature slots.
- States: silhouette (undiscovered) → name revealed (discovered) → full art + lore (captured).
- Shows completion percentage per area and overall.

### CreatureDetailPanel
- Large creature art, name, rarity badge, lore description.
- Stats: capture difficulty, current coin production.
- If owned: Feed/Train button for leveling, nickname field, slot placement.

### AchievementPanel
- List of achievements with progress bars.
- Completed-but-unclaimed achievements show a claim button.

### BreedingPanel
- Shows 5 breeding recipes.
- Select 2 owned parents → attempt breeding.
- Shows success rate, coin cost, offspring preview.

### DialoguePanel
- RPG-style text box with speaker portrait (Dr. Evelyn, Luna).
- Typewriter text effect (25ms/char).
- Continue/Skip buttons + blinking next indicator.
- Supports portrait side (left/right), animated Luna portrait with bobbing + blinking.
- Keyboard: SPACE/ENTER to advance.

### Controls
| Action | Keyboard | Touch |
|--------|----------|-------|
| Move player | WASD / Arrow keys | Tap-to-move |
| Interact / capture | E / Space / Click | Tap creature or button |
| Minigame timing | Space / Enter / Click | Tap anywhere |
| Open panels | Bottom dock icons | Bottom dock icons |
| Dialogue advance | Space / Enter | Click / tap |
| Settings / Pause | Esc | Gear icon |

---

## Systems Overview

All gameplay logic is in standalone systems under `src/systems/`:

| System | File | Responsibility |
|--------|------|---------------|
| **CaptureSystem** | `CaptureSystem.ts` | Capture chance formula, roll resolution, minigame zone calculation, XP/coin rewards |
| **EconomySystem** | `EconomySystem.ts` | Passive income, offline earnings, sanctuary upgrades, creature leveling, slot management |
| **ProgressionSystem** | `ProgressionSystem.ts` | XP/level calculation, area unlock logic, rope purchase/equip |
| **AchievementSystem** | `AchievementSystem.ts` | Metric tracking, achievement checks/rewards, daily streak management, collection metrics |
| **QuestManager** | `QuestManager.ts` | Quest definitions, progress tracking, turn-in/biome unlock, dialogue sequences |
| **DialogueManager** | `DialogueManager.ts` | Dialogue step management, typewriter state, start/next/end flow with callbacks |
| **SaveSystem** | `SaveSystem.ts` | LocalStorage persistence, autosave (15s debounced), force-save, export/import, migration, reset |
| **AudioManager** | `AudioManager.ts` | Music/SFX playback, crossfade, volume control, mute |
| **EventBus** | `EventBus.ts` | Global event emitter for cross-system communication |

### Key Entities
| Entity | File | Responsibility |
|--------|------|---------------|
| **Player** | `src/entities/Player.ts` | Player movement, input handling |
| **WildCreature** | `src/entities/WildCreature.ts` | Spawned creatures in explore areas |
| **SanctuaryCreature** | `src/entities/SanctuaryCreature.ts` | Placed creatures generating income |

### Key Utilities
| Utility | File | Responsibility |
|---------|------|---------------|
| **CreatureVisuals** | `src/utils/CreatureVisuals.ts` | All creature sprite/tint/animation configs |
| **DataLoader** | `src/data/DataLoader.ts` | Loads + provides access to all JSON data files |
| **ResponsiveUtils** | `src/utils/ResponsiveUtils.ts` | Screen resize handling, layout recalculation |

---

## Saving & Persistence

- **Storage:** Browser LocalStorage under key `wildhaven_save_v1`.
- **Format:** JSON-serialized `PlayerState` (see `src/data/types.ts`).
- **Autosave:** 15-second debounced timer on dirty state; immediate save on capture/purchase/unlock/achievement.
- **On exit:** `beforeunload` + `visibilitychange` listeners trigger flush.
- **Offline earnings:** Calculated from `lastOnlineAt` timestamp with 8-24h cap based on sanctuary level.
- **Export/Import:** Base64-encoded save code in Settings panel.
- **Reset:** Full save wipe to default state.
- **Migration:** `SaveSystem.migrate()` handles forward-compatible save upgrades via version field.

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Engine | **Phaser 3** (latest 3.8x) with Arcade Physics |
| Language | **TypeScript** (strict mode) |
| Bundler | **Vite** (fast HMR, tree-shaking) |
| Persistence | LocalStorage (no backend required) |
| Platform | Browser (desktop + mobile, single HTML5 build) |
| Input | Touch + Keyboard/Mouse (fully interchangeable) |
| Orientation | Landscape-first, responsive portrait mode |
| Scene System | Boot → Preload → MainMenu → Sanctuary + Explore + Travel + UIScene (overlay) |
| Architecture | Systems-based, event-driven (`EventBus`), data-driven JSON content |

### Key Technical Decisions
- All scene communication via `EventBus` (Phaser EventEmitter) — no direct scene references.
- Content defined in JSON files (creatures, areas, ropes, achievements, breeding) — adding new content requires zero code changes.
- `PlayerState` is the single source of truth — all systems read/write through `SaveSystem`.
- Creature visuals centralized in `CreatureVisuals.ts` — sprite key, tint, scale, animation frames all in one config.
- All decorations limited to `medieval-city-assets` + `medieval-field-assets` for theme consistency.
- Close buttons replaced image-based with text `✕` (20px) to eliminate source-size dependency.
- Animals use dedicated `animal_*_idle` animated spritesheets (not extracted from char.png).
- Flags implemented as 5 individual frame images cycled via TimerEvent (not spritesheets).

---

*Wild Haven — built with Phaser 3 + TypeScript. A cozy creature-collection sanctuary game where every creature finds a home.*
