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
 * - Farmable plot area: tiles x=8..19, y=12..18 (12x7 tiles = 84 farmable tiles)
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
  // Open grass pastures near house & farm plot (away from main roads & water)
  PASTURE: Object.freeze({
    X0: 8,
    Y0: 19,
    X1: 20,
    Y1: 22,
  }),
  // Interior pond water zone (derived from lake waterTiles, clear of shore banks & pier)
  POND_WATER: Object.freeze({
    X0: 28,
    Y0: 12,
    X1: 36,
    Y1: 20,
  }),
  POND_SHORE_SOUTH: Object.freeze({
    X0: 26,
    Y0: 22,
    X1: 35,
    Y1: 23,
  }),
  BIRD_MEADOW: Object.freeze({
    X0: 23,
    Y0: 7,
    X1: 30,
    Y1: 8,
  }),
});

/**
 * Registry map aktif. Satu GameScene melayani semua map (tanpa Scene kedua).
 * `farm` tetap memakai konstanta WORLD lama; `village` kini 64x40 tile dengan
 * jalan utama barat-timur, plaza tengah, dua klaster rumah, pasar, dan hutan kecil.
 */
export const MAP_IDS = Object.freeze({
  FARM: 'farm',
  VILLAGE: 'village',
});

export const MAP_TRANSITION = Object.freeze({
  FADE_MS: 260,
  GATE_ARM_DELAY_MS: 450,
});

/**
 * Tata letak desa (satuan tile). Semua koordinat dipakai `WorldBuilder._buildVillage`.
 * - ROAD: jalan utama 3 tile dari gerbang barat sampai ujung timur (buntu)
 * - PLAZA: lapang berjalan 18x11 tile di tengah map
 * - MARKET: lapang pasar di timur plaza (2 kios lebar + 1 kios kecil)
 * - BALAI: balai desa besar di utara plaza
 * - PROPS: sumur, patung, api unggun, papan, peti, dan spanduk
 * - FOREST: hutan kecil di sudut barat daya
 */
export const VILLAGE_LAYOUT = Object.freeze({
  ROAD: Object.freeze({ X0: 1, Y0: 19, X1: 61, Y1: 21 }),
  PLAZA: Object.freeze({ X0: 30, Y0: 15, X1: 47, Y1: 25 }),
  MARKET: Object.freeze({ X0: 49, Y0: 15, X1: 60, Y1: 18 }),
  FOREST: Object.freeze({ X0: 2, Y0: 29, X1: 20, Y1: 38 }),
  // 6 rumah Sunnyside. `tileX/tileY` = pojok kiri-atas tekstur struktur;
  // ukuran diambil dari `STRUCTURES` di `villageStructures.js`.
  HOUSES: Object.freeze([
    Object.freeze({
      structure: 'rumah_merah_besar',
      tileX: 10,
      tileY: 9,
      mirror: false,
      cluster: 'north',
    }),
    Object.freeze({
      structure: 'rumah_biru',
      tileX: 17,
      tileY: 10,
      mirror: true,
      cluster: 'north',
    }),
    Object.freeze({
      structure: 'rumah_hijau_kecil',
      tileX: 24,
      tileY: 11,
      mirror: false,
      cluster: 'north',
    }),
    Object.freeze({
      structure: 'rumah_ungu_besar',
      tileX: 9,
      tileY: 26,
      mirror: false,
      cluster: 'south',
    }),
    Object.freeze({
      structure: 'rumah_oranye_lebar',
      tileX: 19,
      tileY: 25,
      mirror: true,
      cluster: 'south',
    }),
    Object.freeze({
      structure: 'rumah_cyan',
      tileX: 27,
      tileY: 27,
      mirror: false,
      cluster: 'south',
    }),
  ]),
  // Balai desa besar di sisi utara plaza, pintu menghadap plaza.
  BALAI: Object.freeze({
    structure: 'balai_biru',
    tileX: 35,
    tileY: 7,
    mirror: false,
  }),
  // 2 kios lebar + 1 kios kecil di sisi pasar (pintu menghadap selatan).
  STALLS: Object.freeze([
    Object.freeze({ structure: 'kios_hijau_lebar', tileX: 49, tileY: 15 }),
    Object.freeze({ structure: 'kios_hijau_lebar', tileX: 54, tileY: 15 }),
    Object.freeze({ structure: 'kios_hijau_kecil', tileX: 59, tileY: 15 }),
  ]),
  // Props dekoratif (frame tileset). `collider: true` = static body kecil di dasar.
  PROPS: Object.freeze([
    Object.freeze({ name: 'sumur_hias', tileX: 38, tileY: 17, collider: true }),
    Object.freeze({ name: 'patung', tileX: 31, tileY: 23, collider: true }),
    Object.freeze({ name: 'api_unggun', tileX: 28, tileY: 22, collider: true }),
    Object.freeze({ name: 'papan', tileX: 29, tileY: 18, collider: false }),
    Object.freeze({ name: 'peti_kecil', tileX: 52, tileY: 18, collider: true }),
    Object.freeze({ name: 'peti_tumpuk', tileX: 56, tileY: 18, collider: true }),
    Object.freeze({ name: 'spanduk', tileX: 53, tileY: 17, collider: false }),
  ]),
  // Pagar pendek sebagai bingkai sudut plaza (y=14 pagar atas, y=26 pagar bawah).
  PLAZA_FENCES: Object.freeze([
    Object.freeze({ x0: 30, x1: 32, y: 14 }),
    Object.freeze({ x0: 45, x1: 47, y: 14 }),
    Object.freeze({ x0: 30, x1: 32, y: 26 }),
    Object.freeze({ x0: 45, x1: 47, y: 26 }),
  ]),
  // Semak penutup ujung timur jalan utama (buntu untuk ekspansi berikutnya).
  EAST_DEAD_END: Object.freeze({ x: 62, y0: 18, y1: 22 }),
});

