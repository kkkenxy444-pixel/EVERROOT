import { ASSET_KEYS } from '../data/assetKeys.js';
import { DEBUG, INVENTORY, isDebugModeEnabled } from '../data/gameConfig.js';
import {
  FISH_ITEM_IDS,
  getSeedUnlockDay,
  isSeedUnlocked,
  ITEMS,
  LEGACY_FISH_ID_MAP,
  SEED_ITEM_IDS,
  SELLABLE_ITEM_IDS,
} from '../data/items.js';
import { eventBus, EVENTS } from './EventBus.js';

/**
 * Slot-based Inventory & Economy System for Milestone 3:
 * - Replaces Milestone 2's flat dictionary storage with a fixed-slot backpack
 *   (`INVENTORY.MAX_SLOTS = 24`, per-slot stack limit `item.stackMax = 20`)
 * - Keeps `gameState.inventorySlots` (slot array) and `gameState.inventory` (summary counts)
 *   synchronized at all times
 * - Restricts seed selection (`BIBIT` / `R`) to owned seeds (`stock > 0`), showing a short toast
 *   when out of seeds
 * - Handles buying seeds at the Seed Stall and selling harvested crops & caught fish at the
 *   Shipping Box via `eventBus` events (`EVENTS.SHOP_BUY_ITEM`, `EVENTS.SHOP_SELL_ITEM`)
 */
export class InventorySystem {
  /**
   * Sanitizes a raw slot array (e.g. from localStorage) into a valid array of length `INVENTORY.MAX_SLOTS`.
   * Automatically migrates legacy fish IDs (`fish_river` -> `fish_small`, `fish_golden` -> `fish_large`).
   */
  static sanitizeSlots(rawSlots) {
    const maxSlots = INVENTORY.MAX_SLOTS;
    const result = new Array(maxSlots).fill(null);
    if (!Array.isArray(rawSlots)) return result;

    let writeIdx = 0;
    for (const entry of rawSlots) {
      if (writeIdx >= maxSlots) break;
      if (!entry || typeof entry !== 'object') continue;
      const mappedId = LEGACY_FISH_ID_MAP[entry.itemId] || entry.itemId;
      const itemDef = ITEMS[mappedId];
      if (!itemDef) continue;
      const rawCount = Number(entry.count);
      if (!Number.isFinite(rawCount) || rawCount <= 0) continue;

      let remaining = Math.floor(rawCount);
      const stackMax = itemDef.stackMax || INVENTORY.DEFAULT_MAX_STACK;
      while (remaining > 0 && writeIdx < maxSlots) {
        const take = Math.min(remaining, stackMax);
        result[writeIdx++] = {
          itemId: itemDef.id,
          count: take,
        };
        remaining -= take;
      }
    }

    return result;
  }

  /**
   * Migrates a Milestone 2 flat inventory map (`{ seed_parsnip: 5, crop_parsnip: 2, ... }`)
   * into stacked slots of length `INVENTORY.MAX_SLOTS`.
   */
  static createSlotsFromLegacyMap(legacyMap) {
    const maxSlots = INVENTORY.MAX_SLOTS;
    const slots = new Array(maxSlots).fill(null);
    if (!legacyMap || typeof legacyMap !== 'object') return slots;

    let writeIdx = 0;
    for (const [rawItemId, rawVal] of Object.entries(legacyMap)) {
      if (writeIdx >= maxSlots) break;
      const itemId = LEGACY_FISH_ID_MAP[rawItemId] || rawItemId;
      const itemDef = ITEMS[itemId];
      if (!itemDef) continue;
      const count = Number(rawVal);
      if (!Number.isFinite(count) || count <= 0) continue;

      let remaining = Math.floor(count);
      const stackMax = itemDef.stackMax || INVENTORY.DEFAULT_MAX_STACK;
      while (remaining > 0 && writeIdx < maxSlots) {
        const take = Math.min(remaining, stackMax);
        slots[writeIdx++] = {
          itemId: itemDef.id,
          count: take,
        };
        remaining -= take;
      }
    }

    return slots;
  }

  /**
   * Computes a flat `{ [itemId]: totalCount }` summary map from `slots`.
   */
  static computeSummaryMap(slots) {
    const map = {};
    for (const key of Object.keys(ITEMS)) {
      map[key] = 0;
    }
    if (Array.isArray(slots)) {
      for (const slot of slots) {
        if (slot && ITEMS[slot.itemId] && Number.isFinite(slot.count)) {
          map[slot.itemId] =
            (map[slot.itemId] || 0) + Math.max(0, Math.floor(slot.count));
        }
      }
    }
    return map;
  }

