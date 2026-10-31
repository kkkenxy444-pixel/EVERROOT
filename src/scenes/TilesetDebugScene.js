import Phaser from 'phaser';
import { ASSET_KEYS } from '../data/assetKeys.js';
import { GAME, getUiScale, SCENE_KEYS, TILE, UI } from '../data/gameConfig.js';
import { TILE_INDEX, TILESET_META } from '../data/tileIndex.js';
import { AudioManager } from '../systems/AudioManager.js';
import { pixelTextStyle } from '../systems/FontLoader.js';

// Reverse lookup map: tile index -> constant name(s) in TILE_INDEX
const INDEX_TO_NAME = (() => {
  const map = new Map();
  for (const [k, v] of Object.entries(TILE_INDEX)) {
    if (typeof v === 'number' && v >= 0) {
      map.set(v, map.has(v) ? `${map.get(v)}, ${k}` : k);
    }
  }
  return map;
})();

/**
 * TilesetDebugScene: Interactive visual verifier for `spr_tileset_sunnysideworld_16px.png`
 * (1024x1024 px, 64x64 tiles of 16x16 px).
 *
 * Features:
 * - Displays the full tileset over a checkerboard background with a 16x16 grid
 * - Renders tile index numbers on the visible viewport tiles (pooled Text objects for mobile performance)
 * - Tap/hover any tile to inspect its 0-based `index`, `(col, row)`, and `TILE_INDEX` constant name
 * - Touch-drag or WASD/Arrow keys to pan; Zoom button (2x / 3x / 4x); Back button or ESC/F2 to return
 */
