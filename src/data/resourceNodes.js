import { RESOURCE_NODES } from './gameConfig.js';

export const NODE_KINDS = Object.freeze({
  TREE: 'tree',
  ROCK: 'rock',
});

/** Stable IDs for all 10 farm tree nodes and 7 farm rock nodes. */
export const FARM_RESOURCE_NODE_DEFS = Object.freeze([
  ...RESOURCE_NODES.TREE_NODE_KEYS.map((coordKey) => {
    const [tx, ty] = coordKey.split(',').map(Number);
    return Object.freeze({
      id: `tree_${tx}_${ty}`,
      kind: NODE_KINDS.TREE,
      tx,
      ty,
    });
  }),
  ...RESOURCE_NODES.ROCK_PLACEMENTS.map((r) =>
    Object.freeze({
      id: `rock_${r.tx}_${r.ty}`,
      kind: NODE_KINDS.ROCK,
      tx: r.tx,
      ty: r.ty,
      variant: r.variant,
    })
  ),
]);

export const VALID_RESOURCE_NODE_IDS = new Set(
  FARM_RESOURCE_NODE_DEFS.map((def) => def.id)
);

export const TREE_RESOURCE_COORD_SET = new Set(RESOURCE_NODES.TREE_NODE_KEYS);

/**
 * Deterministic 32-bit FNV-1a hash returning a float in [0, 1).
 */
export function hashNodeDay(nodeId, day, salt = '') {
  const input = `${nodeId}:${Math.max(1, Math.floor(Number(day) || 1))}:${salt}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function deterministicInt(nodeId, day, salt, minVal, maxVal) {
  const lo = Math.min(minVal, maxVal);
  const hi = Math.max(minVal, maxVal);
  const span = hi - lo + 1;
  return lo + Math.floor(hashNodeDay(nodeId, day, salt) * span);
}

/**
 * Computes deterministic hit count and drop amount from (nodeId + day).
 */
export function getNodeStatsForDay(nodeId, kind, day) {
  if (kind === NODE_KINDS.TREE) {
    return {
      maxHits: deterministicInt(
        nodeId,
        day,
        'hits',
        RESOURCE_NODES.TREE_HITS_MIN,
        RESOURCE_NODES.TREE_HITS_MAX
      ),
      dropAmount: deterministicInt(
        nodeId,
        day,
        'drop',
        RESOURCE_NODES.TREE_DROP_MIN,
        RESOURCE_NODES.TREE_DROP_MAX
      ),
      itemId: RESOURCE_NODES.WOOD_ITEM_ID,
    };
  }
  return {
    maxHits: deterministicInt(
      nodeId,
      day,
      'hits',
      RESOURCE_NODES.ROCK_HITS_MIN,
      RESOURCE_NODES.ROCK_HITS_MAX
    ),
    dropAmount: deterministicInt(
      nodeId,
      day,
      'drop',
      RESOURCE_NODES.ROCK_DROP_MIN,
      RESOURCE_NODES.ROCK_DROP_MAX
    ),
    itemId: RESOURCE_NODES.ROCK_ITEM_ID,
  };
}

export function getRespawnDays(kind) {
  return kind === NODE_KINDS.TREE
    ? RESOURCE_NODES.TREE_RESPAWN_DAYS
    : RESOURCE_NODES.ROCK_RESPAWN_DAYS;
}

/**
 * Sanitizes optional `gameState.nodes` (`{ [nodeId]: respawnDay }`).
 * Unknown node IDs, non-finite numbers, and values `< 1` are dropped cleanly.
 */
export function sanitizeNodesState(rawNodes) {
  const clean = {};
  if (!rawNodes || typeof rawNodes !== 'object' || Array.isArray(rawNodes)) {
    return clean;
  }
  for (const [nodeId, rawDay] of Object.entries(rawNodes)) {
    if (!VALID_RESOURCE_NODE_IDS.has(nodeId)) continue;
    if (rawDay === null || rawDay === undefined || rawDay === '') continue;
    const dayNum = Number(rawDay);
    if (!Number.isFinite(dayNum) || dayNum < 1) continue;
    clean[nodeId] = Math.floor(dayNum);
  }
  return clean;
}

export function isNodeDestroyed(nodesState, nodeId, currentDay) {
  if (!nodesState || typeof nodesState !== 'object') return false;
  const respawnDay = Number(nodesState[nodeId]);
  if (!Number.isFinite(respawnDay) || respawnDay < 1) return false;
  const day = Math.max(1, Math.floor(Number(currentDay) || 1));
  return day < Math.floor(respawnDay);
}

/**
 * Evaluates due respawns in `nodesState` for `currentDay`:
 * - If `currentDay >= respawnDay` and tile is free (`!isTileOccupied(tx, ty)`), deletes
 *   the entry and adds `node` to `respawned`.
 * - If tile is occupied by player or ambient animal, postpones to `currentDay + 1`.
 */
export function resolveNodeRespawns(
  nodesState,
  nodeList,
  currentDay,
  isTileOccupied
) {
  const respawned = [];
  const delayed = [];
  if (!nodesState || typeof nodesState !== 'object' || !Array.isArray(nodeList)) {
    return { respawned, delayed };
  }
  const day = Math.max(1, Math.floor(Number(currentDay) || 1));

  for (let i = 0; i < nodeList.length; i += 1) {
    const node = nodeList[i];
    if (!node) continue;
    const rawRespawn = nodesState[node.id];
    if (rawRespawn === undefined) continue;
    const respawnDay = Number(rawRespawn);
    if (!Number.isFinite(respawnDay) || respawnDay < 1) {
      delete nodesState[node.id];
      continue;
    }
    if (day < Math.floor(respawnDay)) continue;

    const occupied =
      typeof isTileOccupied === 'function'
        ? Boolean(isTileOccupied(node.tx, node.ty))
        : false;
    if (occupied) {
      nodesState[node.id] = day + 1;
      delayed.push(node);
    } else {
      delete nodesState[node.id];
      respawned.push(node);
    }
  }

  return { respawned, delayed };
}
