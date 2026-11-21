# PROJECT MEMORY — EVERROOT

> **Aturan sesi:** baca file ini + `SKILL.md` yang relevan sebelum menulis kode. Verifikasi ke `src/`, jangan percaya catatan saja. Satu tugas = satu commit. Akhiri dengan `npm run build`. Perbarui file ini singkat, maksimal **12 KB**.

## 1. Ringkasan & tujuan
- **Everroot**: game 2D top-down pixel-art cozy farming + fishing + exploration, gaya Sunnyside World.
- **Stack**: Phaser **3.90** (bukan Phaser 4), JavaScript ES modules, Vite **6.4.5**. Target utama HP Android (Termux); desktop jalan.
- **Render**: `Scale.RESIZE`; canvas = ukuran fisik layar (`DPR` maks 2, batas 1920x1080). Zoom dunia `max(1, round(shortEdge/220))`; UI `max(1, round(shortEdge/360))`. `pixelArt`, `roundPixels`, `antialias: false`, Arcade tanpa gravitasi.
- **Aset**: 509 file (507 runtime + manifest + lisensi). 177 referensi di `assetKeys.js`, 0 hilang. **Jangan ubah/resize/timpa aset asli.**
- **Lisensi**: bundle aset tidak boleh disebar publik. Dua sheet furnitur interior tidak dipakai karena lisensi belum jelas.

## 2. Cara menjalankan (Termux)
```bash
npm install
npm run dev -- --host      # http://localhost:5173
npm run build              # wajib lolos tiap akhir tugas
npm run preview -- --host  # port 4173
```
- Script `package.json` memanggil `node ./node_modules/vite/bin/vite.js` langsung (shebang gagal di Termux).
- Debug: `?debug=1` → tombol `+100G` / `Hari+1` / `+Bibit`, F6/F7/F8, collider, audio, hitung display/static/tween/timer.
- Save: `localStorage` key `everroot_v1_save` (versi 2, migrasi dari v1). Pengaturan audio: `everroot_v1_audio_settings`.
- Repo git lokal; `.gitignore`: `node_modules/`, `dist/`. Jangan push ke repo publik (lisensi aset).

