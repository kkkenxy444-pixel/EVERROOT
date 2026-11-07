import { ASSET_KEYS } from '../data/assetKeys.js';
import { AMBIENT_ANIMALS, DEPTH, TILE } from '../data/gameConfig.js';
import { AudioManager } from '../systems/AudioManager.js';

const ANIMAL_TEXTURE_MAP = Object.freeze({
  chicken: ASSET_KEYS.ANIMAL_CHICKEN,
  cow: ASSET_KEYS.ANIMAL_COW,
  pig: ASSET_KEYS.ANIMAL_PIG,
  sheep: ASSET_KEYS.ANIMAL_SHEEP,
  duck: ASSET_KEYS.ANIMAL_DUCK,
  bird: ASSET_KEYS.ANIMAL_BIRD,
});

const ANIMAL_SFX_MAP = Object.freeze({
  chicken: ASSET_KEYS.SFX_ANIMAL_CHICKEN,
  duck: ASSET_KEYS.SFX_ANIMAL_CHICKEN,
  cow: ASSET_KEYS.SFX_ANIMAL_COW,
  sheep: ASSET_KEYS.SFX_ANIMAL_COW,
  pig: ASSET_KEYS.SFX_ANIMAL_COW,
  bird: null,
});

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Lightweight ambient village animal (`AmbientAnimal`):
 * - Simple random wander state machine ('idle' <-> 'walk')
 * - Stays strictly within assigned zone bounds and avoids water & solid colliders
 * - Y-sorted depth (`DEPTH.Y_SORT_BASE + y`)
 * - Plays 4-frame walk animation only while moving; frame 0 when idle
 * - Plays soft animal SFX rarely and only when the player is within `SOUND_MAX_DISTANCE_PX`
 * - Purely visual/ambient (no player collision or interaction)
 */
export class AmbientAnimal {
  constructor(scene, config) {
    this.scene = scene;
    this.type = config.type;
    this.textureKey = ANIMAL_TEXTURE_MAP[this.type] || ASSET_KEYS.ANIMAL_CHICKEN;
    this.animKey = `${this.textureKey}_walk`;
    this.sfxKey = ANIMAL_SFX_MAP[this.type] || null;
    this.speed = config.speed || 14;
    this.bounds = config.bounds; // { minX, minY, maxX, maxY }
    this.canWalkTo = config.canWalkTo; // (worldX, worldY) => boolean

    this.sprite = scene.add
      .sprite(config.x, config.y, this.textureKey, 0)
      .setOrigin(0.5, config.originY ?? 0.8)
      .setDepth(DEPTH.Y_SORT_BASE + config.y);

    this.state = 'idle';
    this.stateTimerMs = randRange(400, AMBIENT_ANIMALS.IDLE_MAX_MS);
    this.vx = 0;
    this.vy = 0;
    this.soundTimerMs = randRange(
      AMBIENT_ANIMALS.SOUND_MIN_INTERVAL_MS,
      AMBIENT_ANIMALS.SOUND_MAX_INTERVAL_MS
    );
  }

  _enterIdle() {
    this.state = 'idle';
    this.vx = 0;
    this.vy = 0;
    this.stateTimerMs = randRange(
      AMBIENT_ANIMALS.IDLE_MIN_MS,
      AMBIENT_ANIMALS.IDLE_MAX_MS
    );
    if (this.sprite && this.sprite.scene && this.sprite.anims) {
      this.sprite.anims.stop();
      this.sprite.setFrame(0);
    }
  }

  _enterWalk() {
    if (!this.sprite || !this.sprite.scene) return;

    // Pick a random direction biased toward the center of the zone if near edges
    const cx = (this.bounds.minX + this.bounds.maxX) * 0.5;
    const cy = (this.bounds.minY + this.bounds.maxY) * 0.5;
    let angle = Math.random() * Math.PI * 2;
    if (
      this.sprite.x < this.bounds.minX + TILE.SIZE ||
      this.sprite.x > this.bounds.maxX - TILE.SIZE ||
      this.sprite.y < this.bounds.minY + TILE.SIZE ||
      this.sprite.y > this.bounds.maxY - TILE.SIZE
    ) {
      angle = Math.atan2(cy - this.sprite.y, cx - this.sprite.x) + randRange(-0.6, 0.6);
    }

    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.state = 'walk';
    this.stateTimerMs = randRange(
      AMBIENT_ANIMALS.WALK_MIN_MS,
      AMBIENT_ANIMALS.WALK_MAX_MS
    );

    if (Math.abs(this.vx) > 0.5) {
      this.sprite.setFlipX(this.vx < 0);
    }
    if (this.sprite.anims) {
      this.sprite.play(this.animKey, true);
    }
  }

  update(delta, playerX, playerY) {
    if (!this.sprite || !this.sprite.scene) return;

    this.stateTimerMs -= delta;
    if (this.stateTimerMs <= 0) {
      if (this.state === 'idle') {
        this._enterWalk();
      } else {
        this._enterIdle();
      }
    }

    if (this.state === 'walk') {
      const dt = delta / 1000;
      const nx = this.sprite.x + this.vx * dt;
      const ny = this.sprite.y + this.vy * dt;

      const insideBounds =
        nx >= this.bounds.minX &&
        nx <= this.bounds.maxX &&
        ny >= this.bounds.minY &&
        ny <= this.bounds.maxY;

      const walkable =
        insideBounds && (!this.canWalkTo || this.canWalkTo(nx, ny));

      if (walkable) {
        this.sprite.setPosition(nx, ny);
        this.sprite.setDepth(DEPTH.Y_SORT_BASE + ny);
      } else {
        this._enterIdle();
      }
    }

    // Rare proximity SFX when player is nearby
    if (this.sfxKey) {
      this.soundTimerMs -= delta;
      if (this.soundTimerMs <= 0) {
        this.soundTimerMs = randRange(
          AMBIENT_ANIMALS.SOUND_MIN_INTERVAL_MS,
          AMBIENT_ANIMALS.SOUND_MAX_INTERVAL_MS
        );
        const dx = this.sprite.x - playerX;
        const dy = this.sprite.y - playerY;
        const maxDist = AMBIENT_ANIMALS.SOUND_MAX_DISTANCE_PX;
        if (dx * dx + dy * dy <= maxDist * maxDist && Math.random() < 0.45) {
          AudioManager.playSfx(this.sfxKey);
        }
      }
    }
  }

  destroy() {
    try {
      if (this.sprite && this.sprite.scene) {
        this.sprite.destroy();
      }
    } catch {
      // ignore if already destroyed by DisplayList#shutdown
    }
    this.sprite = null;
    this.scene = null;
  }
}
