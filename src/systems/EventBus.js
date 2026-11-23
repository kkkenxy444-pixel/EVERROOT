import Phaser from 'phaser';

/**
 * Shared EventEmitter used for decoupled communication between Systems, Entities, and Scenes.
 * V2 features (combat, quests, NPCs, cooking) can subscribe to these events without modifying V1 systems.
 */
export const eventBus = new Phaser.Events.EventEmitter();

export const EVENTS = Object.freeze({
  // Input & Controls
  INPUT_ACTION: 'input:action',
  INPUT_CYCLE_TOOL: 'input:cycle_tool',
  INPUT_SELECT_TOOL: 'input:select_tool',
  INPUT_CYCLE_SEED: 'input:cycle_seed',
  TOUCH_DETECTED: 'input:touch_detected',

  // Inventory & Economy
  INVENTORY_UPDATED: 'inventory:updated',
  INVENTORY_ITEM_ADDED: 'inventory:item_added',
  INVENTORY_ITEM_REMOVED: 'inventory:item_removed',
  TOOL_CHANGED: 'inventory:tool_changed',
  SEED_CHANGED: 'inventory:seed_changed',
  COINS_CHANGED: 'economy:coins_changed',
  OPEN_SHOP: 'economy:open_shop',
  CLOSE_SHOP: 'economy:close_shop',
  SHOP_BUY_ITEM: 'economy:buy_item',
  SHOP_SELL_ITEM: 'economy:sell_item',

  // Farming
  FARM_PLOT_UPDATED: 'farming:plot_updated',
  FARM_ACTION_FEEDBACK: 'farming:feedback',

  // Fishing
  FISHING_STATE_CHANGED: 'fishing:state_changed',
  FISHING_CAUGHT: 'fishing:caught',

  // Weather
  WEATHER_CHANGED: 'weather:changed',
  WEATHER_RAIN_WATERED: 'weather:rain_watered',

  // NPC Dialogue
  DIALOGUE_STARTED: 'dialogue:started',
  DIALOGUE_LINE: 'dialogue:line',
  DIALOGUE_ENDED: 'dialogue:ended',

  // Village Quests
  QUEST_STATE_CHANGED: 'quest:state_changed',
  QUEST_COMPLETED: 'quest:completed',

  // Time & Sleep / Save
  TIME_UPDATED: 'time:updated',
  PHASE_CHANGED: 'time:phase_changed',
  REQUEST_SLEEP_PROMPT: 'time:request_sleep_prompt',
  CONFIRM_SLEEP: 'time:confirm_sleep',
  DAY_ADVANCED: 'time:day_advanced',
  GAME_SAVED: 'save:completed',

  // UI & Notifications & Audio
  TOAST_MESSAGE: 'ui:toast',
  INTERACTION_HINT: 'ui:interaction_hint',
  CLOSE_UI_PANELS: 'ui:close_panels',
  PLAY_SFX: 'audio:play_sfx',
  AUDIO_MUTED_CHANGED: 'audio:muted_changed',
  AUDIO_SETTINGS_CHANGED: 'audio:settings_changed',

  // Debug Mode (?debug=1 only)
  DEBUG_ADD_COINS: 'debug:add_coins',
  DEBUG_NEXT_DAY: 'debug:next_day',
  DEBUG_FILL_SEEDS: 'debug:fill_seeds',
});
