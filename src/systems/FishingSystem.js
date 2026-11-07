import Phaser from 'phaser';
import { ASSET_KEYS } from '../data/assetKeys.js';
import { DEPTH, FISHING, TILE } from '../data/gameConfig.js';
import { FISH_ITEM_IDS, ITEMS } from '../data/items.js';
import { eventBus, EVENTS } from './EventBus.js';

export const FISHING_STATES = Object.freeze({
  IDLE: 'idle',
  CASTING: 'casting',
  WAITING: 'waiting',
  BITE: 'bite',
  REELING: 'reeling',
  CAUGHT: 'caught',
});

/**
 * Modular Fishing System for Milestone 3 (Part 2):
 * - State machine: `idle` -> `casting` -> `waiting` -> `bite` -> `reeling` -> `caught` -> `idle`
 * - Requires Fishing Rod selected and player facing water near the shore or wooden pier
 *   (water detection uses verified water tiles from `tileIndex.js` via `isWaterTileFn`)
 * - Renders a bobber/float (`TODO_ASSET` placeholder Graphics) on the water surface
 * - Emits `EVENTS.FISHING_STATE_CHANGED` so `UIScene` renders the crisp native-resolution
 *   "!" alert and reel timing bar directly above the player
 * - Safely cancels fishing without error if the player moves, switches tools, opens a modal,
 *   or goes to sleep
 */
export class FishingSystem {
  constructor(scene, callbacks = {}) {
    this.scene = scene;
    this.isWaterTile = callbacks.isWaterTile || (() => false);
    this.getCatchableFishIds =
      callbacks.getCatchableFishIds || (() => FISH_ITEM_IDS);
    this.addFishToInventory =
      callbacks.addFishToInventory || (() => ({ ok: true }));

    this.state = FISHING_STATES.IDLE;
    this.stateTimerMs = 0;
    this.waitDurationMs = 0;
    this.cooldownUntil = 0;
    this.bobberTime = 0;

    this.bobberStartX = 0;
    this.bobberStartY = 0;
    this.bobberX = 0;
    this.bobberY = 0;

    // Reusable water probe result to avoid per-frame object allocations
    this._waterTarget = {
      valid: false,
      tx: 0,
      ty: 0,
      worldX: 0,
      worldY: 0,
    };

    // TODO_ASSET: bobber / pelampung pancing terpisah (fishing_bobber.png)
    // Using a lightweight pixel Graphics bobber (red/white float + water ripple ring)
    this.bobberGfx = scene.add
      .graphics()
      .setDepth(DEPTH.SHORE + 0.8)
      .setVisible(false);

    // Caught fish preview icon above player during `caught` state
    this.caughtFishIcon = scene.add
      .image(0, 0, ASSET_KEYS.ITEM_FISH)
      .setOrigin(0.5)
      .setDepth(DEPTH.WORLD_PROMPT + 2)
      .setVisible(false);

    this._bindEvents();
  }

  _bindEvents() {
    this._onOpenShop = () => {
      if (this.isActive()) {
        this.cancelFishing(false);
      }
    };
    this._onConfirmSleep = () => {
      if (this.isActive()) {
        this.cancelFishing(false);
      }
    };
    this._onToolChanged = () => {
      if (this.isActive()) {
        this.cancelFishing(false);
      }
    };

    eventBus.on(EVENTS.OPEN_SHOP, this._onOpenShop);
    eventBus.on(EVENTS.CONFIRM_SLEEP, this._onConfirmSleep);
    eventBus.on(EVENTS.TOOL_CHANGED, this._onToolChanged);
  }

  isActive() {
    return this.state !== FISHING_STATES.IDLE;
  }

  /**
   * Checks whether the player freezes movement via `Player.actionLocked`:
   * During `casting`, `reeling`, and `caught` movement is locked; during `waiting` and `bite`,
   * player movement input is detected in `update()` so walking away cancels fishing cleanly.
   */
  isMovementLockedState() {
    return (
      this.state === FISHING_STATES.CASTING ||
      this.state === FISHING_STATES.REELING ||
      this.state === FISHING_STATES.CAUGHT
    );
  }

