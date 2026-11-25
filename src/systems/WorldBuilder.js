import { ASSET_KEYS } from '../data/assetKeys.js';
import {
  DEPTH,
  MAP_IDS,
  MAPS,
  MAP_ZONES,
  NPC as NPC_CONFIG,
  RESOURCE_NODES,
  TILE,
  UI,
  VILLAGE_LAYOUT,
} from '../data/gameConfig.js';
import { NPC_DEFS, resolveNpcSpawns } from '../data/npcs.js';
import { NODE_KINDS, TREE_RESOURCE_COORD_SET } from '../data/resourceNodes.js';
import { NPC } from '../entities/NPC.js';
import {
  DIRT_PATH_VARIANTS,
  GRASS_VARIANTS,
  TILE_INDEX,
  tileCoords,
  waterTileFor,
} from '../data/tileIndex.js';
import { StructureBuilder } from './StructureBuilder.js';
import { UI_STYLE, WoodLabelPanel } from '../ui/UIStyle.js';

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
 * Builds one outdoor 16px map (farm valley or temporary village) in `GameScene`.
 * Every display object, tilemap layer, label, and physics zone is tracked so
 * `destroy()` can rebuild a clean map without touching the shared tileset texture.
 */
export class WorldBuilder {
  constructor(scene, mapId = MAP_IDS.FARM) {
    this.scene = scene;
    this.mapId = MAPS[mapId] ? mapId : MAP_IDS.FARM;
    this.mapDef = MAPS[this.mapId];
    this.colliders = null;
    this.waterTiles = new Set();
    this.dirtTiles = new Set();
    this.farmableTiles = new Set();
    this.blockedTiles = new Set();
    this.landmarkLabels = {};
    this.gateZones = [];
    this.npcs = [];
    this.resourceNodes = [];
    this.structures = new StructureBuilder(scene);
    this._tracked = [];
    this._destroyed = false;
  }

  build() {
    this.colliders = this.scene.physics.add.staticGroup();
    this._track(this.colliders);

    if (this.mapId === MAP_IDS.VILLAGE) {
      this._buildVillage();
    } else {
      this._buildFarmValley();
    }

    const def = this.mapDef;
    return {
      widthPx: def.widthTiles * TILE.SIZE,
      heightPx: def.heightTiles * TILE.SIZE,
      colliders: this.colliders,
      gateZones: this.gateZones,
    };
  }

  _track(obj) {
    if (obj) this._tracked.push(obj);
    return obj;
  }

  _createTilemapLayers(layerDefs) {
    const def = this.mapDef;
    const map = this.scene.make.tilemap({
      tileWidth: TILE.SIZE,
      tileHeight: TILE.SIZE,
      width: def.widthTiles,
      height: def.heightTiles,
    });
    this._track(map);

    const tileset = map.addTilesetImage(
      ASSET_KEYS.TILESET_SUNNYSIDE,
      ASSET_KEYS.TILESET_SUNNYSIDE,
      TILE.SIZE,
      TILE.SIZE,
      0,
      0
    );

    const layers = {};
    for (const layerDef of layerDefs) {
      layers[layerDef.name] = this._track(
        map
          .createBlankLayer(layerDef.name, tileset, 0, 0)
          .setDepth(layerDef.depth)
      );
    }
    return { map, tileset, layers };
  }

  _buildFarmValley() {
    const W = this.mapDef.widthTiles;
    const H = this.mapDef.heightTiles;
    const rng = createSeededRng(this.mapDef.seed);

    const { layers } = this._createTilemapLayers([
      { name: 'ground', depth: DEPTH.GROUND },
      { name: 'detail', depth: DEPTH.GROUND_DETAIL },
      { name: 'water', depth: DEPTH.WATER },
      { name: 'shore', depth: DEPTH.SHORE },
    ]);
    const groundLayer = layers.ground;
    const detailLayer = layers.detail;
    const waterLayer = layers.water;
    const shoreLayer = layers.shore;

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
    // New path branch continuing east from the old road end to the village gate at the right edge
    const gatePath = this.mapDef.gatePath;
    paintPathRect(gatePath.x0, gatePath.y0, gatePath.x1, gatePath.y1);
    // Path branch down to the lake pier at (25..26, 11..15)
    paintPathRect(24, 10, 25, 16);
    // West border path around farm plot
    paintPathRect(6, 10, 7, 19);

    this._paintPathFringes(detailLayer);

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
      const sp = this._track(
        this.scene.add
          .sprite(
            gx * TILE.SIZE + 8,
            gy * TILE.SIZE + 8,
            ASSET_KEYS.FX_GLINT,
            0
          )
          .setDepth(DEPTH.SHORE + 0.2)
      );
      sp.play(`${ASSET_KEYS.FX_GLINT}_anim`);
    }

    // Coracle boat prop resting by the northern lake bank
    this._track(
      this.scene.add
        .image(
          (pond.X0 + 2) * TILE.SIZE,
          (pond.Y0 - 0.3) * TILE.SIZE,
          ASSET_KEYS.CORACLE_LAND
        )
        .setOrigin(0.5, 0.8)
        .setDepth(DEPTH.Y_SORT_BASE + (pond.Y0 - 0.3) * TILE.SIZE)
    );

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

