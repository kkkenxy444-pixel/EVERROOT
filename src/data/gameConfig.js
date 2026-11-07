/**
 * Global game constants. Every tunable number lives here (no magic numbers in systems/scenes).
 * Values are grouped by feature so V2 systems can add their own block without touching others.
 */
export const SCENE_KEYS = Object.freeze({
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  UI: 'UIScene',
});

export const GAME = Object.freeze({
  TITLE: 'Everroot',
  SUBTITLE: 'Lembah Akar Abadi',
  VERSION: '0.1.0',
  WIDTH: 960, // fallback initial width before Scale.RESIZE measures physical screen
  HEIGHT: 540, // fallback initial height before Scale.RESIZE measures physical screen
  MAX_DPR: 2,
  MAX_CANVAS_LONG_EDGE: 1920,
  MAX_CANVAS_SHORT_EDGE: 1080,
  BG_COLOR: '#1a120c',
  FONT_FAMILY: 'Adapa',
  FONT_FALLBACK: 'monospace',
  // Delayed scale refresh intervals (100-300ms) for Android orientation/viewport latency
  SCALE_REFRESH_DELAYS_MS: Object.freeze([100, 260]),
});

export const TILE = Object.freeze({
  SIZE: 16,
  TILESET_COLUMNS: 64, // spr_tileset_sunnysideworld_16px.png is 1024x1024 -> 64x64 tiles
});

export const WORLD = Object.freeze({
  WIDTH_TILES: 44,
  HEIGHT_TILES: 30,
  SEED: 1337, // deterministic decoration placement
  SPAWN_TILE_X: 14,
  SPAWN_TILE_Y: 12,
});

/**
 * Outdoor map layout coordinates (in tile units, 16px per tile):
 * - Player cottage: top-left at (11, 5), size 4x3 tiles, door at tile (13, 8)
 * - Shipping box + seed stall: around tiles (18..20, 8)
 * - Farmable plot area: tiles x=8..19, y=12..19 (12x8 tiles = 96 farmable tiles)
 * - Lake / Fishing pond: tiles x=26..37, y=10..21 with wooden pier at x=25..27, y=15
 * - Windmill landmark: tile (31, 5)
 */
export const MAP_ZONES = Object.freeze({
  HOUSE: Object.freeze({
    TILE_X: 11,
    TILE_Y: 5,
    WIDTH_TILES: 4,
    HEIGHT_TILES: 3,
    DOOR_TILE_X: 13,
    DOOR_TILE_Y: 8,
    // Crop rects inside `world/buildings/buildings_v001.png`
    BODY_CROP: Object.freeze({ x: 13, y: 129, w: 54, h: 44 }),
    DOOR_CROP: Object.freeze({ x: 48, y: 112, w: 16, h: 13 }),
  }),
  SHIPPING_BOX: Object.freeze({
    TILE_X: 18,
    TILE_Y: 8,
  }),
  SEED_STALL: Object.freeze({
    TILE_X: 20,
    TILE_Y: 8,
    CROP: Object.freeze({ x: 129, y: 80, w: 30, h: 23 }),
  }),
  FARM_PLOT: Object.freeze({
    X0: 8,
    Y0: 12,
    X1: 19,
    Y1: 18,
  }),
  POND: Object.freeze({
    X0: 26,
    Y0: 11,
    X1: 37,
    Y1: 21,
    PIER_X: 26,
    PIER_Y: 15,
  }),
  WINDMILL: Object.freeze({
    TILE_X: 32,
    TILE_Y: 6,
  }),
});

export const PLAYER = Object.freeze({
  SPEED: 72, // px per second
  DIAGONAL_FACTOR: Math.SQRT1_2,
  BODY_WIDTH: 10,
  BODY_HEIGHT: 6,
  // Sunnyside human frames are 96x64; the character's feet sit at y=39 inside the frame.
  FRAME_FEET_Y: 39,
  FRAME_WIDTH: 96,
  FRAME_HEIGHT: 64,
  HAIR: 'spikeyhair', // only hair style that has every animation (walk/mining have no other hair)
  WALK_FPS: 10,
  IDLE_FPS: 8,
  // Point used to probe the tile "in front" of the player for actions (fishing/farming).
  REACH: 14,
  FOOTSTEP_INTERVAL_MS: 280,
});

export const CAMERA = Object.freeze({
  ZOOM: 1,
  // Target vertical world height (~180-240 world units visible); zoom = max(1, round(height / 220))
  TARGET_WORLD_HEIGHT: 220,
  LERP: 0.16,
  DEADZONE_W: 20,
  DEADZONE_H: 14,
});

