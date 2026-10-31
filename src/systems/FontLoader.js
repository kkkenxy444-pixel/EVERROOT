import { ASSET_BASE_PATH } from '../data/assetKeys.js';
import { GAME } from '../data/gameConfig.js';

let fontLoadedPromise = null;

/**
 * Injects `@font-face` for `assets/fonts/adapa.ttf` using a document-relative URL
 * (works under both `npm run dev` and `npm run build` with `base: './'`) and
 * waits for the browser FontFace API so Phaser text renders in the pixel font immediately.
 */
export function loadGameFont() {
  if (fontLoadedPromise) {
    return fontLoadedPromise;
  }

  fontLoadedPromise = (async () => {
    try {
      const fontUrl = `${ASSET_BASE_PATH}fonts/adapa.ttf`;
      const styleId = 'everroot-font-face';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @font-face {
            font-family: '${GAME.FONT_FAMILY}';
            src: url('${fontUrl}') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: block;
          }
        `;
        document.head.appendChild(style);
      }

      if (document.fonts && typeof document.fonts.load === 'function') {
        await Promise.race([
          Promise.all([
            document.fonts.load(`16px "${GAME.FONT_FAMILY}"`),
            document.fonts.load(`28px "${GAME.FONT_FAMILY}"`),
            document.fonts.load(`36px "${GAME.FONT_FAMILY}"`),
          ]),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
        if (document.fonts.ready) {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, 500)),
          ]);
        }
      }
    } catch {
      // Fallback to monospace gracefully if FontFace API fails in restricted webviews.
    }
  })();

  return fontLoadedPromise;
}

/**
 * Returns crisp text resolution matched to the device's physical DPR (minimum 2, capped at 3).
 */
export function getTextResolution() {
  if (typeof window === 'undefined') return 2;
  const rawDpr = Number(window.devicePixelRatio) || 2;
  return Math.min(3, Math.max(2, Math.ceil(rawDpr)));
}

/**
 * Helper to create crisp pixel text style objects for Phaser.
 * Uses integer pixel fontSize and DPR-matched resolution so `adapa.ttf` stays sharp.
 */
export function pixelTextStyle(size = 14, color = '#fff6e0', extra = {}) {
  const pxSize = Math.max(8, Math.round(size));
  const res = extra.resolution || getTextResolution();
  return {
    fontFamily: `"${GAME.FONT_FAMILY}", ${GAME.FONT_FALLBACK}`,
    fontSize: `${pxSize}px`,
    color,
    resolution: res,
    padding: { x: 2, y: 2 },
    shadow: {
      offsetX: 1,
      offsetY: 1,
      color: '#1a120c',
      blur: 0,
      fill: true,
    },
    ...extra,
  };
}
