import { AMBIENT_ANIMALS, MAP_ZONES, TILE, WORLD } from '../data/gameConfig.js';

const CELL_LAND = 0;
const CELL_WATER = 1;
const CELL_FORBIDDEN = 2;

/**
 * One shared tile map of forbidden cells for all ambient animals, built once at spawn.
 *
 * Cells:
 * - `0` walkable land
 * - `1` pond water (only the duck may stand here)
 * - `2` forbidden: blocked props, pond water for land animals, pier planks,
 *   and the farm plot plus a 1-tile safety margin around it
 *
 * `isLandWalkable` / `isWaterWalkable` sample a small footprint at a world position,
 * and `isLineWalkable` samples the straight path between two points. Everything runs
 * on the typed array, so animal `update()` never builds strings or objects.
 */
export class AnimalTerrain {
  constructor(worldBuilder) {
    this.width = WORLD.WIDTH_TILES;
    this.height = WORLD.HEIGHT_TILES;
    this.grid = new Uint8Array(this.width * this.height);

    for (let ty = 0; ty < this.height; ty += 1) {
      for (let tx = 0; tx < this.width; tx += 1) {
        let cell = CELL_LAND;
        if (worldBuilder.isWaterTile(tx, ty)) {
          cell = CELL_WATER;
        } else if (worldBuilder.isTileBlocked(tx, ty)) {
          cell = CELL_FORBIDDEN;
        }
        this.grid[ty * this.width + tx] = cell;
      }
    }

    // Farm plot + safety margin: animals may walk the paths around it, never inside
    const farm = MAP_ZONES.FARM_PLOT;
    const margin = AMBIENT_ANIMALS.FARM_MARGIN_TILES;
    for (let ty = farm.Y0 - margin; ty <= farm.Y1 + margin; ty += 1) {
      for (let tx = farm.X0 - margin; tx <= farm.X1 + margin; tx += 1) {
        this._setCell(tx, ty, CELL_FORBIDDEN);
      }
    }

    // Pier planks are walkable for the player but off-limits for ambient animals
    const pond = MAP_ZONES.POND;
    this._setCell(pond.PIER_X, pond.PIER_Y, CELL_FORBIDDEN);
    this._setCell(pond.PIER_X + 1, pond.PIER_Y, CELL_FORBIDDEN);
  }

  _setCell(tx, ty, cell) {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return;
    this.grid[ty * this.width + tx] = cell;
  }

  /**
   * Updates a single tile cell when a dynamic resource node breaks or respawns,
   * preserving pond water, pier, and farm plot safety margins.
   */
  setTileBlocked(tx, ty, blocked) {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return;
    const farm = MAP_ZONES.FARM_PLOT;
    const margin = AMBIENT_ANIMALS.FARM_MARGIN_TILES;
    if (
      tx >= farm.X0 - margin &&
      tx <= farm.X1 + margin &&
      ty >= farm.Y0 - margin &&
      ty <= farm.Y1 + margin
    ) {
      return;
    }
    const idx = ty * this.width + tx;
    if (this.grid[idx] === CELL_WATER) return;
    this.grid[idx] = blocked ? CELL_FORBIDDEN : CELL_LAND;
  }

  _cellAtWorld(wx, wy) {
    const tx = Math.floor(wx / TILE.SIZE);
    const ty = Math.floor(wy / TILE.SIZE);
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return -1;
    return this.grid[ty * this.width + tx];
  }

  _isFootprint(wx, wy, expected, halfX, halfY) {
    return (
      this._cellAtWorld(wx - halfX, wy - halfY) === expected &&
      this._cellAtWorld(wx + halfX, wy - halfY) === expected &&
      this._cellAtWorld(wx - halfX, wy + halfY) === expected &&
      this._cellAtWorld(wx + halfX, wy + halfY) === expected &&
      this._cellAtWorld(wx, wy) === expected
    );
  }

  isLandWalkable(wx, wy) {
    return this._isFootprint(
      wx,
      wy,
      CELL_LAND,
      AMBIENT_ANIMALS.FOOTPRINT_HALF_X_PX,
      AMBIENT_ANIMALS.FOOTPRINT_HALF_Y_PX
    );
  }

  isWaterWalkable(wx, wy) {
    return this._isFootprint(
      wx,
      wy,
      CELL_WATER,
      AMBIENT_ANIMALS.WATER_FOOTPRINT_HALF_PX,
      AMBIENT_ANIMALS.WATER_FOOTPRINT_HALF_PX
    );
  }

  /**
   * Straight-line clearance check used when choosing a wander target (no pathfinding).
   */
  isLineWalkable(x0, y0, x1, y1, waterOnly) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const step = AMBIENT_ANIMALS.LINE_SAMPLE_STEP_PX;
    const steps = Math.max(1, Math.ceil(dist / step));

    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const wx = x0 + dx * t;
      const wy = y0 + dy * t;
      const ok = waterOnly
        ? this.isWaterWalkable(wx, wy)
        : this.isLandWalkable(wx, wy);
      if (!ok) return false;
    }
    return true;
  }

  /**
   * Picks a random valid spawn far enough from already placed animals.
   * Returns `{ x, y }` (spawn-time only) or `null` when the map has no room left.
   */
  findSpawnPosition(waterOnly, placed, minSepPx = AMBIENT_ANIMALS.SPAWN_MIN_SEPARATION_PX) {
    const isWalkable = waterOnly
      ? (wx, wy) => this.isWaterWalkable(wx, wy)
      : (wx, wy) => this.isLandWalkable(wx, wy);
    const minSepSq = minSepPx * minSepPx;
    const isFarEnough = (wx, wy) => {
      if (!placed) return true;
      for (let i = 0; i < placed.length; i += 1) {
        const dx = wx - placed[i].x;
        const dy = wy - placed[i].y;
        if (dx * dx + dy * dy < minSepSq) return false;
      }
      return true;
    };

    const attempts = AMBIENT_ANIMALS.SPAWN_MAX_ATTEMPTS;
    const padX = 2 * TILE.SIZE;
    const padY = 2 * TILE.SIZE;
    const maxX = this.width * TILE.SIZE - padX;
    const maxY = this.height * TILE.SIZE - padY;

    for (let i = 0; i < attempts; i += 1) {
      const wx = padX + Math.random() * (maxX - padX);
      const wy = padY + Math.random() * (maxY - padY);
      if (isWalkable(wx, wy) && isFarEnough(wx, wy)) return { x: wx, y: wy };
    }

    // Deterministic fallback scan (tile centers, 2-tile stride) so spawn never fails
    for (let ty = 2; ty < this.height - 2; ty += 2) {
      for (let tx = 2; tx < this.width - 2; tx += 2) {
        const wx = tx * TILE.SIZE + TILE.SIZE / 2;
        const wy = ty * TILE.SIZE + TILE.SIZE / 2;
        if (isWalkable(wx, wy) && isFarEnough(wx, wy)) return { x: wx, y: wy };
      }
    }
    return null;
  }
}
