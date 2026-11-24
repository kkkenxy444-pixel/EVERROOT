# AGENTS.md — EVERROOT

Baca ini dulu, lalu `PROJECT_MEMORY.md`. Balas dan tulis laporan dalam bahasa Indonesia.

## Wajib sebelum menulis kode
1. Untuk tugas kode, UI, atau bug: muat 1-2 skill yang paling cocok lewat tool `skill`, jangan mengandalkan ingatan. Tugas kecil (ubah angka, teks, dokumen) tidak perlu skill. Kalau tool `skill` tidak menemukan skill, baca langsung `.agents/skills/<nama>/SKILL.md` (jangan baca folder referensinya) dan laporkan hal itu.
2. Baca bagian `PROJECT_MEMORY.md` yang relevan dan cek langsung ke `src/`.
3. Satu tugas = satu perubahan fokus = satu commit. Jangan refactor di luar permintaan.
4. Jangan install paket baru tanpa izin.
5. Akhiri dengan `npm run build` yang lolos. Jangan klaim selesai tanpa bukti output.
6. Di laporan akhir tulis skill yang dipakai dan satu hal yang diterapkan dari masing-masing.

## Routing skill
| Permintaan | Skill |
|---|---|
| Fitur/arsitektur game baru | `game-development` |
| Kode Phaser (scene, sprite, physics, tilemap) | `phaser-2d-game` |
| HUD, menu, modal, layout responsif | `game-ui-frontend` |
| Debug bug atau perilaku aneh | `systematic-debugging` |
| Sebelum bilang "selesai" atau commit | `verification-before-completion` |
| Normalisasi sprite sheet (hanya jika diminta) | `sprite-pipeline` |
| Smoke test browser | `game-playtest` (TIDAK bisa jalan di Termux, lewati) |

Kalau ragu: fitur baru pakai `game-development`, bug pakai `systematic-debugging`.

## Fakta proyek (jangan salah)
- Phaser **3.90**, JavaScript ES modules, Vite 6. **Bukan** TypeScript, **bukan** Phaser 4.
- Script npm memanggil `node ./node_modules/vite/bin/vite.js` — jangan ganti ke `vite` biasa (gagal di Termux).
- Target utama: browser HP Android di Termux. Uji juga layar kecil/landscape.
- Aset di `public/assets/` **jangan diubah, di-resize, atau ditimpa**. Tambah referensi hanya via `src/data/assetKeys.js`.
- Jangan push ke repo publik — lisensi aset tidak mengizinkan.
- Save memakai `localStorage` key `everroot_v1_save`; perubahan skema butuh migrasi.

## Gaya kerja
- Ikuti pola yang sudah ada di `src/systems/`, `src/data/`, `src/ui/`.
- Komunikasi antar-system lewat `EventBus`, bukan import silang langsung.
- Konstanta global masuk `src/data/gameConfig.js`.
- Komentar dan nama variabel: konsisten dengan file sekitarnya.
- Perbarui `PROJECT_MEMORY.md` singkat (maks 12 KB) jika arsitektur atau keputusan penting berubah, atau jika diminta di tugas. Ringkas log lama, jangan hapus fakta penting.

## Hemat token
- Jangan baca file besar penuh. File besar: src/scenes/GameScene.js, src/scenes/UIScene.js, src/systems/WorldBuilder.js, src/data/gameConfig.js. Cari bagian dengan grep -n lalu baca rentangnya dengan sed -n 'A,Bp'.
- Jangan buka dist/, node_modules/, atau file zip.
- Jalankan npm run build sekali per tugas (ulang hanya jika ada error).
- Laporan akhir maksimal 25 baris: file yang berubah, hasil verifikasi, risiko. Jangan mengulang isi kode.
- Jangan tulis ulang file besar untuk perubahan kecil.
- Mulai sesi baru untuk tiap tugas.