export const MAPS = Object.freeze({
  farm: Object.freeze({
    id: MAP_IDS.FARM,
    widthTiles: WORLD.WIDTH_TILES,
    heightTiles: WORLD.HEIGHT_TILES,
    seed: WORLD.SEED,
    spawn: Object.freeze({
      tileX: WORLD.SPAWN_TILE_X,
      tileY: WORLD.SPAWN_TILE_Y,
    }),
    entryPoints: Object.freeze({
      default: Object.freeze({
        tileX: WORLD.SPAWN_TILE_X,
        tileY: WORLD.SPAWN_TILE_Y,
      }),
      // Di luar zona gerbang kanan supaya tidak langsung memicu balik ke desa
      fromVillage: Object.freeze({ tileX: 41, tileY: 10 }),
      houseDoor: Object.freeze({
        tileX: MAP_ZONES.HOUSE.DOOR_TILE_X,
        tileY: MAP_ZONES.HOUSE.DOOR_TILE_Y + 1,
      }),
    }),
    // Jalan setapak disambung dari ujung jalan lama (x=25) ke tepi kanan
    gatePath: Object.freeze({ x0: 26, y0: 9, x1: 43, y1: 10 }),
    gates: Object.freeze([
      Object.freeze({
        targetMapId: MAP_IDS.VILLAGE,
        entryPoint: 'fromFarm',
        tileX: 42,
        tileY: 9,
        widthTiles: 2,
        heightTiles: 2,
      }),
    ]),
  }),
  /**
   * Peta ASCII desa (64x40; x=0..63 barat->timur, y=0..39 utara->selatan).
   * Legenda: G gerbang, @ spawn, = jalan/plaza/pasar/jalur, H rumah, B balai,
   * K kios, D pintu, W sumur, P patung, A api unggun, S papan, c peti kecil,
   * C peti tumpuk, b spanduk, T pohon, m jamur, f pagar, # semak tepi,
   * r batu, : bunga, . rumput.
   *
   *     0         1         2         3         4         5         6
   *  0 ################################################################
   *  1 #..............................................................#
   *  2 #..............................................................#
   *  3 #................:..............:.........:.................:..#
   *  4 #......................:.......................................#
   *  5 #.....................................:........................#
   *  6 #................................T.:.:..::.T.......:......:....#
   *  7 #....:..........T.....T............BBBBBBB.......:.............#
   *  8 #.::...:T::..:...............:.....BBBBBBB..:..................#
   *  9 #........:HHHHH:..::.:.T.....T....:BBBBBBB:....................#
   * 10 #.........HHHHH.:HHHHH::...:.......BBBBBBB...........:...:.....#
   * 11 #........:HHHHH..HHHHH::HHHH:.....:BBBBBBB..T................T.#
   * 12 #.........HHHHH::HHHHH:.HHHH:.....:BBBDBBB:....................#
   * 13 #.........HHDHH::HHDHH.:HHHH:.....f::.=:..f...T...T.......T....#
   * 14 #........f..=..ff:.=::f.HDHH:.fff.::::=.:.:.:fff.:.............#
   * 15 #...........=:.....=...f.=:.f:===================KKKK=KKKK=KKK.#
   * 16 #...........=......=:....=...:===================KKKK=KKKK=KKK.#
   * 17 #...T.:...:.=......=::...=...:========W==========KDKKbKDKK=KDK.#
   * 18 f...........=......=:....=...S======================c===C====.##
   * 19 G=============================================================##
   * 20 G=====@=======================================================##
   * 21 f=============================================================##
   * 22 #.............:.=.........=.A.==================:.:.......:...##
   * 23 #...............=..:.....T=..:=P================...............#
   * 24 #......T.m......=T:.:.:.::=...==================...............#
   * 25 #..T......:.::..=..HHHHHH.=...==================...:...........#
   * 26 #...:...:HHHHHH:=.:HHHHHH:=.m:fff=.:.::::::m:fff.............:.#
   * 27 #..:..m..HHHHHH:=.:HHHHHH:=HHHHH:=......:......................#
   * 28 #.....:..HHHHHH:=..HHDHHH.=HHHHH.=.............................#
   * 29 #........HHHHHH.=.f.=======HHHHH:=................:......:.....#
   * 30 #.......:HHHHHH:=TT........HHDHH.=..............:..............#
   * 31 #........HHDHHH:=........Tf.======.............................#
   * 32 #.T...:mf.=======T.............................................#
   * 33 #.....r.........TT.T..::........T..............................#
   * 34 #......T...T.......T.....:....................:................#
   * 35 #...T......T....T.T.T........:...........:.....................#
   * 36 #..T.....T.....................:...........:.................:.#
   * 37 #....T......r...:....................:..............:....:.....#
   * 38 #..............................................................#
   * 39 ################################################################
   */
  village: Object.freeze({
    id: MAP_IDS.VILLAGE,
    widthTiles: 64,
    heightTiles: 40,
    seed: 4242,
    spawn: Object.freeze({ tileX: 6, tileY: 20 }),
    entryPoints: Object.freeze({
      default: Object.freeze({ tileX: 6, tileY: 20 }),
      // Di luar zona gerbang barat (0..1, 19..20) agar tidak langsung memicu balik
      fromFarm: Object.freeze({ tileX: 6, tileY: 20 }),
    }),
    // Jalan masuk dari gerbang barat menyatu dengan jalan utama di y=19..21
    gatePath: Object.freeze({ x0: 0, y0: 19, x1: 9, y1: 20 }),
    gates: Object.freeze([
      Object.freeze({
        targetMapId: MAP_IDS.FARM,
        entryPoint: 'fromVillage',
        tileX: 0,
        tileY: 19,
        widthTiles: 2,
        heightTiles: 2,
      }),
    ]),
    // Titik NPC (data saja; belum ada NPC/logika). `facing` = vektor arah hadap.
    NPC_SPOTS: Object.freeze([
      Object.freeze({
        id: 'plaza',
        tileX: 40,
        tileY: 18,
        facing: Object.freeze({ x: -1, y: 0 }),
      }),
      Object.freeze({
        id: 'house',
        tileX: 12,
        tileY: 15,
        facing: Object.freeze({ x: 0, y: -1 }),
      }),
      Object.freeze({
        id: 'market',
        tileX: 51,
        tileY: 18,
        facing: Object.freeze({ x: 0, y: -1 }),
      }),
    ]),
  }),
});