export const DEPTH = Object.freeze({
  GROUND: 0,
  GROUND_DETAIL: 1,
  WATER: 2,
  SHORE: 3,
  DECOR_FLAT: 4,
  SOIL: 5,
  CROP_BASE: 6,
  // y-sorted objects use DEPTH.Y_SORT_BASE + y
  Y_SORT_BASE: 100,
  FX: 4000,
  OVERLAY: 5000, // day/night tint
  WORLD_PROMPT: 6000,
  DEBUG: 9000,
});

export const TIME = Object.freeze({
  START_DAY: 1,
  START_HOUR: 6,
  START_MINUTE: 0,
  END_OF_DAY_HOUR: 24,
  // 1 in-game minute every 200ms real time (2s per 10-min step, 12s per in-game hour)
  MS_PER_GAME_MINUTE: 200,
  MINUTES_STEP: 10, // display granularity
  OVERLAY_TWEEN_MS: 800,
  SLEEP_FADE_OUT_MS: 420,
  SLEEP_HOLD_MS: 320,
  SLEEP_FADE_IN_MS: 420,
  PHASES: Object.freeze({
    MORNING: { id: 'pagi', label: 'Pagi', startHour: 6, color: 0xffe4a0, alpha: 0.04 },
    NOON: { id: 'siang', label: 'Siang', startHour: 10, color: 0xffffff, alpha: 0.0 },
    AFTERNOON: { id: 'sore', label: 'Sore', startHour: 16, color: 0xff7d34, alpha: 0.13 },
    NIGHT: { id: 'malam', label: 'Malam', startHour: 19, color: 0x12163a, alpha: 0.45 },
  }),
  // Keyframe pencahayaan dunia 24 jam (diinterpolasi halus berdasarkan jam + menit)
  // Pagi (06-10) -> Siang (10-16) -> Sore (16-19) -> Senja-Malam (19-22) -> Malam (22-05) -> Fajar (05-06)
  TINT_KEYFRAMES: Object.freeze([
    Object.freeze({ hour: 0, phase: 'malam', color: 0x0e1233, alpha: 0.47 }),
    Object.freeze({ hour: 5, phase: 'malam', color: 0x181c42, alpha: 0.42 }),
    Object.freeze({ hour: 5.5, phase: 'fajar', color: 0xc86b58, alpha: 0.18 }),
    Object.freeze({ hour: 6, phase: 'pagi', color: 0xffe4a0, alpha: 0.04 }),
    Object.freeze({ hour: 10, phase: 'siang', color: 0xffe4a0, alpha: 0.0 }),
    Object.freeze({ hour: 16, phase: 'sore', color: 0xff8838, alpha: 0.0 }),
    Object.freeze({ hour: 17.5, phase: 'sore', color: 0xff7d34, alpha: 0.12 }),
    Object.freeze({ hour: 19, phase: 'senja', color: 0xe66838, alpha: 0.15 }),
    Object.freeze({ hour: 20.5, phase: 'senja', color: 0x302458, alpha: 0.31 }),
    Object.freeze({ hour: 22, phase: 'malam', color: 0x12163a, alpha: 0.45 }),
    Object.freeze({ hour: 24, phase: 'malam', color: 0x0e1233, alpha: 0.47 }),
  ]),
});

export const FARMING = Object.freeze({
  MAX_STAGE: 5, // stages 0..5 (stage 5 is harvest-ready)
  ACTION_LOCK_MS: 420,
  DIG_LOCK_MS: 420,
  WATER_LOCK_MS: 400,
  PLANT_LOCK_MS: 360,
  HARVEST_LOCK_MS: 360,
  DRY_SOIL_TINT: 0xffffff,
  WET_SOIL_TINT: 0x9ec5e8,
  CURSOR_FARMABLE_COLOR: 0x7ef27e,
  CURSOR_HARVEST_COLOR: 0xffd866,
  CURSOR_WATER_COLOR: 0x5bc0be,
  CURSOR_DEFAULT_COLOR: 0xf2c14e,
  CURSOR_FILL_ALPHA: 0.18,
  CURSOR_LINE_ALPHA_ACTIVE: 0.9,
  CURSOR_LINE_ALPHA_IDLE: 0.38,
});