export class TilesetDebugScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.TILESET_DEBUG });
  }

  init(data) {
    this.returnScene = data?.returnScene || SCENE_KEYS.MENU;
  }

  create() {
    AudioManager.playSceneBgm(SCENE_KEYS.TILESET_DEBUG);

    const viewW = this.scale.width || GAME.WIDTH;
    const viewH = this.scale.height || GAME.HEIGHT;
    this.uiScale = getUiScale(viewH);
    this.topBarHeight = 32 * this.uiScale;

    this.zoomLevels = [2, 3, 4];
    this.zoomIndex = 1; // start at 3x zoom so index numbers and 16px tiles are easy to read

    const W = TILESET_META.IMAGE_WIDTH;
    const H = TILESET_META.IMAGE_HEIGHT;

    // 1. Checkerboard + tileset + grid in world space
    const checker = this.add.graphics();
    for (let ry = 0; ry < TILESET_META.ROWS; ry++) {
      for (let rx = 0; rx < TILESET_META.COLUMNS; rx++) {
        checker.fillStyle((rx + ry) % 2 === 0 ? 0x2a2a34 : 0x383846, 1);
        checker.fillRect(rx * TILE.SIZE, ry * TILE.SIZE, TILE.SIZE, TILE.SIZE);
      }
    }

    this.add.image(0, 0, ASSET_KEYS.TILESET_SUNNYSIDE).setOrigin(0, 0);

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(0.5, 0xff5555, 0.45);
    for (let x = 0; x <= W; x += TILE.SIZE) {
      this.gridGraphics.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y <= H; y += TILE.SIZE) {
      this.gridGraphics.lineBetween(0, y, W, y);
    }

    // Selected tile highlight box
    this.selectionBox = this.add.graphics().setDepth(10);
    this._highlightTile(1, 1);

    // 2. Pooled index number labels for visible tiles (avoids creating 4096 Text nodes at once)
    this.labelPool = [];
    this.maxLabels = 260;
    for (let i = 0; i < this.maxLabels; i++) {
      const lbl = this.add
        .text(0, 0, '', {
          fontFamily: 'monospace',
          fontSize: '5px',
          resolution: 2,
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.55)',
        })
        .setDepth(5)
        .setVisible(false);
      this.labelPool.push(lbl);
    }
    this.showNumbers = true;

    // 3. Camera setup
    this.cam = this.cameras.main;
    this.cam.setBounds(-64, -64, W + 128, H + 128);
    this.cam.setZoom(this.zoomLevels[this.zoomIndex]);
    this.cam.centerOn(112, 80);

    // 4. Fixed UI overlay camera (so HUD bar & buttons stay crisp at 1x regardless of world zoom)
    this._buildHudOverlay(viewW, viewH);

    // 5. Input: touch/mouse drag to pan + tap to inspect tile + keyboard
    this._setupInput();
    this._refreshVisibleLabels();
  }

  _buildHudOverlay(viewW, viewH) {
    const s = this.uiScale;
    const barH = this.topBarHeight;
    const fontSmall = Math.max(12, Math.round(7 * s));
    const fontBtn = Math.max(11, Math.round(6.5 * s));

    this.hudContainer = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(100);

    const topBar = this.add.graphics();
    topBar.fillStyle(0x1a120c, 0.92);
    topBar.fillRect(0, 0, viewW, barH);
    topBar.lineStyle(1 * s, UI.PANEL_BORDER, 1);
    topBar.lineBetween(0, barH, viewW, barH);

    this.infoText = this.add
      .text(
        10 * s,
        4 * s,
        'TILESET DEBUG (64x64 @ 16px) — Geser untuk pan, Tap tile untuk cek index',
        pixelTextStyle(fontSmall, '#f2c14e')
      )
      .setScrollFactor(0);

    this.detailText = this.add
      .text(
        10 * s,
        17 * s,
        'Index: 65 | Col: 1, Row: 1 | Nama: GRASS_PLAIN_A',
        pixelTextStyle(fontSmall, '#fff6e0')
      )
      .setScrollFactor(0);

    // Zoom button
    const btnZoom = this._makeHudButton(
      viewW - 158 * s,
      barH / 2,
      46 * s,
      20 * s,
      s,
      fontBtn,
      `Zoom: ${this.zoomLevels[this.zoomIndex]}x`,
      () => {
        this.zoomIndex = (this.zoomIndex + 1) % this.zoomLevels.length;
        const z = this.zoomLevels[this.zoomIndex];
        this.cam.setZoom(z);
        btnZoom.label.setText(`Zoom: ${z}x`);
        this._refreshVisibleLabels();
      }
    );

    // Toggle numbers button
    const btnNums = this._makeHudButton(
      viewW - 104 * s,
      barH / 2,
      50 * s,
      20 * s,
      s,
      fontBtn,
      'Angka: ON',
      () => {
        this.showNumbers = !this.showNumbers;
        btnNums.label.setText(this.showNumbers ? 'Angka: ON' : 'Angka: OFF');
        this._refreshVisibleLabels();
      }
    );

    // Return button
    const btnBack = this._makeHudButton(
      viewW - 42 * s,
      barH / 2,
      58 * s,
      20 * s,
      s,
      fontBtn,
      'Kembali',
      () => {
        AudioManager.playSfx(ASSET_KEYS.SFX_UI_CANCEL);
        this.scene.start(this.returnScene);
      }
    );

    this.hudContainer.add([
      topBar,
      this.infoText,
      this.detailText,
      btnZoom.container,
      btnNums.container,
      btnBack.container,
    ]);

    // Separate UI camera so zooming `this.cam` does not scale the HUD bar
    this.uiCam = this.cameras.add(0, 0, viewW, viewH);
    this.cam.ignore(this.hudContainer);
    this.uiCam.ignore([
      this.gridGraphics,
      this.selectionBox,
      ...this.labelPool,
      ...this.children.list.filter(
        (c) => c !== this.hudContainer && !this.hudContainer.exists(c)
      ),
    ]);
  }

  _makeHudButton(x, y, w, h, s, fontPx, text, onClick) {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(UI.PANEL_INNER, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 3 * s);
    bg.lineStyle(1 * s, UI.PANEL_BORDER, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 3 * s);

    const label = this.add
      .text(0, 0, text, pixelTextStyle(fontPx, '#fff6e0'))
      .setOrigin(0.5);

    const zone = this.add
      .zone(0, 0, w, h)
      .setOrigin(0.5)
      .setInteractive();

    zone.on('pointerdown', (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      AudioManager.playSfx(ASSET_KEYS.SFX_UI_SELECT);
      onClick();
    });

    c.add([bg, label, zone]);
    return { container: c, label };
  }

  _setupInput() {
    this.dragging = false;
    this.dragMoved = false;
    this.dragStart = { x: 0, y: 0, scrollX: 0, scrollY: 0 };

    this.input.on('pointerdown', (pointer) => {
      if (pointer.y <= this.topBarHeight) return; // clicked HUD bar
      this.dragging = true;
      this.dragMoved = false;
      this.dragStart.x = pointer.x;
      this.dragStart.y = pointer.y;
      this.dragStart.scrollX = this.cam.scrollX;
      this.dragStart.scrollY = this.cam.scrollY;
    });

    this.input.on('pointermove', (pointer) => {
      if (this.dragging && pointer.isDown) {
        const dx = pointer.x - this.dragStart.x;
        const dy = pointer.y - this.dragStart.y;
        if (Math.hypot(dx, dy) > 4) {
          this.dragMoved = true;
        }
        this.cam.scrollX = this.dragStart.scrollX - dx / this.cam.zoom;
        this.cam.scrollY = this.dragStart.scrollY - dy / this.cam.zoom;
        this._refreshVisibleLabels();
      } else if (pointer.y > this.topBarHeight) {
        this._inspectPointer(pointer);
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (
        this.dragging &&
        !this.dragMoved &&
        pointer.y > this.topBarHeight
      ) {
        this._inspectPointer(pointer);
      }
      this.dragging = false;
    });

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,S,D,ESC,F2');
      this.keys.ESC.on('down', () => this.scene.start(this.returnScene));
      this.keys.F2.on('down', () => this.scene.start(this.returnScene));
    }
  }

  _inspectPointer(pointer) {
    const worldPt = this.cam.getWorldPoint(pointer.x, pointer.y);
    const col = Math.floor(worldPt.x / TILE.SIZE);
    const row = Math.floor(worldPt.y / TILE.SIZE);
    if (
      col < 0 ||
      col >= TILESET_META.COLUMNS ||
      row < 0 ||
      row >= TILESET_META.ROWS
    ) {
      return;
    }
    this._highlightTile(col, row);
  }

  _highlightTile(col, row) {
    const index = row * TILESET_META.COLUMNS + col;
    const name = INDEX_TO_NAME.get(index) || '(belum dinamai di tileIndex.js)';

    this.selectionBox.clear();
    this.selectionBox.lineStyle(1.5, 0xf7d560, 1);
    this.selectionBox.strokeRect(
      col * TILE.SIZE,
      row * TILE.SIZE,
      TILE.SIZE,
      TILE.SIZE
    );

    if (this.detailText) {
      this.detailText.setText(
        `Index: ${index} | Col: ${col}, Row: ${row} | Nama: ${name}`
      );
    }
  }

  _refreshVisibleLabels() {
    for (let i = 0; i < this.labelPool.length; i++) {
      this.labelPool[i].setVisible(false);
    }
    if (!this.showNumbers) return;

    const view = this.cam.worldView;
    const c0 = Math.max(0, Math.floor(view.x / TILE.SIZE));
    const r0 = Math.max(0, Math.floor(view.y / TILE.SIZE));
    const c1 = Math.min(
      TILESET_META.COLUMNS - 1,
      Math.ceil((view.x + view.width) / TILE.SIZE)
    );
    const r1 = Math.min(
      TILESET_META.ROWS - 1,
      Math.ceil((view.y + view.height) / TILE.SIZE)
    );

    // At 1x zoom, show every 2nd tile index if viewport exceeds pool capacity
    const totalVisible = (c1 - c0 + 1) * (r1 - r0 + 1);
    const step = totalVisible > this.maxLabels ? 2 : 1;

    let poolIdx = 0;
    for (let r = r0; r <= r1; r += step) {
      for (let c = c0; c <= c1; c += step) {
        if (poolIdx >= this.labelPool.length) return;
        const idx = r * TILESET_META.COLUMNS + c;
        const lbl = this.labelPool[poolIdx++];
        lbl.setPosition(c * TILE.SIZE + 1, r * TILE.SIZE + 1);
        lbl.setText(String(idx));
        lbl.setColor(INDEX_TO_NAME.has(idx) ? '#ffd866' : '#ffffff');
        lbl.setVisible(true);
      }
    }
  }

  update(_, delta) {
    if (!this.cursors || !this.keys) return;
    const speed = (0.18 * delta) / this.cam.zoom;
    let moved = false;

    if (this.cursors.left.isDown || this.keys.A.isDown) {
      this.cam.scrollX -= speed;
      moved = true;
    }
    if (this.cursors.right.isDown || this.keys.D.isDown) {
      this.cam.scrollX += speed;
      moved = true;
    }
    if (this.cursors.up.isDown || this.keys.W.isDown) {
      this.cam.scrollY -= speed;
      moved = true;
    }
    if (this.cursors.down.isDown || this.keys.S.isDown) {
      this.cam.scrollY += speed;
      moved = true;
    }
    if (moved) {
      this._refreshVisibleLabels();
    }
  }
}
