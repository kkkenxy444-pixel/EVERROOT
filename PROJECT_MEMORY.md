# PROJECT MEMORY — EVERROOT

> **Aturan sesi:** baca file ini + skill relevan sebelum menulis kode. Verifikasi ke `src/`. Satu tugas = satu commit. Akhiri dengan `npm run build`. Perbarui singkat, maks **10 KB**.

## 1. Ringkasan
- **Everroot**: game 2D top-down pixel-art cozy farming + fishing + exploration, gaya Sunnyside World.
- **Stack**: Phaser **3.90**, JavaScript ES modules, Vite **6.4.5**; target HP Android (Termux), desktop jalan.
- **Render**: `Scale.RESIZE`, canvas ukuran fisik layar (`DPR` maks 2, batas 1920x1080), zoom dunia/UI berbasis short edge, `pixelArt`, `roundPixels`, `antialias: false`, Arcade.
- **Aset**: 509 file (507 runtime + manifest + lisensi); 193 referensi, 0 hilang. **Jangan ubah/resize/timpa aset asli.** Bundle tidak boleh disebar publik; 2 sheet furnitur interior tidak dipakai.

## 2. Menjalankan (Termux)
```bash
npm install
npm run dev -- --host      # http://localhost:5173
npm run build              # wajib lolos tiap tugas
npm run preview -- --host  # port 4173
```
- Script npm memanggil `node ./node_modules/vite/bin/vite.js` langsung; jangan ganti ke `vite`.
- Debug: `?debug=1` → `+100G`/`Hari+1`/`+Bibit`, F6–F8, collider, audio.
- Save: `localStorage` `everroot_v1_save` (v2, migrasi v1); audio `everroot_v1_audio_settings`.
- `.gitignore`: `node_modules/`, `dist/`. Jangan push ke repo publik.

