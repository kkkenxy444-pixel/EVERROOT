/**
 * Single source of truth for Phaser asset keys, file paths (relative to `public/assets/`),
 * and frame dimensions verified against `public/assets/asset-manifest.json`.
 */

export const ASSET_BASE_PATH = 'assets/';

export const ASSET_KEYS = Object.freeze({
  // --- Branding & Panels ---
  UI_GAME_ICON: 'ui_game_icon',
  UI_COZY_PANELS: 'ui_cozy_panels',

  // --- UI Icons ---
  ICON_SHOVEL: 'icon_shovel',
  ICON_WATER: 'icon_water',
  ICON_ROD: 'icon_rod',
  ICON_BASKET: 'icon_basket',
  ICON_PLANT: 'icon_plant',
  ICON_CONFIRM: 'icon_confirm',
  ICON_CANCEL: 'icon_cancel',
  ICON_ARROW_LEFT: 'icon_arrow_left',
  ICON_ARROW_RIGHT: 'icon_arrow_right',
  ICON_ARROW_UP: 'icon_arrow_up',
  ICON_ITEMDISC: 'icon_itemdisc',
  ICON_ALERTED: 'icon_alerted',
  ICON_CHAT: 'icon_chat',
  ICON_LOVE: 'icon_love',
  ICON_WORKING: 'icon_working',
  ICON_STOPWATCH: 'icon_stopwatch',

  // --- World & Props ---
  TILESET_SUNNYSIDE: 'tileset_sunnyside',
  BUILDINGS_SHEET: 'buildings_sheet',
  TREE_ROUND: 'tree_round',
  TREE_PINE: 'tree_pine',
  MUSHROOM_BLUE: 'mushroom_blue',
  MUSHROOM_RED: 'mushroom_red',
  WINDMILL: 'windmill',
  CORACLE_LAND: 'coracle_land',
  CHIMNEY_SMOKE: 'chimney_smoke',
  FX_GLINT: 'fx_glint',
  FX_DUST_WALK: 'fx_dust_walk',

  // --- Ambient Animals (4-frame spritesheets) ---
  ANIMAL_CHICKEN: 'animal_chicken',
  ANIMAL_COW: 'animal_cow',
  ANIMAL_PIG: 'animal_pig',
  ANIMAL_SHEEP: 'animal_sheep',
  ANIMAL_DUCK: 'animal_duck',
  ANIMAL_BIRD: 'animal_bird',

  // --- Soil, Shipping Box, Generic Items ---
  SOIL_DRY: 'soil_dry',
  SOIL_WET: 'soil_wet',
  SOIL_PIT_DRY: 'soil_pit_dry',
  SOIL_PIT_WET: 'soil_pit_wet',
  CRATE_BASE: 'crate_base',
  CRATE_TOP: 'crate_top',
  ITEM_SEEDS: 'item_seeds',
  ITEM_FISH: 'item_fish',
  ITEM_WOOD: 'item_wood',
  ITEM_ROCK: 'item_rock',
  ITEM_EGG: 'item_egg',
  ITEM_MILK: 'item_milk',

  // --- Audio: BGM ---
  BGM_MENU: 'bgm_menu',
  BGM_FARM_DAY: 'bgm_farm_day',
  BGM_WORKSHOP: 'bgm_workshop',
  BGM_COZY_ALT: 'bgm_cozy_alt',
  BGM_PARTY: 'bgm_party',

  // --- Audio: Ambience ---
  AMB_MORNING_BIRDS: 'amb_morning_birds',
  AMB_DAY_CICADA: 'amb_day_cicada',
  AMB_NIGHT_CRICKETS: 'amb_night_crickets',
  AMB_STREAM: 'amb_stream',
  AMB_RAIN: 'amb_rain',

  // --- Audio: SFX ---
  SFX_UI_SELECT: 'sfx_ui_select',
  SFX_UI_BLIP: 'sfx_ui_blip',
  SFX_UI_CANCEL: 'sfx_ui_cancel',
  SFX_UI_ERROR: 'sfx_ui_error',
  SFX_UI_MENU_OPEN: 'sfx_ui_menu_open',
  SFX_UI_NOTIFY: 'sfx_ui_notify',
  SFX_STEP_GRASS: 'sfx_step_grass',
  SFX_STEP_DIRT: 'sfx_step_dirt',
  SFX_HOE_TILL: 'sfx_hoe_till',
  SFX_SEED_PLANT: 'sfx_seed_plant',
  SFX_WATERING_CAN: 'sfx_watering_can',
  SFX_TOOL_WATER_SELECT: 'sfx_tool_water_select',
  SFX_CROP_GROW: 'sfx_crop_grow',
  SFX_HARVEST_POP: 'sfx_harvest_pop',
  SFX_HARVEST_PLUCK: 'sfx_harvest_pluck',
  SFX_ROD_CAST: 'sfx_rod_cast',
  SFX_LURE_PLOP: 'sfx_lure_plop',
  SFX_FISH_BITE: 'sfx_fish_bite',
  SFX_REEL_IN: 'sfx_reel_in',
  SFX_CATCH_FANFARE: 'sfx_catch_fanfare',
  SFX_BUY_CONFIRM: 'sfx_buy_confirm',
  SFX_CASH_REGISTER: 'sfx_cash_register',
  SFX_COIN_COLLECT: 'sfx_coin_collect',
  SFX_ITEM_EQUIP: 'sfx_item_equip',
  SFX_DAY_END: 'sfx_day_end',
  SFX_DAY_START: 'sfx_day_start',
  SFX_DOOR_OPEN: 'sfx_door_open',
  SFX_DOOR_CLOSE: 'sfx_door_close',
  SFX_CHEST_OPEN: 'sfx_chest_open',
  SFX_ANIMAL_CHICKEN: 'sfx_animal_chicken',
  SFX_ANIMAL_COW: 'sfx_animal_cow',
  SFX_DIALOGUE_BLIP: 'sfx_dialogue_blip',
  SFX_QUEST_COMPLETE: 'sfx_quest_complete',
  SFX_AXE_CHOP: 'sfx_axe_chop',
  SFX_MINE_CLANG: 'sfx_mine_clang',
});