## 3. Peta kode
- `src/main.js` — config Phaser, scene list, overlay error DOM global, resize/orientasi + `scale.refresh()`.
- `src/style.css` — reset layar penuh, canvas 100%.
- **data/**
  - `gameConfig.js` — semua konstanta global + helper zoom/UI/canvas/debug.
  - `assetKeys.js` — key, path, ukuran frame, animasi karakter/hewan (177 aset).
  - `tileIndex.js` — indeks tile 16px terverifikasi.
  - `audioConfig.js` — BGM per scene/fase, ambience, SFX, batas instance.
  - `crops.js` — 11 tanaman, harga, lama tumbuh, `computeCropStage`.
  - `items.js` — alat, 11 bibit, 11 panen, 3 ikan, unlock seed.
- **entities/**
  - `Player.js` — container 3 layer (`base` + `spikeyhair` + `tools`), aksi terkunci, debu.
  - `Crop.js` — visual petak + sprite tanaman stage 00–05.
  - `AmbientAnimal.js` — hewan dekoratif: bebas keliling map (kebun/kolam/dermaga terlarang), flip, anti-numpuk, jeda dekat pemain, ikon hasil ternak.
- **systems/**
  - `EventBus.js` — event terpusat antar-system/scene.
  - `FontLoader.js` — font Adapa + resolusi teks.
  - `AudioManager.js` — BGM/ambience/SFX, crossfade, pause tab hidden, setting audio.
  - `SaveSystem.js` — simpan versi 2 + migrasi v1 + fallback aman.
  - `InputSystem.js` — keyboard + vektor joystick sentuh.
  - `WorldBuilder.js` — builder per `mapId` (`_buildFarmValley`/`_buildVillage`), 4 layer, tilemap, collider, label, lacak objek + `destroy()`.
  - `InventorySystem.js` — 24 slot, stack 20, beli/jual, seed unlock.
  - `FarmingSystem.js` — cangkul, tanam, siram, tumbuh saat tidur, panen.
  - `FishingSystem.js` — state machine idle→casting→waiting→bite→reeling→caught.
  - `TimeSystem.js` — jam 06:00–24:00, fase, tint per jam, hari baru.
  - `WeatherSystem.js` — hujan deterministik dari nomor hari (tanpa data save), max 2 hari beruntun, 1 periode 3–6 jam.
  - `AnimalTerrain.js` — satu `Uint8Array` tile terlarang (kebun+margin, air, dermaga, tile terblok); spawn tersebar.
  - `LivestockSystem.js` — telur/susu berbasis hari + `lastCollectedDay`, ambil aman saat tas penuh.
- **ui/**
  - `TouchControls.js` — joystick kiri + tombol AKSI/ALAT/BIBIT kanan.
  - `ShopModal.js` — modal jual (`sell`) dan beli (`buy`), scroll, keyboard/touch.
- **scenes/**
  - `BootScene.js` — muat font sebelum render teks.
  - `PreloadScene.js` — loading aset, fallback tekstur, animasi global.
  - `MenuScene.js` — judul, Lanjut/Mulai/Hapus Save, bar audio.
  - `GameScene.js` — satu scene untuk semua map: `WorldBuilder`, `_switchMap`/`_teardownMap`, kamera, sistem map-local, tidur, save, tint.
  - `UIScene.js` — HUD, tas 24 slot (laci 6x4 scroll), toolbar, toast, dialog, popover audio.

## 4. Tempat menyetel nilai
| Kebutuhan | Lokasi |
| :-- | :-- |
| Map, spawn, zona, collider | `gameConfig.js` → `WORLD`, `MAP_ZONES`, `MAP_IDS`/`MAPS`/`MAP_TRANSITION` |
| Gerak player, kamera, depth | `gameConfig.js` → `PLAYER`, `CAMERA`, `DEPTH` |
| Jam, fase, tint 24 jam | `gameConfig.js` → `TIME.TINT_KEYFRAMES`, `TIME.PHASES` |
| Harga/lama tumbuh 11 tanaman | `crops.js` (sumber utama); unlock di `SEED_UNLOCK_SCHEDULE` |
| Buka bibit per hari | `gameConfig.js` → `SEED_UNLOCK_SCHEDULE` |
| Ikan: peluang, harga, timing | `gameConfig.js` → `FISHING` |
| Tas, stack, ekonomi awal | `gameConfig.js` → `INVENTORY`, `ECONOMY` |
| Cuaca hujan (peluang, jam, durasi, visual, suara) | `gameConfig.js` → `WEATHER`; ambience di `audioConfig.js` → `PHASE_AMBIENCE.hujan` |
| Hewan ambient (jelajah, jeda pemain, spawn) | `gameConfig.js` → `AMBIENT_ANIMALS`; perilaku di `AmbientAnimal.js`, tile di `AnimalTerrain.js` |
| Ternak (harga telur/susu, interval, radius ambil) | `gameConfig.js` → `LIVESTOCK`; item di `items.js` |
| Teks/UI/tombol | `gameConfig.js` → `UI`, `UI.FONT`, `INPUT` |
| Audio & volume | `audioConfig.js`; setelan runtime di `AudioManager.js` |
| Aset & animasi | `assetKeys.js`; index tile di `tileIndex.js` |

## 5. Status fitur + status tes
- **V1 inti `[SELESAI-TES-HP]`** — menu, map, player, farming, mancing, waktu/tidur, tas, jual-beli, save v2, keyboard + sentuh lolos HP.
- **Paket 1 — Desa Hidup `[SELESAI-TES-HP]`** — 8 hewan ambient + suara, lolos HP.
- **Tint siang-malam `[SELESAI-TES-HP]`** — lolos; 19:00 masih terang, sore kurang oranye (ditunda).
- **Paket 2 — 11 tanaman `[SELESAI-BUILD]`** — 7 tanaman baru + unlock bertahap + ShopModal; simulasi Node.
- **Freeze Menu/scene `[SELESAI-BUILD]`** — build; tes Menu saat mancing masuk konfirmasi V1.
- **Inventory 24 slot `[SELESAI-BUILD]`** — laci 6x4 scroll, slot ≥48px, hotbar; migrasi save 12→24.
- **Paket 3 — Hujan `[SELESAI-BUILD]`** — deterministik (~19–20% hari sejak Hari 3, maks 2 hari beruntun, 07:00–15:00 3–6 jam), petak basah, 120 drop pooled, ambience hujan.
- **Hewan bebas keliling `[SELESAI-BUILD]`** — 8 hewan, target 6–10 tile, tolak kebun+margin/air/dermaga/tile terblok via `Uint8Array`, bebek di kolam, jeda dekat pemain; simulasi 20.000 frame.
- **Paket 2b — Ternak `[SELESAI-BUILD]`** — 2 ayam (12G/hari), 1 sapi (30G/2 hari), ikon melayang, `lastCollectedDay` opsional, tas penuh aman.
- **Desa Fase 1 `[SELESAI-BUILD]`** — satu `GameScene` + `mapId` (tanpa Scene kedua), gerbang dua arah, fade + teardown map-local, desa tanpa kebun/mancing/ternak, save `mapId` + `mapPositions` (clamp), tidur manual hanya di farm (auto 24:00 pindah dulu).
- **Desa Fase 2 `[SELESAI-BUILD]`** — 64x40: jalan utama 3 tile, plaza 18x11, 6 rumah 2 klaster (tint GameObject, pintu dekor, collider badan), 3 kios, hutan kecil, ujung timur buntu, perimeter Zone besar; `NPC_SPOTS` 3 (data). Display 94 / static 50; 5 siklus farm↔desa stabil. Kolam dilewati (tidak ada helper terpisah).
- Build terakhir: **lolos** (37 module, Vite 6.4.5); save v2 tetap.

## 6. Pelajaran penting / gotchas
- **Freeze Phaser 3.90**: `stop(GAME)` menghancurkan sprite player; `FishingSystem.destroy()` → `unlockAction()` → `play()` error. Jangan sentuh GameObject di SHUTDOWN; pakai guard + `try/catch`.
- **`stream.wav` dimatikan** (siang/sore `null`): noise floor tinggi + loop kanan melompat.
- **Tint**: jangan kalikan alpha dua kali; `fillAlpha = 1`, alpha lewat `GameObject.setAlpha()`.
- **Strip hewan menghadap kiri** di frame 0; `facesRight: false`. Jangan asal flip.
- **Game baru hanya parsnip + carrot**; sunflower Hari 10, pumpkin Hari 14. Bibit terkunci tetap di tas tetapi tak bisa dipilih/ditanam.
- **Slot tas 24** (2026-11-14): save v2 12 slot termuat utuh; `sanitizeSlots` isi sisa slot tanpa memotong item.
- **Aset branding** icon `.png` sebenarnya JPEG; browser tetap memuat.
- **Hewan ambient** tanpa collider fisik; larangan via `AnimalTerrain` (satu grid), kebun margin 1 tile, dermaga terlarang.
- **Save ternak**: `livestock` opsional; jangan bump versi; sanitasi entri invalid di `SaveSystem.load()`.
- **Pindah map**: jangan `scene.stop(GameScene)`; `_switchMap` matikan sistem map-local + `WorldBuilder.destroy()` (tekstur tileset tetap) lalu player; listener fade-in sebelum `cam.fadeIn()`; spawn di luar zona gerbang; mapId tak dikenal → farm.

## 7. Masalah terbuka
1. **Suara hewan belum lengkap**: belum ada kokok ayam jantan, domba, babi, bebek, burung.
2. **Paket 2 belum dites HP**: 11 tanaman, scroll/ keterbacaan ShopModal 11 baris, dan unlock bertahap.
3. **Portrait/multitouch** belum dites penuh di HP.

## 8. Konvensi kerja
- Wajib baca skill relevan sebelum tugas (game-development, phaser-2d-game, game-ui-frontend, systematic-debugging, verification-before-completion).
- `game-playtest` tidak bisa jalan di Termux; verifikasi build + simulasi Node/manual.
- Satu tugas = satu commit. Jangan ubah kode gameplay saat tugas dokumentasi.
- Pisahkan `scenes`/`entities`/`systems`/`ui`/`data`; komunikasi lewat `eventBus`, hindari import langsung antar-system.
- Tanpa angka ajaib: taruh konstanta di `gameConfig.js` / `crops.js` / `items.js` / `audioConfig.js`.
- Jangan alokasi objek baru di `update()`; lepas listener `eventBus` saat SHUTDOWN.
- Jangan ubah aset asli; jangan sebar bundle aset publik.

## 9. Rencana berikutnya
1. Perbaikan tint sore (19:00 lebih gelap, lebih oranye).
2. V2: combat/musuh, cooking, quest/NPC, interior.
3. Inventory: Kantung Bibit terpisah bila 24 slot masih kurang.
4. Cuaca lanjutan: badai/petir atau musim hujan bila Paket 3 lolos tes HP.

## 10. Log sesi
| Tanggal | Commit | Milestone |
| :-- | :-- | :-- |
| 2026-10-31 | `a6dcc8e`–`bc737be` | M1–M4 inti + ringkas memory/font/audio |
| 2026-11-07 | `a47c88b`–`1363f5b` | Hapus debug, fix freeze, tint, hewan ambient |
| 2026-11-08 | `0476ee3`,`551625e` | Paket 2: 7 tanaman + unlock + memory |
| 2026-11-14 | `85cad61`–`8ff7429` | Inventory 24, tint sore, hujan |
| 2026-11-14 | `4fb6e7e`,`eceb9a8` | Hewan bebas keliling, ternak |
| 2026-11-14 | `b7023e4`–`2a6f757` | Registry map, multi-map, save posisi, pindah map |
| 2026-11-14 | `a8c28de`,`3c8cf25` | Komentar kebun, listener fadeIn |
| 2026-11-21 | `a017e3c` | Desa fase 2: tata letak 64x40 (94 display/50 static) |
