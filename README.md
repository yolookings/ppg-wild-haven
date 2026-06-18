# Wild Haven

**A cozy creature-collection sanctuary game — explore, capture, collect, and grow.**

This document is a complete game design and technical brief. It is written to be handed directly to an AI coding agent (e.g. Claude Code, Cursor, or similar) as the primary build specification for the project. It covers vision, art direction, world design, all gameplay systems, data models, UI/UX, audio, architecture, performance, and a phased build roadmap.

Bundled alongside this README are starter data files (`/data/*.json`) and placeholder pixel-art sprites (`/sprites/*`) that the agent should use to bootstrap the project before commissioning final art.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Design Pillars](#2-design-pillars)
3. [Art Direction & Mood](#3-art-direction--mood)
4. [Technical Stack & Architecture](#4-technical-stack--architecture)
5. [Responsive Design & Platform Targets](#5-responsive-design--platform-targets)
6. [Core Gameplay Loop](#6-core-gameplay-loop)
7. [World & Areas](#7-world--areas)
8. [Creature System](#8-creature-system)
9. [Capture System](#9-capture-system)
10. [Sanctuary & Economy System](#10-sanctuary--economy-system)
11. [Progression System](#11-progression-system)
12. [UI / UX Specification](#12-ui--ux-specification)
13. [Controls](#13-controls)
14. [Audio System](#14-audio-system)
15. [Save System](#15-save-system)
16. [Performance & Mobile Optimization](#16-performance--mobile-optimization)
17. [Asset Specifications](#17-asset-specifications)
18. [Project Folder Structure](#18-project-folder-structure)
19. [Bundled Starter Data & Assets](#19-bundled-starter-data--assets)
20. [Development Roadmap](#20-development-roadmap)
21. [Definition of Done](#21-definition-of-done)
22. [Future Expansion Ideas](#22-future-expansion-ideas)

---

## 1. Project Overview

| | |
|---|---|
| **Title** | Wild Haven |
| **Genre** | Creature Collection Simulator · Adventure · Idle Tycoon |
| **Engine** | Phaser 3 (latest stable 3.8x) |
| **Language** | TypeScript (strict mode) |
| **Build Tooling** | Vite (preferred) or Webpack 5 |
| **Platform** | Browser-based, single HTML5 build — desktop and mobile, no installs |
| **Input** | Touch (tap, drag, swipe) and keyboard/mouse, fully interchangeable |
| **Orientation** | Landscape-first design, with a fully functional responsive portrait mode |
| **Persistence** | LocalStorage, JSON-serialized save with versioning and migration |
| **Monetization** | None required for v1 — architecture should not block adding cosmetic IAP later (see §22) |

**Elevator pitch:** The player is a new Keeper arriving at Wild Haven, a once-abandoned sanctuary. By exploring five distinct biomes, gently capturing creatures with rope tools of increasing power, and bringing them home, the player builds a thriving sanctuary that earns coins passively. Coins fund better ropes and a bigger sanctuary, which unlock access to rarer biomes and rarer creatures — a satisfying, low-stress loop that rewards both short sessions and long-term idle growth.

---

## 2. Design Pillars

1. **Cozy over competitive.** No fail states that punish harshly, no PvP, no aggressive monetization pressure. Failing a capture just means "try again," never "lose something."
2. **Always making progress.** Idle income keeps accumulating even while offline, so players never feel they "wasted" time away from the game.
3. **Collection as the core fantasy.** The Collection Book (a Pokédex-style log) is the spine of long-term retention — every creature, captured or not, has a name, art, and lore line visible to the player.
4. **Idle respects the player's time.** Progress should never feel mandatory to "babysit" — offline earnings, generous (not punishing) caps, and no decay mechanics that erode what's already been built.
5. **Read in five seconds.** Every UI screen should be understandable to a new player within five seconds, with deeper systems (formulas, optimization) available but never forced.
6. **One-handed mobile friendly.** All core actions (explore, capture, collect coins, navigate menus) must be comfortably reachable with a thumb on a phone held in one hand.

---

## 3. Art Direction & Mood

**Style:** stylized low-poly-adjacent / pixel-art hybrid — flat shading, clean dark outlines, soft rounded silhouettes, bright but never neon-harsh colors. Nothing photorealistic, nothing gritty; every creature and environment should look safe to approach and pleasant to look at, suitable for all ages.

**References to blend, not copy:**
- *Animal Crossing* — warm, welcoming UI, soft rounded typography feel, cozy home-base fantasy for the Sanctuary.
- *Slime Rancher* — bouncy, squash-and-stretch creature movement, bright open exploration spaces.
- *Stardew Valley* — charming small-grid pixel art density, satisfying upgrade-driven progression.
- *Pokémon* — the core collection/Collection-Book fantasy, rarity-driven excitement on each new find.

**Mood per area** (full palettes in `data/areas.json` and `palette_reference.png`):
- **Green Meadow** — bright spring greens, soft sky blue, cheerful and unintimidating.
- **Whisper Forest** — deep cool greens with warm firefly-gold accents, calm and a little mysterious, never scary.
- **Crystal Mountain** — icy teals and soft lavender crystal tones, crisp and clean.
- **Golden Dunes** — warm sand and amber tones with a golden-hour glow, inviting rather than harsh/arid.
- **Sky Island** — pastel peach, white cloud, and soft violet — airy, wondrous, the visual "reward" tier.

**UI mood:** cream/parchment panel backgrounds, warm wood-tone borders, gold accent buttons — a sanctuary ledger/scrapbook feeling rather than a sci-fi or "gamer" HUD aesthetic. Rarity is always color-coded consistently (see §17) so it reads instantly across every screen.

**Motion:** gentle squash/stretch on creature idle and capture reactions, soft ease-in-out tweens on UI transitions, no jarring screen shake by default (and none at all when "Reduce Motion" is enabled in Settings).

---

## 4. Technical Stack & Architecture

### 4.1 Stack
- **Phaser 3** as the rendering/scene/physics engine (Arcade Physics is sufficient — no need for Matter.js).
- **TypeScript**, strict mode, no `any` except at well-justified boundaries (e.g. raw JSON parsing before validation).
- **Vite** for dev server and bundling (fast HMR, simple config, tree-shaking).
- No backend required for v1. All state is client-side. Code should be written so a future `SaveSystem` backend adapter (e.g. REST or Firebase) could replace the LocalStorage adapter without touching gameplay code (see §15).

### 4.2 Architectural Principles
- **Scene separation:** Boot/Preload, Main Menu, Explore (per-area), Sanctuary, and a persistent overlay UI Scene that runs in parallel for HUD and modal panels.
- **Systems, not god-objects:** Gameplay logic lives in standalone `systems/` classes (Capture, Economy, Progression, Achievements, Audio, Save) that scenes call into — scenes should be thin and mostly handle presentation and input wiring.
- **Data-driven content:** Creatures, areas, ropes, and achievements are defined in JSON (see `/data/`), loaded once at boot, and typed via shared interfaces in `data/types.ts`. Adding a new creature or area should never require touching gameplay code, only the JSON files.
- **Event-driven communication:** Use Phaser's built-in `EventEmitter` (or a small custom global `EventBus`) for cross-system communication (e.g. `creatureCaptured`, `coinsEarned`, `levelUp`, `achievementUnlocked`) rather than direct references between unrelated systems.
- **Single source of truth for player state:** A `PlayerState` object (coins, gems, xp, level, owned creatures, owned ropes, unlocked areas, settings) is the only place game state lives. All systems read/mutate it through defined methods, never by reaching into each other's internals.

### 4.3 Core TypeScript Interfaces (starter contract)

```ts
// data/types.ts

export enum Rarity {
  Common = "Common",
  Rare = "Rare",
  Epic = "Epic",
  Legendary = "Legendary",
  Mythic = "Mythic",
}

export interface Creature {
  id: string;
  name: string;
  area: AreaId;
  rarity: Rarity;
  captureDifficulty: number;   // 0-100
  coinRate: number;             // coins earned per coinInterval
  coinInterval: number;         // seconds, typically 10
  unlockLevel: number;          // min player level to encounter this creature
  description: string;
  spriteKey?: string;
}

export type AreaId =
  | "green_meadow"
  | "whisper_forest"
  | "crystal_mountain"
  | "golden_dunes"
  | "sky_island";

export interface Area {
  id: AreaId;
  name: string;
  order: number;
  unlockLevel: number;
  unlockCost: number;
  theme: string;
  musicTrack: string;
  ambienceSfx: string[];
  palette: string[];
  description: string;
}

export interface Rope {
  id: string;
  name: string;
  tier: number;
  capturePower: number;   // 0-100
  cost: number;
  currency: "coins";
  requiresGems?: number;
  requiresAchievement?: string;
  castTimeMs: number;
  description: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  goal: number;
  metric: string;
  reward: {
    coins?: number;
    gems?: number;
    xp?: number;
    title?: string;
    unlocks?: string;
  };
}

export interface OwnedCreature {
  instanceId: string;     // unique per captured individual
  creatureId: string;     // reference to Creature.id
  capturedAt: number;     // timestamp
  nickname?: string;
  level: number;          // sanctuary creature leveling (see §10.4)
}

export interface PlayerState {
  version: number;
  playerName: string;
  level: number;
  xp: number;
  coins: number;
  gems: number;
  ropesOwned: string[];
  currentRopeId: string;
  unlockedAreas: AreaId[];
  ownedCreatures: OwnedCreature[];
  discoveredCreatureIds: string[]; // seen but not necessarily captured
  achievementsUnlocked: string[];
  achievementProgress: Record<string, number>;
  sanctuaryLevel: number;
  sanctuaryDecorSlots: number;
  lastSavedAt: number;
  lastOnlineAt: number;
  dailyStreak: number;
  lastDailyClaimAt: number;
  settings: {
    musicVolume: number;   // 0-1
    sfxVolume: number;     // 0-1
    muted: boolean;
    reduceMotion: boolean;
  };
}
```

---

## 5. Responsive Design & Platform Targets

Wild Haven must run identically well in a browser tab on a 27" monitor and on a mid-range phone in either orientation. There is no separate "mobile build" — one responsive build serves all devices.

- **Design (logical) resolution:** `1280 × 720` (16:9) as the base canvas for layout math. Use Phaser's `Scale.RESIZE` mode combined with a custom `ResponsiveUtils` helper that recalculates anchor points on resize, rather than `Scale.FIT` letterboxing, so the world genuinely fills the screen on every device.
- **Aspect ratio range to support:** from ultra-wide desktop (21:9) down to narrow modern phones (9:19.5 / 9:20 portrait, and the equivalent 19.5:9 / 20:9 landscape). Treat **16:9 as the design center**, but every layout must gracefully reflow at the extremes — never crop critical UI, never leave dead unusable margins wider than ~10% of screen width.
- **Two responsive layout modes:**
  - **Landscape (primary):** HUD docked top-left (coins/gems/level) and top-right (settings/menu). Bottom-center action button for capture. Side panels slide in from the right.
  - **Portrait (secondary, fully supported, not an afterthought):** HUD compresses into a single top bar; bottom area becomes a thumb-reachable action dock; side panels become full-height bottom sheets instead of side drawers.
- **UI scaling:** All UI built with a 9-slice / nine-patch panel system (see `sprites/ui/panel_frame.png` for the bundled placeholder) so panels resize cleanly to any width/height without stretching artifacts. Font sizes defined in a small set of design tokens (e.g. `--fs-xs/sm/md/lg/xl`) that scale with a `clamp()`-style function based on the shorter screen dimension.
- **Safe areas:** Respect `env(safe-area-inset-*)` CSS values for notches/home indicators on mobile web; keep all interactive elements at least 16px logical pixels from any edge.
- **Touch targets:** Minimum 44×44 logical pixels for any tappable element, with 8px minimum spacing between adjacent targets.
- **DPI handling:** Use `window.devicePixelRatio` capped at 2 for canvas resolution to balance crispness and performance on high-density phone screens.

---

## 6. Core Gameplay Loop

```
Explore an Area
   → Spot a Creature (visual + subtle audio cue)
      → Approach and trigger Capture (timing-based rope minigame)
         → Success: Creature added to Inventory → walk/carry it to Sanctuary
         → Failure: Creature flees, can be re-attempted later, no penalty
            → Captured Creature placed in Sanctuary enclosure
               → Creature passively generates Coins over time (even offline)
                  → Spend Coins on: better Ropes, Sanctuary expansion, decor
                     → Better Ropes / higher Player Level → unlock next Area
                        → Repeat, now finding rarer creatures
```

This loop should feel completable in 3–5 minute "snack" sessions (find and catch one creature, collect coins, buy one upgrade) as well as rewarding in 30+ minute sessions (sweep an area, fill several Collection Book pages, push toward an Area unlock).

---

## 7. World & Areas

Five biomes, unlocked sequentially by Player Level and a one-time coin unlock cost. Each has a distinct color palette, music track, ambience loop, and creature roster (see bundled `data/areas.json` and `data/creatures.json` for full machine-readable definitions).

| # | Area | Unlock Level | Unlock Cost | Mood |
|---|------|--------------|-------------|------|
| 1 | **Green Meadow** | 1 (starting area) | Free | Sunny rolling hills, wildflowers, beginner-friendly |
| 2 | **Whisper Forest** | 5 | 1,500 coins | Shaded canopy, fireflies, mysterious calm |
| 3 | **Crystal Mountain** | 10 | 6,000 coins | Snowy peaks, glowing crystal veins, crisp air |
| 4 | **Golden Dunes** | 18 | 20,000 coins | Warm dunes, oases, heat shimmer, golden hour |
| 5 | **Sky Island** | 28 | 75,000 coins | Floating islands above the clouds, endgame wonder |

Each area scene should include:
- A hand-paint-able (or proc-gen-assisted) background with 2–3 parallax layers for depth without heavy performance cost.
- 3–6 **spawn points** where creatures appear on a timer/randomized schedule, biased toward that area's roster.
- Light environmental animation (swaying grass, drifting fireflies, falling snow, heat shimmer, drifting clouds) implemented cheaply via tinted/scaled sprite tweens, not particle-heavy effects, to stay mobile-friendly.
- A return path / portal back to the Sanctuary, always visible or one tap away.

---

## 8. Creature System

### 8.1 Rarity Tiers
`Common → Rare → Epic → Legendary → Mythic`

Each tier should visually communicate itself through a colored rarity border/glow in UI (see palette in §3) independent of the creature's own art, so players can recognize rarity at a glance even before learning every creature.

### 8.2 Data Fields (per creature)
- `name`, `rarity`, `area`, `description` (one or two warm, family-friendly sentences with a touch of personality/lore — never generic).
- `captureDifficulty` (0–100): how hard the timing minigame is, and how much rope power is needed for a reasonable success chance.
- `coinRate` + `coinInterval`: passive income definition (e.g. "1 coin every 10 seconds").
- `unlockLevel`: minimum player level before this creature can spawn at all (prevents new players being shown impossible Mythic creatures on day one).

### 8.3 Starter Roster
32 creatures are pre-defined across the five areas in `data/creatures.json`, six to eight per area, with a full spread of rarities (each area's top rarity gets progressively rarer/harder, culminating in Sky Island's two Mythic creatures: **Phoenix** and **Moonlight Unicorn**). Example entries:

| Creature | Area | Rarity | Capture Difficulty | Coin Rate |
|---|---|---|---|---|
| Meadow Rabbit | Green Meadow | Common | 10 | 1 / 10s |
| Silver Fox | Whisper Forest | Rare | 34 | 4 / 10s |
| Crystal Turtle | Crystal Mountain | Rare | 38 | 5 / 10s |
| Geode Golem | Crystal Mountain | Epic | 58 | 11 / 10s |
| Desert Spirit | Golden Dunes | Legendary | 78 | 25 / 10s |
| Phoenix | Sky Island | Mythic | 90 | 45 / 10s |

The agent should treat this list as a starting seed and feel free to extend it — the architecture must support adding new creatures purely by appending to the JSON file.

---

## 9. Capture System

### 9.1 Ropes

| Rope | Tier | Capture Power | Cost | Notes |
|---|---|---|---|---|
| Basic Rope | 1 | 20 | Free (starting item) | Reliable for Common creatures |
| Strong Rope | 2 | 45 | 1,200 coins | Needed for most Rare creatures |
| Magic Rope | 3 | 75 | 12,000 coins + 50 gems | Required for most Epics |
| Divine Rope | 4 | 100 | 60,000 coins + 250 gems + "Master Collector" achievement | Only rope viable on Mythics |

### 9.2 Capture Flow
1. Player approaches a spawned creature and taps/clicks it (or presses the interact key on keyboard) to initiate a capture attempt.
2. A **timing-bar minigame** appears: a marker sweeps left-to-right across a bar. A colored "success zone" is rendered in the middle, sized proportionally to `(equippedRope.capturePower - creature.captureDifficulty)`, clamped to a sensible minimum width so it's never literally impossible, and never literally guaranteed.
3. Player taps/clicks (or presses Space/Enter) when the marker is inside the zone. Landing dead-center awards a "Perfect" bonus; landing within the wider edge of the zone awards a "Good" bonus; missing entirely still gives a reduced baseline chance (never a guaranteed instant fail), keeping the game forgiving for younger or motor-impaired players.
4. Final success chance is rolled using the formula below (also defined machine-readably in `data/ropes.json`):

```
successChance% = clamp(
  baseChance(50)
  + (rope.capturePower - creature.captureDifficulty)
  + timingBonus            // Perfect: +20, Good: +10, Miss: +0
  + baitItemBonus          // optional consumable, +5
  + sanctuaryPerkBonus,    // from upgrades, see §10.5
  minChance(5), maxChance(95)
)
```

5. **Success:** capture animation (rope gently wraps, creature calms with a heart/sparkle effect), creature is added to `PlayerState.ownedCreatures`, XP is awarded, and a toast/banner confirms the catch with rarity-colored flourish (bigger celebration for higher rarities).
6. **Failure:** the creature is startled and flees (runs off-screen or vanishes after a short animation) but the encounter is otherwise consequence-free — no item lost, no cooldown penalty beyond needing to find that creature (or another of its kind) again.

### 9.3 Design Notes
- Never allow a 0% or 100% guaranteed outcome — there should always be a sliver of luck and a sliver of agency.
- Higher-rarity creatures should also visually telegraph their toughness (faster marker sweep speed, smaller success zone) so experienced players can recognize "this needs my best rope" before wasting a weak one.

---

## 10. Sanctuary & Economy System

### 10.1 Passive Income
Every owned creature generates `coinRate` coins every `coinInterval` seconds, accumulated for **all** owned creatures simultaneously while the Sanctuary scene is open, and accrued as a lump sum for **offline time** (capped, see 10.3) when the player returns.

### 10.2 Example Rates
- Rabbit: 1 coin / 10s
- Fox (Rare): 3–4 coins / 10s
- Geode Golem (Epic): 11 coins / 10s
- Phoenix (Mythic): 45 coins / 10s

### 10.3 Offline Earnings
- On load, compute `elapsedSeconds = now - lastOnlineAt`, cap it at a configurable maximum (recommended default: **8 hours** for free play, extendable via a future "Sanctuary Roof" upgrade to 16–24 hours) to keep the economy balanced.
- Present offline earnings as a friendly "Welcome back!" summary modal listing total coins earned and any creature-specific highlights, rather than silently depositing them.

### 10.4 Creature Leveling (Sanctuary growth)
- Creatures can be "fed" or "trained" using coins or a secondary soft currency to level up (e.g. Level 1–10 per creature), increasing their `coinRate` by a modest percentage per level (e.g. +8% per level). This gives long-term players something to invest excess coins into beyond just unlocking new content, smoothing the mid-late game economy.

### 10.5 Sanctuary Upgrades (coin sinks)
- **Enclosure expansion:** increases the maximum number of creatures the Sanctuary can house.
- **Decor slots:** cosmetic-only placements (ponds, fences, lanterns) that contribute to a "Sanctuary Charm" score — purely aesthetic, supports the cozy/Animal-Crossing-style fantasy.
- **Capture perks:** small passive bonuses to capture success chance, feeding `sanctuaryPerkBonus` in §9.2.
- **Sanctuary Roof / offline cap extension:** as described in §10.3.

### 10.6 Currencies
- **Coins:** primary soft currency, earned passively and from achievements, spent on ropes/upgrades.
- **Gems:** secondary premium-feel currency earned from achievements, daily rewards, and Collection Book milestones (not sold for real money in v1 — keep the architecture compatible with adding that later without redesign).

---

## 11. Progression System

### 11.1 Player Level & XP
- XP is earned from captures (scaled by rarity), achievements, and daily rewards.
- Recommended curve: `xpToNextLevel = floor(100 * level^1.45)` — tune in playtesting, but keep it data-driven (a single exported function, not inlined magic numbers scattered through code) so it's easy to rebalance.
- Leveling up should always feel like an event: a brief animation/banner, and ideally unlock something tangible (new area access, a new rope tier becoming purchasable, a cosmetic).

### 11.2 Achievements
17 starter achievements are defined in `data/achievements.json`, spanning first captures, rarity milestones, per-area collection completion, lifetime coin milestones, sanctuary growth, and login streaks. Each grants coins/gems/XP and occasionally a cosmetic title or unlock (e.g. completing the full Collection Book unlocks eligibility to purchase the Divine Rope).

### 11.3 Collection Book
- A Pokédex-style book with one page per Area, one entry per creature.
- **Undiscovered** creatures show only a silhouette and rarity icon (no name/lore spoiled).
- **Discovered but not captured** (i.e., seen in the wild, capture failed or not yet attempted) reveal name and rarity but lock the description/art behind a "?" until captured.
- **Captured** creatures show full art, name, rarity, lore description, and live stats (how many owned, current total coin contribution).
- A persistent completion percentage (overall, and per-area) should be visible from the book's cover/index page to motivate "just one more page" sessions.

### 11.4 Daily Rewards
- A login-streak calendar (7-day cycle, escalating rewards, with a noticeably larger reward on day 7) backed by `dailyStreak` and `lastDailyClaimAt` in `PlayerState`.
- Missing a day resets the streak gently (never deletes existing creatures/progress) — the penalty is losing only the *streak bonus trajectory*, never anything already owned.

---

## 12. UI / UX Specification

All panels use the bundled nine-slice `panel_frame.png` placeholder and warm cream/gold button styling (`button.png`) as a starting visual language — cozy, rounded, parchment-and-wood inspired, never harsh or "gamer-aesthetic" neon.

### 12.1 HUD (always visible during Explore/Sanctuary)
- Top-left: Coins, Gems, Player Level/XP bar.
- Top-right: Settings gear icon, area name/icon (tap to open area-switch menu once unlocked).
- Bottom-center (Explore only): context-sensitive action button (appears only when a creature is nearby/targetable).
- Bottom dock (both scenes): icons for Inventory, Collection Book, Sanctuary, Shop — always one tap away.

### 12.2 Inventory
- Grid/list of all currently owned, uncaged-in-sanctuary creatures (e.g. just captured, awaiting placement) plus owned ropes and consumables.
- Tap a creature to open Creature Details; drag (or tap-then-tap-destination on mobile) to assign it to a Sanctuary enclosure slot.

### 12.3 Collection Book
- Tabbed or swipeable by Area; grid of creature slots within each tab (silhouette / discovered / captured states per §11.3).
- Tapping any entry opens Creature Details.
- Header shows overall and per-area completion percentage with a progress bar.

### 12.4 Creature Details
- Large art, name, rarity badge (color-coded), description/lore, capture difficulty indicator, current coin production (base × level multiplier), and — if owned — a "Feed/Train" button for leveling (§10.4) and a nickname field.

### 12.5 Sanctuary Management
- Top-down or side-view layout of enclosures/zones the player can decorate and assign creatures to.
- Tap an empty enclosure slot to assign from Inventory; tap an occupied one to open Creature Details.
- Shows aggregate income rate (coins/sec across the whole sanctuary) prominently — this is the "tycoon dashboard" view.

### 12.6 Shop
- Tabs: Ropes, Sanctuary Upgrades, Decor, (future: Cosmetics).
- Each item card: icon, name, short effect description, cost, and a clear "owned/locked/available" state. Locked items show the unlock requirement (e.g. "Requires Level 15" or "Requires Master Collector achievement").

### 12.7 Achievement Menu
- List/grid grouped by category (Captures, Collection, Economy, Sanctuary, Streaks), each row showing a progress bar toward the next unmet achievement in that line and a checkmark/claim button for completed-but-unclaimed rewards.

### 12.8 Settings Menu
- Music volume slider, SFX volume slider, Mute toggle, "Reduce Motion" toggle (disables/minimizes screen-shake and heavy parallax for accessibility), language selector (architecture should support i18n string tables even if only one language ships at v1), Save/Export/Reset Save controls, Credits.

### 12.9 First-Time User Experience (FTUE)
- A short, skippable guided sequence on first launch: spawn one guaranteed-easy creature near the player, prompt the capture minigame with on-screen finger/key hints, walk it to the Sanctuary, show the first coin tick. This single guided loop should teach the entire core loop in under two minutes.

---

## 13. Controls

| Action | Touch | Keyboard / Mouse |
|---|---|---|
| Move player | Virtual joystick (bottom-left, thumb zone) or tap-to-move | WASD / Arrow keys |
| Interact / initiate capture | Tap on creature or context action button | E / Space, or mouse click on creature |
| Capture minigame timing input | Tap anywhere on screen | Space / Enter / mouse click |
| Open Inventory / Book / Shop / Achievements | Bottom dock icons (tap) | Number keys 1–4, or click dock icons |
| Pan camera (if applicable) | Drag | Mouse drag / arrow keys at screen edge |
| Pause / Settings | Tap gear icon | Esc |
| Confirm / Cancel in menus | Tap | Enter / Esc |

Both input schemes must be fully interchangeable at runtime — a desktop user plugging in a touch-enabled monitor, or a mobile user attaching a Bluetooth keyboard, should both just work without a mode switch.

---

## 14. Audio System

### 14.1 Track List

| Track | Used In |
|---|---|
| `music_meadow` | Green Meadow exploration |
| `music_forest` | Whisper Forest exploration |
| `music_mountain` | Crystal Mountain exploration |
| `music_desert` | Golden Dunes exploration |
| `music_sanctuary` | Sanctuary management scene (calm, homely) |
| `music_sanctuary_sky` | Sky Island exploration (also reused as an alternate sanctuary theme once unlocked, for variety) |
| `music_menu` | Main menu / title screen |

### 14.2 Behavior
- Crossfade (not hard-cut) between tracks when changing scenes/areas, ~1.5–2 second fade.
- A central `AudioManager` system exposes `playMusic(key)`, `playSfx(key)`, `setMusicVolume(v)`, `setSfxVolume(v)`, `setMuted(bool)` — all scenes route through this rather than calling Phaser's sound manager directly, so global mute/volume always works consistently everywhere.
- SFX needed at minimum: UI tap/confirm, capture success (tiered by rarity — bigger fanfare for Epic+), capture fail/flee, coin collect/tick, level up, achievement unlock, area unlock, button hover (desktop only).
- Respect the `settings.muted` and volume values from `PlayerState` on every scene boot — audio preferences must persist across sessions via the save system.
- All audio loads should be deferred/streamed where the target platform supports it, to avoid a heavy upfront download stalling first paint on mobile data connections.

---

## 15. Save System

- **Storage:** Browser `localStorage`, single key (e.g. `wildhaven_save_v1`), JSON-serialized `PlayerState`.
- **Versioning:** `PlayerState.version` field; a `SaveSystem.migrate(rawSave)` function upgrades older save shapes forward so future content updates never corrupt or wipe existing player progress.
- **Autosave triggers:** on every meaningful state change is wasteful; instead autosave on a debounced interval (e.g. every 15–30 seconds while changes are pending) plus immediately on: capture success, purchase, area unlock, achievement unlock, and `visibilitychange`/`beforeunload` events (best-effort flush before tab close).
- **Resilience:** wrap all `localStorage` reads/writes in try/catch (private browsing mode or storage-full scenarios should degrade gracefully to an in-memory-only session with a visible warning, never crash the game).
- **Export/Import (nice-to-have, low cost):** a "Copy Save Code" / "Paste Save Code" pair in Settings using base64-encoded JSON, giving players a manual backup path with no backend required.

---

## 16. Performance & Mobile Optimization

- Target **60fps on mid-range phones from the last 3–4 years**; degrade gracefully (cap to 30fps, reduce particle counts) on detected low-end devices rather than visibly stuttering.
- Use **texture atlases** (sprite sheets) for creatures, icons, and UI rather than hundreds of individual image requests.
- Pool reusable objects (capture minigame markers, coin pop-up text, particle bursts) instead of constantly creating/destroying GameObjects.
- Keep parallax background layers to 2–3 max per area and prefer tiling/scrolling cheap layers over large unique painted backgrounds where possible.
- Avoid expensive per-frame allocations in `update()` loops; precompute what can be precomputed.
- Lazy-load each Area's assets only when that area is unlocked/entered, rather than bundling all five biomes' art into the initial load.
- Test on actual throttled CPU (Chrome DevTools 4x-6x slowdown) and a real mid-range Android device before considering any milestone "done."

---

## 17. Asset Specifications

- **Style:** stylized low-poly-adjacent pixel art (flat, bright, clean outlines), bright saturated but not neon color palette, soft rounded silhouettes — think Animal Crossing's warmth, Slime Rancher's bounce, Stardew Valley's pixel charm, and Pokémon's collection-driven creature design.
- **Creature sprite canvas:** author at a small base grid (e.g. 32×32 or 48×48) and export at integer multiples (×4, ×6, ×8) for crisp non-blurry scaling — never scale non-integer factors on pixel art.
- **Naming convention:** `creatures/{creatureId}_{area}_{rarity}.png`, `icons/{name}.png`, `ui/{name}.png`, matching the bundled placeholder set exactly so the agent can do a like-for-like asset swap later.
- **Rarity color coding (also given as a reference sheet in `palette_reference.png`):**
  - Common — `#B5B5B5`
  - Rare — `#4FA3E3`
  - Epic — `#B05FE0`
  - Legendary — `#FFC93C`
  - Mythic — `#FF5C8A`
- **Area palettes:** see `data/areas.json` → `palette` field per area; use these as the dominant background/UI accent hues when in that area's scene.
- **UI components:** nine-slice panel frame and pill-style buttons in warm cream/gold tones (placeholders bundled at `sprites/ui/`).
- All bundled placeholder sprites are intentionally simple programmatically-generated pixel art — they are **functional stand-ins** to unblock development, not final art. They follow the correct canvas sizes, transparency, and naming pattern so swapping in commissioned final art later is a drop-in replacement.

---

## 18. Project Folder Structure

```
wild-haven/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── assets/
│       ├── sprites/
│       │   ├── creatures/
│       │   ├── icons/
│       │   ├── ui/
│       │   └── environment/
│       ├── audio/
│       │   ├── music/
│       │   └── sfx/
│       └── data/
│           ├── creatures.json
│           ├── areas.json
│           ├── ropes.json
│           └── achievements.json
└── src/
    ├── main.ts
    ├── config/
    │   └── GameConfig.ts
    ├── scenes/
    │   ├── BootScene.ts
    │   ├── PreloadScene.ts
    │   ├── MainMenuScene.ts
    │   ├── ExploreScene.ts        // parameterized per area
    │   ├── SanctuaryScene.ts
    │   └── UIScene.ts             // persistent overlay scene
    ├── entities/
    │   ├── Player.ts
    │   ├── WildCreature.ts        // a spawned, not-yet-captured creature
    │   └── SanctuaryCreature.ts   // a placed, income-generating creature
    ├── systems/
    │   ├── CaptureSystem.ts
    │   ├── EconomySystem.ts
    │   ├── ProgressionSystem.ts
    │   ├── AchievementSystem.ts
    │   ├── AudioManager.ts
    │   ├── SaveSystem.ts
    │   └── EventBus.ts
    ├── ui/
    │   ├── HUD.ts
    │   ├── InventoryPanel.ts
    │   ├── CollectionBookPanel.ts
    │   ├── CreatureDetailPanel.ts
    │   ├── SanctuaryPanel.ts
    │   ├── ShopPanel.ts
    │   ├── AchievementPanel.ts
    │   └── SettingsPanel.ts
    ├── data/
    │   ├── types.ts
    │   └── DataLoader.ts
    └── utils/
        ├── MathUtils.ts
        └── ResponsiveUtils.ts
```

---

## 19. Bundled Starter Data & Assets

This brief ships with ready-to-use starter content so the agent can build and visually test systems immediately rather than blocking on art/data production:

- `data/creatures.json` — 32 creatures across all 5 areas and all 5 rarities.
- `data/areas.json` — full definitions for all 5 areas including unlock costs, palettes, and music track keys.
- `data/ropes.json` — all 4 rope tiers plus the capture success formula spec.
- `data/achievements.json` — 17 starter achievements covering captures, collection, economy, and streaks.
- `sprites/creatures/` — 5 placeholder creature sprites, one per area, demonstrating the rarity progression (Rabbit/Common → Fox/Rare → Crystal Turtle/Epic → Desert Golem/Legendary → Phoenix/Mythic).
- `sprites/icons/` — coin, gem, XP star, and all 4 rope icons.
- `sprites/ui/` — nine-slice panel frame and a button base.
- `palette_reference.png` — full color palette swatch sheet (hex codes included) for art direction consistency.

These are placeholders only — functional, on-brand, and correctly named/sized, but intended to be replaced with final commissioned or AI-generated art once core systems are working.

---

## 20. Development Roadmap

**Phase 1 — Foundation**
Project scaffold (Vite + TS + Phaser), `GameConfig`, Boot/Preload scenes, `DataLoader` parsing the bundled JSON into typed objects, `EventBus`, `PlayerState` shape and `SaveSystem` (load/save/migrate) with the placeholder data wired in.

**Phase 2 — Core Loop, Vertical Slice**
One working area (Green Meadow) with: player movement (touch + keyboard), 1–2 spawning creatures, the capture minigame end-to-end, a minimal Sanctuary scene that shows owned creatures ticking up coins, and a basic always-visible HUD. Goal: the full Explore → Capture → Collect Coins loop is playable.

**Phase 3 — Systems Depth**
Progression (levels/XP), Achievements, Collection Book UI, Shop with ropes purchasable and affecting capture odds, Sanctuary upgrades, offline-earnings calculation on load.

**Phase 4 — Full World**
Remaining four areas built out with their full creature rosters, unlock gating by level/coins, area-specific music/ambience/palette, parallax backgrounds.

**Phase 5 — Polish & Responsiveness**
Full responsive pass across aspect ratios (desktop ultra-wide → narrow phone portrait), FTUE onboarding flow, daily rewards, settings menu (volume/mute/reduce-motion/save export), juice pass (animations, screen feedback, SFX coverage), and a performance/profiling pass on a real mid-range mobile device.

**Phase 6 — QA & Launch Readiness**
Cross-browser testing (Chrome/Safari/Firefox, iOS Safari + Android Chrome specifically), save migration test with a deliberately old/corrupted save shape, accessibility pass (touch target sizes, color-blind-safe rarity indicators in addition to color, reduce-motion respected), final content balance pass on the economy/XP curves.

---

## 21. Definition of Done

A build is considered complete for v1 when:

- [ ] All 5 areas are explorable, each with a distinct visual theme, music track, and at least 6 unique creatures.
- [ ] The full Explore → Capture → Sanctuary → Earn → Upgrade → Unlock loop works without dead ends on both touch and keyboard/mouse input.
- [ ] Save/load (including offline-earnings calculation) is reliable across browser refresh and re-opening the tab after a real elapsed gap.
- [ ] Inventory, Collection Book, Creature Details, Sanctuary Management, Shop, Achievements, and Settings menus are all implemented and reachable from the HUD dock.
- [ ] All 4 rope tiers are purchasable and measurably affect capture success rate.
- [ ] At least 17 achievements are trackable and rewarded correctly.
- [ ] Daily reward streak system functions across simulated multi-day play (test by manipulating the stored timestamp).
- [ ] The game is comfortably playable one-handed on a narrow phone in portrait, and with mouse/keyboard on a desktop browser, without any UI element being unreachable or cut off at either extreme aspect ratio.
- [ ] Holds 60fps on a mid-range Android device during normal exploration with 3+ creatures visible.
- [ ] No console errors during a full playthrough from new save to all 5 areas unlocked.

---

## 22. Future Expansion Ideas

(Not required for v1, but the architecture in this brief is intentionally designed not to block these later)

- Limited-time seasonal areas/events with exclusive creatures.
- Creature breeding/fusion to produce new visual variants.
- Cosmetic-only premium currency purchases (skins, decor, sanctuary themes) — no pay-to-win capture advantages, to preserve the cozy/fair design pillar.
- A friend/visit system to view (read-only) another player's sanctuary, fitting the social-but-low-pressure tone of the genre's inspirations.
- Photo mode for screenshotting the sanctuary.
- Additional input: gamepad support for desktop/Smart TV browsers.
- Localization into additional languages using the i18n string-table seams already designed into the Settings menu.

---

*End of brief. This document, together with the bundled `/data/*.json` files and `/sprites/*` placeholder assets, is intended to be sufficient for an AI coding agent to scaffold and build Wild Haven from a clean repository without further clarification on core systems. Open design questions not covered here should default to the cozy, forgiving, low-pressure tone established in §2 Design Pillars.*
