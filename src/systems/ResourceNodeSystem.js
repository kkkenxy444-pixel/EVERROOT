import { ASSET_KEYS } from '../data/assetKeys.js';
import { DEPTH, RESOURCE_NODES, TILE } from '../data/gameConfig.js';
import {
  getNodeStatsForDay,
  getRespawnDays,
  isNodeDestroyed,
  NODE_KINDS,
  resolveNodeRespawns,
  sanitizeNodesState,
} from '../data/resourceNodes.js';
import { AudioManager } from './AudioManager.js';
import { eventBus, EVENTS } from './EventBus.js';

/**
 * Farm-only resource gathering system (trees -> Kayu, rocks -> Batu).
 * - Automatic tool selection on AKSI when facing a nearby node (no toolbar switch needed)
 * - Deterministic hit counts & drops from (nodeId + day)
 * - Reusable dust effect & shake tween on hit (no per-frame allocations)
 * - Full-inventory guard on final hit (preserves node and warns player)
 * - Day-based respawn (4d trees, 3d rocks), postponed if player or animal occupies tile
 */
export class ResourceNodeSystem {
  constructor(scene, gameState, worldBuilder, inventorySystem, options = {}) {
    this.scene = scene;
    this.gameState = gameState;
    this.worldBuilder = worldBuilder;
    this.inventorySystem = inventorySystem;
    this.onStateChanged =
      typeof options.onStateChanged === 'function' ? options.onStateChanged : null;
    this.getPlayerTile =
      typeof options.getPlayerTile === 'function' ? options.getPlayerTile : () => null;
    this.getAnimals =
      typeof options.getAnimals === 'function' ? options.getAnimals : () => [];
    this.getAnimalTerrain =
      typeof options.getAnimalTerrain === 'function'
        ? options.getAnimalTerrain
        : () => null;

    if (!this.gameState.nodes || typeof this.gameState.nodes !== 'object') {
      this.gameState.nodes = {};
    } else {
      this.gameState.nodes = sanitizeNodesState(this.gameState.nodes);
    }

    this.hitsDoneById = new Map();
    this._nextHitAllowedAt = 0;
    this._contactTimer = null;
    this._destroyed = false;

    // Single reusable dust puff sprite for chop/mine impacts
    this.hitDustSprite =
      scene?.add?.sprite
        ? scene.add
            .sprite(0, 0, ASSET_KEYS.FX_DUST_WALK, 0)
            .setOrigin(0.5, 0.8)
            .setVisible(false)
            .setDepth(DEPTH.FX)
        : null;

    this._onDayAdvanced = () => this._handleNewDay();
    eventBus.on(EVENTS.DAY_ADVANCED, this._onDayAdvanced);
  }

  _getCurrentDay() {
    return Math.max(1, Math.floor(Number(this.gameState?.day) || 1));
  }

  _getNodes() {
    return Array.isArray(this.worldBuilder?.resourceNodes)
      ? this.worldBuilder.resourceNodes
      : [];
  }

  _isTileOccupied(tx, ty) {
    const pt = this.getPlayerTile();
    if (pt && pt.tx === tx && pt.ty === ty) return true;

    const animals = this.getAnimals();
    if (Array.isArray(animals)) {
      for (let i = 0; i < animals.length; i += 1) {
        const sp = animals[i]?.sprite;
        if (!sp) continue;
        const atx = Math.floor(sp.x / TILE.SIZE);
        const aty = Math.floor(sp.y / TILE.SIZE);
        if (atx === tx && aty === ty) return true;
      }
    }
    return false;
  }