    // 8. Invisible automatic gate trigger at the opened right-edge bushes
    this._addGateZones();
  }

  /**
   * Desa Sunnyside (64x40): jalan utama barat-timur, plaza tengah dengan sumur,
   * 6 rumah struktur + balai di utara plaza, pasar 3 kios + peti/spanduk, hutan
   * kecil di sudut barat daya, dan ujung timur yang buntu. Semua dekorasi
   * deterministik dari seed map dan tidak diletakkan di atas jalan.
   */
  _buildVillage() {
    const W = this.mapDef.widthTiles;
    const H = this.mapDef.heightTiles;
    const rng = createSeededRng(this.mapDef.seed);
    const layout = VILLAGE_LAYOUT;

    const { layers } = this._createTilemapLayers([
      { name: 'ground', depth: DEPTH.GROUND },
      { name: 'detail', depth: DEPTH.GROUND_DETAIL },
    ]);
    const groundLayer = layers.ground;
    const detailLayer = layers.detail;

    // Plain grass base
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const r = rng();
        let tile = TILE_INDEX.GRASS_PLAIN_B;
        if (r < 0.35) {
          tile = TILE_INDEX.GRASS_PLAIN_A;
        } else if (r < 0.6) {
          tile = GRASS_VARIANTS[Math.floor(rng() * GRASS_VARIANTS.length)];
        }
        groundLayer.putTileAt(tile, tx, ty);
      }
    }

    // Jalan masuk gerbang barat + jalan utama + plaza + pasar
    const gatePath = this.mapDef.gatePath;
    this._paintVillageDirt(
      groundLayer,
      rng,
      gatePath.x0,
      gatePath.y0,
      gatePath.x1,
      gatePath.y1
    );
    this._paintVillageDirt(
      groundLayer,
      rng,
      layout.ROAD.X0,
      layout.ROAD.Y0,
      layout.ROAD.X1,
      layout.ROAD.Y1
    );
    this._paintVillageDirt(
      groundLayer,
      rng,
      layout.PLAZA.X0,
      layout.PLAZA.Y0,
      layout.PLAZA.X1,
      layout.PLAZA.Y1
    );
    this._paintVillageDirt(
      groundLayer,
      rng,
      layout.MARKET.X0,
      layout.MARKET.Y0,
      layout.MARKET.X1,
      layout.MARKET.Y1
    );
    // Konektor plaza <-> pasar (satu kolom di x=48)
    this._paintVillageDirt(groundLayer, rng, 48, 15, 48, 20);

    // Jalur kecil tiap rumah/balai ke pintu lalu menyambung ke jalan/plaza
    this._paintVillageFootpaths(groundLayer, rng);

    this._paintPathFringes(detailLayer);

    this._buildVillageBorder(detailLayer);
    this._buildVillagePlazaFence(detailLayer);
    this._buildVillageDeadEnd(detailLayer);

    for (const house of layout.HOUSES) this._buildVillageStructure(house);
    this._buildVillageStructure(layout.BALAI);
    for (const stall of layout.STALLS) this._buildVillageStructure(stall);
    for (const prop of layout.PROPS) this._addVillageProp(prop);

    this._buildVillageHouseGardens(rng, detailLayer);
    this._buildVillageNature(rng, detailLayer);
    this._addVillageWildflowers(rng, detailLayer);

    this._buildVillageNpcs();
    this._addGateZones();
  }

  /**
   * NPC hanya untuk map desa. Setiap NPC dilacak di `_tracked` dan collider
   * kecilnya dimasukkan ke grup collider map, sehingga teardown map ikut
   * menghancurkan semuanya tanpa kebocoran.
   */
  _buildVillageNpcs() {
    this.npcs = [];
    for (const { def, spot } of resolveNpcSpawns(NPC_DEFS, this.mapDef)) {
      const npc = new NPC(this.scene, def, spot);
      this.npcs.push(npc);
      if (npc.collider) this.colliders.add(npc.collider);
      this._track(npc);
    }
  }

  /**
   * Paints a rect of dirt path on the ground layer and records it in `dirtTiles`
   * so decoration placement and path fringes never overlap the road.
   */
  _paintVillageDirt(groundLayer, rng, x0, y0, x1, y1) {
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
  }

  /**
   * Jalur dari pintu (baris bawah bangunan) ke jalan utama atau plaza.
   * - Rumah utara: lurus ke bawah sampai jalan utama.
   * - Rumah selatan: jalur L di depan pintu lalu naik di sisi kanan rumah.
   * - Balai: lurus ke bawah sampai tepi utara plaza.
   */
  _paintVillageFootpaths(groundLayer, rng) {
    const layout = VILLAGE_LAYOUT;
    const road = layout.ROAD;
    const plaza = layout.PLAZA;

    for (const house of layout.HOUSES) {
      const def = this.structures.getDef(house.structure);
      if (!def) continue;
      const doorX = house.tileX + Math.floor((def.w - 1) / 2);
      const frontRow = house.tileY + def.h;

      if (house.cluster === 'north') {
        this._paintVillageDirt(
          groundLayer,
          rng,
          doorX,
          frontRow,
          doorX,
          road.Y0 - 1
        );
      } else {
        const turnX = house.tileX + def.w + 1;
        this._paintVillageDirt(
          groundLayer,
          rng,
          house.tileX + 1,
          frontRow,
          turnX,
          frontRow
        );
        this._paintVillageDirt(
          groundLayer,
          rng,
          turnX,
          road.Y1 + 1,
          turnX,
          frontRow
        );
      }
    }

    const balai = layout.BALAI;
    const balaiDef = this.structures.getDef(balai.structure);
    if (balaiDef) {
      const doorX = balai.tileX + Math.floor((balaiDef.w - 1) / 2);
      this._paintVillageDirt(
        groundLayer,
        rng,
        doorX,
        balai.tileY + balaiDef.h,
        doorX,
        plaza.Y0 - 1
      );
    }
  }

  /**
   * Perimeter semak desa. Collider dibuat sebagai 5 Zone persegi panjang besar
   * (atas, bawah, kiri-atas gerbang, kiri-bawah gerbang, kanan), bukan per tile.
   */
  _buildVillageBorder(detailLayer) {
    const W = this.mapDef.widthTiles;
    const H = this.mapDef.heightTiles;

    for (let tx = 0; tx < W; tx++) {
      detailLayer.putTileAt(TILE_INDEX.BUSH_LARGE_1, tx, 0);
      detailLayer.putTileAt(TILE_INDEX.BUSH_LARGE_2, tx, H - 1);
      this.blockedTiles.add(`${tx},0`);
      this.blockedTiles.add(`${tx},${H - 1}`);
    }
    for (let ty = 1; ty < H - 1; ty++) {
      if (!this._isPerimeterGateTile(0, ty)) {
        detailLayer.putTileAt(TILE_INDEX.BUSH_LARGE_3, 0, ty);
        this.blockedTiles.add(`0,${ty}`);
      }
      detailLayer.putTileAt(TILE_INDEX.BUSH_LARGE_4, W - 1, ty);
      this.blockedTiles.add(`${W - 1},${ty}`);
    }

    this._addTileRectCollider(0, 0, W, 1);
    this._addTileRectCollider(0, H - 1, W, 1);
    this._addTileRectCollider(W - 1, 1, 1, H - 2);

    const gate = (this.mapDef.gates || [])[0];
    const gateY0 = gate ? gate.tileY : 1;
    const gateY1 = gate ? gate.tileY + gate.heightTiles - 1 : 1;
    if (gateY0 - 1 >= 1) {
      this._addTileRectCollider(0, 1, 1, gateY0 - 1);
    }
    if (gateY1 + 1 <= H - 2) {
      this._addTileRectCollider(0, gateY1 + 1, 1, H - 2 - gateY1);
    }

    // Tiang kayu di dua sisi mulut gerbang barat
    if (gateY0 - 1 > 0) {
      detailLayer.putTileAt(TILE_INDEX.FENCE_POST_1, 0, gateY0 - 1);
    }
    if (gateY1 + 1 < H - 1) {
      detailLayer.putTileAt(TILE_INDEX.FENCE_POST_2, 0, gateY1 + 1);
    }
  }

  _buildVillagePlazaFence(detailLayer) {
    for (const seg of VILLAGE_LAYOUT.PLAZA_FENCES) {
      const width = seg.x1 - seg.x0 + 1;
      for (let tx = seg.x0; tx <= seg.x1; tx++) {
        const tileIdx =
          tx === seg.x0
            ? TILE_INDEX.FENCE_LEFT
            : tx === seg.x1
              ? TILE_INDEX.FENCE_RIGHT
              : TILE_INDEX.FENCE_MID_1;
        detailLayer.putTileAt(tileIdx, tx, seg.y);
        this.blockedTiles.add(`${tx},${seg.y}`);
      }
      this._addTileRectCollider(seg.x0, seg.y, width, 1);
    }
  }

  /** Semak buntu di ujung timur jalan utama (untuk ekspansi berikutnya). */
  _buildVillageDeadEnd(detailLayer) {
    const de = VILLAGE_LAYOUT.EAST_DEAD_END;
    for (let ty = de.y0; ty <= de.y1; ty++) {
      detailLayer.putTileAt(
        ty % 2 === 0 ? TILE_INDEX.BUSH_LARGE_2 : TILE_INDEX.BUSH_LARGE_1,
        de.x,
        ty
      );
      this.blockedTiles.add(`${de.x},${ty}`);
    }
    this._addTileRectCollider(de.x, de.y0, 1, de.y1 - de.y0 + 1);
  }

  /**
   * Satu bangunan desa dari `STRUCTURES` (tekstur canvas + satu sprite).
   * Collider hanya di `blockRows` baris bawah supaya atap di atasnya bisa
   * dilewati di belakang bangunan dan pintu tetap dapat didekati.
   */
  _buildVillageStructure(entry) {
    const placed = this.structures.addStructure(
      entry.structure,
      entry.tileX,
      entry.tileY,
      { mirror: !!entry.mirror }
    );
    if (!placed) return;

    const def = placed.def;
    this._track(placed.sprite);

    const blockRows = def.blockRows || 1;
    const centerX = (entry.tileX + def.w / 2) * TILE.SIZE;
    const centerY =
      (entry.tileY + def.h - blockRows / 2) * TILE.SIZE;
    this._addRectCollider(
      centerX,
      centerY,
      def.w * TILE.SIZE,
      blockRows * TILE.SIZE
    );

    for (let ty = entry.tileY; ty < entry.tileY + def.h; ty++) {
      for (let tx = entry.tileX; tx < entry.tileX + def.w; tx++) {
        this.blockedTiles.add(`${tx},${ty}`);
      }
    }
  }

  /** Satu prop dekoratif dari frame tileset, dengan collider kecil opsional. */
  _addVillageProp(entry) {
    const placed = this.structures.addProp(
      entry.name,
      entry.tileX,
      entry.tileY
    );
    if (!placed) return;

    this._track(placed.sprite);

    if (entry.collider) {
      const width = Math.min(placed.prop.w - 4, 18);
      const height = 10;
      this._addRectCollider(
        placed.baseX,
        placed.baseY - height / 2,
        width,
        height
      );
    }

    this.blockedTiles.add(`${entry.tileX},${entry.tileY}`);
  }

  /**
   * Pagar pendek di kedua sisi depan rumah/balai plus bunga di sekeliling
   * footprint. Semua diletakkan hanya di tile kosong (bukan jalan/plaza) agar
   * jalur pintu tetap terbuka.
   */
  _buildVillageHouseGardens(rng, detailLayer) {
    const flowerTiles = [
      TILE_INDEX.FLOWER_BLUE_SINGLE,
      TILE_INDEX.FLOWER_RED_SINGLE,
      TILE_INDEX.FLOWER_WHITE_SINGLE,
      TILE_INDEX.FLOWER_BLUE_CLUSTER,
      TILE_INDEX.FLOWER_RED_CLUSTER,
      TILE_INDEX.FLOWER_WHITE_CLUSTER,
    ];
    const entries = [...VILLAGE_LAYOUT.HOUSES, VILLAGE_LAYOUT.BALAI];

    for (const entry of entries) {
      const def = this.structures.getDef(entry.structure);
      if (!def) continue;

      const frontRow = entry.tileY + def.h;
      for (const tx of [entry.tileX - 1, entry.tileX + def.w]) {
        if (!this._isVillageDecorFree(tx, frontRow)) continue;
        detailLayer.putTileAt(TILE_INDEX.FENCE_MID_1, tx, frontRow);
        this._addTileCollider(tx, frontRow, 14, 10);
        this.blockedTiles.add(`${tx},${frontRow}`);
      }

      for (let ty = entry.tileY - 1; ty <= entry.tileY + def.h; ty++) {
        for (let tx = entry.tileX - 1; tx <= entry.tileX + def.w; tx++) {
          if (!this._isVillageDecorFree(tx, ty)) continue;
          if (rng() >= 0.45) continue;
          detailLayer.putTileAt(
            flowerTiles[Math.floor(rng() * flowerTiles.length)],
            tx,
            ty
          );
        }
      }
    }
  }

  _buildVillageNature(rng, detailLayer) {
    // Pepohonan mengapit klaster rumah, balai, pasar, dan mulut gerbang.
    const curatedTrees = [
      { tx: 8, ty: 8, type: 'round' },
      { tx: 16, ty: 7, type: 'pine' },
      { tx: 22, ty: 7, type: 'round' },
      { tx: 23, ty: 9, type: 'pine' },
      { tx: 29, ty: 9, type: 'round' },
      { tx: 33, ty: 6, type: 'pine' },
      { tx: 43, ty: 6, type: 'round' },
      { tx: 44, ty: 11, type: 'pine' },
      { tx: 46, ty: 13, type: 'round' },
      { tx: 7, ty: 24, type: 'round' },
      { tx: 17, ty: 24, type: 'pine' },
      { tx: 25, ty: 23, type: 'round' },
      { tx: 25, ty: 31, type: 'pine' },
      { tx: 17, ty: 33, type: 'round' },
      { tx: 32, ty: 33, type: 'pine' },
      { tx: 7, ty: 34, type: 'round' },
      { tx: 50, ty: 13, type: 'round' },
      { tx: 58, ty: 13, type: 'pine' },
      { tx: 61, ty: 11, type: 'round' },
      { tx: 4, ty: 17, type: 'round' },
      { tx: 3, ty: 25, type: 'pine' },
    ];
    for (const t of curatedTrees) {
      if (this._isVillageDecorFree(t.tx, t.ty)) {
        this._addVillageTree(t.tx, t.ty, t.type);
      }
    }

    // Hutan kecil deterministik di sudut barat daya
    const forest = VILLAGE_LAYOUT.FOREST;
    let planted = 0;
    let attempts = 0;
    while (planted < 16 && attempts < 220) {
      attempts++;
      const tx = forest.X0 + Math.floor(rng() * (forest.X1 - forest.X0 + 1));
      const ty = forest.Y0 + Math.floor(rng() * (forest.Y1 - forest.Y0 + 1));
      if (!this._isVillageDecorFree(tx, ty)) continue;
      this._addVillageTree(tx, ty, rng() < 0.5 ? 'round' : 'pine');
      planted++;
    }

    const mushrooms = [
      { tx: 6, ty: 27, key: ASSET_KEYS.MUSHROOM_RED },
      { tx: 9, ty: 24, key: ASSET_KEYS.MUSHROOM_BLUE },
      { tx: 17, ty: 30, key: ASSET_KEYS.MUSHROOM_RED },
      { tx: 28, ty: 26, key: ASSET_KEYS.MUSHROOM_BLUE },
      { tx: 43, ty: 26, key: ASSET_KEYS.MUSHROOM_RED },
      { tx: 7, ty: 32, key: ASSET_KEYS.MUSHROOM_BLUE },
    ];
    for (const m of mushrooms) {
      if (!this._isVillageDecorFree(m.tx, m.ty)) continue;
      const sp = this._track(
        this.scene.add
          .sprite(m.tx * TILE.SIZE + 8, m.ty * TILE.SIZE + 8, m.key, 0)
          .setDepth(DEPTH.DECOR_FLAT)
      );
      sp.play(`${m.key}_anim`);
    }

    const rocks = [
      { tx: 6, ty: 33, tile: TILE_INDEX.ROCK_LARGE },
      { tx: 12, ty: 37, tile: TILE_INDEX.ROCK_MEDIUM },
      { tx: 18, ty: 30, tile: TILE_INDEX.ROCK_CLUSTER },
      { tx: 3, ty: 36, tile: TILE_INDEX.ROCK_SMALL },
    ];
    for (const r of rocks) {
      if (!this._isVillageDecorFree(r.tx, r.ty)) continue;
      detailLayer.putTileAt(r.tile, r.tx, r.ty);
      this._addTileCollider(r.tx, r.ty, 12, 10);
      this.blockedTiles.add(`${r.tx},${r.ty}`);
    }

    // Bingkai bunga di tepi plaza (atas, bawah, kiri, kanan)
    const flowerTiles = [
      TILE_INDEX.FLOWER_BLUE_SINGLE,
      TILE_INDEX.FLOWER_RED_SINGLE,
      TILE_INDEX.FLOWER_WHITE_SINGLE,
      TILE_INDEX.FLOWER_BLUE_CLUSTER,
      TILE_INDEX.FLOWER_RED_CLUSTER,
      TILE_INDEX.FLOWER_WHITE_CLUSTER,
    ];
    const plaza = VILLAGE_LAYOUT.PLAZA;
    const addFrameFlower = (tx, ty) => {
      if (!this._isVillageDecorFree(tx, ty)) return;
      if (rng() < 0.35) return;
      const fl = flowerTiles[Math.floor(rng() * flowerTiles.length)];
      detailLayer.putTileAt(fl, tx, ty);
    };
    for (let tx = plaza.X0; tx <= plaza.X1; tx++) {
      addFrameFlower(tx, plaza.Y0 - 1);
      addFrameFlower(tx, plaza.Y1 + 1);
    }
    for (let ty = plaza.Y0; ty <= plaza.Y1; ty++) {
      addFrameFlower(plaza.X0 - 1, ty);
      addFrameFlower(plaza.X1 + 1, ty);
    }
  }

  _addVillageTree(tx, ty, type) {
    const worldX = tx * TILE.SIZE + 8;
    const worldY = (ty + 1) * TILE.SIZE;
    const key = type === 'round' ? ASSET_KEYS.TREE_ROUND : ASSET_KEYS.TREE_PINE;
    const tree = this._track(
      this.scene.add
        .sprite(worldX, worldY, key, 0)
        .setOrigin(0.5, 0.92)
        .setDepth(DEPTH.Y_SORT_BASE + worldY)
    );
    tree.play(`${key}_anim`);

    this._addTileCollider(tx, ty, 14, 12);
    this.blockedTiles.add(`${tx},${ty}`);
  }

  _addVillageWildflowers(rng, detailLayer) {
    const W = this.mapDef.widthTiles;
    const H = this.mapDef.heightTiles;
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
        if (!this._isVillageDecorFree(tx, ty)) continue;
        if (rng() < 0.04) {
          detailLayer.putTileAt(
            flowerTiles[Math.floor(rng() * flowerTiles.length)],
            tx,
            ty
          );
        }
      }
    }
  }

  /** True when a tile can receive decorative nature without covering a road/structure. */
  _isVillageDecorFree(tx, ty) {
    const W = this.mapDef.widthTiles;
    const H = this.mapDef.heightTiles;
    if (tx < 2 || ty < 2 || tx >= W - 2 || ty >= H - 2) return false;
    const key = `${tx},${ty}`;
    return (
      !this.dirtTiles.has(key) &&
      !this.blockedTiles.has(key) &&
      !this.waterTiles.has(key)
    );
  }

  _paintPathFringes(detailLayer) {
    const W = this.mapDef.widthTiles;
    const H = this.mapDef.heightTiles;
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
  }

  /**
   * True when a perimeter tile is part of a gate opening (the trigger rect that
   * touches the left or right map edge). Used to leave the bushes open there.
   */
  _isPerimeterGateTile(tx, ty) {
    const W = this.mapDef.widthTiles;
    const gates = this.mapDef.gates || [];
    for (const gate of gates) {
      const y0 = gate.tileY;
      const y1 = gate.tileY + gate.heightTiles - 1;
      if (ty < y0 || ty > y1) continue;
      const touchesLeft = gate.tileX === 0 && tx === 0;
      const touchesRight =
        gate.tileX + gate.widthTiles >= W && tx === W - 1;
      if (touchesLeft || touchesRight) return true;
    }
    return false;
  }

  /**
   * Creates invisible rectangular gate zones. `GameScene` checks the player
   * position against these each frame and switches maps automatically.
   */
  _addGateZones() {
    const gates = this.mapDef.gates || [];
    for (const gate of gates) {
      const width = gate.widthTiles * TILE.SIZE;
      const height = gate.heightTiles * TILE.SIZE;
      const x0 = gate.tileX * TILE.SIZE;
      const y0 = gate.tileY * TILE.SIZE;
      const zone = this._track(
        this.scene.add.zone(x0 + width / 2, y0 + height / 2, width, height)
      );
      this.gateZones.push({
        zone,
        targetMapId: gate.targetMapId,
        entryPoint: gate.entryPoint,
        x0,
        y0,
        x1: x0 + width,
        y1: y0 + height,
      });
    }
  }

  /**
   * Returns the gate whose trigger rectangle contains the player's feet, or null.
   */
  getGateAt(worldX, worldY) {
    for (let i = 0; i < this.gateZones.length; i++) {
      const gate = this.gateZones[i];
      if (
        worldX >= gate.x0 &&
        worldX <= gate.x1 &&
        worldY >= gate.y0 &&
        worldY <= gate.y1
      ) {
        return gate;
      }
    }
    return null;
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

    const houseContainer = this._track(
      this.scene.add.container(houseCenterX, houseBottomY)
    );
    const bodyImg = this.scene.add
      .image(0, 0, ASSET_KEYS.BUILDINGS_SHEET, 'house_body_frame')
      .setOrigin(0.5, 1);
    const doorImg = this.scene.add
      .image(-1, 0, ASSET_KEYS.BUILDINGS_SHEET, 'house_door_frame')
      .setOrigin(0.5, 1);

    houseContainer.add([bodyImg, doorImg]);
    houseContainer.setDepth(DEPTH.Y_SORT_BASE + houseBottomY - 4);

    // Chimney smoke rising from cottage roof
    const smoke = this._track(
      this.scene.add
        .sprite(houseCenterX + 14, houseBottomY - 42, ASSET_KEYS.CHIMNEY_SMOKE, 0)
        .setOrigin(0.5, 1)
        .setAlpha(0.85)
        .setDepth(DEPTH.Y_SORT_BASE + houseBottomY)
    );
    smoke.play(`${ASSET_KEYS.CHIMNEY_SMOKE}_anim`);

    // Solid collider covering cottage footprint (tiles x=11..14, y=5..7)
    for (let ty = hz.TILE_Y + 1; ty < hz.TILE_Y + hz.HEIGHT_TILES; ty++) {
      for (let tx = hz.TILE_X; tx < hz.TILE_X + hz.WIDTH_TILES; tx++) {
        this._addTileCollider(tx, ty, TILE.SIZE, TILE.SIZE);
        this.blockedTiles.add(`${tx},${ty}`);
      }
    }

    // Small wood sign label above door (hidden until player is nearby)
    const labelFontPx = UI.FONT?.WORLD_LABEL || 9;
    this.landmarkLabels.sleep = this._track(
      new WoodLabelPanel(this.scene, {
        x: hz.DOOR_TILE_X * TILE.SIZE + 8,
        y: (hz.DOOR_TILE_Y - 0.25) * TILE.SIZE,
        originX: 0.5,
        originY: 1,
        depth: DEPTH.WORLD_PROMPT,
        scale: 0.45,
        fontPx: labelFontPx,
        minFontPx: 8,
        color: UI_STYLE.TEXT_CREAM,
        resolution: 3,
        padX: 4,
        padY: 2,
        radius: 2.5,
        borderWidth: 0.9,
        rimPad: 0.6,
        shadowOffsetY: 1,
        strokeThickness: 2,
        fadeInMs: 0,
        fadeOutMs: 0,
        initialText: 'Rumah (Tidur)',
        visible: false,
      })
    );
  }

  _buildShippingAndShopArea() {
    // Shipping Box (Crate Base + Crate Top from `farming/crops/`)
    const sb = MAP_ZONES.SHIPPING_BOX;
    const sbX = sb.TILE_X * TILE.SIZE + 8;
    const sbY = (sb.TILE_Y + 1) * TILE.SIZE - 2;
    const labelFontPx = UI.FONT?.WORLD_LABEL || 9;

    const crateBase = this._track(
      this.scene.add
        .image(sbX, sbY, ASSET_KEYS.CRATE_BASE)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.Y_SORT_BASE + sbY)
    );
    const crateTop = this._track(
      this.scene.add
        .image(sbX, sbY - 5, ASSET_KEYS.CRATE_TOP)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.Y_SORT_BASE + sbY + 1)
    );
    this.shippingLid = crateTop;
    this.shippingBase = crateBase;

    this._addTileCollider(sb.TILE_X, sb.TILE_Y, 14, 12);
    this.blockedTiles.add(`${sb.TILE_X},${sb.TILE_Y}`);

    this.landmarkLabels.sell = this._track(
      new WoodLabelPanel(this.scene, {
        x: sbX,
        y: sbY - 20,
        originX: 0.5,
        originY: 1,
        depth: DEPTH.WORLD_PROMPT,
        scale: 0.45,
        fontPx: labelFontPx,
        minFontPx: 8,
        color: UI_STYLE.TEXT_GOLD,
        resolution: 3,
        padX: 4,
        padY: 2,
        radius: 2.5,
        borderWidth: 0.9,
        rimPad: 0.6,
        shadowOffsetY: 1,
        strokeThickness: 2,
        fadeInMs: 0,
        fadeOutMs: 0,
        initialText: 'Jual Panen',
        visible: false,
      })
    );

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
    this._track(
      this.scene.add
        .image(stallX, stallY, ASSET_KEYS.BUILDINGS_SHEET, 'seed_stall_frame')
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.Y_SORT_BASE + stallY)
    );

    // Display a seed bag & basket on the stall counter
    this._track(
      this.scene.add
        .image(stallX - 5, stallY - 6, ASSET_KEYS.ITEM_SEEDS)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.Y_SORT_BASE + stallY + 1)
    );
    this._track(
      this.scene.add
        .image(stallX + 5, stallY - 6, ASSET_KEYS.ICON_BASKET)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.Y_SORT_BASE + stallY + 1)
    );

    this.landmarkLabels.shop = this._track(
      new WoodLabelPanel(this.scene, {
        x: stallX,
        y: stallY - 25,
        originX: 0.5,
        originY: 1,
        depth: DEPTH.WORLD_PROMPT,
        scale: 0.45,
        fontPx: labelFontPx,
        minFontPx: 8,
        color: UI_STYLE.TEXT_GAIN,
        resolution: 3,
        padX: 4,
        padY: 2,
        radius: 2.5,
        borderWidth: 0.9,
        rimPad: 0.6,
        shadowOffsetY: 1,
        strokeThickness: 2,
        fadeInMs: 0,
        fadeOutMs: 0,
        initialText: 'Kios Bibit',
        visible: false,
      })
    );

    this._addTileCollider(st.TILE_X, st.TILE_Y, 15, 12);
    this._addTileCollider(st.TILE_X + 1, st.TILE_Y, 15, 12);
    this.blockedTiles.add(`${st.TILE_X},${st.TILE_Y}`);
    this.blockedTiles.add(`${st.TILE_X + 1},${st.TILE_Y}`);
  }

  _buildWindmill() {
    const wm = MAP_ZONES.WINDMILL;
    const wmX = wm.TILE_X * TILE.SIZE;
    const wmY = wm.TILE_Y * TILE.SIZE;

    const windmill = this._track(
      this.scene.add
        .sprite(wmX, wmY, ASSET_KEYS.WINDMILL, 0)
        .setOrigin(0.5, 0.72)
        .setDepth(DEPTH.Y_SORT_BASE + wmY)
    );
    windmill.play(`${ASSET_KEYS.WINDMILL}_anim`);

    this._addTileCollider(wm.TILE_X - 1, wm.TILE_Y, 16, 14);
    this._addTileCollider(wm.TILE_X, wm.TILE_Y, 16, 14);
    this.blockedTiles.add(`${wm.TILE_X - 1},${wm.TILE_Y}`);
    this.blockedTiles.add(`${wm.TILE_X},${wm.TILE_Y}`);
  }

  _populateNature(rng, detailLayer) {
    const W = this.mapDef.widthTiles;
    const H = this.mapDef.heightTiles;

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
      const animKey = `${key}_anim`;
      const tree = this._track(
        this.scene.add
          .sprite(worldX, worldY, key, 0)
          .setOrigin(0.5, 0.92)
          .setDepth(DEPTH.Y_SORT_BASE + worldY)
      );
      tree.play(animKey);

      const collider = this._addTileCollider(t.tx, t.ty, 14, 12);
      this.blockedTiles.add(`${t.tx},${t.ty}`);

      if (TREE_RESOURCE_COORD_SET.has(`${t.tx},${t.ty}`)) {
        this.resourceNodes.push({
          id: `tree_${t.tx}_${t.ty}`,
          kind: NODE_KINDS.TREE,
          tx: t.tx,
          ty: t.ty,
          baseX: worldX,
          baseY: worldY,
          sprite: tree,
          animKey,
          collider,
          colliderWidth: 14,
          colliderHeight: 12,
          active: true,
        });
      }
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
      if (!this._isPerimeterGateTile(0, ty)) {
        detailLayer.putTileAt(TILE_INDEX.BUSH_LARGE_3, 0, ty);
        this._addTileCollider(0, ty, TILE.SIZE, TILE.SIZE);
        this.blockedTiles.add(`0,${ty}`);
      }
      if (!this._isPerimeterGateTile(W - 1, ty)) {
        detailLayer.putTileAt(TILE_INDEX.BUSH_LARGE_4, W - 1, ty);
        this._addTileCollider(W - 1, ty, TILE.SIZE, TILE.SIZE);
        this.blockedTiles.add(`${W - 1},${ty}`);
      }
    }

    // Decorative stump (solid tile in detailLayer)
    detailLayer.putTileAt(TILE_INDEX.STUMP_1, 22, 19);
    this._addTileCollider(22, 19, 12, 10);
    this.blockedTiles.add('22,19');

    // Resource rocks as individual cropped sprites (3 converted + 4 new interior rocks)
    const rockVariantTile = {
      large: TILE_INDEX.ROCK_LARGE,
      cluster: TILE_INDEX.ROCK_CLUSTER,
      medium: TILE_INDEX.ROCK_MEDIUM,
    };
    for (const r of RESOURCE_NODES.ROCK_PLACEMENTS) {
      const tileIdx = rockVariantTile[r.variant] ?? TILE_INDEX.ROCK_MEDIUM;
      const { col, row } = tileCoords(tileIdx);
      const frameName = `rock_${r.variant}_frame`;
      this._ensureCroppedFrame(
        ASSET_KEYS.TILESET_SUNNYSIDE,
        frameName,
        col * TILE.SIZE,
        row * TILE.SIZE,
        TILE.SIZE,
        TILE.SIZE
      );

      const worldX = r.tx * TILE.SIZE + TILE.SIZE / 2;
      const worldY = r.ty * TILE.SIZE + TILE.SIZE / 2;
      const rockSprite = this._track(
        this.scene.add
          .sprite(worldX, worldY, ASSET_KEYS.TILESET_SUNNYSIDE, frameName)
          .setOrigin(0.5, 0.5)
          .setDepth(DEPTH.Y_SORT_BASE + (r.ty + 0.8) * TILE.SIZE)
      );
      const collider = this._addTileCollider(r.tx, r.ty, 12, 10);
      this.blockedTiles.add(`${r.tx},${r.ty}`);

      this.resourceNodes.push({
        id: `rock_${r.tx}_${r.ty}`,
        kind: NODE_KINDS.ROCK,
        tx: r.tx,
        ty: r.ty,
        baseX: worldX,
        baseY: worldY,
        sprite: rockSprite,
        animKey: null,
        collider,
        colliderWidth: 12,
        colliderHeight: 10,
        active: true,
      });
    }

    // Animated mushrooms
    const mushrooms = [
      { tx: 5, ty: 11, key: ASSET_KEYS.MUSHROOM_RED },
      { tx: 23, ty: 21, key: ASSET_KEYS.MUSHROOM_BLUE },
      { tx: 38, ty: 21, key: ASSET_KEYS.MUSHROOM_RED },
    ];
    for (const m of mushrooms) {
      const sp = this._track(
        this.scene.add
          .sprite(m.tx * TILE.SIZE + 8, m.ty * TILE.SIZE + 8, m.key, 0)
          .setDepth(DEPTH.DECOR_FLAT)
      );
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
    this._track(zone);
    return zone;
  }

  /**
   * Toggles a resource node between intact (visible sprite + static collider)
   * and broken (hidden sprite + detached collider), optionally playing a brief pop-in.
   */
  setResourceNodeActive(node, active, animatePop = false) {
    if (!node || this._destroyed) return;
    const key = `${node.tx},${node.ty}`;
    node.active = Boolean(active);

    if (!active) {
      this.blockedTiles.delete(key);
      if (node.sprite && node.sprite.scene) {
        if (this.scene?.tweens) this.scene.tweens.killTweensOf(node.sprite);
        node.sprite.setPosition(node.baseX, node.baseY);
        node.sprite.setVisible(false).setActive(false);
      }
      if (node.collider) {
        const idx = this._tracked.indexOf(node.collider);
        if (idx !== -1) this._tracked.splice(idx, 1);
        try {
          if (this.colliders) {
            this.colliders.remove(node.collider, true, true);
          } else {
            node.collider.destroy();
          }
        } catch {
          // ignore if physics world is already shutting down
        }
        node.collider = null;
      }
      return;
    }

    this.blockedTiles.add(key);
    if (!node.collider && this.colliders) {
      node.collider = this._addTileCollider(
        node.tx,
        node.ty,
        node.colliderWidth,
        node.colliderHeight
      );
    }
    if (node.sprite && node.sprite.scene) {
      node.sprite.setPosition(node.baseX, node.baseY);
      node.sprite.setScale(1).setAlpha(1).setVisible(true).setActive(true);
      if (node.animKey && node.sprite.anims) {
        node.sprite.play(node.animKey, true);
      }
      if (animatePop && this.scene?.tweens) {
        this.scene.tweens.killTweensOf(node.sprite);
        node.sprite.setScale(0.35).setAlpha(0.4);
        this.scene.tweens.add({
          targets: node.sprite,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          duration: RESOURCE_NODES.RESPAWN_POP_MS,
          ease: 'Back.easeOut',
        });
      }
    }
  }

  /**
   * Adds one static body with an explicit world-space rect (center x/y + size).
   * Used for building footprints, kios, and large perimeter bands so the village
   * stays well below the static-body budget.
   */
  _addRectCollider(centerX, centerY, width, height) {
    const zone = this.scene.add.zone(centerX, centerY, width, height);
    this.scene.physics.add.existing(zone, true);
    this.colliders.add(zone);
    this._track(zone);
  }

  /** Adds a single static body covering a tile rect (top-left + tile size). */
  _addTileRectCollider(tx, ty, widthTiles, heightTiles) {
    const width = widthTiles * TILE.SIZE;
    const height = heightTiles * TILE.SIZE;
    this._addRectCollider(
      tx * TILE.SIZE + width / 2,
      ty * TILE.SIZE + height / 2,
      width,
      height
    );
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

  isTileBlocked(tx, ty) {
    return (
      this.blockedTiles.has(`${tx},${ty}`) ||
      this.waterTiles.has(`${tx},${ty}`)
    );
  }

  /**
   * Checks if player is standing next to or facing an interactive landmark:
   * - `'sleep'` at the House door (`MAP_ZONES.HOUSE.DOOR_TILE_X, DOOR_TILE_Y`)
   * - `'sell'` at the Shipping Box (`MAP_ZONES.SHIPPING_BOX`)
   * - `'shop'` at the Seed Stall (`MAP_ZONES.SEED_STALL`)
   */
  getNearbyLandmark(playerX, playerY, frontTile) {
    // Village (and any future non-farm map) has no cottage / shop / stall landmarks
    if (this.mapId !== MAP_IDS.FARM) return null;

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
   * NPC terdekat dalam radius interaksi (default 24 px dari titik kaki).
   * Hanya map desa yang punya NPC; map lain mengembalikan null.
   */
  getNearbyNpc(playerX, playerY, radius = NPC_CONFIG.INTERACT_RADIUS_PX) {
    if (!Array.isArray(this.npcs) || this.npcs.length === 0) return null;
    let best = null;
    let bestDist = radius;
    for (let i = 0; i < this.npcs.length; i += 1) {
      const npc = this.npcs[i];
      if (!npc || !npc.isAlive) continue;
      const dist = npc.distanceTo(playerX, playerY);
      if (dist <= bestDist) {
        best = npc;
        bestDist = dist;
      }
    }
    return best;
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

  /**
   * Destroys every object this builder created (tilemap layers, containers,
   * sprites, labels, zones, and static collider bodies). The shared tileset
   * texture in the TextureManager is intentionally kept for the next map.
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    for (let i = this._tracked.length - 1; i >= 0; i--) {
      const obj = this._tracked[i];
      try {
        if (obj && typeof obj.destroy === 'function') obj.destroy();
      } catch (err) {
        console.warn('[WorldBuilder] object destroy failed', err);
      }
    }
    this._tracked.length = 0;

    this.colliders = null;
    this.gateZones = [];
    this.npcs = [];
    this.resourceNodes = [];
    this.landmarkLabels = {};
    this.waterTiles.clear();
    this.dirtTiles.clear();
    this.farmableTiles.clear();
    this.blockedTiles.clear();
    this.shippingLid = null;
    this.shippingBase = null;
  }
}
