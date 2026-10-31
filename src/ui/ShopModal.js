import Phaser from 'phaser';
import { ASSET_KEYS } from '../data/assetKeys.js';
import { GAME, getUiScale, INVENTORY, UI } from '../data/gameConfig.js';
import {
  ITEMS,
  SEED_ITEM_IDS,
  SELLABLE_ITEM_IDS,
} from '../data/items.js';
import { eventBus, EVENTS } from '../systems/EventBus.js';
import { pixelTextStyle } from '../systems/FontLoader.js';

/**
 * Reusable Shop & Shipping Box Modal (`ShopModal`) rendered in `UIScene` at native screen
 * resolution with integer `uiScale`:
 * - `mode === 'sell'` (Kotak Jual Panen & Ikan): lists sellable items (4 harvested crops +
 *   3 fish types) with owned count, sell price, "Jual 1" and "Semua" buttons per row, plus
 *   total value. Seeds (`canSell === false`) cannot be sold.
 * - `mode === 'buy'` (Kios Bibit Lembah): lists the 4 seeds with buy price, owned stock,
 *   and "Beli 1" / "Beli 5" buttons with live coin checks.
 * - Supports both Touch and Keyboard (`W`/`S` or Arrow Up/Down to select row, `1`/`Enter`
 *   for button 1, `2` for button 2, `ESC`/`Q` to close).
 */
export class ShopModal {
  constructor(uiScene) {
    this.scene = uiScene;
    this.isOpen = false;
    this.mode = 'buy'; // 'buy' | 'sell'
    this.selectedRowIndex = 0;
    this.scrollY = 0;
    this.maxScrollY = 0;
    this._listBounds = null;
    this._isDraggingList = false;
    this._dragMoved = false;
    this._dragStartY = 0;
    this._dragStartScrollY = 0;

    this.viewWidth = uiScene.scale?.width || GAME.WIDTH;
    this.viewHeight = uiScene.scale?.height || GAME.HEIGHT;
    this.uiScale = getUiScale(this.viewWidth, this.viewHeight);

    this.container = uiScene.add.container(0, 0).setDepth(350).setVisible(false);
    this._maskGfx = uiScene.make.graphics({ x: 0, y: 0, add: false });
    this._listMask = this._maskGfx.createGeometryMask();
    this._bindKeyboard();
    this._bindScrollInput();
  }

  open(mode = 'buy') {
    this.mode = mode === 'sell' ? 'sell' : 'buy';
    this.selectedRowIndex = 0;
    this.scrollY = 0;
    this.isOpen = true;
    this.container.setVisible(true);
    this.render();
  }