## 3. Peta kode
- `src/main.js` — config Phaser, scene list, overlay error, resize/orientasi.
- **data/**
  - `gameConfig.js` — konstanta global + helper zoom/UI/canvas/debug.
  - `villageStructures.js` — `STRUCTURES` + `PROPS` Sunnyside.
  - `assetKeys.js` — key, path, frame, animasi; `tileIndex.js` — indeks tile.
  - `audioConfig.js` — BGM, ambience, SFX, batas instance.
  - `crops.js` — 11 tanaman + `computeCropStage`; `items.js` — alat, bibit, panen, ikan, kayu/batu, unlock.
  - `npcs.js` — 3 NPC + spot; `dialogues.js` — kalimat bersyarat cuaca/fase/hari.
  - `quests.js` — 6 quest antar barang, syarat/hadiah, `sanitizeQuestState`; `resourceNodes.js` — 10 pohon + 7 batu farm, deterministik, `sanitizeNodesState`.
- **entities/**
  - `Player.js` — container 3 layer, aksi terkunci, debu.
  - `NPC.js` — NPC statis 3 layer, idle/doing, collider, Y-sort; ikon quest chat/love dibuat sekali lalu di-toggle.
  - `Crop.js` — visual petak + stage 00–05.
  - `AmbientAnimal.js` — hewan dekoratif bebas keliling, anti-numpuk, jeda pemain, ikon hasil.
- **systems/**
  - `EventBus.js` — event terpusat; `FontLoader.js` — font Adapa.
  - `AudioManager.js` — BGM/ambience/SFX, crossfade, setting audio.
  - `SaveSystem.js` — save v2 + migrasi v1 + fallback; field opsional `livestock`, `quests`, `nodes`.
  - `InputSystem.js` — keyboard + joystick sentuh.
  - `WorldBuilder.js` — builder per map (`farm`/`village`), tilemap, collider, NPC, node sprite/collider, destroy.
  - `DialogueSystem.js` — state dialog, pemilih kalimat, `startWithLines` untuk quest.
  - `StructureBuilder.js` — kanvas struktur desa (cache global) + props.
  - `InventorySystem.js` — 24 slot, stack 20, beli/jual, unlock; `takeItemsAndAddCoins` atomik.
  - `QuestSystem.js` — state quest tanpa Phaser: `belum/tersedia/aktif/selesai`, progres dari inventory, penanda NPC, tracker.
  - `ResourceNodeSystem.js` — tebang/tambang farm otomatis (tanpa pilih alat), frame kontak, respawn 4/3 hari, tas penuh aman.
  - `FarmingSystem.js` — cangkul, tanam, siram, tumbuh saat tidur, panen.
  - `FishingSystem.js` — idle→casting→waiting→bite→reeling→caught.
  - `TimeSystem.js` — 06:00–24:00, fase/tint, hari baru; `WeatherSystem.js` — hujan deterministik.
  - `AnimalTerrain.js` — grid tile terlarang; `LivestockSystem.js` — telur/susu + `lastCollectedDay`.
- **ui/** — `TouchControls.js`, `DialogueBox.js` (typewriter/blip), `ShopModal.js` (jual/beli).
- **scenes/**
  - `BootScene.js`/`PreloadScene.js` — font, aset, animasi global.
  - `MenuScene.js` — judul, Lanjut/Mulai/Hapus, audio.
  - `GameScene.js` — satu scene semua map: builder, switch/teardown, kamera, sistem map-local, tidur, save, tint, wiring quest.
  - `UIScene.js` — HUD, tas 24 slot (laci 6x4 scroll), toolbar, toast, dialog, audio, tracker quest + floating text.

## 4. Tempat menyetel nilai
| Kebutuhan | Lokasi |
| :-- | :-- |
| Map, spawn, zona, player, kamera, waktu, cuaca, tas, UI | `gameConfig.js` (`WORLD`/`MAPS`/`MAP_TRANSITION`/`PLAYER`/`CAMERA`/`TIME`/`WEATHER`/`INVENTORY`/`UI`) |
| Tanaman, item, unlock bibit | `crops.js`, `items.js`, `SEED_UNLOCK_SCHEDULE` |
| Ikan | `gameConfig.js` → `FISHING` |
| Hewan & ternak | `gameConfig.js` → `AMBIENT_ANIMALS`, `LIVESTOCK`; `AmbientAnimal.js`, `AnimalTerrain.js` |
| Node kayu/batu | `gameConfig.js` → `RESOURCE_NODES` (posisi, pukulan, drop, harga 6G/9G); `resourceNodes.js`, `ResourceNodeSystem.js` |
| Quest: NPC, item, jumlah, hari, dialog, hadiah | `quests.js`; aturan `QuestSystem.js` |
| Ikon quest & tracker | `gameConfig.js` → `NPC.QUEST_*`; `UIScene._updateQuestTracker` |
| NPC/dialog | `gameConfig.js` → `NPC`/`DIALOGUE`/`UI.FONT.DIALOGUE_*`; teks `dialogues.js` |
| Audio | `audioConfig.js`; runtime `AudioManager.js` |
| Aset/tile | `assetKeys.js`, `tileIndex.js` |

## 5. Status fitur + tes
- **V1 + Paket 1–3** `[SELESAI]` — menu, farm, farming 11 tanaman/unlock, mancing, waktu/tint, tas 24 slot, hujan 120 drop, 8 hewan bebas, ternak (ayam 12G/hr, sapi 30G/2hr).
- **Desa Fase 1–4** `[SELESAI-BUILD]` — satu `GameScene` + `mapId`, gerbang 2 arah, struktur 64x40, 3 NPC, 6 quest (simulasi 147 cek).
- **Tebang kayu & tambang batu (farm)** `[SELESAI-BUILD]` — 10 pohon + 7 batu (3 crop tileset + 4 baru), anim `axe`/`mining` 10f, SFX `life_axe_chop_01.ogg` (0.61) & `metal_clang_opt.ogg` (0.15), drop `wood` (6G) & `rock` (9G), respawn 4/3 hari, save `nodes`; build **48 modul** + simulasi **505 cek**.
- Build terakhir **lolos** (48 modul, Vite 6.4.5); save v2.

## 6. Gotchas
- **Freeze Phaser 3.90**: jangan sentuh GameObject di SHUTDOWN; pakai guard + `try/catch`.
- **Audio preload 12.42 MB**: 3 BGM/ambience tak terpakai dilepas, 4 loop mono 22kHz, `stream.wav` dimatikan.
- **Tint**: `fillAlpha = 1`, alpha lewat `GameObject.setAlpha()`.
- **Strip hewan** hadap kiri di frame 0 (`facesRight: false`).
- **Bibit baru**: game baru parsnip+carrot; sunflower H10, pumpkin H14.
- **Tas 24 slot**: `sanitizeSlots` isi sisa tanpa memotong save v2 12-slot.
- **Hewan ambient**: tanpa collider; larangan via `AnimalTerrain` (kebun+1 tile, dermaga).
- **Save opsional**: `livestock`/`quests`/`nodes` tanpa bump versi; sanitasi di `SaveSystem.load()`.
- **Node farm**: bangun sebelum `AnimalTerrain`; prioritas AKSI & hint paling akhir sebelum fallback; kontak `~300 ms` + `AudioManager` dukung `rate`.
- **Pindah map**: jangan `stop(GameScene)`; teardown sistem → `WorldBuilder` → player; listener fadeIn sebelum `fadeIn()`; cache `village_struct_*` jangan dihapus.
- **Quest**: simpan `aktif`/`selesai` saja; `takeItemsAndAddCoins({ save: false })` lalu satu save.

## 7. Masalah terbuka
1. **Suara hewan belum lengkap**: kokok ayam jantan, domba, babi, bebek, burung.
2. **Paket 2 belum dites HP**: 11 tanaman, scroll/keterbacaan ShopModal, unlock bertahap.
3. **Portrait/multitouch** belum dites penuh di HP.
4. **Quest & Node farm belum dites browser/HP**: quest, animasi `axe`/`mining`, guncangan/debu node, SFX kontak/pecah baru lewat build + simulasi Node.

## 8. Konvensi
- Baca skill relevan; `game-playtest` tak bisa di Termux → build + simulasi Node/manual.
- Satu tugas = satu commit; jangan ubah gameplay saat tugas dokumentasi.
- Pisah `scenes`/`entities`/`systems`/`ui`/`data`; komunikasi via `eventBus`.
- Konstanta di `gameConfig.js`/`crops.js`/`items.js`/`quests.js`/`audioConfig.js`.
- Jangan alokasi objek di `update()`; lepas listener `eventBus` saat SHUTDOWN.
- Gunakan `CODEMAP.md` (`grep -n <nama> CODEMAP.md`) untuk navigasi baris file besar; jalankan `npm run codemap` jika fungsi berubah.

## 9. Rencana
1. Perbaikan tint sore (19:00 lebih gelap/oranye).
2. V2: combat/musuh, cooking, quest lanjutan, interior.
3. Kantung Bibit terpisah bila 24 slot kurang.
4. Cuaca lanjutan: badai/petir/musim hujan.

## 10. Log sesi
| Tanggal | Commit | Milestone |
| :-- | :-- | :-- |
| 2026-10-31 | `a6dcc8e`–`bc737be` | M1–M4 inti + memory/font/audio |
| 2026-11-07 | `a47c88b`–`1363f5b` | Fix freeze, tint, hewan ambient |
| 2026-11-08 | `0476ee3`,`551625e` | Paket 2: 7 tanaman + unlock |
| 2026-11-14 | `85cad61`–`8ff7429`, `4fb6e7e`,`eceb9a8`, `b7023e4`–`2a6f757` | Inventory 24, hujan, hewan bebas, ternak, multi-map |
| 2026-11-14 | `a8c28de`,`3c8cf25` | Komentar kebun, listener fadeIn |
| 2026-11-21 | `a017e3c` | Desa fase 2: tata letak 64x40 |
| 2026-11-22 | `1ac1d61` | Desa struktur Sunnyside |
| 2026-11-23 | `c962c0e` | Desa fase 3: dialog + 3 NPC |
| 2026-11-23 | `7e4ae4c` | Desa fase 4: quest kecil |
| 2026-11-24 | `0d0cb5f`,`b340f62` | Optimasi audio preload (33.18 MB → 12.42 MB) |
| 2026-11-25 | `da18f77` | Tebang kayu & tambang batu (map farm) |