export const FISHING = Object.freeze({
  MAX_WATER_DISTANCE_TILES: 2.2,
  CAST_PROBE_TILES: 2,
  CAST_DURATION_MS: 580,
  WAIT_MIN_MS: 3500,
  WAIT_MAX_MS: 8000,
  BITE_WINDOW_MS: 1050,
  REEL_DURATION_MS: 620,
  CAUGHT_DISPLAY_MS: 950,
  COOLDOWN_MS: 500,
  // Probabilities (weights sum to 100): small 55%, medium 33%, large (rare) 12%
  FISH_ODDS: Object.freeze({
    SMALL: 55,
    MEDIUM: 33,
    LARGE: 12,
  }),
  // Balanced fish sell prices (EV = 0.55*6 + 0.33*12 + 0.12*25 = 10.26G per catch, ~65G/min active)
  FISH_PRICES: Object.freeze({
    SMALL: 6,
    MEDIUM: 12,
    LARGE: 25,
  }),
});

export const INVENTORY = Object.freeze({
  MAX_SLOTS: 12,
  DEFAULT_MAX_STACK: 20,
  COMPACT_COLS: 6,
});

export const ECONOMY = Object.freeze({
  STARTING_COINS: 50,
  STARTING_SEEDS_PARSNIP: 5,
  STARTING_SEEDS_CARROT: 3,
  STARTING_SEEDS_SUNFLOWER: 2,
  STARTING_SEEDS_PUMPKIN: 1,
  BUY_BATCH_SIZES: Object.freeze([1, 5]),
});

export const SAVE = Object.freeze({
  STORAGE_KEY: 'everroot_v1_save',
  AUDIO_STORAGE_KEY: 'everroot_v1_audio_settings',
  VERSION: 2,
  LEGACY_VERSION: 1,
});

export const INPUT = Object.freeze({
  // Base UI units (multiplied by integer uiScale in TouchControls)
  JOYSTICK_RADIUS: 28,
  JOYSTICK_KNOB_RADIUS: 12,
  JOYSTICK_DEADZONE: 0.18,
  JOYSTICK_ZONE_WIDTH_RATIO: 0.44, // left zone of the screen spawns/drives the joystick
  JOYSTICK_MARGIN_LEFT: 52,
  JOYSTICK_MARGIN_BOTTOM: 48,
  JOYSTICK_MIN_TOP_Y: 44,
  JOYSTICK_ALPHA: 0.72,
  BUTTON_RADIUS: 24,
  BUTTON_SMALL_RADIUS: 18,
  BUTTON_HIT_PADDING: 6,
  BUTTON_ALPHA: 0.78,
  // Right-bottom offsets (in base UI units from bottom-right safe area) with thumb spacing
  ACTION_OFFSET_X: 46,
  ACTION_OFFSET_Y: 44,
  TOOL_OFFSET_X: 106,
  TOOL_OFFSET_Y: 34,
  SEED_OFFSET_X: 42,
  SEED_OFFSET_Y: 104,
  EXTRA_POINTERS: 2, // multitouch: joystick + button at the same time
});

export const UI = Object.freeze({
  // Target short-edge UI size for integer uiScale = max(1, round(shortEdge / 360))
  // On 1612x720 (landscape) or 720x1612 (portrait): round(720 / 360) = 2 (integer 2x UI scale)
  TARGET_UI_HEIGHT: 360,
  SAFE_MARGIN_X: 14, // base UI units (x uiScale -> 28px on 1612x720)
  SAFE_MARGIN_Y: 6, // base UI units (x uiScale -> 12px on 1612x720)
  TEXT_COLOR: '#fff6e0',
  TEXT_DARK: '#3b2a1f',
  TEXT_SHADOW: '#2b1d14',
  ACCENT: 0xf2c14e,
  PANEL_BG: 0x3b2618,
  PANEL_BORDER: 0xd9a066,
  PANEL_INNER: 0x563925,
  SLOT_BG: 0x2a1b12,
  SLOT_ACTIVE_BORDER: 0xf7d560,
  BTN_ACTIVE_BORDER: 0xf7d560,
  BTN_DISABLED_BG: 0x2b231d,
  BTN_DISABLED_BORDER: 0x8c7a6b,
  BTN_DISABLED_TEXT: '#dcd3c8',
  MODAL_WIDTH_RATIO: 0.84,
  MODAL_MIN_BTN_HEIGHT_PX: 56,
  FONT_SMALL: 11,
  FONT_MEDIUM: 14,
  FONT_LARGE: 18,
  // Base UI font units (multiplied by integer uiScale=2 on 1612x720) + physical pixel floors
  FONT: Object.freeze({
    MENU_TITLE: 22, // 44px physical at uiScale=2
    MIN_MENU_TITLE_PX: 38,
    MENU_SUBTITLE: 14, // 28px physical at uiScale=2
    MIN_MENU_SUB_PX: 26,
    MODAL_TITLE: 18, // 36px physical at uiScale=2
    MIN_MODAL_TITLE_PX: 34,
    MODAL_BODY: 15, // 30px physical at uiScale=2 (~28-32px target)
    MIN_MODAL_BODY_PX: 28,
    MODAL_SUB: 14, // 28px physical at uiScale=2 (~28-32px target)
    MIN_MODAL_SUB_PX: 28,
    BUTTON: 14, // 28px physical at uiScale=2 (~26-28px target)
    MIN_BUTTON_PX: 26,
    BUTTON_SM: 13, // 26px physical at uiScale=2 (~26-28px target)
    MIN_BUTTON_SM_PX: 26,
    HUD_MAIN: 13, // 26px physical at uiScale=2
    MIN_HUD_MAIN_PX: 24,
    HUD_SMALL: 12, // 24px physical at uiScale=2
    MIN_HUD_SMALL_PX: 22,
    HUD_SLOT: 11, // 22px physical at uiScale=2
    MIN_HUD_SLOT_PX: 20,
    TOAST: 14, // 28px physical at uiScale=2
    MIN_TOAST_PX: 28,
    HINT: 14, // 28px physical at uiScale=2
    MIN_HINT_PX: 26,
    FISHING_ALERT: 15, // 30px physical at uiScale=2
    MIN_FISHING_ALERT_PX: 28,
    FLOATING: 14, // 28px physical at uiScale=2
    MIN_FLOATING_PX: 26,
    WORLD_LABEL: 9, // 9 world px * zoom 3 = 27px physical on 1612x720
    DEBUG_OVERLAY: 11, // 22px physical at uiScale=2
    MIN_DEBUG_PX: 20,
  }),
  FADE_MS: 260,
});

