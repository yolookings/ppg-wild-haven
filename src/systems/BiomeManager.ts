// src/systems/BiomeManager.ts
import { AreaId } from '../data/types';
import { QuestManager } from './QuestManager';

export class BiomeManager {
  private static biomeGates: Record<AreaId, string> = {
    'green_meadow': '', // Meadow is always unlocked
    'whisper_forest': 'quest_meadow_main',
    'crystal_mountain': 'quest_forest_main',
    'golden_dunes': 'quest_mountain_main',
    'sky_island': 'quest_dunes_main'
  };

  /**
   * Check if the player can travel to a given area.
   */
  public static canTravelTo(areaId: AreaId): { allowed: boolean; error?: string } {
    // Green Meadow is always accessible
    if (areaId === 'green_meadow') {
      return { allowed: true };
    }

    const requiredQuestId = this.biomeGates[areaId];
    if (!requiredQuestId) {
      return { allowed: true };
    }

    // Check if the previous area's quest is completed
    if (!QuestManager.isCompleted(requiredQuestId)) {
      const quest = QuestManager.getQuest(requiredQuestId);
      return {
        allowed: false,
        error: `Complete the quest "${quest?.title || 'Story Quest'}" to unlock the ${this.getBiomeName(areaId)}!`
      };
    }

    return { allowed: true };
  }

  private static getBiomeName(areaId: AreaId): string {
    switch (areaId) {
      case 'green_meadow': return 'Green Meadow';
      case 'whisper_forest': return 'Whisper Forest';
      case 'crystal_mountain': return 'Crystal Mountain';
      case 'golden_dunes': return 'Golden Dunes';
      case 'sky_island': return 'Sky Island';
      default: return 'New Biome';
    }
  }
}
