# ASSET AUDIT REPORT — EVERROOT V1 (MVP)

Laporan audit aset berdasarkan inspeksi langsung terhadap `public/assets/asset-manifest.json` (507 aset media runtime) dan verifikasi biner file di `public/assets/`. Semua file asli di `public/assets/` dijaga utuh byte-for-byte tanpa modifikasi.

---

## 1. Ringkasan Paket Aset (`asset-manifest.json`)

| Kategori | Jumlah File | Keterangan |
| :--- | ---: | :--- |
| Images (`.png`) | 397 | Spritesheet karakter, tileset, bangunan, tanaman, efek, ikon & panel UI |
| Audio (`.ogg`, `.wav`) | 109 | 5 BGM (`.ogg`), 8 Ambience, 96 SFX |
| Fonts (`.ttf`) | 1 | `fonts/adapa.ttf` (font piksel utama) |
| **Total Media Runtime** | **507** | (+ `asset-manifest.json` & `SOURCE_RIGHTS_NOTES.txt`) |

---

## 2. Verifikasi Ukuran Frame `_stripN` & Tileset

### 2.1. Karakter Human (`characters/human/<action>/`)
Semua strip karakter manusia memiliki tinggi `64px` dan lebar kelipatan `96px` (`frameWidth = 96`, `frameHeight = 64`). Posisi kaki karakter berada pada titik `(x = 48, y = 39)` di dalam frame `96x64`.

| Action Folder | Sufiks Strip | Ukuran Gambar | Frame Width x Height | Jumlah Frame | Dipakai di V1 |
| :--- | :--- | :--- | :--- | ---: | :---: |
| `idle` | `_strip9` | `864 x 64` | `96 x 64` | 9 | Ya |
| `walking` | `_strip8` | `768 x 64` | `96 x 64` | 8 | Ya |
| `dig` | `_strip13` | `1248 x 64` | `96 x 64` | 13 | Ya |
| `watering` | `_strip5` | `480 x 64` | `96 x 64` | 5 | Ya |
| `doing` | `_strip8` | `768 x 64` | `96 x 64` | 8 | Ya (tanam/panen) |
| `casting` | `_strip15` | `1440 x 64` | `96 x 64` | 15 | Ya |
| `waiting` | `_strip9` | `864 x 64` | `96 x 64` | 9 | Ya |
| `reeling` | `_strip13` | `1248 x 64` | `96 x 64` | 13 | Ya |
| `caught` | `_strip10` | `960 x 64` | `96 x 64` | 10 | Ya |
| `run`, `jump`, `roll`, `carry`, `swimming`, `axe`, `mining`, `attack`, `hurt`, `death`, `hammering` | `_strip8` s/d `_strip23` | `N*96 x 64` | `96 x 64` | 8–23 | Dilewati (V2) |

### 2.2. Nature, Props & Effects `_stripN` yang Dipakai di V1
- `world/nature/spr_deco_tree_01_strip4.png`: `128 x 34` -> **4 frame @ `32 x 34`**
- `world/nature/spr_deco_tree_02_strip4.png`: `112 x 43` -> **4 frame @ `28 x 43`**
- `world/nature/spr_deco_mushroom_blue_01_strip4.png`: `64 x 16` -> **4 frame @ `16 x 16`**
- `world/nature/spr_deco_mushroom_red_01_strip4.png`: `64 x 16` -> **4 frame @ `16 x 16`**
- `world/props/spr_deco_windmill_withshadow_strip9.png`: `1008 x 112` -> **9 frame @ `112 x 112`**
- `effects/chimney_smoke/chimneysmoke_01_strip30.png`: `450 x 37` -> **30 frame @ `15 x 37`**
- `effects/glint/spr_deco_glint_01_strip6.png`: `42 x 7` -> **6 frame @ `7 x 7`**
- `effects/dust/dust_run_strip8.png`: `192 x 9` -> **8 frame @ `24 x 9`**

