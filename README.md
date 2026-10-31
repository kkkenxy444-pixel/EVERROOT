# Everroot — V1 (MVP)

**Everroot** adalah game 2D top-down pixel-art bertema *cozy farming, fishing, & exploration* bergaya *Sunnyside World* yang dibangun dengan **Phaser 3** (`^3.90.0`) dan **Vite** (`^6.3.5`), dirancang agar ringan, tajam, dan nyaman dimainkan di browser HP Android (melalui Termux) maupun desktop.

---

## 1. Cara Install & Menjalankan di Termux (Android) / Linux

Pastikan Node.js dan npm sudah terpasang di Termux (`pkg install nodejs`).

```bash
# 1. Masuk ke folder project & install dependency
npm install

# 2. Jalankan server development (dapat diakses dari browser HP di localhost:5173)
npm run dev -- --host

# 3. Jalankan production build (menghasilkan bundle di dist/)
npm run build

# 4. Jalankan preview hasil production build (port default 4173)
npm run preview -- --host
```

> **Catatan Khusus Termux Android**: Script `dev`, `build`, dan `preview` di `package.json` memanggil `node ./node_modules/vite/bin/vite.js` secara langsung agar tidak terkendala *shebang* `/usr/bin/env` pada lingkungan Termux.

---

## 2. Kontrol Permainan (Keyboard & Sentuh)

Game mendeteksi perangkat sentuh secara otomatis dan menampilkan kontrol *on-screen* di pojok bawah tanpa menutupi area kebun di tengah layar.

| Aksi | Keyboard (Desktop / Fisik) | Layar Sentuh (HP Android) |
| :--- | :--- | :--- |
| **Bergerak (8 Arah)** | `W A S D` atau Tombol Panah | **Joystick Virtual** di kiri-bawah |
| **Aksi Utama** *(Cangkul / Tanam / Siram / Panen / Pancing / Tidur / Buka Toko)* | `Spasi` atau `E` | Tombol **`AKSI`** di kanan-bawah |
| **Ganti Alat Berikutnya** | `Q` | Tombol **`ALAT`** di kanan-bawah |
| **Pilih Alat Langsung** | `1` (Cangkul), `2` (Penyiram), `3` (Bibit), `4` (Joran) | Tap langsung slot `1–4` pada toolbar bawah |
| **Ganti Jenis Bibit** *(hanya memilih bibit yang dimiliki)* | `R` | Tombol **`BIBIT`** di kanan-bawah |
| **Buka / Tutup Laci Tas (12 Slot)** | Klik tombol `0/12▾` | Tap tombol **`0/12▾`** di bar status kiri-atas |
| **Pengaturan Audio (Mute, Musik, SFX)** | Klik tombol `Suara▾` | Tap **`Suara▾`** di kanan-atas HUD atau bar bawah Menu |
| **Navigasi Modal Toko / Kotak Jual** | `W`/`S` (pilih baris), `1`/`Enter`, `2`/`E`, `ESC` (tutup) | Tap langsung tombol `Beli 1`/`Beli 5` atau `Jual 1`/`Semua` |
| **Buka Inspeksi Tileset Debug** | `F2` | Tap tombol **`Tileset`** di kanan-atas HUD / Menu |

---

## 3. Alur Permainan V1 (MVP)

1. **Modal Awal**: Pemain memulai Hari 1 pukul `06:00 (Pagi)` di dekat pondok dengan bekal **`50G`** serta bibit awal (**5 Lobak**, **3 Wortel**, **2 Bunga Matahari**, **1 Labu**).
2. **Berkebun (Farming)**:
   - Pilih **Cangkul (`1`)** $\rightarrow$ tekan `AKSI` di area tanah kebun untuk membuka petak tanam.
   - Pilih **Kantung Bibit (`3`)** $\rightarrow$ pilih jenis bibit dengan tombol **`BIBIT` / `R`** $\rightarrow$ tekan `AKSI` di tanah cangkulan untuk menanam (stok bibit berkurang 1).
   - Pilih **Penyiram (`2`)** $\rightarrow$ tekan `AKSI` untuk menyiram petak hingga berwarna gelap/basah.
   - **Penting**: Tanaman hanya bertambah *stage* (`00` s/d `05`) saat berganti hari **jika sudah disiram** pada hari sebelumnya.
   - Saat tanaman mencapai stage matang (`05`, ditandai kilau kuning), tekan `AKSI` untuk memanen ke dalam tas (maksimal **12 slot**, **20 item per slot**).
