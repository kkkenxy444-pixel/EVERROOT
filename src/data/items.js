import { ASSET_KEYS, cropStageKey } from './assetKeys.js';
import { CROP_LIST, CROPS, getCropUnlockDay, isCropUnlocked } from './crops.js';
import { FISHING, INVENTORY, LIVESTOCK } from './gameConfig.js';

/**
 * Toolbar tools & inventory item catalog for Everroot V1.
 * Tools occupy the quick-switch toolbar; seeds and harvested goods / fish live in inventory.
 */
export const TOOL_IDS = Object.freeze({
  HOE: 'tool_hoe',
  WATERING_CAN: 'tool_water',
  FISHING_ROD: 'tool_rod',
  SEEDS: 'tool_seeds',
});

export const TOOLS = Object.freeze([
  {
    id: TOOL_IDS.HOE,
    name: 'Cangkul',
    shortLabel: 'Cangkul',
    iconKey: ASSET_KEYS.ICON_SHOVEL,
    description: 'Cangkul tanah kebun untuk membuka petak tanam.',
  },
  {
    id: TOOL_IDS.WATERING_CAN,
    name: 'Penyiram',
    shortLabel: 'Siram',
    // TODO_ASSET: dedicated watering_can.png icon in ui/icons/; using ui/icons/water.png
    iconKey: ASSET_KEYS.ICON_WATER,
    description: 'Siram tanah cangkulan agar bibit tumbuh saat tidur.',
  },
  {
    id: TOOL_IDS.SEEDS,
    name: 'Kantung Bibit',
    shortLabel: 'Bibit',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    description: 'Tanam bibit terpilih di tanah cangkulan atau panen tanaman matang.',
  },
  {
    id: TOOL_IDS.FISHING_ROD,
    name: 'Joran Pancing',
    shortLabel: 'Pancing',
    iconKey: ASSET_KEYS.ICON_ROD,
    description: 'Lempar kail ke arah danau/sungai untuk memancing ikan.',
  },
]);

