import { UI } from '../data/gameConfig.js';
import { pixelTextStyle } from '../systems/FontLoader.js';

/**
 * Shared cozy wood HUD style tokens & reusable UI components for Everroot.
 *
 * Palette is derived directly from `UI` in `gameConfig.js` (warm dark wood fill,
 * golden-tan border, dark outer rim, subtle top highlight, soft drop shadow,
 * cream/gold pixel text). We evaluated `ui_cozy_free.png` (UI_COZY_PANELS),
 * whose light beige coffee-shop clipboards clash with Everroot's dark-wood HUD,
 * so rounded wood panels drawn in the HUD palette are used consistently.
 *
 * Zero per-frame allocations: `WoodLabelPanel` is created once and redrawn only
 * when text/icon/scale changes; `FloatingTextPool` recycles a fixed container pool.
 */
export const UI_STYLE = Object.freeze({
  PANEL_FILL: UI.PANEL_BG,
  PANEL_BORDER: UI.PANEL_BORDER,
  PANEL_INNER: UI.PANEL_INNER,
  PANEL_OUTER_RIM: 0x22140b,
  PANEL_HIGHLIGHT: 0x825737,
  PANEL_SHADOW: 0x160d07,
  TEXT_CREAM: UI.TEXT_COLOR,
  TEXT_GOLD: '#ffd866',
  TEXT_GAIN: '#ffe9a8',
  TEXT_QUEST: '#ffe8a3',
  TEXT_STROKE: '#2b180c',
  FADE_IN_MS: 130,
  FADE_OUT_MS: 180,
});

/**
 * Paints a HUD-matched wooden rounded panel onto a Phaser Graphics object.
 */
export function drawWoodPanel(gfx, x, y, width, height, options = {}) {
  if (!gfx) return;
  const s = options.scale ?? 1;
  const r = Math.max(1.5, options.radius ?? 5 * s);
  const borderWidth = Math.max(1, options.borderWidth ?? 1.5 * s);
  const fillColor = options.fillColor ?? UI_STYLE.PANEL_FILL;
  const fillAlpha = options.fillAlpha ?? 0.96;
  const borderColor = options.borderColor ?? UI_STYLE.PANEL_BORDER;
  const shadowOffsetY = options.shadowOffsetY ?? Math.max(1, 1.8 * s);
  const rimPad = options.rimPad ?? Math.max(0.75, 0.9 * s);
  const showHighlight = options.showHighlight !== false;

  gfx.clear();

  // Soft drop shadow beneath the wood plaque
  if (shadowOffsetY > 0) {
    gfx.fillStyle(UI_STYLE.PANEL_SHADOW, 0.42);
    gfx.fillRoundedRect(
      x - rimPad * 0.5,
      y + shadowOffsetY,
      width + rimPad,
      height,
      r + rimPad * 0.5
    );
  }

  // Crisp dark outer rim so light borders stay legible over bright grass/water
  gfx.fillStyle(UI_STYLE.PANEL_OUTER_RIM, 0.95);
  gfx.fillRoundedRect(
    x - rimPad,
    y - rimPad,
    width + rimPad * 2,
    height + rimPad * 2,
    r + rimPad
  );

  // Main wood body
  gfx.fillStyle(fillColor, fillAlpha);
  gfx.fillRoundedRect(x, y, width, height, r);

  // Subtle top bevel highlight strip
  if (showHighlight && height >= 8 * s) {
    const hiPad = Math.max(1.5, 2.2 * s);
    const hiH = Math.max(1, Math.min(2.2 * s, height * 0.14));
    const hiW = Math.max(0, width - hiPad * 2);
    if (hiW > 2) {
      gfx.fillStyle(UI_STYLE.PANEL_HIGHLIGHT, 0.42);
      gfx.fillRoundedRect(x + hiPad, y + borderWidth * 0.8, hiW, hiH, hiH * 0.5);
    }
  }

  // Outer warm wood frame
  gfx.lineStyle(borderWidth, borderColor, 1);
  gfx.strokeRoundedRect(x, y, width, height, r);
}

/**
 * Returns crisp floating text style: no background, cream/yellow pixel text,
 * dark brown >= 3px outline, and soft drop shadow.
 */
