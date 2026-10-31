import { ASSET_KEYS, cropStageKey } from '../data/assetKeys.js';
import { DEPTH, FARMING, TILE } from '../data/gameConfig.js';

/**
 * Visual entity for a single grid-based farm plot at `(tx, ty)`:
 * - Soil sprite (`soil_dry`, `soil_wet`, `soil_pit_dry`, `soil_pit_wet`)
 * - Watered status highlight so wet vs dry plots are unmistakable on mobile screens
 * - Crop sprite (`crop_<id>_00` .. `crop_<id>_05`) when a seed is planted
 * - Harvest-ready sparkle indicator when `stage >= FARMING.MAX_STAGE` (stage 05)
 */
export class Crop {
  constructor(scene, tx, ty, plotData) {
    this.scene = scene;
    this.tx = tx;
    this.ty = ty;
    this.worldX = tx * TILE.SIZE + TILE.SIZE / 2;
    this.worldY = ty * TILE.SIZE + TILE.SIZE / 2;

    this.soilSprite = scene.add
      .image(this.worldX, this.worldY + 1, ASSET_KEYS.SOIL_DRY)
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.SOIL);

    this.statusGfx = scene.add.graphics().setDepth(DEPTH.SOIL + 0.2);

    this.cropSprite = scene.add
      .image(this.worldX, this.worldY + 5, cropStageKey('parsnip', 0))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.CROP_BASE + ty * 0.01)
      .setVisible(false);

    this.sync(plotData, false);
  }

  /**
   * Synchronizes visual sprites with the underlying plot state object.
   */
  sync(plotData, animatePop = false) {
    if (!plotData) return;

    const hasCrop = Boolean(plotData.cropId);
    const isWatered = Boolean(plotData.watered);
    const stage = Math.max(0, Math.min(FARMING.MAX_STAGE, plotData.stage || 0));
    const isReady = hasCrop && stage >= FARMING.MAX_STAGE;

    // 1. Update soil texture & tint
    let soilKey = ASSET_KEYS.SOIL_DRY;
    if (hasCrop) {
      soilKey = isWatered ? ASSET_KEYS.SOIL_PIT_WET : ASSET_KEYS.SOIL_PIT_DRY;
    } else {
      soilKey = isWatered ? ASSET_KEYS.SOIL_WET : ASSET_KEYS.SOIL_DRY;
    }

    this.soilSprite.setTexture(soilKey);
    this.soilSprite.setTint(
      isWatered ? FARMING.WET_SOIL_TINT : FARMING.DRY_SOIL_TINT
    );

    // 2. Draw subtle watered / harvest-ready indicator on the tile
    this.statusGfx.clear();
    if (isWatered) {
      this.statusGfx.fillStyle(0x4da6ff, 0.22);
      this.statusGfx.fillRect(
        this.tx * TILE.SIZE + 2,
        this.ty * TILE.SIZE + 3,
        TILE.SIZE - 4,
        TILE.SIZE - 5
      );
      // Small water droplet dot in bottom-left corner of plot
      this.statusGfx.fillStyle(0x6ec6ff, 0.9);
      this.statusGfx.fillRect(
        this.tx * TILE.SIZE + 2,
        this.ty * TILE.SIZE + TILE.SIZE - 4,
        2,
        2
      );
    }

    if (isReady) {
      // Golden harvest-ready outline & corner badge
      this.statusGfx.lineStyle(1, FARMING.CURSOR_HARVEST_COLOR, 0.85);
      this.statusGfx.strokeRect(
        this.tx * TILE.SIZE + 1.5,
        this.ty * TILE.SIZE + 1.5,
        TILE.SIZE - 3,
        TILE.SIZE - 3
      );
      this.statusGfx.fillStyle(FARMING.CURSOR_HARVEST_COLOR, 1);
      this.statusGfx.fillRect(
        this.tx * TILE.SIZE + TILE.SIZE - 4,
        this.ty * TILE.SIZE + 2,
        2,
        2
      );
    }

    // 3. Update crop stage sprite (00..05)
    if (hasCrop) {
      const texKey = cropStageKey(plotData.cropId, stage);
      this.cropSprite.setTexture(texKey);
      this.cropSprite.setVisible(true);

      if (animatePop && this.scene && this.scene.tweens) {
        this.cropSprite.setScale(1.25, 0.75);
        this.scene.tweens.add({
          targets: this.cropSprite,
          scaleX: 1,
          scaleY: 1,
          duration: 180,
          ease: 'Back.easeOut',
        });
      } else {
        this.cropSprite.setScale(1, 1);
      }
    } else {
      this.cropSprite.setVisible(false);
    }
  }

  destroy() {
    if (this.soilSprite) this.soilSprite.destroy();
    if (this.statusGfx) this.statusGfx.destroy();
    if (this.cropSprite) this.cropSprite.destroy();
  }
}
