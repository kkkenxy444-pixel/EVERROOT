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
 *   4. "Cek Tileset (Debug)" (opens `TilesetDebugScene` directly on mobile/PC)
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

    // Game branding icon (`ui/branding/game_icon_primary.png`, 1536x1536 -> 44*s x 44*s)
    const iconFrame = this.add.graphics();
    iconFrame.fillStyle(UI.PANEL_BG, 1);
    iconFrame.fillRoundedRect(cx - 25 * s, 16 * s, 50 * s, 50 * s, 5 * s);
    iconFrame.lineStyle(2 * s, UI.ACCENT, 1);
    iconFrame.strokeRoundedRect(cx - 25 * s, 16 * s, 50 * s, 50 * s, 5 * s);

    const icon = this.add.image(cx, 41 * s, ASSET_KEYS.UI_GAME_ICON);
    icon.setDisplaySize(44 * s, 44 * s);

    const titleTxt = this.add
      .text(cx, 78 * s, GAME.TITLE.toUpperCase(), pixelTextStyle(18 * s, '#f2c14e'))
      .setOrigin(0.5);

    const subTxt = this.add
      .text(
        cx,
        96 * s,
        'Bertani • Memancing • Menjelajah',
        pixelTextStyle(Math.max(12, 7.5 * s), '#d9c4a9')
      )
      .setOrigin(0.5);

    this.menuRoot.add([iconFrame, icon, titleTxt, subTxt]);
  }

  _buildMenuButtons(w, h, s) {
    const cx = w / 2;
    const hasSave = SaveSystem.hasSave();
    const savedState = hasSave ? SaveSystem.load() : null;

    let y = 120 * s;
    const spacing = 25 * s;

    if (hasSave && savedState) {
      const hh = String(savedState.hour ?? 6).padStart(2, '0');
      const mm = String(savedState.minute ?? 0).padStart(2, '0');
      this._createMenuButton(
        cx,
        y,
        212 * s,
        21 * s,
        s,
        `Lanjut (Hari ${savedState.day} • ${hh}:${mm} • ${savedState.coins}G)`,
        0x4e7a3e,
        () => {
          this._transitionTo(SCENE_KEYS.GAME, { mode: 'continue' });
        }
      );
      y += spacing;
    }

    this._createMenuButton(
      cx,
      y,
      180 * s,
      21 * s,
      s,
      hasSave ? 'Mulai Baru' : 'Mulai',
      hasSave ? UI.PANEL_INNER : 0x4e7a3e,
      () => {
        SaveSystem.clear();
        this._transitionTo(SCENE_KEYS.GAME, { mode: 'new' });
      }
    );
    y += spacing;

    if (hasSave) {
      this._createMenuButton(
        cx,
        y,
        180 * s,
        19 * s,
        s,
        'Hapus Save',
        0x7a342c,
        () => {
          SaveSystem.clear();
          AudioManager.playSfx(ASSET_KEYS.SFX_UI_CANCEL);
          this._renderMenu();
        }
      );
      y += 23 * s;
    }

    this._createMenuButton(
      cx,
      y,
      180 * s,
      19 * s,
      s,
      'Cek Tileset (Debug)',
      0x3b485e,
      () => {
        this._transitionTo(SCENE_KEYS.TILESET_DEBUG, {
          returnScene: SCENE_KEYS.MENU,
        });
      }
    );
  }

  /**
   * Compact Audio Settings bar in MenuScene (Mute toggle, Music Volume, SFX Volume)
   * persisted in `everroot_v1_audio_settings` via `AudioManager`.
   */
  _buildAudioSettingsBar(w, h, s) {
    const cfg = AudioManager.getSettings();
    const musicPct = Math.round(cfg.musicLevel * 100);
    const sfxPct = Math.round(cfg.sfxLevel * 100);
    const cx = w / 2;
    const barY = h - 38 * s;
    const btnW = 72 * s;
    const btnH = 18 * s;
    const gap = 6 * s;

    this._createMenuButton(
      cx - btnW - gap,
      barY,
      btnW,
      btnH,
      s,
      cfg.muted ? 'Suara: MUTE' : 'Suara: AKTIF',
      cfg.muted ? 0x7a342c : 0x3b2618,
      () => {
        AudioManager.toggleMute();
        this._renderMenu();
      }
    );

    this._createMenuButton(
      cx,
      barY,
      btnW,
      btnH,
      s,
      `Musik: ${musicPct}%`,
      0x3b2618,
      () => {
        AudioManager.cycleMusicLevel(1);
        this._renderMenu();
      }
    );

    this._createMenuButton(
      cx + btnW + gap,
      barY,
      btnW,
      btnH,
      s,
      `SFX: ${sfxPct}%`,
      0x3b2618,
      () => {
        AudioManager.cycleSfxLevel(1);
        this._renderMenu();
      }
    );
  }

  _createMenuButton(x, y, w, h, s, label, fillColor, onClick) {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0xc87d3b : fillColor, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4 * s);
      bg.lineStyle(1.5 * s, hover ? 0xffffff : UI.PANEL_BORDER, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4 * s);
    };
    draw(false);

    const txt = this.add
      .text(0, 0, label, pixelTextStyle(Math.max(11, 7.2 * s), '#fff6e0'))
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
    const footerMsg =
      this.failedAssetCount > 0
        ? `Peringatan: ${this.failedAssetCount} aset gagal dimuat (memakai fallback) • Tap layar untuk audio`
        : 'Tap layar untuk aktifkan audio • WASD/Sentuh untuk jalan • Spasi/E/AKSI';
    const footer = this.add
      .text(
        w / 2,
        h - 16 * s,
        footerMsg,
        pixelTextStyle(
          Math.max(11, 6.2 * s),
          this.failedAssetCount > 0 ? '#ff9b85' : '#b8a088'
        )
      )
      .setOrigin(0.5);
    this.menuRoot.add(footer);
  }
}
