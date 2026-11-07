/**
 * Verified 0-based tile indices for `world/tilesets/spr_tileset_sunnysideworld_16px.png`
 * (1024x1024 px, 16x16 px per tile -> 64 columns x 64 rows = 4096 tiles).
 *
 * Formula: index = row * 64 + col
 * Every index below was visually verified via zoomed tile inspection.
 */

export const TILESET_META = Object.freeze({
  IMAGE_WIDTH: 1024,
  IMAGE_HEIGHT: 1024,
  TILE_WIDTH: 16,
  TILE_HEIGHT: 16,
  COLUMNS: 64,
  ROWS: 64,
  TOTAL_TILES: 4096,
});

/** Helper to convert (col, row) -> 0-based tile index. */
export function tileAt(col, row) {
  return row * TILESET_META.COLUMNS + col;
}

/** Helper to convert 0-based tile index -> { col, row }. */
export function tileCoords(index) {
  return {
    col: index % TILESET_META.COLUMNS,
    row: Math.floor(index / TILESET_META.COLUMNS),
  };
}

export const TILE_INDEX = Object.freeze({
  EMPTY: -1,

  // --- Grass (rows 1..4, cols 1..6) ---
  GRASS_PLAIN_A: 65,         // (1, 1) solid bright green grass
  GRASS_PLAIN_B: 66,         // (2, 1) solid bright green grass
  GRASS_SPECK_LIGHT_1: 129,  // (1, 2) grass with light leaf speckles
  GRASS_SPECK_LIGHT_2: 130,  // (2, 2) grass with light leaf crosses
  GRASS_SPECK_LIGHT_3: 131,  // (3, 2) grass with single light cross
  GRASS_SPECK_DARK_1: 132,   // (4, 2) grass with darker leaf speckles
  GRASS_SPECK_DARK_2: 133,   // (5, 2) grass with darker leaf crosses
  GRASS_SPECK_DARK_3: 134,   // (6, 2) grass with single dark cross
  GRASS_ALT_1: 194,          // (2, 3) subtle grass variation
  GRASS_ALT_2: 195,          // (3, 3) subtle grass variation
  GRASS_ALT_3: 257,          // (1, 4) subtle grass variation
  GRASS_ALT_4: 258,          // (2, 4) subtle grass variation

  // --- Dirt / Path / Farmland (rows 1, 7..8) ---
  DIRT_PLAIN: 67,            // (3, 1) flat warm tan dirt
  DIRT_PATH_BASE: 449,       // (1, 7) flat path dirt
  DIRT_PEBBLE_1: 457,        // (9, 7) path dirt with pebbles
  DIRT_PEBBLE_2: 458,        // (10, 7) path dirt with pebbles
  DIRT_PEBBLE_3: 459,        // (11, 7) path dirt with light pebbles
  DIRT_DARK: 460,            // (12, 7) darker packed dirt
  DIRT_PEBBLE_4: 521,        // (9, 8) path dirt with single pebble
  DIRT_PEBBLE_5: 522,        // (10, 8) path dirt with light pebble
  FARMLAND_TILLED_1: 468,    // (20, 7) tilled plot earth
  FARMLAND_TILLED_2: 469,    // (21, 7) tilled plot earth
  FARMLAND_TILLED_3: 532,    // (20, 8) tilled plot earth
  FARMLAND_TILLED_4: 533,    // (21, 8) tilled plot earth

  // --- Grass-over-Dirt Fringe Overlays (rows 7..8, cols 3..6) ---
  PATH_FRINGE_TOP: 452,      // (4, 7) grass fringe along bottom of tile (place north of path)
  PATH_FRINGE_LEFT: 454,     // (6, 7) grass fringe along right of tile (place west of path)
  PATH_FRINGE_RIGHT: 515,    // (3, 8) grass fringe along left of tile (place east of path)
  PATH_FRINGE_BOTTOM: 517,   // (5, 8) grass fringe along top of tile (place south of path)

  // --- Sand (row 1, cols 5..9) ---
  SAND_PLAIN: 69,            // (5, 1) flat sand
  SAND_SPECK_1: 71,          // (7, 1) sand with spots
  SAND_SPECK_2: 72,          // (8, 1) sand with crosses
  SAND_SPECK_3: 73,          // (9, 1) sand with single spot

  // --- Deep Water 4x4 Seamless Pattern (rows 18..21, cols 11..14) ---
  WATER_SOLID: 68,           // (4, 1) flat water blue
  WATER_0_0: 1163,           // (11, 18)
  WATER_1_0: 1164,           // (12, 18)
  WATER_2_0: 1165,           // (13, 18)
  WATER_3_0: 1166,           // (14, 18)
  WATER_0_1: 1227,           // (11, 19)
  WATER_1_1: 1228,           // (12, 19)
  WATER_2_1: 1229,           // (13, 19)
  WATER_3_1: 1230,           // (14, 19)
  WATER_0_2: 1291,           // (11, 20)
  WATER_1_2: 1292,           // (12, 20)
  WATER_2_2: 1293,           // (13, 20)
  WATER_3_2: 1294,           // (14, 20)
  WATER_0_3: 1355,           // (11, 21)
  WATER_1_3: 1356,           // (12, 21)
  WATER_2_3: 1357,           // (13, 21)
  WATER_3_3: 1358,           // (14, 21)

  // --- Water Shore / Bank Overlay Tiles (rows 2..5, cols 19..24) ---
  SHORE_TOP_LEFT: 147,       // (19, 2) dirt bank NW corner over water
  SHORE_TOP: 148,            // (20, 2) dirt bank N edge over water
  SHORE_TOP_RIGHT: 149,      // (21, 2) dirt bank NE corner over water
  SHORE_TOP_LEFT_ALT: 150,   // (22, 2) dirt bank NW corner variant
  SHORE_TOP_ALT: 151,        // (23, 2) dirt bank N edge variant
  SHORE_TOP_RIGHT_ALT: 152,  // (24, 2) dirt bank NE corner variant
  SHORE_LEFT: 211,           // (19, 3) water W edge
  WATER_SPARKLE_1: 212,      // (20, 3) water sparkle overlay
  SHORE_RIGHT: 213,          // (21, 3) water E edge
  WATER_SPARKLE_2: 215,      // (23, 3) small water sparkle overlay
  SHORE_BOTTOM_LEFT: 275,    // (19, 4) grass bank SW corner over water
  SHORE_BOTTOM: 276,         // (20, 4) grass bank S edge over water
  SHORE_BOTTOM_RIGHT: 277,   // (21, 4) grass bank SE corner over water
  SHORE_SAND_TOP_LEFT: 339,  // (19, 5) sand bank NW corner over water
  SHORE_SAND_TOP: 340,       // (20, 5) sand bank N edge over water
  SHORE_SAND_TOP_RIGHT: 341, // (21, 5) sand bank NE corner over water

  // --- Fences & Wooden Bridge (rows 2..6, cols 35..42) ---
  FENCE_LEFT: 166,           // (38, 2) horizontal fence left end
  FENCE_MID_1: 167,          // (39, 2) horizontal fence middle
  FENCE_CROSS: 168,          // (40, 2) fence intersection
  FENCE_MID_2: 169,          // (41, 2) horizontal fence middle
  FENCE_RIGHT: 170,          // (42, 2) horizontal fence right end
  FENCE_POST_1: 231,         // (39, 3) standalone wooden post
  FENCE_POST_2: 233,         // (41, 3) standalone wooden post
  BRIDGE_POST_LEFT: 359,     // (39, 5) bridge left rail post
  BRIDGE_PLANK_TOP: 360,     // (40, 5) wooden bridge upper planks
  BRIDGE_POST_RIGHT: 361,    // (41, 5) bridge right rail post
  BRIDGE_PLANK_BOTTOM: 424,  // (40, 6) wooden bridge lower planks

  // --- Nature / Flowers / Rocks / Props (rows 1..5, cols 27..35) ---
  BUSH_LARGE_1: 91,          // (27, 1)
  BUSH_LARGE_2: 92,          // (28, 1)
  BUSH_LARGE_3: 93,          // (29, 1)
  BUSH_LARGE_4: 94,          // (30, 1)
  BUSH_SMALL_1: 155,         // (27, 2)
  BUSH_SMALL_2: 156,         // (28, 2)
  BUSH_SMALL_3: 157,         // (29, 2)
  BUSH_SMALL_4: 158,         // (30, 2)
  FLOWER_BLUE_SINGLE: 95,    // (31, 1)
  FLOWER_BLUE_CLUSTER: 97,   // (33, 1)
  FLOWER_RED_SINGLE: 159,    // (31, 2)
  FLOWER_RED_CLUSTER: 161,   // (33, 2)
  FLOWER_WHITE_SINGLE: 223,  // (31, 3)
  FLOWER_WHITE_CLUSTER: 225, // (33, 3)
  ROCK_LARGE: 287,           // (31, 4)
  ROCK_CLUSTER: 288,         // (32, 4)
  ROCK_MEDIUM: 289,          // (33, 4)
  ROCK_SMALL: 290,           // (34, 4)
  STUMP_1: 351,              // (31, 5)
  STUMP_2: 352,              // (32, 5)
});