/**
 * Helper to generate character layer texture key for (action, part).
 * parts: player 'base' | 'spikeyhair' | 'tools'; NPC hair variants (idle/doing).
 * actions: 'idle' | 'walk' | 'dig' | 'watering' | 'doing' | 'casting' | 'waiting' | 'reeling' | 'caught'
 */
export function charLayerKey(action, part) {
  return `char_${part}_${action}`;
}

/**
 * Helper to generate crop stage texture key for (cropId, stage 0..5).
 */
export function cropStageKey(cropId, stage) {
  const s = String(stage).padStart(2, '0');
  return `crop_${cropId}_${s}`;
}

/** Static single-frame images loaded via `this.load.image(key, path)`. */
export const IMAGE_ASSETS = Object.freeze([
  // Branding & UI panels
  { key: ASSET_KEYS.UI_GAME_ICON, path: 'ui/branding/game_icon_primary.png', width: 1536, height: 1536 },
  { key: ASSET_KEYS.UI_COZY_PANELS, path: 'ui/panels/ui_cozy_free.png', width: 256, height: 256 },

  // UI icons
  { key: ASSET_KEYS.ICON_SHOVEL, path: 'ui/icons/shovel.png', width: 14, height: 14 },
  { key: ASSET_KEYS.ICON_WATER, path: 'ui/icons/water.png', width: 13, height: 13 },
  { key: ASSET_KEYS.ICON_ROD, path: 'ui/icons/rod.png', width: 15, height: 14 },
  { key: ASSET_KEYS.ICON_BASKET, path: 'ui/icons/basket.png', width: 12, height: 12 },
  { key: ASSET_KEYS.ICON_PLANT, path: 'ui/icons/plant.png', width: 10, height: 11 },
  { key: ASSET_KEYS.ICON_CONFIRM, path: 'ui/icons/confirm.png', width: 12, height: 11 },
  { key: ASSET_KEYS.ICON_CANCEL, path: 'ui/icons/cancel.png', width: 11, height: 11 },
  { key: ASSET_KEYS.ICON_ARROW_LEFT, path: 'ui/icons/arrow_left.png', width: 11, height: 12 },
  { key: ASSET_KEYS.ICON_ARROW_RIGHT, path: 'ui/icons/arrow_right.png', width: 11, height: 12 },
  { key: ASSET_KEYS.ICON_ARROW_UP, path: 'ui/icons/arrow_up.png', width: 10, height: 13 },
  { key: ASSET_KEYS.ICON_ITEMDISC, path: 'ui/icons/itemdisc_01.png', width: 18, height: 19 },
  { key: ASSET_KEYS.ICON_ALERTED, path: 'ui/icons/expression_alerted.png', width: 4, height: 9 },
  { key: ASSET_KEYS.ICON_CHAT, path: 'ui/icons/expression_chat.png', width: 9, height: 9 },
  { key: ASSET_KEYS.ICON_LOVE, path: 'ui/icons/expression_love.png', width: 9, height: 8 },
  { key: ASSET_KEYS.ICON_WORKING, path: 'ui/icons/expression_working.png', width: 7, height: 9 },
  { key: ASSET_KEYS.ICON_STOPWATCH, path: 'ui/icons/stopwatch.png', width: 10, height: 12 },

  // World & buildings
  { key: ASSET_KEYS.BUILDINGS_SHEET, path: 'world/buildings/buildings_v001.png', width: 640, height: 640 },
  { key: ASSET_KEYS.CORACLE_LAND, path: 'world/props/spr_deco_coracle_land.png', width: 32, height: 30 },

  // Farming soil & items
  { key: ASSET_KEYS.SOIL_DRY, path: 'farming/crops/soil_00.png', width: 16, height: 12 },
  { key: ASSET_KEYS.SOIL_WET, path: 'farming/crops/soil_01.png', width: 16, height: 12 },
  { key: ASSET_KEYS.SOIL_PIT_DRY, path: 'farming/crops/soil_03.png', width: 16, height: 12 },
  { key: ASSET_KEYS.SOIL_PIT_WET, path: 'farming/crops/soil_04.png', width: 16, height: 12 },
  { key: ASSET_KEYS.CRATE_BASE, path: 'farming/crops/crate_base.png', width: 16, height: 16 },
  { key: ASSET_KEYS.CRATE_TOP, path: 'farming/crops/crate_top.png', width: 16, height: 14 },
  { key: ASSET_KEYS.ITEM_SEEDS, path: 'farming/crops/seeds_generic.png', width: 11, height: 10 },
  { key: ASSET_KEYS.ITEM_FISH, path: 'farming/crops/fish.png', width: 11, height: 11 },
  { key: ASSET_KEYS.ITEM_WOOD, path: 'farming/crops/wood.png', width: 11, height: 11 },
  { key: ASSET_KEYS.ITEM_ROCK, path: 'farming/crops/rock.png', width: 10, height: 10 },
  { key: ASSET_KEYS.ITEM_EGG, path: 'farming/crops/egg.png', width: 10, height: 11 },
  { key: ASSET_KEYS.ITEM_MILK, path: 'farming/crops/milk.png', width: 10, height: 12 },

  // 11 crops x 6 stages (00..05): 4 V1 crops + 7 Paket 2 crops
  { key: 'crop_parsnip_00', path: 'farming/crops/parsnip_00.png', width: 6, height: 6 },
  { key: 'crop_parsnip_01', path: 'farming/crops/parsnip_01.png', width: 6, height: 6 },
  { key: 'crop_parsnip_02', path: 'farming/crops/parsnip_02.png', width: 8, height: 7 },
  { key: 'crop_parsnip_03', path: 'farming/crops/parsnip_03.png', width: 8, height: 8 },
  { key: 'crop_parsnip_04', path: 'farming/crops/parsnip_04.png', width: 10, height: 14 },
  { key: 'crop_parsnip_05', path: 'farming/crops/parsnip_05.png', width: 14, height: 14 },

  { key: 'crop_carrot_00', path: 'farming/crops/carrot_00.png', width: 6, height: 6 },
  { key: 'crop_carrot_01', path: 'farming/crops/carrot_01.png', width: 6, height: 6 },
  { key: 'crop_carrot_02', path: 'farming/crops/carrot_02.png', width: 8, height: 8 },
  { key: 'crop_carrot_03', path: 'farming/crops/carrot_03.png', width: 10, height: 11 },
  { key: 'crop_carrot_04', path: 'farming/crops/carrot_04.png', width: 11, height: 15 },
  { key: 'crop_carrot_05', path: 'farming/crops/carrot_05.png', width: 13, height: 13 },

  { key: 'crop_pumpkin_00', path: 'farming/crops/pumpkin_00.png', width: 7, height: 7 },
  { key: 'crop_pumpkin_01', path: 'farming/crops/pumpkin_01.png', width: 8, height: 7 },
  { key: 'crop_pumpkin_02', path: 'farming/crops/pumpkin_02.png', width: 9, height: 9 },
  { key: 'crop_pumpkin_03', path: 'farming/crops/pumpkin_03.png', width: 12, height: 11 },
  { key: 'crop_pumpkin_04', path: 'farming/crops/pumpkin_04.png', width: 12, height: 14 },
  { key: 'crop_pumpkin_05', path: 'farming/crops/pumpkin_05.png', width: 12, height: 14 },

  { key: 'crop_sunflower_00', path: 'farming/crops/sunflower_00.png', width: 7, height: 7 },
  { key: 'crop_sunflower_01', path: 'farming/crops/sunflower_01.png', width: 10, height: 7 },
  { key: 'crop_sunflower_02', path: 'farming/crops/sunflower_02.png', width: 11, height: 9 },
  { key: 'crop_sunflower_03', path: 'farming/crops/sunflower_03.png', width: 11, height: 13 },
  { key: 'crop_sunflower_04', path: 'farming/crops/sunflower_04.png', width: 13, height: 19 },
  { key: 'crop_sunflower_05', path: 'farming/crops/sunflower_05.png', width: 13, height: 16 },

  { key: 'crop_radish_00', path: 'farming/crops/radish_00.png', width: 6, height: 6 },
  { key: 'crop_radish_01', path: 'farming/crops/radish_01.png', width: 6, height: 6 },
  { key: 'crop_radish_02', path: 'farming/crops/radish_02.png', width: 8, height: 7 },
  { key: 'crop_radish_03', path: 'farming/crops/radish_03.png', width: 8, height: 10 },
  { key: 'crop_radish_04', path: 'farming/crops/radish_04.png', width: 12, height: 15 },
  { key: 'crop_radish_05', path: 'farming/crops/radish_05.png', width: 12, height: 15 },

  { key: 'crop_potato_00', path: 'farming/crops/potato_00.png', width: 6, height: 6 },
  { key: 'crop_potato_01', path: 'farming/crops/potato_01.png', width: 6, height: 6 },
  { key: 'crop_potato_02', path: 'farming/crops/potato_02.png', width: 8, height: 8 },
  { key: 'crop_potato_03', path: 'farming/crops/potato_03.png', width: 8, height: 11 },
  { key: 'crop_potato_04', path: 'farming/crops/potato_04.png', width: 11, height: 15 },
  { key: 'crop_potato_05', path: 'farming/crops/potato_05.png', width: 10, height: 10 },

  { key: 'crop_beetroot_00', path: 'farming/crops/beetroot_00.png', width: 5, height: 5 },
  { key: 'crop_beetroot_01', path: 'farming/crops/beetroot_01.png', width: 6, height: 5 },
  { key: 'crop_beetroot_02', path: 'farming/crops/beetroot_02.png', width: 8, height: 6 },
  { key: 'crop_beetroot_03', path: 'farming/crops/beetroot_03.png', width: 8, height: 11 },
  { key: 'crop_beetroot_04', path: 'farming/crops/beetroot_04.png', width: 12, height: 14 },
  { key: 'crop_beetroot_05', path: 'farming/crops/beetroot_05.png', width: 16, height: 16 },

  { key: 'crop_wheat_00', path: 'farming/crops/wheat_00.png', width: 6, height: 6 },
  { key: 'crop_wheat_01', path: 'farming/crops/wheat_01.png', width: 11, height: 7 },
  { key: 'crop_wheat_02', path: 'farming/crops/wheat_02.png', width: 11, height: 10 },
  { key: 'crop_wheat_03', path: 'farming/crops/wheat_03.png', width: 13, height: 14 },
  { key: 'crop_wheat_04', path: 'farming/crops/wheat_04.png', width: 13, height: 16 },
  { key: 'crop_wheat_05', path: 'farming/crops/wheat_05.png', width: 13, height: 13 },

  { key: 'crop_cabbage_00', path: 'farming/crops/cabbage_00.png', width: 5, height: 5 },
  { key: 'crop_cabbage_01', path: 'farming/crops/cabbage_01.png', width: 10, height: 7 },
  { key: 'crop_cabbage_02', path: 'farming/crops/cabbage_02.png', width: 8, height: 7 },
  { key: 'crop_cabbage_03', path: 'farming/crops/cabbage_03.png', width: 12, height: 10 },
  { key: 'crop_cabbage_04', path: 'farming/crops/cabbage_04.png', width: 16, height: 13 },
  { key: 'crop_cabbage_05', path: 'farming/crops/cabbage_05.png', width: 12, height: 11 },

  { key: 'crop_kale_00', path: 'farming/crops/kale_00.png', width: 5, height: 5 },
  { key: 'crop_kale_01', path: 'farming/crops/kale_01.png', width: 4, height: 7 },
  { key: 'crop_kale_02', path: 'farming/crops/kale_02.png', width: 6, height: 8 },
  { key: 'crop_kale_03', path: 'farming/crops/kale_03.png', width: 10, height: 9 },
  { key: 'crop_kale_04', path: 'farming/crops/kale_04.png', width: 14, height: 11 },
  { key: 'crop_kale_05', path: 'farming/crops/kale_05.png', width: 14, height: 11 },

  { key: 'crop_cauliflower_00', path: 'farming/crops/cauliflower_00.png', width: 5, height: 5 },
  { key: 'crop_cauliflower_01', path: 'farming/crops/cauliflower_01.png', width: 6, height: 7 },
  { key: 'crop_cauliflower_02', path: 'farming/crops/cauliflower_02.png', width: 8, height: 8 },
  { key: 'crop_cauliflower_03', path: 'farming/crops/cauliflower_03.png', width: 10, height: 11 },
  { key: 'crop_cauliflower_04', path: 'farming/crops/cauliflower_04.png', width: 12, height: 12 },
  { key: 'crop_cauliflower_05', path: 'farming/crops/cauliflower_05.png', width: 12, height: 12 },
]);

