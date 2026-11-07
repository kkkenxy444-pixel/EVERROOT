import { TIME } from '../data/gameConfig.js';
import { eventBus, EVENTS } from './EventBus.js';

/**
 * TimeSystem manages the in-game clock (`06:00` to `24:00`), day counter, and
 * 4 day/night phases (`pagi`, `siang`, `sore`, `malam`) defined in `src/data/gameConfig.js`.
 *
 * Communicates with HUD, GameScene, AudioManager, and FarmingSystem exclusively via `eventBus`.
 */
export class TimeSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.elapsedMs = 0;
    this.paused = false;

    this.gameState.day = Math.max(1, Number(this.gameState.day) || TIME.START_DAY);
    this.gameState.hour = Number.isFinite(this.gameState.hour)
      ? this.gameState.hour
      : TIME.START_HOUR;
    this.gameState.minute = Number.isFinite(this.gameState.minute)
      ? this.gameState.minute
      : TIME.START_MINUTE;

    this._tintState = { color: 0xffffff, alpha: 0 };
    this.currentPhase = this.getPhaseForHour(this.gameState.hour);
  }

  /**
   * Emits initial time and phase events once UI listeners are ready.
   */
  emitInitialState() {
    this.currentPhase = this.getPhaseForHour(this.gameState.hour);
    eventBus.emit(EVENTS.PHASE_CHANGED, this.currentPhase);
    eventBus.emit(EVENTS.TIME_UPDATED, this.getSnapshot());
  }

  getPhaseForHour(hour) {
    const phases = TIME.PHASES;
    if (hour >= phases.NIGHT.startHour || hour < 5) return phases.NIGHT;
    if (hour >= phases.AFTERNOON.startHour) return phases.AFTERNOON;
    if (hour >= phases.NOON.startHour) return phases.NOON;
    return phases.MORNING;
  }

  /**
   * Returns exact fractional in-game hour (including sub-step elapsedMs when unpaused).
   */
  getExactHour() {
    const extraMinutes = this.paused
      ? 0
      : Math.min(TIME.MINUTES_STEP, this.elapsedMs / TIME.MS_PER_GAME_MINUTE);
    const total = this.gameState.hour + (this.gameState.minute + extraMinutes) / 60;
    return Math.max(0, Math.min(24, total));
  }

  /**
   * Smoothly interpolates `{ color, alpha }` from `TIME.TINT_KEYFRAMES` for a given fractional hour.
   * Mutates and returns `out` to avoid per-frame object allocations.
   */
  getTintForHour(fractionalHour, out = this._tintState) {
    const kf = TIME.TINT_KEYFRAMES;
    if (!kf || kf.length === 0) {
      out.color = 0xffffff;
      out.alpha = 0;
      return out;
    }

    let h = Number.isFinite(fractionalHour) ? fractionalHour % 24 : TIME.START_HOUR;
    if (h < 0) h += 24;
    if (fractionalHour === 24) h = 24;

    let a = kf[0];
    let b = kf[kf.length - 1];
    for (let i = 0; i < kf.length - 1; i++) {
      if (h >= kf[i].hour && h <= kf[i + 1].hour) {
        a = kf[i];
        b = kf[i + 1];
        break;
      }
    }

    const span = b.hour - a.hour;
    const rawT = span > 0 ? Math.max(0, Math.min(1, (h - a.hour) / span)) : 0;
    // Smoothstep easing so transitions between keyframes have no sharp corners
    const t = rawT * rawT * (3 - 2 * rawT);

    const ar = (a.color >> 16) & 0xff;
    const ag = (a.color >> 8) & 0xff;
    const ab = a.color & 0xff;

    const br = (b.color >> 16) & 0xff;
    const bg = (b.color >> 8) & 0xff;
    const bb = b.color & 0xff;

    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);

    out.color = (r << 16) | (g << 8) | bl;
    out.alpha = a.alpha + (b.alpha - a.alpha) * t;
    return out;
  }

  getCurrentTint(out = this._tintState) {
    return this.getTintForHour(this.getExactHour(), out);
  }

  formatClock(hour = this.gameState.hour, minute = this.gameState.minute) {
    const hh = String(Math.floor(hour)).padStart(2, '0');
    const mm = String(Math.floor(minute)).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  getSnapshot() {
    const phase = this.currentPhase || this.getPhaseForHour(this.gameState.hour);
    const clock = this.formatClock(this.gameState.hour, this.gameState.minute);
    return {
      day: this.gameState.day,
      hour: this.gameState.hour,
      minute: this.gameState.minute,
      clock,
      phase,
      formatted: `Hari ${this.gameState.day} • ${clock} (${phase.label})`,
    };
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
  }

  update(delta) {
    if (this.paused) return;

    this.elapsedMs += delta;
    const stepMs = TIME.MS_PER_GAME_MINUTE * TIME.MINUTES_STEP;

    if (this.elapsedMs < stepMs) return;
    this.elapsedMs -= stepMs;

    this.gameState.minute += TIME.MINUTES_STEP;
    if (this.gameState.minute >= 60) {
      this.gameState.minute -= 60;
      this.gameState.hour += 1;
    }

    if (this.gameState.hour >= TIME.END_OF_DAY_HOUR) {
      this.gameState.hour = TIME.END_OF_DAY_HOUR;
      this.gameState.minute = 0;
      this.paused = true;
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        'Sudah tengah malam (24:00)! Waktunya istirahat...'
      );
      eventBus.emit(EVENTS.CONFIRM_SLEEP, { autoSleep: true });
      return;
    }

    const nextPhase = this.getPhaseForHour(this.gameState.hour);
    if (!this.currentPhase || nextPhase.id !== this.currentPhase.id) {
      this.currentPhase = nextPhase;
      eventBus.emit(EVENTS.PHASE_CHANGED, this.currentPhase);
    }

    eventBus.emit(EVENTS.TIME_UPDATED, this.getSnapshot());
  }

  /**
   * Advances to the next morning (`day + 1`, `06:00 Pagi`), triggering `EVENTS.DAY_ADVANCED`
   * so `FarmingSystem` grows watered crops, and emits updated phase & clock state.
   */
  advanceToNextDay() {
    this.gameState.day += 1;
    this.gameState.hour = TIME.START_HOUR;
    this.gameState.minute = TIME.START_MINUTE;
    this.elapsedMs = 0;

    this.currentPhase = this.getPhaseForHour(this.gameState.hour);

    eventBus.emit(EVENTS.DAY_ADVANCED, { day: this.gameState.day });
    eventBus.emit(EVENTS.PHASE_CHANGED, this.currentPhase);
    eventBus.emit(EVENTS.TIME_UPDATED, this.getSnapshot());
  }

  destroy() {
    this.paused = true;
  }
}