export const AMBIENT_ANIMALS = Object.freeze({
  MAX_COUNT: 8,
  IDLE_MIN_MS: 1600,
  IDLE_MAX_MS: 4200,
  MIN_SEPARATION_PX: 32, // 2 tiles minimum distance between animals
  TARGET_MAX_ATTEMPTS: 14,
  // Free roaming: a random target 6-10 tiles from the current position, straight line only
  WANDER_MIN_TILES: 6,
  WANDER_MAX_TILES: 10,
  // Land animals pause while the player is within ~2.5 tiles, then resume when they walk away
  PLAYER_PAUSE_RADIUS_PX: 40,
  PLAYER_PAUSE_RETRY_MS: 600,
  // Initial spawn spread across the whole map
  SPAWN_MIN_SEPARATION_PX: 112,
  SPAWN_MAX_ATTEMPTS: 240,
  // Forbidden-tile map (computed once at spawn): farm margin, pond water, pier, blocked tiles
  FARM_MARGIN_TILES: 1,
  FOOTPRINT_HALF_X_PX: 5,
  FOOTPRINT_HALF_Y_PX: 3,
  WATER_FOOTPRINT_HALF_PX: 4,
  LINE_SAMPLE_STEP_PX: 8,
  SOUND_MAX_DISTANCE_PX: 160, // ~10 tiles from player so calls are heard before touching
  SOUND_MIN_INTERVAL_MS: 9000,
  SOUND_MAX_INTERVAL_MS: 18000,
  MORNING_CROW_HOUR: 6,
  MORNING_CROW_COUNT: 3,
  MORNING_CROW_DELAY_MIN_MS: 1500,
  MORNING_CROW_DELAY_MAX_MS: 3000,
  MORNING_CROW_VOLUME_DECAY: Object.freeze([1.0, 0.78, 0.58]),
  // 8 ambient animals total: 2 chickens, 1 cow, 1 sheep, 1 pig, 1 duck (pond water), 2 birds
  // Visual inspection of all 6 PNG strips: all face LEFT in frame 0..3 (`facesRight: false`)
  SPAWNS: Object.freeze([
    Object.freeze({
      type: 'chicken',
      count: 2,
      facesRight: false,
      waterOnly: false,
      speed: 18,
      fps: 6,
      originY: 0.78,
    }),
    Object.freeze({
      type: 'cow',
      count: 1,
      facesRight: false,
      waterOnly: false,
      speed: 11,
      fps: 5,
      originY: 0.82,
    }),
    Object.freeze({
      type: 'sheep',
      count: 1,
      facesRight: false,
      waterOnly: false,
      speed: 12,
      fps: 5,
      originY: 0.82,
    }),
    Object.freeze({
      type: 'pig',
      count: 1,
      facesRight: false,
      waterOnly: false,
      speed: 13,
      fps: 5,
      originY: 0.82,
    }),
    Object.freeze({
      type: 'duck',
      count: 1,
      facesRight: false,
      waterOnly: true,
      speed: 13,
      fps: 6,
      originY: 0.75,
    }),
    Object.freeze({
      type: 'bird',
      count: 2,
      facesRight: false,
      waterOnly: false,
      speed: 22,
      fps: 8,
      originY: 0.85,
    }),
  ]),
});

