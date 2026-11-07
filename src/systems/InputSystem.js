import Phaser from 'phaser';
import { INPUT } from '../data/gameConfig.js';
import { eventBus, EVENTS } from './EventBus.js';

/**
 * Unified InputSystem combining:
 * - Keyboard: WASD + Arrow keys for 8-direction movement, Space/E for Action, Q for Cycle Tool,
 *   R/Tab for Cycle Seed, 1..4 for direct tool selection.
 * - Touch: Custom on-screen Virtual Joystick + Action button + Cycle Tool button (via TouchControls).
 *
 * Reuses a pre-allocated vector object (`this.moveVector`) to avoid per-frame GC pressure on mobile.
 */
export class InputSystem {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;

    // Pre-allocated movement vector mutated in-place each frame
    this.moveVector = { x: 0, y: 0 };
    this.touchVector = { x: 0, y: 0 };

    // Detect touch-capable device automatically (Termux/Android browser)
    this.isTouchDevice = Boolean(
      scene.sys.game.device.input.touch ||
        (typeof window !== 'undefined' &&
          ('ontouchstart' in window || navigator.maxTouchPoints > 0))
    );

    // Ensure extra pointers are registered for simultaneous thumb joystick + button tap
    scene.input.addPointer(INPUT.EXTRA_POINTERS);

    this._setupKeyboard();
    this._setupTouchDetection();
  }

  _setupKeyboard() {
    const kb = this.scene.input.keyboard;
    if (!kb) return;

    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      Q: Phaser.Input.Keyboard.KeyCodes.Q,
      R: Phaser.Input.Keyboard.KeyCodes.R,
      ONE: Phaser.Input.Keyboard.KeyCodes.ONE,
      TWO: Phaser.Input.Keyboard.KeyCodes.TWO,
      THREE: Phaser.Input.Keyboard.KeyCodes.THREE,
      FOUR: Phaser.Input.Keyboard.KeyCodes.FOUR,
    });

    this._onKeyDownE = () => {
      if (this.enabled) eventBus.emit(EVENTS.INPUT_ACTION);
    };
    this._onKeyDownSpace = () => {
      if (this.enabled) eventBus.emit(EVENTS.INPUT_ACTION);
    };
    this._onKeyDownQ = () => {
      if (this.enabled) eventBus.emit(EVENTS.INPUT_CYCLE_TOOL);
    };
    this._onKeyDownR = () => {
      if (this.enabled) eventBus.emit(EVENTS.INPUT_CYCLE_SEED);
    };
    this._onKeyDown1 = () => {
      if (this.enabled) eventBus.emit(EVENTS.INPUT_SELECT_TOOL, 0);
    };
    this._onKeyDown2 = () => {
      if (this.enabled) eventBus.emit(EVENTS.INPUT_SELECT_TOOL, 1);
    };
    this._onKeyDown3 = () => {
      if (this.enabled) eventBus.emit(EVENTS.INPUT_SELECT_TOOL, 2);
    };
    this._onKeyDown4 = () => {
      if (this.enabled) eventBus.emit(EVENTS.INPUT_SELECT_TOOL, 3);
    };

    this.keys.E.on('down', this._onKeyDownE);
    this.keys.SPACE.on('down', this._onKeyDownSpace);
    this.keys.Q.on('down', this._onKeyDownQ);
    this.keys.R.on('down', this._onKeyDownR);
    this.keys.ONE.on('down', this._onKeyDown1);
    this.keys.TWO.on('down', this._onKeyDown2);
    this.keys.THREE.on('down', this._onKeyDown3);
    this.keys.FOUR.on('down', this._onKeyDown4);
  }

  _setupTouchDetection() {
    this._onPointerDown = (pointer) => {
      if (pointer.wasTouch && !this.isTouchDevice) {
        this.isTouchDevice = true;
        eventBus.emit(EVENTS.TOUCH_DETECTED, true);
      }
    };
    this.scene.input.on('pointerdown', this._onPointerDown);
  }

  /**
   * Called by TouchControls to feed normalized virtual joystick axes (-1..1).
   */
  setTouchVector(vx, vy) {
    this.touchVector.x = vx;
    this.touchVector.y = vy;
  }

  /**
   * Returns normalized `{ x, y }` movement vector for the current frame without allocating objects.
   */
  getMovementVector() {
    if (!this.enabled) {
      this.moveVector.x = 0;
      this.moveVector.y = 0;
      return this.moveVector;
    }

    let kx = 0;
    let ky = 0;

    if (this.cursors && this.keys) {
      const left = this.cursors.left.isDown || this.keys.A.isDown;
      const right = this.cursors.right.isDown || this.keys.D.isDown;
      const up = this.cursors.up.isDown || this.keys.W.isDown;
      const down = this.cursors.down.isDown || this.keys.S.isDown;

      if (left) kx -= 1;
      if (right) kx += 1;
      if (up) ky -= 1;
      if (down) ky += 1;
    }

    if (kx !== 0 || ky !== 0) {
      if (kx !== 0 && ky !== 0) {
        kx *= Math.SQRT1_2;
        ky *= Math.SQRT1_2;
      }
      this.moveVector.x = kx;
      this.moveVector.y = ky;
      return this.moveVector;
    }

    // Fall back to virtual touch joystick vector
    this.moveVector.x = this.touchVector.x;
    this.moveVector.y = this.touchVector.y;
    return this.moveVector;
  }

  destroy() {
    if (this.scene && this.scene.input) {
      this.scene.input.off('pointerdown', this._onPointerDown);
    }
    if (this.keys) {
      this.keys.E.off('down', this._onKeyDownE);
      this.keys.SPACE.off('down', this._onKeyDownSpace);
      this.keys.Q.off('down', this._onKeyDownQ);
      this.keys.R.off('down', this._onKeyDownR);
      this.keys.ONE.off('down', this._onKeyDown1);
      this.keys.TWO.off('down', this._onKeyDown2);
      this.keys.THREE.off('down', this._onKeyDown3);
      this.keys.FOUR.off('down', this._onKeyDown4);
    }
  }
}
