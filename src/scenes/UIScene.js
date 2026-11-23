import Phaser from 'phaser';
import { ASSET_KEYS, cropStageKey } from '../data/assetKeys.js';
import {
  GAME,
  getUiScale,
  INPUT,
  INVENTORY,
  isDebugModeEnabled,
  SCENE_KEYS,
  UI,
} from '../data/gameConfig.js';
import { ITEMS, SEED_ITEM_IDS, TOOL_IDS, TOOLS } from '../data/items.js';
import { AudioManager } from '../systems/AudioManager.js';
import { eventBus, EVENTS } from '../systems/EventBus.js';
import { pixelTextStyle } from '../systems/FontLoader.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { ShopModal } from '../ui/ShopModal.js';
import { TouchControls } from '../ui/TouchControls.js';

/**
 * UIScene: Parallel overlay scene rendered at native physical screen resolution
 * using integer `uiScale = getUiScale(height)`:
 * - Single compact top row: Day/Time/Phase, Coins, active seed badge, and a collapsible
 *   24-slot (6x4) compact inventory drawer toggle (plus Audio & Menu buttons at top-right)
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
    this._leavingScene = false;
    this._currentHint = '';
    this._currentToast = '';
    this.weatherRaining = false;
    this._lastTimeSnapshot = null;
    this._currentQuestTracker = '';
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
    this.dialogueBox = new DialogueBox(this);

    this._relayout(this.viewWidth, this.viewHeight);
    this._bindEvents();
    this._syncInitialHud();
  }

  /**
   * Leaves gameplay to another scene (Menu). Guards against double taps
   * and never lets a save/cleanup error abort the scene transition.
   */
  _leaveToScene(targetSceneKey, data = undefined) {
    if (this._leavingScene) return;
    this._leavingScene = true;
    try {
      if (this.gameScene && this.gameScene.flushSaveIfActive) {
        this.gameScene.flushSaveIfActive();
      }
    } catch (err) {
      console.error('[UIScene] save before leave failed', err);
    }
    if (this.touchControls && this.gameScene?.inputSystem) {
      try {
        this.gameScene.inputSystem.setTouchVector(0, 0);
      } catch {
        // ignore
      }
    }
    try {
      this.scene.stop(SCENE_KEYS.GAME);
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(targetSceneKey, data);
    } catch (err) {
      console.error('[UIScene] scene transition failed', err);
      this._leavingScene = false;
    }
  }

  _buildHudElements() {
    if (this._debugAudioTimer) {
      this._debugAudioTimer.remove(false);
      this._debugAudioTimer = null;
    }
    if (this.hudRoot) {
      this.hudRoot.destroy(true);
    }
    this.hudRoot = this.add.container(0, 0).setDepth(100);

    const s = this.uiScale;
    const F = UI.FONT || {};
    const fontMain = Math.max(
      F.MIN_HUD_MAIN_PX || 24,
      Math.round((F.HUD_MAIN || 13) * s)
    );
    const fontSmall = Math.max(
      F.MIN_HUD_SMALL_PX || 22,
      Math.round((F.HUD_SMALL || 12) * s)
    );
    const fontSlot = Math.max(
      F.MIN_HUD_SLOT_PX || 20,
      Math.round((F.HUD_SLOT || 11) * s)
    );
    this._timeFontMainPx = fontMain;
    this._timeFontSmallPx = fontSmall;
    const fontBtnSm = Math.max(
      F.MIN_BUTTON_SM_PX || 26,
      Math.round((F.BUTTON_SM || 13) * s)
    );
    const fontToast = Math.max(
      F.MIN_TOAST_PX || 28,
      Math.round((F.TOAST || 14) * s)
    );
    const fontHint = Math.max(
      F.MIN_HINT_PX || 26,
      Math.round((F.HINT || 14) * s)
    );
    const fontFishing = Math.max(
      F.MIN_FISHING_ALERT_PX || 28,
      Math.round((F.FISHING_ALERT || 15) * s)
    );
    const fontDebug = Math.max(
      F.MIN_DEBUG_PX || 20,
      Math.round((F.DEBUG_OVERLAY || 11) * s)
    );
    const strokePx = Math.max(2, Math.round(1.2 * s));

    // --- 1. Single-row Top-Left Status Bar (Day/Time • Coins • Active Seed • Tas X/12 toggle) ---
    this.topLeftGroup = this.add.container(0, 0);
    const barW = 316 * s;
    const barH = 24 * s;

    const bar = this.add.graphics();
    bar.fillStyle(UI.PANEL_BG, 0.94);
    bar.fillRoundedRect(0, 0, barW, barH, 4 * s);
    bar.lineStyle(1.5 * s, UI.PANEL_BORDER, 1);
    bar.strokeRoundedRect(0, 0, barW, barH, 4 * s);

    const cy = barH / 2;

    const clockIcon = this.add
      .image(11 * s, cy, ASSET_KEYS.ICON_STOPWATCH)
      .setOrigin(0.5)
      .setScale(1.1 * s);

    this.timeText = this.add
      .text(
        21 * s,
        cy,
        'Hari 1 • 06:00 (Pagi)',
        pixelTextStyle(fontMain, '#fff6e0', {
          stroke: '#120b07',
          strokeThickness: strokePx,
        })
      )
      .setOrigin(0, 0.5);

    // Satu baris tracker quest tepat di bawah bar waktu (font kecil, tanpa panel).
    this.questText = this.add
      .text(
        2 * s,
        barH + 3 * s,
        this._currentQuestTracker,
        pixelTextStyle(fontSmall, '#ffe8a3', {
          stroke: '#120b07',
          strokeThickness: strokePx,
        })
      )
      .setOrigin(0, 0)
      .setVisible(Boolean(this._currentQuestTracker));

    // Crisp pixel coin icon + Coin counter
    const coinX = 172 * s;
    const coinGfx = this.add.graphics();
    coinGfx.fillStyle(0xf7d560, 1);
    coinGfx.fillCircle(coinX, cy, 4.5 * s);
    coinGfx.lineStyle(1.2 * s, 0x9c6b1c, 1);
    coinGfx.strokeCircle(coinX, cy, 4.5 * s);

    const startCoins = this.gameScene?.gameState?.coins ?? 50;
    this.coinText = this.add
      .text(
        coinX + 7 * s,
        cy,
        `${startCoins}G`,
        pixelTextStyle(fontMain, '#ffd866', {
          stroke: '#120b07',
          strokeThickness: strokePx,
        })
      )
      .setOrigin(0, 0.5);

    // Compact active seed icon + stock count inside the same top row
    const seedX = 218 * s;
    this.activeSeedIcon = this.add
      .image(seedX, cy, cropStageKey('parsnip', 5))
      .setOrigin(0.5)
      .setScale(0.95 * s);
    this.activeSeedText = this.add
      .text(
        seedX + 8 * s,
        cy,
        'x5',
        pixelTextStyle(fontSmall, '#a8f0a0', {
          stroke: '#120b07',
          strokeThickness: strokePx,
        })
      )
      .setOrigin(0, 0.5);

    // Compact Inventory Slot Grid toggle button at the right end of the top row
    const bagX = 252 * s;
    const bagW = 60 * s;
    const bagH = 19 * s;
    const bagBg = this.add.graphics();
    bagBg.fillStyle(UI.PANEL_INNER, 0.96);
    bagBg.fillRoundedRect(bagX, cy - bagH / 2, bagW, bagH, 3 * s);
    bagBg.lineStyle(1.2 * s, UI.PANEL_BORDER, 0.95);
    bagBg.strokeRoundedRect(bagX, cy - bagH / 2, bagW, bagH, 3 * s);

    const basketIcon = this.add
      .image(bagX + 9 * s, cy, ASSET_KEYS.ICON_BASKET)
      .setOrigin(0.5)
      .setScale(0.9 * s);
    this.totalHarvestText = this.add
      .text(
        bagX + 17 * s,
        cy,
        `0/${INVENTORY.MAX_SLOTS}▾`,
        pixelTextStyle(fontSmall, '#fff6e0', {
          stroke: '#120b07',
          strokeThickness: strokePx,
        })
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

    // Collapsible inventory drawer (6 columns x 4 rows, vertically scrollable when space is tight)
    this.storageDrawer = this.add
      .container(0, barH + 4 * s)
      .setVisible(this.storageOpen);

    const metrics = this._computeDrawerMetrics();
    const cols = metrics.cols;
    const cellS = metrics.cellS;
    const cellGap = metrics.cellGap;
    const padX = metrics.padX;
    const padY = metrics.padY;

    this._drawerScrollY = 0;
    this._drawerDrag = null;

    // Panel background + scrollbar stay fixed; only the slot grid scrolls.
    this.drawerPanel = this.add.graphics();
    this.drawerScrollbar = this.add.graphics();
    this.drawerContent = this.add.container(0, -this._drawerScrollY);
    this.drawerDragZone = this.add
      .zone(0, 0, metrics.width, metrics.height)
      .setOrigin(0, 0)
      .setInteractive();
    this.drawerDragZone.on('pointerdown', (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      this._drawerDrag = {
        pointerId: pointer.id,
        startY: pointer.y,
        startScroll: this._drawerScrollY || 0,
      };
    });

    if (this.drawerMaskGfx) {
      this.drawerMaskGfx.destroy();
      this.drawerMaskGfx = null;
    }
    this.drawerMaskGfx = this.make.graphics({ x: 0, y: 0, add: false });
    this.drawerMask = this.drawerMaskGfx.createGeometryMask();
    this.drawerContent.setMask(this.drawerMask);

    this.storageDrawer.add([
      this.drawerPanel,
      this.drawerContent,
      this.drawerScrollbar,
      this.drawerDragZone,
    ]);

    this.inventorySlotCells = [];
    for (let i = 0; i < INVENTORY.MAX_SLOTS; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = padX + col * (cellS + cellGap) + cellS / 2;
      const rcy = padY + row * (cellS + cellGap) + cellS / 2;

      const cellBg = this.add.graphics();
      cellBg.fillStyle(UI.SLOT_BG, 0.92);
      cellBg.fillRoundedRect(
        cx - cellS / 2,
        rcy - cellS / 2,
        cellS,
        cellS,
        3 * s
      );
      cellBg.lineStyle(1.1 * s, UI.PANEL_BORDER, 0.8);
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
        .setScale(0.95 * s)
        .setVisible(false);

      const badge = this.add
        .image(cx + 5 * s, rcy - 5 * s, cropStageKey('parsnip', 5))
        .setOrigin(0.5)
        .setScale(0.65 * s)
        .setVisible(false);

      const countText = this.add
        .text(
          cx + cellS / 2 - 2 * s,
          rcy + cellS / 2 - 1 * s,
          '',
          pixelTextStyle(fontSlot, '#fff6e0', {
            stroke: '#120b07',
            strokeThickness: strokePx,
          })
        )
        .setOrigin(1, 1)
        .setVisible(false);

      this.drawerContent.add([cellBg, icon, badge, countText]);
      this.inventorySlotCells.push({ cellBg, icon, badge, countText });
    }

    this._layoutStorageDrawer();

    this.topLeftGroup.add([
      bar,
      clockIcon,
      this.timeText,
      this.questText,
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

    // --- 2. Top-Right Utility Buttons (Audio▾ & Menu) + Collapsible Audio Popover ---
    const initAudio = AudioManager.getSettings();
    const topBtnH = 22 * s;
    this.btnAudio = this._createSmallTopButton(
      54 * s,
      topBtnH,
      initAudio.muted ? 'Mute▾' : 'Suara▾',
      fontBtnSm,
      () => {
        this.audioOpen = !this.audioOpen;
        if (this.audioPopover) {
          this.audioPopover.setVisible(this.audioOpen);
        }
      }
    );

    this.btnMenu = this._createSmallTopButton(
      46 * s,
      topBtnH,
      'Menu',
      fontBtnSm,
      () => {
        this._leaveToScene(SCENE_KEYS.MENU);
      }
    );

    // Collapsible Audio Settings Popover (Mute, BGM, Ambience, SFX)
    this.audioPopover = this.add.container(0, 0).setVisible(this.audioOpen);
    const popW = 104 * s;
    const popBtnH = 19 * s;
    const popGap = 4 * s;
    const popH = 4 * popBtnH + 3 * popGap + 10 * s;
    const popBg = this.add.graphics();
    popBg.fillStyle(UI.PANEL_BG, 0.97);
    popBg.fillRoundedRect(-popW, 0, popW, popH, 4 * s);
    popBg.lineStyle(1.4 * s, UI.PANEL_BORDER, 0.95);
    popBg.strokeRoundedRect(-popW, 0, popW, popH, 4 * s);

    this.btnPopMute = this._createSmallTopButton(
      popW - 10 * s,
      popBtnH,
      '',
      fontSmall,
      () => {
        AudioManager.toggleMute();
        this._updateAudioPopoverLabels();
      }
    );
    this.btnPopMute.setPosition(-popW / 2, 5 * s + popBtnH / 2);

    this.btnPopMusic = this._createSmallTopButton(
      popW - 10 * s,
      popBtnH,
      '',
      fontSmall,
      () => {
        AudioManager.cycleMusicLevel(1);
        this._updateAudioPopoverLabels();
      }
    );
    this.btnPopMusic.setPosition(
      -popW / 2,
      5 * s + popBtnH / 2 + (popBtnH + popGap)
    );

    this.btnPopAmbience = this._createSmallTopButton(
      popW - 10 * s,
      popBtnH,
      '',
      fontSmall,
      () => {
        AudioManager.cycleAmbienceLevel(1);
        this._updateAudioPopoverLabels();
      }
    );
    this.btnPopAmbience.setPosition(
      -popW / 2,
      5 * s + popBtnH / 2 + (popBtnH + popGap) * 2
    );

    this.btnPopSfx = this._createSmallTopButton(
      popW - 10 * s,
      popBtnH,
      '',
      fontSmall,
      () => {
        AudioManager.cycleSfxLevel(1);
        this._updateAudioPopoverLabels();
      }
    );
    this.btnPopSfx.setPosition(
      -popW / 2,
      5 * s + popBtnH / 2 + (popBtnH + popGap) * 3
    );

    this.audioPopover.add([
      popBg,
      this.btnPopMute,
      this.btnPopMusic,
      this.btnPopAmbience,
      this.btnPopSfx,
    ]);
    this._updateAudioPopoverLabels();

    this.hudRoot.add([
      this.btnAudio,
      this.btnMenu,
      this.audioPopover,
    ]);

    // --- 3. Bottom-Center Toolbar ---
    const slotW = 34 * s;
    const slotH = 32 * s;
    const gap = 4.5 * s;
    this.toolbarTotalW = TOOLS.length * slotW + (TOOLS.length - 1) * gap;
    this.toolbarSlotW = slotW;
    this.toolbarSlotH = slotH;
    this.toolbarGap = gap;
    this.toolSlots = [];

    TOOLS.forEach((tool, idx) => {
      const c = this.add.container(0, 0);
      const bg = this.add.graphics();
      const icon = this.add
        .image(0, -3 * s, tool.iconKey)
        .setOrigin(0.5)
        .setScale(1.1 * s);
      const lbl = this.add
        .text(
          0,
          10 * s,
          tool.shortLabel,
          pixelTextStyle(fontSlot, '#fff6e0', {
            stroke: '#120b07',
            strokeThickness: strokePx,
          })
        )
        .setOrigin(0.5);
      const num = this.add
        .text(
          -slotW / 2 + 2.5 * s,
          -slotH / 2 + 1.5 * s,
          String(idx + 1),
          pixelTextStyle(fontSlot, '#d9c4a9', {
            stroke: '#120b07',
            strokeThickness: strokePx,
          })
        )
        .setOrigin(0, 0);

      const children = [bg, icon, lbl, num];

      if (tool.id === TOOL_IDS.SEEDS) {
        this.seedSlotBadge = this.add
          .image(6 * s, -6 * s, cropStageKey('parsnip', 5))
          .setOrigin(0.5)
          .setScale(0.75 * s);
        this.seedSlotCount = this.add
          .text(
            slotW / 2 - 2 * s,
            -slotH / 2 + 1.5 * s,
            '5',
            pixelTextStyle(fontSlot, '#a8f0a0', {
              stroke: '#120b07',
              strokeThickness: strokePx,
            })
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
        pixelTextStyle(fontHint, '#ffd866', {
          stroke: '#120b07',
          strokeThickness: strokePx,
          backgroundColor: 'rgba(18,11,7,0.88)',
          padding: { x: 6 * s, y: 3 * s },
        })
      )
      .setOrigin(0.5)
      .setVisible(Boolean(this._currentHint));

    this.toastText = this.add
      .text(
        0,
        0,
        this._currentToast,
        pixelTextStyle(fontToast, '#a8f0a0', {
          stroke: '#120b07',
          strokeThickness: strokePx,
          backgroundColor: 'rgba(18,11,7,0.92)',
          padding: { x: 8 * s, y: 3.5 * s },
        })
      )
      .setOrigin(0.5)
      .setVisible(Boolean(this._currentToast));

    this.hudRoot.add([this.hintText, this.toastText]);

    // --- 5. Native-Resolution Fishing Bite / Reel Timing Indicator (above player) ---
    this.fishingAlertGroup = this.add.container(0, 0).setVisible(false);
    const alertW = 86 * s;
    const alertH = 26 * s;
    this.fishingAlertBg = this.add.graphics();
    this.fishingAlertBg.fillStyle(0x2a140d, 0.96);
    this.fishingAlertBg.fillRoundedRect(
      -alertW / 2,
      -alertH / 2,
      alertW,
      alertH,
      4 * s
    );
    this.fishingAlertBg.lineStyle(1.8 * s, 0xffd866, 1);
    this.fishingAlertBg.strokeRoundedRect(
      -alertW / 2,
      -alertH / 2,
      alertW,
      alertH,
      4 * s
    );

    const alertIcon = this.add
      .image(-alertW / 2 + 10 * s, -4 * s, ASSET_KEYS.ICON_ALERTED)
      .setOrigin(0.5)
      .setScale(1.3 * s);

    const alertLabel = this.add
      .text(
        6 * s,
        -4 * s,
        '! TARIK !',
        pixelTextStyle(fontFishing, '#ffd866', {
          stroke: '#120b07',
          strokeThickness: strokePx + 1,
        })
      )
      .setOrigin(0.5);

    this.fishingBarFill = this.add.graphics();
    this._fishingBarW = alertW - 12 * s;
    this._fishingBarH = 4.5 * s;
    this._fishingBarY = alertH / 2 - 6.5 * s;

    this.fishingAlertGroup.add([
      this.fishingAlertBg,
      alertIcon,
      alertLabel,
      this.fishingBarFill,
    ]);
    this.hudRoot.add(this.fishingAlertGroup);

    // --- 6. Hidden Debug Corner Buttons & Active Audio Overlay (ONLY when `?debug=1`) ---
    this.debugGroup = null;
    this.debugAudioText = null;
    if (isDebugModeEnabled()) {
      this.debugGroup = this.add.container(0, 0);
      const dbgBtnH = 18 * s;
      const btnCoins = this._createSmallTopButton(
        40 * s,
        dbgBtnH,
        '+100G',
        fontSlot,
        () => eventBus.emit(EVENTS.DEBUG_ADD_COINS)
      );
      const btnDay = this._createSmallTopButton(
        44 * s,
        dbgBtnH,
        'Hari+1',
        fontSlot,
        () => eventBus.emit(EVENTS.DEBUG_NEXT_DAY)
      );
      const btnSeeds = this._createSmallTopButton(
        42 * s,
        dbgBtnH,
        '+Bibit',
        fontSlot,
        () => eventBus.emit(EVENTS.DEBUG_FILL_SEEDS)
      );
      btnCoins.setPosition(20 * s, 0);
      btnDay.setPosition(66 * s, 0);
      btnSeeds.setPosition(113 * s, 0);

      this.debugAudioText = this.add
        .text(
          134 * s,
          12 * s,
          'AUDIO: memuat...',
          pixelTextStyle(fontDebug, '#e6f5d0', {
            stroke: '#0d0805',
            strokeThickness: strokePx,
            backgroundColor: 'rgba(14,9,6,0.88)',
            padding: { x: 4 * s, y: 2.5 * s },
          })
        )
        .setOrigin(1, 0);

      this.debugGroup.add([btnCoins, btnDay, btnSeeds, this.debugAudioText]);
      this.hudRoot.add(this.debugGroup);

      this._refreshDebugAudioOverlay();
      this._debugAudioTimer = this.time.addEvent({
        delay: 250,
        loop: true,
        callback: () => this._refreshDebugAudioOverlay(),
      });
    }
  }

  _refreshDebugAudioOverlay() {
    if (!this.debugAudioText) return;
    const snap = AudioManager.getActiveSoundsSnapshot();
    const mPct = Math.round((snap.musicLevel ?? 0) * 100);
    const aPct = Math.round((snap.ambienceLevel ?? 0) * 100);
    const sPct = Math.round((snap.sfxLevel ?? 0) * 100);
    const status = snap.muted ? 'MUTE' : 'ON';
    const lines = [`AUDIO [${status}] BGM:${mPct}% Alam:${aPct}% SFX:${sPct}%`];

    if (!snap.active || snap.active.length === 0) {
      lines.push('• (tidak ada suara aktif)');
    } else {
      for (let i = 0; i < snap.active.length; i += 1) {
        const it = snap.active[i];
        lines.push(`• ${it.category}: ${it.key} (vol ${it.volume.toFixed(2)})`);
      }
    }
    this.debugAudioText.setText(lines.join('\n'));
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
    bg.fillStyle(UI.PANEL_BG, 0.94);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 3.5 * s);
    bg.lineStyle(1.4 * s, UI.PANEL_BORDER, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 3.5 * s);

    const txt = this.add
      .text(
        0,
        0,
        label,
        pixelTextStyle(fontPx, '#fff6e0', {
          stroke: '#120b07',
          strokeThickness: Math.max(2, Math.round(1.2 * s)),
        })
      )
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
    const musicPct = Math.round((cfg.musicLevel ?? 0.75) * 100);
    const ambPct = Math.round((cfg.ambienceLevel ?? 0.5) * 100);
    const sfxPct = Math.round((cfg.sfxLevel ?? 0.75) * 100);
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
      this.btnPopMusic._txt.setText(`BGM: ${musicPct}%`);
    }
    if (this.btnPopAmbience?._txt) {
      this.btnPopAmbience._txt.setText(`Alam: ${ambPct}%`);
    }
    if (this.btnPopSfx?._txt) {
      this.btnPopSfx._txt.setText(`SFX: ${sfxPct}%`);
    }
  }

  _spawnFloatingText(x, y, text, color = '#ffd866') {
    const s = this.uiScale || 1;
    const F = UI.FONT || {};
    const fontPx = Math.max(
      F.MIN_FLOATING_PX || 26,
      Math.round((F.FLOATING || 14) * s)
    );
    const floater = this.add
      .text(
        x,
        y,
        text,
        pixelTextStyle(fontPx, color, {
          stroke: '#120b07',
          strokeThickness: Math.max(2, Math.round(1.3 * s)),
        })
      )
      .setOrigin(0.5)
      .setDepth(420);

    this.tweens.add({
      targets: floater,
      y: y - 20 * s,
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
      bg.fillStyle(isActive ? UI.PANEL_INNER : UI.SLOT_BG, 0.94);
      bg.fillRoundedRect(-slotW / 2, -slotH / 2, slotW, slotH, 4 * s);
      bg.lineStyle(
        (isActive ? 2 : 1.2) * s,
        isActive ? UI.SLOT_ACTIVE_BORDER : UI.PANEL_BORDER,
        1
      );
      bg.strokeRoundedRect(-slotW / 2, -slotH / 2, slotW, slotH, 4 * s);
    });
  }

  /**
   * Computes the drawer geometry in screen space: fixed 6 columns, slots never smaller than
   * `INVENTORY.SLOT_MIN_TOUCH_PX`, height capped above the joystick so the playfield stays usable.
   */
  _computeDrawerMetrics() {
    const s = this.uiScale;
    const safeX = UI.SAFE_MARGIN_X * s;
    const safeY = UI.SAFE_MARGIN_Y * s;
    const barH = 24 * s;
    // In narrow/portrait mode the Audio & Menu buttons move to a second row; start below them.
    const isNarrowTop = this.viewWidth < 500 * s;
    const localY = barH + 4 * s + (isNarrowTop ? 25 * s : 0);

    const cols = INVENTORY.COMPACT_COLS || 6;
    const rows =
      INVENTORY.COMPACT_ROWS || Math.ceil(INVENTORY.MAX_SLOTS / cols);
    const cellGap = 3.5 * s;
    const padX = 6 * s;
    const padY = 6 * s;

    const fitWidth = this.viewWidth - safeX * 2;
    const fitCell = Math.floor(
      (fitWidth - padX * 2 - (cols - 1) * cellGap) / cols
    );
    const baseCell = Math.round((INVENTORY.SLOT_CELL_SIZE || 26) * s);
    const cellS = Math.max(
      INVENTORY.SLOT_MIN_TOUCH_PX || 48,
      Math.min(baseCell, fitCell)
    );

    const width = padX * 2 + cols * cellS + (cols - 1) * cellGap;
    const contentHeight = padY * 2 + rows * cellS + (rows - 1) * cellGap;

    // Never cover the bottom-left joystick.
    const joystickTop =
      this.viewHeight -
      safeY -
      (INPUT.JOYSTICK_MARGIN_BOTTOM + INPUT.JOYSTICK_RADIUS) * s;
    const maxHeight = Math.max(
      cellS + padY * 2,
      joystickTop - (safeY + localY) - 6 * s
    );
    const height = Math.min(contentHeight, maxHeight);

    return {
      localY,
      width,
      height,
      contentHeight,
      cellS,
      cellGap,
      padX,
      padY,
      cols,
      rows,
    };
  }

  /**
   * True when the open inventory drawer covers the pointer, so touch input there scrolls
   * the drawer instead of spawning/driving the joystick underneath.
   */
  isPointerOverStorageDrawer(pointer) {
    if (!this.storageOpen || !this.drawerMetrics || !pointer) return false;
    const m = this.drawerMetrics;
    const s = this.uiScale;
    const x = UI.SAFE_MARGIN_X * s;
    const y = UI.SAFE_MARGIN_Y * s + m.localY;
    return (
      pointer.x >= x &&
      pointer.x <= x + m.width &&
      pointer.y >= y &&
      pointer.y <= y + m.height
    );
  }

  /**
   * Applies drawer geometry: positions it under the top bar, sizes the clip mask, and refreshes scroll.
   */
  _layoutStorageDrawer() {
    if (!this.storageDrawer) return;
    const s = this.uiScale;
    const m = this._computeDrawerMetrics();
    this.drawerMetrics = m;

    this.storageDrawer.setPosition(0, m.localY);

    this.drawerPanel.clear();
    this.drawerPanel.fillStyle(UI.PANEL_BG, 0.96);
    this.drawerPanel.fillRoundedRect(0, 0, m.width, m.height, 4 * s);
    this.drawerPanel.lineStyle(1.4 * s, UI.PANEL_BORDER, 0.95);
    this.drawerPanel.strokeRoundedRect(0, 0, m.width, m.height, 4 * s);

    this.drawerDragZone.setSize(m.width, m.height);
    if (this.drawerDragZone.input?.hitArea?.setTo) {
      this.drawerDragZone.input.hitArea.setTo(0, 0, m.width, m.height);
    }

    if (this.drawerMaskGfx) {
      const maskX = UI.SAFE_MARGIN_X * s;
      const maskY = UI.SAFE_MARGIN_Y * s + m.localY;
      this.drawerMaskGfx.clear();
      this.drawerMaskGfx.fillStyle(0xffffff, 1);
      this.drawerMaskGfx.fillRect(maskX, maskY, m.width, m.height);
    }

    this._setDrawerScroll(this._drawerScrollY || 0);
  }

  /**
   * Clamps vertical scroll offset and re-renders the drawer scrollbar thumb.
   */
  _setDrawerScroll(value) {
    const m = this.drawerMetrics;
    if (!m) return;
    const maxScroll = Math.max(0, m.contentHeight - m.height);
    this._drawerScrollY = Phaser.Math.Clamp(
      Math.round(Number(value) || 0),
      0,
      maxScroll
    );
    if (this.drawerContent) {
      this.drawerContent.setY(-this._drawerScrollY);
    }
    this._drawDrawerScrollbar();
  }

  _drawDrawerScrollbar() {
    if (!this.drawerScrollbar || !this.drawerMetrics) return;
    const m = this.drawerMetrics;
    const s = this.uiScale;
    const g = this.drawerScrollbar;
    g.clear();

    const maxScroll = m.contentHeight - m.height;
    if (maxScroll <= 0) return;

    const trackW = 3.5 * s;
    const trackX = m.width - trackW - 1.5 * s;
    const trackY = 3 * s;
    const trackH = m.height - 6 * s;
    g.fillStyle(UI.PANEL_INNER, 0.9);
    g.fillRoundedRect(trackX, trackY, trackW, trackH, trackW / 2);

    const ratio = m.height / m.contentHeight;
    const thumbH = Math.max(trackW * 2, trackH * ratio);
    const thumbY =
      trackY + (trackH - thumbH) * (this._drawerScrollY / maxScroll);
    g.fillStyle(UI.PANEL_BORDER, 0.95);
    g.fillRoundedRect(trackX, thumbY, trackW, thumbH, trackW / 2);
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
    this._layoutStorageDrawer();

    // In narrow/portrait orientation, stack top-right utility buttons on a second row so they never overlap top-left bar
    const isNarrowTop = w < 500 * s;
    const topBtnY = isNarrowTop ? safeY + 38 * s : safeY + 12 * s;
    if (this.btnMenu) {
      this.btnMenu.setPosition(w - safeX - 23 * s, topBtnY);
    }
    if (this.btnAudio) {
      // Menu is 46s wide; 4s gap; Suara is 54s wide → center at 46 + 4 + 27 = 77s
      this.btnAudio.setPosition(w - safeX - 77 * s, topBtnY);
    }
    if (this.audioPopover) {
      this.audioPopover.setPosition(w - safeX, topBtnY + 13 * s);
    }
    if (this.debugGroup) {
      this.debugGroup.setPosition(w - safeX - 134 * s, topBtnY + 23 * s);
    }

    // In narrow/portrait orientation, lift the bottom-center toolbar above the corner touch controls
    const isNarrowBottom = w < 420 * s;
    const toolbarY = isNarrowBottom
      ? h - safeY - 98 * s - this.toolbarSlotH / 2
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
        toolbarY - this.toolbarSlotH / 2 - 12 * s
      );
    }
    if (this.toastText) {
      this.toastText.setPosition(
        w / 2,
        isNarrowTop ? safeY + 62 * s : safeY + 38 * s
      );
    }
    if (this.touchControls) {
      this.touchControls.relayout(w, h);
    }
    if (this.shopModal) {
      this.shopModal.relayout(w, h);
    }
    if (this.dialogueBox) {
      this.dialogueBox.relayout(w, h);
    }
  }

  /**
   * Renders the time bar label and appends a compact "Hujan" marker while it rains.
   * The font shrinks only if needed so the label never collides with the coin counter;
   * the bar itself keeps its size.
   */
  _refreshTimeLabel(snapshot = null) {
    if (!this.timeText) return;
    if (snapshot) this._lastTimeSnapshot = snapshot;
    const snap = this._lastTimeSnapshot;
    if (!snap || !snap.formatted) return;

    const label = this.weatherRaining
      ? `${snap.formatted} • Hujan`
      : snap.formatted;
    this.timeText.setText(label);

    const s = this.uiScale || 1;
    const mainPx = this._timeFontMainPx || 26;
    const smallPx = this._timeFontSmallPx || 22;
    const maxW = (172 - 21 - 6) * s;
    this.timeText.setFontSize(mainPx);
    if (this.timeText.width > maxW) {
      this.timeText.setFontSize(
        Math.max(smallPx, Math.round((mainPx * maxW) / this.timeText.width))
      );
    }
  }

  _syncInitialHud() {
    const gs = this.gameScene?.gameState;
    if (!gs) return;

    if (this.gameScene?.timeSystem) {
      const snap = this.gameScene.timeSystem.getSnapshot();
      if (snap?.formatted) this._refreshTimeLabel(snap);
    }
    if (this.coinText) {
      this.coinText.setText(`${gs.coins ?? 0}G`);
    }
    this._lastCoins = gs.coins ?? 0;
    const seedId = gs.selectedSeedId || SEED_ITEM_IDS[0];
    this._updateSeedDisplay(seedId, gs.inventory?.[seedId] ?? 0);
    this._updateStorageDisplay(gs.inventory || {}, gs.inventorySlots || []);
    this._updateQuestTracker(this.gameScene?.questSystem?.getTrackerText() || null);
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

  _updateQuestTracker(text) {
    this._currentQuestTracker = String(text || '').replace(/\s+/g, ' ').trim();
    if (!this.questText) return;

    this.questText.setText(this._currentQuestTracker);
    this.questText.setVisible(Boolean(this._currentQuestTracker));
    if (!this._currentQuestTracker) return;

    const s = this.uiScale || 1;
    const F = UI.FONT || {};
    const basePx = Math.max(
      F.MIN_HUD_SMALL_PX || 22,
      Math.round((F.HUD_SMALL || 12) * s)
    );
    this.questText.setFontSize(basePx);

    const maxW = this.viewWidth - UI.SAFE_MARGIN_X * 2 * s - 8 * s;
    if (maxW > 0 && this.questText.width > maxW) {
      this.questText.setFontSize(
        Math.max(16, Math.floor((basePx * maxW) / this.questText.width))
      );
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
        Boolean(singleLine) &&
          !(this.shopModal && this.shopModal.isOpen) &&
          !(this.dialogueBox && this.dialogueBox.isOpen)
      );
    };
    this._onToast = (msg) => this._showToast(msg);
    this._onTimeUpdated = (snapshot) => {
      if (snapshot?.formatted) this._refreshTimeLabel(snapshot);
    };
    this._onWeatherChanged = (payload) => {
      this.weatherRaining = Boolean(payload && payload.raining);
      this._refreshTimeLabel();
    };
    this._onRainWatered = () => {
      this._spawnFloatingText(
        this.viewWidth / 2,
        this.viewHeight * 0.38,
        'Hujan menyiram kebun',
        '#8fd0ff'
      );
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
    this._onCloseUiPanels = () => {
      this.storageOpen = false;
      if (this.storageDrawer) {
        this.storageDrawer.setVisible(false);
      }
      if (this.shopModal && this.shopModal.isOpen) {
        this.shopModal.close(false);
      }
    };
    this._onQuestStateChanged = (payload) => {
      this._updateQuestTracker(payload?.trackerText || null);
    };
    this._onQuestCompleted = (payload) => {
      const reward = Math.max(0, Math.floor(Number(payload?.rewardCoins) || 0));
      this._spawnFloatingText(
        this.viewWidth / 2,
        this.viewHeight * 0.42,
        `Quest selesai! +${reward}G`,
        '#ffd866'
      );
    };
    this._onResize = (gameSize) => {
      const w = gameSize?.width || this.scale?.width || GAME.WIDTH;
      const h = gameSize?.height || this.scale?.height || GAME.HEIGHT;
      this._relayout(w, h);
    };

    // Vertical scroll for the inventory drawer: touch/mouse drag inside it, plus wheel.
    this._onDrawerPointerMove = (pointer) => {
      const drag = this._drawerDrag;
      if (!drag || !pointer || pointer.id !== drag.pointerId) return;
      this._setDrawerScroll(drag.startScroll - (pointer.y - drag.startY));
    };
    this._onDrawerPointerUp = (pointer) => {
      if (this._drawerDrag && pointer.id === this._drawerDrag.pointerId) {
        this._drawerDrag = null;
      }
    };
    this._onDrawerWheel = (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.isPointerOverStorageDrawer(pointer)) return;
      this._setDrawerScroll((this._drawerScrollY || 0) + deltaY * 0.5);
    };
    this.input.on('pointermove', this._onDrawerPointerMove);
    this.input.on('pointerup', this._onDrawerPointerUp);
    this.input.on('pointerupoutside', this._onDrawerPointerUp);
    this.input.on('wheel', this._onDrawerWheel);

    eventBus.on(EVENTS.TOOL_CHANGED, this._onToolChanged);
    eventBus.on(EVENTS.INTERACTION_HINT, this._onHint);
    eventBus.on(EVENTS.TOAST_MESSAGE, this._onToast);
    eventBus.on(EVENTS.TIME_UPDATED, this._onTimeUpdated);
    eventBus.on(EVENTS.WEATHER_CHANGED, this._onWeatherChanged);
    eventBus.on(EVENTS.WEATHER_RAIN_WATERED, this._onRainWatered);
    eventBus.on(EVENTS.SEED_CHANGED, this._onSeedChanged);
    eventBus.on(EVENTS.INVENTORY_UPDATED, this._onInventoryUpdated);
    eventBus.on(EVENTS.INVENTORY_ITEM_ADDED, this._onItemAdded);
    eventBus.on(EVENTS.COINS_CHANGED, this._onCoinsChanged);
    eventBus.on(EVENTS.AUDIO_SETTINGS_CHANGED, this._onAudioSettingsChanged);
    eventBus.on(EVENTS.FISHING_STATE_CHANGED, this._onFishingState);
    eventBus.on(EVENTS.OPEN_SHOP, this._onOpenShop);
    eventBus.on(EVENTS.CLOSE_SHOP, this._onCloseShop);
    eventBus.on(EVENTS.CLOSE_UI_PANELS, this._onCloseUiPanels);
    eventBus.on(EVENTS.QUEST_STATE_CHANGED, this._onQuestStateChanged);
    eventBus.on(EVENTS.QUEST_COMPLETED, this._onQuestCompleted);
    this.scale.on(Phaser.Scale.Events.RESIZE, this._onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventBus.off(EVENTS.TOOL_CHANGED, this._onToolChanged);
      eventBus.off(EVENTS.INTERACTION_HINT, this._onHint);
      eventBus.off(EVENTS.TOAST_MESSAGE, this._onToast);
      eventBus.off(EVENTS.TIME_UPDATED, this._onTimeUpdated);
      eventBus.off(EVENTS.WEATHER_CHANGED, this._onWeatherChanged);
      eventBus.off(EVENTS.WEATHER_RAIN_WATERED, this._onRainWatered);
      eventBus.off(EVENTS.SEED_CHANGED, this._onSeedChanged);
      eventBus.off(EVENTS.INVENTORY_UPDATED, this._onInventoryUpdated);
      eventBus.off(EVENTS.INVENTORY_ITEM_ADDED, this._onItemAdded);
      eventBus.off(EVENTS.COINS_CHANGED, this._onCoinsChanged);
      eventBus.off(EVENTS.AUDIO_SETTINGS_CHANGED, this._onAudioSettingsChanged);
      eventBus.off(EVENTS.FISHING_STATE_CHANGED, this._onFishingState);
      eventBus.off(EVENTS.OPEN_SHOP, this._onOpenShop);
      eventBus.off(EVENTS.CLOSE_SHOP, this._onCloseShop);
      eventBus.off(EVENTS.CLOSE_UI_PANELS, this._onCloseUiPanels);
      eventBus.off(EVENTS.QUEST_STATE_CHANGED, this._onQuestStateChanged);
      eventBus.off(EVENTS.QUEST_COMPLETED, this._onQuestCompleted);
      this.scale.off(Phaser.Scale.Events.RESIZE, this._onResize);
      if (this.input) {
        this.input.off('pointermove', this._onDrawerPointerMove);
        this.input.off('pointerup', this._onDrawerPointerUp);
        this.input.off('pointerupoutside', this._onDrawerPointerUp);
        this.input.off('wheel', this._onDrawerWheel);
      }
      this._drawerDrag = null;
      if (this.drawerMaskGfx) {
        this.drawerMaskGfx.destroy();
        this.drawerMaskGfx = null;
        this.drawerMask = null;
      }
      if (this._debugAudioTimer) {
        this._debugAudioTimer.remove(false);
        this._debugAudioTimer = null;
      }
      if (this._toastTimer) {
        this._toastTimer.remove(false);
        this._toastTimer = null;
      }
      try {
        if (this.touchControls) this.touchControls.destroy();
      } catch (err) {
        console.error('[UIScene] touchControls.destroy failed', err);
      }
      try {
        if (this.shopModal) this.shopModal.destroy();
      } catch (err) {
        console.error('[UIScene] shopModal.destroy failed', err);
      }
      try {
        if (this.dialogueBox) this.dialogueBox.destroy();
      } catch (err) {
        console.error('[UIScene] dialogueBox.destroy failed', err);
      }
      this.touchControls = null;
      this.shopModal = null;
      this.dialogueBox = null;
      this.gameScene = null;
    });
  }
}
