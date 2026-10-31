import Phaser from 'phaser';
import { GAME, SCENE_KEYS } from '../data/gameConfig.js';
import { loadGameFont, pixelTextStyle } from '../systems/FontLoader.js';

/**
 * BootScene: initializes the pixel font (`assets/fonts/adapa.ttf`), configures scale/input defaults,
 * and hands off to `PreloadScene`.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  async create() {
    this.cameras.main.setBackgroundColor(GAME.BG_COLOR);
    await loadGameFont();
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
