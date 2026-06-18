// src/systems/EconomySystem.ts
import { Creature, OwnedCreature, PlayerState } from '../data/types';
import { DataLoader } from '../data/DataLoader';
import { SaveSystem } from './SaveSystem';
import { EventBus } from './EventBus';

export interface OfflineEarningsResult {
  elapsedSeconds: number;
  coinsEarned: number;
  capped: boolean;
  maxHours: number;
}

export class EconomySystem {
  // Base slots count
  public static getSanctuaryCapacity(sanctuaryLevel: number): number {
    // level 1 = 6 slots, level 2 = 9 slots, level 3 = 12 slots, level 4 = 15 slots, level 5 = 20 slots
    const capacities = [6, 9, 12, 16, 20];
    const index = Math.min(capacities.length - 1, sanctuaryLevel - 1);
    return capacities[index];
  }

  public static getUpgradeCost(currentSanctuaryLevel: number): number {
    const costs = [1000, 5000, 18000, 50000]; // cost to upgrade to lvl 2, 3, 4, 5
    if (currentSanctuaryLevel >= 5) return -1; // max level
    return costs[currentSanctuaryLevel - 1];
  }

  /**
   * Get coin rate per 10 seconds for a specific owned creature, accounting for its level.
   * Formula: baseRate * (1 + (creatureLevel - 1) * 0.08)
   */
  public static getCreatureCoinRate(creature: Creature, level: number): number {
    const multiplier = 1 + (level - 1) * 0.08;
    return creature.coinRate * multiplier;
  }

  /**
   * Calculate total passive income of all placed creatures in coins per second.
   */
  public static getIncomePerSecond(state: PlayerState): number {
    let totalRatePer10s = 0;
    
    // In our system, the first N creatures up to sanctuary capacity are placed in slots.
    // If we want manual placement, we can use the placedSlot property.
    // Let's support both: if some have placedSlot defined, use them. Otherwise, automatically place the highest rate ones.
    
    const activeCreatures = this.getActivePlacedCreatures(state);

    activeCreatures.forEach(oc => {
      const creature = DataLoader.getCreature(oc.creatureId);
      if (creature) {
        totalRatePer10s += this.getCreatureCoinRate(creature, oc.level);
      }
    });

    return totalRatePer10s / 10;
  }

  /**
   * Get creatures currently placed in sanctuary slots.
   */
  public static getActivePlacedCreatures(state: PlayerState): OwnedCreature[] {
    const capacity = this.getSanctuaryCapacity(state.sanctuaryLevel);
    
    // Check if player has explicitly placed creatures (we'll store placedSlot: number in the OwnedCreature object)
    const placed = state.ownedCreatures.filter(oc => (oc as any).placedSlot !== undefined && (oc as any).placedSlot !== null);
    
    if (placed.length > 0) {
      // Return those placed, limited by capacity just in case
      return placed.slice(0, capacity);
    }
    
    // Fallback: If no manual placement is set, automatically place the top creatures to maximize player earnings
    const sorted = [...state.ownedCreatures].sort((a, b) => {
      const cA = DataLoader.getCreature(a.creatureId);
      const cB = DataLoader.getCreature(b.creatureId);
      const rateA = cA ? this.getCreatureCoinRate(cA, a.level) : 0;
      const rateB = cB ? this.getCreatureCoinRate(cB, b.level) : 0;
      return rateB - rateA; // descending
    });

    // Mark them as placed in slots automatically for save-state consistency
    const active = sorted.slice(0, capacity);
    active.forEach((oc, idx) => {
      (oc as any).placedSlot = idx;
    });

    return active;
  }

  /**
   * Assign a creature to a sanctuary slot.
   */
  public static placeCreatureInSlot(instanceId: string, slotIdx: number): boolean {
    const state = SaveSystem.getState();
    const capacity = this.getSanctuaryCapacity(state.sanctuaryLevel);
    if (slotIdx < 0 || slotIdx >= capacity) return false;

    // Check if slot is occupied, if so, unplace the creature in it
    state.ownedCreatures.forEach(oc => {
      if ((oc as any).placedSlot === slotIdx) {
        delete (oc as any).placedSlot;
      }
    });

    // Place the new creature
    const target = state.ownedCreatures.find(oc => oc.instanceId === instanceId);
    if (target) {
      (oc: any) => { (oc as any).placedSlot = null; }; // Clear other slots it might have occupied
      state.ownedCreatures.forEach(oc => {
        if (oc.instanceId === instanceId) {
          (oc as any).placedSlot = slotIdx;
        }
      });
      SaveSystem.markDirty();
      EventBus.emit('sanctuaryUpdated');
      return true;
    }
    return false;
  }

