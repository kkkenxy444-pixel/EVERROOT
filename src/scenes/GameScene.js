import Phaser from 'phaser';
import { ASSET_KEYS } from '../data/assetKeys.js';
import {
  CAMERA,
  DEBUG,
  DEPTH,
  FARMING,
  GAME,
  getWorldZoom,
  isDebugModeEnabled,
  MAP_ZONES,
  SCENE_KEYS,
  TILE,
  TIME,
  UI,
} from '../data/gameConfig.js';
import { TOOL_IDS, TOOLS } from '../data/items.js';
import { Player } from '../entities/Player.js';
import { AudioManager } from '../systems/AudioManager.js';
import { eventBus, EVENTS } from '../systems/EventBus.js';
import { FarmingSystem } from '../systems/FarmingSystem.js';
import { FishingSystem } from '../systems/FishingSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { TimeSystem } from '../systems/TimeSystem.js';
import { WorldBuilder } from '../systems/WorldBuilder.js';

/**
 * GameScene:
 * Owns the outdoor world tilemap, Player entity, camera follow, physics collisions,
 * and coordinates gameplay systems (`InputSystem`, `WorldBuilder`, `InventorySystem`,
 * `FarmingSystem`, `FishingSystem`, `TimeSystem`, `SaveSystem`) via `eventBus`.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  init(data) {
    this.startMode = data?.mode || 'new';
  }

  create() {
    this.isSleeping = false;
    this.isShopOpen = false;
    this.debugEnabled = isDebugModeEnabled();
    this._lastGrowthReport = null;

    // 1. Load initial or saved state
    this.gameState =
      this.startMode === 'continue' && SaveSystem.hasSave()
        ? SaveSystem.load()
        : SaveSystem.createDefaultState();

    this.toolIndex = Math.max(
      0,
      TOOLS.findIndex((t) => t.id === this.gameState.selectedToolId)
    );

    // 2. Build outdoor map & static colliders
    this.worldBuilder = new WorldBuilder(this);
    const { widthPx, heightPx, colliders } = this.worldBuilder.build();
    this.worldWidthPx = widthPx;
    this.worldHeightPx = heightPx;
    this.physics.world.setBounds(0, 0, widthPx, heightPx);

    // Optional debug physics via `?debug=1`
    if (this.debugEnabled || DEBUG.PHYSICS) {
      this.physics.world.createDebugGraphic();
    }

    // 3. Spawn 3-layer Player entity
    const spawnX = this.gameState.player.tileX * TILE.SIZE + TILE.SIZE / 2;
    const spawnY = this.gameState.player.tileY * TILE.SIZE + TILE.SIZE / 2;
    this.player = new Player(this, spawnX, spawnY);
    this.physics.add.collider(this.player.container, colliders);

    // 4. Target tile cursor highlight (shows which grid tile the player is aiming at)
    this.targetCursor = this.add.graphics().setDepth(DEPTH.SOIL + 0.6);
    this._effectiveTarget = { tx: 0, ty: 0 };

    // 5. InventorySystem (slot-based stacking, owned-seed cycling, buy/sell transactions)
    this.inventorySystem = new InventorySystem(this.gameState, () =>
      this._saveCurrentState()
    );

    // 6. FarmingSystem (grid plots, Crop entities, tilling, planting, watering, daily growth, harvest)
    this.farmingSystem = new FarmingSystem(
      this,
      this.gameState,
      (tx, ty) => this.worldBuilder.isFarmableTile(tx, ty),
      this.inventorySystem
    );

    // 7. FishingSystem (casting, waiting, bite, reeling, caught + bobber)
    this.fishingSystem = new FishingSystem(this, {
      isWaterTile: (tx, ty) => this.worldBuilder.isWaterTile(tx, ty),
      getCatchableFishIds: () => this.inventorySystem.getCatchableFishIds(),
      addFishToInventory: (fishId) => this.inventorySystem.addItem(fishId, 1),
    });

    // 8. Day/Night phase overlay (camera-fixed tint rectangle) + TimeSystem
    const initW = this.scale.width || GAME.WIDTH;
    const initH = this.scale.height || GAME.HEIGHT;
    this.dayNightOverlay = this.add
      .rectangle(initW / 2, initH / 2, initW * 2, initH * 2, 0xffffff, 0)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY);

    this.timeSystem = new TimeSystem(this.gameState);
    this._applyPhaseOverlay(this.timeSystem.currentPhase, false);

    // 9. Camera follow with world bounds & integer zoom calculated from screen short edge
    const cam = this.cameras.main;
    cam.setBounds(0, 0, widthPx, heightPx);
    cam.setRoundPixels(true);
    this._updateCameraAndOverlay(initW, initH);
    cam.startFollow(this.player.container, true, CAMERA.LERP, CAMERA.LERP);
    cam.setDeadzone(CAMERA.DEADZONE_W, CAMERA.DEADZONE_H);
    cam.fadeIn(UI.FADE_MS, 0, 0, 0);

    // 10. InputSystem (keyboard + touch bridge)
    this.inputSystem = new InputSystem(this);

    // 11. Subscribe to action, tool, time, shop, fishing, and farming events
    this._bindEvents();

    // 12. Launch parallel UIScene overlay and emit initial state once UI is ready
    if (!this.scene.isActive(SCENE_KEYS.UI)) {
      this.scene.launch(SCENE_KEYS.UI, {
        gameScene: this,
      });
    }
    this.time.delayedCall(20, () => {
      if (this.timeSystem) {
        this.timeSystem.emitInitialState();
      }
      if (this.inventorySystem) {
        this.inventorySystem.emitState();
      }
      if (SaveSystem.lastLoadRecoveredFromCorruption) {
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Data save rusak terdeteksi — memuat data aman default.'
        );
      }
    });

    // 13. Audio BGM & ambience for current phase
    AudioManager.playSceneBgm(
      SCENE_KEYS.GAME,
      this.timeSystem.currentPhase?.id || 'pagi'
    );
  }

  _bindEvents() {
    this._onAction = () => this._handlePrimaryAction();
    this._onCycleTool = () => this._cycleTool(1);
    this._onSelectTool = (idx) => {
      if (this.isSleeping || this.isShopOpen) return;
      if (idx >= 0 && idx < TOOLS.length) {
        this.toolIndex = idx;
        this._emitToolChanged();
      }
    };
    this._onPhaseChanged = (phase) => {
      this._applyPhaseOverlay(phase, true);
    };
    this._onConfirmSleep = (opts) => {
      this._startSleepSequence(Boolean(opts?.autoSleep));
    };
    this._onFarmFeedback = (report) => {
      this._lastGrowthReport = report;
    };
    this._onFarmPlotUpdated = () => {
      // Force target cursor & hint refresh and persist latest plot/watered state
      this._lastCursorTx = -1;
      this._lastCursorTy = -1;
      this._saveCurrentState();
    };
    this._onOpenShop = () => {
      this.isShopOpen = true;
      if (this.inputSystem) {
        this.inputSystem.enabled = false;
        this.inputSystem.setTouchVector(0, 0);
      }
      if (this.player) {
        this.player.setLockedStateAnimation('idle');
        this.player.unlockAction();
        this.player.container.body.setVelocity(0, 0);
      }
    };
    this._onCloseShop = () => {
      this.isShopOpen = false;
      if (this.inputSystem && !this.isSleeping) {
        this.inputSystem.enabled = true;
      }
      this._saveCurrentState();
    };
    this._onDebugNextDay = () => {
      if (!this.debugEnabled) return;
      this._debugAdvanceDayImmediate();
    };

    this._onResize = (gameSize) => {
      const w = gameSize?.width || this.scale?.width || GAME.WIDTH;
      const h = gameSize?.height || this.scale?.height || GAME.HEIGHT;
      this._updateCameraAndOverlay(w, h);
    };

    eventBus.on(EVENTS.INPUT_ACTION, this._onAction);
    eventBus.on(EVENTS.INPUT_CYCLE_TOOL, this._onCycleTool);
    eventBus.on(EVENTS.INPUT_SELECT_TOOL, this._onSelectTool);
    eventBus.on(EVENTS.PHASE_CHANGED, this._onPhaseChanged);
    eventBus.on(EVENTS.CONFIRM_SLEEP, this._onConfirmSleep);
    eventBus.on(EVENTS.FARM_ACTION_FEEDBACK, this._onFarmFeedback);
    eventBus.on(EVENTS.FARM_PLOT_UPDATED, this._onFarmPlotUpdated);
    eventBus.on(EVENTS.OPEN_SHOP, this._onOpenShop);
    eventBus.on(EVENTS.CLOSE_SHOP, this._onCloseShop);
    eventBus.on(EVENTS.DEBUG_NEXT_DAY, this._onDebugNextDay);
    this.scale.on(Phaser.Scale.Events.RESIZE, this._onResize);

    // F2 shortcut to inspect tileset at any time (+ F6/F7/F8 debug keys when ?debug=1)
    if (this.input.keyboard) {
      this._f2Key = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.F2
      );
      this._onF2 = () => {
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.TILESET_DEBUG, {
          returnScene: SCENE_KEYS.GAME,
        });
      };
      this._f2Key.on('down', this._onF2);

      if (this.debugEnabled) {
        this._f6Key = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.F6
        );
        this._f7Key = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.F7
        );
        this._f8Key = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.F8
        );
        this._onF6 = () => eventBus.emit(EVENTS.DEBUG_ADD_COINS);
        this._onF7 = () => eventBus.emit(EVENTS.DEBUG_NEXT_DAY);
        this._onF8 = () => eventBus.emit(EVENTS.DEBUG_FILL_SEEDS);
        this._f6Key.on('down', this._onF6);
        this._f7Key.on('down', this._onF7);
        this._f8Key.on('down', this._onF8);
      }
    }

    this._onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && SaveSystem.hasSave()) {
        this._saveCurrentState();
      }
    };
    window.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('pagehide', this._onVisibilityChange);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventBus.off(EVENTS.INPUT_ACTION, this._onAction);
      eventBus.off(EVENTS.INPUT_CYCLE_TOOL, this._onCycleTool);
      eventBus.off(EVENTS.INPUT_SELECT_TOOL, this._onSelectTool);
      eventBus.off(EVENTS.PHASE_CHANGED, this._onPhaseChanged);
      eventBus.off(EVENTS.CONFIRM_SLEEP, this._onConfirmSleep);
      eventBus.off(EVENTS.FARM_ACTION_FEEDBACK, this._onFarmFeedback);
      eventBus.off(EVENTS.FARM_PLOT_UPDATED, this._onFarmPlotUpdated);
      eventBus.off(EVENTS.OPEN_SHOP, this._onOpenShop);
      eventBus.off(EVENTS.CLOSE_SHOP, this._onCloseShop);
      eventBus.off(EVENTS.DEBUG_NEXT_DAY, this._onDebugNextDay);
      this.scale.off(Phaser.Scale.Events.RESIZE, this._onResize);
      window.removeEventListener('visibilitychange', this._onVisibilityChange);
      window.removeEventListener('pagehide', this._onVisibilityChange);
      if (this._f2Key) this._f2Key.off('down', this._onF2);
      if (this._f6Key) this._f6Key.off('down', this._onF6);
      if (this._f7Key) this._f7Key.off('down', this._onF7);
      if (this._f8Key) this._f8Key.off('down', this._onF8);
      if (this.inputSystem) this.inputSystem.destroy();
      if (this.inventorySystem) this.inventorySystem.destroy();
      if (this.farmingSystem) this.farmingSystem.destroy();
      if (this.fishingSystem) this.fishingSystem.destroy();
      if (this.timeSystem) this.timeSystem.destroy();
    });
  }

  /**
   * Recalculates integer world camera zoom (`max(1, round(shortEdge / 220))`) and
   * updates the camera bounds and day/night overlay rectangle when the screen resizes/rotates.
   */
  _updateCameraAndOverlay(width, height) {
    const w = width || this.scale?.width || GAME.WIDTH;
    const h = height || this.scale?.height || GAME.HEIGHT;
    const zoom = getWorldZoom(w, h);

    const cam = this.cameras?.main;
    if (cam) {
      cam.setZoom(zoom);
      if (this.worldWidthPx && this.worldHeightPx) {
        const visW = w / zoom;
        const visH = h / zoom;
        const bx =
          visW > this.worldWidthPx ? -(visW - this.worldWidthPx) / 2 : 0;
        const by =
          visH > this.worldHeightPx ? -(visH - this.worldHeightPx) / 2 : 0;
        const bw = Math.max(this.worldWidthPx, visW);
        const bh = Math.max(this.worldHeightPx, visH);
        cam.setBounds(bx, by, bw, bh);
      }
    }

    if (this.dayNightOverlay) {
      this.dayNightOverlay.setPosition(w / 2, h / 2);
      this.dayNightOverlay.setSize(w * 2, h * 2);
    }
  }

  _applyPhaseOverlay(phase, animate = true) {
    if (!this.dayNightOverlay || !phase) return;
    this.dayNightOverlay.setFillStyle(phase.color, this.dayNightOverlay.alpha);

    if (this._overlayTween) {
      this._overlayTween.stop();
      this._overlayTween = null;
    }

    if (animate && this.tweens) {
      this._overlayTween = this.tweens.add({
        targets: this.dayNightOverlay,
        alpha: phase.alpha,
        duration: TIME.OVERLAY_TWEEN_MS,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.dayNightOverlay.setAlpha(phase.alpha);
    }
  }

  _saveCurrentState() {
    if (!this.gameState || !this.player) return;
    const coords = this.player.getTileCoords();
    this.gameState.player.tileX = coords.tx;
    this.gameState.player.tileY = coords.ty;
    SaveSystem.save(this.gameState);
  }

  flushSaveIfActive() {
    if (SaveSystem.hasSave()) {
      this._saveCurrentState();
    }
  }

  _cycleTool(step = 1) {
    if (this.isSleeping || this.isShopOpen) return;
    this.toolIndex = (this.toolIndex + step + TOOLS.length) % TOOLS.length;
    this._emitToolChanged();
  }

  _emitToolChanged() {
    const tool = TOOLS[this.toolIndex];
    this.gameState.selectedToolId = tool.id;
    this._lastCursorTx = -1;
    this._lastCursorTy = -1;
    AudioManager.playSfx(ASSET_KEYS.SFX_ITEM_EQUIP);
    eventBus.emit(EVENTS.TOOL_CHANGED, tool, this.toolIndex);
  }

  /**
   * Computes the target tile `(tx, ty)`:
   * - Defaults to `this.player.getFrontTile()`
   * - If the tile in front is NOT farmable, but the player is standing directly on a farmable tile
   *   with a farming tool (or standing on a harvest-ready plot), targets the tile under the player's feet.
   */
  _getEffectiveTargetTile() {
    const front = this.player.getFrontTile();
    const tool = TOOLS[this.toolIndex];
    const isFarmingTool =
      tool &&
      (tool.id === TOOL_IDS.HOE ||
        tool.id === TOOL_IDS.WATERING_CAN ||
        tool.id === TOOL_IDS.SEEDS);

    if (
      !this.worldBuilder.isFarmableTile(front.tx, front.ty) &&
      isFarmingTool
    ) {
      const feet = this.player.getTileCoords();
      if (this.worldBuilder.isFarmableTile(feet.tx, feet.ty)) {
        this._effectiveTarget.tx = feet.tx;
        this._effectiveTarget.ty = feet.ty;
        return this._effectiveTarget;
      }
    }

    this._effectiveTarget.tx = front.tx;
    this._effectiveTarget.ty = front.ty;
    return this._effectiveTarget;
  }

  _handlePrimaryAction() {
    if (!this.player || this.isSleeping || this.isShopOpen) {
      return;
    }

    // If FishingSystem is currently active (waiting / bite / etc.), let it handle AKSI directly
    if (this.fishingSystem && this.fishingSystem.isActive()) {
      this.fishingSystem.handleAction(this.player);
      return;
    }

    if (this.player.actionLocked) {
      return;
    }

    const front = this.player.getFrontTile();
    const landmark = this.worldBuilder.getNearbyLandmark(
      this.player.x,
      this.player.y,
      front
    );

    if (landmark) {
      if (landmark.type === 'sleep') {
        this._startSleepSequence(false);
        return;
      }
      if (landmark.type === 'sell') {
        AudioManager.playSfx(ASSET_KEYS.SFX_CHEST_OPEN);
        eventBus.emit(EVENTS.OPEN_SHOP, 'sell');
        return;
      }
      if (landmark.type === 'shop') {
        AudioManager.playSfx(ASSET_KEYS.SFX_UI_MENU_OPEN);
        eventBus.emit(EVENTS.OPEN_SHOP, 'buy');
        return;
      }
      return;
    }

    const target = this._getEffectiveTargetTile();
    const tool = TOOLS[this.toolIndex];

    // If targeted plot is harvest-ready or player is using a farming tool (Hoe, Watering Can, Seeds)
    if (
      this.farmingSystem &&
      (this.farmingSystem.isHarvestReady(target.tx, target.ty) ||
        tool.id === TOOL_IDS.HOE ||
        tool.id === TOOL_IDS.WATERING_CAN ||
        tool.id === TOOL_IDS.SEEDS)
    ) {
      const res = this.farmingSystem.handleToolAction(
        tool.id,
        target.tx,
        target.ty
      );
      if (res.handled && res.animAction) {
        this.player.playOneShotAction(res.animAction, res.lockMs);
      }
      return;
    }

    // Fishing Rod (M3 Part 2: FishingSystem)
    if (tool.id === TOOL_IDS.FISHING_ROD && this.fishingSystem) {
      this.fishingSystem.handleAction(this.player);
    }
  }

  /**
   * Debug helper (`?debug=1` only): immediately advances to the next day (`06:00 Pagi`),
   * running the exact same daily crop growth and autosave logic as sleeping without camera fade.
   */
  _debugAdvanceDayImmediate() {
    if (!this.debugEnabled || this.isSleeping) return;
    if (this.fishingSystem && this.fishingSystem.isActive()) {
      this.fishingSystem.cancelFishing(false, this.player);
    }

    this._lastGrowthReport = null;
    if (this.timeSystem) {
      this.timeSystem.advanceToNextDay();
    }
    this._saveCurrentState();
    AudioManager.playSfx(ASSET_KEYS.SFX_DAY_START);

    const rep = this._lastGrowthReport;
    let cropSummary = 'Tersimpan';
    if (rep) {
      if (rep.readyCount > 0) {
        cropSummary = `${rep.readyCount} siap panen!`;
      } else if (rep.grownCount > 0) {
        cropSummary = `${rep.grownCount} tanaman tumbuh`;
      } else if (rep.unwateredCount > 0) {
        cropSummary = `${rep.unwateredCount} belum disiram`;
      }
    }
    eventBus.emit(
      EVENTS.TOAST_MESSAGE,
      `[DEBUG] Lompat ke Hari ${this.gameState.day} (06:00) • ${cropSummary}`
    );
  }

  /**
   * Executes the sleep transition at the player's cottage:
   * - Fade out camera (no full interior scene)
   * - Advance day (`day + 1`), restore clock to `06:00 (Pagi)`
   * - Grow watered crops via `EVENTS.DAY_ADVANCED` -> `FarmingSystem.onNewDay()`
   * - Trigger `SaveSystem.save(this.gameState)`
   * - Fade camera back in with morning jingle
   */
  _startSleepSequence(autoSleep = false) {
    if (this.isSleeping) return;
    if (this.isShopOpen) {
      eventBus.emit(EVENTS.CLOSE_SHOP);
    }
    if (this.fishingSystem && this.fishingSystem.isActive()) {
      this.fishingSystem.cancelFishing(false, this.player);
    }
    this.isSleeping = true;

    if (this.timeSystem) this.timeSystem.setPaused(true);
    if (this.inputSystem) {
      this.inputSystem.enabled = false;
      this.inputSystem.setTouchVector(0, 0);
    }
    if (this.player) {
      this.player.setLockedStateAnimation('idle');
    }

    if (!autoSleep) {
      AudioManager.playSfx(ASSET_KEYS.SFX_DOOR_OPEN);
    }
    AudioManager.playSfx(ASSET_KEYS.SFX_DAY_END);

    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (autoSleep && this.player) {
        const doorX =
          MAP_ZONES.HOUSE.DOOR_TILE_X * TILE.SIZE + TILE.SIZE / 2;
        const doorY =
          (MAP_ZONES.HOUSE.DOOR_TILE_Y + 1) * TILE.SIZE + TILE.SIZE / 2;
        this.player.setPosition(doorX, doorY);
      }

      this._lastGrowthReport = null;
      if (this.timeSystem) {
        this.timeSystem.advanceToNextDay();
      }

      // Persist updated day, morning hour, player tile, plots, and storage
      this._saveCurrentState();

      this.time.delayedCall(TIME.SLEEP_HOLD_MS, () => {
        AudioManager.playSfx(ASSET_KEYS.SFX_DAY_START);
        cam.fadeIn(TIME.SLEEP_FADE_IN_MS, 0, 0, 0);

        cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
          this.isSleeping = false;
          if (this.player) this.player.unlockAction();
          if (this.inputSystem) this.inputSystem.enabled = true;
          if (this.timeSystem) this.timeSystem.setPaused(false);

          const rep = this._lastGrowthReport;
          let cropSummary = 'Progress tersimpan otomatis!';
          if (rep) {
            if (rep.readyCount > 0) {
              cropSummary = `${rep.readyCount} tanaman siap panen! • Tersimpan`;
            } else if (rep.grownCount > 0) {
              cropSummary = `${rep.grownCount} tanaman tumbuh • Tersimpan`;
            } else if (rep.unwateredCount > 0) {
              cropSummary = `${rep.unwateredCount} tanaman belum disiram (tidak tumbuh) • Tersimpan`;
            }
          }

          eventBus.emit(
            EVENTS.TOAST_MESSAGE,
            `Hari ${this.gameState.day} dimulai (06:00 Pagi) • ${cropSummary}`
          );
        });
      });
    });

    cam.fadeOut(TIME.SLEEP_FADE_OUT_MS, 0, 0, 0);
  }

  update(_, delta) {
    if (!this.player || !this.inputSystem) return;

    if (this.timeSystem && !this.isSleeping) {
      this.timeSystem.update(delta);
    }

    const moveVec = this.inputSystem.getMovementVector();
    const isFishingActive = this.fishingSystem
      ? this.fishingSystem.update(delta, this.player, moveVec)
      : false;

    if (!isFishingActive) {
      this.player.update(delta, moveVec, (tx, ty) =>
        this.worldBuilder.isDirtTile(tx, ty)
      );
    }

    // Update target tile cursor in front of (or under) player
    const target = this._getEffectiveTargetTile();
    this._drawTargetCursor(target.tx, target.ty);

    // Check nearby landmark, fishing state, or farm plot for interaction hint
    const front = this.player.getFrontTile();
    const landmark = this.worldBuilder.getNearbyLandmark(
      this.player.x,
      this.player.y,
      front
    );
    this.worldBuilder.updateLandmarkLabels(
      this.isShopOpen || this.isSleeping ? null : landmark?.type || null
    );

    const tool = TOOLS[this.toolIndex];
    let hintText = '';
    if (isFishingActive && this.fishingSystem) {
      hintText = this.fishingSystem.getFishingHint(this.player);
    } else if (landmark) {
      hintText = `[AKSI / E] ${landmark.label}`;
    } else if (tool && tool.id === TOOL_IDS.FISHING_ROD && this.fishingSystem) {
      hintText = this.fishingSystem.getFishingHint(this.player);
    } else if (this.farmingSystem) {
      hintText = this.farmingSystem.getPlotStatusHint(target.tx, target.ty);
    }

    if (this._lastHint !== hintText) {
      this._lastHint = hintText;
      eventBus.emit(EVENTS.INTERACTION_HINT, hintText);
    }
  }

  _drawTargetCursor(tx, ty) {
    const isReady = this.farmingSystem
      ? this.farmingSystem.isHarvestReady(tx, ty)
      : false;
    if (
      this._lastCursorTx === tx &&
      this._lastCursorTy === ty &&
      this._lastCursorReady === isReady
    ) {
      return;
    }
    this._lastCursorTx = tx;
    this._lastCursorTy = ty;
    this._lastCursorReady = isReady;

    this.targetCursor.clear();
    const isFarmable = this.worldBuilder.isFarmableTile(tx, ty);
    const isWater = this.worldBuilder.isWaterTile(tx, ty);

    let color = FARMING.CURSOR_DEFAULT_COLOR;
    if (isReady) {
      color = FARMING.CURSOR_HARVEST_COLOR;
    } else if (isFarmable) {
      color = FARMING.CURSOR_FARMABLE_COLOR;
    } else if (isWater) {
      color = FARMING.CURSOR_WATER_COLOR;
    }

    const isActiveTile = isReady || isFarmable || isWater;
    const lineAlpha = isActiveTile
      ? FARMING.CURSOR_LINE_ALPHA_ACTIVE
      : FARMING.CURSOR_LINE_ALPHA_IDLE;

    const x0 = tx * TILE.SIZE;
    const y0 = ty * TILE.SIZE;

    if (isActiveTile) {
      this.targetCursor.fillStyle(color, FARMING.CURSOR_FILL_ALPHA);
      this.targetCursor.fillRect(x0 + 1, y0 + 1, TILE.SIZE - 2, TILE.SIZE - 2);
      // Dark outer contrast outline so the cursor stands out on any terrain
      this.targetCursor.lineStyle(1, 0x160c08, 0.72);
      this.targetCursor.strokeRect(x0, y0, TILE.SIZE, TILE.SIZE);
    }

    this.targetCursor.lineStyle(1.5, color, lineAlpha);
    this.targetCursor.strokeRect(
      x0 + 0.75,
      y0 + 0.75,
      TILE.SIZE - 1.5,
      TILE.SIZE - 1.5
    );

    if (isActiveTile) {
      // Corner bracket highlights
      this.targetCursor.fillStyle(0xffffff, 0.85);
      this.targetCursor.fillRect(x0 + 1, y0 + 1, 2, 2);
      this.targetCursor.fillRect(x0 + TILE.SIZE - 3, y0 + 1, 2, 2);
      this.targetCursor.fillRect(x0 + 1, y0 + TILE.SIZE - 3, 2, 2);
      this.targetCursor.fillRect(
        x0 + TILE.SIZE - 3,
        y0 + TILE.SIZE - 3,
        2,
        2
      );
    }
  }
}
