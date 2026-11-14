import { WEATHER } from '../data/gameConfig.js';
import { eventBus, EVENTS } from './EventBus.js';

/**
 * Deterministic weather derived only from `gameState.day` (no extra save fields).
 * - ~20% of days from `WEATHER.FIRST_RAIN_DAY` onward are rainy
 * - Never more than `WEATHER.MAX_CONSECUTIVE_RAINY_DAYS` rainy days in a row
 * - Each rainy day has ONE rain period: start 07:00-15:00, duration 3-6 hours
 * Everything is hashed from the day number, so a save loaded mid-rain restores
 * the exact same period without storing weather state.
 *
 * Emits `EVENTS.WEATHER_CHANGED` on start/stop (and on load) so systems can react.
 */
const DRY_PLAN = {
  rainy: false,
  startHour: 0,
  endHour: 0,
  duration: 0,
};

/** Plan cache indexed by day-1 (plans depend on previous days for the 2-day cap). */
const planCache = [];

/**
 * Stable 32-bit hash -> [0,1). `salt` picks an independent stream per field.
 */
function hash01(day, salt) {
  // Avalanche hash (uniform over day 1-600: mean 0.516, P(<0.2) = 0.192)
  let h = (day + salt * 2654435761) >>> 0;
  h ^= h >>> 17;
  h = Math.imul(h, 0xed5ad4bb);
  h ^= h >>> 11;
  h = Math.imul(h, 0xac4c1b51);
  h ^= h >>> 15;
  h = Math.imul(h, 0x31848bab);
  h ^= h >>> 14;
  return (h >>> 0) / 4294967296;
}

export class WeatherSystem {
  /**
   * Pure helper: plan for a single day (cached, deterministic).
   * Safe to call from tests/simulations without a Phaser scene.
   */
  static getPlanForDay(day) {
    const d = Math.max(1, Math.floor(Number(day) || 1));
    for (let i = planCache.length + 1; i <= d; i += 1) {
      planCache.push(WeatherSystem._computePlan(i));
    }
    return planCache[d - 1];
  }

  /** Pure helper: is it raining on `day` at fractional `hour`? */
  static isRainingAt(day, hour) {
    const plan = WeatherSystem.getPlanForDay(day);
    if (!plan.rainy) return false;
    return hour >= plan.startHour && hour < plan.endHour;
  }

  static _computePlan(day) {
    if (day < WEATHER.FIRST_RAIN_DAY) {
      return { day, ...DRY_PLAN };
    }

    let rainy = hash01(day, 0) < WEATHER.RAIN_CHANCE;

    // Cap consecutive rainy days using the already-computed previous plans.
    if (rainy) {
      const prev1 = WeatherSystem.getPlanForDay(day - 1);
      if (prev1.rainy) {
        const prev2 = WeatherSystem.getPlanForDay(day - 2);
        if (prev2.rainy) rainy = false;
      }
    }

    if (!rainy) {
      return { day, ...DRY_PLAN };
    }

    const startSpan =
      WEATHER.RAIN_START_HOUR_MAX - WEATHER.RAIN_START_HOUR_MIN + 1;
    const durationSpan =
      WEATHER.RAIN_DURATION_MAX_HOURS - WEATHER.RAIN_DURATION_MIN_HOURS + 1;
    const startHour =
      WEATHER.RAIN_START_HOUR_MIN +
      Math.floor(hash01(day, 1) * startSpan);
    const duration =
      WEATHER.RAIN_DURATION_MIN_HOURS +
      Math.floor(hash01(day, 2) * durationSpan);

    return {
      day,
      rainy: true,
      startHour,
      endHour: Math.min(24, startHour + duration),
      duration,
    };
  }

  constructor(gameState, timeSystem) {
    this.gameState = gameState;
    this.timeSystem = timeSystem;
    this.isRaining = false;
    this.plan = WeatherSystem.getPlanForDay(this._getDay());
    this._lastDay = -1;
    this.destroyed = false;
  }

  _getDay() {
    return Math.max(1, Math.floor(Number(this.gameState?.day) || 1));
  }

  _getHour() {
    if (this.timeSystem && typeof this.timeSystem.getExactHour === 'function') {
      return this.timeSystem.getExactHour();
    }
    const hour = Number(this.gameState?.hour);
    const minute = Number(this.gameState?.minute);
    return (Number.isFinite(hour) ? hour : 0) +
      (Number.isFinite(minute) ? minute : 0) / 60;
  }

  /**
   * Re-evaluates the current rain state. Cheap enough to call every frame;
   * only emits when the state or the day changes.
   */
  update() {
    if (this.destroyed) return;
    const day = this._getDay();
    const plan = WeatherSystem.getPlanForDay(day);
    const hour = this._getHour();
    const raining = plan.rainy && hour >= plan.startHour && hour < plan.endHour;
    this.plan = plan;

    this._lastDay = day;
    if (raining !== this.isRaining) {
      this.isRaining = raining;
      this._emit(false);
    }
  }

  /** Emits the current weather once UI/audio listeners are ready (e.g. after loading a save). */
  emitInitialState() {
    if (this.destroyed) return;
    const day = this._getDay();
    const plan = WeatherSystem.getPlanForDay(day);
    const hour = this._getHour();
    this.plan = plan;
    this._lastDay = day;
    this.isRaining = plan.rainy && hour >= plan.startHour && hour < plan.endHour;
    this._emit(true);
  }

  getSnapshot() {
    return {
      day: this._getDay(),
      raining: this.isRaining,
      startHour: this.plan?.startHour ?? 0,
      endHour: this.plan?.endHour ?? 0,
    };
  }

  _emit(initial) {
    eventBus.emit(EVENTS.WEATHER_CHANGED, {
      day: this._getDay(),
      raining: this.isRaining,
      startHour: this.plan?.startHour ?? 0,
      endHour: this.plan?.endHour ?? 0,
      initial: Boolean(initial),
    });
  }

  destroy() {
    this.destroyed = true;
  }
}
