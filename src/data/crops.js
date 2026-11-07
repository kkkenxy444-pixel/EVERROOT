import { cropStageKey } from './assetKeys.js';
import { FARMING, SEED_UNLOCK_SCHEDULE } from './gameConfig.js';

/**
 * Lookup map `{ [cropId]: unlockDay }` derived directly from `SEED_UNLOCK_SCHEDULE`.
 */
export const CROP_UNLOCK_DAY_MAP = Object.freeze(
  SEED_UNLOCK_SCHEDULE.reduce((acc, tier) => {
    for (const cropId of tier.crops) {
      acc[cropId] = tier.day;
    }
    return acc;
  }, {})
);

export function getCropUnlockDay(cropId) {
  return CROP_UNLOCK_DAY_MAP[cropId] ?? 1;
}

export function isCropUnlocked(cropId, currentDay = 1) {
  const day = Math.max(1, Math.floor(Number(currentDay) || 1));
  return Boolean(CROPS[cropId]) && day >= getCropUnlockDay(cropId);
}

/**
 * Maps watered growth days (`0..daysToGrow`) onto sprite stages (`00`..`05`):
 * - `0` watered days -> stage `0` (`00`)
 * - `1..(daysToGrow - 1)` watered days -> intermediate stages `1..4` (`01`..`04`)
 * - `>= daysToGrow` watered days -> `maxStage` (`05`, harvest-ready)
 * For 5-day crops (including all 4 legacy V1 crops), produces exact `0, 1, 2, 3, 4, 5`.
 */
export function computeCropStage(
  daysWatered,
  daysToGrow,
  maxStage = FARMING.MAX_STAGE
) {
  const d = Math.max(0, Math.floor(Number(daysWatered) || 0));
  const totalDays = Math.max(1, Math.floor(Number(daysToGrow) || maxStage));
  if (d <= 0) return 0;
  if (d >= totalDays) return maxStage;
  if (totalDays <= 1) return maxStage;

  const growingStages = Math.max(1, maxStage - 1);
  return (
    1 +
    Math.min(
      growingStages - 1,
      Math.floor(((d - 1) * growingStages) / (totalDays - 1))
    )
  );
}

/**
 * 11 crops (4 V1 legacy + 7 Paket 2) with full 6-stage sprites (`00`..`05`).
 *
 * Tabel Balancing Harga Bibit, Harga Jual, dan Hari Tumbuh:
 * | ID          | Nama           | Buka   | Hari Tumbuh | Bibit | Jual | Untung | Untung/Hari | Status |
 * |-------------|----------------|--------|-------------|-------|------|--------|-------------|--------|
 * | parsnip     | Lobak Putih    | Hari 1 | 5 hari      | 10G   | 22G  | +12G   | 2.40G/hari  | Lama   |
 * | carrot      | Wortel Segar   | Hari 1 | 5 hari      | 15G   | 34G  | +19G   | 3.80G/hari  | Lama   |
 * | radish      | Lobak Merah    | Hari 3 | 5 hari      | 18G   | 40G  | +22G   | 4.40G/hari  | Baru   |
 * | potato      | Kentang Kebun  | Hari 3 | 5 hari      | 20G   | 44G  | +24G   | 4.80G/hari  | Baru   |
 * | beetroot    | Bit Merah      | Hari 6 | 6 hari      | 22G   | 54G  | +32G   | 5.33G/hari  | Baru   |
 * | wheat       | Gandum Emas    | Hari 6 | 6 hari      | 24G   | 59G  | +35G   | 5.83G/hari  | Baru   |
 * | sunflower   | Bunga Matahari | Hari 10| 5 hari      | 25G   | 56G  | +31G   | 6.20G/hari  | Lama   |
 * | cabbage     | Kubis Hijau    | Hari 10| 6 hari      | 30G   | 72G  | +42G   | 7.00G/hari  | Baru   |
 * | kale        | Daun Kale      | Hari 14| 7 hari      | 36G   | 92G  | +56G   | 8.00G/hari  | Baru   |
 * | pumpkin     | Labu Emas      | Hari 14| 5 hari      | 40G   | 90G  | +50G   | 10.00G/hari | Lama   |
 * | cauliflower | Kembang Kol    | Hari 18| 8 hari      | 55G   | 143G | +88G   | 11.00G/hari | Baru   |
 */
