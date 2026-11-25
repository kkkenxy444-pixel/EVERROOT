import { ASSET_KEYS } from '../data/assetKeys.js';
import { DIALOGUE, UI } from '../data/gameConfig.js';
import { AudioManager } from '../systems/AudioManager.js';
import { eventBus, EVENTS } from '../systems/EventBus.js';
import { pixelTextStyle } from '../systems/FontLoader.js';
import { drawWoodPanel, UI_STYLE, WoodLabelPanel } from './UIStyle.js';

/**
 * Kotak dialog NPC di UIScene (native resolution, di atas toolbar tetapi tidak
 * menutup joystick/tombol AKSI-ALAT-BIBIT). Teks muncul bertahap; ketuk kotak
 * atau AKSI untuk menyelesaikan animasi lalu lanjut/tutup.
 */
export class DialogueBox {
  constructor(uiScene) {
    this.scene = uiScene;
    this.isOpen = false;
    this._text = '';
    this._charIndex = 0;
    this._typing = false;
    this._typeTimer = null;
    this._openedAt = 0;
    this._blipChars = 0;
    this._lastBlipAt = 0;
    this._npcName = '';

    const s = uiScene.uiScale || 1;
    this.container = uiScene.add.container(0, 0).setDepth(300).setVisible(false);

    this.bg = uiScene.add.graphics();
    this.namePanel = new WoodLabelPanel(uiScene, {
      originX: 0,
      originY: 1,
      scale: s,
      fontPx: this._fontPx(UI.FONT.DIALOGUE_NAME, UI.FONT.MIN_DIALOGUE_NAME_PX),
      minFontPx: 18,
      color: UI_STYLE.TEXT_GOLD,
      padX: 8 * s,
      padY: 3 * s,
      radius: 5 * s,
      borderWidth: 1.6 * s,
      fadeInMs: 0,
      fadeOutMs: 0,
    });
    this.bodyText = uiScene.add
      .text(0, 0, '', this._bodyStyle(s))
      .setOrigin(0, 0);
    this.continueText = uiScene.add
      .text(0, 0, 'AKSI / KETUK >', this._continueStyle(s))
      .setOrigin(1, 1);

    this.tapZone = uiScene.add
      .zone(0, 0, 10, 10)
      .setOrigin(0.5)
      .setInteractive();
    this.tapZone.on('pointerdown', (pointer, lx, ly, event) => {
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      this._advance();
    });

    this.container.add([
      this.bg,
      this.namePanel.container,
      this.bodyText,
      this.continueText,
      this.tapZone,
    ]);

    this._onStarted = (payload) => this._open(payload);
    this._onLine = (payload) => this._startLine(payload?.text || '');
    this._onEnded = () => this._close();
    this._onAction = () => {
      if (!this.isOpen) return;
      // Abaikan AKSI yang sama dengan tombol pembuka dialog.
      const now = this._now();
      if (now - this._openedAt < 180) return;
      this._advance();
    };

    eventBus.on(EVENTS.DIALOGUE_STARTED, this._onStarted);
    eventBus.on(EVENTS.DIALOGUE_LINE, this._onLine);
    eventBus.on(EVENTS.DIALOGUE_ENDED, this._onEnded);
    eventBus.on(EVENTS.INPUT_ACTION, this._onAction);

    this.relayout(uiScene.viewWidth, uiScene.viewHeight);
  }

  _now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  _fontPx(base, minPx) {
    const s = this.scene.uiScale || 1;
    return Math.max(minPx || 26, Math.round(base * s));
  }

  _bodyStyle(s) {
    return pixelTextStyle(
      this._fontPx(UI.FONT.DIALOGUE_BODY, UI.FONT.MIN_DIALOGUE_BODY_PX),
      '#fff6e0',
      {
        stroke: '#120b07',
        strokeThickness: Math.max(2, Math.round(1.1 * s)),
        lineSpacing: 3 * s,
      }
    );
  }

  _continueStyle(s) {
    return pixelTextStyle(
      Math.max(
        UI.FONT.MIN_HUD_SMALL_PX || 22,
        Math.round((UI.FONT.HUD_SMALL || 12) * s)
      ),
      '#d9c4a9',
      { stroke: '#120b07', strokeThickness: Math.max(1, Math.round(s)) }
    );
  }

  _open(payload) {
    this.isOpen = true;
    this._npcName = payload?.name || '';
    this._openedAt = this._now();
    if (this.namePanel) {
      this.namePanel.setContent(this._npcName);
      this.namePanel.setVisible(Boolean(this._npcName), true);
    }
    this.container.setVisible(true);
    this.relayout(this.scene.viewWidth, this.scene.viewHeight);

    if (this.scene.hintPanel) this.scene.hintPanel.setVisible(false, true);
    if (this.scene.toastPanel) this.scene.toastPanel.setVisible(false, true);
  }

  _startLine(text) {
    if (!this.isOpen) return;
    this._text = String(text || '');
    this._charIndex = 0;
    this._typing = true;
    this._blipChars = 0;
    this._stopTimer();
    this.bodyText.setText('');
    this.continueText.setVisible(false);

    if (this._text.length === 0) {
      this._finishTyping();
      return;
    }

    this._typeTimer = this.scene.time.addEvent({
      delay: DIALOGUE.TYPEWRITER_MS_PER_CHAR,
      loop: true,
      callback: this._typeNext,
      callbackScope: this,
    });
    this._typeNext();
  }

