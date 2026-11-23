/**
 * Data kalimat NPC desa. Semua teks ada di sini (bukan di logika).
 *
 * Setiap kalimat boleh punya `when`:
 * - `weather`: 'hujan' | 'cerah'
 * - `phase`: 'pagi' | 'siang' | 'sore' | 'malam' (atau array)
 * - `dayMin` / `dayMax`: rentang hari inklusif
 *
 * Kalimat tanpa `when` selalu memenuhi syarat (kalimat umum).
 */

const GENERAL = 10;
const RAIN = 3;
const CLEAR = 1;
const NIGHT = 3;
const DAY_RANGE = 2;

export const NPC_DIALOGUES = Object.freeze({
  bu_sari: Object.freeze({
    lines: Object.freeze([
      // 10 kalimat umum
      { id: 'sari_umum_01', text: 'Selamat datang di plaza desa! Angin hari ini bikin dagangan segar lebih lama, lho.' },
      { id: 'sari_umum_02', text: 'Kalau kebunmu subur, bawa hasilnya ke pasar. Warga sini suka sayur yang baru dipetik.' },
      { id: 'sari_umum_03', text: 'Aku jualan kecil-kecilan di dekat sumur. Ramai kalau sore, jadi aku senang ngobrol.' },
      { id: 'sari_umum_04', text: 'Wortel dan lobak paling laris. Tapi aku juga suka parsnip yang bentuknya lucu.' },
      { id: 'sari_umum_05', text: 'Jangan lupa istirahat. Pedagang juga butuh duduk dan minum teh hangat.' },
      { id: 'sari_umum_06', text: 'Anakku suka sekali bunga matahari. Katanya, kebun yang cerah bikin hati cerah.' },
      { id: 'sari_umum_07', text: 'Kalau tanahmu kering, siram pelan-pelan. Tanaman tidak suka tergesa-gesa.' },
      { id: 'sari_umum_08', text: 'Dina di kios pasar itu cerewet, tapi hatinya baik. Mampir ya ke sana.' },
      { id: 'sari_umum_09', text: 'Sumur ini sudah tua. Dulu katanya jadi tempat warga bertukar cerita setiap pagi.' },
      { id: 'sari_umum_10', text: 'Hasil kebunmu boleh ditukar atau dijual. Yang penting jujur saat menimbang.' },
      // Cuaca hujan / cerah
      {
        id: 'sari_hujan_01',
        text: 'Uh, hujan lagi. Aku tarik dagangan ke bawah atap dulu, nanti kita ngobrol lagi.',
        when: { weather: 'hujan' },
      },
      {
        id: 'sari_hujan_02',
        text: 'Tanah pasti basah semua. Petani senang, tapi pembeli jadi malas keluar.',
        when: { weather: 'hujan' },
      },
      {
        id: 'sari_hujan_03',
        text: 'Kalau hujan begini, aku biasanya menghitung ulang uang receh sambil menunggu reda.',
        when: { weather: 'hujan' },
      },
      {
        id: 'sari_cerah_01',
        text: 'Matahari hari ini hangat. Dagangan cepat kering, tapi pembeli juga betah berlama-lama.',
        when: { weather: 'cerah' },
      },
      // Malam
      {
        id: 'sari_malam_01',
        text: 'Malam sudah larut. Plaza jadi sepi, cuma lampu sumur yang menemaniku.',
        when: { phase: 'malam' },
      },
      {
        id: 'sari_malam_02',
        text: 'Di malam dingin begini, aku rindu suara cerewet pasar di siang hari.',
        when: { phase: 'malam' },
      },
      {
        id: 'sari_malam_03',
        text: 'Hati-hati pulang ya. Jalan desa gelap kalau bulan sedang malu.',
        when: { phase: 'malam' },
      },
      // Rentang hari
      {
        id: 'sari_hari_awal',
        text: 'Kamu pendatang baru, ya? Selamat datang! Desa kami kecil, tapi hangat.',
        when: { dayMin: 1, dayMax: 2 },
      },
      {
        id: 'sari_hari_lama',
        text: 'Sudah lama kamu di lembah ini? Kebunmu pasti makin luas sekarang.',
        when: { dayMin: 10, dayMax: 9999 },
      },
    ]),
    generalCount: GENERAL,
    rainCount: RAIN,
    clearCount: CLEAR,
    nightCount: NIGHT,
    dayRangeCount: DAY_RANGE,
  }),

  pak_joko: Object.freeze({
    lines: Object.freeze([
      // 10 kalimat umum
      { id: 'joko_umum_01', text: 'Halo, Nduk. Atau Nak? Hehe, aku sudah tua, semua orang kupanggil begitu.' },
      { id: 'joko_umum_02', text: 'Cangkul dulu sebelum menanam. Tanah yang gembur membuat akar mudah bernapas.' },
      { id: 'joko_umum_03', text: 'Jangan menanam semua bibit sekaligus. Sisakan untuk hari esok, siapa tahu cuaca berubah.' },
      { id: 'joko_umum_04', text: 'Aku menanam padi dulu di sisi timur. Sekarang lahan itu jadi rumah-rumah baru.' },
      { id: 'joko_umum_05', text: 'Tanaman butuh air, tapi juga butuh jeda. Terlalu basah malah membuat akar membusuk.' },
      { id: 'joko_umum_06', text: 'Kalau daun menguning, jangan panik. Periksa air dan cahayanya dulu.' },
      { id: 'joko_umum_07', text: 'Pupuk alami dari sisa daun bisa menyuburkan tanah. Murah dan tidak merusak.' },
      { id: 'joko_umum_08', text: 'Anak muda sekarang suka bercocok tanam lagi. Aku senang melihatnya.' },
      { id: 'joko_umum_09', text: 'Dulu kami mengangkut hasil panen dengan gerobak kayu. Sekarang ada peti dan kios.' },
      { id: 'joko_umum_10', text: 'Bertani itu sabar. Biji yang tidur hari ini akan bangun jadi makanan besok.' },
      // Cuaca hujan / cerah
      {
        id: 'joko_hujan_01',
        text: 'Hujan ini berkah. Aku tidak perlu menyiram, tinggal duduk melihat air turun.',
        when: { weather: 'hujan' },
      },
      {
        id: 'joko_hujan_02',
        text: 'Dengar suara hujan di atap? Itu lagu paling tua yang kukenal.',
        when: { weather: 'hujan' },
      },
      {
        id: 'joko_hujan_03',
        text: 'Kalau hujan panjang, periksa saluran air. Jangan sampai kebun tergenang.',
        when: { weather: 'hujan' },
      },
      {
        id: 'joko_cerah_01',
        text: 'Langit cerah begini bagus untuk menjemur benih. Jangan sampai kehujanan, ya.',
        when: { weather: 'cerah' },
      },
      // Malam
      {
        id: 'joko_malam_01',
        text: 'Malam begini aku biasanya memeriksa tali pagar. Kadang hewan liar lewat.',
        when: { phase: 'malam' },
      },
      {
        id: 'joko_malam_02',
        text: 'Bintang di atas lembah masih sama seperti saat aku muda dulu.',
        when: { phase: 'malam' },
      },
      {
        id: 'joko_malam_03',
        text: 'Tidurlah cukup. Petani yang lelah mudah salah mencangkul.',
        when: { phase: 'malam' },
      },
      // Rentang hari
      {
        id: 'joko_hari_awal',
        text: 'Kebun pertama selalu paling berkesan. Rawat baik-baik, ya.',
        when: { dayMin: 1, dayMax: 3 },
      },
      {
        id: 'joko_hari_lama',
        text: 'Sudah dua minggu? Tanamanmu pasti sudah beberapa kali panen. Kerja bagus.',
        when: { dayMin: 14, dayMax: 9999 },
      },
    ]),
    generalCount: GENERAL,
    rainCount: RAIN,
    clearCount: CLEAR,
    nightCount: NIGHT,
    dayRangeCount: DAY_RANGE,
  }),

  dina: Object.freeze({
    lines: Object.freeze([
      // 10 kalimat umum
      { id: 'dina_umum_01', text: 'Hai! Kamu yang punya kebun di seberang gerbang, kan? Aku penasaran banget!' },
      { id: 'dina_umum_02', text: 'Kios ini punya ibuku. Aku jaga kalau beliau pergi ke rumah tetangga.' },
      { id: 'dina_umum_03', text: 'Aku suka menata buah supaya warnanya enak dilihat. Kata ibu, itu juga seni.' },
      { id: 'dina_umum_04', text: 'Kalau kamu panen banyak, cerita dong! Aku belum pernah lihat kebun sebesar punyamu.' },
      { id: 'dina_umum_05', text: 'Jangan cuma jual, kadang tukar juga. Kadang tukar itu lebih seru daripada uang.' },
      { id: 'dina_umum_06', text: 'Aku ingin belajar menanam, tapi kios selalu ramai saat pagi. Nanti sore aku coba.' },
      { id: 'dina_umum_07', text: 'Bu Sari bilang, hasil kebun terbaik adalah yang dibagi ke tetangga. Setuju?' },
      { id: 'dina_umum_08', text: 'Ada labu raksasa di lembah utara, katanya. Aku belum pernah lihat langsung.' },
      { id: 'dina_umum_09', text: 'Kalau kamu bingung harga, tanya saja. Aku suka menjelaskan sambil bercerita.' },
      { id: 'dina_umum_10', text: 'Pasar sore ini bakal rame. Datang lagi ya, biar bisa ngobrol lebih lama.' },
      // Cuaca hujan / cerah
      {
        id: 'dina_hujan_01',
        text: 'Hujan! Aku suka suara hujan di atap kios, rasanya seperti musik.',
        when: { weather: 'hujan' },
      },
      {
        id: 'dina_hujan_02',
        text: 'Kalau hujan, pembeli berkurang. Tapi aku jadi punya waktu menghitung stok.',
        when: { weather: 'hujan' },
      },
      {
        id: 'dina_hujan_03',
        text: 'Awas licin di depan kios. Aku sudah taruh papan kecil supaya orang tidak terpeleset.',
        when: { weather: 'hujan' },
      },
      {
        id: 'dina_cerah_01',
        text: 'Cerah! Kios paling ramai kalau matahari tidak terlalu terik. Pas sekali hari ini.',
        when: { weather: 'cerah' },
      },
      // Malam
      {
        id: 'dina_malam_01',
        text: 'Malam di pasar sepi sekali. Aku menyalakan lampu kecil supaya tidak terlalu gelap.',
        when: { phase: 'malam' },
      },
      {
        id: 'dina_malam_02',
        text: 'Kamu masih bangun? Aku sedang menunggu ibu pulang dari rumah Bu Sari.',
        when: { phase: 'malam' },
      },
      {
        id: 'dina_malam_03',
        text: 'Bintangnya terang ya. Kadang aku berkhayal bisa menanam di bulan.',
        when: { phase: 'malam' },
      },
      // Rentang hari
      {
        id: 'dina_hari_awal',
        text: 'Hari pertamamu? Selamat! Kalau butuh bibit, kios kami selalu buka.',
        when: { dayMin: 1, dayMax: 2 },
      },
      {
        id: 'dina_hari_lama',
        text: 'Seminggu sudah! Kebunmu sudah berapa petak sekarang? Aku ingin tahu!',
        when: { dayMin: 7, dayMax: 9999 },
      },
    ]),
    generalCount: GENERAL,
    rainCount: RAIN,
    clearCount: CLEAR,
    nightCount: NIGHT,
    dayRangeCount: DAY_RANGE,
  }),
});