/** Array helpers for weighted/deterministic variation on map generation. */
export const GRASS_VARIANTS = Object.freeze([
  TILE_INDEX.GRASS_PLAIN_A,
  TILE_INDEX.GRASS_PLAIN_B,
  TILE_INDEX.GRASS_SPECK_LIGHT_1,
  TILE_INDEX.GRASS_SPECK_LIGHT_2,
  TILE_INDEX.GRASS_SPECK_LIGHT_3,
  TILE_INDEX.GRASS_SPECK_DARK_1,
  TILE_INDEX.GRASS_SPECK_DARK_2,
  TILE_INDEX.GRASS_SPECK_DARK_3,
  TILE_INDEX.GRASS_ALT_1,
  TILE_INDEX.GRASS_ALT_2,
  TILE_INDEX.GRASS_ALT_3,
  TILE_INDEX.GRASS_ALT_4,
]);

export const DIRT_PATH_VARIANTS = Object.freeze([
  TILE_INDEX.DIRT_PATH_BASE,
  TILE_INDEX.DIRT_PEBBLE_1,
  TILE_INDEX.DIRT_PEBBLE_2,
  TILE_INDEX.DIRT_PEBBLE_3,
  TILE_INDEX.DIRT_PEBBLE_4,
  TILE_INDEX.DIRT_PEBBLE_5,
]);

export const WATER_PATTERN_4X4 = Object.freeze([
  [TILE_INDEX.WATER_0_0, TILE_INDEX.WATER_1_0, TILE_INDEX.WATER_2_0, TILE_INDEX.WATER_3_0],
  [TILE_INDEX.WATER_0_1, TILE_INDEX.WATER_1_1, TILE_INDEX.WATER_2_1, TILE_INDEX.WATER_3_1],
  [TILE_INDEX.WATER_0_2, TILE_INDEX.WATER_1_2, TILE_INDEX.WATER_2_2, TILE_INDEX.WATER_3_2],
  [TILE_INDEX.WATER_0_3, TILE_INDEX.WATER_1_3, TILE_INDEX.WATER_2_3, TILE_INDEX.WATER_3_3],
]);

/** Returns seamless deep water tile index for world grid (tx, ty). */
export function waterTileFor(tx, ty) {
  return WATER_PATTERN_4X4[((ty % 4) + 4) % 4][((tx % 4) + 4) % 4];
}
