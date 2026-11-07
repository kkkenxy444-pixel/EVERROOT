import Phaser from 'phaser';
import { ASSET_KEYS, charLayerKey } from '../data/assetKeys.js';
import { GAME, getUiScale, SCENE_KEYS, UI } from '../data/gameConfig.js';
import { AudioManager } from '../systems/AudioManager.js';
import { pixelTextStyle } from '../systems/FontLoader.js';
import { SaveSystem } from '../systems/SaveSystem.js';

/**
 * MenuScene:
 * - Displays `ui/branding/game_icon_primary.png` (scaled from 1536x1536), title "EVERROOT",
 *   and animated decorative sprites from the asset bundle
 * - Rendered at native screen resolution with integer `uiScale = getUiScale(height)`
 * - First tap unlocks browser audio autoplay policy (`AudioManager.unlockAudio()`)
 * - Buttons:
 *   1. "Mulai" / "Mulai Baru"
 *   2. "Lanjut (Hari X)" (when save exists in localStorage)
 *   3. "Hapus Save" (when save exists in localStorage)
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  init(data) {
    this.failedAssetCount = Number(data?.failedAssetCount) || 0;
  }

  create() {
    this._transitioning = false;
    this.cameras.main.setBackgroundColor('#23170f');
    this.cameras.main.fadeIn(UI.FADE_MS, 0, 0, 0);
    AudioManager.playSceneBgm(SCENE_KEYS.MENU);

    // Ensure first tap anywhere unlocks WebAudio and starts menu BGM
    this.input.once('pointerdown', () => {
      AudioManager.unlockAudio();
      AudioManager.playSceneBgm(SCENE_KEYS.MENU);
    });

    this._renderMenu();

    this._onResize = () => {
      this._renderMenu();
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, this._onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this._onResize);
    });
  }

  _transitionTo(targetScene, data = {}) {
    if (this._transitioning) return;
    this._transitioning = true;
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(targetScene, data);
    });
    cam.fadeOut(UI.FADE_MS, 0, 0, 0);
  }

  _renderMenu() {
    if (this.menuRoot) {
      this.menuRoot.destroy(true);
    }
    this.menuRoot = this.add.container(0, 0);

    const w = this.scale.width || GAME.WIDTH;
    const h = this.scale.height || GAME.HEIGHT;
    const s = getUiScale(w, h);

    this._drawBackgroundDecor(w, h, s);
    this._buildHeader(w, h, s);
    this._buildMenuButtons(w, h, s);
    this._buildAudioSettingsBar(w, h, s);
    this._buildFooter(w, h, s);
  }

  _drawBackgroundDecor(w, h, s) {
    const bg = this.add.graphics();
    // Warm meadow horizon backdrop filling 100% of screen
    bg.fillStyle(0x2c1d13, 1);
    bg.fillRect(0, 0, w, h);
    bg.fillStyle(0x3b5932, 0.35);
    bg.fillRect(0, h - 68 * s, w, 68 * s);
    bg.lineStyle(2 * s, UI.PANEL_BORDER, 0.65);
    const pad = 10 * s;
    bg.strokeRoundedRect(pad, pad, w - pad * 2, h - pad * 2, 6 * s);

    // Decorative animated trees & player preview on the sides
    const leftTree = this.add
      .sprite(Math.max(56 * s, w * 0.14), h - 34 * s, ASSET_KEYS.TREE_ROUND, 0)
      .setOrigin(0.5, 1)
      .setScale(1.5 * s);
    leftTree.play(`${ASSET_KEYS.TREE_ROUND}_anim`);

    const rightTree = this.add
      .sprite(w - Math.max(56 * s, w * 0.14), h - 30 * s, ASSET_KEYS.TREE_PINE, 0)
      .setOrigin(0.5, 1)
      .setScale(1.4 * s);
    rightTree.play(`${ASSET_KEYS.TREE_PINE}_anim`);

    // 3-layer animated character preview on the left meadow
    const charX = Math.max(102 * s, w * 0.22);
    const charY = h - 38 * s;
    const base = this.add
      .sprite(charX, charY, charLayerKey('idle', 'base'), 0)
      .setScale(s);
    const hair = this.add
      .sprite(charX, charY, charLayerKey('idle', 'spikeyhair'), 0)
      .setScale(s);
    const tools = this.add
      .sprite(charX, charY, charLayerKey('idle', 'tools'), 0)
      .setScale(s);
    base.play(`${charLayerKey('idle', 'base')}_anim`);
    hair.play(`${charLayerKey('idle', 'spikeyhair')}_anim`);
    tools.play(`${charLayerKey('idle', 'tools')}_anim`);

    this.menuRoot.add([bg, leftTree, rightTree, base, hair, tools]);
  }

  _buildHeader(w, h, s) {
    const cx = w / 2;
    const F = UI.FONT || {};
    const titlePx = Math.max(
      F.MIN_MENU_TITLE_PX || 38,
      Math.round((F.MENU_TITLE || 22) * s)
    );
    const subPx = Math.max(
      F.MIN_MENU_SUB_PX || 26,
      Math.round((F.MENU_SUBTITLE || 14) * s)
    );
    const strokePx = Math.max(2, Math.round(1.2 * s));

    // Game branding icon (`ui/branding/game_icon_primary.png`, 1536x1536 -> 44*s x 44*s)
    const iconFrame = this.add.graphics();
    iconFrame.fillStyle(UI.PANEL_BG, 1);
    iconFrame.fillRoundedRect(cx - 25 * s, 12 * s, 50 * s, 50 * s, 5 * s);
    iconFrame.lineStyle(2 * s, UI.ACCENT, 1);
    iconFrame.strokeRoundedRect(cx - 25 * s, 12 * s, 50 * s, 50 * s, 5 * s);

    const icon = this.add.image(cx, 37 * s, ASSET_KEYS.UI_GAME_ICON);
    icon.setDisplaySize(44 * s, 44 * s);

    const titleTxt = this.add
      .text(
        cx,
        74 * s,
        GAME.TITLE.toUpperCase(),
        pixelTextStyle(titlePx, '#f2c14e', {
          stroke: '#120b07',
          strokeThickness: strokePx + 1,
        })
      )
      .setOrigin(0.5);

    const subTxt = this.add
      .text(
        cx,
        95 * s,
        'Bertani • Memancing • Menjelajah',
        pixelTextStyle(subPx, '#f0dfc8', {
          stroke: '#120b07',
          strokeThickness: strokePx,
        })
      )
      .setOrigin(0.5);

    this.menuRoot.add([iconFrame, icon, titleTxt, subTxt]);
  }

  _buildMenuButtons(w, h, s) {
    const cx = w / 2;
    const hasSave = SaveSystem.hasSave();
    const savedState = hasSave ? SaveSystem.load() : null;
    const F = UI.FONT || {};
    const btnFontPx = Math.max(
      F.MIN_BUTTON_PX || 26,
      Math.round((F.BUTTON || 14) * s)
    );

    let y = 122 * s;
    const btnH = Math.max(48, 25 * s);
    const spacing = btnH + 6 * s;
    const wideW = Math.min(w - 20 * s, 268 * s);
    const stdW = Math.min(w - 24 * s, 216 * s);

    if (hasSave && savedState) {
      const hh = String(savedState.hour ?? 6).padStart(2, '0');
      const mm = String(savedState.minute ?? 0).padStart(2, '0');
      this._createMenuButton(
        cx,
        y,
        wideW,
        btnH,
        s,
        `Lanjut (Hari ${savedState.day} • ${hh}:${mm} • ${savedState.coins}G)`,
        0x4e7a3e,
        () => {
          this._transitionTo(SCENE_KEYS.GAME, { mode: 'continue' });
        },
        btnFontPx
      );
      y += spacing;
    }

    this._createMenuButton(
      cx,
      y,
      stdW,
      btnH,
      s,
      hasSave ? 'Mulai Baru' : 'Mulai',
      hasSave ? UI.PANEL_INNER : 0x4e7a3e,
      () => {
        SaveSystem.clear();
        this._transitionTo(SCENE_KEYS.GAME, { mode: 'new' });
      },
      btnFontPx
    );
    y += spacing;

    if (hasSave) {
      this._createMenuButton(
        cx,
        y,
        stdW,
        btnH,
        s,
        'Hapus Save',
        0x7a342c,
        () => {
          SaveSystem.clear();
          AudioManager.playSfx(ASSET_KEYS.SFX_UI_CANCEL);
          this._renderMenu();
        },
        btnFontPx
      );
    }
  }

  /**
   * Compact Audio Settings bar in MenuScene (Mute toggle, BGM, Ambience, SFX)
   * persisted in `everroot_v1_audio_settings` via `AudioManager`.
   */
  _buildAudioSettingsBar(w, h, s) {
    const cfg = AudioManager.getSettings();
    const musicPct = Math.round((cfg.musicLevel ?? 0.75) * 100);
    const ambPct = Math.round((cfg.ambienceLevel ?? 0.5) * 100);
    const sfxPct = Math.round((cfg.sfxLevel ?? 0.75) * 100);
    const F = UI.FONT || {};
    const smFontPx = Math.max(
      F.MIN_BUTTON_SM_PX || 26,
      Math.round((F.BUTTON_SM || 13) * s)
    );

    const cx = w / 2;
    const isNarrow = w < 380 * s;
    const btnH = Math.max(44, 22 * s);
    const gap = 6 * s;

    const items = [
      {
        label: cfg.muted ? 'Suara: MUTE' : 'Suara: AKTIF',
        color: cfg.muted ? 0x7a342c : 0x3b2618,
        action: () => {
          AudioManager.toggleMute();
          this._renderMenu();
        },
      },
      {
        label: `BGM: ${musicPct}%`,
        color: 0x3b2618,
        action: () => {
          AudioManager.cycleMusicLevel(1);
          this._renderMenu();
        },
      },
      {
        label: `Alam: ${ambPct}%`,
        color: 0x3b2618,
        action: () => {
          AudioManager.cycleAmbienceLevel(1);
          this._renderMenu();
        },
      },
      {
        label: `SFX: ${sfxPct}%`,
        color: 0x3b2618,
        action: () => {
          AudioManager.cycleSfxLevel(1);
          this._renderMenu();
        },
      },
    ];

    if (isNarrow) {
      const btnW = Math.floor((w - 24 * s - gap) / 2);
      const row1Y = h - 68 * s;
      const row2Y = row1Y + btnH + 5 * s;
      items.forEach((it, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const bx = cx + (col === 0 ? -(btnW / 2 + gap / 2) : btnW / 2 + gap / 2);
        const by = row === 0 ? row1Y : row2Y;
        this._createMenuButton(
          bx,
          by,
          btnW,
          btnH,
          s,
          it.label,
          it.color,
          it.action,
          smFontPx
        );
      });
    } else {
      const btnW = 86 * s;
      const totalW = items.length * btnW + (items.length - 1) * gap;
      const startX = cx - totalW / 2 + btnW / 2;
      const barY = h - 40 * s;
      items.forEach((it, idx) => {
        this._createMenuButton(
          startX + idx * (btnW + gap),
          barY,
          btnW,
          btnH,
          s,
          it.label,
          it.color,
          it.action,
          smFontPx
        );
      });
    }
  }

  _createMenuButton(x, y, w, h, s, label, fillColor, onClick, customFontPx) {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();
    const F = UI.FONT || {};
    const fontPx =
      customFontPx ||
      Math.max(F.MIN_BUTTON_PX || 26, Math.round((F.BUTTON || 14) * s));

    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0xc87d3b : fillColor, 0.96);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4 * s);
      bg.lineStyle(1.6 * s, hover ? 0xffffff : UI.PANEL_BORDER, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4 * s);
    };
    draw(false);

    const txt = this.add
      .text(
        0,
        0,
        label,
        pixelTextStyle(fontPx, '#fff6e0', {
          stroke: '#120b07',
          strokeThickness: Math.max(2, Math.round(1.2 * s)),
        })
      )
      .setOrigin(0.5);

    const zone = this.add
      .zone(0, 0, w, h)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerdown', () => {
      AudioManager.unlockAudio();
      AudioManager.playSfx(ASSET_KEYS.SFX_UI_SELECT);
      onClick();
    });

    c.add([bg, txt, zone]);
    this.menuRoot.add(c);
    return c;
  }

  _buildFooter(w, h, s) {
    const F = UI.FONT || {};
    const footPx = Math.max(
      F.MIN_HUD_SMALL_PX || 22,
      Math.round((F.HUD_SMALL || 12) * s)
    );
    const footerMsg =
      this.failedAssetCount > 0
        ? `Peringatan: ${this.failedAssetCount} aset gagal dimuat • Tap layar untuk audio`
        : 'Tap layar untuk audio • WASD/Sentuh untuk jalan • Spasi/E/AKSI';
    const footer = this.add
      .text(
        w / 2,
        h - 14 * s,
        footerMsg,
        pixelTextStyle(
          footPx,
          this.failedAssetCount > 0 ? '#ff9b85' : '#e0cbb5',
          {
            stroke: '#120b07',
            strokeThickness: Math.max(2, Math.round(s)),
          }
        )
      )
      .setOrigin(0.5);
    this.menuRoot.add(footer);
  }
}
