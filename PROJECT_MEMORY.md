# PROJECT MEMORY — EVERROOT V1 (MVP)

> **ATURAN PEMAKAIAN (WAJIB, SETIAP SESI BARU)**
> 1. Baca file ini dan `ASSET_AUDIT.md` SEBELUM menulis kode. Baca per bagian (head/grep), jangan seluruh file sekaligus.
> 2. Verifikasi dengan membaca file di `src/`, jangan hanya percaya catatan ini.
> 3. Di akhir sesi: update Status, Masalah yang Diketahui, dan Log Sesi. Jaga file ini di bawah ~15 KB (ringkas log lama).
> 4. Kalau sesi sebelumnya terputus saat mengedit file, cek dulu file itu utuh (`git diff`, `npm run build`) sebelum lanjut.
> 5. Satu prompt = satu tugas kecil. Edit per file, jangan tulis ulang file besar. Selalu `npm run build` di akhir.
> 6. Status fitur: pakai `[SELESAI-BUILD]` sampai user mengonfirmasi tes HP. Jangan tulis `[SELESAI-TES-HP]` sendiri.

## 1. Ringkasan
- **Everroot**: game pixel art 2D top-down (farming + mancing + explore), gaya Sunnyside World.
- **Stack**: Phaser 3.90.0 (BUKAN Phaser 4), Vite 6.4.5, JavaScript ES modules. Dites di Termux (Android) via browser HP `localhost`.
- **Render**: `Scale.RESIZE`, canvas = piksel layar fisik (`innerWidth/Height x DPR`, maks DPR 2 dan 1920x1080). Kamera dunia zoom bilangan bulat `max(1, round(tinggi/220))` (layar 1612x720 = zoom 3). UI di resolusi layar asli dengan `uiScale = max(1, round(tinggi/360))` (= 2). `pixelArt`, `roundPixels`, `antialias: false`. Arcade Physics tanpa gravitasi.
- **Teks**: font `adapa.ttf` lewat `FontLoader`, `resolution: 2`.