/**
 * Human character layered animations:
 * Each entry defines folder, filePrefix, frames, and fps so PreloadScene can load
 * `base`, `spikeyhair`, and `tools` strips (all 96x64 frame size) uniformly.
 */
export const CHARACTER_ANIM_DEFS = Object.freeze([
  { action: 'idle', folder: 'idle', fileAction: 'idle', frames: 9, fps: 8, repeat: -1 },
  { action: 'walk', folder: 'walking', fileAction: 'walk', frames: 8, fps: 10, repeat: -1 },
  { action: 'dig', folder: 'dig', fileAction: 'dig', frames: 13, fps: 16, repeat: 0 },
  { action: 'axe', folder: 'axe', fileAction: 'axe', frames: 10, fps: 18, repeat: 0 },
  { action: 'mining', folder: 'mining', fileAction: 'mining', frames: 10, fps: 18, repeat: 0 },
  { action: 'watering', folder: 'watering', fileAction: 'watering', frames: 5, fps: 10, repeat: 0 },
  { action: 'doing', folder: 'doing', fileAction: 'doing', frames: 8, fps: 14, repeat: 0 },
  { action: 'casting', folder: 'casting', fileAction: 'casting', frames: 15, fps: 16, repeat: 0 },
  { action: 'waiting', folder: 'waiting', fileAction: 'waiting', frames: 9, fps: 8, repeat: -1 },
  { action: 'reeling', folder: 'reeling', fileAction: 'reeling', frames: 13, fps: 14, repeat: -1 },
  { action: 'caught', folder: 'caught', fileAction: 'caught', frames: 10, fps: 12, repeat: 0 },
]);

