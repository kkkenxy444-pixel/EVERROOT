# PROJECT MEMORY — EVERROOT

> **Aturan sesi:** baca file ini + `SKILL.md` yang relevan sebelum menulis kode. Verifikasi ke `src/`, jangan percaya catatan saja. Satu tugas = satu commit. Akhiri dengan `npm run build`. Perbarui file ini singkat, maksimal **12 KB**.

## 1. Ringkasan & tujuan
- **Everroot**: game 2D top-down pixel-art cozy farming + fishing + exploration, gaya Sunnyside World.
- **Stack**: Phaser **3.90** (bukan Phaser 4), JavaScript ES modules, Vite **6.4.5**. Target utama browser HP Android via Termux; desktop juga jalan.
- **Render**: `Scale.RESIZE`; canvas = ukuran fisik layar (`DPR` maks 2, batas 1920x1080). Zoom dunia bulat `max(1, round(shortEdge/220))`; UI `uiScale = max(1, round(shortEdge/360))`. `pixelArt`, `roundPixels`, `antialias: false`, Arcade Physics tanpa gravitasi.
- **Aset**: 509 file di `public/assets/` (507 media runtime + manifest + catatan lisensi). 177 referensi aktif di `assetKeys.js`, diverifikasi 0 file hilang. **Jangan ubah/resize/timpa aset asli.**
- **Lisensi**: bundle aset tidak boleh disebar publik. Dua sheet furnitur interior tidak dipakai karena lisensi belum jelas.

## 2. Cara menjalankan (Termux)
```bash
npm install
npm run dev -- --host      # http://localhost:5173
npm run build              # wajib lolos tiap akhir tugas
npm run preview -- --host  # port 4173
```
- Script `package.json` memanggil `node ./node_modules/vite/bin/vite.js` langsung (shebang gagal di Termux).
- Debug: `?debug=1` → tombol `+100G` / `Hari+1` / `+Bibit`, F6/F7/F8, collider box, overlay audio.
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
  - `AmbientAnimal.js` — hewan dekoratif: idle/walk, flip, anti-numpuk, suara jarak.
