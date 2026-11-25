import { CROPS } from '../data/crops.js';
import {
  ECONOMY,
  FARMING,
  MAP_IDS,
  MAPS,
  SAVE,
  TIME,
  WORLD,
} from '../data/gameConfig.js';
import {
  isSeedUnlocked,
  SEED_ITEM_IDS,
  TOOL_IDS,
  TOOLS,
} from '../data/items.js';
import { sanitizeQuestState } from '../data/quests.js';
import { sanitizeNodesState } from '../data/resourceNodes.js';
import { eventBus, EVENTS } from './EventBus.js';
import { InventorySystem } from './InventorySystem.js';

/**
 * Handles versioned localStorage persistence (`SAVE.STORAGE_KEY` / `SAVE.VERSION = 2`).
 * - Autosaves when the player sleeps in the house or completes shop transactions
 * - Supports seamless migration from Milestone 2 (`version: 1`) flat `inventory` maps
 *   into Milestone 3 (`version: 2`) stacked `inventorySlots`
 * - Slot-count changes (12 -> 24 slots) need no version bump: `InventorySystem.sanitizeSlots`
 *   rebuilds the array to `INVENTORY.MAX_SLOTS`, keeping every stored entry and padding with empty slots
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
    const startDay = TIME.START_DAY;
    const candidateStartingSeeds = {
      seed_parsnip: ECONOMY.STARTING_SEEDS_PARSNIP,
      seed_carrot: ECONOMY.STARTING_SEEDS_CARROT,
      seed_sunflower: ECONOMY.STARTING_SEEDS_SUNFLOWER,
      seed_pumpkin: ECONOMY.STARTING_SEEDS_PUMPKIN,
    };
    const initialInventoryMap = {};
    for (const [seedId, count] of Object.entries(candidateStartingSeeds)) {
      if (isSeedUnlocked(seedId, startDay) && count > 0) {
        initialInventoryMap[seedId] = count;
      }
    }
    const inventorySlots =
      InventorySystem.createSlotsFromLegacyMap(initialInventoryMap);
    const inventory = InventorySystem.computeSummaryMap(inventorySlots);
    const defaultSeedId =
      SEED_ITEM_IDS.find((id) => isSeedUnlocked(id, startDay)) ||
      'seed_parsnip';

    return {
      version: SAVE.VERSION,
      savedAt: Date.now(),
      day: startDay,
      hour: TIME.START_HOUR,
      minute: TIME.START_MINUTE,
      coins: ECONOMY.STARTING_COINS,
      selectedToolId: TOOL_IDS.HOE,
      selectedSeedId: defaultSeedId,
      mapId: MAP_IDS.FARM,
      // Optional per-map positions. Legacy `player` is kept as a mirror of the current map.
      mapPositions: {
        [MAP_IDS.FARM]: {
          tileX: WORLD.SPAWN_TILE_X,
          tileY: WORLD.SPAWN_TILE_Y,
        },
        [MAP_IDS.VILLAGE]: {
          tileX: MAPS.village.spawn.tileX,
          tileY: MAPS.village.spawn.tileY,
        },
      },
      player: {
        tileX: WORLD.SPAWN_TILE_X,
        tileY: WORLD.SPAWN_TILE_Y,
      },
      inventorySlots,
      inventory,
      farmPlots: {},
      // Optional Paket 2b field: per-animal lastCollectedDay (empty = all ready)
      livestock: {},
      // Optional Fase 4 field: quest id -> 'aktif' | 'selesai' (empty = none taken)
      quests: {},
      // Optional node gathering field: node id -> respawnDay (empty = all intact)
      nodes: {},
    };
  }

  _sanitizeTilePosition(raw, mapDef, fallback) {
    const maxX = Math.max(1, mapDef.widthTiles - 2);
    const maxY = Math.max(1, mapDef.heightTiles - 2);
    const fallbackX = Number.isFinite(fallback?.tileX)
      ? fallback.tileX
      : mapDef.spawn.tileX;
    const fallbackY = Number.isFinite(fallback?.tileY)
      ? fallback.tileY
      : mapDef.spawn.tileY;
    return {
      tileX: Number.isFinite(raw?.tileX)
        ? Math.max(1, Math.min(maxX, Math.floor(raw.tileX)))
        : Math.max(1, Math.min(maxX, Math.floor(fallbackX))),
      tileY: Number.isFinite(raw?.tileY)
        ? Math.max(1, Math.min(maxY, Math.floor(raw.tileY)))
        : Math.max(1, Math.min(maxY, Math.floor(fallbackY))),
    };
  }

  /**
   * Sanitizes optional `mapPositions` using each map's own dimensions. Missing
   * entries fall back to the legacy `player` position (current map) or the map spawn.
   */
  _sanitizeMapPositions(parsed, mapId) {
    const source =
      parsed.mapPositions && typeof parsed.mapPositions === 'object'
        ? parsed.mapPositions
        : null;
    const positions = {};
    for (const id of Object.keys(MAPS)) {
      const def = MAPS[id];
      const raw = source ? source[id] : null;
      const legacy = id === mapId ? parsed.player : null;
      positions[id] = this._sanitizeTilePosition(
        raw,
        def,
        legacy || def.spawn
      );
    }
    return positions;
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

      const mapId = MAPS[parsed.mapId] ? parsed.mapId : MAP_IDS.FARM;
      const mapPositions = this._sanitizeMapPositions(
        parsed,
        mapId
      );
      const currentPos = mapPositions[mapId];

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

      const unlockedSeedIds = SEED_ITEM_IDS.filter((id) =>
        isSeedUnlocked(id, day)
      );
      const ownedUnlockedSeedIds = unlockedSeedIds.filter(
        (id) => (inventory[id] || 0) > 0
      );
      let selectedSeedId = parsed.selectedSeedId;
      if (ownedUnlockedSeedIds.length > 0) {
        if (!ownedUnlockedSeedIds.includes(selectedSeedId)) {
          selectedSeedId = ownedUnlockedSeedIds[0];
        }
      } else if (!unlockedSeedIds.includes(selectedSeedId)) {
        selectedSeedId = unlockedSeedIds[0] || base.selectedSeedId;
      }

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

      // Optional livestock field: old saves without it load as "all animals ready"
      const livestock = {};
      if (parsed.livestock && typeof parsed.livestock === 'object') {
        for (const [animalId, entry] of Object.entries(parsed.livestock)) {
          if (typeof animalId !== 'string' || !animalId) continue;
          if (!entry || typeof entry !== 'object') continue;
          const lastDay = Number(entry.lastCollectedDay);
          if (!Number.isFinite(lastDay) || lastDay < 0) continue;
          livestock[animalId] = { lastCollectedDay: Math.floor(lastDay) };
        }
      }

      // Optional quest field: old saves without it stay empty (status derived from day)
      const quests = sanitizeQuestState(parsed.quests);

      // Optional resource nodes field: old saves without it load with all nodes intact
      const nodes = sanitizeNodesState(parsed.nodes);

      return {
        version: SAVE.VERSION,
        savedAt: Number.isFinite(parsed.savedAt) ? parsed.savedAt : Date.now(),
        day,
        hour,
        minute,
        coins,
        selectedToolId,
        selectedSeedId,
        mapId,
        mapPositions,
        player: {
          tileX: currentPos.tileX,
          tileY: currentPos.tileY,
        },
        inventorySlots,
        inventory,
        farmPlots,
        livestock,
        quests,
        nodes,
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
