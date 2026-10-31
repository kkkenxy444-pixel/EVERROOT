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

    this.viewWidth = uiScene.scale?.width || GAME.WIDTH;
    this.viewHeight = uiScene.scale?.height || GAME.HEIGHT;
    this.uiScale = getUiScale(this.viewWidth, this.viewHeight);

    this.container = uiScene.add.container(0, 0).setDepth(350).setVisible(false);
    this._bindKeyboard();
  }

  open(mode = 'buy') {
    this.mode = mode === 'sell' ? 'sell' : 'buy';
    this.selectedRowIndex = 0;
    this.isOpen = true;
    this.container.setVisible(true);
    this.render();
  }

  close(emitEvent = true) {
    if (!this.isOpen) return;
    this.isOpen = false;
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

    const fontTitle = Math.max(13, Math.round(8.5 * s));
    const fontBody = Math.max(11, Math.round((isSell ? 6.5 : 7) * s));
    const fontSmall = Math.max(10, Math.round((isSell ? 5.6 : 6) * s));

    // 1. Dimmed full-screen backdrop (tapping outside the modal panel closes it)
    const backdrop = this.scene.add
      .rectangle(w / 2, h / 2, w, h, 0x0e0906, 0.72)
      .setInteractive();
    backdrop.on('pointerdown', (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      this.close();
    });
    this.container.add(backdrop);

    // 2. Main Modal Panel
    const panelW = Math.min(w - 20 * s, 336 * s);
    const panelH = Math.min(h - 10 * s, isSell ? 232 * s : 214 * s);
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
    panelGfx.fillStyle(UI.PANEL_BG, 0.97);
    panelGfx.fillRoundedRect(px, py, panelW, panelH, 6 * s);
    panelGfx.lineStyle(2 * s, UI.PANEL_BORDER, 1);
    panelGfx.strokeRoundedRect(px, py, panelW, panelH, 6 * s);

    // Header bar inside panel
    const headerH = 24 * s;
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

    const titleTxt = this.scene.add
      .text(
        px + 10 * s,
        py + 4 * s + headerH / 2,
        titleStr,
        pixelTextStyle(fontTitle, titleColor)
      )
      .setOrigin(0, 0.5);

    // Coin display in header
    const coinTxt = this.scene.add
      .text(
        px + panelW - 62 * s,
        py + 4 * s + headerH / 2,
        `Koin: ${coins}G`,
        pixelTextStyle(fontBody, '#ffd866')
      )
      .setOrigin(1, 0.5);

    // Close button [Tutup X]
    const btnClose = this._createButton(
      px + panelW - 31 * s,
      py + 4 * s + headerH / 2,
      48 * s,
      18 * s,
      s,
      fontSmall,
      'Tutup X',
      0x8c382d,
      true,
      () => this.close()
    );

    this.container.add([titleTxt, coinTxt, btnClose]);

    // 3. Item Rows (7 sellable items in 'sell' mode, 4 seeds in 'buy' mode)
    const itemIds = this._getRowItemIds();
    const rowsStartY = py + headerH + 8 * s;
    const rowH = isSell ? 22 * s : 32 * s;
    const rowGap = isSell ? 2.5 * s : 4 * s;
    const rowW = panelW - 16 * s;
    const rowX = px + 8 * s;

    let totalSellableValue = 0;

    itemIds.forEach((itemId, idx) => {
      const item = ITEMS[itemId];
      if (!item) return;

      const count = invMap[itemId] || 0;
      const ry = rowsStartY + idx * (rowH + rowGap);
      const rcy = ry + rowH / 2;
      const isSelected = idx === this.selectedRowIndex;

      if (isSell && count > 0) {
        totalSellableValue += count * item.sellPrice;
      }

      const rowGfx = this.scene.add.graphics();
      rowGfx.fillStyle(isSelected ? 0x4b3220 : UI.SLOT_BG, 0.94);
      rowGfx.fillRoundedRect(rowX, ry, rowW, rowH, 3.5 * s);
      rowGfx.lineStyle(
        (isSelected ? 1.8 : 1) * s,
        isSelected ? UI.SLOT_ACTIVE_BORDER : UI.PANEL_BORDER,
        isSelected ? 1 : 0.75
      );
      rowGfx.strokeRoundedRect(rowX, ry, rowW, rowH, 3.5 * s);
      this.container.add(rowGfx);

      // Row tap selects row
      const rowZone = this.scene.add
        .zone(rowX + rowW / 2, rcy, rowW, rowH)
        .setOrigin(0.5)
        .setInteractive();
      rowZone.on('pointerdown', () => {
        if (this.selectedRowIndex !== idx) {
          this.selectedRowIndex = idx;
          this.render();
        }
      });
      this.container.add(rowZone);

      // Item Icon (+ crop badge for seeds, or tint for fish variants)
      const iconX = rowX + 14 * s;
      const icon = this.scene.add
        .image(iconX, rcy, item.iconKey)
        .setOrigin(0.5)
        .setScale((isSell ? 1.05 : 1.15) * s);
      if (item.tint) {
        icon.setTint(item.tint);
      }
      this.container.add(icon);

      if (item.badgeKey) {
        const badge = this.scene.add
          .image(iconX + 5 * s, rcy + 4 * s, item.badgeKey)
          .setOrigin(0.5)
          .setScale(0.75 * s);
        this.container.add(badge);
      }

      // Item Name & Stock/Owned info
      if (isSell) {
        const nameTxt = this.scene.add
          .text(
            rowX + 27 * s,
            rcy,
            item.name,
            pixelTextStyle(fontBody, '#fff6e0')
          )
          .setOrigin(0, 0.5);

        const subColor = count > 0 ? '#a8f0a0' : '#b8947a';
        const subTxt = this.scene.add
          .text(
            rowX + 118 * s,
            rcy,
            `${item.sellPrice}G • Tas: ${count}`,
            pixelTextStyle(fontSmall, subColor)
          )
          .setOrigin(0, 0.5);

        this.container.add([nameTxt, subTxt]);
      } else {
        const nameTxt = this.scene.add
          .text(
            rowX + 32 * s,
            ry + 9 * s,
            item.name,
            pixelTextStyle(fontBody, '#fff6e0')
          )
          .setOrigin(0, 0.5);

        const subColor = coins >= item.buyPrice ? '#d9c4a9' : '#b8947a';
        const subTxt = this.scene.add
          .text(
            rowX + 32 * s,
            ry + 22 * s,
            `Harga: ${item.buyPrice}G  •  Stok Tas: ${count}`,
            pixelTextStyle(fontSmall, subColor)
          )
          .setOrigin(0, 0.5);

        this.container.add([nameTxt, subTxt]);
      }

      // Action Buttons on the right side of the row
      if (isSell) {
        const canSellOne = count >= 1;
        const allEarn = count * item.sellPrice;
        const btnH = 18 * s;
        const btnSell1 = this._createButton(
          rowX + rowW - 98 * s,
          rcy,
          54 * s,
          btnH,
          s,
          fontSmall,
          `Jual 1 (+${item.sellPrice}G)`,
          0x4e7a3e,
          canSellOne,
          () => {
            this.selectedRowIndex = idx;
            this._triggerPrimaryOnRow(idx);
          }
        );

        const btnSellAll = this._createButton(
          rowX + rowW - 35 * s,
          rcy,
          62 * s,
          btnH,
          s,
          fontSmall,
          canSellOne ? `Semua (+${allEarn}G)` : 'Jual Semua',
          0xb86f28,
          canSellOne,
          () => {
            this.selectedRowIndex = idx;
            this._triggerSecondaryOnRow(idx);
          }
        );

        this.container.add([btnSell1, btnSellAll]);
      } else {
        const cost1 = item.buyPrice;
        const cost5 = item.buyPrice * 5;
        const canBuy1 = coins >= cost1;
        const canBuy5 = coins >= cost5;

        const btnBuy1 = this._createButton(
          rowX + rowW - 96 * s,
          rcy,
          56 * s,
          22 * s,
          s,
          fontSmall,
          `Beli 1 (${cost1}G)`,
          0x4e7a3e,
          canBuy1,
          () => {
            this.selectedRowIndex = idx;
            this._triggerPrimaryOnRow(idx);
          }
        );

        const btnBuy5 = this._createButton(
          rowX + rowW - 34 * s,
          rcy,
          58 * s,
          22 * s,
          s,
          fontSmall,
          `Beli 5 (${cost5}G)`,
          0x3e6b7a,
          canBuy5,
          () => {
            this.selectedRowIndex = idx;
            this._triggerSecondaryOnRow(idx);
          }
        );

        this.container.add([btnBuy1, btnBuy5]);
      }
    });

    // 4. Footer Bar
    const footerY = py + panelH - 13 * s;
    if (isSell) {
      const summaryTxt = this.scene.add
        .text(
          px + 10 * s,
          footerY,
          `Total Nilai Jual: ${totalSellableValue}G  •  [W/S] Pilih  [1] Jual 1  [2] Semua  [ESC] Tutup`,
          pixelTextStyle(fontSmall, '#d9c4a9')
        )
        .setOrigin(0, 0.5);
      this.container.add(summaryTxt);

      if (totalSellableValue > 0) {
        const btnSellEverything = this._createButton(
          px + panelW - 46 * s,
          footerY,
          78 * s,
          17 * s,
          s,
          fontSmall,
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
          `Slot Tas: ${usedSlots}/${INVENTORY.MAX_SLOTS} (Maks ${INVENTORY.DEFAULT_MAX_STACK}/slot)  •  [W/S] Pilih  [1] Beli 1  [2] Beli 5  [ESC] Tutup`,
          pixelTextStyle(fontSmall, '#d9c4a9')
        )
        .setOrigin(0.5, 0.5);
      this.container.add(footerTxt);
    }
  }

  _createButton(x, y, w, h, s, fontPx, label, fillColor, enabled, onClick) {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    const fill = enabled ? fillColor : 0x3a2d25;
    const alpha = enabled ? 0.96 : 0.55;

    bg.fillStyle(fill, alpha);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 3.5 * s);
    bg.lineStyle(
      1.2 * s,
      enabled ? UI.PANEL_BORDER : 0x6e5a4a,
      enabled ? 1 : 0.5
    );
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 3.5 * s);

    const txt = this.scene.add
      .text(
        0,
        0,
        label,
        pixelTextStyle(fontPx, enabled ? '#fff6e0' : '#968270')
      )
      .setOrigin(0.5);

    const zone = this.scene.add
      .zone(0, 0, w + 4 * s, h + 4 * s)
      .setOrigin(0.5)
      .setInteractive();

    zone.on('pointerdown', (pointer, lx, ly, event) => {
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
        eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_BLIP);
        this.render();
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        event.preventDefault();
        this.selectedRowIndex =
          (this.selectedRowIndex + 1) % itemIds.length;
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
    if (this.scene?.input?.keyboard && this._onKeyDown) {
      this.scene.input.keyboard.off('keydown', this._onKeyDown);
    }
    if (this.container) {
      this.container.destroy(true);
    }
  }
}
