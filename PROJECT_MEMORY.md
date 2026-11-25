# PROJECT MEMORY — EVERROOT

> **Aturan sesi:** baca file ini + skill relevan sebelum menulis kode. Verifikasi ke `src/`. Satu tugas = satu commit. Akhiri dengan `npm run build`. Perbarui singkat, maks **10 KB**.

## 1. Ringkasan
- **Everroot**: game 2D top-down pixel-art cozy farming + fishing + exploration, gaya Sunnyside World.
- **Stack**: Phaser **3.90**, JavaScript ES modules, Vite **6.4.5**; dibungkus **Capacitor 8.6.2** (`com.everroot.game`) untuk APK Android; target HP Android (Termux), desktop jalan.
- **Render**: `Scale.RESIZE`, canvas ukuran fisik layar (`DPR` maks 2, batas 1920x1080), zoom dunia/UI berbasis short edge, `pixelArt`, `roundPixels`, `antialias: false`, Arcade.
- **Aset**: 509 file (507 runtime + manifest + lisensi); 193 referensi, 0 hilang. **Jangan ubah/resize/timpa aset asli.** Bundle tidak boleh disebar publik; 2 sheet furnitur interior tidak dipakai.

## 2. Menjalankan (Termux)
```bash
npm install
npm run dev -- --host      # http://localhost:5173
npm run build              # wajib lolos tiap tugas
npm run preview -- --host  # port 4173
```
- Script npm memanggil `node ./node_modules/vite/bin/vite.js` dan `node ./node_modules/@capacitor/cli/bin/capacitor` (`npm run cap -- <cmd>`) langsung; jangan ganti ke binary global.
- **Android & CI/CD APK**: `capacitor.config.json` (`webDir: dist`, `androidScheme: https`), `android/` (`minSdk 24`, `compileSdk`/`targetSdk 36`, JDK 21, Gradle `8.14.3`, AGP `8.13.0`). Workflow `.github/workflows/build-apk.yml` (`push` ke `main` + `workflow_dispatch`) menjalankan `npm ci` → `npm run build` → `cap sync android` → `./gradlew assembleDebug` dan meng-upload artifact `everroot-debug-apk`.
- Repo GitHub: `kkkenxy444-pixel/EVERROOT` (**PRIVATE**, branch `main`). `.gitignore`: `node_modules/`, `dist/`; `android/.gitignore` mengabaikan `assets/public` & `capacitor-cordova-android-plugins`. Jangan ubah repo ke publik selama aset ter-track.

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
  - `EventBus.js` — event terpusat; `FontLoader.js` — font Adapa; `AudioManager.js` — BGM/ambience/SFX, crossfade, setting.
  - `SaveSystem.js` — save v2 + migrasi v1 + fallback (`selectedToolId` tak dikenal → default); opsional `livestock`/`quests`/`nodes`.
  - `InputSystem.js` — keyboard (1–6 alat) + joystick sentuh; `WorldBuilder.js` — builder per map (`farm`/`village`), tilemap, collider, NPC, node, destroy.
  - `DialogueSystem.js` — state dialog + `startWithLines` quest; `StructureBuilder.js` — kanvas struktur desa + props.
  - `InventorySystem.js` — 24 slot, stack 20, beli/jual, unlock; `takeItemsAndAddCoins` atomik; `emitState` hanya pancar `SEED_CHANGED` saat bibit berubah.
  - `QuestSystem.js` — state quest tanpa Phaser (`belum/tersedia/aktif/selesai`), progres tas, penanda NPC, tracker.
  - `ResourceNodeSystem.js` — tebang/tambang farm via Kapak(5)/Beliung(6), jangkauan `REACH_PX` 36px + kerucut 120°/omni dekat, auto-hadap, penanda target reusable, respawn 4/3 hari.
  - `FarmingSystem.js` — cangkul/tanam/siram/panen; `FishingSystem.js` — state mancing; `TimeSystem.js`/`WeatherSystem.js` — waktu/tint/hujan; `AnimalTerrain.js`/`LivestockSystem.js` — hewan/ternak.