export const ITEMS = Object.freeze({
  // --- Seeds (dibeli di Kios Bibit, tidak bisa dijual di Kotak Jual) ---
  seed_parsnip: Object.freeze({
    id: 'seed_parsnip',
    name: 'Bibit Lobak',
    category: 'seed',
    cropId: 'parsnip',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('parsnip', 5),
    buyPrice: CROPS.parsnip.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  seed_carrot: Object.freeze({
    id: 'seed_carrot',
    name: 'Bibit Wortel',
    category: 'seed',
    cropId: 'carrot',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('carrot', 5),
    buyPrice: CROPS.carrot.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  seed_radish: Object.freeze({
    id: 'seed_radish',
    name: 'Bibit Lobak Merah',
    category: 'seed',
    cropId: 'radish',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('radish', 5),
    buyPrice: CROPS.radish.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  seed_potato: Object.freeze({
    id: 'seed_potato',
    name: 'Bibit Kentang',
    category: 'seed',
    cropId: 'potato',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('potato', 5),
    buyPrice: CROPS.potato.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  seed_beetroot: Object.freeze({
    id: 'seed_beetroot',
    name: 'Bibit Bit',
    category: 'seed',
    cropId: 'beetroot',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('beetroot', 5),
    buyPrice: CROPS.beetroot.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  seed_wheat: Object.freeze({
    id: 'seed_wheat',
    name: 'Bibit Gandum',
    category: 'seed',
    cropId: 'wheat',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('wheat', 5),
    buyPrice: CROPS.wheat.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  seed_sunflower: Object.freeze({
    id: 'seed_sunflower',
    name: 'Bibit Matahari',
    category: 'seed',
    cropId: 'sunflower',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('sunflower', 5),
    buyPrice: CROPS.sunflower.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  seed_cabbage: Object.freeze({
    id: 'seed_cabbage',
    name: 'Bibit Kubis',
    category: 'seed',
    cropId: 'cabbage',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('cabbage', 5),
    buyPrice: CROPS.cabbage.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  seed_kale: Object.freeze({
    id: 'seed_kale',
    name: 'Bibit Kale',
    category: 'seed',
    cropId: 'kale',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('kale', 5),
    buyPrice: CROPS.kale.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  seed_pumpkin: Object.freeze({
    id: 'seed_pumpkin',
    name: 'Bibit Labu',
    category: 'seed',
    cropId: 'pumpkin',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('pumpkin', 5),
    buyPrice: CROPS.pumpkin.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  seed_cauliflower: Object.freeze({
    id: 'seed_cauliflower',
    name: 'Bibit Kembang Kol',
    category: 'seed',
    cropId: 'cauliflower',
    iconKey: ASSET_KEYS.ITEM_SEEDS,
    badgeKey: cropStageKey('cauliflower', 5),
    buyPrice: CROPS.cauliflower.seedPrice,
    sellPrice: 0,
    canBuy: true,
    canSell: false,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),

  // --- Harvested Crops (dijual di Kotak Jual) ---
  crop_parsnip: Object.freeze({
    id: 'crop_parsnip',
    name: 'Lobak Putih',
    category: 'crop',
    iconKey: cropStageKey('parsnip', 5),
    buyPrice: 0,
    sellPrice: CROPS.parsnip.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  crop_carrot: Object.freeze({
    id: 'crop_carrot',
    name: 'Wortel Segar',
    category: 'crop',
    iconKey: cropStageKey('carrot', 5),
    buyPrice: 0,
    sellPrice: CROPS.carrot.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  crop_radish: Object.freeze({
    id: 'crop_radish',
    name: 'Lobak Merah',
    category: 'crop',
    iconKey: cropStageKey('radish', 5),
    buyPrice: 0,
    sellPrice: CROPS.radish.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  crop_potato: Object.freeze({
    id: 'crop_potato',
    name: 'Kentang Kebun',
    category: 'crop',
    iconKey: cropStageKey('potato', 5),
    buyPrice: 0,
    sellPrice: CROPS.potato.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  crop_beetroot: Object.freeze({
    id: 'crop_beetroot',
    name: 'Bit Merah',
    category: 'crop',
    iconKey: cropStageKey('beetroot', 5),
    buyPrice: 0,
    sellPrice: CROPS.beetroot.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  crop_wheat: Object.freeze({
    id: 'crop_wheat',
    name: 'Gandum Emas',
    category: 'crop',
    iconKey: cropStageKey('wheat', 5),
    buyPrice: 0,
    sellPrice: CROPS.wheat.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  crop_sunflower: Object.freeze({
    id: 'crop_sunflower',
    name: 'Bunga Matahari',
    category: 'crop',
    iconKey: cropStageKey('sunflower', 5),
    buyPrice: 0,
    sellPrice: CROPS.sunflower.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  crop_cabbage: Object.freeze({
    id: 'crop_cabbage',
    name: 'Kubis Hijau',
    category: 'crop',
    iconKey: cropStageKey('cabbage', 5),
    buyPrice: 0,
    sellPrice: CROPS.cabbage.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  crop_kale: Object.freeze({
    id: 'crop_kale',
    name: 'Daun Kale',
    category: 'crop',
    iconKey: cropStageKey('kale', 5),
    buyPrice: 0,
    sellPrice: CROPS.kale.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  crop_pumpkin: Object.freeze({
    id: 'crop_pumpkin',
    name: 'Labu Emas',
    category: 'crop',
    iconKey: cropStageKey('pumpkin', 5),
    buyPrice: 0,
    sellPrice: CROPS.pumpkin.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  crop_cauliflower: Object.freeze({
    id: 'crop_cauliflower',
    name: 'Kembang Kol',
    category: 'crop',
    iconKey: cropStageKey('cauliflower', 5),
    buyPrice: 0,
    sellPrice: CROPS.cauliflower.sellPrice,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),

  // --- Caught Fish (M3 Bagian 2: 3 jenis ikan memakai ikon fish.png yang sama) ---
  fish_small: Object.freeze({
    id: 'fish_small',
    name: 'Ikan Kecil Sungai',
    category: 'fish',
    iconKey: ASSET_KEYS.ITEM_FISH,
    tint: 0xd8f3ff,
    weight: FISHING.FISH_ODDS.SMALL,
    buyPrice: 0,
    sellPrice: FISHING.FISH_PRICES.SMALL,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  fish_medium: Object.freeze({
    id: 'fish_medium',
    name: 'Ikan Sedang Danau',
    category: 'fish',
    iconKey: ASSET_KEYS.ITEM_FISH,
    tint: 0x90e0ef,
    weight: FISHING.FISH_ODDS.MEDIUM,
    buyPrice: 0,
    sellPrice: FISHING.FISH_PRICES.MEDIUM,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  fish_large: Object.freeze({
    id: 'fish_large',
    name: 'Ikan Besar Emas',
    category: 'fish',
    iconKey: ASSET_KEYS.ITEM_FISH,
    tint: 0xffd866,
    weight: FISHING.FISH_ODDS.LARGE,
    buyPrice: 0,
    sellPrice: FISHING.FISH_PRICES.LARGE,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),

  // --- Livestock products (Paket 2b, dijual di Kotak Jual) ---
  egg: Object.freeze({
    id: 'egg',
    name: 'Telur Ayam',
    category: 'product',
    iconKey: ASSET_KEYS.ITEM_EGG,
    buyPrice: 0,
    sellPrice: LIVESTOCK.EGG_SELL_PRICE,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
  milk: Object.freeze({
    id: 'milk',
    name: 'Susu Sapi',
    category: 'product',
    iconKey: ASSET_KEYS.ITEM_MILK,
    buyPrice: 0,
    sellPrice: LIVESTOCK.MILK_SELL_PRICE,
    canBuy: false,
    canSell: true,
    stackMax: INVENTORY.DEFAULT_MAX_STACK,
  }),
});

export const LEGACY_FISH_ID_MAP = Object.freeze({
  fish_river: 'fish_small',
  fish_golden: 'fish_large',
});

const ORDERED_CROPS = [...CROP_LIST].sort(
  (a, b) => getCropUnlockDay(a.id) - getCropUnlockDay(b.id)
);

export const SEED_ITEM_IDS = Object.freeze(
  ORDERED_CROPS.map((crop) => crop.seedItemId)
);

export const HARVEST_CROP_ITEM_IDS = Object.freeze(
  ORDERED_CROPS.map((crop) => crop.harvestItemId)
);

export const FISH_ITEM_IDS = Object.freeze([
  'fish_small',
  'fish_medium',
  'fish_large',
]);

export const LIVESTOCK_ITEM_IDS = Object.freeze([
  LIVESTOCK.EGG_ITEM_ID,
  LIVESTOCK.MILK_ITEM_ID,
]);

export const SELLABLE_ITEM_IDS = Object.freeze([
  ...HARVEST_CROP_ITEM_IDS,
  ...FISH_ITEM_IDS,
  ...LIVESTOCK_ITEM_IDS,
]);

export function getSeedUnlockDay(seedItemId) {
  const item = ITEMS[seedItemId];
  if (!item || item.category !== 'seed' || !item.cropId) return 1;
  return getCropUnlockDay(item.cropId);
}

export function isSeedUnlocked(seedItemId, currentDay = 1) {
  const item = ITEMS[seedItemId];
  if (!item || item.category !== 'seed' || !item.cropId) return false;
  return isCropUnlocked(item.cropId, currentDay);
}
