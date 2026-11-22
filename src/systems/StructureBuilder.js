import { ASSET_KEYS } from '../data/assetKeys.js';
import { DEPTH, TILE } from '../data/gameConfig.js';
import { PROPS, STRUCTURES } from '../data/villageStructures.js';

const TILE_COLUMNS = 64;
const CACHE_PREFIX = 'village_struct_';

/**
 * Builds village buildings from `villageStructures.js` by drawing 16px tileset
 * cells into one canvas texture per structure. Textures live in the global
 * TextureManager (not tracked by `WorldBuilder.destroy()`), so switching maps
 * back and forth reuses the same canvases instead of re-cropping them.
 */
export class StructureBuilder {
  constructor(scene) {
    this.scene = scene;
  }

  getDef(name) {
    return STRUCTURES[name] || null;
  }

  textureKey(name, mirror = false) {
    return `${CACHE_PREFIX}${name}${mirror ? '_m' : ''}`;
  }

  /**
   * Draws layer 0 (walls) before layer 1 (building), honouring the per-cell
   * horizontal mirror flag. A whole-structure mirror is baked into the canvas
   * too so the cached texture matches the sprite exactly.
   */
  ensureStructureTexture(name, mirror = false) {
    const def = STRUCTURES[name];
    if (!def) return null;

    const key = this.textureKey(name, mirror);
    if (this.scene.textures.exists(key)) return key;

    const source = this.scene.textures
      .get(ASSET_KEYS.TILESET_SUNNYSIDE)
      .getSourceImage();
    const texture = this.scene.textures.createCanvas(
      key,
      def.w * TILE.SIZE,
      def.h * TILE.SIZE
    );
    if (!texture) return null;

    const ctx = texture.getContext();
    ctx.imageSmoothingEnabled = false;

    const cells = def.cells.slice().sort((a, b) => a[4] - b[4]);
    for (const [dx, dy, tileIndex, flags] of cells) {
      const sx = (tileIndex % TILE_COLUMNS) * TILE.SIZE;
      const sy = Math.floor(tileIndex / TILE_COLUMNS) * TILE.SIZE;
      const drawX = (mirror ? def.w - 1 - dx : dx) * TILE.SIZE;
      const drawY = dy * TILE.SIZE;
      const flip = ((flags & 1) === 1) !== mirror;

      ctx.save();
      if (flip) {
        ctx.translate(drawX + TILE.SIZE, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(
          source,
          sx,
          sy,
          TILE.SIZE,
          TILE.SIZE,
          0,
          0,
          TILE.SIZE,
          TILE.SIZE
        );
      } else {
        ctx.drawImage(
          source,
          sx,
          sy,
          TILE.SIZE,
          TILE.SIZE,
          drawX,
          drawY,
          TILE.SIZE,
          TILE.SIZE
        );
      }
      ctx.restore();
    }

    texture.refresh();
    return key;
  }

  /**
   * One sprite per building, origin bottom-left. Depth uses the bottom edge so
   * the player can walk behind the roof and still be drawn behind the walls.
   */
  addStructure(name, tileX, tileY, options = {}) {
    const def = STRUCTURES[name];
    if (!def) return null;

    const key = this.ensureStructureTexture(name, !!options.mirror);
    if (!key) return null;

    const bottomY = (tileY + def.h) * TILE.SIZE;
    const sprite = this.scene.add
      .image(tileX * TILE.SIZE, bottomY, key)
      .setOrigin(0, 1)
      .setDepth(DEPTH.Y_SORT_BASE + bottomY);

    return { sprite, def, bottomY };
  }

  /**
   * Crops a pixel rect from the loaded tileset as a named frame (no image file
   * is modified). Frame names are stable so repeated map builds reuse them.
   */
  ensurePropFrame(name) {
    const prop = PROPS[name];
    if (!prop) return null;

    const frame = `village_prop_${name}`;
    const texture = this.scene.textures.get(ASSET_KEYS.TILESET_SUNNYSIDE);
    if (!texture.has(frame)) {
      texture.add(frame, 0, prop.x, prop.y, prop.w, prop.h);
    }
    return { frame, prop };
  }

  addProp(name, tileX, tileY) {
    const cropped = this.ensurePropFrame(name);
    if (!cropped) return null;

    const baseX = tileX * TILE.SIZE + TILE.SIZE / 2;
    const baseY = (tileY + 1) * TILE.SIZE;
    const sprite = this.scene.add
      .image(
        baseX,
        baseY,
        ASSET_KEYS.TILESET_SUNNYSIDE,
        cropped.frame
      )
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.Y_SORT_BASE + baseY);

    return { sprite, prop: cropped.prop, baseX, baseY };
  }
}