- **ui/** — `UIStyle.js` (`drawWoodPanel`, `WoodLabelPanel`, `FloatingTextPool` pooled), `TouchControls.js`, `DialogueBox.js` (typewriter/blip + `WoodLabelPanel` nama), `ShopModal.js` (jual/beli).
- **scenes/**
  - `BootScene.js`/`PreloadScene.js`/`MenuScene.js` — font, aset, animasi global, menu judul.
  - `GameScene.js` — satu scene semua map: builder, switch/teardown, kamera, sistem map-local, tidur, save, tint, quest, prioritas AKSI.
  - `UIScene.js` — HUD, tas 24 slot, hotbar 6 slot (`computeToolbarLayout`), panel kayu seragam (hint/toast/tracker/debug), pooled floating text berikon item, dialog, audio.

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
- **Tebang kayu & tambang batu + perbaikan UI** `[SELESAI-BUILD]` — 10 pohon + 7 batu farm, Kapak(5)/Beliung(6) di hotbar 6 slot (`ICON_AXE`/`ICON_PICKAXE`), `REACH_PX` 36px + kerucut 120°/omni 20px + penanda target; gaya teks kayu seragam (`UIStyle.js`, tanpa kotak hitam, floating text pooled berikon); perbaikan bug teks perolehan (`payload.amount` & `SEED_CHANGED` tanpa toast); build **49 modul** (Vite 6.4.5), save v2.

## 6. Gotchas
- **Freeze Phaser 3.90**: jangan sentuh GameObject di SHUTDOWN; pakai guard + `try/catch`.
- **Audio preload 12.42 MB**: 3 BGM/ambience tak terpakai dilepas, 4 loop mono 22kHz, `stream.wav` dimatikan.
- **Tint**: `fillAlpha = 1`, alpha lewat `GameObject.setAlpha()`.
- **Strip hewan** hadap kiri di frame 0 (`facesRight: false`).
- **Bibit baru**: game baru parsnip+carrot; sunflower H10, pumpkin H14.
- **Tas 24 slot**: `sanitizeSlots` isi sisa tanpa memotong save v2 12-slot.
- **Hewan ambient**: tanpa collider; larangan via `AnimalTerrain` (kebun+1 tile, dermaga).
- **Save opsional**: `livestock`/`quests`/`nodes` tanpa bump versi; sanitasi di `SaveSystem.load()`.
- **Node farm & alat**: bangun sebelum `AnimalTerrain`; Kapak(5)/Beliung(6) wajib (tanpa auto-tool), prioritas AKSI: landmark/NPC > Kapak/Beliung pada node > ternak; kontak `~300 ms` + `AudioManager` dukung `rate`.
- **Teks perolehan & bibit (akar bug A)**: `INVENTORY_ITEM_ADDED` mengirim `{ itemId, amount, total }` (jangan baca `payload.added`); `SEED_CHANGED` hanya sinkron status HUD bibit (jangan `_showToast`), `emitState` hanya pancar `SEED_CHANGED` bila bibit/stok berubah.
- **Gaya teks seragam**: pakai `UIStyle.js` (`WoodLabelPanel`, `drawWoodPanel`, `FloatingTextPool`); `ui_cozy_free.png` tidak dipakai karena palet krem kafe tidak cocok dengan kayu gelap HUD.
- **Garis hitam tipis 1/3 layar (belum terbukti)**: overlay tint/hujan jauh melebihi layar (`2w×2h`); dugaan utama WebGL tilemap row seam pada tileset tanpa extrude + `zoom 3` + `CAMERA.LERP` pecahan.
- **Debug & Save**: `?debug=1` → `+100G`/`Hari+1`/`+Bibit`, F6–F8, collider, audio. Save `localStorage` `everroot_v1_save` (v2, migrasi v1); audio `everroot_v1_audio_settings`.
- **CI APK GitHub Actions**: `android-actions/setup-android@v3` gagal di runner karena paket `tools` usang; pakai `sdkmanager` bawaan runner (`platform-tools`, `platforms;android-36`, `build-tools;36.0.0`) + `setup-java@v5` (JDK 21), dan wajib `cap sync android` sebelum `./gradlew assembleDebug`.
- **Pindah map**: jangan `stop(GameScene)`; teardown sistem → `WorldBuilder` → player; listener fadeIn sebelum `fadeIn()`; cache `village_struct_*` jangan dihapus.
- **Quest**: simpan `aktif`/`selesai` saja; `takeItemsAndAddCoins({ save: false })` lalu satu save.

## 7. Masalah terbuka
1. **Suara hewan belum lengkap**: kokok ayam jantan, domba, babi, bebek, burung.
2. **Paket 2 belum dites HP**: 11 tanaman, scroll/keterbacaan ShopModal, unlock bertahap.
3. **Portrait/multitouch** belum dites penuh di HP.
4. **Quest, Node farm, & APK CI** belum dites browser/install langsung di HP Android (`everroot-debug-apk` baru terverifikasi build sukses di CI).

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
| 2026-10-31–11-08 | `a6dcc8e`–`551625e` | M1–M4 inti, fix freeze/tint, hewan ambient, Paket 2 (11 tanaman) |
| 2026-11-14 | `85cad61`–`3c8cf25` | Inventory 24, hujan, hewan bebas, ternak, multi-map, fadeIn |
| 2026-11-21–23 | `a017e3c`–`7e4ae4c` | Desa 64x40, struktur Sunnyside, dialog + 3 NPC, 6 quest |
| 2026-11-24 | `0d0cb5f`,`b340f62` | Optimasi audio preload (33.18 MB → 12.42 MB) |
| 2026-11-25 | `da18f77`–`e94c477` | Tebang/tambang farm, fix teks perolehan, gaya teks kayu HUD, Kapak/Beliung |
| 2026-11-25 | `c1efd14`,`f653459` | Upload repo private `main`, setup Capacitor 8.6.2 Android & CI `build-apk.yml` (run `45614008731` sukses) |