  /**
   * Remove a creature from its sanctuary slot.
   */
  public static removeCreatureFromSlot(instanceId: string): void {
    const state = SaveSystem.getState();
    const target = state.ownedCreatures.find(oc => oc.instanceId === instanceId);
    if (target) {
      delete (target as any).placedSlot;
      SaveSystem.markDirty();
      EventBus.emit('sanctuaryUpdated');
    }
  }

  /**
   * Upgrade Sanctuary level (enclosure expansion).
   */
  public static upgradeSanctuary(): boolean {
    const state = SaveSystem.getState();
    const cost = this.getUpgradeCost(state.sanctuaryLevel);
    
    if (cost > 0 && state.coins >= cost) {
      state.coins -= cost;
      state.sanctuaryLevel += 1;
      
      // Update lifetime stats in achievement tracking
      this.trackMetric('sanctuary_level', state.sanctuaryLevel);

      SaveSystem.markDirty();
      SaveSystem.forceSave();
      EventBus.emit('coinsChanged', state.coins);
      EventBus.emit('sanctuaryUpgraded', state.sanctuaryLevel);
      EventBus.emit('sanctuaryUpdated');
      return true;
    }
    return false;
  }

  /**
   * Level up a creature by feeding it.
   * Cost formula: baseCost * (creatureLevel ^ 1.5)
   */
  public static getCreatureLevelUpCost(creature: Creature, currentLevel: number): number {
    if (currentLevel >= 10) return -1; // Max level 10
    
    let baseCost = 100;
    switch (creature.rarity) {
      case 'Common': baseCost = 80; break;
      case 'Rare': baseCost = 250; break;
      case 'Epic': baseCost = 800; break;
      case 'Legendary': baseCost = 3000; break;
      case 'Mythic': baseCost = 15000; break;
    }

    return Math.floor(baseCost * Math.pow(currentLevel, 1.6));
  }

  public static levelUpCreature(instanceId: string): boolean {
    const state = SaveSystem.getState();
    const owned = state.ownedCreatures.find(oc => oc.instanceId === instanceId);
    if (!owned) return false;

    const creature = DataLoader.getCreature(owned.creatureId);
    if (!creature) return false;

    const cost = this.getCreatureLevelUpCost(creature, owned.level);
    if (cost > 0 && state.coins >= cost) {
      state.coins -= cost;
      owned.level += 1;
      
      SaveSystem.markDirty();
      EventBus.emit('coinsChanged', state.coins);
      EventBus.emit('creatureLeveledUp', owned);
      EventBus.emit('sanctuaryUpdated');
      return true;
    }
    return false;
  }

  /**
   * Processes offline earnings since last login.
   * Capped at 8 hours base, or more based on upgrades.
   */
  public static processOfflineEarnings(state: PlayerState): OfflineEarningsResult {
    const now = Date.now();
    const lastOnline = state.lastOnlineAt || now;
    let elapsedSeconds = Math.floor((now - lastOnline) / 1000);
    
    if (elapsedSeconds < 30) {
      // Don't calculate for less than 30 seconds
      return { elapsedSeconds, coinsEarned: 0, capped: false, maxHours: 8 };
    }

    // Determine offline hours cap (starts at 8 hours)
    // Upgraded by decor slots or sanctuary level?
    // Let's say: Level 1 = 8 hours, Level 2 = 12 hours, Level 3 = 16 hours, Level 4+ = 24 hours
    let maxHours = 8;
    if (state.sanctuaryLevel === 2) maxHours = 12;
    else if (state.sanctuaryLevel === 3) maxHours = 16;
    else if (state.sanctuaryLevel >= 4) maxHours = 24;

    const maxSeconds = maxHours * 3600;
    let capped = false;
    if (elapsedSeconds > maxSeconds) {
      elapsedSeconds = maxSeconds;
      capped = true;
    }

    const incomePerSec = this.getIncomePerSecond(state);
    const coinsEarned = Math.floor(incomePerSec * elapsedSeconds);

    if (coinsEarned > 0) {
      state.coins += coinsEarned;
      // Also add to lifetime coins achievement progress
      this.trackMetric('lifetime_coins', coinsEarned);
      SaveSystem.markDirty();
      SaveSystem.forceSave();
    }

    return {
      elapsedSeconds,
      coinsEarned,
      capped,
      maxHours
    };
  }

  private static trackMetric(metric: string, value: number): void {
    const state = SaveSystem.getState();
    if (!state.achievementProgress[metric]) {
      state.achievementProgress[metric] = 0;
    }
    if (metric === 'sanctuary_level') {
      state.achievementProgress[metric] = Math.max(state.achievementProgress[metric], value);
    } else {
      state.achievementProgress[metric] += value;
    }
  }
}