- **systems/**
  - `EventBus.js` — event terpusat antar-system/scene.
  - `FontLoader.js` — font Adapa + resolusi teks.
  - `AudioManager.js` — BGM/ambience/SFX, crossfade, pause tab hidden, setting audio.
  - `SaveSystem.js` — simpan versi 2 + migrasi v1 + fallback aman.
  - `InputSystem.js` — keyboard + vektor joystick sentuh.
  - `WorldBuilder.js` — map outdoor 4 layer, tilemap, collider, label bangunan.
  - `InventorySystem.js` — 24 slot, stack 20, beli/jual, seed unlock.
  - `FarmingSystem.js` — cangkul, tanam, siram, tumbuh saat tidur, panen.
  - `FishingSystem.js` — state machine idle→casting→waiting→bite→reeling→caught.
  - `TimeSystem.js` — jam 06:00–24:00, fase, tint per jam, hari baru.
  - `WeatherSystem.js` — hujan deterministik dari nomor hari (tanpa data save), max 2 hari beruntun, 1 periode 3–6 jam.
- **ui/**
  - `TouchControls.js` — joystick kiri + tombol AKSI/ALAT/BIBIT kanan.
  - `ShopModal.js` — modal jual (`sell`) dan beli (`buy`), scroll, keyboard/touch.
- **scenes/**
  - `BootScene.js` — muat font sebelum render teks.
  - `PreloadScene.js` — loading aset, fallback tekstur, animasi global.
  - `MenuScene.js` — judul, Lanjut/Mulai/Hapus Save, bar audio.
  - `GameScene.js` — dunia, kamera, sistem, hewan, tidur, save, tint overlay.
  - `UIScene.js` — HUD, tas 24 slot (laci 6x4 scroll), toolbar, toast, dialog, popover audio.

## 4. Tempat menyetel nilai
| Kebutuhan | Lokasi |
| :-- | :-- |
| Map, spawn, zona, collider | `gameConfig.js` → `WORLD`, `MAP_ZONES` |
| Gerak player, kamera, depth | `gameConfig.js` → `PLAYER`, `CAMERA`, `DEPTH` |
| Jam, fase, tint 24 jam | `gameConfig.js` → `TIME.TINT_KEYFRAMES`, `TIME.PHASES` |
| Harga/lama tumbuh 11 tanaman | `crops.js` (sumber utama); unlock di `SEED_UNLOCK_SCHEDULE` |
| Buka bibit per hari | `gameConfig.js` → `SEED_UNLOCK_SCHEDULE` |
| Ikan: peluang, harga, timing | `gameConfig.js` → `FISHING` |
| Tas, stack, ekonomi awal | `gameConfig.js` → `INVENTORY`, `ECONOMY` |
| Cuaca hujan (peluang, jam, durasi, visual, suara) | `gameConfig.js` → `WEATHER`; ambience di `audioConfig.js` → `PHASE_AMBIENCE.hujan` |
| Hewan ambient | `gameConfig.js` → `AMBIENT_ANIMALS`; perilaku di `AmbientAnimal.js` |
| Teks/UI/tombol | `gameConfig.js` → `UI`, `UI.FONT`, `INPUT` |
| Audio & volume | `audioConfig.js`; setelan runtime di `AudioManager.js` |
| Aset & animasi | `assetKeys.js`; index tile di `tileIndex.js` |

## 5. Status fitur + status tes
- **V1 inti `[SELESAI-TES-HP]`** — konfirmasi pengguna: tombol Menu, modal jual, suara, joystick, dan save sudah lolos tes di HP. Mencakup menu, map outdoor, player, farming, mancing, waktu/tidur, tas, jual-beli, save v2, kontrol keyboard + sentuh.
- **Paket 1 — Desa Hidup `[SELESAI-TES-HP]`** — 8 hewan ambient (2 ayam, sapi, domba, babi, bebek, 2 burung) + suara; konfirmasi pengguna sudah lolos tes HP.
- **Tint siang-malam `[SELESAI-TES-HP]`** — sudah dites pengguna. Hasil: jam **19:00 masih terlalu terang** dan **sore kurang oranye**; perbaikan ditunda.
- **Paket 2 — 11 tanaman `[SELESAI-BUILD]`** — 7 tanaman baru + unlock bertahap + ShopModal 11 baris. **Belum dites di HP**; verifikasi baru lewat simulasi Node dengan Phaser di-mock.
- **Freeze Menu/scene `[SELESAI-BUILD]`** — perbaikan sudah di-build; tes Menu dari gameplay termasuk saat mancing masuk konfirmasi V1.
- **Inventory 24 slot `[SELESAI-BUILD]`** — 24 slot, laci 6 kolom x 4 baris, collapsible (hanya terbuka saat diklik), scroll vertikal bila layar pendek, area slot >=48px, hotbar tidak berubah. **Belum dites di HP**; verifikasi lewat build + simulasi Node (save Hari 8 12 slot, isi 24, simpan/muat, jual).
- **Paket 3 — Hujan `[SELESAI-BUILD]`** — hujan deterministik (~19–20% hari sejak Hari 3, max 2 hari beruntun), satu periode 07:00–15:00 selama 3–6 jam, petak tertanam otomatis basah + floating text sekali per periode, garis hujan 120 drop pooled + overlay mendung ≤0.12, ambience `rain.wav` volume 0.08 (RMS −21.2 dB) menggantikan jangkrik, label "Hujan" di bar waktu. **Belum dites di HP**; verifikasi build + simulasi Node.
- Build produksi terakhir: **lolos** (35 module, Vite 6.4.5). Paket 2 & 3 memakai save v2 tanpa field tambahan.

## 6. Pelajaran penting / gotchas
- **Freeze Phaser 3.90**: saat `stop(GAME)`, `DisplayList#shutdown` menghancurkan sprite player lebih dulu; `FishingSystem.destroy()` → `Player.unlockAction()` → `sprite.play()` melempar error dan transisi scene tidak jalan. Jangan sentuh GameObject di handler SHUTDOWN; gunakan guard + `try/catch`.
- **`stream.wav` dimatikan** (`AMB_STREAM`, siang/sore = `null`): noise floor tinggi (RMS 0.1195) + loop kanan melompat; terdengar desis di speaker HP.
- **Tint**: jangan kalikan alpha dua kali. `fillAlpha = 1`, alpha diatur lewat `GameObject.setAlpha()`.
- **Semua strip hewan menghadap kiri** di frame 0; `facesRight: false` per spesies. Jangan asal flip.
- **Game baru hanya memberi parsnip + carrot**. Sunflower terkunci Hari 10, pumpkin Hari 14; konfigurasi lama tidak lagi diberikan.
- **Save lama**: bibit yang terkunci tetap ada di tas, tetapi tidak bisa dipilih/ditanam sampai hari bukanya.
- **Slot tas 24** (2026-11-14): save v2 lama 12 slot tetap termuat utuh; `sanitizeSlots` mengisi sisa slot ke-24 tanpa memotong item.
- **Aset branding** `game_icon_primary.png` / `game_icon_alt.png` sebenarnya JPEG berekstensi `.png`; browser tetap memuat.

## 7. Masalah terbuka
1. **Suara hewan belum lengkap**: belum ada kokok ayam jantan, domba, babi, bebek, burung.
2. **Paket 2 belum dites HP**: 11 tanaman, scroll/ keterbacaan ShopModal 11 baris, dan unlock bertahap.
3. **Portrait/multitouch** belum dites penuh di HP.

## 8. Konvensi kerja
- Wajib baca `SKILL.md` relevan di `.agents/skills/` sebelum tugas (phaser, phaser-2d-game, game-development, game-ui-frontend, systematic-debugging, verification-before-completion).
- `game-playtest` tidak bisa jalan di Termux; verifikasi build + simulasi Node/manual.
- Satu tugas = satu commit. Jangan ubah kode gameplay saat tugas dokumentasi.
- Pisahkan `scenes`/`entities`/`systems`/`ui`/`data`; komunikasi lewat `eventBus`, hindari import langsung antar-system.
- Tanpa angka ajaib: taruh konstanta di `gameConfig.js` / `crops.js` / `items.js` / `audioConfig.js`.
- Jangan alokasi objek baru di `update()`; lepas listener `eventBus` saat SHUTDOWN.
- Jangan ubah aset asli; jangan sebar bundle aset publik.

## 9. Rencana berikutnya
1. Paket 2b: ternak, telur, susu (`egg.png`, `milk.png` tersedia).
2. Perbaikan tint sore (19:00 lebih gelap, lebih oranye).
3. V2: combat/musuh, cooking, quest/NPC, interior.
4. Inventory: Kantung Bibit terpisah bila 24 slot masih kurang.
5. Cuaca lanjutan: badai/petir atau musim hujan bila Paket 3 lolos tes HP.

## 10. Log sesi
| Tanggal | Commit | Milestone |
| :-- | :-- | :-- |
| 2026-10-31 | `a6dcc8e` | M1–M4: setup, map, player, farming, mancing, inventory, audio, save v2 |
| 2026-10-31 | `f90501f` | Ringkas memory + perbaikan font/audio awal |
| 2026-10-31 | `bc737be` | Font UI + audit audio (anti-stacking SFX, volume ambience) |
| 2026-11-07 | `a47c88b` | Hapus scene debug lama + fix freeze scene + guard SHUTDOWN |
| 2026-11-07 | `b3dad0d` | Rapikan rujukan dokumentasi scene debug |
| 2026-11-07 | `b2ae4b1` | Tint siang-malam (keyframe + fix alpha) |
| 2026-11-07 | `f231a77` | Paket 1: hewan ambient + suara |
| 2026-11-07 | `1363f5b` | Perbaikan gerak hewan, bebek di kolam, sebaran |
| 2026-11-08 | `0476ee3` | Paket 2: 7 tanaman baru + unlock bibit bertahap |
| 2026-11-08 | `551625e` | Update memory tint/Paket 1/Paket 2 |
| 2026-11-14 | `85cad61` | Inventory 24 slot: laci 6x4 scroll + migrasi save 12→24 |
| 2026-11-14 | `247cdf3` | Tint sore/senja: keyframe 16:00–20:30 diperkuat |
| 2026-11-14 | `8ff7429` | Paket 3: hujan (WeatherSystem, auto-siram, visual, ambience) |
