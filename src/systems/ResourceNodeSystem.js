import { ASSET_KEYS } from '../data/assetKeys.js';
import { DEPTH, RESOURCE_NODES, TILE } from '../data/gameConfig.js';
import { TOOL_IDS } from '../data/items.js';
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
 * - Explicit tool matching: Kapak (5) chops trees, Beliung (6) mines rocks
 * - Reach-based nearest targeting (REACH_PX, 120° forward cone + close omni-range)
 * - Auto-faces the target node on strike; shows subtle reusable target highlight
 * - Deterministic hit counts & drops from (nodeId + day)
 * - Reusable dust effect & shake tween on hit (no per-frame allocations)
 * - Full-inventory guard on final hit (preserves node and warns player)
 * - Day-based respawn (4d trees, 3d rocks), postponed if player or animal occupies tile
 */
export class ResourceNodeSystem {
  static requiredKindForTool(toolId) {
    if (toolId === TOOL_IDS.AXE) return NODE_KINDS.TREE;
    if (toolId === TOOL_IDS.PICKAXE) return NODE_KINDS.ROCK;
    return null;
  }

  static getToolMetaForKind(kind) {
    if (kind === NODE_KINDS.TREE) {
      return {
        toolId: TOOL_IDS.AXE,
        actionLabel: 'Tebang',
        wrongToolHint: 'Pilih Kapak (5)',
        iconKey: ASSET_KEYS.ICON_AXE,
      };
    }
    return {
      toolId: TOOL_IDS.PICKAXE,
      actionLabel: 'Tambang',
      wrongToolHint: 'Pilih Beliung (6)',
      iconKey: ASSET_KEYS.ICON_PICKAXE,
    };
  }

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

    // Reusable hint payload (avoid per-frame allocations in GameScene.update)
    this._hintOut = { text: '', iconKey: null };

