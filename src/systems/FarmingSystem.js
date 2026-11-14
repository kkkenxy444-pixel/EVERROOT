import { ASSET_KEYS } from '../data/assetKeys.js';
import { computeCropStage, CROPS } from '../data/crops.js';
import { FARMING } from '../data/gameConfig.js';
import {
  isSeedUnlocked,
  ITEMS,
  SEED_ITEM_IDS,
  TOOL_IDS,
} from '../data/items.js';
import { Crop } from '../entities/Crop.js';
import { eventBus, EVENTS } from './EventBus.js';

/**
 * Grid-based FarmingSystem for Milestone 2:
 * - Till soil (`tool_hoe` -> `dig` animation + `SFX_HOE_TILL` -> `soil_dry`)
 * - Plant seeds (`tool_seeds` -> `doing` animation + `SFX_SEED_PLANT` -> stage `00`)
 * - Water plots (`tool_water` -> `watering` animation + `SFX_WATERING_CAN` -> `watered = true`)
 * - Daily growth on sleep (`onNewDay`): ONLY watered crops advance stage (`00`..`05`);
 *   unwatered crops do not grow that day; `watered` resets to `false` each morning
 * - Harvest mature crops (`stage === 5` -> `doing` animation + `SFX_HARVEST_POP` -> stored in inventory)
 *
 * Communicates exclusively via `eventBus` without importing other systems directly.
 */
export class FarmingSystem {
  constructor(scene, gameState, isFarmableCallback, inventorySystem = null) {
    this.scene = scene;
    this.gameState = gameState;
    this.isFarmableTile = isFarmableCallback;
    this.inventorySystem = inventorySystem;

    if (!this.gameState.farmPlots || typeof this.gameState.farmPlots !== 'object') {
      this.gameState.farmPlots = {};
    }

    /** @type {Map<string, Crop>} */
    this.cropEntities = new Map();
    this.rainActive = false;

    this._restoreSavedPlots();
    this._bindEvents();
  }

  _bindEvents() {
    this._onDayAdvanced = () => this.onNewDay();
    // Rain waters planted plots once per rainy period (idempotent; growth still only on sleep)
    this._onWeatherChanged = (payload) => {
      this.rainActive = Boolean(payload && payload.raining);
      if (this.rainActive) this.applyRainWatering();
    };
    eventBus.on(EVENTS.DAY_ADVANCED, this._onDayAdvanced);
    eventBus.on(EVENTS.WEATHER_CHANGED, this._onWeatherChanged);
  }

  /**
   * Marks every planted plot as watered while it is raining.
   * Idempotent: plots that are already watered are skipped, and growth is only
   * applied by `onNewDay()`, so repeated calls never double growth.
   */
  applyRainWatering() {
    let changedCount = 0;
    for (const [key, plot] of Object.entries(this.gameState.farmPlots)) {
      if (!plot || typeof plot !== 'object') continue;
      if (!plot.cropId || plot.watered) continue;
      plot.watered = true;
      this._syncEntity(key, plot, false);
      changedCount += 1;
    }

    if (changedCount > 0) {
      eventBus.emit(EVENTS.FARM_PLOT_UPDATED, null);
      eventBus.emit(EVENTS.WEATHER_RAIN_WATERED, { count: changedCount });
    }
    return changedCount;
  }

  _restoreSavedPlots() {
    for (const [key, plot] of Object.entries(this.gameState.farmPlots)) {
      if (!plot || typeof plot !== 'object') continue;
      const entity = new Crop(this.scene, plot.tx, plot.ty, plot);
      this.cropEntities.set(key, entity);
    }
  }

  getPlot(tx, ty) {
    return this.gameState.farmPlots[`${tx},${ty}`] || null;
  }

  isHarvestReady(tx, ty) {
    const plot = this.getPlot(tx, ty);
    return Boolean(plot && plot.cropId && plot.stage >= FARMING.MAX_STAGE);
  }

  /**
   * Returns a short status string for the HUD interaction hint when aiming at a farm tile.
   */
  getPlotStatusHint(tx, ty) {
    const plot = this.getPlot(tx, ty);
    if (!plot) {
      if (this.isFarmableTile && this.isFarmableTile(tx, ty)) {
        return `Petak (${tx},${ty}): Kosong • Gunakan Cangkul`;
      }
      return '';
    }

    if (!plot.cropId) {
      const waterLabel = plot.watered ? 'Basah' : 'Kering';
      return `Petak (${tx},${ty}): Tanah ${waterLabel} • Siap Tanam Bibit`;
    }

    const cropDef = CROPS[plot.cropId];
    const name = cropDef ? cropDef.name : plot.cropId;
    if (plot.stage >= FARMING.MAX_STAGE) {
      return `★ ${name} Matang (Stage 0${plot.stage}/05) • Tekan [AKSI] Panen!`;
    }

    const waterStatus = plot.watered ? 'Sudah Disiram' : 'Belum Disiram!';
    return `${name} (Stage 0${plot.stage}/05 • ${waterStatus})`;
  }

