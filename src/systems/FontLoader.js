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
            document.fonts.load(`12px "${GAME.FONT_FAMILY}"`),
            document.fonts.load(`16px "${GAME.FONT_FAMILY}"`),
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
 * Helper to create crisp pixel text style objects for Phaser.
 * Uses integer pixel fontSize and explicit resolution so `adapa.ttf` stays sharp.
 */
export function pixelTextStyle(size = 10, color = '#fff6e0', extra = {}) {
  const pxSize = Math.max(6, Math.round(size));
  return {
    fontFamily: `"${GAME.FONT_FAMILY}", ${GAME.FONT_FALLBACK}`,
    fontSize: `${pxSize}px`,
    color,
    resolution: 2,
    padding: { x: 1, y: 1 },
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
