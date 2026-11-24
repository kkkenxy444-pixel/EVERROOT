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
  - `crops.js` — 11 tanaman + `computeCropStage`; `items.js` — alat, bibit, panen, ikan, unlock.
  - `npcs.js` — 3 NPC + spot; `dialogues.js` — kalimat bersyarat cuaca/fase/hari.
  - `quests.js` — 6 quest antar barang, syarat hari/prasyarat, dialog, `computeQuestReward`, `sanitizeQuestState`.
- **entities/**
  - `Player.js` — container 3 layer, aksi terkunci, debu.
  - `NPC.js` — NPC statis 3 layer, idle/doing, collider, Y-sort; ikon quest chat/love dibuat sekali lalu di-toggle.
  - `Crop.js` — visual petak + stage 00–05.
  - `AmbientAnimal.js` — hewan dekoratif bebas keliling, anti-numpuk, jeda pemain, ikon hasil.
- **systems/**
  - `EventBus.js` — event terpusat; `FontLoader.js` — font Adapa.
  - `AudioManager.js` — BGM/ambience/SFX, crossfade, setting audio.
  - `SaveSystem.js` — save v2 + migrasi v1 + fallback; field opsional `livestock`, `quests`.
  - `InputSystem.js` — keyboard + joystick sentuh.
  - `WorldBuilder.js` — builder per map (`farm`/`village`), tilemap, collider, NPC, destroy.
  - `DialogueSystem.js` — state dialog, pemilih kalimat, `startWithLines` untuk quest.
  - `StructureBuilder.js` — kanvas struktur desa (cache global) + props.
  - `InventorySystem.js` — 24 slot, stack 20, beli/jual, unlock; `takeItemsAndAddCoins` atomik.
  - `QuestSystem.js` — state quest tanpa Phaser: `belum/tersedia/aktif/selesai`, progres dari inventory, penanda NPC, tracker.
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
| Hewan ambient | `gameConfig.js` → `AMBIENT_ANIMALS`; `AmbientAnimal.js`, `AnimalTerrain.js` |
| Ternak | `gameConfig.js` → `LIVESTOCK` |
| Quest: NPC, item, jumlah, hari, dialog, hadiah | `quests.js`; aturan `QuestSystem.js` |
| Ikon quest & tracker | `gameConfig.js` → `NPC.QUEST_*`; `UIScene._updateQuestTracker` |
| NPC/dialog | `gameConfig.js` → `NPC`/`DIALOGUE`/`UI.FONT.DIALOGUE_*`; teks `dialogues.js` |
| Audio | `audioConfig.js`; runtime `AudioManager.js` |
| Aset/tile | `assetKeys.js`, `tileIndex.js` |

## 5. Status fitur + tes
- **V1 inti + Paket 1** `[SELESAI-TES-HP]` — menu, map, player, farming, mancing, waktu/tidur, tas, jual-beli, save v2, keyboard/sentuh, 8 hewan ambient.
- **Tint + inventory 24** `[SELESAI-BUILD]` — tint 24 jam (19:00 masih terang, ditunda); laci 6x4, migrasi save 12→24.
- **Paket 2 + freezer** `[SELESAI-BUILD]` — 11 tanaman/unlock/ShopModal; fix freeze Menu-scene.
- **Paket 3 hujan** `[SELESAI-BUILD]` — ~19–20% hari sejak Hari 3, 07:00–15:00 3–6 jam, petak basah, 120 drop pooled.
- **Hewan bebas + ternak** `[SELESAI-BUILD]` — 8 hewan via grid terlarang; 2 ayam (12G/hari), 1 sapi (30G/2 hari), `lastCollectedDay`, tas penuh aman.
- **Desa Fase 1–3** `[SELESAI-BUILD]` — satu `GameScene` + `mapId`, gerbang dua arah, fade/teardown, struktur 64x40 (6 rumah + balai, 3 kios, plaza), 3 NPC dialog bersyarat, save `mapId`/`mapPositions`.
- **Desa Fase 4 — quest kecil** `[SELESAI-BUILD]` — 6 quest antar barang (2/NPC; Hari 3 & 6), hadiah koin 1,75x nilai jual (65/105/115/210/20/65G), dialog tawar/pengingat/selesai, ikon chat/love, tracker 1 baris, SFX + floating text, save `quests` opsional; simulasi Node **147 cek lolos**.
- Build terakhir **lolos** (46 module, Vite 6.4.5); save v2.

## 6. Gotchas
- **Freeze Phaser 3.90**: `stop(GAME)` menghancurkan sprite player; `FishingSystem.destroy()` → `unlockAction()` → `play()` error. Jangan sentuh GameObject di SHUTDOWN; pakai guard + `try/catch`.
- **`stream.wav` dimatikan** (siang/sore `null`): noise floor tinggi + loop kanan melompat.
- **Tint**: `fillAlpha = 1`, alpha lewat `GameObject.setAlpha()`; jangan kalikan dua kali.
- **Strip hewan menghadap kiri** di frame 0; `facesRight: false`. Jangan asal flip.
- **Game baru hanya parsnip + carrot**; sunflower Hari 10, pumpkin Hari 14. Bibit terkunci tetap di tas tetapi tak bisa dipilih/ditanam.
- **Slot tas 24**: save v2 12 slot termuat utuh; `sanitizeSlots` isi sisa slot tanpa memotong item.
- **Hewan ambient** tanpa collider fisik; larangan via `AnimalTerrain`, kebun margin 1 tile, dermaga terlarang.
- **Save opsional**: `livestock`/`quests` jangan bump versi; sanitasi entri invalid di `SaveSystem.load()`.
- **Pindah map**: jangan `scene.stop(GameScene)`; `_switchMap` matikan sistem map-local + `WorldBuilder.destroy()` lalu player; listener fade-in sebelum `cam.fadeIn()`; spawn di luar zona gerbang; mapId tak dikenal → farm.
- **Tekstur struktur desa**: canvas di-cache global (`village_struct_*`), jangan dihapus di `WorldBuilder.destroy()`.
- **Quest**: simpan hanya `aktif`/`selesai`; `belum`/`tersedia` dari hari + `requires`; progres tidak disimpan. Serah terima `takeItemsAndAddCoins(..., { save: false })` lalu **satu save** setelah `selesai` agar tidak ada save di tengah transaksi.

## 7. Masalah terbuka
1. **Suara hewan belum lengkap**: kokok ayam jantan, domba, babi, bebek, burung.
2. **Paket 2 belum dites HP**: 11 tanaman, scroll/keterbacaan ShopModal, unlock bertahap.
3. **Portrait/multitouch** belum dites penuh di HP.
4. **Quest fase 4 belum dites browser/HP**: ikon & bobbing, tracker layar sempit, SFX, floating text, pacing dialog baru lewat build + simulasi Node.

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
