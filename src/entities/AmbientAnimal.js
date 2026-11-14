import { ASSET_KEYS } from '../data/assetKeys.js';
import { AMBIENT_ANIMALS, DEPTH, LIVESTOCK, TILE } from '../data/gameConfig.js';
import { AudioManager } from '../systems/AudioManager.js';

const ANIMAL_TEXTURE_MAP = Object.freeze({
  chicken: ASSET_KEYS.ANIMAL_CHICKEN,
  cow: ASSET_KEYS.ANIMAL_COW,
  pig: ASSET_KEYS.ANIMAL_PIG,
  sheep: ASSET_KEYS.ANIMAL_SHEEP,
  duck: ASSET_KEYS.ANIMAL_DUCK,
  bird: ASSET_KEYS.ANIMAL_BIRD,
});

// Only species with real audio files in `public/assets/audio/sfx/animals/`
const ANIMAL_SFX_MAP = Object.freeze({
  chicken: ASSET_KEYS.SFX_ANIMAL_CHICKEN,
  cow: ASSET_KEYS.SFX_ANIMAL_COW,
  sheep: null,
  pig: null,
  duck: null,
  bird: null,
});

// Floating "ready to collect" icon per livestock product
const PRODUCT_ICON_MAP = Object.freeze({
  egg: ASSET_KEYS.ITEM_EGG,
  milk: ASSET_KEYS.ITEM_MILK,
});

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Lightweight ambient village animal (`AmbientAnimal`):
 * - Free random wander state machine ('idle' <-> 'walk') across the whole map
 * - Picks a target 6-10 tiles away and only accepts it when the straight line is clear
 *   (no pathfinding; forbidden tiles are rejected by `AnimalTerrain`)
 * - Computes `flipX` from per-species `facesRight` so sprite always faces movement direction
 * - Rejects walk targets closer than `minSeparationPx` (~2 tiles) to other animals
 * - Pauses while the player is within `PLAYER_PAUSE_RADIUS_PX`, resumes when they leave
 * - Y-sorted depth (`DEPTH.Y_SORT_BASE + y`), zero object allocations in `update()`
 */
export class AmbientAnimal {
  constructor(scene, config) {
    this.scene = scene;
    this.type = config.type;
    this.textureKey = ANIMAL_TEXTURE_MAP[this.type] || ASSET_KEYS.ANIMAL_CHICKEN;
    this.animKey = `${this.textureKey}_walk`;
    this.sfxKey = ANIMAL_SFX_MAP[this.type] || null;
    this.facesRight = Boolean(config.facesRight);
    this.speed = config.speed || 14;
    this.minSeparationPx =
      config.minSeparationPx ?? AMBIENT_ANIMALS.MIN_SEPARATION_PX;
    this.playerPauseRadius =
      config.playerPauseRadius ?? AMBIENT_ANIMALS.PLAYER_PAUSE_RADIUS_PX;
    this.peers = config.peers || null;
    this.canWalkTo = config.canWalkTo; // (worldX, worldY) => boolean
    this.canWalkSegment = config.canWalkSegment || null; // (x0,y0,x1,y1) => boolean
    // Stable id used by the livestock save field (`chicken_1`, `cow_1`, ...)
    this.id = config.id || null;
    this.productDef = LIVESTOCK.PRODUCT_ANIMALS[this.type] || null;
    this.productReady = false;
    this.productIcon = null;
    this.iconPhase = 0;

    this.targetX = config.x;
    this.targetY = config.y;

    this.sprite = scene.add
      .sprite(config.x, config.y, this.textureKey, 0)
      .setOrigin(0.5, config.originY ?? 0.8)
      .setFlipX(Boolean(config.initialFlipX))
      .setDepth(DEPTH.Y_SORT_BASE + config.y);

    // One icon per productive animal, created once and only toggled later (no per-frame alloc)
    if (this.productDef && scene.add && scene.add.image) {
      const iconKey = PRODUCT_ICON_MAP[this.productDef.itemId];
      if (iconKey) {
        this.productIcon = scene.add
          .image(
            config.x,
            config.y - LIVESTOCK.PRODUCT_ICON_OFFSET_Y,
            iconKey
          )
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.Y_SORT_BASE + config.y + 30)
          .setVisible(false);
      }
    }

