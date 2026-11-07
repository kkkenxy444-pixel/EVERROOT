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

  // Base category volumes (separate for BGM, Ambience, and SFX)
  BGM_VOLUME: 0.42,
  AMBIENCE_VOLUME: 0.1,
  SFX_VOLUME: 0.5,

  CROSSFADE_MS: 420,
  VOLUME_STEPS: Object.freeze([0, 0.25, 0.5, 0.75, 1.0]),

  // Separate user-adjustable category levels persisted in localStorage
  DEFAULT_BGM_LEVEL: 0.75,
  DEFAULT_MUSIC_LEVEL: 0.75, // alias for BGM level
  DEFAULT_AMBIENCE_LEVEL: 0.5,
  DEFAULT_SFX_LEVEL: 0.75,

  // Anti-stacking & loop-guard constants (prevents SFX pile-up & crackling)
  MAX_CONCURRENT_PER_SFX: 1, // max 1-2 active instances per SFX key
  SFX_RETRIGGER_RESTART_MS: 140, // stop & restart oldest instance if re-triggered within 140ms
  SFX_GLOBAL_MAX_ACTIVE: 6,

  /**
   * Noisy ambience files disabled by default after waveform audit:
   * - `audio/ambience/stream.wav` (`AMB_STREAM`): continuous broadband white/pink noise
   *   (minWindowRms 0.1031, medianRms 0.1148, ZCR 6344 Hz) + non-zero loop seam jump
   *   on right channel (-0.1219 -> -0.0185, delta 0.1035) causing constant hiss & loop click.
   */
  DISABLED_NOISY_AMBIENCE: Object.freeze([ASSET_KEYS.AMB_STREAM]),

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
  }),

  /**
   * Ambience tracks by phase of day in GameScene.
   * Note: `siang` and `sore` previously used `AMB_STREAM` (`audio/ambience/stream.wav`),
   * which is disabled by default (`null`) because its continuous high-frequency noise floor
   * hisses on mobile speakers and masks BGM.
   */
  PHASE_AMBIENCE: Object.freeze({
    pagi: { key: ASSET_KEYS.AMB_MORNING_BIRDS, volume: 0.09, loop: true },
    siang: { key: ASSET_KEYS.AMB_DAY_CICADA, volume: 0.12, loop: true },
    sore: null,
    malam: { key: ASSET_KEYS.AMB_NIGHT_CRICKETS, volume: 0.08, loop: true },
  }),

  /** Individual SFX volume multipliers relative to SFX_VOLUME + maxInstances cap (1-2). */
  SFX_SETTINGS: Object.freeze({
    [ASSET_KEYS.SFX_UI_SELECT]: { volume: 0.48, maxInstances: 1 },
    [ASSET_KEYS.SFX_UI_BLIP]: { volume: 0.38, maxInstances: 1 },
    [ASSET_KEYS.SFX_UI_CANCEL]: { volume: 0.42, maxInstances: 1 },
    [ASSET_KEYS.SFX_UI_ERROR]: { volume: 0.45, maxInstances: 1 },
    [ASSET_KEYS.SFX_UI_MENU_OPEN]: { volume: 0.5, maxInstances: 1 },
    [ASSET_KEYS.SFX_UI_NOTIFY]: { volume: 0.52, maxInstances: 1 },
    // Lowered soil/grass footstep & farming/water SFX so they never hiss or overpower BGM
    [ASSET_KEYS.SFX_STEP_GRASS]: { volume: 0.12, detuneJitter: 35, maxInstances: 1 },
    [ASSET_KEYS.SFX_STEP_DIRT]: { volume: 0.14, detuneJitter: 35, maxInstances: 1 },
    [ASSET_KEYS.SFX_HOE_TILL]: { volume: 0.38, detuneJitter: 35, maxInstances: 1 },
    [ASSET_KEYS.SFX_SEED_PLANT]: { volume: 0.4, maxInstances: 1 },
    [ASSET_KEYS.SFX_WATERING_CAN]: { volume: 0.25, maxInstances: 1 },
    [ASSET_KEYS.SFX_TOOL_WATER_SELECT]: { volume: 0.32, maxInstances: 1 },
    [ASSET_KEYS.SFX_CROP_GROW]: { volume: 0.45, maxInstances: 1 },
    [ASSET_KEYS.SFX_HARVEST_POP]: { volume: 0.55, maxInstances: 2 },
    [ASSET_KEYS.SFX_HARVEST_PLUCK]: { volume: 0.52, maxInstances: 1 },
    [ASSET_KEYS.SFX_ROD_CAST]: { volume: 0.42, maxInstances: 1 },
    [ASSET_KEYS.SFX_LURE_PLOP]: { volume: 0.36, maxInstances: 1 },
    [ASSET_KEYS.SFX_FISH_BITE]: { volume: 0.68, maxInstances: 1 },
    [ASSET_KEYS.SFX_REEL_IN]: { volume: 0.36, maxInstances: 1 },
    [ASSET_KEYS.SFX_CATCH_FANFARE]: { volume: 0.68, maxInstances: 1 },
    [ASSET_KEYS.SFX_BUY_CONFIRM]: { volume: 0.55, maxInstances: 1 },
    [ASSET_KEYS.SFX_CASH_REGISTER]: { volume: 0.55, maxInstances: 1 },
    [ASSET_KEYS.SFX_COIN_COLLECT]: { volume: 0.48, maxInstances: 1 },
    [ASSET_KEYS.SFX_ITEM_EQUIP]: { volume: 0.24, maxInstances: 1 },
    [ASSET_KEYS.SFX_DAY_END]: { volume: 0.6, maxInstances: 1 },
    [ASSET_KEYS.SFX_DAY_START]: { volume: 0.6, maxInstances: 1 },
    [ASSET_KEYS.SFX_DOOR_OPEN]: { volume: 0.45, maxInstances: 1 },
    [ASSET_KEYS.SFX_DOOR_CLOSE]: { volume: 0.4, maxInstances: 1 },
    [ASSET_KEYS.SFX_CHEST_OPEN]: { volume: 0.5, maxInstances: 1 },
    // Ambient animal calls (verified RMS: chicken -25.4 dB / peak -9.1 dB, cow -24.0 dB / peak -10.3 dB)
    [ASSET_KEYS.SFX_ANIMAL_CHICKEN]: { volume: 0.4, detuneJitter: 60, maxInstances: 1 },
    [ASSET_KEYS.SFX_ANIMAL_COW]: { volume: 0.35, detuneJitter: 50, maxInstances: 1 },
  }),
});
