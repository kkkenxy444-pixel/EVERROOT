# PROJECT MEMORY — EVERROOT V1 (MVP)

> **ATURAN PEMAKAIAN (WAJIB DIBACA SETIAP SESI BARU)**
> 1. **Setiap sesi baru**: Baca `PROJECT_MEMORY.md` dan `ASSET_AUDIT.md` **SEBELUM** menulis atau mengubah kode apa pun.
> 2. **Verifikasi langsung**: Sebelum menganggap suatu fitur/file sudah selesai, verifikasi dengan membaca file-nya langsung di `src/`, jangan hanya percaya catatan.
> 3. **Update rutin**: Di akhir setiap milestone atau sesi, perbarui bagian **Status per Milestone**, **Peta Kode**, **Masalah yang Diketahui**, dan **Log Sesi** di file ini.
> 4. **Pemulihan pasca-interupsi**: Kalau sesi sebelumnya terputus saat mengedit sebuah file, periksa utuh/tidaknya file tersebut dan uji syntax-nya terlebih dahulu sebelum melanjutkan.

---

## 1. Ringkasan Project

- **Nama Game**: **Everroot** (V1 / MVP)
- **Genre & Gaya Visual**: Pixel art 2D top-down (farming + mancing + explore) bergaya *Sunnyside World*.
- **Engine & Tooling**:
  - **Phaser 3**: spesifikasi `^3.90.0` di `package.json` (terinstal `phaser@3.90.0` — **bukan** Phaser 4).
  - **Bundler**: Vite `^6.3.5` di `package.json` (terinstal `vite@6.4.5`), JavaScript ES Modules (`"type": "module"`).
- **Resolusi & Render**: `Phaser.Scale.RESIZE` dengan ukuran canvas mengikuti piksel layar fisik (`innerWidth/innerHeight x devicePixelRatio`, dibatasi maksimum `MAX_DPR: 2` dan `1920x1080` agar ringan di HP mid-range), `pixelArt: true`, `roundPixels: true`, `antialias: false`. Kamera dunia (`GameScene`) memakai zoom bilangan bulat (`zoom = Math.max(1, Math.round(height / 220))`; pada layar `1612x720` memakai **`zoom = 3`** sehingga terlihat `537.3 x 240` unit dunia tanpa bar hitam), sedangkan UI (`UIScene`, `TouchControls`, `MenuScene`) digambar pada resolusi layar asli dengan skala UI bilangan bulat (`uiScale = Math.max(1, Math.round(height / 360))`; pada layar `1612x720` memakai **`uiScale = 2`**). Fisika memakai `Arcade Physics` (`gravity: { x: 0, y: 0 }`).
- **Target Lingkungan & Tes**: Termux di Android (`linux` / `android-arm64`, `node v24.22.1`, `npm 12.2.1`), diakses lewat browser HP di `localhost`. Tanpa dependency native yang rumit.

---

## 2. Cara Menjalankan

```bash
# 1. Install dependency (sudah terinstal di node_modules/)
npm install

# 2. Jalankan dev server untuk dites dari browser HP (port default 5173)
npm run dev -- --host

# 3. Jalankan production build (wajib lolos di akhir tiap milestone)
npm run build

# 4. Preview hasil build produksi (port default 4173)
npm run preview -- --host
```

- **Catatan Khusus Termux**: Di Termux Android, pemanggilan biner `vite` via `sh` gagal apabila mengandalkan shebang `#!/usr/bin/env node` karena `/usr/bin/env` tidak berada di path standar Linux desktop. Oleh karena itu, script di `package.json` telah dikonfigurasi memanggil Node secara langsung:
  - `"dev": "node ./node_modules/vite/bin/vite.js"`
  - `"build": "node ./node_modules/vite/bin/vite.js build"`
  - `"preview": "node ./node_modules/vite/bin/vite.js preview"`
- **Shortcut URL Debug**:
  - Tambahkan `?scene=tileset` (misal `http://localhost:5173/?scene=tileset`) untuk langsung membuka `TilesetDebugScene`.
  - Tambahkan `?debug=1` (misal `http://localhost:5173/?debug=1`) untuk mengaktifkan **Mode Debug Kecil** (menampilkan kotak debug collider Arcade Physics di `GameScene`, tombol kecil `+100G` / `Hari+1` / `+Bibit` di pojok kanan atas `UIScene`, serta shortcut keyboard `F6` = `+100G`, `F7` = ganti hari penuh termasuk tumbuh tanaman & autosave tanpa animasi tidur, `F8` = isi semua bibit `+5`). Di mode normal (tanpa `?debug=1`), fitur ini tidak aktif sama sekali.

---

## 3. Aset