### 2.3. Tileset Utama (`world/tilesets/spr_tileset_sunnysideworld_16px.png`)
- Ukuran: `1024 x 1024` piksel, ukuran tile `16 x 16` piksel (`64 kolom x 64 baris = 4096 tile`).
- Rumus indeks: `index = row * 64 + col` (0-based).
- Semua indeks yang dipakai (rumput `65–66, 129–134, 194–195, 257–258`, tanah jalan `449, 457–460, 521–522`, tepi rumput jalan `452, 454, 515, 517`, air dalam 4x4 `1163–1166, 1227–1230, 1291–1294, 1355–1358`, tepi sungai/danau `147–152, 211–215, 275–277, 339–341`, pagar `166–170, 231, 233`, jembatan `359–361, 424`, semak & bunga `91–97, 155–161, 223–225`, batu & tunggul `287–290, 351–352`) telah diverifikasi secara visual dan tercatat di `src/data/tileIndex.js` serta dapat diperiksa langsung di `TilesetDebugScene`.

---

## 3. Aset yang Dipakai di V1 (`src/data/assetKeys.js`)

1. **Branding & Font**:
   - `ui/branding/game_icon_primary.png` (`1536x1536`, untuk Menu; salinan ikon PNG valid `32x32` (`favicon-32.png`), `192x192` (`icon-192.png`), dan `512x512` (`icon-512.png`, `game_icon_copy.png`) dibuat terpisah di `public/icons/` tanpa menyentuh file asli di `public/assets/`).
   - `fonts/adapa.ttf` via `@font-face` (`Adapa`).
2. **UI Panels & Icons**:
   - `ui/panels/ui_cozy_free.png` (`256x256`) untuk gaya warna hangat Sunnyside/Cozy.
   - `ui/icons/`: `shovel.png`, `water.png`, `rod.png`, `basket.png`, `plant.png`, `confirm.png`, `cancel.png`, `arrow_left.png`, `arrow_right.png`, `arrow_up.png`, `itemdisc_01.png`, `expression_alerted.png`, `expression_love.png`, `expression_working.png`, `stopwatch.png`.
3. **World & Bangunan**:
   - `world/tilesets/spr_tileset_sunnysideworld_16px.png` (`1024x1024`).
   - `world/buildings/buildings_v001.png` (`640x640`) — pondok biru-kayu (`x=13, y=129, w=54, h=44` dengan pintu `x=48, y=112, w=16, h=13`) untuk rumah player (tidur & autosave), dan kios kayu (`x=129, y=80, w=30, h=23`) di dekat shipping box.
   - `world/nature/spr_deco_tree_01_strip4.png`, `spr_deco_tree_02_strip4.png`, `spr_deco_mushroom_blue_01_strip4.png`, `spr_deco_mushroom_red_01_strip4.png`.
   - `world/props/spr_deco_windmill_withshadow_strip9.png`, `spr_deco_coracle_land.png`.
   - `effects/chimney_smoke/chimneysmoke_01_strip30.png`, `effects/glint/spr_deco_glint_01_strip6.png`, `effects/dust/dust_run_strip8.png`.
4. **Player (3-Layer Container)**:
   - Layer `base` + `spikeyhair` + `tools` dari `characters/human/` untuk 9 aksi (`idle`, `walking`, `dig`, `watering`, `doing`, `casting`, `waiting`, `reeling`, `caught` = 27 strip).
5. **Farming, Mancing & Ekonomi**:
   - Tanah: `farming/crops/soil_00.png` (kering), `soil_01.png` (basah), `soil_03.png` (lubang kering), `soil_04.png` (lubang basah).
   - Shipping Box: `farming/crops/crate_base.png` (`16x16`) + `crate_top.png` (`16x14`).
   - Item: `farming/crops/seeds_generic.png`, `fish.png`, `wood.png`, `rock.png`.
   - **4 Tanaman Lengkap (Stage `00`–`05`)**:
     1. **Parsnip** (`parsnip_00.png` s/d `parsnip_05.png`)
     2. **Carrot** (`carrot_00.png` s/d `carrot_05.png`)
     3. **Pumpkin** (`pumpkin_00.png` s/d `pumpkin_05.png`)
     4. **Sunflower** (`sunflower_00.png` s/d `sunflower_05.png`)