3. **Memancing (Fishing)**:
   - Pilih **Joran Pancing (`4`)**, dekati tepi danau atau dermaga kayu di sisi timur peta sambil menghadap ke air.
   - Tekan `AKSI` untuk melempar kail (*casting* $\rightarrow$ *waiting* selama `3.5–8.0` detik).
   - Saat muncul tanda **`! TARIK !`** dan bar waktu di atas kepala pemain (~1 detik), segera tekan `AKSI` untuk menarik ikan (*reeling* $\rightarrow$ *caught*).
   - Ada 3 jenis ikan: **Ikan Kecil Sungai** (`6G`, peluang 55%), **Ikan Sedang Danau** (`12G`, 33%), dan **Ikan Besar Emas** (`25G`, 12%).
4. **Jual-Beli (Ekonomi)**:
   - Dekati **Kotak Jual** (`crate`) di utara kebun dan tekan `AKSI` untuk menjual hasil panen dan ikan (`Jual 1`, `Semua` per baris, atau `Jual Semua`). Bibit tidak dapat dijual.
   - Dekati **Kios Bibit** di sebelahnya dan tekan `AKSI` untuk membeli bibit baru (`Beli 1` atau `Beli 5`).
5. **Siklus Waktu, Tidur, & Save Otomatis**:
   - Waktu berjalan dari `06:00` hingga `24:00` melewati 4 fase (**Pagi**, **Siang**, **Sore**, **Malam**) lengkap dengan perubahan warna langit, musik latar, dan suara alam (*ambience*).
   - Dekati pintu **Rumah** dan tekan `AKSI` untuk tidur (atau otomatis saat pukul `24:00`): hari bertambah, tanaman yang disiram tumbuh, dan permainan otomatis tersimpan ke `localStorage` (`everroot_v1_save`).
   - Pengaturan suara (`Mute`, volume `Musik`, volume `SFX`) disimpan terpisah di `localStorage` (`everroot_v1_audio_settings`).

---

## 4. Mode Debug & Inspeksi Tileset

- **Mode Debug Kecil (`?debug=1`)**:
  Buka `http://localhost:5173/?debug=1` untuk mengaktifkan fitur bantu pengujian:
  - Menampilkan *collider box* Arcade Physics di dunia.
  - Menampilkan 3 tombol kecil di kanan-atas HUD (serta shortcut keyboard):
    - **`+100G`** (`F6`): Menambah `100G`.
    - **`Hari+1`** (`F7`): Langsung memajukan hari ke `06:00 Pagi` berikutnya (menjalankan logika tumbuh tanaman & autosave penuh tanpa animasi *fade*).
    - **`+Bibit`** (`F8`): Menambah `+5` untuk seluruh jenis bibit.
  - Tanpa `?debug=1` di URL, seluruh fitur dan tombol debug ini nonaktif sepenuhnya.
- **Tileset Viewer (`?scene=tileset`)**:
  Buka `http://localhost:5173/?scene=tileset` (atau tekan tombol `Tileset` / `F2`) untuk memeriksa grid `16x16` beserta nomor indeks 0-based dari `spr_tileset_sunnysideworld_16px.png`.

---

## 5. Struktur Folder