/**
 * Paket 2b livestock: only the two chickens and the single cow produce goods.
 * Readiness is day-based (no real-time timers): an animal is ready when
 * `currentDay - lastCollectedDay >= intervalDays` (missing value = ready).
 */
export const LIVESTOCK = Object.freeze({
  EGG_ITEM_ID: 'egg',
  MILK_ITEM_ID: 'milk',
  EGG_SELL_PRICE: 12,
  MILK_SELL_PRICE: 30,
  COLLECT_RADIUS_PX: 24,
  PRODUCT_ICON_OFFSET_Y: 20,
  PRODUCT_ICON_BOB_PX: 2,
  PRODUCT_ICON_BOB_SPEED: 0.004,
  PRODUCT_ANIMALS: Object.freeze({
    chicken: Object.freeze({ itemId: 'egg', intervalDays: 1 }),
    cow: Object.freeze({ itemId: 'milk', intervalDays: 2 }),
  }),
});

/**
 * NPC desa (Fase 3): data NPC ada di `src/data/npcs.js`, kalimat di `dialogues.js`.
 * NPC hanya dibuat oleh `WorldBuilder` saat map desa dibangun dan ikut dihancurkan
 * saat map berganti. Radius interaksi diukur dari titik kaki NPC.
 */
export const NPC = Object.freeze({
  INTERACT_RADIUS_PX: 24,
  COLLIDER_WIDTH: 12,
  COLLIDER_HEIGHT: 8,
  DOING_MIN_DELAY_MS: 9000,
  DOING_MAX_DELAY_MS: 18000,
  DOING_DURATION_MS: 620,
  HINT_LABEL: 'Ngobrol',
  // Ikon quest melayang di atas kepala NPC (dibuat sekali, hanya di-toggle)
  QUEST_ICON_OFFSET_Y: -46,
  QUEST_ICON_SCALE: 1.6,
  QUEST_ICON_BOB_PX: 2.5,
  QUEST_ICON_BOB_MS: 1800,
});