  /**
   * Applies saved `gameState.nodes` to freshly built WorldBuilder nodes before
   * `AnimalTerrain` computes forbidden tiles. Any due respawn not under the
   * player spawn tile respawns silently immediately.
   */
  syncInitialState() {
    const day = this._getCurrentDay();
    const nodes = this._getNodes();
    const nodesState = this.gameState.nodes;

    resolveNodeRespawns(nodesState, nodes, day, (tx, ty) =>
      this._isTileOccupied(tx, ty)
    );

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const destroyed = isNodeDestroyed(nodesState, node.id, day);
      this.worldBuilder.setResourceNodeActive(node, !destroyed, false);
    }
  }

  _handleNewDay() {
    if (this._destroyed || !this.worldBuilder) return;
    this.hitsDoneById.clear();

    const day = this._getCurrentDay();
    const nodes = this._getNodes();
    const { respawned, delayed } = resolveNodeRespawns(
      this.gameState.nodes,
      nodes,
      day,
      (tx, ty) => this._isTileOccupied(tx, ty)
    );

    const terrain = this.getAnimalTerrain();
    for (let i = 0; i < respawned.length; i += 1) {
      const node = respawned[i];
      this.worldBuilder.setResourceNodeActive(node, true, true);
      if (terrain && typeof terrain.setTileBlocked === 'function') {
        terrain.setTileBlocked(node.tx, node.ty, true);
      }
    }

    if ((respawned.length > 0 || delayed.length > 0) && this.onStateChanged) {
      this.onStateChanged();
    }
  }

  /**
   * Finds the active resource node the player is facing within close reach.
   */
  getTargetNode(player) {
    if (!player || this._destroyed) return null;
    const nodes = this._getNodes();
    if (nodes.length === 0) return null;

    const px = player.x;
    const py = player.y;
    const front = player.getFrontTile();
    const maxR = RESOURCE_NODES.INTERACT_RADIUS_PX;
    const maxRSq = maxR * maxR;
    const fx = player.facing?.x ?? 0;
    const fy = player.facing?.y ?? 1;
    const fLen = Math.hypot(fx, fy) || 1;
    const nfx = fx / fLen;
    const nfy = fy / fLen;

    let frontMatch = null;
    let bestAligned = null;
    let bestDistSq = maxRSq;

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (!node || !node.active) continue;

      const dx = node.baseX - px;
      const dy = (node.kind === NODE_KINDS.TREE ? node.ty * TILE.SIZE + 8 : node.baseY) - py;
      const distSq = dx * dx + dy * dy;
      if (distSq > maxRSq) continue;

      if (front && node.tx === front.tx && node.ty === front.ty) {
        frontMatch = node;
        break;
      }

      const dist = Math.sqrt(distSq) || 1;
      const dot = (dx / dist) * nfx + (dy / dist) * nfy;
      if (dot >= RESOURCE_NODES.FACING_MIN_DOT && distSq < bestDistSq) {
        bestDistSq = distSq;
        bestAligned = node;
      }
    }

    return frontMatch || bestAligned;
  }

  getNodeHint(player) {
    const node = this.getTargetNode(player);
    if (!node) return '';
    return node.kind === NODE_KINDS.TREE ? '[AKSI] Tebang' : '[AKSI] Tambang';
  }

  tryHit(player) {
    if (!player || this._destroyed || player.actionLocked) return false;

    const now = this.scene?.time?.now ?? Date.now();
    if (now < this._nextHitAllowedAt) return false;

    const node = this.getTargetNode(player);
    if (!node) return false;

    const isTree = node.kind === NODE_KINDS.TREE;
    const animAction = isTree ? 'axe' : 'mining';
    const lockMs = isTree
      ? RESOURCE_NODES.AXE_LOCK_MS
      : RESOURCE_NODES.MINING_LOCK_MS;
    const contactDelayMs = isTree
      ? RESOURCE_NODES.AXE_CONTACT_DELAY_MS
      : RESOURCE_NODES.MINING_CONTACT_DELAY_MS;

    this._nextHitAllowedAt = now + lockMs;
    player.playOneShotAction(animAction, lockMs);

    this.cancelPendingHit();
    if (this.scene?.time) {
      this._contactTimer = this.scene.time.delayedCall(contactDelayMs, () => {
        this._contactTimer = null;
        this._onHitContact(node);
      });
    } else {
      this._onHitContact(node);
    }

    return true;
  }

  _onHitContact(node) {
    if (
      this._destroyed ||
      !node ||
      !node.active ||
      !this.scene ||
      (this.scene.sys && !this.scene.sys.isActive()) ||
      this.scene.isSleeping ||
      this.scene.isTransitioning
    ) {
      return;
    }

    const isTree = node.kind === NODE_KINDS.TREE;
    const sfxKey = isTree ? ASSET_KEYS.SFX_AXE_CHOP : ASSET_KEYS.SFX_MINE_CLANG;
    const day = this._getCurrentDay();
    const { maxHits, dropAmount, itemId } = getNodeStatsForDay(
      node.id,
      node.kind,
      day
    );
    const prevHits = this.hitsDoneById.get(node.id) || 0;
    const nextHits = prevHits + 1;

    this._playHitEffects(node);

    if (nextHits >= maxHits) {
      if (!this.inventorySystem || !this.inventorySystem.canAddItem(itemId, dropAmount)) {
        this.hitsDoneById.set(node.id, Math.max(0, maxHits - 1));
        AudioManager.playSfx(ASSET_KEYS.SFX_UI_ERROR);
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Tas penuh! Kosongkan tas sebelum menghancurkan node.'
        );
        return;
      }

      const added = this.inventorySystem.addItem(itemId, dropAmount);
      if (!added || !added.ok) {
        this.hitsDoneById.set(node.id, Math.max(0, maxHits - 1));
        AudioManager.playSfx(ASSET_KEYS.SFX_UI_ERROR);
        eventBus.emit(
          EVENTS.TOAST_MESSAGE,
          'Tas penuh! Kosongkan tas sebelum menghancurkan node.'
        );
        return;
      }

      const breakRate = isTree
        ? RESOURCE_NODES.BREAK_SFX_RATE_TREE
        : RESOURCE_NODES.BREAK_SFX_RATE_ROCK;
      AudioManager.playSfx(sfxKey, { rate: breakRate });

      this.hitsDoneById.delete(node.id);
      this.gameState.nodes[node.id] = day + getRespawnDays(node.kind);
      this.worldBuilder.setResourceNodeActive(node, false, false);

      const terrain = this.getAnimalTerrain();
      if (terrain && typeof terrain.setTileBlocked === 'function') {
        terrain.setTileBlocked(node.tx, node.ty, false);
      }
      if (this.onStateChanged) this.onStateChanged();
      return;
    }

    AudioManager.playSfx(sfxKey);
    this.hitsDoneById.set(node.id, nextHits);
  }

  _playHitEffects(node) {
    // 1. Small shake on the node sprite
    if (node.sprite && node.sprite.scene && this.scene?.tweens) {
      this.scene.tweens.killTweensOf(node.sprite);
      node.sprite.x = node.baseX;
      const offset = RESOURCE_NODES.SHAKE_OFFSET_PX;
      const dur = RESOURCE_NODES.SHAKE_DURATION_MS;
      this.scene.tweens.add({
        targets: node.sprite,
        x: node.baseX + offset,
        duration: dur,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (node.sprite && node.sprite.scene) {
            node.sprite.x = node.baseX;
          }
        },
      });
    }

    // 2. Reusable dust puff at the node base (no new sprite per hit)
    if (this.hitDustSprite && this.hitDustSprite.scene && this.hitDustSprite.anims) {
      const fxY = node.kind === NODE_KINDS.TREE ? node.baseY - 2 : node.baseY + 4;
      this.hitDustSprite.setPosition(node.baseX, fxY);
      this.hitDustSprite.setVisible(true);
      this.hitDustSprite.play(`${ASSET_KEYS.FX_DUST_WALK}_anim`, true);
      this.hitDustSprite.once('animationcomplete', () => {
        if (this.hitDustSprite && this.hitDustSprite.scene) {
          this.hitDustSprite.setVisible(false);
        }
      });
    }
  }

  cancelPendingHit() {
    if (this._contactTimer) {
      try {
        this._contactTimer.remove(false);
      } catch {
        // ignore if scene clock already stopped
      }
      this._contactTimer = null;
    }
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.cancelPendingHit();
    eventBus.off(EVENTS.DAY_ADVANCED, this._onDayAdvanced);

    const nodes = this._getNodes();
    if (this.scene?.tweens) {
      for (let i = 0; i < nodes.length; i += 1) {
        const sp = nodes[i]?.sprite;
        if (sp) {
          try {
            this.scene.tweens.killTweensOf(sp);
          } catch {
            // ignore during scene shutdown
          }
        }
      }
    }

    try {
      if (this.hitDustSprite && this.hitDustSprite.scene) {
        this.hitDustSprite.destroy();
      }
    } catch {
      // ignore during scene shutdown
    }
    this.hitDustSprite = null;
    this.hitsDoneById.clear();
    this.worldBuilder = null;
    this.inventorySystem = null;
    this.gameState = null;
    this.scene = null;
  }
}