  /**
   * Probes 1 to `FISHING.CAST_PROBE_TILES` tiles in front of the player along `player.facing`
   * to find a valid water tile within `FISHING.MAX_WATER_DISTANCE_TILES`.
   */
  findWaterTarget(player) {
    this._waterTarget.valid = false;
    if (!player) return this._waterTarget;

    const ptx = player.x / TILE.SIZE;
    const pty = player.y / TILE.SIZE;
    const fx = player.facing.x;
    const fy = player.facing.y;

    for (let step = 1; step <= FISHING.CAST_PROBE_TILES; step += 0.5) {
      const probeX = player.x + fx * (TILE.SIZE * step);
      const probeY = player.y + fy * (TILE.SIZE * step);
      const tx = Math.floor(probeX / TILE.SIZE);
      const ty = Math.floor(probeY / TILE.SIZE);

      if (this.isWaterTile(tx, ty)) {
        const distTiles = Math.hypot(tx + 0.5 - ptx, ty + 0.5 - pty);
        if (distTiles <= FISHING.MAX_WATER_DISTANCE_TILES) {
          this._waterTarget.valid = true;
          this._waterTarget.tx = tx;
          this._waterTarget.ty = ty;
          this._waterTarget.worldX = tx * TILE.SIZE + TILE.SIZE / 2;
          this._waterTarget.worldY = ty * TILE.SIZE + TILE.SIZE / 2;
          return this._waterTarget;
        }
      }
    }

    return this._waterTarget;
  }

  /**
   * Returns a contextual 1-line hint when the player has the Fishing Rod equipped.
   */
  getFishingHint(player) {
    if (this.state === FISHING_STATES.WAITING) {
      return 'Menunggu ikan menggigit... (Bergerak = Batal)';
    }
    if (this.state === FISHING_STATES.BITE) {
      return '[AKSI / E] TARIK SEKARANG!';
    }
    if (this.state !== FISHING_STATES.IDLE) {
      return '';
    }
    const target = this.findWaterTarget(player);
    if (target.valid) {
      return '[AKSI / E] Lempar Kail Pancing';
    }
    return '';
  }

