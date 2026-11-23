import { charLayerKey } from '../data/assetKeys.js';
import { DEPTH, NPC as NPC_CONFIG, PLAYER, TILE } from '../data/gameConfig.js';

/**
 * NPC desa statis: container 3 lapisan karakter (`base`, rambut, `tools`)
 * dengan animasi idle dan sesekali `doing`. Dibuat dan dihancurkan oleh
 * `WorldBuilder` bersama map desa; tidak punya update per-frame.
 */
export class NPC {
  constructor(scene, def, spot) {
    this.scene = scene;
    this.id = def.id;
    this.name = def.name;
    this.dialogueId = def.dialogueId || def.id;

    this.x = spot.tileX * TILE.SIZE + TILE.SIZE / 2;
    this.y = spot.tileY * TILE.SIZE + TILE.SIZE / 2;
    this.facing = { x: spot.facing?.x || 0, y: spot.facing?.y || 1 };
    this.flipX = this.facing.x < 0;

    this._doingTimer = null;
    this._returnTimer = null;
    this._doing = false;

    this.parts = ['base', def.hair || 'shorthair', 'tools'];
    const originY = PLAYER.FRAME_FEET_Y / PLAYER.FRAME_HEIGHT;

    this.container = scene.add.container(this.x, this.y);
    this.layers = {};
    for (const part of this.parts) {
      const sprite = scene.add
        .sprite(0, 0, charLayerKey('idle', part), 0)
        .setOrigin(0.5, originY)
        .setFlipX(this.flipX);
      this.layers[part] = sprite;
      this.container.add(sprite);
    }
    this.container.setDepth(DEPTH.Y_SORT_BASE + this.y);

    // Collider kecil di titik kaki agar pemain tidak menembus NPC.
    this.collider = scene.add.zone(
      this.x,
      this.y,
      NPC_CONFIG.COLLIDER_WIDTH,
      NPC_CONFIG.COLLIDER_HEIGHT
    );
    scene.physics.add.existing(this.collider, true);

    this._playLayers('idle');
    this._scheduleDoing();
  }

  get isAlive() {
    return Boolean(this.container && this.container.scene);
  }

  distanceTo(x, y) {
    return Math.hypot(this.x - x, this.y - y);
  }

  _playLayers(action) {
    if (!this.container || !this.container.scene) return;
    for (const part of this.parts) {
      const sprite = this.layers[part];
      if (!sprite || !sprite.scene) continue;
      sprite.setFlipX(this.flipX);
      sprite.play(`${charLayerKey(action, part)}_anim`, true);
    }
  }

  _scheduleDoing() {
    if (!this.scene || !this.isAlive) return;
    const min = NPC_CONFIG.DOING_MIN_DELAY_MS;
    const max = NPC_CONFIG.DOING_MAX_DELAY_MS;
    const delay = Math.round(min + Math.random() * Math.max(0, max - min));
    this._doingTimer = this.scene.time.delayedCall(delay, () => {
      this._doingTimer = null;
      this._startDoing();
    });
  }

  _startDoing() {
    if (!this.isAlive || this._doing) return;
    this._doing = true;
    this._playLayers('doing');
    this._returnTimer = this.scene.time.delayedCall(NPC_CONFIG.DOING_DURATION_MS, () => {
      this._returnTimer = null;
      this._doing = false;
      this._playLayers('idle');
      this._scheduleDoing();
    });
  }

  destroy() {
    if (this._doingTimer) {
      try {
        this._doingTimer.remove(false);
      } catch {
        // scene clock may already be shutting down
      }
      this._doingTimer = null;
    }
    if (this._returnTimer) {
      try {
        this._returnTimer.remove(false);
      } catch {
        // scene clock may already be shutting down
      }
      this._returnTimer = null;
    }

    try {
      if (this.collider && this.collider.scene) this.collider.destroy();
    } catch {
      // DisplayList may have destroyed it first
    }
    this.collider = null;

    try {
      if (this.container && this.container.scene) this.container.destroy();
    } catch {
      // DisplayList may have destroyed it first
    }
    this.container = null;
    this.layers = null;
    this.scene = null;
  }
}