- **Sumber Aset**: `GAME_ASSETS_MASTER_PHASER3_V5_WITH_ICON_ORIGINAL.zip` di root workspace, diekstrak utuh ke `public/assets/` dengan struktur folder aslinya (`507` aset media runtime di `public/assets/asset-manifest.json` + `SOURCE_RIGHTS_NOTES.txt`).
- **Aturan Ketat Aset**:
  - **JANGAN** mengubah, me-resize, mengonversi, atau menimpa file asli di dalam `public/assets/`.
  - Pakai **HANYA** aset dari ZIP (`public/assets/`). Jangan mengarang path file.
  - Salinan ikon ukuran kecil untuk favicon & PWA disimpan terpisah di `public/icons/` (`favicon-32.png`, `icon-192.png`, `game_icon_copy.png`) dan direferensikan oleh `index.html` serta `public/manifest.webmanifest`.
- **Catatan Lisensi**: Bundle aset tidak boleh disebar di repositori publik. Dua sheet furnitur interior (`world/interiors/furnipixel/furnipixel_free.png` dan `world/interiors/interior_furniture_2d/interior_furniture_2d.png`) belum memiliki kejelasan lisensi menurut `SOURCE_RIGHTS_NOTES.txt` dan **tidak dipakai** di V1.
- **Ringkasan Temuan `ASSET_AUDIT.md`**:
  1. **Anomali Header JPEG ber-ekstensi `.png`**: `ui/branding/game_icon_primary.png` dan `ui/branding/game_icon_alt.png` memiliki magic bytes JPEG (`JFIF`, `\xff\xd8\xff\xe0`) meskipun berekstensi `.png`. Loader gambar browser/Phaser tetap dapat memuatnya, tetapi parser PNG murni akan menolak file tersebut.
  2. **Anomali `_stripN`**: `effects/dust/dust_general_strip9.png` berukuran `192x9` (8 frame @ `24x9`, bukan 9 frame bulat), sehingga V1 memakai `effects/dust/dust_run_strip8.png` (`192x9`, 8 frame @ `24x9`). Selain itu 9 file di `characters/enemies/goblin/` memiliki `actual_frames` berbeda dari nama `_stripN` atau disusun multi-baris.
  3. **Kelengkapan Rambut Karakter**: Hanya gaya rambut `spikeyhair` yang memiliki file fisik di seluruh 20 folder aksi `characters/human/` (5 gaya rambut lain di folder `walking/` dan `mining/` tercatat sebagai `duplicate_aliases` di `asset-manifest.json`). V1 memakai `base` + `spikeyhair` + `tools`.
  4. **Penomoran Tanah & Ejaan Folder**: `farming/crops/soil_02.png` tidak ada (hanya `soil_00`, `soil_01`, `soil_03`, `soil_04`). Folder `characters/human/hammering/` berisi file dengan ejaan `*_hamering_strip23.png` (satu `m`).
  5. **Daftar `TODO_ASSET` (Placeholder V1)**:
     - `TODO_ASSET: ikon koin khusus (coin.png)` -> digambar dengan `Phaser.GameObjects.Graphics` (lingkaran koin emas piksel) di `UIScene.js`.
     - `TODO_ASSET: ikon penyiram tanaman tersendiri di ui/icons/ (watering_can.png)` -> menggunakan `ui/icons/water.png`.
     - `TODO_ASSET: bobber / pelampung pancing terpisah (fishing_bobber.png)` -> menggunakan objek `Phaser.GameObjects.Graphics` ringan (pelampung merah-putih + riak air piksel) di `src/systems/FishingSystem.js`.
     - `TODO_ASSET: ikon ikan terpisah per jenis (fish_small.png, fish_medium.png, fish_large.png)` -> hanya ada 1 ikon ikan `farming/crops/fish.png`; dipakai bersama untuk 3 jenis ikan di `src/data/items.js` (`fish_small` `12G`, `fish_medium` `24G`, `fish_large` `50G`) dengan pembeda nama, harga jual, dan `tint` lembut di slot UI/toko.
     - `TODO_ASSET: ikon bibit spesifik per jenis tanaman` -> hanya ada `farming/crops/seeds_generic.png`; dikombinasikan dengan badge ikon hasil panen (`crop_<id>_05`).

---

## 4. Keputusan Desain yang Sudah Final

