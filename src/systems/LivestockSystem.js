import { LIVESTOCK } from '../data/gameConfig.js';

/**
 * Day-based livestock production rules (Paket 2b).
 *
 * - Chickens (`chicken_1`, `chicken_2`) produce 1 egg every day.
 * - The cow (`cow_1`) produces 1 milk every 2 days.
 * - Readiness uses the saved `lastCollectedDay` per animal id, never a real-time timer,
 *   so sleeping / loading a save behaves consistently.
 * - A missing `lastCollectedDay` (old save without the optional field) means "ready".
 */
export class LivestockSystem {
  static getProductDef(species) {
    return LIVESTOCK.PRODUCT_ANIMALS[species] || null;
  }

  static getLastCollectedDay(gameState, animalId) {
    const entry = gameState?.livestock?.[animalId];
    const value = Number(entry?.lastCollectedDay);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
  }

  /**
   * `lastCollectedDay === null` means the animal has never been collected (ready now).
   */
  static isReady(species, lastCollectedDay, currentDay) {
    const def = LivestockSystem.getProductDef(species);
    if (!def) return false;
    if (lastCollectedDay === null || lastCollectedDay === undefined) return true;
    if (!Number.isFinite(lastCollectedDay)) return true;
    const day = Math.max(0, Math.floor(Number(currentDay) || 0));
    return day - Math.floor(lastCollectedDay) >= def.intervalDays;
  }

  /**
   * Collects one product into the inventory, then records `lastCollectedDay`.
   * Returns `{ ok: false, reason: 'inventory_full' }` without losing the product
   * when the backpack cannot fit it.
   */
  static collect(gameState, animalId, species, currentDay, inventorySystem) {
    const def = LivestockSystem.getProductDef(species);
    if (!def) return { ok: false, reason: 'not_productive' };
    if (!inventorySystem || !inventorySystem.canAddItem(def.itemId, 1)) {
      return { ok: false, reason: 'inventory_full' };
    }

    const added = inventorySystem.addItem(def.itemId, 1);
    if (!added || !added.ok) {
      return { ok: false, reason: 'inventory_full' };
    }

    const day = Math.max(0, Math.floor(Number(currentDay) || 0));
    if (!gameState.livestock || typeof gameState.livestock !== 'object') {
      gameState.livestock = {};
    }
    gameState.livestock[animalId] = { lastCollectedDay: day };
    return { ok: true, itemId: def.itemId };
  }
}
