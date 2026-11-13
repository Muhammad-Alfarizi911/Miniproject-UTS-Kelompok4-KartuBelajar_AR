TUGAS MINIPROJECT UTS KELOMPOK 4 
TOPIK 6. KARTU BELAJAR AR

ANGGOTA KELOMPOK :
MUHAMMAD ALFARIZI (2409020051)
NAQI DISAN PRANAJAYA (2409020063)
MUHAMMAD FAUZAN HANDOYO(2409020049)
SALSA ARICA DILLA (2409020054)
RANGGA IBNU PRAWIRA (2309020343)


# Kartu Belajar AR - Komponen Komputer (Prototipe v0.5)

Miniproject UTS Praktikum AR/VR (Topik 6: Kartu Belajar AR). Aplikasi WebAR di smartphone: arahkan kamera ke 4 kartu
(CPU, RAM, GPU, Motherboard), muncul model 3D beranimasi dan kuis singkat. Skor tersimpan di perangkat.

## Fitur
- Multi-target image tracking (MindAR) untuk 4 kartu
- Model GLB + `THREE.AnimationMixer`, dengan objek fallback otomatis bila GLB belum ada
- Interaksi: ketuk objek (raycast) untuk animasi/putar cepat, cubit atau tombol +/- untuk zoom
- Layar awal dengan 3 opsi (tersimpan di perangkat): **Mode Urutan Kartu** (kuis kartu 01 sampai 04 harus berurutan), **Penghitung Waktu** (20 detik per soal, habis = salah), **Efek Suara Interaktif** (dibangkitkan WebAudio, tanpa file audio)
- Kuis dari `data/questions.json`, umpan balik benar/salah, skor di `localStorage`, tombol Reset Skor
- HUD status dan pesan error berbahasa Indonesia (kamera ditolak, `targets.mind` belum ada, bukan HTTPS)
- Privasi: kamera diproses di perangkat, tidak ada data dikirim ke server

## Struktur
```
index.html  css/style.css  js/app.js  data/questions.json
assets/cards/  assets/targets/  assets/models/  docs/
```

## 1. Kompilasi targets.mind
1. Buka https://hiukim.github.io/mind-ar-js-doc/tools/compile
2. Unggah berurutan: `card_0_cpu.png`, `card_1_ram.png`, `card_2_gpu.png`, `card_3_motherboard.png`
3. Periksa skor kualitas tiap target, lalu unduh hasilnya
4. Simpan sebagai `assets/targets/targets.mind`

## 2. (Opsional) Tambah model GLB
Lihat `assets/models/README_MODELS.txt`. Tanpa GLB, objek fallback tetap tampil.

## 3. Jalankan lokal
```
python -m http.server 8000
```
Buka `http://localhost:8000` di laptop (localhost boleh memakai kamera). Untuk HP, gunakan HTTPS (langkah 4).

## 4. Deploy ke GitHub Pages (HTTPS)
1. Buat repository GitHub, unggah seluruh isi folder ini (termasuk `targets.mind`)
2. Settings -> Pages -> Source: `Deploy from a branch` -> Branch `main`, folder `/ (root)` -> Save
3. Tunggu 1-2 menit, buka `https://USERNAME.github.io/NAMA-REPO/`
4. Buat kode QR dari tautan tersebut

## 5. Cara pakai
Buka tautan -> "Mulai AR" -> izinkan kamera -> arahkan ke kartu (tampilkan di layar atau cetak). Jawab kuis di panel bawah.

## Pemecahan masalah
- Tombol "Mulai AR" menampilkan pesan error: baca pesannya. Penyebab umum: dibuka lewat `file://` (pakai server lokal/HTTPS), CDN terblokir, atau browser terlalu lama.
- Layar hitam / kamera tidak muncul: pastikan HTTPS dan izin kamera diberikan.
- `js/three-shim.js` menambal ekspor lama Three.js yang dibutuhkan MindAR. Jangan dihapus.

## Batasan yang diketahui
- Kompatibilitas iPhone/Safari belum terverifikasi: catat hasil uji di `docs/device-matrix.md`
- Library dimuat dari CDN (butuh internet); MindAR 1.2.5 dipasangkan dengan Three.js 0.175.0 lewat importmap, uji di perangkat Anda
- Cetak doff dan cahaya cukup menjaga tracking stabil

## Dokumen
`docs/device-matrix.md`, `docs/asset-licenses.md`