6. **Audio**:
   - **5 BGM (`audio/bgm/*.ogg`)**:
     1. `week_29_-_heart-shaped_candy.ogg` (`BGM_MENU`) — dipakai untuk **MenuScene** (melodi chiptune hangat, ceria, dan mengundang).
     2. `week_23_-_workshop_breadboard.ogg` (`BGM_FARM_DAY`) — dipakai untuk **GameScene Pagi & Siang** (ritme santai dan stabil untuk berkebun & memancing).
     3. `week_29_-_heart-shaped_palpatations.ogg` (`BGM_COZY_ALT`) — dipakai untuk **GameScene Sore & Malam** (aransemen tenang untuk suasana senja/malam sebelum tidur).
     4. `week_17_-_alley_cat_dumpster_divin.ogg` (`BGM_WORKSHOP`) — terdaftar di `assetKeys.js`, disiapkan untuk ruang kerja/tambang V2 karena ritmenya eksperimental.
     5. `week_17_-_alley_cat_dumpster_party.ogg` (`BGM_PARTY`) — terdaftar di `assetKeys.js`, disiapkan untuk festival V2 karena temponya cepat/energetik.
   - **Ambience (`audio/ambience/*.wav`)**: `morning-birds.wav` (Pagi), `stream.wav` (Siang & Sore), `night-crickets.wav` (Malam).
   - **SFX**: Lengkap dari `audio/sfx/farming/`, `audio/sfx/fishing/`, `audio/sfx/shop/`, `audio/sfx/items/`, `audio/sfx/jingles/`, `audio/sfx/ui/`, `audio/sfx/footsteps/`, `audio/sfx/movement/`, `audio/sfx/environment/`, `audio/sfx/home/`.

---

## 4. Aset yang Dilewati di V1 (Beserta Alasan)

1. `world/interiors/furnipixel/furnipixel_free.png` & `world/interiors/interior_furniture_2d/interior_furniture_2d.png`:
   - **Alasan**: Sesuai aturan proyek, rumah di V1 hanya untuk tidur dan save (tanpa interior penuh), dan `SOURCE_RIGHTS_NOTES.txt` mencatat lisensi kedua sheet furnitur ini belum terverifikasi.
2. `characters/enemies/goblin/*` & `characters/enemies/skeleton/*` + `audio/sfx/combat/*`:
   - **Alasan**: Combat dan musuh berada di luar scope V1 (disiapkan untuk V2).
3. `characters/animals/*` + `audio/sfx/animals/*` + `farming/crops/egg.png`, `milk.png`:
   - **Alasan**: Hewan ternak berada di luar scope V1.
4. `audio/sfx/cooking/*`:
   - **Alasan**: Fitur memasak (cooking) berada di luar scope V1.
5. Gaya rambut selain `spikeyhair` (`bowlhair`, `curlyhair`, `longhair`, `mophair`, `shorthair`):
   - **Alasan**: Hanya `spikeyhair` yang memiliki file lengkap di seluruh 20 folder aksi (5 gaya rambut lain tidak memiliki file terpisah di folder `walking/` dan `mining/`, melainkan tercatat di `duplicate_aliases` pada `asset-manifest.json`).
6. 7 tanaman tambahan (`beetroot`, `cabbage`, `cauliflower`, `kale`, `potato`, `radish`, `wheat`):
   - **Alasan**: Scope V1 menetapkan 4 tanaman dengan stage lengkap `00–05`. Struktur `src/data/crops.js` dibuat data-driven sehingga ke-7 tanaman ini siap diaktifkan di V2.
7. `world/tilesets/spr_tileset_sunnysideworld_forest_32px.png`:
   - **Alasan**: Map outdoor V1 dibangun seragam dengan tileset 16px (`spr_tileset_sunnysideworld_16px.png`).

---

## 5. Masalah / Temuan Audit & Daftar Final `TODO_ASSET`

