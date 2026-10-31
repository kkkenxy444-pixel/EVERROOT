import { AUDIO_CONFIG } from '../data/audioConfig.js';
import { SAVE, SCENE_KEYS } from '../data/gameConfig.js';
import { eventBus, EVENTS } from './EventBus.js';

/**
 * Manages BGM per scene, time-of-day ambience loops, SFX playback, short crossfades,
 * visibilitychange pause/resume, persistent audio settings (`everroot_v1_audio_settings`),
 * and mobile browser autoplay unlock on first user interaction.
 */
class AudioManagerClass {
  constructor() {
    this.sound = null;
    this.currentBgm = null;
    this.currentBgmKey = null;
    this.currentBgmBaseVol = AUDIO_CONFIG.BGM_VOLUME;
    this.currentAmbience = null;
    this.currentAmbienceKey = null;
    this.currentAmbienceBaseVol = AUDIO_CONFIG.AMBIENCE_VOLUME;

    this.muted = false;
    this.musicLevel =
      AUDIO_CONFIG.DEFAULT_BGM_LEVEL ?? AUDIO_CONFIG.DEFAULT_MUSIC_LEVEL ?? 0.75;
    this.ambienceLevel = AUDIO_CONFIG.DEFAULT_AMBIENCE_LEVEL ?? 0.5;
    this.sfxLevel = AUDIO_CONFIG.DEFAULT_SFX_LEVEL ?? 0.75;
    this._memorySettings = null;

    this.unlocked = false;
    this.hiddenPaused = false;
    this.pendingSceneKey = null;
    this.pendingPhaseId = 'pagi';
    this._bgmFadeTimer = null;
    this._ambFadeTimer = null;
    this._fadingBgm = null;
    this._fadingAmbience = null;
    /** @type {Map<string, Array<{ sound: any, startedAt: number, volume: number }>>} */
    this.activeSfx = new Map();

    this._loadSettings();
  }

