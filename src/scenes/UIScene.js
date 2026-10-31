import Phaser from 'phaser';
import { ASSET_KEYS, cropStageKey } from '../data/assetKeys.js';
import {
  GAME,
  getUiScale,
  INVENTORY,
  isDebugModeEnabled,
  SCENE_KEYS,
  UI,
} from '../data/gameConfig.js';
import { ITEMS, SEED_ITEM_IDS, TOOL_IDS, TOOLS } from '../data/items.js';
import { AudioManager } from '../systems/AudioManager.js';
import { eventBus, EVENTS } from '../systems/EventBus.js';
import { pixelTextStyle } from '../systems/FontLoader.js';
import { ShopModal } from '../ui/ShopModal.js';
import { TouchControls } from '../ui/TouchControls.js';

/**
 * UIScene: Parallel overlay scene rendered at native physical screen resolution
 * using integer `uiScale = getUiScale(height)`:
 * - Single compact top row: Day/Time/Phase, Coins, active seed badge, and a collapsible
 *   12-slot compact inventory toggle button (plus compact Tileset & Menu buttons at top-right)
 * - Single-line auto-hiding Toast at top-center
 * - Bottom-center toolbar (Hoe, Watering Can, Seeds with active seed icon/count, Fishing Rod)
 * - Custom on-screen TouchControls (bottom-left joystick + bottom-right AKSI / ALAT / BIBIT)
 * - Reusable `ShopModal` ('sell' at Shipping Box, 'buy' at Seed Stall)
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  init(data) {
    this.gameScene = data?.gameScene || null;
  }

  create() {
    this.viewWidth = this.scale.width || GAME.WIDTH;
    this.viewHeight = this.scale.height || GAME.HEIGHT;
    this.uiScale = getUiScale(this.viewWidth, this.viewHeight);
    this.storageOpen = false;
    this.audioOpen = false;
    this._currentHint = '';
    this._currentToast = '';
    this._lastCoins = this.gameScene?.gameState?.coins ?? null;

    this._buildHudElements();

    // Custom on-screen touch controls (automatically active on touch devices)
    this.touchControls = new TouchControls(this, (vx, vy) => {
      if (this.gameScene && this.gameScene.inputSystem) {
        this.gameScene.inputSystem.setTouchVector(vx, vy);
      }
    });

    // Reusable ShopModal ('sell' Shipping Box / 'buy' Seed Stall)
    this.shopModal = new ShopModal(this);

    this._relayout(this.viewWidth, this.viewHeight);
    this._bindEvents();
    this._syncInitialHud();
  }

  _buildHudElements() {
    if (this.hudRoot) {
      this.hudRoot.destroy(true);
    }
    this.hudRoot = this.add.container(0, 0).setDepth(100);

    const s = this.uiScale;
    const fontMain = Math.max(12, Math.round(7.5 * s));
    const fontSmall = Math.max(11, Math.round(6.5 * s));
    const fontSlot = Math.max(10, Math.round(5.5 * s));

    // --- 1. Single-row Top-Left Status Bar (Day/Time • Coins • Active Seed • Tas X/12 toggle) ---
    this.topLeftGroup = this.add.container(0, 0);
    const barW = 248 * s;
    const barH = 20 * s;

    const bar = this.add.graphics();
    bar.fillStyle(UI.PANEL_BG, 0.9);
    bar.fillRoundedRect(0, 0, barW, barH, 4 * s);
    bar.lineStyle(1.5 * s, UI.PANEL_BORDER, 1);
    bar.strokeRoundedRect(0, 0, barW, barH, 4 * s);

    const cy = barH / 2;

    const clockIcon = this.add
      .image(10 * s, cy, ASSET_KEYS.ICON_STOPWATCH)
      .setOrigin(0.5)
      .setScale(s);

    this.timeText = this.add
      .text(
        19 * s,
        cy,
        'Hari 1 • 06:00 (Pagi)',
        pixelTextStyle(fontMain, '#fff6e0')
      )
      .setOrigin(0, 0.5);

    // Crisp pixel coin icon + Coin counter
    const coinX = 136 * s;
    const coinGfx = this.add.graphics();
    coinGfx.fillStyle(0xf7d560, 1);
    coinGfx.fillCircle(coinX, cy, 4 * s);
    coinGfx.lineStyle(1 * s, 0x9c6b1c, 1);
    coinGfx.strokeCircle(coinX, cy, 4 * s);

    const startCoins = this.gameScene?.gameState?.coins ?? 50;
    this.coinText = this.add
      .text(
        coinX + 6 * s,
        cy,
        `${startCoins}G`,
        pixelTextStyle(fontMain, '#ffd866')
      )
      .setOrigin(0, 0.5);

    // Compact active seed icon + stock count inside the same top row
    const seedX = 172 * s;
    this.activeSeedIcon = this.add
      .image(seedX, cy, cropStageKey('parsnip', 5))
      .setOrigin(0.5)
      .setScale(0.85 * s);
    this.activeSeedText = this.add
      .text(seedX + 7 * s, cy, 'x5', pixelTextStyle(fontSmall, '#a8f0a0'))
      .setOrigin(0, 0.5);

    // Compact Inventory Slot Grid toggle button at the right end of the top row
    const bagX = 200 * s;
    const bagW = 44 * s;
    const bagH = 15 * s;
    const bagBg = this.add.graphics();
    bagBg.fillStyle(UI.PANEL_INNER, 0.95);
    bagBg.fillRoundedRect(bagX, cy - bagH / 2, bagW, bagH, 3 * s);
    bagBg.lineStyle(1 * s, UI.PANEL_BORDER, 0.9);
    bagBg.strokeRoundedRect(bagX, cy - bagH / 2, bagW, bagH, 3 * s);

    const basketIcon = this.add
      .image(bagX + 7 * s, cy, ASSET_KEYS.ICON_BASKET)
      .setOrigin(0.5)
      .setScale(0.8 * s);
    this.totalHarvestText = this.add
      .text(
        bagX + 14 * s,
        cy,
        `0/${INVENTORY.MAX_SLOTS}▾`,
        pixelTextStyle(fontSlot, '#fff6e0')
      )
      .setOrigin(0, 0.5);

    const bagZone = this.add
      .zone(bagX + bagW / 2, cy, bagW + 6 * s, barH)
      .setOrigin(0.5)
      .setInteractive();
    bagZone.on('pointerdown', (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      AudioManager.playSfx(ASSET_KEYS.SFX_UI_SELECT);
      this.storageOpen = !this.storageOpen;
      if (this.storageDrawer) {
        this.storageDrawer.setVisible(this.storageOpen);
      }
    });

    // Collapsible 12-slot compact inventory drawer (6 columns x 2 rows)
    this.storageDrawer = this.add
      .container(0, barH + 3 * s)
      .setVisible(this.storageOpen);

    const cols = INVENTORY.COMPACT_COLS || 6;
    const rows = Math.ceil(INVENTORY.MAX_SLOTS / cols);
    const cellS = 22 * s;
    const cellGap = 3 * s;
    const padX = 5 * s;
    const padY = 5 * s;
    const drawerW = padX * 2 + cols * cellS + (cols - 1) * cellGap;
    const drawerH = padY * 2 + rows * cellS + (rows - 1) * cellGap;

    const drawerBg = this.add.graphics();
    drawerBg.fillStyle(UI.PANEL_BG, 0.94);
    drawerBg.fillRoundedRect(0, 0, drawerW, drawerH, 4 * s);
    drawerBg.lineStyle(1.2 * s, UI.PANEL_BORDER, 0.95);
    drawerBg.strokeRoundedRect(0, 0, drawerW, drawerH, 4 * s);
    this.storageDrawer.add(drawerBg);

    this.inventorySlotCells = [];
    for (let i = 0; i < INVENTORY.MAX_SLOTS; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = padX + col * (cellS + cellGap) + cellS / 2;
      const rcy = padY + row * (cellS + cellGap) + cellS / 2;

      const cellBg = this.add.graphics();
      cellBg.fillStyle(UI.SLOT_BG, 0.9);
      cellBg.fillRoundedRect(
        cx - cellS / 2,
        rcy - cellS / 2,
        cellS,
        cellS,
        3 * s
      );
      cellBg.lineStyle(1 * s, UI.PANEL_BORDER, 0.75);
      cellBg.strokeRoundedRect(
        cx - cellS / 2,
        rcy - cellS / 2,
        cellS,
        cellS,
        3 * s
      );

      const icon = this.add
        .image(cx, rcy - 1 * s, ASSET_KEYS.ITEM_SEEDS)
        .setOrigin(0.5)
        .setScale(0.85 * s)
        .setVisible(false);

      const badge = this.add
        .image(cx + 4 * s, rcy - 4 * s, cropStageKey('parsnip', 5))
        .setOrigin(0.5)
        .setScale(0.55 * s)
        .setVisible(false);

      const countText = this.add
        .text(
          cx + cellS / 2 - 1.5 * s,
          rcy + cellS / 2 - 1 * s,
          '',
          pixelTextStyle(fontSlot, '#fff6e0')
        )
        .setOrigin(1, 1)
        .setVisible(false);

      this.storageDrawer.add([cellBg, icon, badge, countText]);
      this.inventorySlotCells.push({ cellBg, icon, badge, countText });
    }

    this.topLeftGroup.add([
      bar,
      clockIcon,
      this.timeText,
      coinGfx,
      this.coinText,
      this.activeSeedIcon,
      this.activeSeedText,
      bagBg,
      basketIcon,
      this.totalHarvestText,
      bagZone,
      this.storageDrawer,
    ]);
    this.hudRoot.add(this.topLeftGroup);

    // --- 2. Top-Right Utility Buttons (Audio▾, Tileset & Menu) + Collapsible Audio Popover ---
    const initAudio = AudioManager.getSettings();
    this.btnAudio = this._createSmallTopButton(
      44 * s,
      18 * s,
      initAudio.muted ? 'Mute▾' : 'Suara▾',
      fontSmall,
      () => {
        this.audioOpen = !this.audioOpen;
        if (this.audioPopover) {
          this.audioPopover.setVisible(this.audioOpen);
        }
      }
    );

    this.btnTileset = this._createSmallTopButton(
      42 * s,
      18 * s,
      'Tileset',
      fontSmall,
      () => {
        if (this.gameScene && this.gameScene.flushSaveIfActive) {
          this.gameScene.flushSaveIfActive();
        }
        this.scene.stop(SCENE_KEYS.GAME);
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.TILESET_DEBUG, {
          returnScene: SCENE_KEYS.GAME,
        });
      }
    );

    this.btnMenu = this._createSmallTopButton(
      38 * s,
      18 * s,
      'Menu',
      fontSmall,
      () => {
        if (this.gameScene && this.gameScene.flushSaveIfActive) {
          this.gameScene.flushSaveIfActive();
        }
        this.scene.stop(SCENE_KEYS.GAME);
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.MENU);
      }
    );

    // Collapsible Audio Settings Popover (Mute, Music Volume, SFX Volume)
    this.audioPopover = this.add.container(0, 0).setVisible(this.audioOpen);
    const popW = 86 * s;
    const popH = 62 * s;
    const popBg = this.add.graphics();
    popBg.fillStyle(UI.PANEL_BG, 0.96);
    popBg.fillRoundedRect(-popW, 0, popW, popH, 4 * s);
    popBg.lineStyle(1.2 * s, UI.PANEL_BORDER, 0.95);
    popBg.strokeRoundedRect(-popW, 0, popW, popH, 4 * s);

    this.btnPopMute = this._createSmallTopButton(
      popW - 8 * s,
      15 * s,
      '',
      fontSlot,
      () => {
        AudioManager.toggleMute();
        this._updateAudioPopoverLabels();
      }
    );
    this.btnPopMute.setPosition(-popW / 2, 11.5 * s);

    this.btnPopMusic = this._createSmallTopButton(
      popW - 8 * s,
      15 * s,
      '',
      fontSlot,
      () => {
        AudioManager.cycleMusicLevel(1);
        this._updateAudioPopoverLabels();
      }
    );
    this.btnPopMusic.setPosition(-popW / 2, 30.5 * s);

    this.btnPopSfx = this._createSmallTopButton(
      popW - 8 * s,
      15 * s,
      '',
      fontSlot,
      () => {
        AudioManager.cycleSfxLevel(1);
        this._updateAudioPopoverLabels();
      }
    );
    this.btnPopSfx.setPosition(-popW / 2, 49.5 * s);

    this.audioPopover.add([
      popBg,
      this.btnPopMute,
      this.btnPopMusic,
      this.btnPopSfx,
    ]);
    this._updateAudioPopoverLabels();

    this.hudRoot.add([
      this.btnAudio,
      this.btnTileset,
      this.btnMenu,
      this.audioPopover,
    ]);

    // --- 3. Bottom-Center Toolbar ---
    const slotW = 28 * s;
    const slotH = 28 * s;
    const gap = 4 * s;
    this.toolbarTotalW = TOOLS.length * slotW + (TOOLS.length - 1) * gap;
    this.toolbarSlotW = slotW;
    this.toolbarSlotH = slotH;
    this.toolbarGap = gap;
    this.toolSlots = [];

    TOOLS.forEach((tool, idx) => {
      const c = this.add.container(0, 0);
      const bg = this.add.graphics();
      const icon = this.add
        .image(0, -2 * s, tool.iconKey)
        .setOrigin(0.5)
        .setScale(s);
      const lbl = this.add
        .text(0, 9 * s, tool.shortLabel, pixelTextStyle(fontSlot, '#fff6e0'))
        .setOrigin(0.5);
      const num = this.add
        .text(
          -slotW / 2 + 2.5 * s,
          -slotH / 2 + 1.5 * s,
          String(idx + 1),
          pixelTextStyle(fontSlot, '#d9c4a9')
        )
        .setOrigin(0, 0);

      const children = [bg, icon, lbl, num];

      if (tool.id === TOOL_IDS.SEEDS) {
        this.seedSlotBadge = this.add
          .image(5.5 * s, -5.5 * s, cropStageKey('parsnip', 5))
          .setOrigin(0.5)
          .setScale(0.65 * s);
        this.seedSlotCount = this.add
          .text(
            slotW / 2 - 2 * s,
            -slotH / 2 + 1.5 * s,
            '5',
            pixelTextStyle(fontSlot, '#a8f0a0')
          )
          .setOrigin(1, 0);
        children.push(this.seedSlotBadge, this.seedSlotCount);
      }

      const zone = this.add
        .zone(0, 0, slotW, slotH)
        .setOrigin(0.5)
        .setInteractive();

      zone.on('pointerdown', (pointer, lx, ly, event) => {
        if (event && event.stopPropagation) event.stopPropagation();
        eventBus.emit(EVENTS.INPUT_SELECT_TOOL, idx);
      });

      children.push(zone);
      c.add(children);
      this.hudRoot.add(c);
      this.toolSlots.push({ container: c, bg, tool, slotW, slotH });
    });

    this._highlightToolSlot(this.gameScene?.toolIndex ?? 0);

    // --- 4. Single-Line Interaction Hint (above toolbar) & Single-Line Top-Center Toast ---
    this.hintText = this.add
      .text(
        0,
        0,
        this._currentHint,
        pixelTextStyle(fontSmall, '#ffd866', {
          backgroundColor: 'rgba(26,18,12,0.78)',
          padding: { x: 4 * s, y: 2 * s },
        })
      )
      .setOrigin(0.5)
      .setVisible(Boolean(this._currentHint));

    this.toastText = this.add
      .text(
        0,
        0,
        this._currentToast,
        pixelTextStyle(fontSmall, '#a8f0a0', {
          backgroundColor: 'rgba(26,18,12,0.86)',
          padding: { x: 6 * s, y: 2.5 * s },
        })
      )
      .setOrigin(0.5)
      .setVisible(Boolean(this._currentToast));

    this.hudRoot.add([this.hintText, this.toastText]);

    // --- 5. Native-Resolution Fishing Bite / Reel Timing Indicator (above player) ---
    this.fishingAlertGroup = this.add.container(0, 0).setVisible(false);
    const alertW = 68 * s;
    const alertH = 22 * s;
    this.fishingAlertBg = this.add.graphics();
    this.fishingAlertBg.fillStyle(0x2a140d, 0.94);
    this.fishingAlertBg.fillRoundedRect(
      -alertW / 2,
      -alertH / 2,
      alertW,
      alertH,
      4 * s
    );
    this.fishingAlertBg.lineStyle(1.5 * s, 0xffd866, 1);
    this.fishingAlertBg.strokeRoundedRect(
      -alertW / 2,
      -alertH / 2,
      alertW,
      alertH,
      4 * s
    );

    const alertIcon = this.add
      .image(-alertW / 2 + 8 * s, -3.5 * s, ASSET_KEYS.ICON_ALERTED)
      .setOrigin(0.5)
      .setScale(1.2 * s);

    const alertLabel = this.add
      .text(
        4 * s,
        -3.5 * s,
        '! TARIK !',
        pixelTextStyle(fontSmall, '#ffd866')
      )
      .setOrigin(0.5);

    this.fishingBarFill = this.add.graphics();
    this._fishingBarW = alertW - 10 * s;
    this._fishingBarH = 4 * s;
    this._fishingBarY = alertH / 2 - 5.5 * s;

    this.fishingAlertGroup.add([
      this.fishingAlertBg,
      alertIcon,
      alertLabel,
      this.fishingBarFill,
    ]);
    this.hudRoot.add(this.fishingAlertGroup);

    // --- 6. Hidden Debug Corner Buttons (ONLY created when URL has `?debug=1`) ---
    this.debugGroup = null;
    if (isDebugModeEnabled()) {
      this.debugGroup = this.add.container(0, 0);
      const btnCoins = this._createSmallTopButton(
        34 * s,
        15 * s,
        '+100G',
        fontSlot,
        () => eventBus.emit(EVENTS.DEBUG_ADD_COINS)
      );
      const btnDay = this._createSmallTopButton(
        38 * s,
        15 * s,
        'Hari+1',
        fontSlot,
        () => eventBus.emit(EVENTS.DEBUG_NEXT_DAY)
      );
      const btnSeeds = this._createSmallTopButton(
        36 * s,
        15 * s,
        '+Bibit',
        fontSlot,
        () => eventBus.emit(EVENTS.DEBUG_FILL_SEEDS)
      );
      btnCoins.setPosition(17 * s, 0);
      btnDay.setPosition(56 * s, 0);
      btnSeeds.setPosition(96 * s, 0);
      this.debugGroup.add([btnCoins, btnDay, btnSeeds]);
      this.hudRoot.add(this.debugGroup);
    }
  }

  _drawFishingBar(progressRatio = 1) {
    if (!this.fishingBarFill) return;
    const s = this.uiScale || 1;
    const bw = this._fishingBarW || 58 * s;
    const bh = this._fishingBarH || 4 * s;
    const by = this._fishingBarY || 5 * s;
    const clamped = Math.max(0, Math.min(1, Number(progressRatio) || 0));

    this.fishingBarFill.clear();
    this.fishingBarFill.fillStyle(0x160c08, 0.95);
    this.fishingBarFill.fillRect(-bw / 2, by, bw, bh);

    const fillColor =
      clamped > 0.45 ? 0x7ef27e : clamped > 0.2 ? 0xffd866 : 0xe63946;
    this.fishingBarFill.fillStyle(fillColor, 1);
    this.fishingBarFill.fillRect(
      -bw / 2,
      by,
      Math.max(1, Math.round(bw * clamped)),
      bh
    );
  }

  _createSmallTopButton(w, h, label, fontPx, onClick) {
    const s = this.uiScale;
    const c = this.add.container(0, 0);
    const bg = this.add.graphics();
    bg.fillStyle(UI.PANEL_BG, 0.9);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 3 * s);
    bg.lineStyle(1.2 * s, UI.PANEL_BORDER, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 3 * s);

    const txt = this.add
      .text(0, 0, label, pixelTextStyle(fontPx, '#fff6e0'))
      .setOrigin(0.5);

    const zone = this.add
      .zone(0, 0, w + 6 * s, h + 6 * s)
      .setOrigin(0.5)
      .setInteractive();

    zone.on('pointerdown', (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      AudioManager.playSfx(ASSET_KEYS.SFX_UI_SELECT);
      onClick();
    });

    c.add([bg, txt, zone]);
    c._btnWidth = w;
    c._btnHeight = h;
    c._txt = txt;
    return c;
  }

  _updateAudioPopoverLabels() {
    const cfg = AudioManager.getSettings();
    const musicPct = Math.round(cfg.musicLevel * 100);
    const sfxPct = Math.round(cfg.sfxLevel * 100);
    if (this.btnAudio?._txt) {
      this.btnAudio._txt.setText(cfg.muted ? 'Mute▾' : 'Suara▾');
      this.btnAudio._txt.setColor(cfg.muted ? '#ff9b85' : '#fff6e0');
    }
    if (this.btnPopMute?._txt) {
      this.btnPopMute._txt.setText(
        cfg.muted ? 'Suara: MUTE' : 'Suara: AKTIF'
      );
      this.btnPopMute._txt.setColor(cfg.muted ? '#ff9b85' : '#a8f0a0');
    }
    if (this.btnPopMusic?._txt) {
      this.btnPopMusic._txt.setText(`Musik: ${musicPct}%`);
    }
    if (this.btnPopSfx?._txt) {
      this.btnPopSfx._txt.setText(`SFX: ${sfxPct}%`);
    }
  }

  _spawnFloatingText(x, y, text, color = '#ffd866') {
    const s = this.uiScale || 1;
    const fontPx = Math.max(11, Math.round(6.8 * s));
    const floater = this.add
      .text(x, y, text, pixelTextStyle(fontPx, color))
      .setOrigin(0.5)
      .setDepth(420);

    this.tweens.add({
      targets: floater,
      y: y - 18 * s,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        floater.destroy();
      },
    });
  }

  _highlightToolSlot(activeIdx) {
    const s = this.uiScale || 1;
    this.toolSlots.forEach((slot, idx) => {
      const { bg, slotW, slotH } = slot;
      const isActive = idx === activeIdx;
      bg.clear();
      bg.fillStyle(isActive ? UI.PANEL_INNER : UI.SLOT_BG, 0.92);
      bg.fillRoundedRect(-slotW / 2, -slotH / 2, slotW, slotH, 4 * s);
      bg.lineStyle(
        (isActive ? 2 : 1) * s,
        isActive ? UI.SLOT_ACTIVE_BORDER : UI.PANEL_BORDER,
        1
      );
      bg.strokeRoundedRect(-slotW / 2, -slotH / 2, slotW, slotH, 4 * s);
    });
  }

  /**
   * Repositions top HUD, bottom toolbar, and prompts whenever the viewport resizes/rotates.
   * Rebuilds HUD if the integer `uiScale` changes, and prevents top/bottom bar overlap in portrait mode.
   */
  _relayout(width, height) {
    const w = width || GAME.WIDTH;
    const h = height || GAME.HEIGHT;
    this.viewWidth = w;
    this.viewHeight = h;

    const newScale = getUiScale(w, h);
    if (newScale !== this.uiScale) {
      this.uiScale = newScale;
      this._buildHudElements();
      this._syncInitialHud();
    }

    const s = this.uiScale;
    const safeX = UI.SAFE_MARGIN_X * s;
    const safeY = UI.SAFE_MARGIN_Y * s;

    if (this.topLeftGroup) {
      this.topLeftGroup.setPosition(safeX, safeY);
    }

    // In narrow/portrait orientation, stack top-right utility buttons on a second row so they never overlap top-left bar
    const isNarrowTop = w < 410 * s;
    const topBtnY = isNarrowTop ? safeY + 31 * s : safeY + 10 * s;
    if (this.btnMenu) {
      this.btnMenu.setPosition(w - safeX - 19 * s, topBtnY);
    }
    if (this.btnTileset) {
      this.btnTileset.setPosition(w - safeX - 63 * s, topBtnY);
    }
    if (this.btnAudio) {
      this.btnAudio.setPosition(w - safeX - 110 * s, topBtnY);
    }
    if (this.audioPopover) {
      this.audioPopover.setPosition(w - safeX, topBtnY + 11 * s);
    }
    if (this.debugGroup) {
      this.debugGroup.setPosition(w - safeX - 114 * s, topBtnY + 19 * s);
    }

    // In narrow/portrait orientation, lift the bottom-center toolbar above the corner touch controls
    const isNarrowBottom = w < 380 * s;
    const toolbarY = isNarrowBottom
      ? h - safeY - 96 * s - this.toolbarSlotH / 2
      : h - safeY - this.toolbarSlotH / 2;

    if (this.toolSlots && this.toolSlots.length > 0) {
      const startX = (w - this.toolbarTotalW) / 2;
      this.toolSlots.forEach((slot, idx) => {
        const x =
          startX +
          idx * (this.toolbarSlotW + this.toolbarGap) +
          this.toolbarSlotW / 2;
        slot.container.setPosition(x, toolbarY);
      });
    }

    if (this.hintText) {
      this.hintText.setPosition(
        w / 2,
        toolbarY - this.toolbarSlotH / 2 - 9 * s
      );
    }
    if (this.toastText) {
      this.toastText.setPosition(
        w / 2,
        isNarrowTop ? safeY + 50 * s : safeY + 31 * s
      );
    }
    if (this.touchControls) {
      this.touchControls.relayout(w, h);
    }
    if (this.shopModal) {
      this.shopModal.relayout(w, h);
    }
  }

  _syncInitialHud() {
    const gs = this.gameScene?.gameState;
    if (!gs) return;

    if (this.gameScene?.timeSystem) {
      const snap = this.gameScene.timeSystem.getSnapshot();
      if (this.timeText && snap?.formatted) {
        this.timeText.setText(snap.formatted);
      }
    }
    if (this.coinText) {
      this.coinText.setText(`${gs.coins ?? 0}G`);
    }
    this._lastCoins = gs.coins ?? 0;
    const seedId = gs.selectedSeedId || SEED_ITEM_IDS[0];
    this._updateSeedDisplay(seedId, gs.inventory?.[seedId] ?? 0);
    this._updateStorageDisplay(gs.inventory || {}, gs.inventorySlots || []);
  }

  _updateSeedDisplay(seedId, stockCount) {
    const seedItem = ITEMS[seedId];
    const badgeKey = seedItem?.badgeKey || cropStageKey('parsnip', 5);

    if (this.activeSeedIcon) {
      this.activeSeedIcon.setTexture(badgeKey);
    }
    if (this.activeSeedText) {
      this.activeSeedText.setText(`x${stockCount}`);
    }
    if (this.seedSlotBadge) {
      this.seedSlotBadge.setTexture(badgeKey);
    }
    if (this.seedSlotCount) {
      this.seedSlotCount.setText(String(stockCount));
    }
  }

  _updateStorageDisplay(inventory, slotsArg) {
    const gs = this.gameScene?.gameState;
    const inv = inventory || gs?.inventory || {};
    const slots = Array.isArray(slotsArg)
      ? slotsArg
      : gs?.inventorySlots || [];

    let usedSlots = 0;
    if (this.inventorySlotCells) {
      for (let i = 0; i < this.inventorySlotCells.length; i += 1) {
        const cell = this.inventorySlotCells[i];
        const slot = slots[i];
        const item = slot && slot.itemId ? ITEMS[slot.itemId] : null;
        if (item && slot.count > 0) {
          usedSlots += 1;
          cell.icon.setTexture(item.iconKey);
          if (item.tint) {
            cell.icon.setTint(item.tint);
          } else {
            cell.icon.clearTint();
          }
          cell.icon.setVisible(true);
          if (item.badgeKey) {
            cell.badge.setTexture(item.badgeKey);
            cell.badge.setVisible(true);
          } else {
            cell.badge.setVisible(false);
          }
          cell.countText.setText(String(slot.count));
          cell.countText.setVisible(true);
        } else {
          cell.icon.setVisible(false);
          cell.badge.setVisible(false);
          cell.countText.setVisible(false);
        }
      }
    }

    if (this.totalHarvestText) {
      this.totalHarvestText.setText(`${usedSlots}/${INVENTORY.MAX_SLOTS}▾`);
    }

    if (gs) {
      const seedId = gs.selectedSeedId || SEED_ITEM_IDS[0];
      this._updateSeedDisplay(seedId, inv[seedId] || 0);
    }
  }

  _showToast(message) {
    if (!this.toastText) return;
    const singleLine = String(message || '').replace(/\s+/g, ' ').trim();
    this._currentToast = singleLine;
    this.toastText.setText(singleLine);
    this.toastText.setVisible(Boolean(singleLine));
    this.toastText.setAlpha(1);

    if (this._toastTimer) this._toastTimer.remove(false);
    this._toastTimer = this.time.delayedCall(1900, () => {
      this._currentToast = '';
      if (this.toastText) this.toastText.setVisible(false);
    });
  }

  _bindEvents() {
    this._onToolChanged = (tool, idx) => {
      this._highlightToolSlot(idx);
      this._showToast(`Alat: ${tool.name}`);
    };
    this._onHint = (text) => {
      const singleLine = String(text || '').replace(/\s+/g, ' ').trim();
      this._currentHint = singleLine;
      if (!this.hintText) return;
      this.hintText.setText(singleLine);
      this.hintText.setVisible(
        Boolean(singleLine) && !(this.shopModal && this.shopModal.isOpen)
      );
    };
    this._onToast = (msg) => this._showToast(msg);
    this._onTimeUpdated = (snapshot) => {
      if (this.timeText && snapshot?.formatted) {
        this.timeText.setText(snapshot.formatted);
      }
    };
    this._onSeedChanged = (seedId, stockCount) => {
      this._updateSeedDisplay(seedId, stockCount);
      const seedName = ITEMS[seedId]?.name || 'Bibit';
      this._showToast(`${seedName} (${stockCount})`);
    };
    this._onInventoryUpdated = (inventory, slots) => {
      this._updateStorageDisplay(inventory, slots);
      if (this.shopModal && this.shopModal.isOpen) {
        this.shopModal.refresh();
      }
    };
    this._onItemAdded = (payload) => {
      if (!payload || !payload.itemId || !(payload.added > 0)) return;
      const item = ITEMS[payload.itemId];
      if (!item) return;
      const s = this.uiScale || 1;
      const fx = (UI.SAFE_MARGIN_X + 216) * s;
      const fy = (UI.SAFE_MARGIN_Y + 22) * s;
      this._spawnFloatingText(fx, fy, `+${payload.added} ${item.name}`, '#a8f0a0');
    };
    this._onCoinsChanged = (coins) => {
      if (this.coinText) {
        this.coinText.setText(`${coins}G`);
      }
      if (
        Number.isFinite(this._lastCoins) &&
        Number.isFinite(coins) &&
        coins !== this._lastCoins
      ) {
        const diff = coins - this._lastCoins;
        const s = this.uiScale || 1;
        const fx =
          this.shopModal && this.shopModal.isOpen
            ? this.viewWidth / 2
            : (UI.SAFE_MARGIN_X + 150) * s;
        const fy =
          this.shopModal && this.shopModal.isOpen
            ? this.viewHeight / 2 - 70 * s
            : (UI.SAFE_MARGIN_Y + 22) * s;
        this._spawnFloatingText(
          fx,
          fy,
          diff > 0 ? `+${diff}G` : `${diff}G`,
          diff > 0 ? '#ffd866' : '#ff9b85'
        );
      }
      this._lastCoins = coins;
      if (this.shopModal && this.shopModal.isOpen) {
        this.shopModal.refresh();
      }
    };
    this._onAudioSettingsChanged = () => {
      this._updateAudioPopoverLabels();
    };
    this._onFishingState = (payload) => {
      if (!this.fishingAlertGroup) return;
      if (payload && payload.state === 'bite') {
        const s = this.uiScale || 1;
        const px = Phaser.Math.Clamp(
          payload.screenX || this.viewWidth / 2,
          50 * s,
          this.viewWidth - 50 * s
        );
        const py = Phaser.Math.Clamp(
          (payload.screenY || this.viewHeight / 2) - 10 * s,
          36 * s,
          this.viewHeight - 50 * s
        );
        this.fishingAlertGroup.setPosition(Math.round(px), Math.round(py));
        this._drawFishingBar(payload.biteProgress ?? 1);
        this.fishingAlertGroup.setVisible(true);
      } else {
        this.fishingAlertGroup.setVisible(false);
      }
    };
    this._onOpenShop = (mode) => {
      this.storageOpen = false;
      this.audioOpen = false;
      if (this.storageDrawer) {
        this.storageDrawer.setVisible(false);
      }
      if (this.audioPopover) {
        this.audioPopover.setVisible(false);
      }
      if (this.fishingAlertGroup) {
        this.fishingAlertGroup.setVisible(false);
      }
      if (this.hintText) {
        this.hintText.setVisible(false);
      }
      if (this.touchControls) {
        this.touchControls.setVisible(false);
      }
      if (this.shopModal) {
        this.shopModal.open(mode);
      }
    };
    this._onCloseShop = () => {
      if (this.shopModal && this.shopModal.isOpen) {
        this.shopModal.close(false);
      }
      if (this.touchControls && this.touchControls.isTouchDevice) {
        this.touchControls.setVisible(true);
      }
      if (this.hintText && this._currentHint) {
        this.hintText.setVisible(true);
      }
    };
    this._onResize = (gameSize) => {
      const w = gameSize?.width || this.scale?.width || GAME.WIDTH;
      const h = gameSize?.height || this.scale?.height || GAME.HEIGHT;
      this._relayout(w, h);
    };

    eventBus.on(EVENTS.TOOL_CHANGED, this._onToolChanged);
    eventBus.on(EVENTS.INTERACTION_HINT, this._onHint);
    eventBus.on(EVENTS.TOAST_MESSAGE, this._onToast);
    eventBus.on(EVENTS.TIME_UPDATED, this._onTimeUpdated);
    eventBus.on(EVENTS.SEED_CHANGED, this._onSeedChanged);
    eventBus.on(EVENTS.INVENTORY_UPDATED, this._onInventoryUpdated);
    eventBus.on(EVENTS.INVENTORY_ITEM_ADDED, this._onItemAdded);
    eventBus.on(EVENTS.COINS_CHANGED, this._onCoinsChanged);
    eventBus.on(EVENTS.AUDIO_SETTINGS_CHANGED, this._onAudioSettingsChanged);
    eventBus.on(EVENTS.FISHING_STATE_CHANGED, this._onFishingState);
    eventBus.on(EVENTS.OPEN_SHOP, this._onOpenShop);
    eventBus.on(EVENTS.CLOSE_SHOP, this._onCloseShop);
    this.scale.on(Phaser.Scale.Events.RESIZE, this._onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventBus.off(EVENTS.TOOL_CHANGED, this._onToolChanged);
      eventBus.off(EVENTS.INTERACTION_HINT, this._onHint);
      eventBus.off(EVENTS.TOAST_MESSAGE, this._onToast);
      eventBus.off(EVENTS.TIME_UPDATED, this._onTimeUpdated);
      eventBus.off(EVENTS.SEED_CHANGED, this._onSeedChanged);
      eventBus.off(EVENTS.INVENTORY_UPDATED, this._onInventoryUpdated);
      eventBus.off(EVENTS.INVENTORY_ITEM_ADDED, this._onItemAdded);
      eventBus.off(EVENTS.COINS_CHANGED, this._onCoinsChanged);
      eventBus.off(EVENTS.AUDIO_SETTINGS_CHANGED, this._onAudioSettingsChanged);
      eventBus.off(EVENTS.FISHING_STATE_CHANGED, this._onFishingState);
      eventBus.off(EVENTS.OPEN_SHOP, this._onOpenShop);
      eventBus.off(EVENTS.CLOSE_SHOP, this._onCloseShop);
      this.scale.off(Phaser.Scale.Events.RESIZE, this._onResize);
      if (this.touchControls) this.touchControls.destroy();
      if (this.shopModal) this.shopModal.destroy();
    });
  }
}