/** Pengaturan kotak dialog (UI) dan pemilihan kalimat (DialogueSystem). */
export const DIALOGUE = Object.freeze({
  LINES_PER_TALK: 2,
  TYPEWRITER_MS_PER_CHAR: 28,
  BLIP_EVERY_CHARS: 4,
  BLIP_MIN_INTERVAL_MS: 150,
  // Geometri kotak dalam satuan UI (dikalikan uiScale integer).
  BOX_MIN_WIDTH_UNITS: 280,
  BOX_MAX_WIDTH_UNITS: 620,
  BOX_HEIGHT_UNITS: 92,
  BOX_PAD_UNITS: 12,
  SIDE_RESERVED_UNITS: 150, // ruang untuk joystick (kiri) & tombol AKSI/ALAT (kanan)
  NARROW_LIFT_UNITS: 130, // kotak dinaikkan di atas kontrol saat layar sempit
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
    Object.freeze({ hour: 16, phase: 'sore', color: 0xffa24a, alpha: 0.05 }),
    Object.freeze({ hour: 17.5, phase: 'sore', color: 0xff7d34, alpha: 0.24 }),
    Object.freeze({ hour: 19, phase: 'senja', color: 0xc0585c, alpha: 0.30 }),
    Object.freeze({ hour: 20.5, phase: 'senja', color: 0x302458, alpha: 0.40 }),
    Object.freeze({ hour: 22, phase: 'malam', color: 0x12163a, alpha: 0.45 }),
    Object.freeze({ hour: 24, phase: 'malam', color: 0x0e1233, alpha: 0.47 }),
  ]),
});

/**
 * Deterministic weather derived from the day number (no extra save fields).
 * Rain: ~20% of days from day 3 onward, max 2 consecutive rainy days,
 * one 3-6 hour rain period per rainy day starting between 07:00 and 15:00.
 */