  /**
   * Handles primary action on tile `(tx, ty)` with `toolId`.
   * Returns `{ handled, animAction, lockMs }`.
   */
  handleToolAction(toolId, tx, ty) {
    const key = `${tx},${ty}`;
    const isFarmable = this.isFarmableTile ? this.isFarmableTile(tx, ty) : false;
    const existingPlot = this.gameState.farmPlots[key] || null;

    // 1. If the targeted plot has a harvest-ready crop (stage 05), harvest it immediately!
    if (existingPlot && existingPlot.cropId && existingPlot.stage >= FARMING.MAX_STAGE) {
      this._harvestPlot(existingPlot);
      return {
        handled: true,
        animAction: 'doing',
        lockMs: FARMING.HARVEST_LOCK_MS,
      };
    }

    // 2. Hoe (Cangkul) -> Till soil
    if (toolId === TOOL_IDS.HOE) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_HOE_TILL);

      if (!isFarmable) {
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Tanah ini bukan petak kebun. Cangkul di area kebun!'
        );
        return { handled: true, animAction: 'dig', lockMs: FARMING.DIG_LOCK_MS };
      }

      if (!existingPlot) {
        const newPlot = {
          tx,
          ty,
          tilled: true,
          watered: false,
          cropId: null,
          stage: 0,
          daysPlanted: 0,
        };
        this.gameState.farmPlots[key] = newPlot;
        const entity = new Crop(this.scene, tx, ty, newPlot);
        this.cropEntities.set(key, entity);

        eventBus.emit(EVENTS.FARM_PLOT_UPDATED, newPlot);
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Tanah dicangkul! Pilih Kantung Bibit untuk menanam.'
        );
      } else if (existingPlot.cropId) {
        const cropDef = CROPS[existingPlot.cropId];
        const status = existingPlot.watered ? 'Sudah disiram' : 'Belum disiram';
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          `${cropDef?.name || existingPlot.cropId}: Stage 0${existingPlot.stage}/05 (${status})`
        );
      } else {
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Petak sudah dicangkul. Gunakan Kantung Bibit untuk menanam.'
        );
      }

      return { handled: true, animAction: 'dig', lockMs: FARMING.DIG_LOCK_MS };
    }

    // 3. Watering Can (Penyiram) -> Water tilled plot
    if (toolId === TOOL_IDS.WATERING_CAN) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_WATERING_CAN);

      if (existingPlot) {
        existingPlot.watered = true;
        this._syncEntity(key, existingPlot, false);
        eventBus.emit(EVENTS.FARM_PLOT_UPDATED, existingPlot);

        if (existingPlot.cropId) {
          const cropDef = CROPS[existingPlot.cropId];
          eventBus.emit(
            EVENTS.TOAST_MESSAGE,
            `${cropDef?.name || 'Tanaman'} disiram! (Stage 0${existingPlot.stage}/05)`
          );
        } else {
          eventBus.emit(EVENTS.TOAST_MESSAGE, 'Petak tanah disiram.');
        }
      } else if (isFarmable) {
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Cangkul tanah dulu sebelum menyiram!'
        );
      }

      return {
        handled: true,
        animAction: 'watering',
        lockMs: FARMING.WATER_LOCK_MS,
      };
    }

    // 4. Seed Bag (Kantung Bibit) -> Plant active seed on tilled plot
    if (toolId === TOOL_IDS.SEEDS) {
      if (!isFarmable) {
        eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Tanam bibit di area petak kebun!'
        );
        return { handled: true, animAction: null, lockMs: 0 };
      }

      if (!existingPlot) {
        eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Cangkul tanah dulu dengan Cangkul sebelum menanam!'
        );
        return { handled: true, animAction: null, lockMs: 0 };
      }

      if (existingPlot.cropId) {
        const cropDef = CROPS[existingPlot.cropId];
        const status = existingPlot.watered ? 'Sudah disiram' : 'Perlu disiram!';
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          `${cropDef?.name || 'Tanaman'} sedang tumbuh (Stage 0${existingPlot.stage}/05 • ${status})`
        );
        return { handled: true, animAction: null, lockMs: 0 };
      }

      // Ensure we have a valid unlocked & owned seed with stock > 0
      let seedId = this.gameState.selectedSeedId || SEED_ITEM_IDS[0];
      if (this.inventorySystem) {
        const valid = this.inventorySystem.ensureValidSelectedSeed();
        seedId = valid.seedId;
        if (valid.stock <= 0) {
          eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
          eventBus.emit(
            EVENTS.TOAST_MESSAGE,
            'Bibit habis! Beli bibit di Kios Bibit.'
          );
          return { handled: true, animAction: null, lockMs: 0 };
        }
      } else if (
        !isSeedUnlocked(seedId, this.gameState.day || 1) ||
        (this.gameState.inventory[seedId] || 0) <= 0
      ) {
        eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Bibit habis! Beli bibit di Kios Bibit.'
        );
        return { handled: true, animAction: null, lockMs: 0 };
      }

      const seedItem = ITEMS[seedId];
      const cropDef = seedItem ? CROPS[seedItem.cropId] : null;
      if (!cropDef) {
        return { handled: true, animAction: null, lockMs: 0 };
      }

      if (this.inventorySystem) {
        this.inventorySystem.removeItem(seedId, 1);
      } else {
        this.gameState.inventory[seedId] = Math.max(
          0,
          (this.gameState.inventory[seedId] || 0) - 1
        );
        eventBus.emit(
          EVENTS.SEED_CHANGED,
          seedId,
          this.gameState.inventory[seedId]
        );
        eventBus.emit(EVENTS.INVENTORY_UPDATED, this.gameState.inventory);
      }

      existingPlot.cropId = cropDef.id;
      existingPlot.stage = 0;
      existingPlot.daysPlanted = 0;
      // Planting during an active rain period starts already watered
      if (this.rainActive) existingPlot.watered = true;

      this._syncEntity(key, existingPlot, true);

      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_SEED_PLANT);
      eventBus.emit(EVENTS.FARM_PLOT_UPDATED, existingPlot);

      const waterReminder = existingPlot.watered
        ? 'Tanah sudah basah'
        : 'Jangan lupa disiram!';
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        `Tanam ${cropDef.name} (Stage 00/05) • ${waterReminder}`
      );

      return {
        handled: true,
        animAction: 'doing',
        lockMs: FARMING.PLANT_LOCK_MS,
      };
    }

    return { handled: false, animAction: null, lockMs: 0 };
  }

  _harvestPlot(plot) {
    const key = `${plot.tx},${plot.ty}`;
    const cropDef = CROPS[plot.cropId];
    if (!cropDef) return;

    const harvestId = cropDef.harvestItemId;

    if (this.inventorySystem) {
      if (!this.inventorySystem.canAddItem(harvestId, 1)) {
        eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Tas penuh! Jual hasil panen di Kotak Jual dulu.'
        );
        return;
      }
      this.inventorySystem.addItem(harvestId, 1);
    } else {
      this.gameState.inventory[harvestId] =
        (this.gameState.inventory[harvestId] || 0) + 1;
      eventBus.emit(EVENTS.INVENTORY_UPDATED, this.gameState.inventory);
    }

    const totalStored = this.gameState.inventory[harvestId] || 0;

    plot.cropId = null;
    plot.stage = 0;
    plot.daysPlanted = 0;

    this._syncEntity(key, plot, false);

    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_HARVEST_POP);
    eventBus.emit(EVENTS.FARM_PLOT_UPDATED, plot);
    eventBus.emit(
      EVENTS.TOAST_MESSAGE,
      `Panen +1 ${cropDef.name}! (Di tas: ${totalStored})`
    );
  }

  /**
   * Advances daily crop growth when the player sleeps to the next day:
   * - Watered crops grow by `cropDef.stagesPerDay` up to `FARMING.MAX_STAGE` (`05`)
   * - Unwatered crops do NOT grow on that day
   * - All plots reset `watered = false` for the new morning
   */
  onNewDay() {
    let grownCount = 0;
    let readyCount = 0;
    let unwateredCount = 0;

    for (const [key, plot] of Object.entries(this.gameState.farmPlots)) {
      if (!plot || typeof plot !== 'object') continue;
      let grew = false;

      if (plot.cropId && CROPS[plot.cropId]) {
        const cropDef = CROPS[plot.cropId];
        const maxStage = cropDef.maxStage || FARMING.MAX_STAGE;
        if (plot.stage < maxStage) {
          if (plot.watered) {
            const totalDays = cropDef.daysToGrow || maxStage;
            const prevDays =
              Number.isFinite(plot.daysPlanted) && plot.daysPlanted > 0
                ? plot.daysPlanted
                : plot.stage > 0
                  ? plot.stage
                  : 0;
            const nextDays = Math.min(totalDays, prevDays + 1);
            plot.daysPlanted = nextDays;
            plot.stage = Math.max(
              plot.stage,
              computeCropStage(nextDays, totalDays, maxStage)
            );
            grew = true;
            grownCount += 1;
          } else {
            unwateredCount += 1;
          }
        }
        if (plot.stage >= maxStage) {
          readyCount += 1;
        }
      }

      // Reset watered status every new morning
      plot.watered = false;
      this._syncEntity(key, plot, grew);
    }

    if (grownCount > 0) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_CROP_GROW);
    }

    eventBus.emit(EVENTS.FARM_ACTION_FEEDBACK, {
      grownCount,
      readyCount,
      unwateredCount,
    });

    return { grownCount, readyCount, unwateredCount };
  }

  _syncEntity(key, plot, animatePop = false) {
    let entity = this.cropEntities.get(key);
    if (!entity) {
      entity = new Crop(this.scene, plot.tx, plot.ty, plot);
      this.cropEntities.set(key, entity);
    } else {
      entity.sync(plot, animatePop);
    }
  }

  destroy() {
    eventBus.off(EVENTS.DAY_ADVANCED, this._onDayAdvanced);
    eventBus.off(EVENTS.WEATHER_CHANGED, this._onWeatherChanged);
    for (const entity of this.cropEntities.values()) {
      entity.destroy();
    }
    this.cropEntities.clear();
  }
}
