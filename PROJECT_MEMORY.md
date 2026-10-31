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

## 6. Peta Kode
- `src/main.js` (Game config, listener resize/orientationchange/visualViewport + `scale.refresh()`), `src/style.css` (layar penuh, canvas 100%).
- **data/**: `gameConfig.js` (semua konstanta + helper `getWorldZoom`, `getUiScale`, `getPhysicalCanvasSize`, `isDebugModeEnabled`), `assetKeys.js` (key + path + frame 126 aset), `tileIndex.js` (index tile terverifikasi), `audioConfig.js` (BGM/ambience/SFX), `crops.js`, `items.js` (alat, item, 3 ikan).
- **scenes/**: `BootScene` (muat font), `PreloadScene`, `MenuScene`, `GameScene` (rakit world/player/sistem, kamera, overlay waktu, buka ShopModal, tidur), `UIScene` (HUD 1 baris, inventory 12 slot, toast, indikator pancing, toolbar, TouchControls, ShopModal, popover Suara), `TilesetDebugScene`.
- **entities/**: `Player` (container 3 layer, aksi terkunci, debu langkah), `Crop` (petak + tanaman).
- **systems/**: `EventBus`, `FontLoader`, `AudioManager`, `SaveSystem`, `InputSystem`, `WorldBuilder` (tilemap 4 layer, `isWaterTile`, label bangunan saat dekat), `InventorySystem`, `FarmingSystem`, `FishingSystem`, `TimeSystem`.
- **ui/**: `TouchControls`, `ShopModal`.
- **Event (`EVENTS` di EventBus.js)**: INPUT_ACTION, INPUT_CYCLE_TOOL/SEED, INPUT_SELECT_TOOL, TOUCH_DETECTED, TOOL_CHANGED, SEED_CHANGED, INVENTORY_ITEM_ADDED/REMOVED, INVENTORY_UPDATED, COINS_CHANGED, OPEN_SHOP/CLOSE_SHOP, SHOP_BUY_ITEM/SELL_ITEM, FARM_PLOT_UPDATED, FARM_ACTION_FEEDBACK, FISHING_STATE_CHANGED, FISHING_CAUGHT, TIME_UPDATED, PHASE_CHANGED, CONFIRM_SLEEP, DAY_ADVANCED, GAME_SAVED, INTERACTION_HINT, TOAST_MESSAGE, PLAY_SFX, AUDIO_MUTED_CHANGED, DEBUG_ADD_COINS/NEXT_DAY/FILL_SEEDS.

## 7. Konvensi
1. Pisahkan `scenes`, `entities`, `systems`, `ui`, `data`. Tiap fitur = system terpisah, komunikasi lewat `eventBus`, tanpa saling import langsung.
2. Tanpa angka ajaib: konstanta di `gameConfig.js` / `crops.js` / `items.js` / `audioConfig.js`.
3. Key aset lewat `assetKeys.js`, audio lewat `audioConfig.js`, index tile lewat `tileIndex.js` (jangan menebak; cek TilesetDebugScene).
4. Jangan alokasi objek baru di `update()`. Lepas listener `eventBus` saat scene SHUTDOWN.

## 8. Masalah yang Diketahui
1. **Font terlalu kecil** di modal jual (harga, "Tas: n", label tombol), toast, dan label bangunan di layar 1612x720. Tombol nonaktif kontrasnya rendah. Modal hanya ~separuh lebar layar.
2. **Suara berkeresek** (laporan user). Rekaman tidak menunjukkan clipping/klik; desis frekuensi tinggi muncul saat SFX aksi (cangkul/tanam/siram/mancing). Sumber belum pasti: SFX bertumpuk, volume ambience, atau file berisik. Belum ada volume terpisah untuk ambience.
3. **Harga/keseimbangan ikan**: catatan lama menulis 12/24/50 G, tetapi modal di game terakhir menunjukkan ikan kecil 6 G dan sedang 12 G. Verifikasi nilai di `gameConfig.js` / `items.js`.
4. Perilaku portrait (zoom dihitung dari tinggi layar) dan multitouch belum dites. `SELESAI-TES-HP` belum dikonfirmasi user.
5. Aset: lihat bagian 3 (ikon JPEG berekstensi .png, TODO_ASSET).

## 9. Langkah Berikutnya
1. **Perbaikan font dan UI modal** (konstanta `UI.FONT` min ~28-32 px layar fisik, modal ~80% lebar, tombol >= 56 px, kontras tombol nonaktif).
2. **Audit suara**: daftar suara aktif, batasi SFX bertumpuk, volume terpisah BGM/ambience/SFX, cek loop, overlay audio di `?debug=1`.
3. Status tugas 1-2: **tidak pasti** (sesi terputus saat dijalankan; audio sebagian tersentuh, ShopModal dan UIScene belum). Cek `git diff --stat` dan `npm run build` sebelum mengulang.
4. Setelah itu: konfirmasi tes HP, lalu Paket A (juice, target harian, upgrade) atau Paket B (dunia hidup).

## 10. Log Sesi
| Tanggal | Model | Pekerjaan | Build |
| :-- | :-- | :-- | :-- |
| 2026-10-31 | Claude Opus 5.5, Gemini 4 Argon | M1 + M2: ekstrak aset, audit, setup Termux, menu, map, player, farming, waktu, tidur, save; pindah ke RESIZE + zoom bulat | Lolos |
| 2026-10-31 | Gemini 4 Argon | M3: inventory 12 slot, ShopModal, save v2, FishingSystem, `?debug=1` | Lolos (34 modul) |
| 2026-10-31 | Gemini 4 Argon | M4: AudioManager, popover Suara, floating text, README, rebalancing mancing | Lolos (34 modul) |
| 2026-10-31 | Gemini 4 Argon | Perbaikan font + audit suara: sesi terputus (agy tertutup). Hasil belum diverifikasi | Lolos (sebagian) |
