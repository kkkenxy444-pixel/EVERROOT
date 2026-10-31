import { CROPS } from '../data/crops.js';
import { ECONOMY, FARMING, SAVE, TIME, WORLD } from '../data/gameConfig.js';
import { SEED_ITEM_IDS, TOOL_IDS, TOOLS } from '../data/items.js';
import { eventBus, EVENTS } from './EventBus.js';
import { InventorySystem } from './InventorySystem.js';

/**
 * Handles versioned localStorage persistence (`SAVE.STORAGE_KEY` / `SAVE.VERSION = 2`).
 * - Autosaves when the player sleeps in the house or completes shop transactions
 * - Supports seamless migration from Milestone 2 (`version: 1`) flat `inventory` maps
 *   into Milestone 3 (`version: 2`) stacked `inventorySlots`
 * - Safely handles corrupted JSON or invalid fields without crashing
 */
class SaveSystemClass {
  constructor() {
    this._memorySave = null;
    this.lastLoadRecoveredFromCorruption = false;
  }

  _readRaw() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(SAVE.STORAGE_KEY);
        if (val !== null) return val;
      }
    } catch {
      // localStorage blocked/unavailable; fall back to in-memory save
    }
    return this._memorySave;
  }

  _writeRaw(jsonStr) {
    this._memorySave = jsonStr;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SAVE.STORAGE_KEY, jsonStr);
      }
      return true;
    } catch {
      // Quota or security error; in-memory save still holds the snapshot
      return true;
    }
  }

  _removeRaw() {
    this._memorySave = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(SAVE.STORAGE_KEY);
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Returns a fresh default state for a new game.
   */
  createDefaultState() {
    const initialInventoryMap = {
      seed_parsnip: ECONOMY.STARTING_SEEDS_PARSNIP,
      seed_carrot: ECONOMY.STARTING_SEEDS_CARROT,
      seed_sunflower: ECONOMY.STARTING_SEEDS_SUNFLOWER,
      seed_pumpkin: ECONOMY.STARTING_SEEDS_PUMPKIN,
      crop_parsnip: 0,
      crop_carrot: 0,
      crop_sunflower: 0,
      crop_pumpkin: 0,
      fish_small: 0,
      fish_medium: 0,
      fish_large: 0,
    };
    const inventorySlots =
      InventorySystem.createSlotsFromLegacyMap(initialInventoryMap);
    const inventory = InventorySystem.computeSummaryMap(inventorySlots);

    return {
      version: SAVE.VERSION,
      savedAt: Date.now(),
      day: TIME.START_DAY,
      hour: TIME.START_HOUR,
      minute: TIME.START_MINUTE,
      coins: ECONOMY.STARTING_COINS,
      selectedToolId: TOOL_IDS.HOE,
      selectedSeedId: 'seed_parsnip',
      player: {
        tileX: WORLD.SPAWN_TILE_X,
        tileY: WORLD.SPAWN_TILE_Y,
      },
      inventorySlots,
      inventory,
      farmPlots: {},
    };
  }

  _isSupportedVersion(ver) {
    return ver === SAVE.VERSION || ver === SAVE.LEGACY_VERSION;
  }

  /**
   * Checks whether a valid save with a supported version (v1 or v2) exists in localStorage (or memory fallback).
   */
  hasSave() {
    try {
      const raw = this._readRaw();
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(
        parsed &&
          typeof parsed === 'object' &&
          this._isSupportedVersion(parsed.version) &&
          Number.isFinite(parsed.day) &&
          parsed.day >= 1
      );
    } catch {
      return false;
    }
  }

  /**
   * Loads saved state from localStorage, migrating v1 flat `inventory` maps into v2 `inventorySlots`
   * and falling back safely to default values if the save is corrupted or from an unknown version.
   */
  load() {
    const base = this.createDefaultState();
    this.lastLoadRecoveredFromCorruption = false;
    try {
      const raw = this._readRaw();
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !this._isSupportedVersion(parsed.version)
      ) {
        this.lastLoadRecoveredFromCorruption = true;
        return base;
      }

      const day = Number.isFinite(parsed.day)
        ? Math.max(1, Math.floor(parsed.day))
        : base.day;
      const hour = Number.isFinite(parsed.hour)
        ? Math.max(
            TIME.START_HOUR,
            Math.min(TIME.END_OF_DAY_HOUR - 1, Math.floor(parsed.hour))
          )
        : base.hour;
      const minute = Number.isFinite(parsed.minute)
        ? Math.max(0, Math.min(59, Math.floor(parsed.minute)))
        : base.minute;
      const coins = Number.isFinite(parsed.coins)
        ? Math.max(0, Math.floor(parsed.coins))
        : base.coins;

      const validToolIds = new Set(TOOLS.map((t) => t.id));
      const selectedToolId = validToolIds.has(parsed.selectedToolId)
        ? parsed.selectedToolId
        : base.selectedToolId;

      const selectedSeedId = SEED_ITEM_IDS.includes(parsed.selectedSeedId)
        ? parsed.selectedSeedId
        : base.selectedSeedId;

      const pTileX = Number.isFinite(parsed.player?.tileX)
        ? Math.max(
            1,
            Math.min(WORLD.WIDTH_TILES - 2, Math.floor(parsed.player.tileX))
          )
        : base.player.tileX;
      const pTileY = Number.isFinite(parsed.player?.tileY)
        ? Math.max(
            1,
            Math.min(WORLD.HEIGHT_TILES - 2, Math.floor(parsed.player.tileY))
          )
        : base.player.tileY;

      let inventorySlots;
      if (Array.isArray(parsed.inventorySlots)) {
        inventorySlots = InventorySystem.sanitizeSlots(parsed.inventorySlots);
      } else if (parsed.inventory && typeof parsed.inventory === 'object') {
        inventorySlots = InventorySystem.createSlotsFromLegacyMap(
          parsed.inventory
        );
      } else {
        inventorySlots = base.inventorySlots;
      }
      const inventory = InventorySystem.computeSummaryMap(inventorySlots);

      const farmPlots = {};
      if (parsed.farmPlots && typeof parsed.farmPlots === 'object') {
        for (const [plotKey, plot] of Object.entries(parsed.farmPlots)) {
          if (!plot || typeof plot !== 'object') continue;
          const tx = Number(plot.tx);
          const ty = Number(plot.ty);
          if (!Number.isInteger(tx) || !Number.isInteger(ty)) continue;
          const key = `${tx},${ty}`;
          if (plotKey !== key) continue;

          const cropId =
            typeof plot.cropId === 'string' && CROPS[plot.cropId]
              ? plot.cropId
              : null;
          const stage =
            cropId && Number.isFinite(plot.stage)
              ? Math.max(0, Math.min(FARMING.MAX_STAGE, Math.floor(plot.stage)))
              : 0;
          const daysPlanted =
            cropId && Number.isFinite(plot.daysPlanted)
              ? Math.max(0, Math.floor(plot.daysPlanted))
              : 0;

          farmPlots[key] = {
            tx,
            ty,
            tilled: true,
            watered: Boolean(plot.watered),
            cropId,
            stage,
            daysPlanted,
          };
        }
      }

      return {
        version: SAVE.VERSION,
        savedAt: Number.isFinite(parsed.savedAt) ? parsed.savedAt : Date.now(),
        day,
        hour,
        minute,
        coins,
        selectedToolId,
        selectedSeedId,
        player: {
          tileX: pTileX,
          tileY: pTileY,
        },
        inventorySlots,
        inventory,
        farmPlots,
      };
    } catch {
      this.lastLoadRecoveredFromCorruption = true;
      return base;
    }
  }

  /**
   * Saves state snapshot to localStorage (or in-memory fallback) with version number.
   */
  save(stateSnapshot) {
    try {
      const payload = {
        ...stateSnapshot,
        version: SAVE.VERSION,
        savedAt: Date.now(),
      };
      this._writeRaw(JSON.stringify(payload));
      eventBus.emit(EVENTS.GAME_SAVED, payload);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes saved data from localStorage (and in-memory fallback).
   */
  clear() {
    return this._removeRaw();
  }
}

export const SaveSystem = new SaveSystemClass();
