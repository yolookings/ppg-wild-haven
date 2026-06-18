// src/data/DataLoader.ts
import { Creature, Area, Rope, Whip, BreedingRecipe, Achievement } from './types';

export class DataLoader {
  private static creatures: Creature[] = [];
  private static areas: Area[] = [];
  private static ropes: Rope[] = [];
  private static whips: Whip[] = [];
  private static breedingRecipes: BreedingRecipe[] = [];
  private static achievements: Achievement[] = [];

  public static initialize(cache: Phaser.Cache.CacheManager): void {
    const rawCreatures = cache.json.get('creatures_data');
    const rawAreas = cache.json.get('areas_data');
    const rawRopes = cache.json.get('ropes_data');
    const rawWhips = cache.json.get('whips_data');
    const rawBreeding = cache.json.get('breeding_recipes_data');
    const rawAchievements = cache.json.get('achievements_data');

    if (rawCreatures && rawCreatures.creatures) {
      this.creatures = rawCreatures.creatures;
    }
    if (rawAreas && rawAreas.areas) {
      this.areas = rawAreas.areas;
    }
    if (rawRopes && rawRopes.ropes) {
      this.ropes = rawRopes.ropes;
    }
    if (rawWhips && rawWhips.whips) {
      this.whips = rawWhips.whips;
    }
    if (rawBreeding && rawBreeding.recipes) {
      this.breedingRecipes = rawBreeding.recipes;
    }
    if (rawAchievements && rawAchievements.achievements) {
      this.achievements = rawAchievements.achievements;
    }

    console.log('DataLoader initialized with:', {
      creatures: this.creatures.length,
      areas: this.areas.length,
      ropes: this.ropes.length,
      whips: this.whips.length,
      breedingRecipes: this.breedingRecipes.length,
      achievements: this.achievements.length
    });
  }

  public static getCreatures(): Creature[] {
    return this.creatures;
  }

  public static getCreature(id: string): Creature | undefined {
    return this.creatures.find(c => c.id === id);
  }

  public static getCreaturesByArea(areaId: string): Creature[] {
    return this.creatures.filter(c => c.area === areaId);
  }

  public static getAreas(): Area[] {
    return this.areas;
  }

  public static getArea(id: string): Area | undefined {
    return this.areas.find(a => a.id === id);
  }

  public static getRopes(): Rope[] {
    return this.ropes;
  }

  public static getRope(id: string): Rope | undefined {
    return this.ropes.find(r => r.id === id);
  }

  public static getWhips(): Whip[] {
    return this.whips;
  }

  public static getWhip(id: string): Whip | undefined {
    return this.whips.find(w => w.id === id);
  }

  public static getBreedingRecipes(): BreedingRecipe[] {
    return this.breedingRecipes;
  }

  public static getBreedingRecipe(parentA: string, parentB: string): BreedingRecipe | undefined {
    return this.breedingRecipes.find(
      r => (r.parentA === parentA && r.parentB === parentB) || 
           (r.parentA === parentB && r.parentB === parentA)
    );
  }

  public static getAchievements(): Achievement[] {
    return this.achievements;
  }

  public static getAchievement(id: string): Achievement | undefined {
    return this.achievements.find(a => a.id === id);
  }
}
