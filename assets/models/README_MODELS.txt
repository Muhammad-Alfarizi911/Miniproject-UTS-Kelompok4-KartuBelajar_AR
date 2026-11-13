PETUNJUK MODEL GLB
==================
Taruh 4 file model 3D (format .glb) di folder ini dengan nama persis:
  cpu.glb
  ram.glb
  gpu.glb
  motherboard.glb

- Jika file belum ada, aplikasi otomatis memakai objek 3D fallback (berputar).
- Jika GLB punya klip animasi, semua klip dijalankan (loop) via THREE.AnimationMixer.
- Ukuran model otomatis dinormalkan; usahakan < 2 MB per file (kompres tekstur / Draco tidak didukung bawaan).
- Lisensi: hanya CC0 / CC-BY / karya sendiri. Catat di docs/asset-licenses.md.
  Sumber: Poly Pizza, Sketchfab (filter Downloadable + CC), Kenney.nl, atau buat sendiri di Blender (Export glTF Binary).