/**
 * Cek apakah satu kalimat memenuhi konteks cuaca/fase/hari.
 * `context` = `{ raining, phase, day }`.
 */
export function isLineEligible(line, context = {}) {
  const when = line?.when;
  if (!when) return true;

  if (when.weather) {
    const raining = Boolean(context.raining);
    if (when.weather === 'hujan' && !raining) return false;
    if (when.weather === 'cerah' && raining) return false;
  }

  if (when.phase) {
    const phases = Array.isArray(when.phase) ? when.phase : [when.phase];
    if (!phases.includes(context.phase)) return false;
  }

  const day = Math.max(1, Math.floor(Number(context.day) || 1));
  if (Number.isFinite(when.dayMin) && day < when.dayMin) return false;
  if (Number.isFinite(when.dayMax) && day > when.dayMax) return false;

  return true;
}

/**
 * Pilih `count` kalimat acak yang memenuhi syarat, tanpa mengulang kalimat
 * terakhir yang baru saja diucapkan NPC yang sama. `rng` bisa diganti untuk tes.
 */
export function pickDialogueLines(
  lines,
  context,
  lastLineId = null,
  count = 2,
  rng = Math.random
) {
  if (!Array.isArray(lines) || lines.length === 0) return [];
  const eligible = lines.filter((line) => isLineEligible(line, context));
  if (eligible.length === 0) return [];

  const withoutLast = eligible.filter((line) => line.id !== lastLineId);
  const pool = withoutLast.length > 0 ? withoutLast : eligible;

  // Fisher-Yates pada salinan agar data tetap immutable.
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  const take = Math.max(1, Math.min(Math.floor(count) || 1, shuffled.length));
  return shuffled.slice(0, take);
}