    // Single reusable subtle target highlight ring drawn once per target change
    this.targetHighlightGfx =
      scene?.add?.graphics ? scene.add.graphics().setVisible(false) : null;
    this._highlightedNodeId = null;
    this._highlightPhase = 0;

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
   * Finds the nearest active resource node (optionally filtered by `kindFilter`)
   * within `RESOURCE_NODES.REACH_PX` from the player's feet to the node base,
   * inside the 120° forward cone (`FRONT_ARC_HALF_COS`) or within `CLOSE_OMNI_PX`
   * regardless of facing direction.
   */
  findNearestNodeInReach(player, kindFilter = null) {
    if (!player || this._destroyed) return null;
    const nodes = this._getNodes();
    if (nodes.length === 0) return null;

    const px = player.x;
    const py = player.y;
    const reach = RESOURCE_NODES.REACH_PX;
    const reachSq = reach * reach;
    const closeOmni = RESOURCE_NODES.CLOSE_OMNI_PX;
    const closeOmniSq = closeOmni * closeOmni;
    const minCos = RESOURCE_NODES.FRONT_ARC_HALF_COS;

    const fx = player.facing?.x ?? 0;
    const fy = player.facing?.y ?? 1;
    const fLen = Math.hypot(fx, fy) || 1;
    const nfx = fx / fLen;
    const nfy = fy / fLen;

    let bestNode = null;
    let bestDistSq = reachSq + 0.0001;

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (!node || !node.active) continue;
      if (kindFilter && node.kind !== kindFilter) continue;

      const dx = node.baseX - px;
      const dy = node.baseY - py;
      const distSq = dx * dx + dy * dy;
      if (distSq > reachSq) continue;

      if (distSq > closeOmniSq) {
        const dist = Math.sqrt(distSq) || 1;
        const dot = (dx / dist) * nfx + (dy / dist) * nfy;
        if (dot < minCos) continue;
      }

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestNode = node;
      }
    }

    return bestNode;
  }

  /**
   * Returns the nearest active node in reach that matches `toolId`
   * (Kapak -> pohon, Beliung -> batu). Returns `null` for all other tools.
   */
  getTargetNode(player, toolId) {
    const requiredKind = ResourceNodeSystem.requiredKindForTool(toolId);
    if (!requiredKind) return null;
    return this.findNearestNodeInReach(player, requiredKind);
  }

  /**
   * Returns the nearest active node of ANY kind in reach (used to show
   * wrong-tool guidance like "Pilih Kapak (5)" / "Pilih Beliung (6)").
   */
  getAnyNodeInReach(player) {
    return this.findNearestNodeInReach(player, null);
  }

  /**
   * Returns reusable `{ text, iconKey }` hint for the current node in reach,
   * or `null` when no resource node is in reach.
   */
  getNodeHint(player, toolId) {
    const matching = this.getTargetNode(player, toolId);
    if (matching) {
      const meta = ResourceNodeSystem.getToolMetaForKind(matching.kind);
      this._hintOut.text = meta.actionLabel;
      this._hintOut.iconKey = meta.iconKey;
      return this._hintOut;
    }

    const anyNode = this.getAnyNodeInReach(player);
    if (anyNode) {
      const meta = ResourceNodeSystem.getToolMetaForKind(anyNode.kind);
      this._hintOut.text = meta.wrongToolHint;
      this._hintOut.iconKey = meta.iconKey;
      return this._hintOut;
    }

    return null;
  }

  hasHighlightedNode() {
    return this._highlightedNodeId !== null;
  }

  _clearTargetHighlight() {
    this._highlightedNodeId = null;
    if (this.targetHighlightGfx) {
      this.targetHighlightGfx.setVisible(false);
    }
  }

  /**
   * Toggles & positions the reusable subtle outline/glow on the node that will
   * be hit by the currently selected matching tool (zero per-frame allocations).
   */
  updateTargetHighlight(player, toolId, delta = 0) {
    if (!this.targetHighlightGfx || this._destroyed) return;
    const target = toolId ? this.getTargetNode(player, toolId) : null;
    if (!target) {
      if (this._highlightedNodeId !== null) {
        this._clearTargetHighlight();
      }
      return;
    }

    if (target.id !== this._highlightedNodeId) {
      this._highlightedNodeId = target.id;
      const g = this.targetHighlightGfx;
      const isTree = target.kind === NODE_KINDS.TREE;
      const rx = isTree ? 11.5 : 10.5;
      const ry = isTree ? 6.5 : 7;
      const oy = isTree ? -2 : 1;

      g.clear();
      // Subtle dark contrast halo so warm gold glow pops on bright grass
      g.lineStyle(2.2, 0x22140b, 0.35);
      g.strokeEllipse(0, oy, rx * 2 + 1.5, ry * 2 + 1.5);
      // Soft golden-cream shimmer fill
      g.fillStyle(0xf7d560, 0.16);
      g.fillEllipse(0, oy, rx * 2, ry * 2);
      // Crisp warm outline
      g.lineStyle(1.3, 0xf7d560, 0.88);
      g.strokeEllipse(0, oy, rx * 2, ry * 2);

      const depth = isTree
        ? DEPTH.Y_SORT_BASE + target.baseY - 1
        : DEPTH.Y_SORT_BASE + (target.ty + 0.8) * TILE.SIZE - 1;
      g.setPosition(target.baseX, target.baseY);
      g.setDepth(depth);
      g.setVisible(true);
    }

    this._highlightPhase += Number(delta) || 16;
    const pulse = 0.74 + 0.24 * Math.sin(this._highlightPhase * 0.0055);
    this.targetHighlightGfx.setAlpha(pulse);
  }

  tryHit(player, toolId) {
    if (!player || this._destroyed || player.actionLocked) return false;

    const now = this.scene?.time?.now ?? Date.now();
    if (now < this._nextHitAllowedAt) return false;

    const node = this.getTargetNode(player, toolId);
    if (!node) return false;

    // Automatically face target node before striking
    if (typeof player.facePoint === 'function') {
      player.facePoint(node.baseX, node.baseY);
    }

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
      if (this._highlightedNodeId === node.id) {
        this._clearTargetHighlight();
      }

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
      if (this.targetHighlightGfx && this.targetHighlightGfx.scene) {
        this.targetHighlightGfx.destroy();
      }
    } catch {
      // ignore during scene shutdown
    }
    this.hitDustSprite = null;
    this.targetHighlightGfx = null;
    this._highlightedNodeId = null;
    this.hitsDoneById.clear();
    this.worldBuilder = null;
    this.inventorySystem = null;
    this.gameState = null;
    this.scene = null;
  }
}
