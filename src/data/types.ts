// src/data/types.ts

export enum Rarity {
  Common = "Common",
  Rare = "Rare",
  Epic = "Epic",
  Legendary = "Legendary",
  Mythic = "Mythic",
}

export type AreaId =
  | "green_meadow"
  | "whisper_forest"
  | "crystal_mountain"
  | "golden_dunes"
  | "sky_island";

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

export interface Whip {
  id: string;
  name: string;
  tier: number;
  weakeningPower: number; // 0-100, reduces creature difficulty during QTE
  cost: number;
  description: string;
}

export interface BreedingRecipe {
  id: string;
  parentA: string; // creatureId
  parentB: string; // creatureId
  offspring: string; // creatureId of outcome
  successRate: number; // 0-100
  coinCost: number;
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
  placedSlot?: number;    // optional slot index in sanctuary
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
  whipsOwned: string[];
  currentWhipId: string;
  magicFruits: number;     // collected from map explorer
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