  _loadSettings() {
    try {
      const raw =
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage.getItem(SAVE.AUDIO_STORAGE_KEY)
          : this._memorySettings;
      if (!raw) return;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!parsed || typeof parsed !== 'object') return;

      if (typeof parsed.muted === 'boolean') {
        this.muted = parsed.muted;
      }
      if (Number.isFinite(parsed.musicLevel)) {
        this.musicLevel = Math.max(0, Math.min(1, Number(parsed.musicLevel)));
      }
      if (Number.isFinite(parsed.ambienceLevel)) {
        this.ambienceLevel = Math.max(
          0,
          Math.min(1, Number(parsed.ambienceLevel))
        );
      }
      if (Number.isFinite(parsed.sfxLevel)) {
        this.sfxLevel = Math.max(0, Math.min(1, Number(parsed.sfxLevel)));
      }
    } catch {
      // Safe fallback if localStorage is unavailable or corrupted
    }
  }

  _saveSettings() {
    const payload = {
      muted: Boolean(this.muted),
      musicLevel: this.musicLevel,
      ambienceLevel: this.ambienceLevel,
      sfxLevel: this.sfxLevel,
    };
    this._memorySettings = payload;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          SAVE.AUDIO_STORAGE_KEY,
          JSON.stringify(payload)
        );
      }
    } catch {
      // Ignore storage quota/security errors; in-memory fallback remains active
    }
  }

  getSettings() {
    return {
      muted: this.muted,
      musicLevel: this.musicLevel,
      ambienceLevel: this.ambienceLevel,
      sfxLevel: this.sfxLevel,
    };
  }

  _getEffectiveBgmVolume(baseVol = this.currentBgmBaseVol) {
    if (this.muted || this.musicLevel <= 0) return 0;
    const def = AUDIO_CONFIG.DEFAULT_BGM_LEVEL || 0.75;
    return Math.min(
      1,
      (baseVol || AUDIO_CONFIG.BGM_VOLUME) * (this.musicLevel / def)
    );
  }

  _getEffectiveAmbienceVolume(baseVol = this.currentAmbienceBaseVol) {
    if (this.muted || this.ambienceLevel <= 0) return 0;
    const def = AUDIO_CONFIG.DEFAULT_AMBIENCE_LEVEL || 0.5;
    return Math.min(
      1,
      (baseVol || AUDIO_CONFIG.AMBIENCE_VOLUME) * (this.ambienceLevel / def)
    );
  }

  /**
   * Bind Phaser's SoundManager instance, apply persisted settings, and register
   * first-tap audio unlock + visibilitychange pause/resume listeners.
   */
  init(scene) {
    if (!scene || !scene.sound) return;
    this.sound = scene.sound;
    this.sound.volume = AUDIO_CONFIG.MASTER_VOLUME;
    this.sound.mute = this.muted;

    if (!this.sound.locked) {
      this.unlocked = true;
    } else {
      this.sound.once('unlocked', () => {
        this.unlocked = true;
        this._resumePendingLoops();
      });
    }

    if (!this._domBound) {
      this._domBound = true;
      const unlockHandler = () => {
        this.unlockAudio();
      };
      window.addEventListener('pointerdown', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });

      const visHandler = () => {
        if (document.visibilityState === 'hidden') {
          this._pauseForVisibility();
        } else if (document.visibilityState === 'visible') {
          this._resumeFromVisibility();
        }
      };
      document.addEventListener('visibilitychange', visHandler);

      eventBus.on(EVENTS.PLAY_SFX, (sfxKey) => {
        this.playSfx(sfxKey);
      });
      eventBus.on(EVENTS.PHASE_CHANGED, (phase) => {
        if (this.pendingSceneKey === SCENE_KEYS.GAME && phase && phase.id) {
          this.playSceneBgm(SCENE_KEYS.GAME, phase.id);
        }
      });
    }
  }

  _pauseForVisibility() {
    this.hiddenPaused = true;
    try {
      if (this.currentBgm && this.currentBgm.isPlaying) {
        this.currentBgm.pause();
      }
      if (this.currentAmbience && this.currentAmbience.isPlaying) {
        this.currentAmbience.pause();
      }
      if (this.sound?.context && this.sound.context.state === 'running') {
        this.sound.context.suspend().catch(() => {});
      }
    } catch {
      // Ignore WebAudio state errors
    }
  }

  _resumeFromVisibility() {
    if (!this.hiddenPaused) return;
    this.hiddenPaused = false;
    try {
      if (
        this.unlocked &&
        this.sound?.context &&
        this.sound.context.state === 'suspended'
      ) {
        this.sound.context.resume().catch(() => {});
      }
      if (this.currentBgm && this.currentBgm.isPaused) {
        this.currentBgm.resume();
      } else if (this.unlocked && this.pendingSceneKey && !this.currentBgm) {
        this._resumePendingLoops();
      }
      if (this.currentAmbience && this.currentAmbience.isPaused) {
        this.currentAmbience.resume();
      }
    } catch {
      // Ignore WebAudio state errors
    }
  }

  /**
   * Explicitly resumes WebAudio context on user tap.
   */
  unlockAudio() {
    if (!this.sound) return;
    try {
      if (this.sound.context && this.sound.context.state === 'suspended') {
        this.sound.context.resume().catch(() => {});
      }
      if (!this.unlocked) {
        this.unlocked = true;
        this._resumePendingLoops();
      } else if (this.currentBgm && !this.currentBgm.isPlaying && !this.hiddenPaused) {
        this.currentBgm.play();
      }
    } catch {
      // Ignore WebAudio context errors on restricted devices
    }
  }

  _resumePendingLoops() {
    if (this.pendingSceneKey) {
      this.playSceneBgm(this.pendingSceneKey, this.pendingPhaseId);
    }
  }

  /**
   * Plays the mapped BGM for a scene (from `src/data/audioConfig.js`) with a short crossfade.
   */
  playSceneBgm(sceneKey, phaseId = 'pagi') {
    this.pendingSceneKey = sceneKey;
    this.pendingPhaseId = phaseId;

    if (!this.sound) return;

    const cfg = AUDIO_CONFIG.SCENE_BGM[sceneKey];
    if (!cfg) {
      this.stopBgm(true);
      this.stopAmbience(true);
      return;
    }

    let targetKey = cfg.key;
    if (sceneKey === SCENE_KEYS.GAME) {
      const isEvening = phaseId === 'sore' || phaseId === 'malam';
      targetKey = isEvening ? cfg.eveningKey : cfg.dayKey;
      this.playPhaseAmbience(phaseId);
    } else {
      this.stopAmbience(true);
    }

    if (!targetKey) return;
    const baseVol = cfg.volume ?? AUDIO_CONFIG.BGM_VOLUME;
    this.currentBgmBaseVol = baseVol;

    if (
      this.currentBgmKey === targetKey &&
      this.currentBgm &&
      (this.currentBgm.isPlaying || this.currentBgm.isPaused)
    ) {
      this.currentBgm.setVolume(this._getEffectiveBgmVolume(baseVol));
      return;
    }

    const prevBgm = this.currentBgm;
    this.currentBgm = null;
    this.currentBgmKey = null;

    if (!this._hasAudioInCache(targetKey)) {
      this._fadeOutAndDestroy(prevBgm, '_bgmFadeTimer');
      return;
    }

    try {
      const targetVol = this._getEffectiveBgmVolume(baseVol);
      const nextBgm = this.sound.add(targetKey, {
        loop: cfg.loop !== false,
        volume: prevBgm ? 0 : targetVol,
      });
      this.currentBgm = nextBgm;
      this.currentBgmKey = targetKey;
      nextBgm.play();

      if (prevBgm) {
        this._crossfadeTracks(prevBgm, nextBgm, targetVol, '_bgmFadeTimer');
      }
    } catch {
      this._fadeOutAndDestroy(prevBgm, '_bgmFadeTimer');
    }
  }

  /**
   * Plays or switches outdoor ambience loop based on time phase (`pagi`, `siang`, `sore`, `malam`)
   * with a short crossfade.
   */
  playPhaseAmbience(phaseId) {
    this.pendingPhaseId = phaseId;
    if (!this.sound) return;

    const ambCfg = AUDIO_CONFIG.PHASE_AMBIENCE[phaseId];
    if (!ambCfg || !ambCfg.key) {
      this.stopAmbience(true);
      return;
    }

    const baseVol = ambCfg.volume ?? AUDIO_CONFIG.AMBIENCE_VOLUME;
    this.currentAmbienceBaseVol = baseVol;

    if (
      this.currentAmbienceKey === ambCfg.key &&
      this.currentAmbience &&
      (this.currentAmbience.isPlaying || this.currentAmbience.isPaused)
    ) {
      this.currentAmbience.setVolume(this._getEffectiveAmbienceVolume(baseVol));
      return;
    }

    const prevAmb = this.currentAmbience;
    this.currentAmbience = null;
    this.currentAmbienceKey = null;

    if (!this._hasAudioInCache(ambCfg.key)) {
      this._fadeOutAndDestroy(prevAmb, '_ambFadeTimer');
      return;
    }

    try {
      const targetVol = this._getEffectiveAmbienceVolume(baseVol);
      const nextAmb = this.sound.add(ambCfg.key, {
        loop: true,
        volume: prevAmb ? 0 : targetVol,
      });
      this.currentAmbience = nextAmb;
      this.currentAmbienceKey = ambCfg.key;
      nextAmb.play();

      if (prevAmb) {
        this._crossfadeTracks(prevAmb, nextAmb, targetVol, '_ambFadeTimer');
      }
    } catch {
      this._fadeOutAndDestroy(prevAmb, '_ambFadeTimer');
    }
  }

  _crossfadeTracks(oldSound, newSound, targetVol, timerProp) {
    const fadingProp =
      timerProp === '_bgmFadeTimer' ? '_fadingBgm' : '_fadingAmbience';
    if (this[timerProp]) {
      clearInterval(this[timerProp]);
      this[timerProp] = null;
    }
    if (this[fadingProp] && this[fadingProp] !== oldSound) {
      this._destroySoundSafe(this[fadingProp]);
    }
    this[fadingProp] = oldSound || null;

    const steps = 8;
    const stepMs = Math.max(
      25,
      Math.round((AUDIO_CONFIG.CROSSFADE_MS || 400) / steps)
    );
    const startOldVol =
      typeof oldSound?.volume === 'number' ? oldSound.volume : 0.3;
    let step = 0;

    this[timerProp] = setInterval(() => {
      step += 1;
      const t = Math.min(1, step / steps);
      try {
        if (oldSound && oldSound.isPlaying) {
          oldSound.setVolume(Math.max(0, startOldVol * (1 - t)));
        }
        if (newSound && newSound.isPlaying) {
          newSound.setVolume(this.muted ? 0 : targetVol * t);
        }
      } catch {
        // ignore
      }

      if (step >= steps) {
        clearInterval(this[timerProp]);
        this[timerProp] = null;
        if (this[fadingProp] === oldSound) {
          this[fadingProp] = null;
        }
        this._destroySoundSafe(oldSound);
      }
    }, stepMs);
  }

  _fadeOutAndDestroy(soundObj, timerProp) {
    const fadingProp =
      timerProp === '_bgmFadeTimer' ? '_fadingBgm' : '_fadingAmbience';
    if (this[timerProp]) {
      clearInterval(this[timerProp]);
      this[timerProp] = null;
    }
    if (this[fadingProp] && this[fadingProp] !== soundObj) {
      this._destroySoundSafe(this[fadingProp]);
      this[fadingProp] = null;
    }
    if (!soundObj) return;
    this._destroySoundSafe(soundObj);
  }

  _destroySoundSafe(soundObj) {
    if (!soundObj) return;
    try {
      soundObj.stop();
      soundObj.destroy();
    } catch {
      // ignore
    }
  }

  stopBgm(fade = false) {
    if (this._bgmFadeTimer) {
      clearInterval(this._bgmFadeTimer);
      this._bgmFadeTimer = null;
    }
    if (this._fadingBgm) {
      this._destroySoundSafe(this._fadingBgm);
      this._fadingBgm = null;
    }
    if (this.currentBgm) {
      const old = this.currentBgm;
      this.currentBgm = null;
      this.currentBgmKey = null;
      if (fade) {
        this._crossfadeTracks(old, null, 0, '_bgmFadeTimer');
      } else {
        this._destroySoundSafe(old);
      }
    }
  }

  stopAmbience(fade = false) {
    if (this._ambFadeTimer) {
      clearInterval(this._ambFadeTimer);
      this._ambFadeTimer = null;
    }
    if (this._fadingAmbience) {
      this._destroySoundSafe(this._fadingAmbience);
      this._fadingAmbience = null;
    }
    if (this.currentAmbience) {
      const old = this.currentAmbience;
      this.currentAmbience = null;
      this.currentAmbienceKey = null;
      if (fade) {
        this._crossfadeTracks(old, null, 0, '_ambFadeTimer');
      } else {
        this._destroySoundSafe(old);
      }
    }
  }

  _pruneActiveSfx() {
    for (const [key, list] of this.activeSfx.entries()) {
      const alive = list.filter((entry) => entry?.sound && entry.sound.isPlaying);
      if (alive.length > 0) {
        this.activeSfx.set(key, alive);
      } else {
        this.activeSfx.delete(key);
      }
    }
  }

  /**
   * Plays a one-shot SFX key registered in `src/data/assetKeys.js`.
   * Enforces max 1-2 active instances per key and stops previous instance
   * if re-triggered within `AUDIO_CONFIG.SFX_RETRIGGER_RESTART_MS`.
   */
  playSfx(sfxKey) {
    if (!this.sound || this.muted || this.sfxLevel <= 0 || !sfxKey) return;
    if (!this._hasAudioInCache(sfxKey)) return;

    this._pruneActiveSfx();

    const sfxCfg = AUDIO_CONFIG.SFX_SETTINGS[sfxKey] || {};
    const defSfx = AUDIO_CONFIG.DEFAULT_SFX_LEVEL || 0.75;
    const vol = Math.min(
      1,
      (sfxCfg.volume ?? 1) * AUDIO_CONFIG.SFX_VOLUME * (this.sfxLevel / defSfx)
    );
    if (vol <= 0) return;

    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const retriggerMs = AUDIO_CONFIG.SFX_RETRIGGER_RESTART_MS ?? 140;
    const maxForKey = Math.max(
      1,
      Math.min(
        2,
        sfxCfg.maxInstances ?? AUDIO_CONFIG.MAX_CONCURRENT_PER_SFX ?? 1
      )
    );

    const list = this.activeSfx.get(sfxKey) || [];

    // Stop previous instance if re-triggered within short window
    if (list.length > 0) {
      const newest = list[list.length - 1];
      if (now - newest.startedAt < retriggerMs) {
        list.pop();
        this._destroySoundSafe(newest.sound);
      }
    }

    // Enforce per-key max active instances (1-2)
    while (list.length >= maxForKey) {
      const oldest = list.shift();
      this._destroySoundSafe(oldest?.sound);
    }

    // Enforce global active SFX cap
    const globalMax = AUDIO_CONFIG.SFX_GLOBAL_MAX_ACTIVE ?? 6;
    let totalActive = 0;
    for (const arr of this.activeSfx.values()) {
      totalActive += arr.length;
    }
    if (totalActive >= globalMax) {
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, arr] of this.activeSfx.entries()) {
        if (arr.length > 0 && arr[0].startedAt < oldestTime) {
          oldestTime = arr[0].startedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        const arr = this.activeSfx.get(oldestKey);
        const oldEntry = arr.shift();
        this._destroySoundSafe(oldEntry?.sound);
        if (arr.length === 0) this.activeSfx.delete(oldestKey);
      }
    }

    const detune = sfxCfg.detuneJitter
      ? (Math.random() * 2 - 1) * sfxCfg.detuneJitter
      : 0;

    try {
      const sfxInstance = this.sound.add(sfxKey, {
        volume: vol,
        detune,
      });
      const entry = {
        sound: sfxInstance,
        startedAt: now,
        volume: vol,
      };
      list.push(entry);
      this.activeSfx.set(sfxKey, list);

      const cleanup = () => {
        const cur = this.activeSfx.get(sfxKey);
        if (cur) {
          const next = cur.filter((item) => item !== entry);
          if (next.length > 0) {
            this.activeSfx.set(sfxKey, next);
          } else {
            this.activeSfx.delete(sfxKey);
          }
        }
        try {
          sfxInstance.destroy();
        } catch {
          // ignore
        }
      };

      sfxInstance.once('complete', cleanup);
      sfxInstance.play();
    } catch {
      // Ignore playback errors prior to unlock
    }
  }

  /**
   * Returns a live snapshot of currently playing BGM, Ambience, and SFX instances
   * with their effective volumes for the `?debug=1` audio monitor overlay.
   */
  getActiveSoundsSnapshot() {
    this._pruneActiveSfx();
    const active = [];

    if (this.currentBgm && this.currentBgm.isPlaying) {
      active.push({
        category: 'BGM',
        key: this.currentBgmKey || 'bgm',
        volume: Number(this.currentBgm.volume ?? 0),
      });
    }
    if (this.currentAmbience && this.currentAmbience.isPlaying) {
      active.push({
        category: 'AMB',
        key: this.currentAmbienceKey || 'ambience',
        volume: Number(this.currentAmbience.volume ?? 0),
      });
    }
    for (const [key, list] of this.activeSfx.entries()) {
      for (const item of list) {
        if (item?.sound && item.sound.isPlaying) {
          active.push({
            category: 'SFX',
            key,
            volume: Number(item.sound.volume ?? item.volume ?? 0),
          });
        }
      }
    }

    return {
      muted: this.muted,
      musicLevel: this.musicLevel,
      ambienceLevel: this.ambienceLevel,
      sfxLevel: this.sfxLevel,
      active,
    };
  }

  _applyVolumesToActiveTracks() {
    if (this.sound) {
      this.sound.mute = this.muted;
    }
    try {
      if (this.currentBgm) {
        this.currentBgm.setVolume(
          this._getEffectiveBgmVolume(this.currentBgmBaseVol)
        );
      }
      if (this.currentAmbience) {
        this.currentAmbience.setVolume(
          this._getEffectiveAmbienceVolume(this.currentAmbienceBaseVol)
        );
      }
    } catch {
      // ignore
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this._applyVolumesToActiveTracks();
    this._saveSettings();
    eventBus.emit(EVENTS.AUDIO_MUTED_CHANGED, this.muted);
    eventBus.emit(EVENTS.AUDIO_SETTINGS_CHANGED, this.getSettings());
    return this.muted;
  }

  setMusicLevel(level) {
    this.musicLevel = Math.max(0, Math.min(1, Number(level) || 0));
    if (this.musicLevel > 0 && this.muted) {
      this.muted = false;
    }
    this._applyVolumesToActiveTracks();
    this._saveSettings();
    eventBus.emit(EVENTS.AUDIO_SETTINGS_CHANGED, this.getSettings());
    return this.musicLevel;
  }

  cycleMusicLevel(direction = 1) {
    const steps = AUDIO_CONFIG.VOLUME_STEPS || [0, 0.25, 0.5, 0.75, 1.0];
    let idx = steps.findIndex((v) => Math.abs(v - this.musicLevel) < 0.05);
    if (idx < 0) idx = 3;
    const nextIdx = (idx + direction + steps.length) % steps.length;
    return this.setMusicLevel(steps[nextIdx]);
  }

  setAmbienceLevel(level) {
    this.ambienceLevel = Math.max(0, Math.min(1, Number(level) || 0));
    if (this.ambienceLevel > 0 && this.muted) {
      this.muted = false;
    }
    this._applyVolumesToActiveTracks();
    this._saveSettings();
    eventBus.emit(EVENTS.AUDIO_SETTINGS_CHANGED, this.getSettings());
    return this.ambienceLevel;
  }

  cycleAmbienceLevel(direction = 1) {
    const steps = AUDIO_CONFIG.VOLUME_STEPS || [0, 0.25, 0.5, 0.75, 1.0];
    let idx = steps.findIndex((v) => Math.abs(v - this.ambienceLevel) < 0.05);
    if (idx < 0) idx = 2;
    const nextIdx = (idx + direction + steps.length) % steps.length;
    return this.setAmbienceLevel(steps[nextIdx]);
  }

  setSfxLevel(level) {
    this.sfxLevel = Math.max(0, Math.min(1, Number(level) || 0));
    if (this.sfxLevel > 0 && this.muted) {
      this.muted = false;
    }
    this._applyVolumesToActiveTracks();
    this._saveSettings();
    eventBus.emit(EVENTS.AUDIO_SETTINGS_CHANGED, this.getSettings());
    return this.sfxLevel;
  }

  cycleSfxLevel(direction = 1) {
    const steps = AUDIO_CONFIG.VOLUME_STEPS || [0, 0.25, 0.5, 0.75, 1.0];
    let idx = steps.findIndex((v) => Math.abs(v - this.sfxLevel) < 0.05);
    if (idx < 0) idx = 3;
    const nextIdx = (idx + direction + steps.length) % steps.length;
    return this.setSfxLevel(steps[nextIdx]);
  }

  _hasAudioInCache(key) {
    try {
      return Boolean(this.sound?.game?.cache?.audio?.exists(key));
    } catch {
      return false;
    }
  }
}

export const AudioManager = new AudioManagerClass();
