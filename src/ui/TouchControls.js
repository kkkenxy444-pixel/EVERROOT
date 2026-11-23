import Phaser from 'phaser';
import { GAME, getUiScale, INPUT, UI } from '../data/gameConfig.js';
import { eventBus, EVENTS } from '../systems/EventBus.js';
import { pixelTextStyle } from '../systems/FontLoader.js';

/**
 * Custom on-screen touch controls for mobile/Android browsers:
 * - Rendered at native physical screen resolution using integer `uiScale = getUiScale(height)`
 * - Left-bottom: Virtual thumb joystick (anchored relative to bottom-left + safe margin)
 * - Right-bottom:
 *   - Primary "AKSI" button (till / plant / water / harvest / cast / reel / interact)
 *   - Secondary "ALAT" button (cycles active tool)
 *   - Secondary "BIBIT" button (cycles active seed type)
 */
export class TouchControls {
  constructor(uiScene, setTouchVectorCallback) {
    this.scene = uiScene;
    this.setTouchVector = setTouchVectorCallback;

    this.activePointerId = null;
    this.viewWidth = uiScene.scale?.width || GAME.WIDTH;
    this.viewHeight = uiScene.scale?.height || GAME.HEIGHT;
    this.uiScale = getUiScale(this.viewWidth, this.viewHeight);
    this.maxRadius = INPUT.JOYSTICK_RADIUS * this.uiScale;
    this.homeX = (UI.SAFE_MARGIN_X + INPUT.JOYSTICK_MARGIN_LEFT) * this.uiScale;
    this.homeY =
      this.viewHeight -
      (UI.SAFE_MARGIN_Y + INPUT.JOYSTICK_MARGIN_BOTTOM) * this.uiScale;
    this.baseX = this.homeX;
    this.baseY = this.homeY;

    const isTouch = Boolean(
      uiScene.sys.game.device.input.touch ||
        (typeof window !== 'undefined' &&
          ('ontouchstart' in window || navigator.maxTouchPoints > 0))
    );

    this.container = uiScene.add.container(0, 0).setDepth(200);
    this._buildJoystick();
    this._buildActionButtons();
    this.relayout(this.viewWidth, this.viewHeight);

    this.setVisible(isTouch);

    this._onTouchDetected = () => this.setVisible(true);
    eventBus.on(EVENTS.TOUCH_DETECTED, this._onTouchDetected);

    this._onResize = (gameSize) => {
      const w = gameSize?.width || this.scene.scale?.width || GAME.WIDTH;
      const h = gameSize?.height || this.scene.scale?.height || GAME.HEIGHT;
      this.relayout(w, h);
    };
    if (this.scene.scale) {
      this.scene.scale.on(Phaser.Scale.Events.RESIZE, this._onResize);
    }

    this._bindPointers();
  }

  _buildJoystick() {
    this.joyBase = this.scene.add.graphics();
    this.joyKnob = this.scene.add.graphics();
    this.container.add([this.joyBase, this.joyKnob]);
    this._drawJoystickGraphics();
  }

  _drawJoystickGraphics() {
    const s = this.uiScale || 1;
    const r = INPUT.JOYSTICK_RADIUS * s;
    const kr = INPUT.JOYSTICK_KNOB_RADIUS * s;
    this.maxRadius = r;

    this.joyBase.clear();
    this.joyBase.fillStyle(0x2a1b12, 0.58);
    this.joyBase.fillCircle(0, 0, r);
    this.joyBase.lineStyle(2 * s, UI.PANEL_BORDER, 0.88);
    this.joyBase.strokeCircle(0, 0, r);
    // Direction ticks
    const tickIn = 3 * s;
    const tickLen = 8 * s;
    const tickHalf = 3 * s;
    this.joyBase.fillStyle(UI.PANEL_BORDER, 0.58);
    this.joyBase.fillTriangle(
      0,
      -r + tickIn,
      -tickHalf,
      -r + tickLen,
      tickHalf,
      -r + tickLen
    );
    this.joyBase.fillTriangle(
      0,
      r - tickIn,
      -tickHalf,
      r - tickLen,
      tickHalf,
      r - tickLen
    );
    this.joyBase.fillTriangle(
      -r + tickIn,
      0,
      -r + tickLen,
      -tickHalf,
      -r + tickLen,
      tickHalf
    );
    this.joyBase.fillTriangle(
      r - tickIn,
      0,
      r - tickLen,
      -tickHalf,
      r - tickLen,
      tickHalf
    );

    this.joyKnob.clear();
    this.joyKnob.fillStyle(0xf2c14e, 0.88);
    this.joyKnob.fillCircle(0, 0, kr);
    this.joyKnob.lineStyle(1.5 * s, 0x3b2618, 1);
    this.joyKnob.strokeCircle(0, 0, kr);
  }

