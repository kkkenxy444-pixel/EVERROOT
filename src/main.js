import Phaser from 'phaser';
import { GAME, getPhysicalCanvasSize } from './data/gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { UIScene } from './scenes/UIScene.js';

/**
 * Always-on pure-DOM global error overlay (independent of Phaser and active even without ?debug=1).
 * Captures `window` `error` and `unhandledrejection`, logs to console, and displays the error
 * message + first stack frame in a compact red box at the top of the screen (tap to dismiss).
 */
function installGlobalErrorOverlay() {
  if (typeof window === 'undefined' || window._everrootErrorOverlayInstalled) {
    return;
  }
  window._everrootErrorOverlayInstalled = true;

  let boxEl = null;

  const ensureBox = () => {
    if (boxEl && boxEl.parentNode) return boxEl;
    if (typeof document === 'undefined' || !document.body) return null;

    boxEl = document.createElement('div');
    boxEl.id = 'everroot-error-overlay';
    boxEl.style.cssText = [
      'position:fixed',
      'top:8px',
      'left:8px',
      'right:8px',
      'max-width:680px',
      'margin:0 auto',
      'z-index:2147483647',
      'background:rgba(122,20,20,0.96)',
      'color:#fff6e0',
      'border:2px solid #ff9b85',
      'border-radius:6px',
      'padding:8px 12px',
      'font-family:monospace',
      'font-size:13px',
      'line-height:1.35',
      'box-shadow:0 4px 16px rgba(0,0,0,0.75)',
      'word-break:break-word',
      'pointer-events:auto',
      'cursor:pointer',
      'display:none',
    ].join(';');

    const dismiss = (ev) => {
      if (ev && typeof ev.stopPropagation === 'function') {
        ev.stopPropagation();
      }
      boxEl.style.display = 'none';
    };
    boxEl.addEventListener('click', dismiss);
    boxEl.addEventListener('touchstart', dismiss, { passive: true });
    document.body.appendChild(boxEl);
    return boxEl;
  };

  const formatError = (errObj, fallbackMsg, file, line, col) => {
    const msg =
      errObj?.message ||
      (typeof fallbackMsg === 'string' ? fallbackMsg : String(errObj || 'Unknown error'));
    let firstStack = '';
    if (errObj && typeof errObj.stack === 'string') {
      const lines = errObj.stack
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const frame = lines.find((l) => l.startsWith('at ') || l.includes('.js') || l.includes('http'));
      firstStack = frame || lines[1] || lines[0] || '';
    }
    if (!firstStack && file) {
      firstStack = `${file}:${line || 0}:${col || 0}`;
    }
    return { msg, firstStack };
  };

  const showOverlay = (title, msg, firstStack) => {
    const el = ensureBox();
    if (!el) return;
    el.textContent = '';

    const header = document.createElement('div');
    header.style.cssText = 'font-weight:bold;color:#ffd866;margin-bottom:3px;';
    header.textContent = `${title} (Tap kotak ini untuk tutup)`;
    el.appendChild(header);

    const body = document.createElement('div');
    body.textContent = msg;
    el.appendChild(body);

    if (firstStack) {
      const stackEl = document.createElement('div');
      stackEl.style.cssText = 'color:#ffcdc2;font-size:12px;margin-top:3px;';
      stackEl.textContent = firstStack;
      el.appendChild(stackEl);
    }

    el.style.display = 'block';
  };

  window.addEventListener('error', (event) => {
    const err = event?.error;
    console.error('[Everroot Global Error]', err || event?.message || event);
    const { msg, firstStack } = formatError(
      err,
      event?.message,
      event?.filename,
      event?.lineno,
      event?.colno
    );
    showOverlay('ERROR', msg, firstStack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    console.error('[Everroot Unhandled Rejection]', reason);
    const { msg, firstStack } = formatError(reason, String(reason || 'Promise rejected'));
    showOverlay('UNHANDLED REJECTION', msg, firstStack);
  });
}

installGlobalErrorOverlay();

/**
 * Installs a DPR-aware `getParentBounds` on Phaser's ScaleManager so `Scale.RESIZE`
 * sizes the canvas backing buffer to physical screen pixels (innerWidth/innerHeight * dpr,
 * capped at GAME.MAX_DPR and 1920x1080) while CSS (`#game canvas { width: 100%; height: 100% }`)
 * fills the viewport without black bars and `displayScale` maps touch coordinates accurately.
 */
function installPhysicalScaleBounds(scaleManager) {
  if (!scaleManager || scaleManager._physicalBoundsInstalled) return;
  scaleManager._physicalBoundsInstalled = true;

  scaleManager.getParentBounds = function getPhysicalParentBounds() {
    if (!this.parent) return false;

    const parentSize = this.parentSize;
    const rect = this.parent.getBoundingClientRect();
    const cssW =
      rect.width > 0
        ? rect.width
        : typeof window !== 'undefined'
          ? window.innerWidth
          : GAME.WIDTH;
    const cssH =
      rect.height > 0
        ? rect.height
        : typeof window !== 'undefined'
          ? window.innerHeight
          : GAME.HEIGHT;
    const rawDpr =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const { width: newWidth, height: newHeight } = getPhysicalCanvasSize(
      cssW,
      cssH,
      rawDpr
    );

    if (parentSize.width !== newWidth || parentSize.height !== newHeight) {
      parentSize.setSize(newWidth, newHeight);
      return true;
    }

    if (this.canvas) {
      const canvasBounds = this.canvasBounds;
      const canvasRect = this.canvas.getBoundingClientRect();
      if (
        canvasRect.x !== canvasBounds.x ||
        canvasRect.y !== canvasBounds.y ||
        canvasRect.width !== canvasBounds.width ||
        canvasRect.height !== canvasBounds.height
      ) {
        return true;
      }
    }

    return false;
  };
}

/**
 * Everroot V1 (MVP) — Phaser 3 configuration.
 * - pixelArt: true, antialias: false, roundPixels: true
 * - Scale.RESIZE at physical screen pixels (zero black bars, integer camera zoom in GameScene)
 * - Arcade Physics (top-down, zero gravity)
 */
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  title: GAME.TITLE,
  version: GAME.VERSION,
  backgroundColor: GAME.BG_COLOR,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    parent: 'game',
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
    autoRound: true,
  },
  callbacks: {
    preBoot: (gameInstance) => {
      installPhysicalScaleBounds(gameInstance.scale);
    },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    GameScene,
    UIScene,
  ],
};

// Instantiate Phaser 3 game
const game = new Phaser.Game(config);
installPhysicalScaleBounds(game.scale);

/**
 * On Android browsers, rotating between portrait and landscape updates the layout/visual
 * viewport 100–300ms AFTER `orientationchange` or the initial `resize` event fires.
 * Calling `game.scale.refresh()` both immediately and after short delays ensures Phaser
 * re-reads the updated parent bounds, resizes the canvas, and updates pointer hit bounds.
 */
let refreshTimers = [];

function refreshScaleNow() {
  if (!game || !game.scale) return;
  try {
    game.scale.refresh();
  } catch {
    // Ignore scale refresh errors before boot completes
  }
}

function scheduleScaleRefresh() {
  refreshScaleNow();
  for (const timerId of refreshTimers) {
    window.clearTimeout(timerId);
  }
  refreshTimers = (GAME.SCALE_REFRESH_DELAYS_MS || [100, 260]).map((delayMs) =>
    window.setTimeout(refreshScaleNow, delayMs)
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', scheduleScaleRefresh, { passive: true });
  window.addEventListener('orientationchange', scheduleScaleRefresh, {
    passive: true,
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleScaleRefresh, {
      passive: true,
    });
  }
}

export default game;