### Scope V1 (Hanya Ini)
1. **Menu**: Ikon game (`game_icon_primary.png`), judul Everroot, tombol Mulai/Mulai Baru, Lanjut (jika ada save), Hapus Save, dan tombol Cek Tileset (Debug). Tap pertama wajib membuka kunci audio browser.
2. **1 Map Outdoor (16px)**: Dibangun dari `spr_tileset_sunnysideworld_16px.png` (`44x30` tile) berisi area kebun (`x=8..19, y=12..18`), jalan tanah, pohon & batu, danau + dermaga pancing (`x=26..37, y=11..21`), 1 rumah player dari `buildings_v001.png` (`x=11..14, y=5..7`), 1 titik jual (`crate_base` + `crate_top` di `18,8`), dan kios bibit (`20,8`).
3. **Player**: Container 3 layer (`base` + `spikeyhair` + `tools`) tersinkronisasi, jalan 8 arah (`idle`/`walk`), collider di bagian kaki (`10x6` px pada `y=39` dalam frame `96x64`), kamera mengikuti.
4. **Farming**: 4 tanaman dengan stage lengkap `00–05` (`parsnip`, `carrot`, `sunflower`, `pumpkin`). Alur: cangkul tanah -> tanam bibit -> siram -> tumbuh tiap berganti hari (tidur) -> panen -> jual.
5. **Mancing**: Dekati air/dermaga -> lempar kail (`casting`) -> tunggu gigitan (`waiting` + SFX bite) -> tekan tepat waktu (`reeling`) -> dapat ikan (`caught` + fanfare) -> ikan bisa dijual.
6. **Waktu & Tidur**: Siklus hari sederhana (Pagi, Siang, Sore, Malam dengan overlay warna). Tidur di rumah = lanjut ke hari berikutnya + autosave.
7. **Ekonomi, Inventory & Toolbar**: Koin (`G`), beli bibit, jual hasil panen/ikan, toolbar 4 alat (`Cangkul`, `Penyiram`, `Kantung Bibit`, `Joran Pancing`), inventory sederhana.
8. **Kontrol**: Keyboard (`WASD`/Panah, `Spasi`/`E` aksi, `Q` ganti alat, `1–4` pilih alat, `R` ganti bibit, `F2` Tileset Debug) DAN Touch (joystick on-screen buatan sendiri di kiri + tombol `AKSI`, `ALAT`, `BIBIT` di kanan).
9. **Save**: `localStorage` dengan key `everroot_v1_save` dan `version: 1`, autosave saat tidur, tombol hapus save di menu.

### Di Luar Scope V1 (Ditunda ke V2, Jangan Dibuat di V1)
- Combat & musuh (`goblin`, `skeleton`), hewan ternak (`chicken`, `cow`, `pig`, `sheep`, `duck`), memasak (`cooking`), sistem quest, NPC dialog, toko lengkap multi-kategori, interior rumah penuh, dan cuaca dinamis.

---

## 5. Status per Milestone

Keterangan label status:
- `[SELESAI-BUILD]`: Kode sudah ditulis dan lolos `npm run build` (`exit code 0`), namun **belum diverifikasi** lewat tes manual di HP oleh user.
- `[SELESAI-TES-HP]`: Sudah dites manual di HP dan dikonfirmasi user (saat ini **belum ada** yang berstatus ini).
- `[SEBAGIAN]`: Fondasi/data sudah ada, tetapi logika penuh belum terhubung.
- `[PLACEHOLDER]`: Baru berupa aksi sementara / visual statis, menunggu implementasi milestone terkait.
- `[BELUM]`: File atau fitur belum dibuat.

### Milestone 1 (M1): Setup, Audit Aset, TilesetDebug, Menu, Map Outdoor, Player & Kontrol
- Setup Vite + Phaser 3 (`package.json`, `vite.config.js`, `index.html`, `src/style.css`, `src/main.js`) — `[SELESAI-BUILD]`
- Perbaikan Kualitas Tampilan & Skala (`Phaser.Scale.RESIZE` di resolusi layar fisik, kamera dunia zoom bilangan bulat `zoom = max(1, round(height / 220))`, UI di resolusi asli dengan `uiScale` bilangan bulat + margin aman, teks `adapa.ttf` tajam dengan `resolution: 2`, HUD 1 baris ringkas di atas dengan laci panen buka-tutup, toast 1 baris di tengah-atas, dan label bangunan dunia yang hanya tampil saat pemain dekat) — `[SELESAI-BUILD]`
- Audit aset (`ASSET_AUDIT.md`, `src/data/tileIndex.js`, `src/data/assetKeys.js`) — `[SELESAI-BUILD]`
- `BootScene` & `PreloadScene` (font loader `adapa.ttf`, progress bar, registrasi 126 aset & animasi global) — `[SELESAI-BUILD]`
- `TilesetDebugScene` (grid 16px, nomor indeks tile ter-pool, pan/drag sentuh & WASD, zoom 2x/3x/4x, inspeksi nama `TILE_INDEX`) — `[SELESAI-BUILD]`
- `MenuScene` (ikon game, judul, Mulai/Lanjut/Hapus Save/Cek Tileset, unlock audio tap pertama, skala `uiScale`) — `[SELESAI-BUILD]`
- Map outdoor 16px (`src/systems/WorldBuilder.js`: rumput, jalan tanah, kebun, danau + dermaga, rumah berasap, kotak jual, kios bibit, kincir angin, pohon, collider statis, label bangunan hanya muncul saat dekat) — `[SELESAI-BUILD]`
- `Player` 3-layer (`src/entities/Player.js`: `base` + `spikeyhair` + `tools`, jalan 8 arah, collision kaki, kamera mengikuti, SFX langkah + debu) — `[SELESAI-BUILD]`
- Kontrol Keyboard & Touch (`src/systems/InputSystem.js` & `src/ui/TouchControls.js`: WASD/Panah + joystick virtual on-screen + tombol AKSI/ALAT/BIBIT dengan skala `uiScale` dan margin aman) — `[SELESAI-BUILD]`