export const DEBUG = Object.freeze({
  // Toggle with ?debug=1 in the URL.
  PHYSICS: false,
  ADD_COINS_AMOUNT: 100,
  FILL_SEEDS_AMOUNT: 5,
});

/**
 * Returns true ONLY when the URL query string explicitly includes `?debug=1`.
 */
export function isDebugModeEnabled() {
  if (typeof window === 'undefined' || !window.location) return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1';
}

/**
 * Computes the integer world camera zoom from the screen's short edge so neither
 * landscape (1612x720 -> shortEdge 720 -> zoom 3) nor portrait (720x1612 -> shortEdge 720 -> zoom 3)
 * becomes overly narrow/cramped:
 * zoom = Math.max(1, Math.round(shortEdge / CAMERA.TARGET_WORLD_HEIGHT))
 */
export function getWorldZoom(widthOrHeight, optionalHeight) {
  const a = Number(widthOrHeight) || GAME.HEIGHT;
  const b =
    optionalHeight !== undefined ? Number(optionalHeight) || a : a;
  const shortEdge = Math.min(a, b);
  return Math.max(1, Math.round(shortEdge / CAMERA.TARGET_WORLD_HEIGHT));
}

/**
 * Computes the integer UI scale factor from the screen's short edge:
 * uiScale = Math.max(1, Math.round(shortEdge / UI.TARGET_UI_HEIGHT))
 * Example on 1612x720 or 720x1612: Math.round(720 / 360) = 2.
 */
export function getUiScale(widthOrHeight, optionalHeight) {
  const a = Number(widthOrHeight) || GAME.HEIGHT;
  const b =
    optionalHeight !== undefined ? Number(optionalHeight) || a : a;
  const shortEdge = Math.min(a, b);
  return Math.max(1, Math.round(shortEdge / UI.TARGET_UI_HEIGHT));
}

/**
 * Computes physical canvas pixel dimensions from CSS viewport size and devicePixelRatio,
 * capped at GAME.MAX_DPR and GAME.MAX_CANVAS_LONG_EDGE / SHORT_EDGE so mid-range mobile GPUs stay fast.
 */
export function getPhysicalCanvasSize(cssWidth, cssHeight, rawDpr = 1) {
  const w = Math.max(1, Number(cssWidth) || GAME.WIDTH);
  const h = Math.max(1, Number(cssHeight) || GAME.HEIGHT);
  const dpr = Math.min(Math.max(1, Number(rawDpr) || 1), GAME.MAX_DPR);

  const longEdge = Math.max(w, h);
  const shortEdge = Math.min(w, h);
  const maxScaleLong = GAME.MAX_CANVAS_LONG_EDGE / longEdge;
  const maxScaleShort = GAME.MAX_CANVAS_SHORT_EDGE / shortEdge;
  const effScale = Math.max(1, Math.min(dpr, maxScaleLong, maxScaleShort));

  return {
    width: Math.max(320, Math.round(w * effScale)),
    height: Math.max(200, Math.round(h * effScale)),
    dpr: effScale,
  };
}