export const WEATHER = Object.freeze({
  // Slightly above 0.2 so the 2-day cap still lands near a 20% rainy-day share
  RAIN_CHANCE: 0.21,
  FIRST_RAIN_DAY: 3,
  MAX_CONSECUTIVE_RAINY_DAYS: 2,
  RAIN_START_HOUR_MIN: 7,
  RAIN_START_HOUR_MAX: 15,
  RAIN_DURATION_MIN_HOURS: 3,
  RAIN_DURATION_MAX_HOURS: 6,
  // Visuals (camera-fixed, below UIScene HUD)
  MAX_RAIN_DROPS: 120,
  RAIN_FADE_MS: 1400,
  RAIN_LINE_COLOR: 0xbfd9ff,
  RAIN_LINE_ALPHA: 0.42,
  RAIN_SPEED_MIN: 620,
  RAIN_SPEED_MAX: 980,
  RAIN_DRIFT: -70,
  CLOUD_COLOR: 0x5a6b86,
  CLOUD_MAX_ALPHA: 0.12,
  NIGHT_CLOUD_ALPHA: 0.04,
  // Audio: measured rain.wav mean -21.2 dB / peak -1.0 dB (16 s loop)
  RAIN_SOUND_ENABLED: true,
  RAIN_AMBIENCE_VOLUME: 0.08,
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

export const RESOURCE_NODES = Object.freeze({
  TREE_RESPAWN_DAYS: 4,
  ROCK_RESPAWN_DAYS: 3,
  TREE_HITS_MIN: 4,
  TREE_HITS_MAX: 5,
  ROCK_HITS_MIN: 3,
  ROCK_HITS_MAX: 4,
  TREE_DROP_MIN: 2,
  TREE_DROP_MAX: 4,
  ROCK_DROP_MIN: 1,
  ROCK_DROP_MAX: 2,
  WOOD_ITEM_ID: 'wood',
  ROCK_ITEM_ID: 'rock',
  WOOD_SELL_PRICE: 6,
  ROCK_SELL_PRICE: 9,
  INTERACT_RADIUS_PX: 26,
  FACING_MIN_DOT: 0.4,
  AXE_ANIM_FPS: 18,
  AXE_LOCK_MS: 560,
  AXE_CONTACT_DELAY_MS: 300,
  MINING_ANIM_FPS: 18,
  MINING_LOCK_MS: 560,
  MINING_CONTACT_DELAY_MS: 300,
  BREAK_SFX_RATE_TREE: 0.8,
  BREAK_SFX_RATE_ROCK: 0.7,
  SHAKE_OFFSET_PX: 2,
  SHAKE_DURATION_MS: 50,
  RESPAWN_POP_MS: 220,
  // 10 interior trees on the farm map (all other trees remain decorative)
  TREE_NODE_KEYS: Object.freeze([
    '7,5',
    '17,4',
    '24,5',
    '27,6',
    '4,14',
    '3,19',
    '9,23',
    '19,23',
    '29,24',
    '35,25',
  ]),
  // 3 converted detailLayer rocks + 4 new interior grass rocks (stump at 22,19 stays decor)
  ROCK_PLACEMENTS: Object.freeze([
    Object.freeze({ tx: 6, ty: 7, variant: 'large' }),
    Object.freeze({ tx: 22, ty: 14, variant: 'cluster' }),
    Object.freeze({ tx: 38, ty: 8, variant: 'medium' }),
    Object.freeze({ tx: 5, ty: 17, variant: 'medium' }),
    Object.freeze({ tx: 29, ty: 7, variant: 'large' }),
    Object.freeze({ tx: 13, ty: 21, variant: 'cluster' }),
    Object.freeze({ tx: 33, ty: 23, variant: 'medium' }),
  ]),
});

/**
 * Progressive seed unlock schedule by in-game day (`day >= entry.day`).
 * Easy to tune without touching save format or system logic.
 */
export const SEED_UNLOCK_SCHEDULE = Object.freeze([
  Object.freeze({ day: 1, crops: Object.freeze(['parsnip', 'carrot']) }),
  Object.freeze({ day: 3, crops: Object.freeze(['radish', 'potato']) }),
  Object.freeze({ day: 6, crops: Object.freeze(['beetroot', 'wheat']) }),
  Object.freeze({ day: 10, crops: Object.freeze(['sunflower', 'cabbage']) }),
  Object.freeze({ day: 14, crops: Object.freeze(['kale', 'pumpkin']) }),
  Object.freeze({ day: 18, crops: Object.freeze(['cauliflower']) }),
]);

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
  MAX_SLOTS: 24,
  DEFAULT_MAX_STACK: 20,
  COMPACT_COLS: 6,
  COMPACT_ROWS: 4,
  // Collapsible backpack drawer (cell size in base UI units, x uiScale)
  SLOT_CELL_SIZE: 26,
  // Physical minimum touch target already used by TouchControls small buttons
  // ((BUTTON_SMALL_RADIUS 18 + BUTTON_HIT_PADDING 6) * 2 = 48px at uiScale 1)
  SLOT_MIN_TOUCH_PX: 48,
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
    DIALOGUE_NAME: 16, // 32px physical at uiScale=2
    MIN_DIALOGUE_NAME_PX: 30,
    DIALOGUE_BODY: 15, // 30px physical at uiScale=2
    MIN_DIALOGUE_BODY_PX: 28,
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