#### Milestone 2 (M2): Farming Lengkap + Siklus Hari + Tidur + Save/Load
- Data tanaman (`src/data/crops.js` untuk `parsnip`, `carrot`, `sunflower`, `pumpkin` dengan stage `00–05`) — `[SELESAI-BUILD]`
- `SaveSystem` (`src/systems/SaveSystem.js`: `createDefaultState`, `hasSave`, `load`, `save`, `clear` dengan `version: 2`, migrasi otomatis dari save `version: 1` M2 ke `inventorySlots`, dan validasi anti-corrupt) — `[SELESAI-BUILD]`
- Entitas `Crop` (`src/entities/Crop.js`: render tanah kering/basah, highlight status siram & siap panen, sprite tanaman stage `00–05`) — `[SELESAI-BUILD]`
- `FarmingSystem` (`src/systems/FarmingSystem.js`: cangkul tanah + SFX, tanam bibit mengurangi stok via `InventorySystem` + SFX, siram + SFX, tumbuh per hari saat tidur hanya jika disiram, panen masuk ke slot `InventorySystem`) — `[SELESAI-BUILD]`
- `TimeSystem` (`src/systems/TimeSystem.js`: siklus hari Pagi/Siang/Sore/Malam, overlay warna per fase di `GameScene`, jam & hari live di HUD `UIScene`) — `[SELESAI-BUILD]`
- Interaksi Tidur di Rumah + Fade Transisi + Tumbuh Tanaman + Autosave (`src/scenes/GameScene.js`) — `[SELESAI-BUILD]`

### Milestone 3 (M3): Mancing + Jual-Beli + Inventory + Toolbar
- Data item & alat (`src/data/items.js`: `id`, `name`, `iconKey`, `badgeKey`, `sellPrice`, `buyPrice`, `stackMax: 20`, `canBuy`, `canSell`, termasuk 3 jenis ikan `fish_small` `12G` / `55%`, `fish_medium` `24G` / `33%`, `fish_large` `50G` / `12%`) — `[SELESAI-BUILD]`
- Toolbar 4 alat di `UIScene` & pergantian alat (`Q` / `1–4` / tombol `ALAT` / tap slot) + badge bibit aktif & laci grid 12 slot inventory ringkas (`0/12▾`) — `[SELESAI-BUILD]`
- `InventorySystem` (`src/systems/InventorySystem.js`: 12 slot terbatas dengan batas stack 20 per slot, menyimpan bibit, hasil panen, & ikan per jenis, pergantian bibit hanya memilih bibit yang dimiliki `count > 0` + toast saat habis, transaksi beli bibit & jual hasil panen/ikan, cek kapasitas ikan `getCatchableFishIds()`, event via `eventBus`) — `[SELESAI-BUILD]`
- Sistem Jual-Beli / UI Toko & Shipping Box (`src/ui/ShopModal.js`: 1 komponen untuk mode `'sell'` di Kotak Jual yang menampilkan hasil panen + 3 jenis ikan dengan tombol `Jual 1` & `Semua`/`Jual Semua` + SFX kasir/koin, serta mode `'buy'` di Kios Bibit dengan tombol `Beli 1` & `Beli 5` + cek kecukupan koin + SFX beli; menjeda input gerak player dan mendukung sentuh + keyboard) — `[SELESAI-BUILD]`
- `FishingSystem` (`src/systems/FishingSystem.js`: deteksi tile air dari `tileIndex.js` lewat `WorldBuilder.isWaterTile`, cek kapasitas tas sebelum lempar, state machine `idle` -> `casting` -> `waiting` -> `bite` -> `reeling` -> `caught` -> `idle`, pelampung `Graphics` + tali pancing, indikator `! TARIK !` & bar waktu di resolusi layar asli pada `UIScene`, tambah ikan ke `InventorySystem`, pembatalan aman saat bergerak/ganti alat/buka toko/tidur) — `[SELESAI-BUILD]`
- Mode Debug Kecil (`?debug=1` via `isDebugModeEnabled()` di `src/data/gameConfig.js`: tombol pojok `+100G`, `Hari+1`, `+Bibit` di `UIScene` dan shortcut keyboard `F6`, `F7`, `F8` di `GameScene`, tidak aktif sama sekali di mode normal) — `[SELESAI-BUILD]`

