// src/systems/ProgressionSystem.ts
import { AreaId } from '../data/types';
import { SaveSystem } from './SaveSystem';
import { EventBus } from './EventBus';
import { DataLoader } from '../data/DataLoader';
import { AudioManager } from './AudioManager';

export class ProgressionSystem {
  /**
   * Calculate required XP for a given level.
   * Formula: floor(100 * (level ^ 1.45))
   */
  public static getRequiredXpForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.45));
  }

  /**
   * Add XP to the player. Handles multiple level ups if enough XP is gained.
   */
  public static addXp(amount: number): { levelsGained: number; currentLevel: number } {
    const state = SaveSystem.getState();
    let levelsGained = 0;
    
    state.xp += amount;
    
    let required = this.getRequiredXpForLevel(state.level);
    while (state.xp >= required) {
      state.xp -= required;
      state.level += 1;
      levelsGained += 1;
      
      // Award leveling rewards: 50 coins and 5 gems per level gained
      state.coins += state.level * 50;
      state.gems += 5;

      required = this.getRequiredXpForLevel(state.level);
    }

    if (levelsGained > 0) {
      SaveSystem.markDirty();
      SaveSystem.forceSave();
      
      // Play level up SFX
      AudioManager.playSfx('level_up');
      
      EventBus.emit('levelUp', {
        level: state.level,
        levelsGained,
        coinsEarned: levelsGained * state.level * 50,
        gemsEarned: levelsGained * 5
      });
      EventBus.emit('coinsChanged', state.coins);
      EventBus.emit('gemsChanged', state.gems);
    } else {
      SaveSystem.markDirty();
      EventBus.emit('xpChanged', { xp: state.xp, level: state.level });
    }

    return { levelsGained, currentLevel: state.level };
  }

  /**
   * Check if an area is unlocked.
   */
  public static isAreaUnlocked(areaId: AreaId): boolean {
    const state = SaveSystem.getState();
    return state.unlockedAreas.includes(areaId);
  }

  /**
   * Unlock a new area by spending coins.
   */
  public static unlockArea(areaId: AreaId): { success: boolean; error?: string } {
    const state = SaveSystem.getState();
    const area = DataLoader.getArea(areaId);
    
    if (!area) {
      return { success: false, error: "Area not found" };
    }

    if (this.isAreaUnlocked(areaId)) {
      return { success: false, error: "Area already unlocked" };
    }

    if (state.level < area.unlockLevel) {
      return { success: false, error: `Requires Player Level ${area.unlockLevel}` };
    }

    if (state.coins < area.unlockCost) {
      return { success: false, error: `Requires ${area.unlockCost} coins` };
    }

    // Spend coins and unlock area
    state.coins -= area.unlockCost;
    state.unlockedAreas.push(areaId);

    SaveSystem.markDirty();
    SaveSystem.forceSave();

    // Play area unlock sound
    AudioManager.playSfx('area_unlock');

    EventBus.emit('coinsChanged', state.coins);
    EventBus.emit('areaUnlocked', areaId);
    
    return { success: true };
  }

  /**
   * Equip a rope if owned.
   */
  public static equipRope(ropeId: string): boolean {
    const state = SaveSystem.getState();
    if (state.ropesOwned.includes(ropeId)) {
      state.currentRopeId = ropeId;
      SaveSystem.markDirty();
      EventBus.emit('ropeEquipped', ropeId);
      return true;
    }
    return false;
  }

  /**
   * Buy a rope from the shop.
   */
  public static buyRope(ropeId: string): { success: boolean; error?: string } {
    const state = SaveSystem.getState();
    const rope = DataLoader.getRope(ropeId);

    if (!rope) {
      return { success: false, error: "Rope not found" };
    }

    if (state.ropesOwned.includes(ropeId)) {
      return { success: false, error: "Rope already owned" };
    }

    // Check level or achievement requirements
    if (rope.requiresAchievement && !state.achievementsUnlocked.includes(rope.requiresAchievement)) {
      const ach = DataLoader.getAchievement(rope.requiresAchievement);
      return { success: false, error: `Unlock achievement "${ach?.name || rope.requiresAchievement}" first` };
    }

    const gemCost = rope.requiresGems || 0;

    if (state.coins < rope.cost) {
      return { success: false, error: `Requires ${rope.cost} coins` };
    }

    if (state.gems < gemCost) {
      return { success: false, error: `Requires ${gemCost} gems` };
    }

    // Spend currencies
    state.coins -= rope.cost;
    state.gems -= gemCost;
    state.ropesOwned.push(ropeId);
    state.currentRopeId = ropeId; // Auto equip

    SaveSystem.markDirty();
    SaveSystem.forceSave();

    AudioManager.playSfx('ui_confirm');

    EventBus.emit('coinsChanged', state.coins);
    EventBus.emit('gemsChanged', state.gems);
    EventBus.emit('ropePurchased', ropeId);
    EventBus.emit('ropeEquipped', ropeId);

    return { success: true };
  }
}
