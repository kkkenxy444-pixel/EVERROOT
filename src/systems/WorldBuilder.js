import { ASSET_KEYS } from '../data/assetKeys.js';
import { DEPTH, MAP_ZONES, TILE, UI, WORLD } from '../data/gameConfig.js';
import {
  DIRT_PATH_VARIANTS,
  GRASS_VARIANTS,
  TILE_INDEX,
  waterTileFor,
} from '../data/tileIndex.js';
import { pixelTextStyle } from './FontLoader.js';

/**
 * Deterministic PRNG (Mulberry32) so grass speckles, flowers, and pebble placement
 * stay consistent across runs without storing an external map file.
 */
function createSeededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds the outdoor 16px map in `GameScene`:
 * - Multi-layer Phaser Tilemap from `spr_tileset_sunnysideworld_16px.png`
 *   (ground grass, dirt paths + grass fringes, farm plot border, lake water + shore banks + wooden pier)
 * - Cottage house from `buildings_v001.png` with animated chimney smoke (sleep/save point)
 * - Shipping box (`crate_base` + `crate_top`) and Seed Stall (`buildings_v001.png`) for selling & buying
 * - Animated trees (`tree_round`, `tree_pine`), mushrooms, coracle boat, and windmill landmark
 * - Arcade Physics static collider group for water, trees, buildings, fences, and map perimeter
 */
export class WorldBuilder {
  constructor(scene) {
    this.scene = scene;
    this.colliders = scene.physics.add.staticGroup();
    this.waterTiles = new Set();
    this.dirtTiles = new Set();
    this.farmableTiles = new Set();
    this.blockedTiles = new Set();
    this.landmarkLabels = {};
  }