### Milestone 4 (M4): UI Final, Audio Lengkap, Polish, README
- `AudioManager` & `audioConfig.js` (`src/systems/AudioManager.js`, `src/data/audioConfig.js`: unlock WebAudio pada tap pertama, BGM Menu & per fase waktu, ambience loop per fase waktu via `EVENTS.PHASE_CHANGED`, crossfade pendek `380ms`, pause/resume otomatis saat `visibilitychange`, pengaturan persisten di `localStorage` `everroot_v1_audio_settings` untuk `muted` / `musicLevel` / `sfxLevel` preset `0%–100%`, serta tombol kontrol audio di `MenuScene` & popover `Suara▾` di `UIScene`) — `[SELESAI-BUILD]`
- Polish UI Final (`src/scenes/UIScene.js`, `src/scenes/MenuScene.js`, `src/scenes/GameScene.js`: popover pengaturan audio `Suara▾` (`Mute`/`Musik`/`SFX`) di kanan atas HUD, teks mengambang `_spawnFloatingText` saat mendapat item/panen & perubahan koin, serta flush save otomatis `flushSaveIfActive` saat kembali ke Menu/Tileset Debug) — `[SELESAI-BUILD]`
- `README.md` (panduan lengkap instalasi & menjalankan `npm install`, `npm run dev -- --host`, `npm run build`, `npm run preview -- --host` di Termux, daftar kontrol keyboard & sentuh, alur permainan V1, penjelasan `?debug=1` & `?scene=tileset`, struktur folder, catatan lisensi aset, dan roadmap V2) — `[SELESAI-BUILD]`

---

## 6. Peta Kode & Komunikasi Antar-System

### Daftar File di `src/` Saat Ini
- **Entry & Style**:
  - `src/main.js` — Inisialisasi `new Phaser.Game(config)` dengan `Phaser.Scale.RESIZE`, `installPhysicalScaleBounds` (mengatur ukuran canvas ke piksel layar fisik `innerWidth/innerHeight x dpr` dibatasi maksimum `MAX_DPR: 2` / `1920x1080` sambil mempertahankan `displayScale` input sentuh), `pixelArt: true`, Arcade Physics, serta listener `resize`, `orientationchange`, dan `visualViewport.resize` yang memanggil `game.scale.refresh()` dengan jeda `100ms` & `260ms`.
  - `src/style.css` — CSS layar penuh mobile (`100vw`, `100dvh` dengan fallback `100vh`, `margin: 0`, `overflow: hidden`, `background: #000000`, serta `#game canvas { width: 100% !important; height: 100% !important; image-rendering: pixelated; }`).
- **Data (`src/data/`)**:
  - `src/data/gameConfig.js` — Konstanta global (`SCENE_KEYS`, `GAME`, `TILE`, `WORLD`, `MAP_ZONES`, `PLAYER`, `CAMERA`, `DEPTH`, `TIME`, `FARMING`, `FISHING`, `INVENTORY`, `ECONOMY`, `SAVE`, `INPUT`, `UI`, `DEBUG`) serta helper murni `getWorldZoom(screenHeight)`, `getUiScale(screenHeight)`, `getPhysicalCanvasSize(cssW, cssH, dpr)`, dan `isDebugModeEnabled()`.
  - `src/data/assetKeys.js` — Daftar terpusat key Phaser, path file di `public/assets/`, dan ukuran frame untuk 126 aset (`IMAGE_ASSETS`, `SPRITESHEET_ASSETS`, `AUDIO_ASSETS`, `CHARACTER_ANIM_DEFS`).
  - `src/data/tileIndex.js` — Indeks tile 0-based terverifikasi untuk `spr_tileset_sunnysideworld_16px.png` (`TILE_INDEX`, `GRASS_VARIANTS`, `DIRT_PATH_VARIANTS`, `waterTileFor`).
  - `src/data/audioConfig.js` — Pemetaan BGM per scene (`SCENE_BGM`), ambience per fase waktu (`PHASE_AMBIENCE`), dan volume per SFX (`SFX_SETTINGS`).
  - `src/data/crops.js` — Definisi 4 tanaman V1 (`parsnip`, `carrot`, `sunflower`, `pumpkin`) dengan pertumbuhan harian stage `00–05`, harga beli bibit, dan harga jual panen yang seimbang.
  - `src/data/items.js` — Definisi 4 alat toolbar (`TOOLS`) dan katalog item (`ITEMS`: bibit, hasil panen, serta 3 jenis ikan `fish_small`, `fish_medium`, `fish_large` beserta `stackMax`, `canBuy`, `canSell`, `catchWeight`, `SELLABLE_ITEM_IDS`).
