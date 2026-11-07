import { ASSET_KEYS } from '../data/assetKeys.js';
import { AMBIENT_ANIMALS, DEPTH } from '../data/gameConfig.js';
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

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Lightweight ambient village animal (`AmbientAnimal`):
 * - Simple random wander state machine ('idle' <-> 'walk') around an assigned `home` point
 * - Computes `flipX` from per-species `facesRight` so sprite always faces movement direction
 * - Rejects walk targets closer than `minSeparationPx` (~2 tiles) to other animals
 * - Stays strictly within assigned zone bounds and allowed terrain (land vs pond water)
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
    this.bounds = config.bounds; // { minX, minY, maxX, maxY }
    this.homeX = config.homeX ?? config.x;
    this.homeY = config.homeY ?? config.y;
    this.roamRadius = config.roamRadius ?? AMBIENT_ANIMALS.ROAM_RADIUS_PX;
    this.minSeparationPx =
      config.minSeparationPx ?? AMBIENT_ANIMALS.MIN_SEPARATION_PX;
    this.peers = config.peers || null;
    this.canWalkTo = config.canWalkTo; // (worldX, worldY) => boolean

    this.targetX = config.x;
    this.targetY = config.y;

    this.sprite = scene.add
      .sprite(config.x, config.y, this.textureKey, 0)
      .setOrigin(0.5, config.originY ?? 0.8)
      .setFlipX(Boolean(config.initialFlipX))
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

    const maxAttempts = AMBIENT_ANIMALS.TARGET_MAX_ATTEMPTS || 8;
    const minSep = this.minSeparationPx;
    const curX = this.sprite.x;
    const curY = this.sprite.y;
    let chosenX = curX;
    let chosenY = curY;
    let found = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = randRange(this.roamRadius * 0.3, this.roamRadius);
      let candX = this.homeX + Math.cos(angle) * dist;
      let candY = this.homeY + Math.sin(angle) * dist;

      if (candX < this.bounds.minX) candX = this.bounds.minX;
      else if (candX > this.bounds.maxX) candX = this.bounds.maxX;
      if (candY < this.bounds.minY) candY = this.bounds.minY;
      else if (candY > this.bounds.maxY) candY = this.bounds.maxY;

      const moveDx = candX - curX;
      const moveDy = candY - curY;
      if (moveDx * moveDx + moveDy * moveDy < 36) continue;

      if (this.canWalkTo) {
        const midX = (curX + candX) * 0.5;
        const midY = (curY + candY) * 0.5;
        if (!this.canWalkTo(candX, candY) || !this.canWalkTo(midX, midY)) {
          continue;
        }
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

    const travelMs = (dist / this.speed) * 1000;
    this.stateTimerMs = Math.min(travelMs, AMBIENT_ANIMALS.WALK_MAX_MS);

    if (Math.abs(this.vx) > 0.05) {
      const movingRight = this.vx > 0;
      this.sprite.setFlipX(this.facesRight ? !movingRight : movingRight);
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
      const dt = delta * 0.001;
      const curX = this.sprite.x;
      const curY = this.sprite.y;
      const nx = curX + this.vx * dt;
      const ny = curY + this.vy * dt;

      const reachedTarget =
        (this.targetX - nx) * this.vx + (this.targetY - ny) * this.vy <= 0;

      const insideBounds =
        nx >= this.bounds.minX &&
        nx <= this.bounds.maxX &&
        ny >= this.bounds.minY &&
        ny <= this.bounds.maxY;

      const walkable =
        insideBounds &&
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
    this.peers = null;
    this.sprite = null;
    this.scene = null;
  }
}