export function floatingTextStyle(fontPx, color = UI_STYLE.TEXT_GAIN, scale = 1) {
  const s = Math.max(1, scale || 1);
  const strokeThickness = Math.max(3, Math.round(1.6 * s));
  return pixelTextStyle(fontPx, color, {
    stroke: UI_STYLE.TEXT_STROKE,
    strokeThickness,
    shadow: {
      offsetX: 0,
      offsetY: Math.max(2, Math.round(1.2 * s)),
      color: 'rgba(24, 13, 6, 0.72)',
      blur: Math.max(2, Math.round(1.5 * s)),
      fill: true,
      stroke: true,
    },
  });
}

/**
 * Reusable wood-styled text banner (with optional left icon, dynamic width,
 * maxWidth shrink-to-fit, and smooth fade in/out). Created once, never
 * allocated in update().
 */
export class WoodLabelPanel {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.scale = options.scale ?? 1;
    this.originX = options.originX ?? 0.5;
    this.originY = options.originY ?? 0.5;
    this.padX = options.padX ?? 8 * this.scale;
    this.padY = options.padY ?? 3.5 * this.scale;
    this.radius = options.radius ?? 5 * this.scale;
    this.borderWidth = options.borderWidth ?? 1.5 * this.scale;
    this.borderColor = options.borderColor ?? UI_STYLE.PANEL_BORDER;
    this.fillColor = options.fillColor ?? UI_STYLE.PANEL_FILL;
    this.fillAlpha = options.fillAlpha ?? 0.96;
    this.shadowOffsetY = options.shadowOffsetY ?? Math.max(1, 1.8 * this.scale);
    this.rimPad = options.rimPad ?? Math.max(0.75, 0.9 * this.scale);
    this.fontPx = options.fontPx ?? Math.max(22, Math.round(13 * this.scale));
    this.minFontPx = options.minFontPx ?? Math.max(8, Math.round(this.fontPx * 0.65));
    this.color = options.color ?? UI_STYLE.TEXT_CREAM;
    this.resolution = options.resolution;
    this.iconSize = options.iconSize ?? 13 * this.scale;
    this.iconGap = options.iconGap ?? 4.5 * this.scale;
    this.maxWidth = options.maxWidth ?? 0;
    this.fadeInMs = options.fadeInMs ?? UI_STYLE.FADE_IN_MS;
    this.fadeOutMs = options.fadeOutMs ?? UI_STYLE.FADE_OUT_MS;
    this.strokeThickness =
      options.strokeThickness ?? Math.max(2, Math.round(1.2 * this.scale));

    this._text = '';
    this._iconKey = null;
    this._iconTint = null;
    this._visible = false;
    this._width = 0;
    this._height = 0;
    this._dirty = true;
    this._destroyed = false;

    this.container = scene.add.container(options.x ?? 0, options.y ?? 0);
    if (options.depth !== undefined) this.container.setDepth(options.depth);
    if (options.scrollFactor !== undefined) {
      this.container.setScrollFactor(options.scrollFactor);
    }
    this.container.setVisible(false);
    this.container.setAlpha(0);

    this.bg = scene.add.graphics();
    this.icon = scene.add
      .image(0, 0, '__WHITE')
      .setOrigin(0.5)
      .setVisible(false);

    const styleExtra = {
      stroke: UI_STYLE.TEXT_STROKE,
      strokeThickness: this.strokeThickness,
      shadow: {
        offsetX: 0,
        offsetY: Math.max(1, Math.round(0.8 * this.scale)),
        color: 'rgba(20, 11, 5, 0.65)',
        blur: 0,
        fill: true,
        stroke: true,
      },
    };
    if (this.resolution) styleExtra.resolution = this.resolution;

    this.label = scene.add
      .text(0, 0, '', pixelTextStyle(this.fontPx, this.color, styleExtra))
      .setOrigin(0, 0.5);

    this.container.add([this.bg, this.icon, this.label]);