### Temuan Teknis pada Paket Aset
1. **Header JPEG pada File Berekstensi `.png` (`ui/branding/`)**:
   - `ui/branding/game_icon_primary.png` dan `ui/branding/game_icon_alt.png` sebenarnya berformat **JPEG (`JFIF`, `\xff\xd8\xff\xe0`)** meskipun berekstensi `.png`. Browser dan loader `this.load.image` Phaser 3 tetap memuatnya dengan aman karena mendeteksi MIME/magic bytes gambar, sedangkan untuk favicon & manifest PWA telah dibuat ikon **PNG murni yang valid** (`\x89PNG\r\n\x1a\n`) di `public/icons/` (`favicon-32.png`, `icon-192.png`, `icon-512.png`, `game_icon_copy.png`).
2. **Anomali `_stripN` pada `dust_general_strip9.png` dan `characters/enemies/goblin/`**:
   - `effects/dust/dust_general_strip9.png` berukuran `192 x 9` piksel (8 frame @ `24x9`, identik ukurannya dengan `dust_run_strip8.png`), sehingga `192 / 9 = 21.33px` bukan bilangan bulat. Untuk efek debu jalan di V1 kita memakai `effects/dust/dust_run_strip8.png` (`192 x 9`, 8 frame @ `24x9` presisi).
   - 9 file di `characters/enemies/goblin/` memiliki jumlah frame aktual berbeda dari nama `_stripN` atau disusun multi-baris (`128px`/`192px` tinggi), sebagaimana sudah diberi catatan `frames_note` di `asset-manifest.json`.
3. **Penomoran `soil_02.png` Tidak Ada**:
   - Di `farming/crops/`, file tanah yang tersedia adalah `soil_00.png`, `soil_01.png`, `soil_03.png`, dan `soil_04.png` (tidak ada `soil_02.png`).
4. **Ejaan Folder vs File `hammering/hamering`**:
   - Folder bernama `characters/human/hammering/` tetapi nama file di dalamnya menggunakan satu huruf `m`: `*_hamering_strip23.png`.

### Daftar Final `TODO_ASSET` (Placeholder yang Digunakan di V1)
- `TODO_ASSET: ikon koin khusus (coin.png)` — Paket aset menyertakan SFX `coin_collect.wav`, tetapi tidak menyertakan sprite koin tunggal di `ui/icons/` (paket `loot_essentials_24.zip` sengaja dikecualikan di manifest). Di HUD V1 digunakan ikon koin piksel bulat berwarna emas (`Graphics`) di samping teks jumlah koin.
- `TODO_ASSET: ikon penyiram tanaman tersendiri di ui/icons/ (watering_can.png)` — Di `ui/icons/` tersedia `water.png` (tetes air) untuk representasi alat siram; pada toolbar dipakai `ui/icons/water.png`.
- `TODO_ASSET: bobber / pelampung pancing terpisah (fishing_bobber.png)` — Tidak ada gambar bobber/pelampung terpisah di `asset-manifest.json`; animasi `tools_casting/waiting/reeling` menampilkan joran & tali pancing, sedangkan untuk titik pelampung di air digunakan objek `Graphics` merah-putih + cincin riak air dengan komentar `TODO_ASSET` di `src/systems/FishingSystem.js`.
- `TODO_ASSET: ikon ikan terpisah per ukuran/jenis` — Paket aset hanya memiliki satu ikon ikan (`farming/crops/fish.png`); di `src/data/items.js` dibuat 3 jenis ikan (`fish_small` `6G`, `fish_medium` `12G`, `fish_large` `25G`) memakai ikon `fish.png` yang sama dengan pembeda nama, harga jual, peluang, dan `tint` halus.
- `TODO_ASSET: ikon bibit spesifik per jenis tanaman` — Paket hanya memiliki 1 sprite bibit generik (`farming/crops/seeds_generic.png`); di toolbar/toko digunakan `seeds_generic.png` dikombinasikan dengan badge/ikon hasil tanaman (`crop_<id>_05`) agar tiap bibit mudah dibedakan.
