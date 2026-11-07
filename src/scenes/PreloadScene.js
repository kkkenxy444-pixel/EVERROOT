import Phaser from 'phaser';
import {
  ASSET_BASE_PATH,
  ASSET_KEYS,
  AUDIO_ASSETS,
  CHARACTER_ANIM_DEFS,
  CHARACTER_PARTS,
  charLayerKey,
  IMAGE_ASSETS,
  SPRITESHEET_ASSETS,
} from '../data/assetKeys.js';
import { GAME, getUiScale, SCENE_KEYS, UI } from '../data/gameConfig.js';
import { AudioManager } from '../systems/AudioManager.js';
import { pixelTextStyle } from '../systems/FontLoader.js';

/**
 * PreloadScene: loads all verified images, spritesheets, and audio from `src/data/assetKeys.js`
 * with a visual progress bar, then creates shared animations and transitions to MenuScene.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload() {
    this.cameras.main.setBackgroundColor(GAME.BG_COLOR);
    this._failedAssets = [];

    const w = this.scale.width || GAME.WIDTH;
    const h = this.scale.height || GAME.HEIGHT;
    const s = getUiScale(w, h);
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);
    const barW = Math.min(w - 40 * s, 240 * s);
    const barH = 16 * s;
    const pad = 6 * s;

    // Frame & progress bar
    const panel = this.add.graphics();
    panel.fillStyle(UI.PANEL_BG, 1);
    panel.fillRoundedRect(
      cx - barW / 2 - pad,
      cy - barH / 2 - pad,
      barW + pad * 2,
      barH + pad * 2,
      4 * s
    );
    panel.lineStyle(2 * s, UI.PANEL_BORDER, 1);
    panel.strokeRoundedRect(
      cx - barW / 2 - pad,
      cy - barH / 2 - pad,
      barW + pad * 2,
      barH + pad * 2,
      4 * s
    );

    const fill = this.add.graphics();

    const titleTxt = this.add
      .text(cx, cy - 42 * s, 'EVERROOT', pixelTextStyle(UI.FONT_LARGE * s, '#f2c14e'))
      .setOrigin(0.5);

    const subTxt = this.add
      .text(
        cx,
        cy - 24 * s,
        GAME.SUBTITLE,
        pixelTextStyle(Math.max(11, 6.5 * s), '#d9c4a9')
      )
      .setOrigin(0.5);

    const statusTxt = this.add
      .text(
        cx,
        cy + 22 * s,
        'Memuat aset... 0%',
        pixelTextStyle(Math.max(12, UI.FONT_SMALL * s), '#fff6e0')
      )
      .setOrigin(0.5);

    const errorTxt = this.add
      .text(
        cx,
        cy + 40 * s,
        '',
        pixelTextStyle(Math.max(11, 6 * s), '#ff9b85')
      )
      .setOrigin(0.5)
      .setVisible(false);

    this.load.on('progress', (value) => {
      const pct = Math.round(value * 100);
      const fillW = Math.max(2 * s, Math.floor(barW * value));
      fill.clear();
      fill.fillStyle(0x4e7a3e, 1);
      fill.fillRect(cx - barW / 2, cy - barH / 2, fillW, barH);
      fill.fillStyle(0x7ef27e, 0.45);
      fill.fillRect(cx - barW / 2, cy - barH / 2, fillW, Math.max(2, Math.floor(barH * 0.35)));
      statusTxt.setText(`Memuat aset... ${pct}%`);
    });

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file) => {
      const key = file?.key || 'unknown';
      const src = file?.src || '';
      this._failedAssets.push({ key, src, type: file?.type });
      console.warn(`[Everroot] Gagal memuat aset: ${key} (${src})`);
      errorTxt.setText(
        `Peringatan: Gagal memuat aset "${key}" — memakai fallback aman.`
      );
      errorTxt.setVisible(true);
    });

    this.load.on('complete', () => {
      panel.destroy();
      fill.destroy();
      titleTxt.destroy();
      subTxt.destroy();
      statusTxt.destroy();
      errorTxt.destroy();
    });

    // Queue all static images
    for (const img of IMAGE_ASSETS) {
      this.load.image(img.key, `${ASSET_BASE_PATH}${img.path}`);
    }

    // Queue all spritesheets
    for (const sheet of SPRITESHEET_ASSETS) {
      this.load.spritesheet(sheet.key, `${ASSET_BASE_PATH}${sheet.path}`, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }

    // Queue all audio files
    for (const aud of AUDIO_ASSETS) {
      this.load.audio(aud.key, `${ASSET_BASE_PATH}${aud.path}`);
    }
  }

  create() {
    this._ensureFallbackTexturesForFailedAssets();
    AudioManager.init(this);
    this._createGlobalAnimations();

    this.scene.start(SCENE_KEYS.MENU, {
      failedAssetCount: this._failedAssets ? this._failedAssets.length : 0,
    });
  }

  _ensureFallbackTexturesForFailedAssets() {
    if (!this._failedAssets || this._failedAssets.length === 0) return;
    for (const item of this._failedAssets) {
      if (!item.key || this.textures.exists(item.key)) continue;
      try {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x563925, 1);
        g.fillRect(0, 0, 16, 16);
        g.lineStyle(1, 0xf2c14e, 1);
        g.strokeRect(0, 0, 16, 16);
        g.generateTexture(item.key, 16, 16);
        g.destroy();
      } catch {
        // Ignore fallback generation errors
      }
    }
  }

  _createGlobalAnimations() {
    const ensureAnim = (key, texKey, framesCount, frameRate, repeat = -1) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texKey, {
          start: 0,
          end: framesCount - 1,
        }),
        frameRate,
        repeat,
      });
    };

    // 1. Human character layered animations (9 actions x 3 layers)
    for (const def of CHARACTER_ANIM_DEFS) {
      for (const part of CHARACTER_PARTS) {
        const texKey = charLayerKey(def.action, part);
        ensureAnim(`${texKey}_anim`, texKey, def.frames, def.fps, def.repeat);
      }
    }

    // 2. Nature, Props & Effects animations
    ensureAnim(`${ASSET_KEYS.TREE_ROUND}_anim`, ASSET_KEYS.TREE_ROUND, 4, 4, -1);
    ensureAnim(`${ASSET_KEYS.TREE_PINE}_anim`, ASSET_KEYS.TREE_PINE, 4, 4, -1);
    ensureAnim(`${ASSET_KEYS.MUSHROOM_BLUE}_anim`, ASSET_KEYS.MUSHROOM_BLUE, 4, 5, -1);
    ensureAnim(`${ASSET_KEYS.MUSHROOM_RED}_anim`, ASSET_KEYS.MUSHROOM_RED, 4, 5, -1);
    ensureAnim(`${ASSET_KEYS.WINDMILL}_anim`, ASSET_KEYS.WINDMILL, 9, 8, -1);
    ensureAnim(`${ASSET_KEYS.CHIMNEY_SMOKE}_anim`, ASSET_KEYS.CHIMNEY_SMOKE, 30, 12, -1);
    ensureAnim(`${ASSET_KEYS.FX_GLINT}_anim`, ASSET_KEYS.FX_GLINT, 6, 6, -1);
    ensureAnim(`${ASSET_KEYS.FX_DUST_WALK}_anim`, ASSET_KEYS.FX_DUST_WALK, 8, 18, 0);

    // 3. Ambient village animals (4-frame walk animations)
    ensureAnim(`${ASSET_KEYS.ANIMAL_CHICKEN}_walk`, ASSET_KEYS.ANIMAL_CHICKEN, 4, 6, -1);
    ensureAnim(`${ASSET_KEYS.ANIMAL_COW}_walk`, ASSET_KEYS.ANIMAL_COW, 4, 5, -1);
    ensureAnim(`${ASSET_KEYS.ANIMAL_PIG}_walk`, ASSET_KEYS.ANIMAL_PIG, 4, 5, -1);
    ensureAnim(`${ASSET_KEYS.ANIMAL_SHEEP}_walk`, ASSET_KEYS.ANIMAL_SHEEP, 4, 5, -1);
    ensureAnim(`${ASSET_KEYS.ANIMAL_DUCK}_walk`, ASSET_KEYS.ANIMAL_DUCK, 4, 6, -1);
    ensureAnim(`${ASSET_KEYS.ANIMAL_BIRD}_walk`, ASSET_KEYS.ANIMAL_BIRD, 4, 8, -1);
  }
}