    this.state = 'idle';
    this.stateTimerMs = randRange(400, AMBIENT_ANIMALS.IDLE_MAX_MS);
    this.vx = 0;
    this.vy = 0;
    this.soundTimerMs = randRange(
      AMBIENT_ANIMALS.SOUND_MIN_INTERVAL_MS,
      AMBIENT_ANIMALS.SOUND_MAX_INTERVAL_MS
    );
  }

  _isTooCloseToPeers(x, y, minDist) {
    const peers = this.peers;
    if (!peers) return false;
    const minDistSq = minDist * minDist;
    for (let i = 0; i < peers.length; i++) {
      const other = peers[i];
      if (other === this || !other.sprite) continue;
      const dx = x - other.sprite.x;
      const dy = y - other.sprite.y;
      if (dx * dx + dy * dy < minDistSq) return true;
      if (other.state === 'walk') {
        const tdx = x - other.targetX;
        const tdy = y - other.targetY;
        if (tdx * tdx + tdy * tdy < minDistSq) return true;
      }
    }
    return false;
  }

  _wouldApproachPeer(curX, curY, nextX, nextY, minDist) {
    const peers = this.peers;
    if (!peers) return false;
    const minDistSq = minDist * minDist;
    for (let i = 0; i < peers.length; i++) {
      const other = peers[i];
      if (other === this || !other.sprite) continue;
      const ox = other.sprite.x;
      const oy = other.sprite.y;
      const ndx = nextX - ox;
      const ndy = nextY - oy;
      const nextDistSq = ndx * ndx + ndy * ndy;
      if (nextDistSq < minDistSq) {
        const cdx = curX - ox;
        const cdy = curY - oy;
        if (nextDistSq < cdx * cdx + cdy * cdy) {
          return true;
        }
      }
    }
    return false;
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

    const maxAttempts = AMBIENT_ANIMALS.TARGET_MAX_ATTEMPTS || 14;
    const minSep = this.minSeparationPx;
    const curX = this.sprite.x;
    const curY = this.sprite.y;
    const minDist = (AMBIENT_ANIMALS.WANDER_MIN_TILES || 6) * TILE.SIZE;
    const maxDist = (AMBIENT_ANIMALS.WANDER_MAX_TILES || 10) * TILE.SIZE;
    let chosenX = curX;
    let chosenY = curY;
    let found = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = randRange(minDist, maxDist);
      const candX = curX + Math.cos(angle) * dist;
      const candY = curY + Math.sin(angle) * dist;

      if (this.canWalkTo && !this.canWalkTo(candX, candY)) continue;
      // Reject when the straight line to the target crosses a forbidden tile
      if (
        this.canWalkSegment &&
        !this.canWalkSegment(curX, curY, candX, candY)
      ) {
        continue;
      }

      if (this._isTooCloseToPeers(candX, candY, minSep)) {
        continue;
      }

      chosenX = candX;
      chosenY = candY;
      found = true;
      break;
    }

    if (!found) {
      this._enterIdle();
      return;
    }

    const dx = chosenX - curX;
    const dy = chosenY - curY;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      this._enterIdle();
      return;
    }

    this.targetX = chosenX;
    this.targetY = chosenY;
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
    this.state = 'walk';

    // Straight line is verified clear, so walk until the target is reached
    const travelMs = (dist / this.speed) * 1000;
    this.stateTimerMs = travelMs;

    if (Math.abs(this.vx) > 0.05) {
      const movingRight = this.vx > 0;
      this.sprite.setFlipX(this.facesRight ? !movingRight : movingRight);
    }
    if (this.sprite.anims) {
      this.sprite.play(this.animKey, true);
    }
  }

  /**
   * Shows/hides the floating egg/milk icon. Visibility only changes on day change,
   * collection, or load, so the scene calls this from event handlers (never per frame).
   */
  setProductReady(ready) {
    const next = Boolean(ready);
    if (next === this.productReady) return;
    this.productReady = next;
    if (this.productIcon) {
      this.productIcon.setVisible(next);
      if (next) this.iconPhase = 0;
    }
  }

  update(delta, playerX, playerY) {
    if (!this.sprite || !this.sprite.scene) return;

    const pdx = this.sprite.x - playerX;
    const pdy = this.sprite.y - playerY;
    const playerNear =
      pdx * pdx + pdy * pdy <=
      this.playerPauseRadius * this.playerPauseRadius;

    this.stateTimerMs -= delta;
    if (this.stateTimerMs <= 0) {
      if (this.state === 'idle') {
        if (playerNear) {
          this.stateTimerMs = AMBIENT_ANIMALS.PLAYER_PAUSE_RETRY_MS;
        } else {
          this._enterWalk();
        }
      } else {
        this._enterIdle();
      }
    }

    // Stop immediately when the player walks up, resume once they move away
    if (playerNear && this.state === 'walk') {
      this._enterIdle();
    }

    if (this.state === 'walk') {
      const dt = delta * 0.001;
      const curX = this.sprite.x;
      const curY = this.sprite.y;
      const nx = curX + this.vx * dt;
      const ny = curY + this.vy * dt;

      const reachedTarget =
        (this.targetX - nx) * this.vx + (this.targetY - ny) * this.vy <= 0;

      const walkable =
        (!this.canWalkTo || this.canWalkTo(nx, ny)) &&
        !this._wouldApproachPeer(curX, curY, nx, ny, this.minSeparationPx * 0.9);

      if (walkable) {
        if (reachedTarget) {
          this.sprite.setPosition(this.targetX, this.targetY);
          this.sprite.setDepth(DEPTH.Y_SORT_BASE + this.targetY);
          this._enterIdle();
        } else {
          this.sprite.setPosition(nx, ny);
          this.sprite.setDepth(DEPTH.Y_SORT_BASE + ny);
        }
      } else {
        this._enterIdle();
      }
    }

    // Floating product icon follows the animal with a slow bob (mutates the existing sprite)
    if (this.productIcon && this.productReady) {
      this.iconPhase += delta * LIVESTOCK.PRODUCT_ICON_BOB_SPEED;
      const bob = Math.sin(this.iconPhase) * LIVESTOCK.PRODUCT_ICON_BOB_PX;
      this.productIcon.setPosition(
        this.sprite.x,
        this.sprite.y - LIVESTOCK.PRODUCT_ICON_OFFSET_Y + bob
      );
      this.productIcon.setDepth(DEPTH.Y_SORT_BASE + this.sprite.y + 30);
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
        if (dx * dx + dy * dy <= maxDist * maxDist && Math.random() < 0.5) {
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
    try {
      if (this.productIcon && this.productIcon.scene) {
        this.productIcon.destroy();
      }
    } catch {
      // ignore if already destroyed by DisplayList#shutdown
    }
    this.productIcon = null;
    this.peers = null;
    this.sprite = null;
    this.scene = null;
  }
}