- **Scenes (`src/scenes/`)**:
  - `src/scenes/BootScene.js` — Memuat dan menunggu font piksel `adapa.ttf` lewat `FontLoader` selesai sebelum merender teks di scene berikutnya.
  - `src/scenes/PreloadScene.js` — Menampilkan progress bar dengan skala `uiScale`, memuat semua aset dari `assetKeys.js`, membuat animasi global, lalu masuk ke `MenuScene` (atau `TilesetDebugScene` bila `?scene=tileset`).
  - `src/scenes/MenuScene.js` — Layar judul resolusi penuh dengan skala `uiScale`, ikon game, preview animasi, unlock audio tap pertama, tombol Mulai/Mulai Baru, Lanjut (menampilkan Hari, Jam, Koin), Hapus Save, Cek Tileset, serta kontrol Suara/Musik/SFX.
  - `src/scenes/GameScene.js` — Scene utama gameplay yang merakit map (`WorldBuilder`), `Player`, `InventorySystem`, `FarmingSystem`, `FishingSystem`, `TimeSystem`, kamera dunia dengan zoom bilangan bulat (`getWorldZoom(height)`), overlay warna siang/malam dinamis, kursor grid tile target, pembukaan `ShopModal` di Kotak Jual & Kios Bibit, transisi tidur fade + autosave, shortcut debug `F6`/`F7`/`F8` (jika `?debug=1`), dan menjalankan `UIScene` secara paralel.
  - `src/scenes/UIScene.js` — Scene overlay HUD pada resolusi layar asli dengan skala bilangan bulat `uiScale` (1 baris ringkas di kiri atas berisi Hari/Jam/Fase, Koin, ikon bibit aktif, dan tombol laci grid inventory 12 slot `0/12▾` buka-tutup; tombol `Suara▾` popover audio, `Tileset`, dan `Menu` di kanan atas + tombol debug `+100G`/`Hari+1`/`+Bibit` bila `?debug=1`; toast 1 baris di tengah-atas; teks mengambang `_spawnFloatingText` untuk item/koin; indikator pancing `! TARIK !` + countdown bar di atas kepala player; toolbar 4 alat di tengah-bawah; `TouchControls`; serta `ShopModal`).
  - `src/scenes/TilesetDebugScene.js` — Scene inspeksi visual tileset 16px dengan zoom bilangan bulat (`2x`/`3x`/`4x`), nomor indeks tile, dan nama konstanta `TILE_INDEX`.
- **Entities (`src/entities/`)**:
  - `src/entities/Player.js` — Entitas karakter player (Container 3 layer `base` + `spikeyhair` + `tools`), gerak 8 arah, collider kaki, animasi aksi terkunci, dan efek debu langkah.
  - `src/entities/Crop.js` — Entitas visual petak kebun berbasis grid (`soil_dry`, `soil_wet`, `soil_pit_dry`, `soil_pit_wet`), indikator basah & siap panen, serta sprite tanaman stage `00–05`.
- **Systems (`src/systems/`)**:
  - `src/systems/EventBus.js` — Instance tunggal `eventBus` (`Phaser.Events.EventEmitter`) dan enum nama event `EVENTS`.
  - `src/systems/FontLoader.js` — Injeksi `@font-face` runtime untuk `assets/fonts/adapa.ttf`, menunggu `document.fonts.ready`, dan helper `pixelTextStyle()` dengan `resolution: 2`.
  - `src/systems/AudioManager.js` — Singleton pengelola unlock WebAudio, pemutaran BGM scene & fase waktu dengan crossfade pendek, ambience per fase waktu (`EVENTS.PHASE_CHANGED`), SFX (`EVENTS.PLAY_SFX`), pause/resume saat tab background (`visibilitychange`), dan penyimpanan pengaturan (`muted`, `musicLevel`, `sfxLevel`) di `localStorage`.
  - `src/systems/SaveSystem.js` — Singleton baca/tulis/hapus state game di `localStorage` dengan nomor versi save (`SAVE.VERSION = 2`), migrasi otomatis dari save versi 1 (`LEGACY_VERSION = 1`), dan sanitasi data rusak.
  - `src/systems/InputSystem.js` — Penggabung input keyboard (`WASD`/Panah/Spasi/E/Q/R/1–4/F2) dan vektor joystick sentuh tanpa alokasi objek per-frame.
  - `src/systems/WorldBuilder.js` — Pembangun tilemap outdoor 4 layer (`ground`, `detail`, `water`, `shore`), deteksi tile air (`isWaterTile`), rumah, kotak jual, kios bibit, kincir angin, pohon, grup collider statis, serta label bangunan dunia (`updateLandmarkLabels`) yang hanya tampil saat pemain berada di dekat bangunan tersebut.
  - `src/systems/InventorySystem.js` — Pengelola slot inventory terbatas (`12` slot, stack maks `20` per slot), pemilihan bibit yang dimiliki saja, pembelian bibit di Kios Bibit, penjualan hasil panen & ikan di Kotak Jual, serta aksi debug (`DEBUG_ADD_COINS`, `DEBUG_FILL_SEEDS`) melalui `eventBus`.
  - `src/systems/FarmingSystem.js` — Pengelola petak kebun berbasis grid (cangkul, tanam bibit memakai stok `InventorySystem`, siram, tumbuh harian saat tidur hanya jika disiram, panen masuk ke slot `InventorySystem`) melalui `eventBus`.
  - `src/systems/FishingSystem.js` — Pengelola sistem memancing berbasis state machine (`idle` -> `casting` -> `waiting` -> `bite` -> `reeling` -> `caught` -> `idle`), deteksi tile air dari `tileIndex.js`, pelampung `Graphics` + tali pancing, undian 3 jenis ikan berdasarkan peluang (`55%`/`33%`/`12%`), dan pembatalan aman melalui `eventBus`.
  - `src/systems/TimeSystem.js` — Pengelola jam in-game (`06:00`–`24:00`), siklus fase (`pagi`, `siang`, `sore`, `malam`), dan pergantian hari melalui `eventBus`.