  constructor(gameState, onStateChangedCallback = null) {
    this.gameState = gameState;
    this.onStateChanged = onStateChangedCallback;

    if (Array.isArray(this.gameState.inventorySlots)) {
      this.gameState.inventorySlots = InventorySystem.sanitizeSlots(
        this.gameState.inventorySlots
      );
    } else {
      this.gameState.inventorySlots = InventorySystem.createSlotsFromLegacyMap(
        this.gameState.inventory
      );
    }

    this._syncSummaryMap();
    this.ensureValidSelectedSeed();
    this._bindEvents();
  }

  _bindEvents() {
    this._onCycleSeed = () => this.cycleOwnedSeed(1);
    this._onBuyItem = (payload) => {
      if (!payload || typeof payload !== 'object') return;
      this.buySeed(payload.itemId, payload.quantity ?? 1);
    };
    this._onSellItem = (payload) => {
      if (!payload || typeof payload !== 'object') return;
      if (payload.sellAllHarvest) {
        this.sellAllHarvest();
      } else {
        this.sellHarvestItem(payload.itemId, payload.quantity ?? 1);
      }
    };
    this._onDebugCoins = () => {
      if (!isDebugModeEnabled()) return;
      this.debugAddCoins(DEBUG.ADD_COINS_AMOUNT);
    };
    this._onDebugSeeds = () => {
      if (!isDebugModeEnabled()) return;
      this.debugFillSeeds(DEBUG.FILL_SEEDS_AMOUNT);
    };
    this._onDayAdvanced = () => {
      this.emitState();
    };

    eventBus.on(EVENTS.INPUT_CYCLE_SEED, this._onCycleSeed);
    eventBus.on(EVENTS.SHOP_BUY_ITEM, this._onBuyItem);
    eventBus.on(EVENTS.SHOP_SELL_ITEM, this._onSellItem);
    eventBus.on(EVENTS.DEBUG_ADD_COINS, this._onDebugCoins);
    eventBus.on(EVENTS.DEBUG_FILL_SEEDS, this._onDebugSeeds);
    eventBus.on(EVENTS.DAY_ADVANCED, this._onDayAdvanced);
  }

  _syncSummaryMap() {
    this.gameState.inventory = InventorySystem.computeSummaryMap(
      this.gameState.inventorySlots
    );
  }

  getSlots() {
    return this.gameState.inventorySlots;
  }

  getMaxSlots() {
    return INVENTORY.MAX_SLOTS;
  }

  getUsedSlotCount() {
    let used = 0;
    for (const slot of this.gameState.inventorySlots) {
      if (slot && slot.count > 0) used += 1;
    }
    return used;
  }

  getCount(itemId) {
    return this.gameState.inventory?.[itemId] || 0;
  }

  /**
   * Returns true if `amount` of `itemId` can fit in existing partial stacks + empty slots.
   */
  canAddItem(itemId, amount = 1) {
    const itemDef = ITEMS[itemId];
    if (!itemDef) return false;
    const qty = Math.floor(Number(amount) || 0);
    if (qty <= 0) return true;

    const stackMax = itemDef.stackMax || INVENTORY.DEFAULT_MAX_STACK;
    let capacity = 0;

    for (const slot of this.gameState.inventorySlots) {
      if (!slot) {
        capacity += stackMax;
      } else if (slot.itemId === itemId && slot.count < stackMax) {
        capacity += stackMax - slot.count;
      }
      if (capacity >= qty) return true;
    }

    return capacity >= qty;
  }

  /**
   * Adds `amount` of `itemId` into inventory slots (stacking first, then filling empty slots).
   * Returns `{ ok, added }`.
   */
  addItem(itemId, amount = 1, silent = false) {
    const itemDef = ITEMS[itemId];
    const qty = Math.floor(Number(amount) || 0);
    if (!itemDef || qty <= 0) {
      return { ok: false, added: 0 };
    }
    if (!this.canAddItem(itemId, qty)) {
      return { ok: false, added: 0 };
    }

    const stackMax = itemDef.stackMax || INVENTORY.DEFAULT_MAX_STACK;
    let remaining = qty;
    const slots = this.gameState.inventorySlots;

    // 1. Fill existing partial stacks of the same itemId
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      const slot = slots[i];
      if (slot && slot.itemId === itemId && slot.count < stackMax) {
        const addNow = Math.min(remaining, stackMax - slot.count);
        slot.count += addNow;
        remaining -= addNow;
      }
    }

