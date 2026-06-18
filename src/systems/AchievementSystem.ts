// src/systems/AchievementSystem.ts
import { PlayerState } from '../data/types';
import { DataLoader } from '../data/DataLoader';
import { SaveSystem } from './SaveSystem';
import { EventBus } from './EventBus';
import { ProgressionSystem } from './ProgressionSystem';
import { AudioManager } from './AudioManager';

export class AchievementSystem {
  /**
   * Tracks a progress metric (e.g. captures_total, rare_captures).
   */
  public static trackMetric(metric: string, increment: number): void {
    const state = SaveSystem.getState();
    
    if (!state.achievementProgress) {
      state.achievementProgress = {};
    }

    if (metric === 'sanctuary_level' || metric === 'daily_streak') {
      // These are absolute values, not incremental
      state.achievementProgress[metric] = Math.max(state.achievementProgress[metric] || 0, increment);
    } else {
      state.achievementProgress[metric] = (state.achievementProgress[metric] || 0) + increment;
    }

    SaveSystem.markDirty();
    this.checkAchievements();
  }

  /**
   * Checks if any achievements have been newly completed and awards rewards.
   */
  public static checkAchievements(): void {
    const state = SaveSystem.getState();
    const achievements = DataLoader.getAchievements();
    
    // Dynamically update collection progress before checking
    this.updateCollectionMetrics(state);

    achievements.forEach(ach => {
      // Skip already unlocked
      if (state.achievementsUnlocked.includes(ach.id)) {
        return;
      }

      const progress = state.achievementProgress[ach.metric] || 0;
      if (progress >= ach.goal) {
        // Achievement unlocked!
        state.achievementsUnlocked.push(ach.id);
        
        // Award rewards
        let rewardText = '';
        if (ach.reward.coins) {
          state.coins += ach.reward.coins;
          rewardText += `+${ach.reward.coins} Coins `;
          EventBus.emit('coinsChanged', state.coins);
        }
        if (ach.reward.gems) {
          state.gems += ach.reward.gems;
          rewardText += `+${ach.reward.gems} Gems `;
          EventBus.emit('gemsChanged', state.gems);
        }
        if (ach.reward.xp) {
          ProgressionSystem.addXp(ach.reward.xp);
          rewardText += `+${ach.reward.xp} XP `;
        }
        if (ach.reward.unlocks) {
          // If it unlocks a rope, add it to owned ropes or unlock purchase eligibility
          // For Divine Rope, it unlocks the ability to buy it
          rewardText += `Unlocks: ${ach.reward.unlocks === 'rope_divine' ? 'Divine Rope' : ach.reward.unlocks} `;
        }

        SaveSystem.markDirty();
        SaveSystem.forceSave();

        // Play achievement SFX
        AudioManager.playSfx('achievement_unlock');

        EventBus.emit('achievementUnlocked', {
          id: ach.id,
          name: ach.name,
          description: ach.description,
          rewards: rewardText.trim()
        });
      }
    });
  }

  /**
   * Update unique collection count metrics dynamically.
   */
  private static updateCollectionMetrics(state: PlayerState): void {
    if (!state.achievementProgress) state.achievementProgress = {};

    const uniqueCaptured = new Set(state.ownedCreatures.map(oc => oc.creatureId));
    state.achievementProgress['total_collection'] = uniqueCaptured.size;

    const meadowCreatures = DataLoader.getCreaturesByArea('green_meadow').map(c => c.id);
    const forestCreatures = DataLoader.getCreaturesByArea('whisper_forest').map(c => c.id);
    const mountainCreatures = DataLoader.getCreaturesByArea('crystal_mountain').map(c => c.id);
    const dunesCreatures = DataLoader.getCreaturesByArea('golden_dunes').map(c => c.id);
    const skyCreatures = DataLoader.getCreaturesByArea('sky_island').map(c => c.id);

    state.achievementProgress['area_complete_green_meadow'] = [...uniqueCaptured].filter(id => meadowCreatures.includes(id)).length;
    state.achievementProgress['area_complete_whisper_forest'] = [...uniqueCaptured].filter(id => forestCreatures.includes(id)).length;
    state.achievementProgress['area_complete_crystal_mountain'] = [...uniqueCaptured].filter(id => mountainCreatures.includes(id)).length;
    state.achievementProgress['area_complete_golden_dunes'] = [...uniqueCaptured].filter(id => dunesCreatures.includes(id)).length;
    state.achievementProgress['area_complete_sky_island'] = [...uniqueCaptured].filter(id => skyCreatures.includes(id)).length;
  }

  /**
   * Check daily login streak on boot.
   */
  public static checkDailyStreak(): void {
    const state = SaveSystem.getState();
    const now = Date.now();
    const lastClaim = state.lastDailyClaimAt || 0;
    

    // Check if a new day has arrived (at least 18 hours since last claim, to be generous, but less than 48 hours to preserve streak)
    const elapsed = now - lastClaim;
    
    if (lastClaim === 0) {
      // First ever login
      state.dailyStreak = 1;
      state.lastDailyClaimAt = now;
      this.trackMetric('daily_streak', 1);
      SaveSystem.markDirty();
      SaveSystem.forceSave();
      EventBus.emit('dailyRewardAvailable', { day: 1, rewardCoins: 100 });
    } else if (elapsed >= 18 * 60 * 60 * 1000 && elapsed < 48 * 60 * 60 * 1000) {
      // Consecutive login
      state.dailyStreak += 1;
      state.lastDailyClaimAt = now;
      this.trackMetric('daily_streak', state.dailyStreak);
      SaveSystem.markDirty();
      SaveSystem.forceSave();
      
      const coinsReward = Math.min(1000, state.dailyStreak * 100);
      EventBus.emit('dailyRewardAvailable', { day: state.dailyStreak % 7 || 7, rewardCoins: coinsReward });
    } else if (elapsed >= 48 * 60 * 60 * 1000) {
      // Streak broken, reset
      state.dailyStreak = 1;
      state.lastDailyClaimAt = now;
      this.trackMetric('daily_streak', 1);
      SaveSystem.markDirty();
      SaveSystem.forceSave();
      EventBus.emit('dailyRewardAvailable', { day: 1, rewardCoins: 100 });
    }
  }

  public static claimDailyReward(): void {
    const state = SaveSystem.getState();
    const currentDay = state.dailyStreak % 7 || 7;
    
    // Daily reward amount escalates: Day 1-6 = Day * 100 coins. Day 7 = 1000 coins + 5 gems!
    let coins = currentDay * 100;
    let gems = 0;
    
    if (currentDay === 7) {
      coins = 1000;
      gems = 10;
    }

    state.coins += coins;
    state.gems += gems;
    
    SaveSystem.markDirty();
    SaveSystem.forceSave();

    AudioManager.playSfx('ui_confirm');
    EventBus.emit('coinsChanged', state.coins);
    if (gems > 0) EventBus.emit('gemsChanged', state.gems);
  }
}
