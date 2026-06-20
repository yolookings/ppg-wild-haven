// src/utils/CreatureVisuals.ts
import { Creature } from '../data/types';

export interface CreatureVisualInfo {
  spriteKey: string;
  tint: number;
  scaleMult: number;
  isAnimated?: boolean;
  animalType?: string;
}

export class CreatureVisuals {
  // Map creature IDs to fallback char.png frame positions
  private static readonly CREATURE_SPRITE_MAP: Record<string, string> = {
    // Green Meadow
    meadow_rabbit: 'animal_hare_idle',
    field_sparrow: 'animal_black_grouse_idle',
    spotted_fawn: 'animal_deer_idle',
    honey_badger: 'animal_boar_idle',
    clover_stag: 'animal_deer_idle',
    golden_hare: 'animal_hare_idle',
    jackalope: 'animal_hare_idle',
    // Whisper Forest
    forest_squirrel: 'animal_fox_idle',
    mossy_toad: 'creature_slime',
    silver_fox: 'animal_fox_idle',
    luminous_moth: 'creature_glow_orb',
    shadow_lynx: 'animal_fox_idle',
    elder_owl: 'animal_black_grouse_idle',
    cerberus: 'creature_threeheads',
    // Crystal Mountain
    pebble_goat: 'creature_golem',
    frost_hare: 'animal_hare_idle',
    crystal_turtle: 'creature_shell',
    snow_fox: 'animal_fox_idle',
    geode_golem: 'creature_golem',
    aurora_wolf: 'creature_celestial',
    // Golden Dunes
    dune_beetle: 'creature_slime',
    desert_lizard: 'animal_fox_idle',
    sun_falcon: 'creature_flame',
    cactus_camel: 'creature_shell',
    mirage_jackal: 'creature_jelly',
    desert_spirit: 'creature_glow_orb',
    t_rex: 'animal_boar_idle',
    // Sky Island
    cloud_sprite: 'creature_glow_orb',
    sky_mouse: 'creature_slime',
    wind_serpent: 'creature_jelly',
    star_rabbit: 'creature_celestial',
    thunder_drake: 'creature_dragon',
    celestial_stag: 'creature_celestial',
    phoenix: 'creature_flame',
    moonlight_unicorn: 'creature_celestial',
    pegasus: 'creature_winged',
    dragon: 'creature_dragon',
  };