  _buildActionButtons() {
    this.btnAction = this._createCircleButton(
      0,
      0,
      INPUT.BUTTON_RADIUS,
      0xc86432,
      'AKSI',
      () => eventBus.emit(EVENTS.INPUT_ACTION)
    );

    this.btnTool = this._createCircleButton(
      0,
      0,
      INPUT.BUTTON_SMALL_RADIUS,
      0x4e6e42,
      'ALAT',
      () => eventBus.emit(EVENTS.INPUT_CYCLE_TOOL)
    );

    this.btnSeed = this._createCircleButton(
      0,
      0,
      INPUT.BUTTON_SMALL_RADIUS,
      0x6b4c35,
      'BIBIT',
      () => eventBus.emit(EVENTS.INPUT_CYCLE_SEED)
    );

    this.container.add([
      this.btnAction.container,
      this.btnTool.container,
      this.btnSeed.container,
    ]);
  }

  /**
   * Repositions and rescales joystick (bottom-left) and action buttons (bottom-right)
   * using integer `uiScale` and safe-area margins whenever the viewport resizes/rotates.
   */
  relayout(width, height) {
    this.viewWidth = width || GAME.WIDTH;
    this.viewHeight = height || GAME.HEIGHT;
    const newScale = getUiScale(this.viewWidth, this.viewHeight);
    const scaleChanged = newScale !== this.uiScale;
    this.uiScale = newScale;

    if (scaleChanged) {
      this._drawJoystickGraphics();
      this.btnAction.rescale(this.uiScale);
      this.btnTool.rescale(this.uiScale);
      this.btnSeed.rescale(this.uiScale);
    }

    const s = this.uiScale;
    const safeX = UI.SAFE_MARGIN_X * s;
    const safeY = UI.SAFE_MARGIN_Y * s;

    this.homeX = safeX + INPUT.JOYSTICK_MARGIN_LEFT * s;
    this.homeY = this.viewHeight - safeY - INPUT.JOYSTICK_MARGIN_BOTTOM * s;

    if (this.activePointerId === null) {
      this.baseX = this.homeX;
      this.baseY = this.homeY;
      this.joyBase.setPosition(this.baseX, this.baseY);
      this.joyKnob.setPosition(this.baseX, this.baseY);
    }

    const actionX = this.viewWidth - safeX - INPUT.ACTION_OFFSET_X * s;
    const actionY = this.viewHeight - safeY - INPUT.ACTION_OFFSET_Y * s;
    const toolX = this.viewWidth - safeX - INPUT.TOOL_OFFSET_X * s;
    const toolY = this.viewHeight - safeY - INPUT.TOOL_OFFSET_Y * s;
    const seedX = this.viewWidth - safeX - INPUT.SEED_OFFSET_X * s;
    const seedY = this.viewHeight - safeY - INPUT.SEED_OFFSET_Y * s;

    this.btnAction.container.setPosition(actionX, actionY);
    this.btnTool.container.setPosition(toolX, toolY);
    this.btnSeed.container.setPosition(seedX, seedY);
  }

  _createCircleButton(x, y, baseRadius, fillColor, label, onPress) {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    let currentRadius = baseRadius * (this.uiScale || 1);

    const drawBg = (pressed) => {
      const s = this.uiScale || 1;
      currentRadius = baseRadius * s;
      bg.clear();
      bg.fillStyle(
        pressed ? 0xf2c14e : fillColor,
        pressed ? 0.96 : INPUT.BUTTON_ALPHA
      );
      bg.fillCircle(0, 0, currentRadius);
      bg.lineStyle(2 * s, pressed ? 0xffffff : UI.PANEL_BORDER, 0.95);
      bg.strokeCircle(0, 0, currentRadius);
    };
    drawBg(false);

    const s0 = this.uiScale || 1;
    const fontPx = Math.max(
      UI.FONT?.MIN_BUTTON_SM_PX || 26,
      Math.round((UI.FONT?.BUTTON_SM || 13) * s0)
    );
    const txt = this.scene.add
      .text(
        0,
        0,
        label,
        pixelTextStyle(fontPx, '#fff6e0', {
          stroke: '#120b07',
          strokeThickness: Math.max(2, Math.round(1.2 * s0)),
        })
      )
      .setOrigin(0.5);

    const hitDiameter =
      (baseRadius + INPUT.BUTTON_HIT_PADDING) * 2 * (this.uiScale || 1);
    const hitZone = this.scene.add
      .zone(0, 0, hitDiameter, hitDiameter)
      .setOrigin(0.5)
      .setInteractive();

    const rescale = (s) => {
      drawBg(false);
      txt.setFontSize(
        Math.max(
          UI.FONT?.MIN_BUTTON_SM_PX || 26,
          Math.round((UI.FONT?.BUTTON_SM || 13) * s)
        )
      );
      const d = (baseRadius + INPUT.BUTTON_HIT_PADDING) * 2 * s;
      hitZone.setSize(d, d);
    };

    hitZone.on('pointerdown', (pointer, localX, localY, event) => {
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      if (!this.container.visible) {
        this.setVisible(true);
      }
      drawBg(true);
      onPress();
    });

    hitZone.on('pointerup', () => drawBg(false));
    hitZone.on('pointerout', () => drawBg(false));

    c.add([bg, txt, hitZone]);
    return { container: c, drawBg, txt, rescale };
  }

