// src/systems/CaptureSystem.ts
import { Creature, Rope } from '../data/types';
import { DataLoader } from '../data/DataLoader';
import { SaveSystem } from './SaveSystem';

export interface CaptureResult {
  success: boolean;
  successChance: number;
  roll: number;
  timingGrade: 'Perfect' | 'Good' | 'Miss';
  xpAwarded: number;
  coinsAwarded: number;
}

export class CaptureSystem {
  public static calculateCaptureChance(
    creature: Creature,
    rope: Rope,
    timingGrade: 'Perfect' | 'Good' | 'Miss',
    whipHitCount: number = 0,
    whipWeakeningPower: number = 0,
    hasBait: boolean = false
  ): { chance: number; breakdown: Record<string, number> } {
    const state = SaveSystem.getState();
    const baseChance = 50;
    const ropePower = rope.capturePower;
    
    // Whip hit count weakens the creature's difficulty
    const baseDifficulty = creature.captureDifficulty;
    const weakenedDifficulty = Math.max(5, baseDifficulty - whipHitCount * whipWeakeningPower);

    let timingBonus = 0;
    if (timingGrade === 'Perfect') timingBonus = 20;
    else if (timingGrade === 'Good') timingBonus = 10;

    const baitBonus = hasBait ? 5 : 0;
    const perkBonus = Math.min(10, state.sanctuaryLevel - 1) * 2;

    const diffFactor = ropePower - weakenedDifficulty;
    
    let rawChance = baseChance + diffFactor + timingBonus + baitBonus + perkBonus;
    const finalChance = Math.max(5, Math.min(95, rawChance));

    return {
      chance: finalChance,
      breakdown: {
        baseChance,
        ropePower,
        creatureDifficulty: baseDifficulty,
        weakenedDifficulty,
        diffFactor,
        timingBonus,
        baitBonus,
        perkBonus,
        rawChance
      }
    };
  }

  public static attemptCapture(
    creature: Creature,
    timingGrade: 'Perfect' | 'Good' | 'Miss',
    whipHitCount: number = 0,
    whipWeakeningPower: number = 0,
    hasBait: boolean = false
  ): CaptureResult {
    const state = SaveSystem.getState();
    const rope = DataLoader.getRope(state.currentRopeId) || DataLoader.getRopes()[0];
    
    const { chance } = this.calculateCaptureChance(
      creature,
      rope,
      timingGrade,
      whipHitCount,
      whipWeakeningPower,
      hasBait
    );
    
    const roll = Math.floor(Math.random() * 100) + 1; // 1 to 100
    const success = roll <= chance;

    let xpAwarded = 0;
    let coinsAwarded = 0;

    if (success) {
      switch (creature.rarity) {
        case 'Common':
          xpAwarded = 20;
          coinsAwarded = 10;
          break;
        case 'Rare':
          xpAwarded = 45;
          coinsAwarded = 25;
          break;
        case 'Epic':
          xpAwarded = 100;
          coinsAwarded = 75;
          break;
        case 'Legendary':
          xpAwarded = 250;
          coinsAwarded = 200;
          break;
        case 'Mythic':
          xpAwarded = 600;
          coinsAwarded = 500;
          break;
      }

      if (timingGrade === 'Perfect') {
        xpAwarded = Math.floor(xpAwarded * 1.5);
        coinsAwarded = Math.floor(coinsAwarded * 1.5);
      } else if (timingGrade === 'Good') {
        xpAwarded = Math.floor(xpAwarded * 1.2);
        coinsAwarded = Math.floor(coinsAwarded * 1.2);
      }
    }

    return {
      success,
      successChance: chance,
      roll,
      timingGrade,
      xpAwarded,
      coinsAwarded
    };
  }

  public static getMinigameZones(
    creature: Creature,
    rope: Rope,
    whipHitCount: number = 0,
    whipWeakeningPower: number = 0
  ): {
    perfectWidth: number;
    goodWidth: number;
    center: number;
    sweepSpeed: number;
  } {
    const weakenedDifficulty = Math.max(5, creature.captureDifficulty - whipHitCount * whipWeakeningPower);
    const diff = rope.capturePower - weakenedDifficulty;
    
    const goodWidth = Math.max(12, Math.min(65, 30 + diff * 0.25));
    const perfectWidth = Math.max(3, goodWidth * 0.25);

    let baseSpeed = 1200;
    if (creature.rarity === 'Rare') baseSpeed = 1050;
    else if (creature.rarity === 'Epic') baseSpeed = 900;
    else if (creature.rarity === 'Legendary') baseSpeed = 800;
    else if (creature.rarity === 'Mythic') baseSpeed = 700;

    // Whipping makes creature angry/fast! Speed decreases by 18% per whip hit (lower duration = faster sweep)
    const speedMultiplier = Math.max(0.35, 1.0 - whipHitCount * 0.18);
    const sweepSpeed = Math.floor(baseSpeed * speedMultiplier);

    return {
      perfectWidth,
      goodWidth,
      center: 50,
      sweepSpeed
    };
  }
}