export const CROPS = Object.freeze({
  parsnip: Object.freeze({
    id: 'parsnip',
    name: 'Lobak Putih',
    seedItemId: 'seed_parsnip',
    harvestItemId: 'crop_parsnip',
    daysToGrow: 5,
    stagesPerDay: 1,
    seedPrice: 10,
    sellPrice: 22,
    maxStage: 5,
    iconKey: cropStageKey('parsnip', 5),
  }),
  carrot: Object.freeze({
    id: 'carrot',
    name: 'Wortel Segar',
    seedItemId: 'seed_carrot',
    harvestItemId: 'crop_carrot',
    daysToGrow: 5,
    stagesPerDay: 1,
    seedPrice: 15,
    sellPrice: 34,
    maxStage: 5,
    iconKey: cropStageKey('carrot', 5),
  }),
  radish: Object.freeze({
    id: 'radish',
    name: 'Lobak Merah',
    seedItemId: 'seed_radish',
    harvestItemId: 'crop_radish',
    daysToGrow: 5,
    stagesPerDay: 1,
    seedPrice: 18,
    sellPrice: 40,
    maxStage: 5,
    iconKey: cropStageKey('radish', 5),
  }),
  potato: Object.freeze({
    id: 'potato',
    name: 'Kentang Kebun',
    seedItemId: 'seed_potato',
    harvestItemId: 'crop_potato',
    daysToGrow: 5,
    stagesPerDay: 1,
    seedPrice: 20,
    sellPrice: 44,
    maxStage: 5,
    iconKey: cropStageKey('potato', 5),
  }),
  beetroot: Object.freeze({
    id: 'beetroot',
    name: 'Bit Merah',
    seedItemId: 'seed_beetroot',
    harvestItemId: 'crop_beetroot',
    daysToGrow: 6,
    stagesPerDay: 1,
    seedPrice: 22,
    sellPrice: 54,
    maxStage: 5,
    iconKey: cropStageKey('beetroot', 5),
  }),
  wheat: Object.freeze({
    id: 'wheat',
    name: 'Gandum Emas',
    seedItemId: 'seed_wheat',
    harvestItemId: 'crop_wheat',
    daysToGrow: 6,
    stagesPerDay: 1,
    seedPrice: 24,
    sellPrice: 59,
    maxStage: 5,
    iconKey: cropStageKey('wheat', 5),
  }),
  sunflower: Object.freeze({
    id: 'sunflower',
    name: 'Bunga Matahari',
    seedItemId: 'seed_sunflower',
    harvestItemId: 'crop_sunflower',
    daysToGrow: 5,
    stagesPerDay: 1,
    seedPrice: 25,
    sellPrice: 56,
    maxStage: 5,
    iconKey: cropStageKey('sunflower', 5),
  }),
  cabbage: Object.freeze({
    id: 'cabbage',
    name: 'Kubis Hijau',
    seedItemId: 'seed_cabbage',
    harvestItemId: 'crop_cabbage',
    daysToGrow: 6,
    stagesPerDay: 1,
    seedPrice: 30,
    sellPrice: 72,
    maxStage: 5,
    iconKey: cropStageKey('cabbage', 5),
  }),
  kale: Object.freeze({
    id: 'kale',
    name: 'Daun Kale',
    seedItemId: 'seed_kale',
    harvestItemId: 'crop_kale',
    daysToGrow: 7,
    stagesPerDay: 1,
    seedPrice: 36,
    sellPrice: 92,
    maxStage: 5,
    iconKey: cropStageKey('kale', 5),
  }),
  pumpkin: Object.freeze({
    id: 'pumpkin',
    name: 'Labu Emas',
    seedItemId: 'seed_pumpkin',
    harvestItemId: 'crop_pumpkin',
    daysToGrow: 5,
    stagesPerDay: 1,
    seedPrice: 40,
    sellPrice: 90,
    maxStage: 5,
    iconKey: cropStageKey('pumpkin', 5),
  }),
  cauliflower: Object.freeze({
    id: 'cauliflower',
    name: 'Kembang Kol',
    seedItemId: 'seed_cauliflower',
    harvestItemId: 'crop_cauliflower',
    daysToGrow: 8,
    stagesPerDay: 1,
    seedPrice: 55,
    sellPrice: 143,
    maxStage: 5,
    iconKey: cropStageKey('cauliflower', 5),
  }),
});

export const CROP_LIST = Object.freeze(Object.values(CROPS));