/**
 * Player memakai tiga lapisan lama. NPC desa menambah variasi rambut yang hanya
 * perlu animasi `idle` dan `doing`, sehingga preload tidak membengkak 9 aksi.
 */
export const PLAYER_CHARACTER_PARTS = Object.freeze(['base', 'spikeyhair', 'tools']);
export const NPC_HAIR_PARTS = Object.freeze([
  'longhair',
  'bowlhair',
  'mophair',
  'shorthair',
  'curlyhair',
]);
export const CHARACTER_PARTS = Object.freeze([
  ...PLAYER_CHARACTER_PARTS,
  ...NPC_HAIR_PARTS,
]);
export const NPC_CHARACTER_ACTIONS = Object.freeze(['idle', 'doing']);

/** True bila strip (action, part) perlu dimuat/dianimasikan. */
export function isCharacterLayerLoaded(action, part) {
  return (
    PLAYER_CHARACTER_PARTS.includes(part) ||
    NPC_CHARACTER_ACTIONS.includes(action)
  );
}

/** Spritesheets loaded via `this.load.spritesheet(key, path, { frameWidth, frameHeight })`. */
export const SPRITESHEET_ASSETS = Object.freeze([
  // Main 16px tileset (also usable as spritesheet for individual tile icons/debug)
  {
    key: ASSET_KEYS.TILESET_SUNNYSIDE,
    path: 'world/tilesets/spr_tileset_sunnysideworld_16px.png',
    frameWidth: 16,
    frameHeight: 16,
    frames: 4096,
  },
  // Animated nature & props
  {
    key: ASSET_KEYS.TREE_ROUND,
    path: 'world/nature/spr_deco_tree_01_strip4.png',
    frameWidth: 32,
    frameHeight: 34,
    frames: 4,
  },
  {
    key: ASSET_KEYS.TREE_PINE,
    path: 'world/nature/spr_deco_tree_02_strip4.png',
    frameWidth: 28,
    frameHeight: 43,
    frames: 4,
  },
  {
    key: ASSET_KEYS.MUSHROOM_BLUE,
    path: 'world/nature/spr_deco_mushroom_blue_01_strip4.png',
    frameWidth: 16,
    frameHeight: 16,
    frames: 4,
  },
  {
    key: ASSET_KEYS.MUSHROOM_RED,
    path: 'world/nature/spr_deco_mushroom_red_01_strip4.png',
    frameWidth: 16,
    frameHeight: 16,
    frames: 4,
  },
  {
    key: ASSET_KEYS.WINDMILL,
    path: 'world/props/spr_deco_windmill_withshadow_strip9.png',
    frameWidth: 112,
    frameHeight: 112,
    frames: 9,
  },
  {
    key: ASSET_KEYS.CHIMNEY_SMOKE,
    path: 'effects/chimney_smoke/chimneysmoke_01_strip30.png',
    frameWidth: 15,
    frameHeight: 37,
    frames: 30,
  },
  {
    key: ASSET_KEYS.FX_GLINT,
    path: 'effects/glint/spr_deco_glint_01_strip6.png',
    frameWidth: 7,
    frameHeight: 7,
    frames: 6,
  },
  {
    key: ASSET_KEYS.FX_DUST_WALK,
    path: 'effects/dust/dust_run_strip8.png',
    frameWidth: 24,
    frameHeight: 9,
    frames: 8,
  },
  // Ambient village animals (4-frame walk/idle strips)
  {
    key: ASSET_KEYS.ANIMAL_CHICKEN,
    path: 'characters/animals/spr_deco_chicken_01_strip4.png',
    frameWidth: 32,
    frameHeight: 32,
    frames: 4,
  },
  {
    key: ASSET_KEYS.ANIMAL_COW,
    path: 'characters/animals/spr_deco_cow_strip4.png',
    frameWidth: 32,
    frameHeight: 32,
    frames: 4,
  },
  {
    key: ASSET_KEYS.ANIMAL_PIG,
    path: 'characters/animals/spr_deco_pig_01_strip4.png',
    frameWidth: 32,
    frameHeight: 32,
    frames: 4,
  },
  {
    key: ASSET_KEYS.ANIMAL_SHEEP,
    path: 'characters/animals/spr_deco_sheep_01_strip4.png',
    frameWidth: 32,
    frameHeight: 32,
    frames: 4,
  },
  {
    key: ASSET_KEYS.ANIMAL_DUCK,
    path: 'characters/animals/spr_deco_duck_01_strip4.png',
    frameWidth: 16,
    frameHeight: 16,
    frames: 4,
  },
  {
    key: ASSET_KEYS.ANIMAL_BIRD,
    path: 'characters/animals/spr_deco_bird_01_strip4.png',
    frameWidth: 16,
    frameHeight: 16,
    frames: 4,
  },
  // Character layered strips (player: 9 actions x 3 parts; NPC hair: idle/doing only)
  ...CHARACTER_ANIM_DEFS.flatMap((def) =>
    CHARACTER_PARTS.filter((part) =>
      isCharacterLayerLoaded(def.action, part)
    ).map((part) => ({
      key: charLayerKey(def.action, part),
      path: `characters/human/${def.folder}/${part}_${def.fileAction}_strip${def.frames}.png`,
      frameWidth: 96,
      frameHeight: 64,
      frames: def.frames,
    }))
  ),
]);