  public static getVisuals(creature: Creature): CreatureVisualInfo {
    let spriteKey = CreatureVisuals.CREATURE_SPRITE_MAP[creature.id] || 'char_creature_meadow_rabbit';

    let tint = 0xffffff;
    let scaleMult = 1.0;
    let isAnimated = false;
    let animalType = '';

    // Define tints and scales for species variation
    switch (creature.id) {
      // Meadow Area
      case 'meadow_rabbit':
        tint = 0xffffff;
        scaleMult = 1.0;
        isAnimated = true;
        animalType = 'hare';
        break;
      case 'field_sparrow':
        tint = 0xe5c185;
        scaleMult = 0.8;
        isAnimated = true;
        animalType = 'black_grouse';
        break;
      case 'spotted_fawn':
        tint = 0xe5a365;
        scaleMult = 1.25;
        isAnimated = true;
        animalType = 'deer';
        break;
      case 'honey_badger':
        tint = 0x555555;
        scaleMult = 1.05;
        isAnimated = true;
        animalType = 'boar';
        break;
      case 'clover_stag':
        tint = 0x80b060;
        scaleMult = 1.4;
        isAnimated = true;
        animalType = 'deer';
        break;
      case 'golden_hare':
        tint = 0xffd700;
        scaleMult = 1.1;
        isAnimated = true;
        animalType = 'hare';
        break;
      case 'jackalope':
        tint = 0xd2b48c;
        scaleMult = 1.15;
        isAnimated = true;
        animalType = 'hare';
        break;

      // Forest Area
      case 'forest_squirrel':
        tint = 0xb05a30; // Squirrel Red-Brown
        scaleMult = 0.85;
        isAnimated = true;
        animalType = 'fox'; // squirrel mapped to fox walk
        break;
      case 'mossy_toad':
        tint = 0x709050;
        scaleMult = 0.85;
        spriteKey = 'creature_slime';
        isAnimated = false;
        animalType = '';
        break;
      case 'silver_fox':
        tint = 0xd0d0e0;
        scaleMult = 1.0;
        isAnimated = true;
        animalType = 'fox';
        break;
      case 'luminous_moth':
        tint = 0x80e0ff;
        scaleMult = 0.9;
        spriteKey = 'creature_glow_orb';
        isAnimated = false;
        animalType = '';
        break;
      case 'shadow_lynx':
        tint = 0x302040;
        scaleMult = 1.2;
        isAnimated = true;
        animalType = 'fox';
        break;
      case 'elder_owl':
        tint = 0x908070;
        scaleMult = 1.1;
        isAnimated = true;
        animalType = 'black_grouse';
        break;
      case 'cerberus':
        tint = 0x503030;
        scaleMult = 1.5;
        spriteKey = 'creature_threeheads';
        isAnimated = false;
        animalType = '';
        break;

      // Mountain Area
      case 'pebble_goat':
        tint = 0x90a0a0;
        scaleMult = 1.2;
        spriteKey = 'creature_golem';
        isAnimated = false;
        animalType = '';
        break;
      case 'frost_hare':
        tint = 0xe0f8ff;
        scaleMult = 0.95;
        isAnimated = true;
        animalType = 'hare';
        break;
      case 'crystal_turtle':
        tint = 0x40e0d0;
        scaleMult = 0.95;
        spriteKey = 'creature_shell';
        isAnimated = false;
        animalType = '';
        break;
      case 'snow_fox':
        tint = 0xa0d0ff;
        scaleMult = 1.05;
        isAnimated = true;
        animalType = 'fox';
        break;
      case 'geode_golem':
        tint = 0x9040c0;
        scaleMult = 1.3;
        spriteKey = 'creature_golem';
        isAnimated = false;
        animalType = '';
        break;
      case 'aurora_wolf':
        tint = 0x00ffaa;
        scaleMult = 1.3;
        spriteKey = 'creature_celestial';
        isAnimated = false;
        animalType = '';
        break;

      // Dunes Area
      case 'dune_beetle':
        tint = 0x4a3b32;
        scaleMult = 0.85;
        spriteKey = 'creature_slime';
        isAnimated = false;
        animalType = '';
        break;
      case 'desert_lizard':
        tint = 0xe8c87d;
        scaleMult = 0.85;
        isAnimated = true;
        animalType = 'fox';
        break;
      case 'sun_falcon':
        tint = 0xffaa44;
        scaleMult = 1.1;
        spriteKey = 'creature_flame';
        isAnimated = false;
        animalType = '';
        break;
      case 'cactus_camel':
        tint = 0x8a9a86;
        scaleMult = 1.25;
        spriteKey = 'creature_shell';
        isAnimated = false;
        animalType = '';
        break;
      case 'mirage_jackal':
        tint = 0xffbb88;
        scaleMult = 1.1;
        spriteKey = 'creature_jelly';
        isAnimated = false;
        animalType = '';
        break;
      case 'desert_spirit':
        tint = 0xd8b589;
        scaleMult = 1.2;
        spriteKey = 'creature_glow_orb';
        isAnimated = false;
        animalType = '';
        break;
      case 't_rex':
        tint = 0xa52a2a;
        scaleMult = 1.6;
        isAnimated = true;
        animalType = 'boar';
        break;

      // Sky Area
      case 'cloud_sprite':
        tint = 0xa0e0ff;
        scaleMult = 0.9;
        spriteKey = 'creature_glow_orb';
        isAnimated = false;
        animalType = '';
        break;
      case 'sky_mouse':
        tint = 0xffffff;
        scaleMult = 0.85;
        spriteKey = 'creature_slime';
        isAnimated = false;
        animalType = '';
        break;
      case 'wind_serpent':
        tint = 0x70e0b0;
        scaleMult = 1.2;
        spriteKey = 'creature_jelly';
        isAnimated = false;
        animalType = '';
        break;
      case 'star_rabbit':
        tint = 0x604080;
        scaleMult = 1.0;
        spriteKey = 'creature_celestial';
        isAnimated = false;
        animalType = '';
        break;
      case 'thunder_drake':
        tint = 0xffea00;
        scaleMult = 1.3;
        spriteKey = 'creature_dragon';
        isAnimated = false;
        animalType = '';
        break;
      case 'celestial_stag':
        tint = 0x8a2be2;
        scaleMult = 1.4;
        spriteKey = 'creature_celestial';
        isAnimated = false;
        animalType = '';
        break;
      case 'phoenix':
        tint = 0xff5722;
        scaleMult = 1.3;
        spriteKey = 'creature_flame';
        isAnimated = false;
        animalType = '';
        break;
      case 'moonlight_unicorn':
        tint = 0xe6f2ff;
        scaleMult = 1.35;
        spriteKey = 'creature_celestial';
        isAnimated = false;
        animalType = '';
        break;
      case 'pegasus':
        tint = 0xf0f5ff;
        scaleMult = 1.4;
        spriteKey = 'creature_winged';
        isAnimated = false;
        animalType = '';
        break;
      case 'dragon':
        tint = 0xd50000;
        scaleMult = 1.6;
        spriteKey = 'creature_dragon';
        isAnimated = false;
        animalType = '';
        break;
    }

    return { spriteKey, tint, scaleMult, isAnimated, animalType };
  }
}