```text
EVERROOT/
├── index.html                  # Viewport full-screen mobile & link PWA manifest
├── package.json                # Script Termux-friendly (Vite + Phaser 3.90)
├── vite.config.js              # Konfigurasi bundler Vite
├── ASSET_AUDIT.md              # Laporan audit 507 aset, ukuran strip, & TODO_ASSET
├── PROJECT_MEMORY.md           # Catatan arsitektur, status milestone, & log sesi
├── public/
│   ├── manifest.webmanifest    # Manifest PWA ringan
│   ├── icons/                  # Salinan ikon PNG valid (32x32, 192x192, 512x512)
│   └── assets/                 # Aset asli dari paket master (JANGAN DIUBAH)
└── src/
    ├── main.js                 # Entry point Phaser.Scale.RESIZE & listener orientasi
    ├── style.css               # Reset CSS layar penuh (100vw x 100dvh)
    ├── data/
    │   ├── gameConfig.js       # Semua konstanta permainan & rumus zoom/uiScale
    │   ├── assetKeys.js        # Pendaftaran terpusat 126 aset & ukuran frame
    │   ├── tileIndex.js        # Indeks tile 0-based terverifikasi
    │   ├── audioConfig.js      # Pemetaan BGM per scene, ambience fase, & SFX
    │   ├── crops.js            # Data pertumbuhan & harga 4 tanaman V1
    │   └── items.js            # Definisi 4 alat toolbar & katalog item/ikan
    ├── entities/
    │   ├── Player.js           # Karakter 3-layer (base + spikeyhair + tools)
    │   └── Crop.js             # Visual petak tanah & sprite tanaman stage 00-05
    ├── systems/
    │   ├── EventBus.js         # EventEmitter terpusat antar-system
    │   ├── FontLoader.js       # Loader font piksel Adapa
    │   ├── AudioManager.js     # Pengelola BGM, ambience, crossfade, & pengaturan suara
    │   ├── SaveSystem.js       # Penyimpanan localStorage ber-versi + fallback aman
    │   ├── InputSystem.js      # Penggabung input keyboard & vektor joystick sentuh
    │   ├── WorldBuilder.js     # Pembangun map outdoor 16px, bangunan, & collider
    │   ├── InventorySystem.js  # Pengelola 12 slot inventory, stack, & jual-beli
    │   ├── FarmingSystem.js    # Logika cangkul, tanam, siram, tumbuh harian, & panen
    │   ├── FishingSystem.js    # State machine memancing & pelampung
    │   └── TimeSystem.js       # Jam in-game & siklus fase Pagi/Siang/Sore/Malam
    ├── scenes/
    │   ├── BootScene.js        # Inisialisasi font sebelum render teks
    │   ├── PreloadScene.js     # Loading bar, penanganan error aset, & animasi global
    │   ├── MenuScene.js        # Layar judul, Lanjut/Mulai/Hapus Save, & bar audio
    │   ├── GameScene.js        # Scene utama dunia outdoor & koordinasi system
    │   ├── UIScene.js          # HUD resolusi layar asli, laci tas, & popover audio
    │   └── TilesetDebugScene.js# Inspeksi visual indeks tile 16px
    └── ui/
        ├── TouchControls.js    # Joystick virtual & tombol AKSI / ALAT / BIBIT
        └── ShopModal.js        # Modal tunggal Kotak Jual ('sell') & Kios Bibit ('buy')
```

---

## 6. Catatan Lisensi Aset (PENTING — Jangan Disebar Publik)

- Seluruh aset di dalam `public/assets/` berasal dari paket `GAME_ASSETS_MASTER_PHASER3_V5_WITH_ICON_ORIGINAL.zip` (lihat `public/assets/SOURCE_RIGHTS_NOTES.txt`).
- **JANGAN** mengunggah atau menyebarkan folder `public/assets/` maupun file ZIP aset ke repositori publik (GitHub publik, itch.io publik, dsb.) tanpa memastikan lisensi distribusi masing-masing pembuat aset.
- Dua sheet furnitur interior (`furnipixel_free.png` dan `interior_furniture_2d.png`) sengaja **tidak digunakan** di V1 karena catatan lisensinya belum terverifikasi di `SOURCE_RIGHTS_NOTES.txt`.

---

## 7. Rencana Pengembangan V2 (Roadmap)

Arsitektur V1 berbasis `EventBus` dan konfigurasi data terpusat telah disiapkan agar fitur V2 dapat ditambahkan sebagai *system* baru tanpa merombak kode inti V1:
1. **7 Tanaman Tambahan**: Mengaktifkan `beetroot`, `cabbage`, `cauliflower`, `kale`, `potato`, `radish`, dan `wheat` di `src/data/crops.js`.
2. **Peternakan Hewan (`AnimalSystem`)**: Ayam, sapi, domba, babi, dan bebek beserta hasil ternak (`egg.png`, `milk.png`).
3. **Memasak (`CookingSystem`)**: Mengolah hasil panen, ikan, dan ternak menjadi hidangan bernilai tinggi dengan SFX dari `audio/sfx/cooking/`.
4. **Interior Rumah & Cuaca Dinamis**: Ruangan dalam pondok dengan aset interior berlisensi jelas serta variasi cuaca hujan (otomatis menyiram kebun).
5. **Eksplorasi Hutan, Combat, & Quest NPC**: Area hutan 32px, pertarungan melawan *goblin*/*skeleton*, serta dialog & papan *quest* warga lembah.
