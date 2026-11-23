/**
 * Data quest desa Fase 4 (antar barang). Semua teks dan angka ada di sini.
 *
 * Aturan data:
 * - `npcId` harus cocok dengan `NPC_DEFS` di `npcs.js`.
 * - `order` menentukan urutan tawaran per NPC; `requires` adalah id quest yang
 *   harus sudah selesai sebelum quest ini bisa dibuka.
 * - `minDay` adalah hari buka minimum (dihitung dari hari in-game).
 * - `type: 'antar'` berarti pemain harus membawa `amount` item `itemId` di tas.
 * - `rewardCoins` hanya berisi koin (tanpa item/bibit) agar tidak melompati
 *   jadwal unlock bibit. Nilainya 1,75x nilai jual total, dibulatkan ke 5.
 */
import { ITEMS } from './items.js';

const QUEST_REWARD_MULTIPLIER = 1.75;

function roundToFive(value) {
  return Math.round(value / 5) * 5;
}

/**
 * Hadiah koin quest = nilai jual total x 1,75, dibulatkan ke kelipatan 5.
 * Membaca `sellPrice` langsung dari `items.js` supaya harga tetap satu sumber.
 */
export function computeQuestReward(itemId, amount, multiplier = QUEST_REWARD_MULTIPLIER) {
  const item = ITEMS[itemId];
  const price = Math.max(0, Number(item?.sellPrice) || 0);
  const qty = Math.max(1, Math.floor(Number(amount) || 1));
  const raw = price * qty * multiplier;
  return Math.max(5, roundToFive(raw));
}

