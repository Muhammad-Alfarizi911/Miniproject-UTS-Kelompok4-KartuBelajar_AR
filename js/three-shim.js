// Shim: MindAR 1.2.5 masih meminta ekspor lama (sRGBEncoding/LinearEncoding)
// yang sudah dihapus di Three.js r162+. Shim ini menambahkannya agar impor tidak gagal.
export * from 'https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.module.js';
export const sRGBEncoding = 3001;
export const LinearEncoding = 3000;