    // 2. Fill empty slots
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      if (!slots[i]) {
        const addNow = Math.min(remaining, stackMax);
        slots[i] = { itemId, count: addNow };
        remaining -= addNow;
      }
    }

    const added = qty - remaining;
    this._syncSummaryMap();

    // If an unlocked seed was added and current selectedSeedId is invalid/locked/empty, select this seed
    if (
      itemDef.category === 'seed' &&
      isSeedUnlocked(itemId, this.getCurrentDay())
    ) {
      const currentSeed = this.gameState.selectedSeedId;
      if (
        !currentSeed ||
        !isSeedUnlocked(currentSeed, this.getCurrentDay()) ||
        this.getCount(currentSeed) <= 0
      ) {
        this.gameState.selectedSeedId = itemId;
      }
    }

    if (!silent) {
      eventBus.emit(EVENTS.INVENTORY_ITEM_ADDED, {
        itemId,
        amount: added,
        total: this.getCount(itemId),
      });
      this.emitState();
    }

    if (this.onStateChanged) this.onStateChanged();
    return { ok: true, added };
  }

  /**
   * Removes `amount` of `itemId` across inventory slots.
   * Returns `{ ok, removed }`.
   */
  removeItem(itemId, amount = 1, silent = false) {
    const qty = Math.floor(Number(amount) || 0);
    if (qty <= 0 || this.getCount(itemId) < qty) {
      return { ok: false, removed: 0 };
    }

    let remaining = qty;
    const slots = this.gameState.inventorySlots;

    // Remove from the last matching slot first so partial stacks get cleaned up neatly
    for (let i = slots.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = slots[i];
      if (slot && slot.itemId === itemId) {
        const take = Math.min(remaining, slot.count);
        slot.count -= take;
        remaining -= take;
        if (slot.count <= 0) {
          slots[i] = null;
        }
      }
    }

    this._syncSummaryMap();
    this.ensureValidSelectedSeed();

    if (!silent) {
      eventBus.emit(EVENTS.INVENTORY_ITEM_REMOVED, {
        itemId,
        amount: qty,
        total: this.getCount(itemId),
      });
      this.emitState();
    }

    if (this.onStateChanged) this.onStateChanged();
    return { ok: true, removed: qty };
  }

  getCurrentDay() {
    return Math.max(1, Math.floor(Number(this.gameState?.day) || 1));
  }

  /**
   * Returns the list of seed itemIds unlocked on or before the current in-game day.
   */
  getUnlockedSeedIds() {
    const day = this.getCurrentDay();
    return SEED_ITEM_IDS.filter((id) => isSeedUnlocked(id, day));
  }

  /**
   * Returns the list of seed itemIds that are both unlocked AND currently owned (`count > 0`).
   */
  getOwnedSeedIds() {
    const day = this.getCurrentDay();
    return SEED_ITEM_IDS.filter(
      (id) => isSeedUnlocked(id, day) && this.getCount(id) > 0
    );
  }

  /**
   * Ensures `gameState.selectedSeedId` points to an unlocked & owned seed whenever available,
   * or falls back to the first unlocked seed if none are in stock.
   */
  ensureValidSelectedSeed() {
    const ownedUnlocked = this.getOwnedSeedIds();
    const unlocked = this.getUnlockedSeedIds();
    const current = this.gameState.selectedSeedId;

    if (ownedUnlocked.length > 0) {
      if (!ownedUnlocked.includes(current)) {
        this.gameState.selectedSeedId = ownedUnlocked[0];
      }
    } else if (!unlocked.includes(current)) {
      this.gameState.selectedSeedId = unlocked[0] || SEED_ITEM_IDS[0];
    }

    const activeId = this.gameState.selectedSeedId;
    const stock = unlocked.includes(activeId) ? this.getCount(activeId) : 0;
    return {
      seedId: activeId,
      stock,
    };
  }

  /**
   * Cycles only among seeds that are unlocked AND currently owned (`count > 0`).
   * If all unlocked seeds are out of stock, plays error SFX and shows a short toast.
   */
  cycleOwnedSeed(step = 1) {
    const owned = this.getOwnedSeedIds();
    if (owned.length === 0) {
      const valid = this.ensureValidSelectedSeed();
      const fallbackId = valid.seedId || SEED_ITEM_IDS[0];
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(EVENTS.SEED_CHANGED, fallbackId, 0);
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        'Bibit habis! Beli bibit di Kios Bibit.'
      );
      return;
    }

    const currentId = this.gameState.selectedSeedId;
    const currentIdx = owned.indexOf(currentId);
    const nextIdx =
      currentIdx === -1
        ? 0
        : (currentIdx + step + owned.length) % owned.length;
    const nextSeedId = owned[nextIdx];
    const stock = this.getCount(nextSeedId);

    this.gameState.selectedSeedId = nextSeedId;
    const seedItem = ITEMS[nextSeedId];

    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_BLIP);
    eventBus.emit(EVENTS.SEED_CHANGED, nextSeedId, stock);
    eventBus.emit(
      EVENTS.TOAST_MESSAGE,
      `${seedItem?.name || nextSeedId} (Stok: ${stock})`
    );
    if (this.onStateChanged) this.onStateChanged();
  }

  /**
   * Buys `quantity` of an unlocked seed item at the Seed Stall.
   * Rejects locked seeds, checks coin balance (never goes negative), and checks inventory slot capacity.
   */
  buySeed(seedItemId, quantity = 1) {
    const itemDef = ITEMS[seedItemId];
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!itemDef || !itemDef.canBuy || itemDef.buyPrice <= 0) {
      return { ok: false, reason: 'invalid_item' };
    }

    if (!isSeedUnlocked(seedItemId, this.getCurrentDay())) {
      const unlockDay = getSeedUnlockDay(seedItemId);
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        `${itemDef.name} baru buka di Hari ${unlockDay}!`
      );
      return { ok: false, reason: 'locked', unlockDay };
    }

    const totalCost = itemDef.buyPrice * qty;
    if ((this.gameState.coins || 0) < totalCost) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        `Koin tidak cukup! Butuh ${totalCost}G.`
      );
      return { ok: false, reason: 'insufficient_coins' };
    }

    if (!this.canAddItem(seedItemId, qty)) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        'Tas penuh! Jual hasil panen dulu.'
      );
      return { ok: false, reason: 'inventory_full' };
    }

    this.gameState.coins = Math.max(0, (this.gameState.coins || 0) - totalCost);
    this.gameState.selectedSeedId = seedItemId;
    this.addItem(seedItemId, qty, true);

    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_BUY_CONFIRM);
    eventBus.emit(EVENTS.COINS_CHANGED, this.gameState.coins);
    this.emitState();
    eventBus.emit(
      EVENTS.TOAST_MESSAGE,
      `Beli ${qty}x ${itemDef.name} (-${totalCost}G)`
    );

    if (this.onStateChanged) this.onStateChanged();
    return { ok: true, spent: totalCost, quantity: qty };
  }

  /**
   * Returns the list of fish itemIds that can currently fit in inventory (`canAddItem(id, 1)`).
   * If empty (`length === 0`), the player's backpack is too full to start fishing.
   */
  getCatchableFishIds() {
    return FISH_ITEM_IDS.filter((id) => this.canAddItem(id, 1));
  }

  /**
   * Sells `quantity` of a sellable item (harvested crop or caught fish) at the Shipping Box.
   * Seeds (`canSell === false`) cannot be sold.
   */
  sellHarvestItem(itemId, quantity = 1) {
    const itemDef = ITEMS[itemId];
    if (!itemDef || !itemDef.canSell) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        'Item ini tidak bisa dijual di Kotak Jual!'
      );
      return { ok: false, reason: 'not_sellable' };
    }

    const owned = this.getCount(itemId);
    if (owned <= 0) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(EVENTS.TOAST_MESSAGE, `${itemDef.name} belum dimiliki.`);
      return { ok: false, reason: 'none_owned' };
    }

    const sellQty = Math.min(
      owned,
      Math.max(1, Math.floor(Number(quantity) || 1))
    );
    const earned = sellQty * itemDef.sellPrice;

    this.removeItem(itemId, sellQty, true);
    this.gameState.coins = Math.max(0, (this.gameState.coins || 0) + earned);

    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_CASH_REGISTER);
    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_COIN_COLLECT);
    eventBus.emit(EVENTS.COINS_CHANGED, this.gameState.coins);
    this.emitState();
    eventBus.emit(
      EVENTS.TOAST_MESSAGE,
      `Jual ${sellQty}x ${itemDef.name} (+${earned}G)`
    );

    if (this.onStateChanged) this.onStateChanged();
    return { ok: true, sold: sellQty, earned };
  }

  /**
   * Sells all sellable items (harvested crops & caught fish) currently in inventory at the Shipping Box.
   */
  sellAllHarvest() {
    let totalEarned = 0;
    let totalItems = 0;

    for (const sellId of SELLABLE_ITEM_IDS) {
      const count = this.getCount(sellId);
      const itemDef = ITEMS[sellId];
      if (count > 0 && itemDef && itemDef.canSell) {
        this.removeItem(sellId, count, true);
        totalEarned += count * itemDef.sellPrice;
        totalItems += count;
      }
    }

    if (totalItems <= 0) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        'Belum ada hasil panen atau ikan di tas untuk dijual.'
      );
      return { ok: false, sold: 0, earned: 0 };
    }

    this.gameState.coins = Math.max(
      0,
      (this.gameState.coins || 0) + totalEarned
    );

    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_CASH_REGISTER);
    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_COIN_COLLECT);
    eventBus.emit(EVENTS.COINS_CHANGED, this.gameState.coins);
    this.emitState();
    eventBus.emit(
      EVENTS.TOAST_MESSAGE,
      `Jual semua hasil (${totalItems} item • +${totalEarned}G)`
    );

    if (this.onStateChanged) this.onStateChanged();
    return { ok: true, sold: totalItems, earned: totalEarned };
  }

  /**
   * Debug helper (`?debug=1` only): adds `amount` coins immediately.
   */
  debugAddCoins(amount = DEBUG.ADD_COINS_AMOUNT) {
    if (!isDebugModeEnabled()) return;
    const add = Math.max(1, Math.floor(Number(amount) || 100));
    this.gameState.coins = Math.max(0, (this.gameState.coins || 0) + add);
    eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_COIN_COLLECT);
    eventBus.emit(EVENTS.COINS_CHANGED, this.gameState.coins);
    eventBus.emit(
      EVENTS.TOAST_MESSAGE,
      `[DEBUG] +${add}G (Total: ${this.gameState.coins}G)`
    );
    if (this.onStateChanged) this.onStateChanged();
  }

  /**
   * Debug helper (`?debug=1` only): adds `amountEach` of each unlocked seed type into available slots.
   */
  debugFillSeeds(amountEach = DEBUG.FILL_SEEDS_AMOUNT) {
    if (!isDebugModeEnabled()) return;
    let totalAdded = 0;
    for (const seedId of this.getUnlockedSeedIds()) {
      for (let i = 0; i < amountEach; i++) {
        if (this.canAddItem(seedId, 1)) {
          this.addItem(seedId, 1, true);
          totalAdded += 1;
        }
      }
    }
    if (totalAdded > 0) {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_BUY_CONFIRM);
      this.emitState();
      eventBus.emit(
        EVENTS.TOAST_MESSAGE,
        `[DEBUG] +${totalAdded} bibit ditambahkan ke tas.`
      );
      if (this.onStateChanged) this.onStateChanged();
    } else {
      eventBus.emit(EVENTS.PLAY_SFX, ASSET_KEYS.SFX_UI_ERROR);
      eventBus.emit(EVENTS.TOAST_MESSAGE, '[DEBUG] Tas sudah penuh!');
    }
  }

  emitState() {
    const activeSeed = this.ensureValidSelectedSeed();
    eventBus.emit(
      EVENTS.SEED_CHANGED,
      activeSeed.seedId,
      activeSeed.stock
    );
    eventBus.emit(
      EVENTS.INVENTORY_UPDATED,
      this.gameState.inventory,
      this.gameState.inventorySlots
    );
    eventBus.emit(EVENTS.COINS_CHANGED, this.gameState.coins);
  }

  destroy() {
    eventBus.off(EVENTS.INPUT_CYCLE_SEED, this._onCycleSeed);
    eventBus.off(EVENTS.SHOP_BUY_ITEM, this._onBuyItem);
    eventBus.off(EVENTS.SHOP_SELL_ITEM, this._onSellItem);
    eventBus.off(EVENTS.DEBUG_ADD_COINS, this._onDebugCoins);
    eventBus.off(EVENTS.DEBUG_FILL_SEEDS, this._onDebugSeeds);
    eventBus.off(EVENTS.DAY_ADVANCED, this._onDayAdvanced);
  }
}
