/**
 * Tiga NPC desa (Fase 3). Semua metadata ada di sini; kalimat di `dialogues.js`.
 *
 * `spotId` harus cocok dengan `MAPS.village.NPC_SPOTS[].id` supaya posisi dan
 * arah hadap tetap satu sumber data. `hair` memakai variasi lapisan karakter
 * yang dimuat khusus NPC (`idle` + `doing`).
 */
export const NPC_DEFS = Object.freeze([
  Object.freeze({
    id: 'bu_sari',
    name: 'Bu Sari',
    spotId: 'plaza',
    hair: 'longhair',
    dialogueId: 'bu_sari',
  }),
  Object.freeze({
    id: 'pak_joko',
    name: 'Pak Joko',
    spotId: 'house',
    hair: 'bowlhair',
    dialogueId: 'pak_joko',
  }),
  Object.freeze({
    id: 'dina',
    name: 'Dina',
    spotId: 'market',
    hair: 'curlyhair',
    dialogueId: 'dina',
  }),
]);

/**
 * Menggabungkan definisi NPC dengan titik `NPC_SPOTS` milik map.
 * Titik yang tidak ditemukan dilewati dengan aman (tidak ada NPC tanpa posisi).
 */
export function resolveNpcSpawns(npcDefs, mapDef) {
  const spots = Array.isArray(mapDef?.NPC_SPOTS) ? mapDef.NPC_SPOTS : [];
  const out = [];
  for (const def of npcDefs || []) {
    const spot = spots.find((candidate) => candidate.id === def.spotId);
    if (!spot) continue;
    out.push({ def, spot });
  }
  return out;
}
