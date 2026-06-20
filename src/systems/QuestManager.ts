// src/systems/QuestManager.ts
import { SaveSystem } from './SaveSystem';
import { EventBus } from './EventBus';

export interface DialogueStep {
  speaker: string;
  portrait: 'dr_evelyn' | 'keeper' | 'elder_oak' | 'researcher' | 'luna' | 'luna_information';
  portraitSide: 'left' | 'right';
  text: string;
}

export interface QuestObjective {
  type: 'catch_creature' | 'reach_level' | 'earn_coins';
  target: string | number; // creatureId, requiredLevel, or targetCoins
  requiredAmount: number;
  currentAmount: number;
  description: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  biome: string;
  objectives: QuestObjective[];
  unlockedBiomeId?: string; // Biome unlocked on turn-in
  dialogueIntro: DialogueStep[];
  dialogueIncomplete: DialogueStep[];
  dialogueComplete: DialogueStep[];
}

export class QuestManager {
  public static quests: Quest[] = [
    {
      id: 'quest_meadow_main',
      title: 'Meadow Explorer',
      description: 'Establish your presence in the Green Meadow by capturing creatures and earning capital.',
      biome: 'green_meadow',
      objectives: [
        {
          type: 'catch_creature',
          target: 'meadow_rabbit',
          requiredAmount: 3,
          currentAmount: 0,
          description: 'Catch 3 Meadow Rabbits'
        },
        {
          type: 'earn_coins',
          target: 500,
          requiredAmount: 500,
          currentAmount: 0,
          description: 'Accumulate 500 Coins'
        }
      ],
      unlockedBiomeId: 'whisper_forest',
      dialogueIntro: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Welcome to the Wild Haven Sanctuary! I am Dr. Evelyn, lead researcher here.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Our mission is to explore these biomes, save unique creatures, and build a cozy haven for them.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'To get started, we need to study Meadow Rabbits. Can you capture 3 of them and raise 500 coins to fund our forest research?' },
        { speaker: 'Keeper', portrait: 'keeper', portraitSide: 'right', text: 'Understood! I will use my lasso and look around the meadow.' }
      ],
      dialogueIncomplete: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'We still need more data. Please capture 3 Meadow Rabbits and ensure we have 500 coins to start the next biomes.' }
      ],
      dialogueComplete: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Incredible work, Keeper! The rabbits are safe in our sanctuary and our budget is fully funded.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'I have unlocked the gateway to the Whisper Forest. Be careful, the shadows are deep there!' }
      ]
    },
    {
      id: 'quest_forest_main',
      title: 'Forest Guardian',
      description: 'Explore the depths of Whisper Forest and locate a Silver Fox.',
      biome: 'whisper_forest',
      objectives: [
        {
          type: 'catch_creature',
          target: 'silver_fox',
          requiredAmount: 1,
          currentAmount: 0,
          description: 'Catch a Silver Fox'
        },
        {
          type: 'reach_level',
          target: 3,
          requiredAmount: 3,
          currentAmount: 0,
          description: 'Reach Keeper Level 3'
        }
      ],
      unlockedBiomeId: 'crystal_mountain',
      dialogueIntro: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Welcome to the Whisper Forest! The trees carry ancient magic.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Sightings of an elusive Silver Fox have been reported. Try to capture one.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Also, raise your Keeper level to 3 by training your creatures to ensure you are ready for high-altitude terrain.' }
      ],
      dialogueIncomplete: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'A Silver Fox is extremely agile. Make sure to level up your creatures in the sanctuary to reach Level 3.' }
      ],
      dialogueComplete: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Marvelous! The Silver Fox is magnificent, and you are becoming a skilled Keeper.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'I have prepared climbing gears. The path to Crystal Mountain is now open!' }
      ]
    },
    {
      id: 'quest_mountain_main',
      title: 'Mountain Climber',
      description: 'Ascend the frozen Crystal Mountain and study the Crystal Turtle.',
      biome: 'crystal_mountain',
      objectives: [
        {
          type: 'catch_creature',
          target: 'crystal_turtle',
          requiredAmount: 1,
          currentAmount: 0,
          description: 'Catch a Crystal Turtle'
        },
        {
          type: 'earn_coins',
          target: 2500,
          requiredAmount: 2500,
          currentAmount: 0,
          description: 'Accumulate 2,500 Coins'
        }
      ],
      unlockedBiomeId: 'golden_dunes',
      dialogueIntro: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Brrr! Crystal Mountain is freezing. We must study the heat-resistant shells of the Crystal Turtles.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Please secure one Crystal Turtle and accumulate 2,500 coins so we can fund our desert survival gear.' }
      ],
      dialogueIncomplete: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Keep warm, Keeper! Make sure you find a Crystal Turtle and save 2,500 coins for our dunes expedition.' }
      ],
      dialogueComplete: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Incredible work! The shell properties will keep us protected from extreme heat.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'The pathway to the Golden Dunes is now unlocked. Stay hydrated!' }
      ]
    },
    {
      id: 'quest_dunes_main',
      title: 'Desert Excavator',
      description: 'Survive the Golden Dunes and capture a Dune Beetle.',
      biome: 'golden_dunes',
      objectives: [
        {
          type: 'catch_creature',
          target: 'dune_beetle',
          requiredAmount: 1,
          currentAmount: 0,
          description: 'Catch a Dune Beetle'
        },
        {
          type: 'reach_level',
          target: 5,
          requiredAmount: 5,
          currentAmount: 0,
          description: 'Reach Keeper Level 5'
        }
      ],
      unlockedBiomeId: 'sky_island',
      dialogueIntro: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'The sandstorms here are blinding! We are searching for the Dune Beetle.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Capture one, and train your collection to reach Level 5. That will trigger the ancient gateway to the skies!' }
      ],
      dialogueIncomplete: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'The Dune Beetle nests deep in the dunes. Make sure you hit Level 5 so we can jumpstart the sky portal.' }
      ],
      dialogueComplete: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Astounding! The portal responded to your Level 5 badge.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'We can now ascend to the mythical Sky Island!' }
      ]
    },
    {
      id: 'quest_sky_main',
      title: 'Sky Savior',
      description: 'Find the legendary Phoenix nesting on the Sky Island.',
      biome: 'sky_island',
      objectives: [
        {
          type: 'catch_creature',
          target: 'phoenix',
          requiredAmount: 1,
          currentAmount: 0,
          description: 'Catch a Phoenix'
        },
        {
          type: 'reach_level',
          target: 8,
          requiredAmount: 8,
          currentAmount: 0,
          description: 'Reach Keeper Level 8'
        }
      ],
      dialogueIntro: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'We did it! We are standing on the floating islands of the sky.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'The legend is true: the Phoenix nests here. Tame the Phoenix and reach Level 8 to become the Ultimate Keeper!' }
      ],
      dialogueIncomplete: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'The Phoenix is a creature of pure flame. Only a level 8 Keeper can truly earn its respect.' }
      ],
      dialogueComplete: [
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'Spectacular! The Phoenix rises, and your bonds are unbreakable.' },
        { speaker: 'Dr. Evelyn', portrait: 'dr_evelyn', portraitSide: 'left', text: 'You have completed the story of Wild Haven! Thank you, Ultimate Keeper.' }
      ]
    }
  ];

  public static initQuests(): void {
    const state = SaveSystem.getState();
    if (!state.activeQuestId) {
      state.activeQuestId = this.quests[0].id;
      state.completedQuestIds = [];
      SaveSystem.markDirty();
    }
  }

  public static getQuest(id: string): Quest | undefined {
    return this.quests.find(q => q.id === id);
  }

  public static getActiveQuest(): Quest | undefined {
    const state = SaveSystem.getState();
    this.initQuests();
    return this.quests.find(q => q.id === state.activeQuestId);
  }

  public static isCompleted(id: string): boolean {
    const state = SaveSystem.getState();
    return state.completedQuestIds?.includes(id) || false;
  }

  public static getObjectivesProgress(): QuestObjective[] {
    const active = this.getActiveQuest();
    if (!active) return [];

    const state = SaveSystem.getState();
    
    // Deep clone objectives to update current progress on the fly
    return active.objectives.map(obj => {
      let current = 0;
      if (obj.type === 'catch_creature') {
        current = state.ownedCreatures.filter(c => c.creatureId === obj.target).length;
      } else if (obj.type === 'reach_level') {
        current = state.level;
      } else if (obj.type === 'earn_coins') {
        current = state.coins;
      }

      return {
        ...obj,
        currentAmount: current
      };
    });
  }

  public static canTurnInActiveQuest(): boolean {
    const progress = this.getObjectivesProgress();
    if (progress.length === 0) return false;
    return progress.every(obj => obj.currentAmount >= obj.requiredAmount);
  }

  public static turnInActiveQuest(): { success: boolean; unlockedBiome?: string } {
    if (!this.canTurnInActiveQuest()) {
      return { success: false };
    }

    const state = SaveSystem.getState();
    const active = this.getActiveQuest();
    if (!active) return { success: false };

    // Add to completed
    state.completedQuestIds = state.completedQuestIds || [];
    if (!state.completedQuestIds.includes(active.id)) {
      state.completedQuestIds.push(active.id);
    }

    // Unlock biome if specified
    const unlockedBiome = active.unlockedBiomeId;
    if (unlockedBiome) {
      if (!state.unlockedAreas.includes(unlockedBiome as any)) {
        state.unlockedAreas.push(unlockedBiome as any);
      }
    }

    // Set next quest
    const currentIndex = this.quests.findIndex(q => q.id === active.id);
    if (currentIndex !== -1 && currentIndex + 1 < this.quests.length) {
      state.activeQuestId = this.quests[currentIndex + 1].id;
    } else {
      state.activeQuestId = 'quest_completed_all';
    }

    SaveSystem.markDirty();
    SaveSystem.forceSave();

    EventBus.emit('questTurnedIn', active.id);
    if (unlockedBiome) {
      EventBus.emit('biomeUnlocked', unlockedBiome);
    }

    return { success: true, unlockedBiome };
  }
}