/** Audio assets loaded via `this.load.audio(key, path)`. */
export const AUDIO_ASSETS = Object.freeze([
  // BGM tracks (3 active; BGM_WORKSHOP & BGM_PARTY cadangan V2, dilepas dari preload)
  { key: ASSET_KEYS.BGM_MENU, path: 'audio/bgm/week_29_-_heart-shaped_candy.ogg' },
  { key: ASSET_KEYS.BGM_FARM_DAY, path: 'audio/bgm/week_23_-_workshop_breadboard.ogg' },
  { key: ASSET_KEYS.BGM_COZY_ALT, path: 'audio/bgm/week_29_-_heart-shaped_palpatations.ogg' },

  // Ambience (converted to mono 22k wav)
  { key: ASSET_KEYS.AMB_MORNING_BIRDS, path: 'audio/ambience/morning-birds_22k.wav' },
  { key: ASSET_KEYS.AMB_DAY_CICADA, path: 'audio/ambience/plains_12_cicada_loop_22k.wav' },
  { key: ASSET_KEYS.AMB_NIGHT_CRICKETS, path: 'audio/ambience/night-crickets_22k.wav' },
  { key: ASSET_KEYS.AMB_RAIN, path: 'audio/ambience/rain_22k.wav' },

  // UI & Movement SFX
  { key: ASSET_KEYS.SFX_UI_SELECT, path: 'audio/sfx/ui/select_1.wav' },
  { key: ASSET_KEYS.SFX_UI_BLIP, path: 'audio/sfx/ui/menu_blip.wav' },
  { key: ASSET_KEYS.SFX_UI_CANCEL, path: 'audio/sfx/ui/cancel.wav' },
  { key: ASSET_KEYS.SFX_UI_ERROR, path: 'audio/sfx/ui/synth_error_opt.ogg' },
  { key: ASSET_KEYS.SFX_UI_MENU_OPEN, path: 'audio/sfx/ui/farm_menu_open.ogg' },
  { key: ASSET_KEYS.SFX_UI_NOTIFY, path: 'audio/sfx/ui/life_notification_01.ogg' },
  { key: ASSET_KEYS.SFX_STEP_GRASS, path: 'audio/sfx/movement/digital_footstep_grass_1.wav' },
  { key: ASSET_KEYS.SFX_STEP_DIRT, path: 'audio/sfx/footsteps/life_step_dirt_01.ogg' },

  // Farming SFX
  { key: ASSET_KEYS.SFX_HOE_TILL, path: 'audio/sfx/farming/life_hoe_till_01.ogg' },
  { key: ASSET_KEYS.SFX_SEED_PLANT, path: 'audio/sfx/farming/life_seed_plant_01.ogg' },
  { key: ASSET_KEYS.SFX_WATERING_CAN, path: 'audio/sfx/farming/life_watering_can_01.ogg' },
  { key: ASSET_KEYS.SFX_TOOL_WATER_SELECT, path: 'audio/sfx/farming/farm_tool_select_watering_can.ogg' },
  { key: ASSET_KEYS.SFX_CROP_GROW, path: 'audio/sfx/farming/life_crop_grow_01.ogg' },
  { key: ASSET_KEYS.SFX_HARVEST_POP, path: 'audio/sfx/farming/life_harvest_pop_01.ogg' },
  { key: ASSET_KEYS.SFX_HARVEST_PLUCK, path: 'audio/sfx/farming/farm_harvest_pluck_01.ogg' },

  // Fishing SFX
  { key: ASSET_KEYS.SFX_ROD_CAST, path: 'audio/sfx/fishing/life_rod_cast_01.ogg' },
  { key: ASSET_KEYS.SFX_LURE_PLOP, path: 'audio/sfx/fishing/life_lure_plop_01.ogg' },
  { key: ASSET_KEYS.SFX_FISH_BITE, path: 'audio/sfx/fishing/life_fish_bite_01.ogg' },
  { key: ASSET_KEYS.SFX_REEL_IN, path: 'audio/sfx/fishing/life_reel_in_01.ogg' },
  { key: ASSET_KEYS.SFX_CATCH_FANFARE, path: 'audio/sfx/fishing/life_catch_fanfare_01.ogg' },

  // Shop / Economy / Home / Jingles SFX
  { key: ASSET_KEYS.SFX_BUY_CONFIRM, path: 'audio/sfx/shop/life_buy_confirm_01.ogg' },
  { key: ASSET_KEYS.SFX_CASH_REGISTER, path: 'audio/sfx/shop/life_cash_register_01.ogg' },
  { key: ASSET_KEYS.SFX_COIN_COLLECT, path: 'audio/sfx/items/coin_collect_opt.ogg' },
  { key: ASSET_KEYS.SFX_ITEM_EQUIP, path: 'audio/sfx/items/item_equip.wav' },
  { key: ASSET_KEYS.SFX_DAY_END, path: 'audio/sfx/jingles/life_day_end_01.ogg' },
  { key: ASSET_KEYS.SFX_DAY_START, path: 'audio/sfx/jingles/life_day_start_01.ogg' },
  { key: ASSET_KEYS.SFX_DOOR_OPEN, path: 'audio/sfx/environment/door_open_opt.ogg' },
  { key: ASSET_KEYS.SFX_DOOR_CLOSE, path: 'audio/sfx/environment/door_close_opt.ogg' },
  { key: ASSET_KEYS.SFX_CHEST_OPEN, path: 'audio/sfx/home/life_chest_open_01.ogg' },
  { key: ASSET_KEYS.SFX_ANIMAL_CHICKEN, path: 'audio/sfx/animals/farm_chicken_cluck.ogg' },
  { key: ASSET_KEYS.SFX_ANIMAL_COW, path: 'audio/sfx/animals/farm_cow_moo.ogg' },
  { key: ASSET_KEYS.SFX_DIALOGUE_BLIP, path: 'audio/sfx/social/farm_dialogue_blip_01.ogg' },
  { key: ASSET_KEYS.SFX_QUEST_COMPLETE, path: 'audio/sfx/social/farm_quest_complete.ogg' },
  // Resource gathering SFX
  { key: ASSET_KEYS.SFX_AXE_CHOP, path: 'audio/sfx/tools/life_axe_chop_01.ogg' },
  { key: ASSET_KEYS.SFX_MINE_CLANG, path: 'audio/sfx/farming_crafting/metal_clang_opt.ogg' },
]);