- **UI (`src/ui/`)**:
  - `src/ui/TouchControls.js` — Kontrol sentuh on-screen pada resolusi layar asli dengan skala bilangan bulat `uiScale` dan margin aman (`SAFE_MARGIN_X`, `SAFE_MARGIN_Y`): joystick di kiri-bawah dan tombol `AKSI`, `ALAT`, `BIBIT` di kanan-bawah.
  - `src/ui/ShopModal.js` — Komponen modal tunggal untuk Kotak Jual (`mode: 'sell'` untuk 4 panen + 3 ikan) dan Kios Bibit (`mode: 'buy'`) pada resolusi layar asli dengan skala `uiScale`, mendukung sentuh dan keyboard (`W`/`S`/`Up`/`Down`, `1`/`Enter`/`Space`, `2`/`E`, `ESC`/`Q`).

### Komunikasi Antar-System (`eventBus` & `EVENTS` di `src/systems/EventBus.js`)
Semua komunikasi silang antara system memakai `eventBus` tanpa saling import langsung:
- **Sudah Aktif di M1–M4**:
  - `EVENTS.INPUT_ACTION`, `EVENTS.INPUT_CYCLE_TOOL`, `EVENTS.INPUT_SELECT_TOOL`, `EVENTS.INPUT_CYCLE_SEED`, `EVENTS.TOUCH_DETECTED`
  - `EVENTS.TOOL_CHANGED`, `EVENTS.SEED_CHANGED`, `EVENTS.INVENTORY_ITEM_ADDED`, `EVENTS.INVENTORY_ITEM_REMOVED`, `EVENTS.INVENTORY_UPDATED`, `EVENTS.COINS_CHANGED`
  - `EVENTS.OPEN_SHOP`, `EVENTS.CLOSE_SHOP`, `EVENTS.SHOP_BUY_ITEM`, `EVENTS.SHOP_SELL_ITEM`
  - `EVENTS.FARM_PLOT_UPDATED`, `EVENTS.FARM_ACTION_FEEDBACK`
  - `EVENTS.FISHING_STATE_CHANGED`, `EVENTS.FISHING_CAUGHT`
  - `EVENTS.TIME_UPDATED`, `EVENTS.PHASE_CHANGED`, `EVENTS.CONFIRM_SLEEP`, `EVENTS.DAY_ADVANCED`, `EVENTS.GAME_SAVED`
  - `EVENTS.INTERACTION_HINT`, `EVENTS.TOAST_MESSAGE`, `EVENTS.PLAY_SFX`, `EVENTS.AUDIO_MUTED_CHANGED`
  - `EVENTS.DEBUG_ADD_COINS`, `EVENTS.DEBUG_NEXT_DAY`, `EVENTS.DEBUG_FILL_SEEDS` (aktif hanya bila `?debug=1`)

---

## 7. Konvensi yang Harus Diikuti

1. **Struktur Folder**: Pertahankan pemisahan ketat antara `src/scenes`, `src/entities`, `src/systems`, `src/ui`, dan `src/data`.
2. **Tanpa Angka Ajaib**: Semua konstanta angka (durasi, ukuran, koordinat zona map, harga, warna UI, depth layer) harus berada di `src/data/gameConfig.js` (atau `crops.js`/`items.js`/`audioConfig.js`).
3. **Referensi Aset & Tile**:
   - Semua key aset harus melalui `ASSET_KEYS` di `src/data/assetKeys.js`.
   - Semua pemetaan BGM/ambience/SFX harus melalui `AUDIO_CONFIG` di `src/data/audioConfig.js`.
   - Semua indeks tile harus melalui `TILE_INDEX` di `src/data/tileIndex.js` (jangan menebak angka indeks; verifikasi lewat `TilesetDebugScene`).
4. **Modularitas System**: Tiap fitur baru adalah class/module system terpisah di `src/systems/` yang berkomunikasi lewat `eventBus` (`src/systems/EventBus.js`) tanpa saling import langsung.
5. **Performa HP Mid-Range**: Hindari alokasi objek baru di dalam loop `update()` setiap frame (gunakan kembali objek vektor/koordinat yang sudah dialokasikan seperti `this.moveVector` dan `this._targetTile`).
6. **Cleanup Event Listener**: Setiap scene atau UI yang mendaftarkan listener ke `eventBus` wajib melepasnya (`eventBus.off(...)`) pada `Phaser.Scenes.Events.SHUTDOWN` agar tidak terjadi kebocoran listener saat pindah scene.

---