    if (options.initialText) {
      this.setContent(options.initialText, {
        iconKey: options.iconKey ?? null,
        iconTint: options.iconTint ?? null,
      });
    }
    if (options.visible) {
      this.setVisible(true, true);
    }
  }

  setPosition(x, y) {
    if (this.container) this.container.setPosition(x, y);
    return this;
  }

  setDepth(depth) {
    if (this.container) this.container.setDepth(depth);
    return this;
  }

  setMaxWidth(maxWidth) {
    const next = Math.max(0, Number(maxWidth) || 0);
    if (Math.abs(next - this.maxWidth) < 1) return this;
    this.maxWidth = next;
    if (this._text) {
      this._dirty = true;
      this._redraw();
    }
    return this;
  }

  setStyle(options = {}) {
    if (options.scale !== undefined) this.scale = options.scale;
    if (options.fontPx !== undefined) this.fontPx = options.fontPx;
    if (options.minFontPx !== undefined) this.minFontPx = options.minFontPx;
    if (options.padX !== undefined) this.padX = options.padX;
    if (options.padY !== undefined) this.padY = options.padY;
    if (options.radius !== undefined) this.radius = options.radius;
    if (options.borderWidth !== undefined) this.borderWidth = options.borderWidth;
    if (options.borderColor !== undefined) this.borderColor = options.borderColor;
    if (options.color !== undefined) this.color = options.color;
    if (options.iconSize !== undefined) this.iconSize = options.iconSize;
    if (options.iconGap !== undefined) this.iconGap = options.iconGap;
    if (options.strokeThickness !== undefined) {
      this.strokeThickness = options.strokeThickness;
    }
    if (this.label) {
      const styleExtra = {
        stroke: UI_STYLE.TEXT_STROKE,
        strokeThickness: this.strokeThickness,
      };
      if (this.resolution) styleExtra.resolution = this.resolution;
      this.label.setStyle(pixelTextStyle(this.fontPx, this.color, styleExtra));
    }
    this._dirty = true;
    if (this._text) this._redraw();
    return this;
  }

  setContent(text, options = {}) {
    if (this._destroyed || !this.label) return this;
    const nextText = String(text ?? '');
    const nextIcon = options.iconKey ?? null;
    const nextTint = options.iconTint ?? null;
    const nextColor = options.color ?? this.color;

    if (
      !this._dirty &&
      nextText === this._text &&
      nextIcon === this._iconKey &&
      nextTint === this._iconTint &&
      nextColor === this.color
    ) {
      return this;
    }

    this._text = nextText;
    this._iconKey = nextIcon;
    this._iconTint = nextTint;
    if (nextColor !== this.color) {
      this.color = nextColor;
      this.label.setColor(nextColor);
    }
    this._dirty = false;
    this._redraw();
    return this;
  }

  _redraw() {
    if (!this.label || !this.bg) return;
    if (!this._text) {
      this.label.setText('');
      if (this.icon) this.icon.setVisible(false);
      this.bg.clear();
      this._width = 0;
      this._height = 0;
      return;
    }

    const hasIcon =
      Boolean(this._iconKey) &&
      Boolean(this.scene?.textures?.exists?.(this._iconKey));
    let iconW = 0;
    let iconH = 0;

    if (hasIcon && this.icon) {
      this.icon.setTexture(this._iconKey);
      if (this._iconTint !== null && this._iconTint !== undefined) {
        this.icon.setTint(this._iconTint);
      } else {
        this.icon.clearTint();
      }
      const natW = this.icon.width || 16;
      const natH = this.icon.height || 16;
      const maxDim = Math.max(natW, natH) || 16;
      const sc = this.iconSize / maxDim;
      this.icon.setScale(sc);
      iconW = natW * sc;
      iconH = natH * sc;
      this.icon.setVisible(true);
    } else if (this.icon) {
      this.icon.setVisible(false);
    }

    this.label.setFontSize(this.fontPx);
    this.label.setText(this._text);

    const iconSlotW = hasIcon ? iconW + this.iconGap : 0;
    if (this.maxWidth > 0) {
      const availTextW = this.maxWidth - this.padX * 2 - iconSlotW;
      if (availTextW > 12 && this.label.width > availTextW) {
        const shrunk = Math.max(
          this.minFontPx,
          Math.floor((this.fontPx * availTextW) / this.label.width)
        );
        this.label.setFontSize(shrunk);
      }
    }

    const textW = this.label.width;
    const textH = this.label.height;
    const contentW = iconSlotW + textW;
    const contentH = Math.max(textH, iconH);

    const panelW = Math.ceil(contentW + this.padX * 2);
    const panelH = Math.ceil(contentH + this.padY * 2);
    this._width = panelW;
    this._height = panelH;

    const left = -panelW * this.originX;
    const top = -panelH * this.originY;
    const centerY = top + panelH / 2;

    drawWoodPanel(this.bg, left, top, panelW, panelH, {
      scale: this.scale,
      radius: this.radius,
      borderWidth: this.borderWidth,
      borderColor: this.borderColor,
      fillColor: this.fillColor,
      fillAlpha: this.fillAlpha,
      shadowOffsetY: this.shadowOffsetY,
      rimPad: this.rimPad,
    });

    const contentLeft = left + this.padX;
    if (hasIcon && this.icon) {
      this.icon.setPosition(contentLeft + iconW / 2, centerY);
      this.label.setPosition(contentLeft + iconW + this.iconGap, centerY);
    } else {
      this.label.setPosition(contentLeft, centerY);
    }
  }

  getSize() {
    return { width: this._width, height: this._height };
  }

  show(fadeMs = this.fadeInMs) {
    return this.setVisible(true, fadeMs <= 0, fadeMs);
  }

  hide(fadeMs = this.fadeOutMs) {
    return this.setVisible(false, fadeMs <= 0, fadeMs);
  }

  setVisible(visible, immediate = false, customFadeMs = null) {
    if (this._destroyed || !this.container) return this;
    const want = Boolean(visible) && Boolean(this._text);
    const tweens = this.scene?.tweens;

    if (want) {
      if (this._visible && this.container.visible && this.container.alpha >= 0.99) {
        return this;
      }
      this._visible = true;
      if (tweens) tweens.killTweensOf(this.container);
      this.container.setVisible(true);
      const dur = immediate ? 0 : (customFadeMs ?? this.fadeInMs);
      if (dur > 0 && tweens) {
        if (this.container.alpha >= 0.99) this.container.setAlpha(0);
        tweens.add({
          targets: this.container,
          alpha: 1,
          duration: dur,
          ease: 'Quad.easeOut',
        });
      } else {
        this.container.setAlpha(1);
      }
      return this;
    }

    if (!this._visible && !this.container.visible) {
      return this;
    }
    this._visible = false;
    if (tweens) tweens.killTweensOf(this.container);
    const dur = immediate ? 0 : (customFadeMs ?? this.fadeOutMs);
    if (dur > 0 && tweens && this.container.visible) {
      tweens.add({
        targets: this.container,
        alpha: 0,
        duration: dur,
        ease: 'Quad.easeIn',
        onComplete: () => {
          if (!this._destroyed && !this._visible && this.container) {
            this.container.setVisible(false);
          }
        },
      });
    } else {
      this.container.setAlpha(0);
      this.container.setVisible(false);
    }
    return this;
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    try {
      if (this.scene?.tweens && this.container) {
        this.scene.tweens.killTweensOf(this.container);
      }
      if (this.container && this.container.scene) {
        this.container.destroy(true);
      }
    } catch {
      // DisplayList may already be shutting down
    }
    this.container = null;
    this.bg = null;
    this.icon = null;
    this.label = null;
    this.scene = null;
  }
}

