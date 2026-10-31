import { ASSET_KEYS } from './assetKeys.js';
import { SCENE_KEYS } from './gameConfig.js';

/**
 * Scene-to-BGM mapping, time-of-day ambience, and SFX volume configuration.
 *
 * Rationale for the 5 BGM tracks in `public/assets/audio/bgm/`:
 * 1. `week_29_-_heart-shaped_candy.ogg` (`BGM_MENU`) -> `MenuScene`:
 *    Melodi chiptune hangat, ceria, dan mengundang yang langsung memberi kesan cozy saat membuka game.
 * 2. `week_23_-_workshop_breadboard.ogg` (`BGM_FARM_DAY`) -> `GameScene` (Pagi & Siang):
 *    Ritme santai dan stabil yang cocok menemani aktivitas berkebun, menyiram, dan memancing di siang hari.
 * 3. `week_29_-_heart-shaped_palpatations.ogg` (`BGM_COZY_ALT`) -> `GameScene` (Sore & Malam):
 *    Variasi yang lebih lembut dan tenang untuk suasana senja dan malam di lembah sebelum tidur.
 * 4. `week_17_-_alley_cat_dumpster_divin.ogg` (`BGM_WORKSHOP`) -> Cadangan mode inspeksi/debug:
 *    Nuansa ritmis eksperimental; tidak dipakai di gameplay utama agar mood pedesaan tetap konsisten.
 * 5. `week_17_-_alley_cat_dumpster_party.ogg` (`BGM_PARTY`) -> Cadangan festival V2:
 *    Tempo cepat dan energetik, disiapkan untuk event/festival di V2.
 */
export const AUDIO_CONFIG = Object.freeze({
  MASTER_VOLUME: 0.85,
  BGM_VOLUME: 0.42,
  AMBIENCE_VOLUME: 0.28,
  SFX_VOLUME: 0.65,
  CROSSFADE_MS: 420,
  VOLUME_STEPS: Object.freeze([0, 0.25, 0.5, 0.75, 1.0]),
  DEFAULT_MUSIC_LEVEL: 0.75,
  DEFAULT_SFX_LEVEL: 0.75,

  /** Primary BGM per scene (and time-of-day override in GameScene). */
  SCENE_BGM: Object.freeze({
    [SCENE_KEYS.MENU]: {
      key: ASSET_KEYS.BGM_MENU,
      volume: 0.42,
      loop: true,
    },
    [SCENE_KEYS.GAME]: {
      dayKey: ASSET_KEYS.BGM_FARM_DAY,
      eveningKey: ASSET_KEYS.BGM_COZY_ALT,
      volume: 0.38,
      loop: true,
    },
    [SCENE_KEYS.TILESET_DEBUG]: null,
  }),

  /** Ambience tracks by phase of day in GameScene. */
  PHASE_AMBIENCE: Object.freeze({
    pagi: { key: ASSET_KEYS.AMB_MORNING_BIRDS, volume: 0.25 },
    siang: { key: ASSET_KEYS.AMB_STREAM, volume: 0.22 },
    sore: { key: ASSET_KEYS.AMB_STREAM, volume: 0.22 },
    malam: { key: ASSET_KEYS.AMB_NIGHT_CRICKETS, volume: 0.28 },
  }),

  /** Individual SFX volume multipliers relative to SFX_VOLUME. */
  SFX_SETTINGS: Object.freeze({
    [ASSET_KEYS.SFX_UI_SELECT]: { volume: 0.6 },
    [ASSET_KEYS.SFX_UI_BLIP]: { volume: 0.5 },
    [ASSET_KEYS.SFX_UI_CANCEL]: { volume: 0.55 },
    [ASSET_KEYS.SFX_UI_ERROR]: { volume: 0.55 },
    [ASSET_KEYS.SFX_UI_MENU_OPEN]: { volume: 0.6 },
    [ASSET_KEYS.SFX_UI_NOTIFY]: { volume: 0.65 },
    [ASSET_KEYS.SFX_STEP_GRASS]: { volume: 0.25, detuneJitter: 120 },
    [ASSET_KEYS.SFX_STEP_DIRT]: { volume: 0.3, detuneJitter: 120 },
    [ASSET_KEYS.SFX_HOE_TILL]: { volume: 0.75, detuneJitter: 80 },
    [ASSET_KEYS.SFX_SEED_PLANT]: { volume: 0.7 },
    [ASSET_KEYS.SFX_WATERING_CAN]: { volume: 0.7 },
    [ASSET_KEYS.SFX_TOOL_WATER_SELECT]: { volume: 0.5 },
    [ASSET_KEYS.SFX_CROP_GROW]: { volume: 0.6 },
    [ASSET_KEYS.SFX_HARVEST_POP]: { volume: 0.75 },
    [ASSET_KEYS.SFX_HARVEST_PLUCK]: { volume: 0.75 },
    [ASSET_KEYS.SFX_ROD_CAST]: { volume: 0.75 },
    [ASSET_KEYS.SFX_LURE_PLOP]: { volume: 0.75 },
    [ASSET_KEYS.SFX_FISH_BITE]: { volume: 0.85 },
    [ASSET_KEYS.SFX_REEL_IN]: { volume: 0.7 },
    [ASSET_KEYS.SFX_CATCH_FANFARE]: { volume: 0.85 },
    [ASSET_KEYS.SFX_BUY_CONFIRM]: { volume: 0.75 },
    [ASSET_KEYS.SFX_CASH_REGISTER]: { volume: 0.8 },
    [ASSET_KEYS.SFX_COIN_COLLECT]: { volume: 0.7 },
    [ASSET_KEYS.SFX_ITEM_EQUIP]: { volume: 0.5 },
    [ASSET_KEYS.SFX_DAY_END]: { volume: 0.75 },
    [ASSET_KEYS.SFX_DAY_START]: { volume: 0.75 },
    [ASSET_KEYS.SFX_DOOR_OPEN]: { volume: 0.6 },
    [ASSET_KEYS.SFX_DOOR_CLOSE]: { volume: 0.6 },
    [ASSET_KEYS.SFX_CHEST_OPEN]: { volume: 0.65 },
  }),
});
