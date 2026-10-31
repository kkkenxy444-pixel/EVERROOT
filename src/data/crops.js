import { cropStageKey } from './assetKeys.js';

/**
 * 4 V1 crops with full 6-stage sprites (`00`..`05`) verified in `asset-manifest.json`.
 * Each crop advances stages when watered and slept through the night.
 */
export const CROPS = Object.freeze({
  parsnip: Object.freeze({
    id: 'parsnip',
    name: 'Lobak Putih',
    seedItemId: 'seed_parsnip',
    harvestItemId: 'crop_parsnip',
    daysToGrow: 5, // advances +1 stage/day when watered (00 -> 01 -> 02 -> 03 -> 04 -> 05)
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
});

export const CROP_LIST = Object.freeze(Object.values(CROPS));