## 8. Masalah yang Diketahui & Hal yang Perlu Diverifikasi ("Belum Diverifikasi")

1. **Seluruh Milestone 1–4 Berstatus `[SELESAI-BUILD]` (Menunggu Konfirmasi Tes HP User)**:
   - Skala canvas fisik (`Phaser.Scale.RESIZE`, `zoom = 3`, `uiScale = 2` pada `1612x720`), Farming + Tidur + Save/Load (`version: 2`), `InventorySystem` 12 slot + `ShopModal` Jual-Beli, `FishingSystem` + `?debug=1`, serta `AudioManager` lengkap (popover `Suara▾` Mute/Musik/SFX + persistensi `localStorage` + pause saat tab tertutup), floating text polish, dan `README.md` telah lolos `npm run build`, namun **belum ada yang berstatus `[SELESAI-TES-HP]`** sampai dites langsung di browser HP oleh user.
2. **Masalah Aset yang Diketahui**:
   - `public/assets/ui/branding/game_icon_primary.png` dan `game_icon_alt.png` berformat biner JPEG (`JFIF`) dengan ekstensi `.png`.
   - `public/assets/effects/dust/dust_general_strip9.png` memiliki lebar `192px` (8 frame @ `24px`), tidak cocok dengan sufiks `_strip9` (sudah diatasi dengan memakai `dust_run_strip8.png`).
3. **Hal yang Statusnya "Belum Diverifikasi" (Menunggu Tes Manual di Browser HP)**:
   - **Ketajaman Pixel Art, Teks, Laci 12 Slot Inventory, Popover `Suara▾`, dan `ShopModal` di Layar HP (`1612x720`)**: menunggu verifikasi user.
   - **Siklus Mancing (Lempar -> Tunggu -> Tarik Tepat Waktu / Lepas -> Masuk Inventory -> Jual di Kotak Jual) di Browser HP**: menunggu verifikasi user.
   - **Siklus Tanam -> Panen -> Jual Panen -> Beli Bibit -> Save/Load & Audio (BGM/Ambience/Mute/Tab Background) di Browser HP**: menunggu verifikasi user.

---

## 9. Langkah Berikutnya

1. **Verifikasi Menyeluruh V1 (M1–M4) di Browser HP oleh User**:
   - Jalankan `npm run dev -- --host` (atau `npm run preview -- --host`) di Termux dan uji seluruh alur gameplay, audio, UI sentuh, serta save/load di browser HP sesuai panduan di `README.md`.
2. **Tindak Lanjut Hasil Tes HP**:
   - Ubah status fitur yang sudah terkonfirmasi lancar di HP menjadi `[SELESAI-TES-HP]`, atau perbaiki jika ada temuan bug dari tes HP.

---

## 10. Log Sesi

| Tanggal (UTC) | Model | Pekerjaan yang Dilakukan | Hasil Build |
| :--- | :--- | :--- | :--- |
| 2026-10-31 | Claude Opus 5.5 & Gemini 4 Argon | **M1 & M2 + Perbaikan Tampilan HD+**: Ekstraksi aset `public/assets/`, audit aset (`ASSET_AUDIT.md`, `tileIndex.js`, `assetKeys.js`), setup Vite+Phaser Termux, implementasi penuh M1 (Menu, Map 16px, Player 3-layer, TouchControls, TilesetDebug) & M2 (`Crop`, `FarmingSystem`, `TimeSystem`, tidur + autosave `SaveSystem`), serta beralih ke `Phaser.Scale.RESIZE` resolusi fisik (`zoom=3`, `uiScale=2` di `1612x720`). | **LOLOS** (`npm run build` exit 0) |
| 2026-10-31 | Gemini 4 Argon (High) | **M3 Bagian 1 & 2**: Implementasi `InventorySystem.js` (12 slot, stack maks 20, pilih bibit `count > 0`), `ShopModal.js` (mode `"sell"` Kotak Jual & `"buy"` Kios Bibit), migrasi save `version: 2`, `FishingSystem.js` (state machine pancing, 3 jenis ikan `12G`/`24G`/`50G`, indikator `! TARIK !`), dan mode debug `?debug=1` (`+100G`/`F6`, `Hari+1`/`F7`, `+Bibit`/`F8`). | **LOLOS** (`npm run build` exit 0, 34 modules) |
| 2026-10-31 | Gemini 4 Argon (High) | **Milestone 4 (M4)**: Penyelesaian `AudioManager.js` & `audioConfig.js` (pengaturan persisten `muted`/`musicLevel`/`sfxLevel`, crossfade BGM/ambience, pause saat tab tertutup), kontrol audio di `MenuScene` & popover `Suara▾` di `UIScene`, floating text item/koin, `flushSaveIfActive`, penulisan `README.md` lengkap, dan pembaruan status akhir M4 (`[SELESAI-BUILD]`) di `PROJECT_MEMORY.md`. | **LOLOS** (`npm run build` exit 0, 34 modules, 28.60s) |