  close(emitEvent = true) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._isDraggingList = false;
    this.container.setVisible(false);
    if (emitEvent) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_CANCEL);
      eventBus.emit(EVENTS.CLOSE_SHOP);
    }
  }

  relayout(width, height) {
    this.viewWidth = width || GAME.WIDTH;
    this.viewHeight = height || GAME.HEIGHT;
    this.uiScale = getUiScale(this.viewWidth, this.viewHeight);
    if (this.isOpen) {
      this.render();
    }
  }

  refresh() {
    if (this.isOpen) {
      this.render();
    }
  }

  _getGameState() {
    return this.scene.gameScene?.gameState || null;
  }

  _getRowItemIds() {
    return this.mode === 'sell' ? SELLABLE_ITEM_IDS : SEED_ITEM_IDS;
  }

  _setScrollY(nextScrollY) {
    const clamped = Phaser.Math.Clamp(nextScrollY, 0, this.maxScrollY || 0);
    this.scrollY = Math.round(clamped);
    if (this.listContainer && this._listBounds) {
      this.listContainer.y = this._listBounds.y - this.scrollY;
    }
    this._updateScrollbarThumb();
  }

  _ensureRowVisible(rowIdx) {
    if (!this._listBounds || this.maxScrollY <= 0) return;
    const { rowStep, rowH, h: listH } = this._listBounds;
    const rowTop = rowIdx * rowStep;
    const rowBottom = rowTop + rowH;
    if (rowTop < this.scrollY) {
      this._setScrollY(rowTop);
    } else if (rowBottom > this.scrollY + listH) {
      this._setScrollY(rowBottom - listH);
    }
  }

  _updateScrollbarThumb() {
    if (!this.scrollThumbGfx || !this._listBounds) return;
    this.scrollThumbGfx.clear();
    if (this.maxScrollY <= 0) return;

    const { x, y, w, h, contentH } = this._listBounds;
    const s = this.uiScale || 1;
    const trackW = Math.max(4, 3 * s);
    const trackX = x + w - trackW - 2 * s;
    const trackY = y + 2 * s;
    const trackH = h - 4 * s;

    this.scrollThumbGfx.fillStyle(0x1f140d, 0.75);
    this.scrollThumbGfx.fillRoundedRect(trackX, trackY, trackW, trackH, 2 * s);

    const thumbH = Math.max(20 * s, Math.round((h / contentH) * trackH));
    const ratio = this.maxScrollY > 0 ? this.scrollY / this.maxScrollY : 0;
    const thumbY = Math.round(trackY + ratio * (trackH - thumbH));

    this.scrollThumbGfx.fillStyle(UI.ACCENT, 0.92);
    this.scrollThumbGfx.fillRoundedRect(trackX, thumbY, trackW, thumbH, 2 * s);
  }

  render() {
    this.container.removeAll(true);
    if (!this.isOpen) return;

    const w = this.viewWidth;
    const h = this.viewHeight;
    const s = this.uiScale;
    const gs = this._getGameState();
    const coins = gs?.coins ?? 0;
    const invMap = gs?.inventory || {};
    const slots = gs?.inventorySlots || [];
    const usedSlots = slots.filter((sl) => sl && sl.count > 0).length;
    const isSell = this.mode === 'sell';
    const isPortrait = w < h;

    const F = UI.FONT || {};
    const fontTitle = Math.max(
      F.MIN_MODAL_TITLE_PX || 34,
      Math.round((F.MODAL_TITLE || 18) * s)
    );
    const fontBody = Math.max(
      F.MIN_MODAL_BODY_PX || 28,
      Math.round((F.MODAL_BODY || 15) * s)
    );
    const fontSub = Math.max(
      F.MIN_MODAL_SUB_PX || 28,
      Math.round((F.MODAL_SUB || 14) * s)
    );
    const fontBtn = Math.max(
      F.MIN_BUTTON_PX || 26,
      Math.round((F.BUTTON || 14) * s)
    );
    const fontBtnSm = Math.max(
      F.MIN_BUTTON_SM_PX || 26,
      Math.round((F.BUTTON_SM || 13) * s)
    );
    const strokePx = Math.max(2, Math.round(1.2 * s));

    // 1. Dimmed full-screen backdrop (tapping outside the modal panel closes it)
    const backdrop = this.scene.add
      .rectangle(w / 2, h / 2, w, h, 0x0e0906, 0.76)
      .setInteractive();
    backdrop.on('pointerdown', (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      this.close();
    });
    this.container.add(backdrop);

    // 2. Main Modal Panel (~84% screen width on landscape, 92% on narrow portrait)
    const widthRatio = isPortrait ? 0.92 : UI.MODAL_WIDTH_RATIO || 0.84;
    const panelW = Math.min(w - 12 * s, Math.round(w * widthRatio));
    const panelH = Math.min(h - 12 * s, Math.round(h * 0.9));
    const px = Math.round((w - panelW) / 2);
    const py = Math.round((h - panelH) / 2);

    // Swallow taps inside the panel so they don't trigger backdrop close
    const panelBlocker = this.scene.add
      .zone(px + panelW / 2, py + panelH / 2, panelW, panelH)
      .setOrigin(0.5)
      .setInteractive();
    panelBlocker.on('pointerdown', (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
    });
    this.container.add(panelBlocker);

    const panelGfx = this.scene.add.graphics();
    panelGfx.fillStyle(UI.PANEL_BG, 0.98);
    panelGfx.fillRoundedRect(px, py, panelW, panelH, 6 * s);
    panelGfx.lineStyle(2 * s, UI.PANEL_BORDER, 1);
    panelGfx.strokeRoundedRect(px, py, panelW, panelH, 6 * s);

    // Header bar inside panel
    const isCompactHeader = panelW < 420 * s;
    const headerH = isCompactHeader ? 50 * s : 32 * s;
    panelGfx.fillStyle(UI.PANEL_INNER, 1);
    panelGfx.fillRoundedRect(
      px + 4 * s,
      py + 4 * s,
      panelW - 8 * s,
      headerH,
      4 * s
    );
    this.container.add(panelGfx);

    const titleStr = isSell
      ? 'KOTAK JUAL PANEN & IKAN'
      : 'KIOS BIBIT LEMBAH';
    const titleColor = isSell ? '#ffd866' : '#a8f0a0';

    const closeBtnW = 64 * s;
    const closeBtnH = Math.max(24 * s, 48);
    const closeBtnX = px + panelW - 8 * s - closeBtnW / 2;
    const closeBtnY = isCompactHeader
      ? py + 4 * s + 16 * s
      : py + 4 * s + headerH / 2;

    const titleTxt = this.scene.add
      .text(
        px + 12 * s,
        isCompactHeader ? py + 4 * s + 16 * s : py + 4 * s + headerH / 2,
        titleStr,
        pixelTextStyle(fontTitle, titleColor, {
          stroke: '#120b07',
          strokeThickness: strokePx,
        })
      )
      .setOrigin(0, 0.5);

    // Coin display in header
    const coinTxt = this.scene.add
      .text(
        isCompactHeader ? px + 12 * s : closeBtnX - closeBtnW / 2 - 12 * s,
        isCompactHeader ? py + 4 * s + 37 * s : py + 4 * s + headerH / 2,
        `Koin: ${coins}G`,
        pixelTextStyle(fontBody, '#ffd866', {
          stroke: '#120b07',
          strokeThickness: strokePx,
        })
      )
      .setOrigin(isCompactHeader ? 0 : 1, 0.5);

    // Close button [Tutup X]
    const btnClose = this._createButton(
      closeBtnX,
      closeBtnY,
      closeBtnW,
      closeBtnH,
      s,
      fontBtnSm,
      'Tutup X',
      0x8c382d,
      true,
      () => this.close()
    );

    this.container.add([titleTxt, coinTxt, btnClose]);

    // 3. Scrollable Item Rows Area
    const itemIds = this._getRowItemIds();
    const minBtnHeightPx = Math.max(UI.MODAL_MIN_BTN_HEIGHT_PX || 56, 28 * s);
    const footerH = 34 * s;
    const listX = px + 8 * s;
    const listY = py + 4 * s + headerH + 6 * s;
    const listW = panelW - 16 * s;
    const listH = Math.max(60 * s, panelH - headerH - footerH - 16 * s);

    const isStackedRow = listW < 430 * s;
    const rowH = isStackedRow
      ? minBtnHeightPx + 38 * s
      : Math.max(minBtnHeightPx + 10 * s, 38 * s);
    const rowGap = 6 * s;
    const rowStep = rowH + rowGap;
    const rowW = listW - 10 * s;
    const contentH =
      itemIds.length * rowH + Math.max(0, itemIds.length - 1) * rowGap;

    this.maxScrollY = Math.max(0, contentH - listH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScrollY);
    this._listBounds = {
      x: listX,
      y: listY,
      w: listW,
      h: listH,
      rowH,
      rowStep,
      contentH,
    };

    // Update geometry mask to clip listContainer strictly inside [listX, listY, listW, listH]
    this._maskGfx.clear();
    this._maskGfx.fillStyle(0xffffff, 1);
    this._maskGfx.fillRect(listX, listY, listW, listH);

    this.listContainer = this.scene.add.container(
      listX,
      listY - this.scrollY
    );
    this.listContainer.setMask(this._listMask);
    this.container.add(this.listContainer);

    let totalSellableValue = 0;

    itemIds.forEach((itemId, idx) => {
      const item = ITEMS[itemId];
      if (!item) return;

      const count = invMap[itemId] || 0;
      const ry = idx * rowStep;
      const rcy = ry + rowH / 2;
      const isSelected = idx === this.selectedRowIndex;

      if (isSell && count > 0) {
        totalSellableValue += count * item.sellPrice;
      }

      const rowGfx = this.scene.add.graphics();
      rowGfx.fillStyle(isSelected ? 0x4b3220 : UI.SLOT_BG, 0.96);
      rowGfx.fillRoundedRect(0, ry, rowW, rowH, 4 * s);
      rowGfx.lineStyle(
        (isSelected ? 2 : 1.2) * s,
        isSelected ? UI.SLOT_ACTIVE_BORDER : UI.PANEL_BORDER,
        isSelected ? 1 : 0.85
      );
      rowGfx.strokeRoundedRect(0, ry, rowW, rowH, 4 * s);
      this.listContainer.add(rowGfx);

      // Row tap selects row (if not dragging scroll list)
      const rowZone = this.scene.add
        .zone(rowW / 2, rcy, rowW, rowH)
        .setOrigin(0.5)
        .setInteractive();
      rowZone.on('pointerup', () => {
        if (this._dragMoved) return;
        if (this.selectedRowIndex !== idx) {
          this.selectedRowIndex = idx;
          this.render();
        }
      });
      this.listContainer.add(rowZone);

      // Item Icon (+ crop badge for seeds, or tint for fish variants)
      const iconX = 20 * s;
      const iconY = isStackedRow ? ry + 19 * s : rcy;
      const icon = this.scene.add
        .image(iconX, iconY, item.iconKey)
        .setOrigin(0.5)
        .setScale(1.35 * s);
      if (item.tint) {
        icon.setTint(item.tint);
      }
      this.listContainer.add(icon);

      if (item.badgeKey) {
        const badge = this.scene.add
          .image(iconX + 6 * s, iconY + 5 * s, item.badgeKey)
          .setOrigin(0.5)
          .setScale(0.9 * s);
        this.listContainer.add(badge);
      }

      // Item Name, Price & "Tas: n" info (all >= 28-30px physical on 1612x720)
      const textX = 40 * s;
      const nameY = isStackedRow ? ry + 12 * s : ry + Math.round(rowH * 0.32);
      const subY = isStackedRow ? ry + 28 * s : ry + Math.round(rowH * 0.7);

      const nameTxt = this.scene.add
        .text(
          textX,
          nameY,
          item.name,
          pixelTextStyle(fontBody, '#fff6e0', {
            stroke: '#120b07',
            strokeThickness: strokePx,
          })
        )
        .setOrigin(0, 0.5);

      const priceLabel = isSell
        ? `Harga: ${item.sellPrice}G  •  Tas: ${count}`
        : `Harga: ${item.buyPrice}G  •  Tas: ${count}`;
      const subColor = isSell
        ? count > 0
          ? '#a8f0a0'
          : '#e0cbb5'
        : coins >= item.buyPrice
          ? '#ffd866'
          : '#e0cbb5';

      const subTxt = this.scene.add
        .text(
          textX,
          subY,
          priceLabel,
          pixelTextStyle(fontSub, subColor, {
            stroke: '#120b07',
            strokeThickness: strokePx,
          })
        )
        .setOrigin(0, 0.5);

      this.listContainer.add([nameTxt, subTxt]);

      // Action Buttons (height >= 56px physical, clear spacing & high-contrast disabled state)
      const btnH = minBtnHeightPx;
      const btnGap = 8 * s;
      const btnW1 = isStackedRow
        ? Math.floor((rowW - 20 * s - btnGap) / 2)
        : 112 * s;
      const btnW2 = isStackedRow
        ? Math.floor((rowW - 20 * s - btnGap) / 2)
        : 124 * s;
      const btnY = isStackedRow
        ? ry + rowH - btnH / 2 - 4 * s
        : rcy;
      const btn2X = rowW - 8 * s - btnW2 / 2;
      const btn1X = btn2X - btnW2 / 2 - btnGap - btnW1 / 2;

      if (isSell) {
        const canSellOne = count >= 1;
        const allEarn = count * item.sellPrice;

        const btnSell1 = this._createButton(
          btn1X,
          btnY,
          btnW1,
          btnH,
          s,
          fontBtn,
          `Jual 1 (+${item.sellPrice}G)`,
          0x4e7a3e,
          canSellOne,
          () => {
            if (this._dragMoved) return;
            this.selectedRowIndex = idx;
            this._triggerPrimaryOnRow(idx);
          }
        );

        const btnSellAll = this._createButton(
          btn2X,
          btnY,
          btnW2,
          btnH,
          s,
          fontBtn,
          canSellOne ? `Semua (+${allEarn}G)` : 'Jual Semua',
          0xb86f28,
          canSellOne,
          () => {
            if (this._dragMoved) return;
            this.selectedRowIndex = idx;
            this._triggerSecondaryOnRow(idx);
          }
        );

        this.listContainer.add([btnSell1, btnSellAll]);
      } else {
        const cost1 = item.buyPrice;
        const cost5 = item.buyPrice * 5;
        const canBuy1 = coins >= cost1;
        const canBuy5 = coins >= cost5;

        const btnBuy1 = this._createButton(
          btn1X,
          btnY,
          btnW1,
          btnH,
          s,
          fontBtn,
          `Beli 1 (${cost1}G)`,
          0x4e7a3e,
          canBuy1,
          () => {
            if (this._dragMoved) return;
            this.selectedRowIndex = idx;
            this._triggerPrimaryOnRow(idx);
          }
        );

        const btnBuy5 = this._createButton(
          btn2X,
          btnY,
          btnW2,
          btnH,
          s,
          fontBtn,
          `Beli 5 (${cost5}G)`,
          0x3e6b7a,
          canBuy5,
          () => {
            if (this._dragMoved) return;
            this.selectedRowIndex = idx;
            this._triggerSecondaryOnRow(idx);
          }
        );

        this.listContainer.add([btnBuy1, btnBuy5]);
      }
    });

    // Scrollbar thumb indicator on the right edge of the list
    this.scrollThumbGfx = this.scene.add.graphics();
    this.container.add(this.scrollThumbGfx);
    this._updateScrollbarThumb();

    // 4. Footer Bar
    const footerY = py + panelH - footerH / 2 - 3 * s;
    const footerBtnH = Math.max(48, 25 * s);
    if (isSell) {
      const summaryTxt = this.scene.add
        .text(
          px + 12 * s,
          footerY,
          isPortrait
            ? `Total Jual: ${totalSellableValue}G • Geser daftar untuk lihat semua`
            : `Total Nilai Jual: ${totalSellableValue}G  •  Geser / [W/S] Pilih  [1] Jual 1  [2] Semua`,
          pixelTextStyle(fontBtnSm, '#fff6e0', {
            stroke: '#120b07',
            strokeThickness: strokePx,
          })
        )
        .setOrigin(0, 0.5);
      this.container.add(summaryTxt);

      if (totalSellableValue > 0) {
        const sellAllW = 132 * s;
        const btnSellEverything = this._createButton(
          px + panelW - 10 * s - sellAllW / 2,
          footerY,
          sellAllW,
          footerBtnH,
          s,
          fontBtn,
          `Jual Semua (${totalSellableValue}G)`,
          0xc87d28,
          true,
          () => {
            eventBus.emit(EVENTS.SHOP_SELL_ITEM, { sellAllHarvest: true });
          }
        );
        this.container.add(btnSellEverything);
      }
    } else {
      const footerTxt = this.scene.add
        .text(
          px + panelW / 2,
          footerY,
          isPortrait
            ? `Tas: ${usedSlots}/${INVENTORY.MAX_SLOTS} slot (Maks ${INVENTORY.DEFAULT_MAX_STACK}/slot)`
            : `Slot Tas: ${usedSlots}/${INVENTORY.MAX_SLOTS} (Maks ${INVENTORY.DEFAULT_MAX_STACK}/slot)  •  [W/S] Pilih  [1] Beli 1  [2] Beli 5`,
          pixelTextStyle(fontBtnSm, '#fff6e0', {
            stroke: '#120b07',
            strokeThickness: strokePx,
          })
        )
        .setOrigin(0.5, 0.5);
      this.container.add(footerTxt);
    }
  }

  _createButton(x, y, w, h, s, fontPx, label, fillColor, enabled, onClick) {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    const fill = enabled ? fillColor : UI.BTN_DISABLED_BG || 0x2b231d;
    const border = enabled
      ? UI.BTN_ACTIVE_BORDER || UI.PANEL_BORDER
      : UI.BTN_DISABLED_BORDER || 0x8c7a6b;
    const textColor = enabled
      ? '#fff6e0'
      : UI.BTN_DISABLED_TEXT || '#dcd3c8';

    bg.fillStyle(fill, 0.96);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4 * s);
    bg.lineStyle(enabled ? 1.8 * s : 1.4 * s, border, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4 * s);

    const txt = this.scene.add
      .text(
        0,
        0,
        label,
        pixelTextStyle(fontPx, textColor, {
          stroke: '#120b07',
          strokeThickness: Math.max(2, Math.round(1.2 * s)),
        })
      )
      .setOrigin(0.5);

    const zone = this.scene.add
      .zone(0, 0, w + 4 * s, h + 4 * s)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: enabled });

    zone.on('pointerup', (pointer, lx, ly, event) => {
      if (this._dragMoved) return;
      if (event && event.stopPropagation) event.stopPropagation();
      onClick();
    });

    c.add([bg, txt, zone]);
    return c;
  }

  _triggerPrimaryOnRow(idx) {
    const itemIds = this._getRowItemIds();
    const itemId = itemIds[idx];
    if (!itemId) return;

    if (this.mode === 'sell') {
      eventBus.emit(EVENTS.SHOP_SELL_ITEM, { itemId, quantity: 1 });
    } else {
      eventBus.emit(EVENTS.SHOP_BUY_ITEM, { itemId, quantity: 1 });
    }
  }

  _triggerSecondaryOnRow(idx) {
    const itemIds = this._getRowItemIds();
    const itemId = itemIds[idx];
    if (!itemId) return;

    if (this.mode === 'sell') {
      const gs = this._getGameState();
      const count = gs?.inventory?.[itemId] || 0;
      eventBus.emit(EVENTS.SHOP_SELL_ITEM, {
        itemId,
        quantity: Math.max(1, count),
      });
    } else {
      eventBus.emit(EVENTS.SHOP_BUY_ITEM, { itemId, quantity: 5 });
    }
  }

  _bindScrollInput() {
    this._onPointerDown = (pointer) => {
      if (!this.isOpen || !this._listBounds || this.maxScrollY <= 0) return;
      const b = this._listBounds;
      if (
        pointer.x >= b.x &&
        pointer.x <= b.x + b.w &&
        pointer.y >= b.y &&
        pointer.y <= b.y + b.h
      ) {
        this._isDraggingList = true;
        this._dragMoved = false;
        this._dragStartY = pointer.y;
        this._dragStartScrollY = this.scrollY;
      }
    };

    this._onPointerMove = (pointer) => {
      if (!this.isOpen || !this._isDraggingList || !pointer.isDown) return;
      const dy = this._dragStartY - pointer.y;
      if (Math.abs(dy) > 6 * (this.uiScale || 1)) {
        this._dragMoved = true;
      }
      if (this._dragMoved) {
        this._setScrollY(this._dragStartScrollY + dy);
      }
    };

    this._onPointerUp = () => {
      this._isDraggingList = false;
      if (this._dragMoved) {
        this.scene.time.delayedCall(40, () => {
          this._dragMoved = false;
        });
      }
    };

    this._onWheel = (pointer, gameObjects, dx, dy) => {
      if (!this.isOpen || this.maxScrollY <= 0) return;
      this._setScrollY(this.scrollY + dy * 0.65);
    };

    this.scene.input.on('pointerdown', this._onPointerDown);
    this.scene.input.on('pointermove', this._onPointerMove);
    this.scene.input.on('pointerup', this._onPointerUp);
    this.scene.input.on('wheel', this._onWheel);
  }

  _bindKeyboard() {
    if (!this.scene.input.keyboard) return;

    this._onKeyDown = (event) => {
      if (!this.isOpen) return;
      const code = event.code;
      const itemIds = this._getRowItemIds();

      if (code === 'Escape' || code === 'KeyQ') {
        event.preventDefault();
        this.close();
      } else if (code === 'ArrowUp' || code === 'KeyW') {
        event.preventDefault();
        this.selectedRowIndex =
          (this.selectedRowIndex - 1 + itemIds.length) % itemIds.length;
        this._ensureRowVisible(this.selectedRowIndex);
        eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_BLIP);
        this.render();
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        event.preventDefault();
        this.selectedRowIndex =
          (this.selectedRowIndex + 1) % itemIds.length;
        this._ensureRowVisible(this.selectedRowIndex);
        eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_BLIP);
        this.render();
      } else if (
        code === 'Digit1' ||
        code === 'Enter' ||
        code === 'Space'
      ) {
        event.preventDefault();
        this._triggerPrimaryOnRow(this.selectedRowIndex);
      } else if (code === 'Digit2' || code === 'KeyE') {
        event.preventDefault();
        this._triggerSecondaryOnRow(this.selectedRowIndex);
      }
    };

    this.scene.input.keyboard.on('keydown', this._onKeyDown);
  }

  destroy() {
    if (this.scene?.input) {
      this.scene.input.off('pointerdown', this._onPointerDown);
      this.scene.input.off('pointermove', this._onPointerMove);
      this.scene.input.off('pointerup', this._onPointerUp);
      this.scene.input.off('wheel', this._onWheel);
    }
    if (this.scene?.input?.keyboard && this._onKeyDown) {
      this.scene.input.keyboard.off('keydown', this._onKeyDown);
    }
    if (this._maskGfx) {
      this._maskGfx.destroy();
    }
    if (this.container) {
      this.container.destroy(true);
    }
  }
}