  _bindPointers() {
    this._onPointerDown = (pointer) => {
      if (pointer.wasTouch && !this.container.visible) {
        this.setVisible(true);
      }
      // Let the open inventory drawer consume touches over its own area (scroll instead of move)
      if (this.scene?.isPointerOverStorageDrawer?.(pointer)) return;
      // Dialog aktif: jangan aktifkan joystick; tombol AKSI/ALAT/BIBIT tetap punya hit zone sendiri.
      if (this.scene?.dialogueBox?.isOpen) return;

      const w = this.viewWidth;
      const h = this.viewHeight;
      const s = this.uiScale || 1;
      const r = this.maxRadius || INPUT.JOYSTICK_RADIUS * s;
      const minTopY = INPUT.JOYSTICK_MIN_TOP_Y * s;

      // Left side of screen activates the thumb joystick if not already active
      if (
        this.activePointerId === null &&
        pointer.x < w * INPUT.JOYSTICK_ZONE_WIDTH_RATIO &&
        pointer.y > minTopY
      ) {
        this.activePointerId = pointer.id;
        this.baseX = Math.max(r + 10 * s, Math.min(w * 0.4, pointer.x));
        this.baseY = Math.max(
          minTopY + r,
          Math.min(h - r - 12 * s, pointer.y)
        );
        this.joyBase.setPosition(this.baseX, this.baseY);
        this.joyKnob.setPosition(this.baseX, this.baseY);
        this._updateJoystickFromPointer(pointer);
      }
    };

    this._onPointerMove = (pointer) => {
      if (pointer.id === this.activePointerId) {
        this._updateJoystickFromPointer(pointer);
      }
    };

    this._onPointerUp = (pointer) => {
      if (pointer.id === this.activePointerId) {
        this._resetJoystick();
      }
    };

    this.scene.input.on('pointerdown', this._onPointerDown);
    this.scene.input.on('pointermove', this._onPointerMove);
    this.scene.input.on('pointerup', this._onPointerUp);
    this.scene.input.on('pointerupoutside', this._onPointerUp);
  }

  _updateJoystickFromPointer(pointer) {
    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const dist = Math.hypot(dx, dy);
    const maxR = this.maxRadius || INPUT.JOYSTICK_RADIUS * (this.uiScale || 1);

    if (dist < 0.001) {
      this.joyKnob.setPosition(this.baseX, this.baseY);
      this.setTouchVector(0, 0);
      return;
    }

    const clampedDist = Math.min(dist, maxR);
    const nx = dx / dist;
    const ny = dy / dist;

    this.joyKnob.setPosition(
      this.baseX + nx * clampedDist,
      this.baseY + ny * clampedDist
    );

    const magnitude = clampedDist / maxR;
    if (magnitude < INPUT.JOYSTICK_DEADZONE) {
      this.setTouchVector(0, 0);
    } else {
      this.setTouchVector(nx, ny);
    }
  }

  _resetJoystick() {
    this.activePointerId = null;
    this.baseX = this.homeX;
    this.baseY = this.homeY;
    this.joyBase.setPosition(this.baseX, this.baseY);
    this.joyKnob.setPosition(this.baseX, this.baseY);
    this.setTouchVector(0, 0);
  }

  setVisible(visible) {
    this.container.setVisible(visible);
  }

  destroy() {
    eventBus.off(EVENTS.TOUCH_DETECTED, this._onTouchDetected);
    if (this.scene && this.scene.scale && this._onResize) {
      this.scene.scale.off(Phaser.Scale.Events.RESIZE, this._onResize);
    }
    if (this.scene && this.scene.input) {
      this.scene.input.off('pointerdown', this._onPointerDown);
      this.scene.input.off('pointermove', this._onPointerMove);
      this.scene.input.off('pointerup', this._onPointerUp);
      this.scene.input.off('pointerupoutside', this._onPointerUp);
    }
  }
}