  _typeNext() {
    if (!this.isOpen) return;
    if (this._charIndex < this._text.length) {
      this._charIndex += 1;
      this.bodyText.setText(this._text.slice(0, this._charIndex));

      this._blipChars += 1;
      if (this._blipChars >= DIALOGUE.BLIP_EVERY_CHARS) {
        this._blipChars = 0;
        const now = this._now();
        if (now - this._lastBlipAt >= DIALOGUE.BLIP_MIN_INTERVAL_MS) {
          this._lastBlipAt = now;
          AudioManager.playSfx(ASSET_KEYS.SFX_DIALOGUE_BLIP);
        }
      }
    }

    if (this._charIndex >= this._text.length) {
      this._finishTyping();
    }
  }

  _finishTyping() {
    this._stopTimer();
    this._typing = false;
    this.bodyText.setText(this._text);
    this.continueText.setVisible(true);
  }

  _advance() {
    if (!this.isOpen) return;
    if (this._typing) {
      this._finishTyping();
      return;
    }
    const system = this.scene.gameScene?.dialogueSystem;
    if (system && system.isActive) system.advance();
    else this._close();
  }

  _close() {
    this.isOpen = false;
    this._stopTimer();
    this._typing = false;
    this._text = '';
    this._charIndex = 0;
    this.container.setVisible(false);
    if (this.scene.hintPanel) {
      this.scene.hintPanel.setVisible(
        Boolean(this.scene._currentHint) &&
          !(this.scene.shopModal && this.scene.shopModal.isOpen)
      );
    }
  }

  _stopTimer() {
    if (this._typeTimer) {
      try {
        this._typeTimer.remove(false);
      } catch {
        // scene clock may already be shutting down
      }
      this._typeTimer = null;
    }
  }

  /**
   * Posisi kotak: bawah-tengah pada layar lebar (di atas toolbar), atau
   * dinaikkan di atas kontrol saat layar sempit/portrait agar tombol tetap jelas.
   */
  relayout(width, height) {
    const s = this.scene.uiScale || 1;
    const w = width || this.scene.viewWidth || 960;
    const h = height || this.scene.viewHeight || 540;
    const safeX = UI.SAFE_MARGIN_X * s;
    const safeY = UI.SAFE_MARGIN_Y * s;
    const toolbarH = this.scene.toolbarSlotH || 32 * s;

    const sideReserve = DIALOGUE.SIDE_RESERVED_UNITS * s;
    const available = w - 2 * (safeX + sideReserve);
    const minW = DIALOGUE.BOX_MIN_WIDTH_UNITS * s;
    const narrow = available < minW;

    const boxW = narrow
      ? Math.max(minW, w - 2 * safeX)
      : Math.min(available, DIALOGUE.BOX_MAX_WIDTH_UNITS * s);
    const boxH = DIALOGUE.BOX_HEIGHT_UNITS * s;

    const bottom = narrow
      ? h - safeY - DIALOGUE.NARROW_LIFT_UNITS * s
      : h - safeY - toolbarH - 8 * s;
    const cx = w / 2;
    const cy = bottom - boxH / 2;

    this.container.setPosition(cx, cy);
    this._drawPanel(boxW, boxH, s);

    const pad = DIALOGUE.BOX_PAD_UNITS * s;
    if (this.namePanel) {
      this.namePanel.setStyle({
        scale: s,
        fontPx: this._fontPx(UI.FONT.DIALOGUE_NAME, UI.FONT.MIN_DIALOGUE_NAME_PX),
        padX: 8 * s,
        padY: 3 * s,
        radius: 5 * s,
        borderWidth: 1.6 * s,
        strokeThickness: Math.max(2, Math.round(1.2 * s)),
      });
      this.namePanel.setMaxWidth(boxW - pad * 2);
      this.namePanel.setPosition(-boxW / 2 + pad, -boxH / 2 - 4 * s);
    }
    this.bodyText.setStyle(this._bodyStyle(s));
    this.bodyText.setPosition(-boxW / 2 + pad, -boxH / 2 + pad);
    this.bodyText.setWordWrapWidth(boxW - pad * 2, true);
    this.continueText.setStyle(this._continueStyle(s));
    this.continueText.setPosition(boxW / 2 - pad, boxH / 2 - 4 * s);
    this.tapZone.setPosition(0, 0);
    this.tapZone.setSize(boxW, boxH);
    if (this.tapZone.input) {
      this.tapZone.input.hitArea.setSize(boxW, boxH);
    }
  }

  _drawPanel(boxW, boxH, s) {
    const g = this.bg;
    const x = -boxW / 2;
    const y = -boxH / 2;
    drawWoodPanel(g, x, y, boxW, boxH, {
      scale: s,
      radius: 6 * s,
      borderWidth: 1.8 * s,
      fillAlpha: 0.96,
    });
    g.lineStyle(1 * s, UI.PANEL_INNER, 0.85);
    g.strokeRoundedRect(
      x + 3 * s,
      y + 3 * s,
      boxW - 6 * s,
      boxH - 6 * s,
      4 * s
    );
  }

  destroy() {
    eventBus.off(EVENTS.DIALOGUE_STARTED, this._onStarted);
    eventBus.off(EVENTS.DIALOGUE_LINE, this._onLine);
    eventBus.off(EVENTS.DIALOGUE_ENDED, this._onEnded);
    eventBus.off(EVENTS.INPUT_ACTION, this._onAction);
    this._stopTimer();
    try {
      if (this.namePanel) this.namePanel.destroy();
      if (this.container && this.container.scene) this.container.destroy();
    } catch {
      // DisplayList may already be destroyed
    }
    this.container = null;
    this.bg = null;
    this.namePanel = null;
    this.bodyText = null;
    this.continueText = null;
    this.tapZone = null;
    this.scene = null;
  }
}