export const QUESTS = Object.freeze([
  Object.freeze({
    id: 'sari_telur',
    npcId: 'bu_sari',
    order: 1,
    title: 'Telur untuk Bu Sari',
    type: 'antar',
    itemId: 'egg',
    amount: 3,
    minDay: 3,
    requires: Object.freeze([]),
    rewardCoins: computeQuestReward('egg', 3),
    dialogue: Object.freeze({
      offer: Object.freeze([
        'Eh, kamu datang! Aku sedang membuat kue untuk pasar besok, tapi telurnya kurang.',
        'Boleh bawakan 3 telur ayam? Nanti aku beri upah koin yang pantas.',
      ]),
      reminder: 'Telurnya belum cukup, ya. Aku tunggu sampai terkumpul.',
      done: Object.freeze([
        'Telurnya segar semua! Kue pasar besok pasti laris.',
        'Ini upahmu. Terima kasih sudah menolong, ya!',
      ]),
    }),
  }),

  Object.freeze({
    id: 'sari_susu',
    npcId: 'bu_sari',
    order: 2,
    title: 'Susu untuk Bu Sari',
    type: 'antar',
    itemId: 'milk',
    amount: 2,
    minDay: 6,
    requires: Object.freeze(['sari_telur']),
    rewardCoins: computeQuestReward('milk', 2),
    dialogue: Object.freeze({
      offer: Object.freeze([
        'Susu sapi segar sedang dicari warga. Katanya enak untuk sarapan.',
        'Bawakan 2 botol susu, ya. Aku sudah siapkan upahnya.',
      ]),
      reminder: 'Susunya belum cukup. Sapi memang butuh waktu, jadi santai saja.',
      done: Object.freeze([
        'Wah, susunya masih segar! Ini upahmu, jangan lupa mampir lagi.',
        'Kalau ada telur atau susu lagi, aku selalu mau membeli.',
      ]),
    }),
  }),

  Object.freeze({
    id: 'joko_lobak',
    npcId: 'pak_joko',
    order: 1,
    title: 'Lobak untuk Pak Joko',
    type: 'antar',
    itemId: 'crop_parsnip',
    amount: 3,
    minDay: 3,
    requires: Object.freeze([]),
    rewardCoins: computeQuestReward('crop_parsnip', 3),
    dialogue: Object.freeze({
      offer: Object.freeze([
        'Nak, aku butuh 3 lobak putih untuk benih musim depan.',
        'Kalau kebunmu sudah panen, bawakan ke sini. Aku bayar pakai koin.',
      ]),
      reminder: 'Lobaknya belum cukup. Tanaman butuh sabar, tidak perlu tergesa.',
      done: Object.freeze([
        'Lobak ini bagus, bentuknya rata. Terima kasih, Nak.',
        'Ini upahmu. Gunakan untuk merawat kebunmu.',
      ]),
    }),
  }),

  Object.freeze({
    id: 'joko_lobak_merah',
    npcId: 'pak_joko',
    order: 2,
    title: 'Lobak Merah untuk Pak Joko',
    type: 'antar',
    itemId: 'crop_radish',
    amount: 3,
    minDay: 6,
    requires: Object.freeze(['joko_lobak']),
    rewardCoins: computeQuestReward('crop_radish', 3),
    dialogue: Object.freeze({
      offer: Object.freeze([
        'Sekarang aku butuh lobak merah. Warnanya bagus untuk pasar desa.',
        'Bawakan 3 lobak merah, ya. Pasti sudah kamu tanam, kan?',
      ]),
      reminder: 'Lobak merahnya belum cukup. Coba periksa petakmu lagi.',
      done: Object.freeze([
        'Sempurna! Lobak merah segar seperti ini yang dicari pembeli.',
        'Ambil upahmu. Kerja bagus, Nak.',
      ]),
    }),
  }),

  Object.freeze({
    id: 'dina_ikan',
    npcId: 'dina',
    order: 1,
    title: 'Ikan untuk Dina',
    type: 'antar',
    itemId: 'fish_small',
    amount: 2,
    minDay: 3,
    requires: Object.freeze([]),
    rewardCoins: computeQuestReward('fish_small', 2),
    dialogue: Object.freeze({
      offer: Object.freeze([
        'Hai! Aku ingin coba masak ikan untuk ibuku, tapi aku belum bisa memancing.',
        'Boleh bawakan 2 ikan kecil? Nanti aku bayar pakai koin kios.',
      ]),
      reminder: 'Ikannya belum cukup. Coba pancing lagi di danau, ya!',
      done: Object.freeze([
        'Ikan kecil ini cukup untuk sup! Ibu pasti senang.',
        'Ini upahmu. Makasih ya, kamu hebat!',
      ]),
    }),
  }),

  Object.freeze({
    id: 'dina_ikan_danau',
    npcId: 'dina',
    order: 2,
    title: 'Ikan Danau untuk Dina',
    type: 'antar',
    itemId: 'fish_medium',
    amount: 3,
    minDay: 6,
    requires: Object.freeze(['dina_ikan']),
    rewardCoins: computeQuestReward('fish_medium', 3),
    dialogue: Object.freeze({
      offer: Object.freeze([
        'Ikan sedang lebih susah ditangkap, katanya. Aku penasaran rasanya!',
        'Bawakan 3 ikan sedang, ya. Aku sudah menabung untuk upahnya.',
      ]),
      reminder: 'Ikan sedangnya belum cukup. Sabar, kailnya jangan terburu-buru.',
      done: Object.freeze([
        'Ikan sedang! Ini pasti enak sekali. Aku tidak sabar memasaknya.',
        'Ini upahnya, terima kasih banyak!',
      ]),
    }),
  }),
]);

export const QUESTS_BY_ID = Object.freeze(
  QUESTS.reduce((acc, quest) => {
    acc[quest.id] = quest;
    return acc;
  }, {})
);

/** Status yang boleh tersimpan di save (`aktif` / `selesai`). */
export const STORED_QUEST_STATUSES = Object.freeze(['aktif', 'selesai']);

/**
 * Membersihkan peta `quests` dari save. Entri yang id-nya tidak dikenal,
 * statusnya tidak valid, atau melanggar urutan `requires` dibuang.
 * Save lama tanpa field ini menghasilkan objek kosong (aman).
 */
export function sanitizeQuestState(raw) {
  const result = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;

  for (const quest of QUESTS) {
    const stored = raw[quest.id];
    if (!STORED_QUEST_STATUSES.includes(stored)) continue;
    const prerequisitesMet = quest.requires.every(
      (requiredId) => result[requiredId] === 'selesai'
    );
    if (!prerequisitesMet) continue;
    result[quest.id] = stored;
  }

  return result;
}