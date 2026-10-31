import Phaser from 'phaser';
import { GAME, getPhysicalCanvasSize } from './data/gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { TilesetDebugScene } from './scenes/TilesetDebugScene.js';
import { UIScene } from './scenes/UIScene.js';

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
    TilesetDebugScene,
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