/**
 * Fixed-size pool of background-less floating gain/notification texts with
 * optional item icon (+ optional seed badge), dark brown 3px outline, soft
 * shadow, slow rise, and gentle fade-out. Zero allocations during gameplay.
 */
export class FloatingTextPool {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.uiScale = options.uiScale || 1;
    this.depth = options.depth ?? 420;
    this.poolSize = options.poolSize ?? 8;
    this.entries = [];
    this._seq = 0;
    this._destroyed = false;

    const s = this.uiScale;
    const F = UI.FONT || {};
    const fontPx = Math.max(
      F.MIN_FLOATING_PX || 26,
      Math.round((F.FLOATING || 14) * s)
    );
    this.fontPx = fontPx;
    this.iconSize = 13 * s;
    this.iconGap = 4.5 * s;

    for (let i = 0; i < this.poolSize; i += 1) {
      const container = scene.add
        .container(0, 0)
        .setDepth(this.depth)
        .setVisible(false);

      const icon = scene.add
        .image(0, 0, '__WHITE')
        .setOrigin(0.5)
        .setVisible(false);

      const badge = scene.add
        .image(0, 0, '__WHITE')
        .setOrigin(0.5)
        .setVisible(false);

      const text = scene.add
        .text(0, 0, '', floatingTextStyle(fontPx, UI_STYLE.TEXT_GAIN, s))
        .setOrigin(0, 0.5);

      container.add([icon, badge, text]);
      this.entries.push({
        container,
        icon,
        badge,
        text,
        active: false,
        seq: 0,
        startX: 0,
        startY: 0,
      });
    }
  }

  spawn(x, y, message, options = {}) {
    if (this._destroyed || !this.scene || this.entries.length === 0) return;
    const labelStr = String(message || '').trim();
    if (!labelStr) return;

    const s = this.uiScale;
    const color = options.color || UI_STYLE.TEXT_GAIN;
    const iconKey = options.iconKey || null;
    const iconTint = options.iconTint ?? null;
    const badgeKey = options.badgeKey || null;
    const risePx = options.risePx ?? 24 * s;
    const durationMs = options.durationMs ?? 1100;

    // Pick first inactive slot, or recycle oldest active slot (never allocate)
    let entry = null;
    let oldest = this.entries[0];
    for (let i = 0; i < this.entries.length; i += 1) {
      const e = this.entries[i];
      if (!e.active) {
        entry = e;
        break;
      }
      if (e.seq < oldest.seq) oldest = e;
    }
    if (!entry) {
      entry = oldest;
      if (this.scene.tweens) this.scene.tweens.killTweensOf(entry.container);
    }

    // Slight vertical stagger if another active floater started near the same spot
    let spawnY = y;
    const minGapY = 16 * s;
    for (let i = 0; i < this.entries.length; i += 1) {
      const other = this.entries[i];
      if (!other.active || other === entry) continue;
      if (
        Math.abs(other.container.x - x) < 70 * s &&
        Math.abs(other.container.y - spawnY) < minGapY
      ) {
        spawnY += minGapY;
      }
    }

    const hasIcon =
      Boolean(iconKey) && Boolean(this.scene.textures?.exists?.(iconKey));
    let iconW = 0;

    if (hasIcon) {
      entry.icon.setTexture(iconKey);
      if (iconTint !== null && iconTint !== undefined) {
        entry.icon.setTint(iconTint);
      } else {
        entry.icon.clearTint();
      }
      const natW = entry.icon.width || 16;
      const natH = entry.icon.height || 16;
      const sc = this.iconSize / (Math.max(natW, natH) || 16);
      entry.icon.setScale(sc);
      iconW = natW * sc;
      entry.icon.setVisible(true);
    } else {
      entry.icon.setVisible(false);
    }

    const hasBadge =
      hasIcon &&
      Boolean(badgeKey) &&
      Boolean(this.scene.textures?.exists?.(badgeKey));
    if (hasBadge) {
      entry.badge.setTexture(badgeKey);
      const bNat = Math.max(entry.badge.width || 16, entry.badge.height || 16);
      entry.badge.setScale((this.iconSize * 0.62) / (bNat || 16));
      entry.badge.setVisible(true);
    } else {
      entry.badge.setVisible(false);
    }

    entry.text.setColor(color);
    entry.text.setText(labelStr);

    const textW = entry.text.width;
    const totalW = (hasIcon ? iconW + this.iconGap : 0) + textW;
    const startLeft = -totalW / 2;

    if (hasIcon) {
      const iconCx = startLeft + iconW / 2;
      entry.icon.setPosition(iconCx, 0);
      if (hasBadge) {
        entry.badge.setPosition(
          iconCx + iconW * 0.34,
          -this.iconSize * 0.28
        );
      }
      entry.text.setPosition(startLeft + iconW + this.iconGap, 0);
    } else {
      entry.text.setPosition(startLeft, 0);
    }

    // Clamp horizontally within viewport margins so long item names never clip
    const viewW = this.scene.viewWidth || this.scene.scale?.width || 960;
    const marginX = UI.SAFE_MARGIN_X * s + totalW / 2 + 4 * s;
    const clampedX =
      viewW > marginX * 2
        ? Math.max(marginX, Math.min(viewW - marginX, x))
        : viewW / 2;

    entry.active = true;
    entry.seq = ++this._seq;
    entry.startX = clampedX;
    entry.startY = spawnY;
    entry.container.setPosition(Math.round(clampedX), Math.round(spawnY));
    entry.container.setAlpha(1);
    entry.container.setVisible(true);

    if (this.scene.tweens) {
      this.scene.tweens.killTweensOf(entry.container);
      this.scene.tweens.add({
        targets: entry.container,
        y: {
          value: Math.round(spawnY - risePx),
          duration: durationMs,
          ease: 'Cubic.easeOut',
        },
        alpha: {
          value: 0,
          duration: Math.round(durationMs * 0.62),
          delay: Math.round(durationMs * 0.38),
          ease: 'Quad.easeIn',
        },
        onComplete: () => {
          entry.active = false;
          if (!this._destroyed && entry.container) {
            entry.container.setVisible(false);
          }
        },
      });
    }
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    for (let i = 0; i < this.entries.length; i += 1) {
      const entry = this.entries[i];
      try {
        if (this.scene?.tweens && entry.container) {
          this.scene.tweens.killTweensOf(entry.container);
        }
        if (entry.container && entry.container.scene) {
          entry.container.destroy(true);
        }
      } catch {
        // Scene may already be shutting down
      }
    }
    this.entries.length = 0;
    this.scene = null;
  }
}