  build() {
    const W = WORLD.WIDTH_TILES;
    const H = WORLD.HEIGHT_TILES;
    const rng = createSeededRng(WORLD.SEED);

    const map = this.scene.make.tilemap({
      tileWidth: TILE.SIZE,
      tileHeight: TILE.SIZE,
      width: W,
      height: H,
    });

    const tileset = map.addTilesetImage(
      ASSET_KEYS.TILESET_SUNNYSIDE,
      ASSET_KEYS.TILESET_SUNNYSIDE,
      TILE.SIZE,
      TILE.SIZE,
      0,
      0
    );

    const groundLayer = map
      .createBlankLayer('ground', tileset, 0, 0)
      .setDepth(DEPTH.GROUND);
    const detailLayer = map
      .createBlankLayer('detail', tileset, 0, 0)
      .setDepth(DEPTH.GROUND_DETAIL);
    const waterLayer = map
      .createBlankLayer('water', tileset, 0, 0)
      .setDepth(DEPTH.WATER);
    const shoreLayer = map
      .createBlankLayer('shore', tileset, 0, 0)
      .setDepth(DEPTH.SHORE);

    // 1. Fill grass base across the entire map
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const r = rng();
        let tile = TILE_INDEX.GRASS_PLAIN_B;
        if (r < 0.35) {
          tile = TILE_INDEX.GRASS_PLAIN_A;
        } else if (r < 0.58) {
          const idx = Math.floor(rng() * GRASS_VARIANTS.length);
          tile = GRASS_VARIANTS[idx];
        }
        groundLayer.putTileAt(tile, tx, ty);
      }
    }

    // 2. Carve dirt paths connecting House -> Farm Plot -> Shipping Box / Stall -> Fishing Pier
    const paintPathRect = (x0, y0, x1, y1) => {
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const v =
            rng() < 0.55
              ? TILE_INDEX.DIRT_PATH_BASE
              : DIRT_PATH_VARIANTS[Math.floor(rng() * DIRT_PATH_VARIANTS.length)];
          groundLayer.putTileAt(v, tx, ty);
          this.dirtTiles.add(`${tx},${ty}`);
        }
      }
    };

    // Path from house door south to farm plot
    paintPathRect(12, 8, 14, 11);
    // Horizontal main road north of farm plot (leading to shipping box, stall, and lake pier)
    paintPathRect(7, 9, 25, 10);
    // Path branch down to the lake pier at (25..26, 11..15)
    paintPathRect(24, 10, 25, 16);
    // West border path around farm plot
    paintPathRect(6, 10, 7, 19);

    // Add grass fringe overlays along dirt path edges where adjacent tile is grass
    for (let ty = 1; ty < H - 1; ty++) {
      for (let tx = 1; tx < W - 1; tx++) {
        if (this.dirtTiles.has(`${tx},${ty}`)) continue;
        if (this.dirtTiles.has(`${tx},${ty + 1}`)) {
          detailLayer.putTileAt(TILE_INDEX.PATH_FRINGE_TOP, tx, ty);
        } else if (this.dirtTiles.has(`${tx},${ty - 1}`)) {
          detailLayer.putTileAt(TILE_INDEX.PATH_FRINGE_BOTTOM, tx, ty);
        } else if (this.dirtTiles.has(`${tx + 1},${ty}`)) {
          detailLayer.putTileAt(TILE_INDEX.PATH_FRINGE_LEFT, tx, ty);
        } else if (this.dirtTiles.has(`${tx - 1},${ty}`)) {
          detailLayer.putTileAt(TILE_INDEX.PATH_FRINGE_RIGHT, tx, ty);
        }
      }
    }

    // 3. Mark the dedicated Farmable Plot area (`MAP_ZONES.FARM_PLOT`) with subtle border & warm soil-ready grass
    const fp = MAP_ZONES.FARM_PLOT;
    for (let ty = fp.Y0; ty <= fp.Y1; ty++) {
      for (let tx = fp.X0; tx <= fp.X1; tx++) {
        this.farmableTiles.add(`${tx},${ty}`);
        groundLayer.putTileAt(
          (tx + ty) % 2 === 0
            ? TILE_INDEX.GRASS_PLAIN_A
            : TILE_INDEX.GRASS_SPECK_LIGHT_3,
          tx,
          ty
        );
      }
    }

    // 4. Build the Fishing Lake / Pond (`MAP_ZONES.POND`)
    const pond = MAP_ZONES.POND;
    for (let ty = pond.Y0; ty <= pond.Y1; ty++) {
      for (let tx = pond.X0; tx <= pond.X1; tx++) {
        waterLayer.putTileAt(waterTileFor(tx, ty), tx, ty);
        this.waterTiles.add(`${tx},${ty}`);
        this.blockedTiles.add(`${tx},${ty}`);

        // Shore bank ring around pond perimeter
        if (ty === pond.Y0) {
          const t =
            tx === pond.X0
              ? TILE_INDEX.SHORE_TOP_LEFT
              : tx === pond.X1
                ? TILE_INDEX.SHORE_TOP_RIGHT
                : TILE_INDEX.SHORE_TOP;
          shoreLayer.putTileAt(t, tx, ty);
        } else if (ty === pond.Y1) {
          const t =
            tx === pond.X0
              ? TILE_INDEX.SHORE_BOTTOM_LEFT
              : tx === pond.X1
                ? TILE_INDEX.SHORE_BOTTOM_RIGHT
                : TILE_INDEX.SHORE_BOTTOM;
          shoreLayer.putTileAt(t, tx, ty);
        } else if (tx === pond.X0) {
          shoreLayer.putTileAt(TILE_INDEX.SHORE_LEFT, tx, ty);
        } else if (tx === pond.X1) {
          shoreLayer.putTileAt(TILE_INDEX.SHORE_RIGHT, tx, ty);
        } else if (rng() < 0.14) {
          shoreLayer.putTileAt(
            rng() < 0.5
              ? TILE_INDEX.WATER_SPARKLE_1
              : TILE_INDEX.WATER_SPARKLE_2,
            tx,
            ty
          );
        }
      }
    }

    // Wooden fishing pier jutting into the lake at (26..27, 15) so player can walk out & cast rod
    for (const px of [pond.X0, pond.X0 + 1]) {
      shoreLayer.putTileAt(TILE_INDEX.BRIDGE_PLANK_TOP, px, pond.PIER_Y);
      this.waterTiles.delete(`${px},${pond.PIER_Y}`);
      this.blockedTiles.delete(`${px},${pond.PIER_Y}`);
      this.dirtTiles.add(`${px},${pond.PIER_Y}`);
    }

    // Add invisible physics colliders for all water tiles (excluding the walkable wooden pier)
    for (const key of this.waterTiles) {
      const [tx, ty] = key.split(',').map(Number);
      this._addTileCollider(tx, ty, TILE.SIZE, TILE.SIZE);
    }

    // Animated water glints on the lake
    const glintCoords = [
      [29, 13],
      [33, 15],
      [30, 18],
      [35, 19],
    ];
    for (const [gx, gy] of glintCoords) {
      const sp = this.scene.add
        .sprite(
          gx * TILE.SIZE + 8,
          gy * TILE.SIZE + 8,
          ASSET_KEYS.FX_GLINT,
          0
        )
        .setDepth(DEPTH.SHORE + 0.2);
      sp.play(`${ASSET_KEYS.FX_GLINT}_anim`);
    }

    // Coracle boat prop resting by the northern lake bank
    this.scene.add
      .image(
        (pond.X0 + 2) * TILE.SIZE,
        (pond.Y0 - 0.3) * TILE.SIZE,
        ASSET_KEYS.CORACLE_LAND
      )
      .setOrigin(0.5, 0.8)
      .setDepth(DEPTH.Y_SORT_BASE + (pond.Y0 - 0.3) * TILE.SIZE);

    // 5. Place Fences north of the farm plot
    for (let tx = fp.X0; tx <= fp.X1; tx++) {
      if (tx >= 12 && tx <= 14) continue; // open gate entrance
      const fy = fp.Y0 - 1;
      const tileIdx =
        tx === fp.X0
          ? TILE_INDEX.FENCE_LEFT
          : tx === fp.X1
            ? TILE_INDEX.FENCE_RIGHT
            : TILE_INDEX.FENCE_MID_1;
      detailLayer.putTileAt(tileIdx, tx, fy);
      this._addTileCollider(tx, fy, 14, 10);
      this.blockedTiles.add(`${tx},${fy}`);
    }

    // 6. Place Player Cottage (`buildings_v001.png`), Shipping Box, Seed Stall, and Windmill
    this._buildPlayerHouse();
    this._buildShippingAndShopArea();
    this._buildWindmill();

    // 7. Place Trees, Rocks, Flowers, and Mushrooms around the valley
    this._populateNature(rng, detailLayer);

    return {
      widthPx: W * TILE.SIZE,
      heightPx: H * TILE.SIZE,
      colliders: this.colliders,
    };
  }

  _buildPlayerHouse() {
    const hz = MAP_ZONES.HOUSE;
    // Register cropped textures from `buildings_v001.png` once
    this._ensureCroppedFrame(
      ASSET_KEYS.BUILDINGS_SHEET,
      'house_body_frame',
      hz.BODY_CROP.x,
      hz.BODY_CROP.y,
      hz.BODY_CROP.w,
      hz.BODY_CROP.h
    );
    this._ensureCroppedFrame(
      ASSET_KEYS.BUILDINGS_SHEET,
      'house_door_frame',
      hz.DOOR_CROP.x,
      hz.DOOR_CROP.y,
      hz.DOOR_CROP.w,
      hz.DOOR_CROP.h
    );

    const houseCenterX = (hz.TILE_X + 2) * TILE.SIZE;
    const houseBottomY = (hz.TILE_Y + 3) * TILE.SIZE;

    const houseContainer = this.scene.add.container(houseCenterX, houseBottomY);
    const bodyImg = this.scene.add
      .image(0, 0, ASSET_KEYS.BUILDINGS_SHEET, 'house_body_frame')
      .setOrigin(0.5, 1);
    const doorImg = this.scene.add
      .image(-1, 0, ASSET_KEYS.BUILDINGS_SHEET, 'house_door_frame')
      .setOrigin(0.5, 1);

    houseContainer.add([bodyImg, doorImg]);
    houseContainer.setDepth(DEPTH.Y_SORT_BASE + houseBottomY - 4);

    // Chimney smoke rising from cottage roof
    const smoke = this.scene.add
      .sprite(houseCenterX + 14, houseBottomY - 42, ASSET_KEYS.CHIMNEY_SMOKE, 0)
      .setOrigin(0.5, 1)
      .setAlpha(0.85)
      .setDepth(DEPTH.Y_SORT_BASE + houseBottomY);
    smoke.play(`${ASSET_KEYS.CHIMNEY_SMOKE}_anim`);

    // Solid collider covering cottage footprint (tiles x=11..14, y=5..7)
    for (let ty = hz.TILE_Y + 1; ty < hz.TILE_Y + hz.HEIGHT_TILES; ty++) {
      for (let tx = hz.TILE_X; tx < hz.TILE_X + hz.WIDTH_TILES; tx++) {
        this._addTileCollider(tx, ty, TILE.SIZE, TILE.SIZE);
        this.blockedTiles.add(`${tx},${ty}`);
      }
    }

    // Small sign label above door (hidden until player is nearby)
    const labelFontPx = UI.FONT?.WORLD_LABEL || 9;
    this.landmarkLabels.sleep = this.scene.add
      .text(
        hz.DOOR_TILE_X * TILE.SIZE + 8,
        (hz.DOOR_TILE_Y - 0.25) * TILE.SIZE,
        'Rumah (Tidur)',
        pixelTextStyle(labelFontPx, '#fff6e0', {
          resolution: 3,
          stroke: '#120b07',
          strokeThickness: 2,
          backgroundColor: 'rgba(18,11,7,0.88)',
          padding: { x: 4, y: 2 },
        })
      )
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.WORLD_PROMPT)
      .setVisible(false);
  }

  _buildShippingAndShopArea() {
    // Shipping Box (Crate Base + Crate Top from `farming/crops/`)
    const sb = MAP_ZONES.SHIPPING_BOX;
    const sbX = sb.TILE_X * TILE.SIZE + 8;
    const sbY = (sb.TILE_Y + 1) * TILE.SIZE - 2;
    const labelFontPx = UI.FONT?.WORLD_LABEL || 9;

    const crateBase = this.scene.add
      .image(sbX, sbY, ASSET_KEYS.CRATE_BASE)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.Y_SORT_BASE + sbY);
    const crateTop = this.scene.add
      .image(sbX, sbY - 5, ASSET_KEYS.CRATE_TOP)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.Y_SORT_BASE + sbY + 1);
    this.shippingLid = crateTop;
    this.shippingBase = crateBase;

    this._addTileCollider(sb.TILE_X, sb.TILE_Y, 14, 12);
    this.blockedTiles.add(`${sb.TILE_X},${sb.TILE_Y}`);

    this.landmarkLabels.sell = this.scene.add
      .text(
        sbX,
        sbY - 20,
        'Jual Panen',
        pixelTextStyle(labelFontPx, '#ffd866', {
          resolution: 3,
          stroke: '#120b07',
          strokeThickness: 2,
          backgroundColor: 'rgba(18,11,7,0.88)',
          padding: { x: 4, y: 2 },
        })
      )
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.WORLD_PROMPT)
      .setVisible(false);

    // Seed Stall next to Shipping Box (`MAP_ZONES.SEED_STALL`)
    const st = MAP_ZONES.SEED_STALL;
    this._ensureCroppedFrame(
      ASSET_KEYS.BUILDINGS_SHEET,
      'seed_stall_frame',
      st.CROP.x,
      st.CROP.y,
      st.CROP.w,
      st.CROP.h
    );

    const stallX = (st.TILE_X + 1) * TILE.SIZE;
    const stallY = (st.TILE_Y + 1) * TILE.SIZE;
    this.scene.add
      .image(stallX, stallY, ASSET_KEYS.BUILDINGS_SHEET, 'seed_stall_frame')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.Y_SORT_BASE + stallY);

    // Display a seed bag & basket on the stall counter
    this.scene.add
      .image(stallX - 5, stallY - 6, ASSET_KEYS.ITEM_SEEDS)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.Y_SORT_BASE + stallY + 1);
    this.scene.add
      .image(stallX + 5, stallY - 6, ASSET_KEYS.ICON_BASKET)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.Y_SORT_BASE + stallY + 1);

    this.landmarkLabels.shop = this.scene.add
      .text(
        stallX,
        stallY - 25,
        'Kios Bibit',
        pixelTextStyle(labelFontPx, '#a8f0a0', {
          resolution: 3,
          stroke: '#120b07',
          strokeThickness: 2,
          backgroundColor: 'rgba(18,11,7,0.88)',
          padding: { x: 4, y: 2 },
        })
      )
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.WORLD_PROMPT)
      .setVisible(false);

    this._addTileCollider(st.TILE_X, st.TILE_Y, 15, 12);
    this._addTileCollider(st.TILE_X + 1, st.TILE_Y, 15, 12);
    this.blockedTiles.add(`${st.TILE_X},${st.TILE_Y}`);
    this.blockedTiles.add(`${st.TILE_X + 1},${st.TILE_Y}`);
  }

  _buildWindmill() {
    const wm = MAP_ZONES.WINDMILL;
    const wmX = wm.TILE_X * TILE.SIZE;
    const wmY = wm.TILE_Y * TILE.SIZE;

    const windmill = this.scene.add
      .sprite(wmX, wmY, ASSET_KEYS.WINDMILL, 0)
      .setOrigin(0.5, 0.72)
      .setDepth(DEPTH.Y_SORT_BASE + wmY);
    windmill.play(`${ASSET_KEYS.WINDMILL}_anim`);

    this._addTileCollider(wm.TILE_X - 1, wm.TILE_Y, 16, 14);
    this._addTileCollider(wm.TILE_X, wm.TILE_Y, 16, 14);
    this.blockedTiles.add(`${wm.TILE_X - 1},${wm.TILE_Y}`);
    this.blockedTiles.add(`${wm.TILE_X},${wm.TILE_Y}`);
  }

  _populateNature(rng, detailLayer) {
    const W = WORLD.WIDTH_TILES;
    const H = WORLD.HEIGHT_TILES;

    // Curated tree positions framing the valley + perimeter woods
    const treePlacements = [
      // North woods
      { tx: 4, ty: 4, type: 'round' },
      { tx: 7, ty: 5, type: 'pine' },
      { tx: 17, ty: 4, type: 'round' },
      { tx: 24, ty: 5, type: 'pine' },
      { tx: 27, ty: 6, type: 'round' },
      { tx: 37, ty: 5, type: 'pine' },
      { tx: 40, ty: 7, type: 'round' },
      // West woods
      { tx: 3, ty: 9, type: 'pine' },
      { tx: 4, ty: 14, type: 'round' },
      { tx: 3, ty: 19, type: 'pine' },
      { tx: 5, ty: 24, type: 'round' },
      // South woods
      { tx: 9, ty: 23, type: 'round' },
      { tx: 14, ty: 25, type: 'pine' },
      { tx: 19, ty: 23, type: 'round' },
      { tx: 23, ty: 25, type: 'pine' },
      { tx: 29, ty: 24, type: 'round' },
      { tx: 35, ty: 25, type: 'pine' },
      // East woods
      { tx: 40, ty: 13, type: 'pine' },
      { tx: 41, ty: 18, type: 'round' },
      { tx: 39, ty: 23, type: 'pine' },
    ];

    for (const t of treePlacements) {
      const worldX = t.tx * TILE.SIZE + 8;
      const worldY = (t.ty + 1) * TILE.SIZE;
      const key =
        t.type === 'round' ? ASSET_KEYS.TREE_ROUND : ASSET_KEYS.TREE_PINE;
      const tree = this.scene.add
        .sprite(worldX, worldY, key, 0)
        .setOrigin(0.5, 0.92)
        .setDepth(DEPTH.Y_SORT_BASE + worldY);
      tree.play(`${key}_anim`);

      this._addTileCollider(t.tx, t.ty, 14, 12);
      this.blockedTiles.add(`${t.tx},${t.ty}`);
    }

    // Perimeter border colliders & bushes (1-tile margin around map)
    for (let tx = 0; tx < W; tx++) {
      detailLayer.putTileAt(TILE_INDEX.BUSH_LARGE_1, tx, 0);
      detailLayer.putTileAt(TILE_INDEX.BUSH_LARGE_2, tx, H - 1);
      this._addTileCollider(tx, 0, TILE.SIZE, TILE.SIZE);
      this._addTileCollider(tx, H - 1, TILE.SIZE, TILE.SIZE);
      this.blockedTiles.add(`${tx},0`);
      this.blockedTiles.add(`${tx},${H - 1}`);
    }
    for (let ty = 1; ty < H - 1; ty++) {
      detailLayer.putTileAt(TILE_INDEX.BUSH_LARGE_3, 0, ty);
      detailLayer.putTileAt(TILE_INDEX.BUSH_LARGE_4, W - 1, ty);
      this._addTileCollider(0, ty, TILE.SIZE, TILE.SIZE);
      this._addTileCollider(W - 1, ty, TILE.SIZE, TILE.SIZE);
      this.blockedTiles.add(`0,${ty}`);
      this.blockedTiles.add(`${W - 1},${ty}`);
    }

    // Decorative rocks & stumps (solid)
    const rocks = [
      { tx: 6, ty: 7, tile: TILE_INDEX.ROCK_LARGE },
      { tx: 22, ty: 14, tile: TILE_INDEX.ROCK_CLUSTER },
      { tx: 22, ty: 19, tile: TILE_INDEX.STUMP_1 },
      { tx: 38, ty: 9, tile: TILE_INDEX.ROCK_MEDIUM },
    ];
    for (const r of rocks) {
      detailLayer.putTileAt(r.tile, r.tx, r.ty);
      this._addTileCollider(r.tx, r.ty, 12, 10);
      this.blockedTiles.add(`${r.tx},${r.ty}`);
    }

    // Animated mushrooms
    const mushrooms = [
      { tx: 5, ty: 11, key: ASSET_KEYS.MUSHROOM_RED },
      { tx: 23, ty: 21, key: ASSET_KEYS.MUSHROOM_BLUE },
      { tx: 38, ty: 21, key: ASSET_KEYS.MUSHROOM_RED },
    ];
    for (const m of mushrooms) {
      const sp = this.scene.add
        .sprite(m.tx * TILE.SIZE + 8, m.ty * TILE.SIZE + 8, m.key, 0)
        .setDepth(DEPTH.DECOR_FLAT);
      sp.play(`${m.key}_anim`);
    }

    // Wildflowers on open grass tiles (non-blocking)
    const flowerTiles = [
      TILE_INDEX.FLOWER_BLUE_SINGLE,
      TILE_INDEX.FLOWER_BLUE_CLUSTER,
      TILE_INDEX.FLOWER_RED_SINGLE,
      TILE_INDEX.FLOWER_RED_CLUSTER,
      TILE_INDEX.FLOWER_WHITE_SINGLE,
      TILE_INDEX.FLOWER_WHITE_CLUSTER,
    ];
    for (let ty = 2; ty < H - 2; ty++) {
      for (let tx = 2; tx < W - 2; tx++) {
        const key = `${tx},${ty}`;
        if (
          this.blockedTiles.has(key) ||
          this.dirtTiles.has(key) ||
          this.farmableTiles.has(key)
        ) {
          continue;
        }
        if (rng() < 0.045) {
          const fl = flowerTiles[Math.floor(rng() * flowerTiles.length)];
          detailLayer.putTileAt(fl, tx, ty);
        }
      }
    }
  }

  _ensureCroppedFrame(sheetKey, frameName, x, y, w, h) {
    const tex = this.scene.textures.get(sheetKey);
    if (tex && !tex.has(frameName)) {
      tex.add(frameName, 0, x, y, w, h);
    }
  }

  _addTileCollider(tx, ty, width = TILE.SIZE, height = TILE.SIZE) {
    const cx = tx * TILE.SIZE + TILE.SIZE / 2;
    const cy = ty * TILE.SIZE + TILE.SIZE / 2;
    const zone = this.scene.add.zone(cx, cy, width, height);
    this.scene.physics.add.existing(zone, true);
    this.colliders.add(zone);
  }

  isFarmableTile(tx, ty) {
    return this.farmableTiles.has(`${tx},${ty}`);
  }

  isWaterTile(tx, ty) {
    return this.waterTiles.has(`${tx},${ty}`);
  }

  isDirtTile(tx, ty) {
    return this.dirtTiles.has(`${tx},${ty}`);
  }

  /**
   * Checks if player is standing next to or facing an interactive landmark:
   * - `'sleep'` at the House door (`MAP_ZONES.HOUSE.DOOR_TILE_X, DOOR_TILE_Y`)
   * - `'sell'` at the Shipping Box (`MAP_ZONES.SHIPPING_BOX`)
   * - `'shop'` at the Seed Stall (`MAP_ZONES.SEED_STALL`)
   */
  getNearbyLandmark(playerX, playerY, frontTile) {
    const ptx = Math.floor(playerX / TILE.SIZE);
    const pty = Math.floor(playerY / TILE.SIZE);

    const nearTile = (targetX, targetY, maxDist = 1.6) => {
      const dPlayer = Math.hypot(ptx - targetX, pty - targetY);
      const dFront = frontTile
        ? Math.hypot(frontTile.tx - targetX, frontTile.ty - targetY)
        : 99;
      return Math.min(dPlayer, dFront) <= maxDist;
    };

    const hz = MAP_ZONES.HOUSE;
    if (nearTile(hz.DOOR_TILE_X, hz.DOOR_TILE_Y, 1.35)) {
      return {
        type: 'sleep',
        label: 'Tidur & Simpan (Rumah)',
        tx: hz.DOOR_TILE_X,
        ty: hz.DOOR_TILE_Y,
      };
    }

    const sb = MAP_ZONES.SHIPPING_BOX;
    if (nearTile(sb.TILE_X, sb.TILE_Y, 1.35)) {
      return {
        type: 'sell',
        label: 'Kotak Jual / Toko',
        tx: sb.TILE_X,
        ty: sb.TILE_Y,
      };
    }

    const st = MAP_ZONES.SEED_STALL;
    if (
      nearTile(st.TILE_X, st.TILE_Y, 1.45) ||
      nearTile(st.TILE_X + 1, st.TILE_Y, 1.45)
    ) {
      return {
        type: 'shop',
        label: 'Beli Bibit & Jual Hasil',
        tx: st.TILE_X,
        ty: st.TILE_Y,
      };
    }

    return null;
  }

  /**
   * Shows only the world label for the building/landmark the player is currently near,
   * keeping the valley clean from floating text clutter when walking elsewhere.
   */
  updateLandmarkLabels(activeType = null) {
    if (!this.landmarkLabels) return;
    for (const [type, labelObj] of Object.entries(this.landmarkLabels)) {
      if (labelObj) {
        labelObj.setVisible(type === activeType);
      }
    }
  }
}