  /**
   * Handles pressing `AKSI` when the Fishing Rod is equipped (or while fishing is active).
   */
  handleAction(player) {
    if (!player) return false;
    const now = this.scene.time.now;

    // 1. If currently waiting for a bite -> pulled too early
    if (this.state === FISHING_STATES.WAITING) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_CANCEL);
      eventBus.emit(EVENTS.TOAST_MESSAGE, 'Kail ditarik terlalu cepat.');
      this.cancelFishing(true, player);
      return true;
    }

    // 2. If fish is biting -> start reeling in!
    if (this.state === FISHING_STATES.BITE) {
      this._startReeling(player);
      return true;
    }

    // 3. Ignore action button during casting / reeling / caught transitions
    if (this.state !== FISHING_STATES.IDLE) {
      return true;
    }

    // 4. Respect short post-fishing cooldown to prevent accidental spam
    if (now < this.cooldownUntil) {
      return true;
    }

    // 5. Verify player is facing water near shore or pier
    const target = this.findWaterTarget(player);
    if (!target.valid) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        'Arahkan ke air di tepi danau atau dermaga untuk memancing.'
      );
      return true;
    }

    // 6. Verify inventory has space for fish
    const catchableIds = this.getCatchableFishIds();
    if (!catchableIds || catchableIds.length === 0) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        'Tas penuh! Jual hasil di Kotak Jual dulu.'
      );
      return true;
    }

    // 7. Begin casting
    this._startCasting(player, target.worldX, target.worldY);
    return true;
  }

  _startCasting(player, waterX, waterY) {
    this.state = FISHING_STATES.CASTING;
    this.stateTimerMs = 0;
    this.bobberTime = 0;
    this.bobberStartX = waterX;
    this.bobberStartY = waterY;
    this.bobberX = waterX;
    this.bobberY = waterY;

    player.setLockedStateAnimation('casting');
    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_ROD_CAST);
    this._emitStateChanged(player, 0);
  }

  _enterWaiting(player) {
    this.state = FISHING_STATES.WAITING;
    this.stateTimerMs = 0;
    this.waitDurationMs = Phaser.Math.Between(
      FISHING.WAIT_MIN_MS,
      FISHING.WAIT_MAX_MS
    );

    // Unlock Player.actionLocked so movement input in GameScene.update can cancel fishing,
    // while keeping the 'waiting' animation playing on all 3 character layers.
    player.actionLocked = false;
    player.body.setVelocity(0, 0);
    player.playSynced('waiting', false);

    this.bobberGfx.setVisible(true);
    this._drawBobber(false);

    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_LURE_PLOP);
    this._emitStateChanged(player, 0);
  }

  _enterBite(player) {
    this.state = FISHING_STATES.BITE;
    this.stateTimerMs = 0;

    player.actionLocked = false;
    player.body.setVelocity(0, 0);
    player.playSynced('waiting', true);

    this._drawBobber(true);
    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_FISH_BITE);
    this._emitStateChanged(player, 1);
  }

  _startReeling(player) {
    this.state = FISHING_STATES.REELING;
    this.stateTimerMs = 0;

    player.setLockedStateAnimation('reeling');
    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_REEL_IN);
    this._emitStateChanged(player, 0);
  }

  _completeCatch(player) {
    this.state = FISHING_STATES.CAUGHT;
    this.stateTimerMs = 0;
    this.bobberGfx.setVisible(false);

    const fishId = this._rollFishId();
    const fishDef = ITEMS[fishId] || ITEMS.fish_small;

    const addRes = this.addFishToInventory(fishDef.id);
    if (!addRes || !addRes.ok) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        'Tas penuh! Ikan tidak muat di tas.'
      );
      this.cancelFishing(true, player);
      return;
    }

    player.setLockedStateAnimation('caught');
    this.caughtFishIcon.setPosition(player.x, player.y - 26);
    if (fishDef.tint) {
      this.caughtFishIcon.setTint(fishDef.tint);
    } else {
      this.caughtFishIcon.clearTint();
    }
    this.caughtFishIcon.setVisible(true);

    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_CATCH_FANFARE);
    eventBus.emit(EVENTS.FISHING_CAUGHT, fishDef);
    eventBus.emit(
      EVENTS.TOAST_MESSAGE,
      `Dapat ${fishDef.name}! (Jual: ${fishDef.sellPrice}G)`
    );
    this._emitStateChanged(player, 0, fishDef);
  }

  _rollFishId() {
    const catchable = this.getCatchableFishIds();
    const pool =
      catchable && catchable.length > 0 ? catchable : FISH_ITEM_IDS;

    let totalWeight = 0;
    for (const id of pool) {
      totalWeight += ITEMS[id]?.weight || 10;
    }

    let roll = Math.random() * totalWeight;
    for (const id of pool) {
      const w = ITEMS[id]?.weight || 10;
      if (roll < w) {
        return id;
      }
      roll -= w;
    }

    return pool[0] || 'fish_small';
  }

  /**
   * Cancels any active fishing state cleanly without throwing errors.
   */
  cancelFishing(applyCooldown = false, player = null) {
    const targetPlayer = player || this.scene?.player;
    this.state = FISHING_STATES.IDLE;
    this.stateTimerMs = 0;
    if (applyCooldown && this.scene?.time) {
      this.cooldownUntil = this.scene.time.now + FISHING.COOLDOWN_MS;
    }
    if (this.bobberGfx && this.bobberGfx.scene) {
      this.bobberGfx.clear();
      this.bobberGfx.setVisible(false);
    }
    if (this.caughtFishIcon && this.caughtFishIcon.scene) {
      this.caughtFishIcon.setVisible(false);
    }
    if (targetPlayer) {
      try {
        targetPlayer.unlockAction();
      } catch (err) {
        console.warn('[FishingSystem] unlockAction failed', err);
      }
    }
    this._emitStateChanged(targetPlayer, 0);
  }

  /**
   * Per-frame update called from `GameScene.update(time, delta)`.
   * Returns `true` if `FishingSystem` is currently controlling the player animation/state.
   */
  update(delta, player, moveVec) {
    if (this.state === FISHING_STATES.IDLE || !player) {
      return false;
    }

    // Cancel immediately if player moves during `waiting` or `bite`
    if (
      (this.state === FISHING_STATES.WAITING ||
        this.state === FISHING_STATES.BITE) &&
      moveVec &&
      (Math.abs(moveVec.x) > 0.05 || Math.abs(moveVec.y) > 0.05)
    ) {
      this.cancelFishing(true, player);
      return false;
    }

    this.stateTimerMs += delta;
    this.bobberTime += delta;

    if (this.state === FISHING_STATES.CASTING) {
      if (this.stateTimerMs >= FISHING.CAST_DURATION_MS) {
        this._enterWaiting(player);
      }
      return true;
    }

    if (this.state === FISHING_STATES.WAITING) {
      player.playSynced('waiting', true);
      this._drawBobber(false);
      if (this.stateTimerMs >= this.waitDurationMs) {
        this._enterBite(player);
      }
      return true;
    }

    if (this.state === FISHING_STATES.BITE) {
      player.playSynced('waiting', true);
      this._drawBobber(true);

      const remainingRatio = Math.max(
        0,
        1 - this.stateTimerMs / FISHING.BITE_WINDOW_MS
      );
      this._emitStateChanged(player, remainingRatio);

      if (this.stateTimerMs >= FISHING.BITE_WINDOW_MS) {
        eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_CANCEL);
        eventBus.emit(EVENTS.TOAST_MESSAGE, 'Ikan lepas');
        this.cancelFishing(true, player);
      }
      return true;
    }

    if (this.state === FISHING_STATES.REELING) {
      const t = Math.min(1, this.stateTimerMs / FISHING.REEL_DURATION_MS);
      this.bobberX = Phaser.Math.Linear(this.bobberStartX, player.x, t * 0.65);
      this.bobberY = Phaser.Math.Linear(this.bobberStartY, player.y, t * 0.65);
      this._drawBobber(true);

      if (this.stateTimerMs >= FISHING.REEL_DURATION_MS) {
        this._completeCatch(player);
      }
      return true;
    }

    if (this.state === FISHING_STATES.CAUGHT) {
      const floatOffset = Math.min(8, (this.stateTimerMs / FISHING.CAUGHT_DISPLAY_MS) * 8);
      this.caughtFishIcon.setPosition(player.x, player.y - 25 - floatOffset);

      if (this.stateTimerMs >= FISHING.CAUGHT_DISPLAY_MS) {
        this.cancelFishing(true, player);
      }
      return true;
    }

    return false;
  }

  _drawBobber(isBiting) {
    if (!this.bobberGfx || !this.bobberGfx.visible) return;
    this.bobberGfx.clear();

    const dipY = isBiting
      ? Math.sin(this.bobberTime * 0.035) * 2.2 + 1.5
      : Math.sin(this.bobberTime * 0.006) * 0.9;
    const bx = Math.round(this.bobberX);
    const by = Math.round(this.bobberY + dipY);

    // Water ripple ring around bobber
    const rippleRadius = isBiting
      ? 4 + ((this.bobberTime * 0.015) % 4)
      : 3.5 + Math.sin(this.bobberTime * 0.005) * 0.8;
    this.bobberGfx.lineStyle(1, 0xd8f3ff, isBiting ? 0.85 : 0.5);
    this.bobberGfx.strokeCircle(bx, by + 1, rippleRadius);

    // White lower half of bobber
    this.bobberGfx.fillStyle(0xfff6e0, 1);
    this.bobberGfx.fillRect(bx - 2, by - 1, 4, 2);

    // Red upper half + tip of bobber
    this.bobberGfx.fillStyle(isBiting ? 0xffbe0b : 0xe63946, 1);
    this.bobberGfx.fillRect(bx - 2, by - 3, 4, 2);
    this.bobberGfx.fillRect(bx - 1, by - 4, 2, 1);
  }

  _emitStateChanged(player, biteProgress = 0, caughtFish = null) {
    let screenX = 0;
    let screenY = 0;
    const cam = this.scene?.cameras?.main;
    if (player && cam) {
      screenX = (player.x - cam.worldView.x) * cam.zoom;
      screenY = (player.y - 26 - cam.worldView.y) * cam.zoom;
    }

    eventBus.emit(EVENTS.FISHING_STATE_CHANGED, {
      state: this.state,
      biteProgress,
      screenX,
      screenY,
      caughtFish,
    });
  }

  destroy() {
    // Do NOT call cancelFishing() here: during scene SHUTDOWN the DisplayList has
    // already destroyed player sprites (anims === undefined), so unlockAction()
    // would throw and abort Phaser's SceneManager queue (root cause of freeze).
    this.state = FISHING_STATES.IDLE;
    this.stateTimerMs = 0;
    eventBus.off(EVENTS.OPEN_SHOP, this._onOpenShop);
    eventBus.off(EVENTS.CONFIRM_SLEEP, this._onConfirmSleep);
    eventBus.off(EVENTS.TOOL_CHANGED, this._onToolChanged);
    try {
      if (this.bobberGfx && this.bobberGfx.scene) this.bobberGfx.destroy();
    } catch (err) {
      console.warn('[FishingSystem] bobber destroy failed', err);
    }
    try {
      if (this.caughtFishIcon && this.caughtFishIcon.scene) this.caughtFishIcon.destroy();
    } catch (err) {
      console.warn('[FishingSystem] fish icon destroy failed', err);
    }
    this.bobberGfx = null;
    this.caughtFishIcon = null;
    this.scene = null;
  }
}