## 2. Cara Menjalankan (Termux)
    npm install
    npm run dev -- --host      (buka http://localhost:5173)
    npm run build              (wajib lolos tiap akhir tugas)
    npm run preview -- --host
- Script di `package.json` memanggil `node ./node_modules/vite/bin/vite.js` langsung (shebang `/usr/bin/env` gagal di Termux).
- URL debug: `?debug=1` (tombol `+100G` / `Hari+1` / `+Bibit`, F6/F7/F8, kotak collider), `?scene=tileset` (TilesetDebugScene).
- Repo git ada di folder project (`.gitignore`: `node_modules/`, `dist/`). Commit sebelum tiap prompt besar. JANGAN push ke repo publik (lisensi aset).

## 3. Aset
- Sumber: `GAME_ASSETS_MASTER_PHASER3_V5_WITH_ICON_ORIGINAL.zip`, diekstrak utuh ke `public/assets/` (507 aset di `asset-manifest.json`, catatan lisensi di `SOURCE_RIGHTS_NOTES.txt`).
- **Aturan**: jangan ubah/resize/konversi/timpa file asli. Hanya pakai aset dari ZIP, jangan mengarang path. Salinan ikon kecil ada di `public/icons/` (`favicon-32.png`, `icon-192.png`, `game_icon_copy.png`) + `public/manifest.webmanifest`.
- **Lisensi**: bundle tidak boleh disebar publik. 2 sheet furnitur interior belum jelas lisensinya dan TIDAK dipakai.
- **Temuan audit** (detail di `ASSET_AUDIT.md`):
  - `ui/branding/game_icon_primary.png` dan `game_icon_alt.png` sebenarnya JPEG berekstensi `.png` (browser tetap bisa memuat; pastikan salinan di `public/icons/` PNG valid).
  - `dust_general_strip9.png` = 8 frame (pakai `dust_run_strip8.png`). Folder `hammering/` berejaan `hamering`. `soil_02.png` tidak ada.
  - Rambut: hanya `spikeyhair` lengkap di semua aksi. Player = `base` + `spikeyhair` + `tools`.
  - `TODO_ASSET`: ikon koin (digambar Graphics), ikon penyiram (`ui/icons/water.png`), bobber pancing (Graphics), ikon ikan hanya 1 (`fish.png`, dipakai 3 jenis dengan tint), ikon bibit generik (`seeds_generic.png` + badge panen).

## 4. Keputusan Desain Final
**Scope V1**: menu; 1 map outdoor 16px (kebun, jalan, danau + dermaga, rumah, kotak jual, kios bibit, kincir angin); player 8 arah + collision + kamera follow; farming 4 tanaman (`parsnip`, `carrot`, `sunflower`, `pumpkin`, stage 00-05, tumbuh saat tidur bila disiram); mancing 3 jenis ikan; siklus waktu 06:00-24:00 (pagi/siang/sore/malam + overlay warna); tidur di rumah = hari baru + autosave; koin, beli bibit, jual panen/ikan; inventory 12 slot (stack maks 20); toolbar 4 alat (Cangkul, Penyiram, Bibit, Joran); kontrol keyboard + sentuh (joystick kiri, AKSI/ALAT/BIBIT kanan); save `localStorage` key `everroot_v1_save`, **versi 2** (migrasi dari v1).

**Ditunda ke V2 (jangan dibuat di V1)**: combat/musuh (goblin, skeleton), hewan ternak, cooking, quest, NPC dialog, toko multi-kategori, interior rumah penuh, cuaca dinamis.

**Ide lanjutan yang dibahas (belum dibuat)**: Paket A = juice/feedback, target harian, upgrade di kios (slot tas, petak baru, alat). Paket B = hewan dekoratif, burung/ambience, hujan. Paket C = item temuan, area hutan, NPC pedagang.

## 5. Status
Semua `[SELESAI-BUILD]` (build lolos). Belum ada yang `[SELESAI-TES-HP]` secara resmi, tetapi user sudah menjalankan dan melihat M1-M4 di HP: tanam, siram, mancing, jual berjalan.
- **M1**: setup Vite/Phaser, audit aset, Boot/Preload/Menu/TilesetDebug, map outdoor, Player 3 layer, kontrol keyboard + sentuh, perbaikan skala (RESIZE + zoom bulat).
- **M2**: `Crop`, `FarmingSystem`, `TimeSystem`, tidur + fade + autosave, `SaveSystem`.
- **M3**: `InventorySystem`, `ShopModal` (mode sell/buy), `FishingSystem` (state machine idle -> casting -> waiting -> bite -> reeling -> caught), mode debug `?debug=1`.
- **M4**: `AudioManager` + `audioConfig.js` (BGM per scene dan fase waktu, ambience per fase, crossfade, pause saat tab hidden, pengaturan mute/musik/SFX di `localStorage` `everroot_v1_audio_settings`), popover `Suara▾`, floating text, `README.md`, rebalancing mancing.
- **Perbaikan Font/UI & Audit Audio (`[SELESAI-BUILD]`, belum dites HP)**:
  - **Font & UI**: Konstanta `UI.FONT` (`gameConfig.js`) + `getTextResolution()` (`FontLoader.js`) diterapkan ke `ShopModal`, `UIScene`, `MenuScene`, `TouchControls`, dan `WorldBuilder`. Pada 1612x720 (`uiScale=2`): teks isi modal 30px, sub-info ("Harga • Tas: n") 28px, label tombol 26-28px, toast/hint 28px, indikator mancing 30px, label bangunan 27px (`9px * zoom 3`). `ShopModal` lebar 84% layar (landscape) / 92% (portrait), tombol Jual/Beli tinggi >= 56px fisik, daftar dapat di-scroll (geser/wheel/keyboard) dengan scrollbar, tombol nonaktif kontras tinggi (`#2b231d` / `#8c7a6b` / `#dcd3c8` + outline `#120b07`).
  - **Audio**: Volume terpisah per kategori (BGM, Alam/Ambience, SFX) di `AudioManager`, `MenuScene`, dan popover `Suara▾` (`UIScene`). Batas 1-2 instance aktif per key SFX + stop instance lama bila dipicu ulang < `140ms` (`SFX_RETRIGGER_RESTART_MS`). `audio/ambience/stream.wav` (`AMB_STREAM`) dinonaktifkan secara default (`siang`/`sore` = `null`) karena broadband noise (RMS 0.1195) dan lompatan titik loop kanal kanan (`delta 0.1035`). Mode `?debug=1` menampilkan overlay daftar suara aktif beserta volumenya.

## 6. Peta Kode
- `src/main.js` (Game config, listener resize/orientationchange/visualViewport + `scale.refresh()`), `src/style.css` (layar penuh, canvas 100%).
- **data/**: `gameConfig.js` (semua konstanta + helper `getWorldZoom`, `getUiScale`, `getPhysicalCanvasSize`, `isDebugModeEnabled`), `assetKeys.js` (key + path + frame 126 aset), `tileIndex.js` (index tile terverifikasi), `audioConfig.js` (BGM/ambience/SFX), `crops.js`, `items.js` (alat, item, 3 ikan).
- **scenes/**: `BootScene` (muat font), `PreloadScene`, `MenuScene`, `GameScene` (rakit world/player/sistem, kamera, overlay waktu, buka ShopModal, tidur), `UIScene` (HUD 1 baris, inventory 12 slot, toast, indikator pancing, toolbar, TouchControls, ShopModal, popover Suara, overlay debug audio), `TilesetDebugScene`.
- **entities/**: `Player` (container 3 layer, aksi terkunci, debu langkah), `Crop` (petak + tanaman).
- **systems/**: `EventBus`, `FontLoader`, `AudioManager`, `SaveSystem`, `InputSystem`, `WorldBuilder` (tilemap 4 layer, `isWaterTile`, label bangunan saat dekat), `InventorySystem`, `FarmingSystem`, `FishingSystem`, `TimeSystem`.
- **ui/**: `TouchControls`, `ShopModal`.
- **Event (`EVENTS` di EventBus.js)**: INPUT_ACTION, INPUT_CYCLE_TOOL/SEED, INPUT_SELECT_TOOL, TOUCH_DETECTED, TOOL_CHANGED, SEED_CHANGED, INVENTORY_ITEM_ADDED/REMOVED, INVENTORY_UPDATED, COINS_CHANGED, OPEN_SHOP/CLOSE_SHOP, SHOP_BUY_ITEM/SELL_ITEM, FARM_PLOT_UPDATED, FARM_ACTION_FEEDBACK, FISHING_STATE_CHANGED, FISHING_CAUGHT, TIME_UPDATED, PHASE_CHANGED, CONFIRM_SLEEP, DAY_ADVANCED, GAME_SAVED, INTERACTION_HINT, TOAST_MESSAGE, PLAY_SFX, AUDIO_MUTED_CHANGED, AUDIO_SETTINGS_CHANGED, DEBUG_ADD_COINS/NEXT_DAY/FILL_SEEDS.

## 7. Konvensi
1. Pisahkan `scenes`, `entities`, `systems`, `ui`, `data`. Tiap fitur = system terpisah, komunikasi lewat `eventBus`, tanpa saling import langsung.
2. Tanpa angka ajaib: konstanta di `gameConfig.js` / `crops.js` / `items.js` / `audioConfig.js`.
3. Key aset lewat `assetKeys.js`, audio lewat `audioConfig.js`, index tile lewat `tileIndex.js` (jangan menebak; cek TilesetDebugScene).
4. Jangan alokasi objek baru di `update()`. Lepas listener `eventBus` saat scene SHUTDOWN.

## 8. Masalah yang Diketahui
1. **Verifikasi di HP belum dilakukan (`[SELESAI-BUILD]`)**: Perubahan ukuran font `UI.FONT`, lebar/scroll `ShopModal`, tinggi tombol 56px, layout portrait, dan perbaikan suara berkeresek belum dikonfirmasi langsung di layar/speaker HP oleh user.
2. **Sumber desis audio (pasti vs dugaan)**:
   - *Pasti dari kode/data*: `stream.wav` memiliki noise floor kontinu (RMS `0.1195`) + lompatan loop kanal kanan (`delta 0.1035`), dan sebelumnya `playSfx` tidak membatasi tumpukan instance SFX. Keduanya sudah diperbaiki di kode.
   - *Dugaan (perlu tes HP)*: Apakah desis saat aksi di speaker HP murni berasal dari tumpukan SFX + `stream.wav`, atau masih ada artefak resampling WebAudio pada sampel WAV 44.1kHz tertentu di browser Android.
3. **Harga/keseimbangan ikan (terverifikasi di kode)**: Di `gameConfig.js` (`FISHING.FISH_PRICES`) & `items.js`, harga jual ikan memang sudah direbalancing pada M4 menjadi `fish_small = 6G`, `fish_medium = 12G`, `fish_large = 25G` (bukan 12/24/50G dari catatan M3 awal).
4. Perilaku portrait (zoom dihitung dari tinggi layar) dan multitouch belum dites penuh di HP.
5. Aset: lihat bagian 3 (ikon JPEG berekstensi .png, TODO_ASSET).

## 9. Langkah Berikutnya
1. **Konfirmasi tes HP (`[SELESAI-TES-HP]`)**: Uji keterbacaan font & scroll `ShopModal` (landscape 1612x720 & portrait), serta cek apakah suara berkeresek sudah hilang (gunakan `?debug=1` untuk memantau overlay suara aktif).
2. Setelah konfirmasi tes HP: lanjut ke Paket A (juice/feedback, target harian, upgrade di kios) atau Paket B (hewan dekoratif, burung/ambience, hujan).

## 10. Log Sesi
| Tanggal | Model | Pekerjaan | Build |
| :-- | :-- | :-- | :-- |
| 2026-10-31 | Claude Opus 5.5, Gemini 4 Argon | M1 + M2: ekstrak aset, audit, setup Termux, menu, map, player, farming, waktu, tidur, save; pindah ke RESIZE + zoom bulat | Lolos |
| 2026-10-31 | Gemini 4 Argon | M3: inventory 12 slot, ShopModal, save v2, FishingSystem, `?debug=1` | Lolos (34 modul) |
| 2026-10-31 | Gemini 4 Argon | M4: AudioManager, popover Suara, floating text, README, rebalancing mancing | Lolos (34 modul) |
| 2026-10-31 | Gemini 4 Argon | Selesaikan perbaikan Font/UI (`ShopModal`, `UIScene`, `MenuScene`) & Audit Audio (`AudioManager` anti-stacking SFX, volume Ambience terpisah, overlay audio `?debug=1`) | Lolos (34 modul) |
