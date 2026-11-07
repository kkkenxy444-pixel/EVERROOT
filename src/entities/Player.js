import { ASSET_KEYS, CHARACTER_PARTS, charLayerKey } from '../data/assetKeys.js';
import { DEPTH, PLAYER, TILE } from '../data/gameConfig.js';
import { AudioManager } from '../systems/AudioManager.js';

/**
 * Player entity built as a Phaser Container stacking 3 synchronized spritesheet layers:
 * 1. `base` (body)
 * 2. `spikeyhair` (hair)
 * 3. `tools` (tool/arms overlay)
 *
 * All frames in `characters/human/` are 96x64 with feet at (48, 39).
 * Setting each sprite's origin to `(0.5, 39/64)` places the container's `(x, y)`
 * directly at the player's feet for accurate top-down collision and Y-sorting.
 */
export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.container = scene.add.container(x, y);

    const originY = PLAYER.FRAME_FEET_Y / PLAYER.FRAME_HEIGHT;
    this.layers = {};

    for (const part of CHARACTER_PARTS) {
      const sprite = scene.add
        .sprite(0, 0, charLayerKey('idle', part), 0)
        .setOrigin(0.5, originY);
      this.layers[part] = sprite;
      this.container.add(sprite);
    }

    scene.physics.add.existing(this.container);
    this.body = this.container.body;
    this.body.setSize(PLAYER.BODY_WIDTH, PLAYER.BODY_HEIGHT);
    this.body.setOffset(-PLAYER.BODY_WIDTH / 2, -PLAYER.BODY_HEIGHT / 2);
    this.body.setCollideWorldBounds(true);

    // Facing unit vector (default facing right/down-ish) for targeting tiles in front of player
    this.facing = { x: 0, y: 1 };
    this.flipX = false;
    this.currentAction = null;
    this.actionLocked = false;
    this.footstepTimer = 0;
    this._actionTimer = null;

    // Reusable target tile struct to avoid allocations
    this._targetTile = { tx: 0, ty: 0, worldX: 0, worldY: 0 };

    // Dust puff sprite (reused on footsteps)
    this.dustSprite = scene.add
      .sprite(x, y, ASSET_KEYS.FX_DUST_WALK, 0)
      .setOrigin(0.5, 0.8)
      .setVisible(false)
      .setDepth(DEPTH.DECOR_FLAT);

    this.playSynced('idle', true);
    this.container.setDepth(DEPTH.Y_SORT_BASE + y);
  }

  get x() {
    return this.container ? this.container.x : 0;
  }

  get y() {
    return this.container ? this.container.y : 0;
  }

  setPosition(x, y) {
    if (!this.container || !this.container.scene) return;
    this.container.setPosition(x, y);
    this.container.setDepth(DEPTH.Y_SORT_BASE + y);
  }

  getTileCoords() {
    const cx = this.container ? this.container.x : 0;
    const cy = this.container ? this.container.y : 0;
    return {
      tx: Math.floor(cx / TILE.SIZE),
      ty: Math.floor(cy / TILE.SIZE),
    };
  }

  /**
   * Returns the tile coordinates `(tx, ty)` in front of the player based on current facing vector.
   */
  getFrontTile() {
    const probeX = this.container.x + this.facing.x * PLAYER.REACH;
    const probeY = this.container.y + this.facing.y * PLAYER.REACH;
    const tx = Math.floor(probeX / TILE.SIZE);
    const ty = Math.floor(probeY / TILE.SIZE);
    this._targetTile.tx = tx;
    this._targetTile.ty = ty;
    this._targetTile.worldX = tx * TILE.SIZE + TILE.SIZE / 2;
    this._targetTile.worldY = ty * TILE.SIZE + TILE.SIZE / 2;
    return this._targetTile;
  }

  /**
   * Synchronizes all 3 layers (`base`, `spikeyhair`, `tools`) to play the same animation action.
   */
  playSynced(action, ignoreIfPlaying = true) {
    if (!this.layers || !this.container || !this.container.scene) return;
    if (ignoreIfPlaying && this.currentAction === action) return;
    this.currentAction = action;

    for (const part of CHARACTER_PARTS) {
      const animKey = `${charLayerKey(action, part)}_anim`;
      const sprite = this.layers[part];
      if (!sprite || !sprite.anims || !sprite.scene) continue;
      sprite.setFlipX(this.flipX);
      sprite.play(animKey, false);
    }
  }

  /**
   * Plays a one-shot action animation (`dig`, `watering`, `doing`, `casting`, `caught`),
   * locking movement until complete or `durationMs` elapses.
   */
  playOneShotAction(action, durationMs = 450, onComplete = null) {
    if (!this.container || !this.container.scene) return;
    this.actionLocked = true;
    if (this.body && this.body.enable) {
      this.body.setVelocity(0, 0);
    }
    this.playSynced(action, false);

    if (this._actionTimer) {
      this._actionTimer.remove(false);
      this._actionTimer = null;
    }

    if (!this.scene || !this.scene.time) return;
    this._actionTimer = this.scene.time.delayedCall(durationMs, () => {
      this._actionTimer = null;
      if (!this.container || !this.container.scene) return;
      this.actionLocked = false;
      if (this.currentAction === action) {
        this.playSynced('idle', false);
      }
      if (onComplete) onComplete();
    });
  }

  /**
   * Locks player in a looping state animation (used by FishingSystem for `waiting` / `reeling`).
   */
  setLockedStateAnimation(action) {
    if (!this.container || !this.container.scene) return;
    this.actionLocked = true;
    if (this.body && this.body.enable) {
      this.body.setVelocity(0, 0);
    }
    this.playSynced(action, false);
  }

  unlockAction() {
    this.actionLocked = false;
    if (!this.container || !this.container.scene) return;
    this.playSynced('idle', false);
  }

  /**
   * Per-frame update driven by GameScene.
   */
  update(delta, moveVec, isOnDirtCallback) {
    if (!this.container || !this.container.scene || !this.body) return;
    if (this.actionLocked) {
      this.body.setVelocity(0, 0);
      this.container.setDepth(DEPTH.Y_SORT_BASE + this.container.y);
      return;
    }

    const vx = moveVec.x;
    const vy = moveVec.y;
    const moving = Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01;

    if (moving) {
      this.body.setVelocity(vx * PLAYER.SPEED, vy * PLAYER.SPEED);

      // Update facing direction (8-way)
      const len = Math.hypot(vx, vy) || 1;
      this.facing.x = vx / len;
      this.facing.y = vy / len;

      if (Math.abs(vx) > 0.05) {
        this.flipX = vx < 0;
        for (const part of CHARACTER_PARTS) {
          const sprite = this.layers[part];
          if (sprite && sprite.scene) sprite.setFlipX(this.flipX);
        }
      }

      this.playSynced('walk', true);

      this.footstepTimer += delta;
      if (this.footstepTimer >= PLAYER.FOOTSTEP_INTERVAL_MS) {
        this.footstepTimer = 0;
        const onDirt = isOnDirtCallback
          ? isOnDirtCallback(
              Math.floor(this.container.x / TILE.SIZE),
              Math.floor(this.container.y / TILE.SIZE)
            )
          : false;
        AudioManager.playSfx(
          onDirt ? ASSET_KEYS.SFX_STEP_DIRT : ASSET_KEYS.SFX_STEP_GRASS
        );
        this._spawnDustPuff();
      }
    } else {
      this.body.setVelocity(0, 0);
      this.playSynced('idle', true);
      this.footstepTimer = PLAYER.FOOTSTEP_INTERVAL_MS * 0.7;
    }

    this.container.setDepth(DEPTH.Y_SORT_BASE + this.container.y);
  }

  _spawnDustPuff() {
    if (!this.dustSprite || !this.dustSprite.scene || !this.dustSprite.anims) return;
    this.dustSprite.setPosition(
      this.container.x - this.facing.x * 4,
      this.container.y + 1
    );
    this.dustSprite.setFlipX(this.flipX);
    this.dustSprite.setVisible(true);
    this.dustSprite.play(`${ASSET_KEYS.FX_DUST_WALK}_anim`, true);
    this.dustSprite.once('animationcomplete', () => {
      if (this.dustSprite && this.dustSprite.scene) this.dustSprite.setVisible(false);
    });
  }

  destroy() {
    if (this._actionTimer) {
      try {
        this._actionTimer.remove(false);
      } catch {
        // Ignore timer cleanup errors during scene teardown
      }
      this._actionTimer = null;
    }
    this.actionLocked = false;
    this.layers = null;
    this.body = null;
    this.container = null;
    this.dustSprite = null;
    this.scene = null;
  }
}
