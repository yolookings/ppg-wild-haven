// src/systems/SaveSystem.ts
import { PlayerState } from '../data/types';
import { EventBus } from './EventBus';

const SAVE_KEY = 'wildhaven_save_v1';
const CURRENT_VERSION = 1;

export class SaveSystem {
  private static state: PlayerState;
  private static saveTimer: any = null;
  private static pendingChanges = false;

  public static createDefaultState(): PlayerState {
    const now = Date.now();
    return {
      version: CURRENT_VERSION,
      playerName: "Keeper",
      level: 1,
      xp: 0,
      coins: 200, // Friendly starting bonus
      gems: 10,
      ropesOwned: ['rope_basic'],
      currentRopeId: 'rope_basic',
      whipsOwned: ['whip_basic'],
      currentWhipId: 'whip_basic',
      magicFruits: 0,
      unlockedAreas: ['green_meadow'],
      ownedCreatures: [],
      discoveredCreatureIds: [],
      achievementsUnlocked: [],
      achievementProgress: {},
      sanctuaryLevel: 1,
      sanctuaryDecorSlots: 4, // 4 slots to start
      lastSavedAt: now,
      lastOnlineAt: now,
      dailyStreak: 0,
      lastDailyClaimAt: 0,
      settings: {
        musicVolume: 0.5,
        sfxVolume: 0.8,
        muted: false,
        reduceMotion: false
      }
    };
  }

  public static loadGame(): PlayerState {
    try {
      const serialized = localStorage.getItem(SAVE_KEY);
      if (!serialized) {
        this.state = this.createDefaultState();
        this.saveGame();
        return this.state;
      }

      const raw = JSON.parse(serialized);
      this.state = this.migrate(raw);
      
      // Keep track of last online time
      this.state.lastOnlineAt = Date.now();
      return this.state;
    } catch (error) {
      console.warn('Failed to load save from localStorage. Using in-memory state.', error);
      this.state = this.createDefaultState();
      return this.state;
    }
  }

  public static getState(): PlayerState {
    if (!this.state) {
      this.loadGame();
    }
    return this.state;
  }

  public static saveGame(): void {
    if (!this.state) return;
    
    this.state.lastSavedAt = Date.now();
    
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
      this.pendingChanges = false;
      EventBus.emit('gameSaved', this.state);
    } catch (error) {
      console.error('Failed to write save to localStorage', error);
    }
  }

  public static markDirty(): void {
    this.pendingChanges = true;
    if (!this.saveTimer) {
      this.saveTimer = setTimeout(() => {
        this.saveTimer = null;
        if (this.pendingChanges) {
          this.saveGame();
        }
      }, 15000); // Autosave every 15 seconds when dirty
    }
  }

  public static forceSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveGame();
  }

  public static resetGame(): PlayerState {
    this.state = this.createDefaultState();
    this.forceSave();
    EventBus.emit('gameReset', this.state);
    return this.state;
  }

  public static exportSaveCode(): string {
    const jsonStr = JSON.stringify(this.getState());
    return btoa(unescape(encodeURIComponent(jsonStr)));
  }

  public static importSaveCode(code: string): boolean {
    try {
      const decoded = decodeURIComponent(escape(atob(code)));
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === 'object' && 'version' in parsed) {
        this.state = this.migrate(parsed);
        this.forceSave();
        EventBus.emit('gameLoaded', this.state);
        return true;
      }
    } catch (error) {
      console.error('Failed to import save code', error);
    }
    return false;
  }

  private static migrate(raw: any): PlayerState {
    const defaultState = this.createDefaultState();
    
    // Simple deep merge with defaults to ensure new fields are populated
    const mergedSettings = { ...defaultState.settings, ...(raw.settings || {}) };
    
    const migrated: PlayerState = {
      ...defaultState,
      ...raw,
      settings: mergedSettings
    };

    // Apply specific version migrations if needed
    if (migrated.version < CURRENT_VERSION) {
      console.log(`Migrating save from version ${migrated.version} to ${CURRENT_VERSION}`);
      // Perform step-by-step migrations here in the future
      migrated.version = CURRENT_VERSION;
    }

    return migrated;
  }

  // Setup window listeners for autosaving on exit
  public static initAutoSaveListeners(): void {
    window.addEventListener('beforeunload', () => {
      if (this.pendingChanges) {
        this.forceSave();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.pendingChanges) {
        this.forceSave();
      }
    });
  }
}
