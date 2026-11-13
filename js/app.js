import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'mindar-image-three';

const $ = (id) => document.getElementById(id);
const TARGET_SRC = 'assets/targets/targets.mind';
const STORE_KEY = 'ar-komponen-komputer-v1';
const CARDS = [
  { id: 0, name: 'CPU (Processor)', glb: 'cpu.glb' },
  { id: 1, name: 'RAM (Memory)', glb: 'ram.glb' },
  { id: 2, name: 'GPU (Graphics Card)', glb: 'gpu.glb' },
  { id: 3, name: 'Motherboard', glb: 'motherboard.glb' },
];

/* ---------- Persistence ---------- */
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && typeof s.answered === 'object' && s.answered) return s;
  } catch (e) { /* abaikan */ }
  return { answered: {} };
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* mode privat */ }
}
let state = loadState();
let questions = [];
let current = null; // id kartu aktif

function renderScore() {
  const correct = Object.values(state.answered).filter((a) => a.correct).length;
  $('score').textContent = `Skor: ${correct}/${CARDS.length}`;
}

/* ---------- Error & status ---------- */
function fail(title, msg) {
  $('loading').classList.add('hidden');
  $('err-title').textContent = title;
  $('err-msg').textContent = msg;
  $('error').classList.remove('hidden');
}
function setStatus() {
  const el = $('status');
  if (current === null) {
    const n = nextExpected();
    el.textContent = opts.seq && n !== -1 ? `Mencari Kartu... (berikutnya: 0${n + 1})` : 'Mencari Kartu...';
    el.classList.remove('found');
  }
  else { el.textContent = `Kartu Terdeteksi: ${CARDS[current].name}`; el.classList.add('found'); }
}

/* ---------- Opsi, suara, timer ---------- */
let opts = { seq: false, timer: true, sound: true };
const TIME_LIMIT = 20;
const timeLeft = {};
let timerId = null;
let actx = null;

function beep(freqs, dur = 0.12, type = 'sine', vol = 0.15) {
  if (!opts.sound || !actx) return;
  try {
    const t = actx.currentTime;
    freqs.forEach((f, i) => {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t + i * dur);
      g.gain.exponentialRampToValueAtTime(0.001, t + (i + 1) * dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t + i * dur); o.stop(t + (i + 1) * dur + 0.02);
    });
  } catch (e) { /* audio tidak tersedia */ }
}
const SFX = {
  found: () => beep([660, 880]),
  tap: () => beep([520], 0.08, 'triangle'),
  ok: () => beep([523, 659, 784], 0.12),
  bad: () => beep([220, 165], 0.18, 'sawtooth', 0.12),
  timeout: () => beep([300, 200, 140], 0.15, 'square', 0.08),
};

/* ---------- Kuis ---------- */
function nextExpected() { return CARDS.findIndex((c) => !state.answered[c.id]); }
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
function renderTimer(id) {
  const left = timeLeft[id] === undefined ? TIME_LIMIT : timeLeft[id];
  $('q-time').textContent = `${Math.ceil(left)} dtk`;
  $('q-bar').style.width = `${(left / TIME_LIMIT) * 100}%`;
  $('q-timer').classList.toggle('low', left <= 5);
}
function startTimer(id) {
  stopTimer();
  if (!opts.timer || state.answered[id]) return;
  if (timeLeft[id] === undefined) timeLeft[id] = TIME_LIMIT;
  renderTimer(id);
  let last = performance.now();
  timerId = setInterval(() => {
    const now = performance.now();
    timeLeft[id] -= (now - last) / 1000;
    last = now;
    if (timeLeft[id] <= 0) { timeLeft[id] = 0; renderTimer(id); stopTimer(); timeUp(id); return; }
    renderTimer(id);
  }, 200);
}
function timeUp(id) {
  if (state.answered[id]) return;
  state.answered[id] = { choice: -1, correct: false, timeout: true };
  saveState(); renderScore(); setStatus(); SFX.timeout();
  paintResult(questions.find((x) => x.id === id), -1);
  $('q-timer').classList.add('hidden');
  if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
}
function showQuiz(id) {
  stopTimer();
  const q = questions.find((x) => x.id === id);
  if (!q) return;
  $('q-comp').textContent = `Kartu ${id + 1}/${CARDS.length} - ${q.component}`;
  const box = $('q-options');
  box.replaceChildren();
  const fb = $('q-feedback');
  fb.replaceChildren(); fb.className = 'feedback';
  const prev = state.answered[id];
  const need = nextExpected();
  if (opts.seq && need !== -1 && need !== id && !prev) {
    $('q-text').textContent = `Mode Urutan: selesaikan Kartu ${need + 1} (${CARDS[need].name}) terlebih dahulu.`;
    fb.className = 'feedback bad';
    fb.textContent = `Pindai kartu ${String(need + 1).padStart(2, '0')} untuk membuka kuis ini.`;
    $('q-timer').classList.add('hidden');
    $('quiz').classList.remove('hidden');
    return;
  }
  $('q-text').textContent = q.question;
  q.options.forEach((txt, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.textContent = `${String.fromCharCode(65 + i)}. ${txt}`;
    b.addEventListener('click', () => answer(id, i));
    box.appendChild(b);
  });
  $('q-timer').classList.toggle('hidden', !opts.timer || !!prev);
  if (prev) paintResult(q, prev.choice); else startTimer(id);
  $('quiz').classList.remove('hidden');
}
function paintResult(q, choice) {
  [...$('q-options').children].forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) b.classList.add('ok');
    else if (i === choice) b.classList.add('bad');
  });
  const fb = $('q-feedback');
  const ok = choice === q.answer;
  const letter = String.fromCharCode(65 + q.answer);
  fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
  let msg = ok ? '\u2705 Benar! ' : choice === -1 ? `\u23F0 Waktu habis! Jawaban benar: ${letter}. ` : `\u274C Salah. Jawaban benar: ${letter}. `;
  msg += q.explanation;
  if (nextExpected() === -1) {
    const n = Object.values(state.answered).filter((a) => a.correct).length;
    msg += ` \uD83C\uDF89 Semua kartu selesai! Skor akhir: ${n}/${CARDS.length}.`;
  }
  fb.textContent = msg;
}
function answer(id, choice) {
  if (state.answered[id]) return;
  const q = questions.find((x) => x.id === id);
  stopTimer();
  state.answered[id] = { choice, correct: choice === q.answer };
  saveState();
  renderScore();
  setStatus();
  $('q-timer').classList.add('hidden');
  paintResult(q, choice);
  if (state.answered[id].correct) SFX.ok(); else SFX.bad();
  if (navigator.vibrate) navigator.vibrate(state.answered[id].correct ? 40 : [60, 40, 60]);
}
function hideQuiz() { stopTimer(); $('quiz').classList.add('hidden'); $('zoom').classList.add('hidden'); }

/* ---------- Objek 3D fallback (komposit unik per komponen) ---------- */
const M = (c, m = 0.3, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r });
const GOLD = M(0xd4af37, 0.85, 0.3);
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  o.position.set(x, y, z);
  return o;
}
function buildCPU() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.5, 0.06, M(0x1a2a4a)));
  g.add(box(0.3, 0.3, 0.05, M(0x9fb0c4, 0.9, 0.2), 0, 0, 0.055));
  g.add(box(0.12, 0.12, 0.03, M(0x00e5ff, 0.5, 0.3), 0, 0, 0.1));
  for (let i = -5; i <= 5; i++) {
    const o = i * 0.04;
    g.add(box(0.02, 0.05, 0.02, GOLD, o, 0.275, 0), box(0.02, 0.05, 0.02, GOLD, o, -0.275, 0),
      box(0.05, 0.02, 0.02, GOLD, 0.275, o, 0), box(0.05, 0.02, 0.02, GOLD, -0.275, o, 0));
  }
  return g;
}
function buildRAM() {
  const g = new THREE.Group();
  g.add(box(0.85, 0.22, 0.02, M(0x0e4660)));
  for (let i = 0; i < 6; i++) g.add(box(0.1, 0.1, 0.03, M(0x14181f, 0.2, 0.5), -0.33 + i * 0.13, 0.02, 0.02));
  for (let i = 0; i < 24; i++) if (i !== 12) g.add(box(0.017, 0.035, 0.01, GOLD, -0.4 + i * 0.035, -0.11, 0.005));
  g.add(box(0.1, 0.02, 0.025, M(0xff4d4d), -0.43, 0.115, 0), box(0.1, 0.02, 0.025, M(0xff4d4d), 0.43, 0.115, 0));
  g.rotation.z = 0.15;
  return g;
}
function buildGPU() {
  const g = new THREE.Group();
  g.add(box(0.85, 0.4, 0.08, M(0x1a2238, 0.6, 0.4)));
  g.add(box(0.85, 0.03, 0.1, GOLD, 0, -0.215, 0));
  g.userData.fans = [];
  [-0.2, 0.2].forEach((x) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 8, 32), M(0x00e5ff, 0.6, 0.3));
    ring.position.set(x, 0, 0.05);
    g.add(ring);
    const fan = new THREE.Group();
    fan.position.set(x, 0, 0.055);
    for (let k = 0; k < 7; k++) {
      const blade = box(0.13, 0.04, 0.01, M(0x0a1220, 0.4, 0.4), 0.07, 0, 0);
      const holder = new THREE.Group();
      holder.rotation.z = (k * Math.PI * 2) / 7;
      holder.add(blade);
      fan.add(holder);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), GOLD);
    hub.rotation.x = Math.PI / 2;
    fan.add(hub);
    g.add(fan);
    g.userData.fans.push(fan);
  });
  return g;
}
function buildMobo() {
  const g = new THREE.Group();
  g.add(box(0.75, 0.75, 0.03, M(0x123a5a)));
  g.add(box(0.2, 0.2, 0.04, M(0x28344f), -0.2, 0.15, 0.03));
  g.add(box(0.1, 0.1, 0.03, GOLD, -0.2, 0.15, 0.055));
  for (let i = 0; i < 4; i++) g.add(box(0.025, 0.28, 0.04, M(0x3c4b6e), 0.05 + i * 0.07, 0.17, 0.03));
  for (let i = 0; i < 2; i++) g.add(box(0.5, 0.03, 0.035, M(0x3c4b6e), -0.1, -0.15 - i * 0.1, 0.03));
  g.add(box(0.12, 0.12, 0.04, M(0x14181f), 0.25, -0.2, 0.03));
  [[-0.3, -0.05], [-0.25, -0.05], [0.3, 0.1], [0.3, 0.2]].forEach(([x, y]) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 12), M(0x2a3040, 0.5, 0.4));
    c.rotation.x = Math.PI / 2; c.position.set(x, y, 0.05); g.add(c);
  });
  return g;
}
const BUILDERS = [buildCPU, buildRAM, buildGPU, buildMobo];

/* ---------- Model: GLB, fallback bila tidak ada ---------- */
const loader = new GLTFLoader();
async function makeModel(card) {
  const root = new THREE.Group();
  try {
    const gltf = await loader.loadAsync(`assets/models/${card.glb}`);
    const m = gltf.scene;
    const bb = new THREE.Box3().setFromObject(m);
    const size = bb.getSize(new THREE.Vector3());
    m.scale.multiplyScalar(0.7 / Math.max(size.x, size.y, size.z, 1e-6));
    const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
    m.position.sub(c);
    root.add(m);
    let mixer = null;
    if (gltf.animations && gltf.animations.length) {
      mixer = new THREE.AnimationMixer(m);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
    }
    return { root, mixer, glb: true };
  } catch (e) {
    console.info(`GLB ${card.glb} tidak ditemukan, memakai objek fallback.`);
    root.add(BUILDERS[card.id]());
    return { root, mixer: null, glb: false };
  }
}

/* ---------- Inisialisasi AR ---------- */
const ct = $('ar-container');
let camera, renderer, scene;
const cards = [];

let started = false;
export async function init() {
  if (started) return;
  started = true;
  opts = { seq: $('opt-seq').checked, timer: $('opt-timer').checked, sound: $('opt-sound').checked };
  actx = window.__actx || null;
  $('loading').classList.remove('hidden');
  if (!window.isSecureContext) {
    return fail('Butuh HTTPS', 'Kamera hanya berfungsi lewat HTTPS (atau localhost). Buka aplikasi lewat tautan https:// GitHub Pages.');
  }
  try {
    const r = await fetch('data/questions.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    questions = await r.json();
  } catch (e) {
    return fail('Data Kuis Gagal Dimuat', 'File data/questions.json tidak dapat dibaca. Pastikan file ada dan format JSON valid.');
  }
  try {
    let r = await fetch(TARGET_SRC, { method: 'HEAD', cache: 'no-store' });
    if (!r.ok) r = await fetch(TARGET_SRC, { cache: 'force-cache' });
    if (!r.ok) throw new Error(r.status);
  } catch (e) {
    return fail('File targets.mind Belum Ada',
      'File assets/targets/targets.mind tidak ditemukan. Kompilasi 4 gambar di assets/cards/ (urutan CPU, RAM, GPU, Motherboard) memakai MindAR Image Compiler, lalu taruh hasilnya di assets/targets/targets.mind. Lihat README.md.');
  }

  const mindar = new MindARThree({ container: ct, imageTargetSrc: TARGET_SRC, maxTrack: 4, uiLoading: 'no', uiScanning: 'no', uiError: 'no' });
  ({ renderer, scene, camera } = mindar);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2);
  dl.position.set(1, 2, 3);
  scene.add(dl);

  const models = await Promise.all(CARDS.map(makeModel));
  CARDS.forEach((c, i) => {
    const anchor = mindar.addAnchor(i);
    const pivot = new THREE.Group();
    pivot.add(models[i].root);
    models[i].root.position.z = 0.25;
    anchor.group.add(pivot);
    const card = { ...c, anchor, pivot, root: models[i].root, mixer: models[i].mixer, glb: models[i].glb, kick: 0, zoom: 1, found: false };
    anchor.onTargetFound = () => { card.found = true; current = i; setStatus(); SFX.found(); showQuiz(i); $('zoom').classList.remove('hidden'); };
    anchor.onTargetLost = () => {
      card.found = false;
      if (current !== i) return;
      const other = cards.find((x) => x.found);
      if (other) { current = other.id; setStatus(); showQuiz(other.id); }
      else { current = null; setStatus(); hideQuiz(); }
    };
    cards.push(card);
  });

  try {
    await mindar.start();
  } catch (e) {
    console.error(e);
    const denied = e && (e.name === 'NotAllowedError' || /permission|denied|allowed/i.test(String(e.message || e)));
    return fail(denied ? 'Izin Kamera Ditolak' : 'Kamera Tidak Dapat Dibuka',
      denied ? 'Aplikasi membutuhkan kamera. Izinkan akses kamera di pengaturan browser (ikon gembok di address bar), lalu muat ulang halaman. Video kamera tidak diunggah ke server.'
        : 'Kamera tidak dapat dibuka. Pastikan tidak dipakai aplikasi lain, kamera tersedia, dan halaman dibuka lewat HTTPS. Detail: ' + (e && e.message ? e.message : e));
  }
  $('loading').classList.add('hidden');
  setStatus();
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    cards.forEach((c) => {
      if (!c.found) return;
      c.kick = Math.max(0, c.kick - dt * 1.1);
      const base = c.glb ? 0 : 0.9;
      c.root.rotation.y += dt * (base + c.kick * 12);
      const fans = c.root.children[0] && c.root.children[0].userData.fans;
      if (fans) fans.forEach((f) => { f.rotation.z -= dt * (6 + c.kick * 30); });
      if (c.mixer) { c.mixer.timeScale = 1 + c.kick * 3; c.mixer.update(dt); }
      c.pivot.scale.setScalar(c.zoom * (1 + 0.12 * Math.sin(c.kick * Math.PI)));
    });
    renderer.render(scene, camera);
  });
}

/* ---------- Interaksi sentuh: tap (raycast) & pinch ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const ptrs = new Map();
let lastDist = 0, moved = 0, multi = false;
const pdist = () => { const p = [...ptrs.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };

function zoomCard(id, f) {
  const c = cards[id];
  if (c) c.zoom = Math.min(2.5, Math.max(0.5, c.zoom * f));
}
function tap(x, y) {
  if (!camera) return;
  const r = ct.getBoundingClientRect();
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(cards.filter((c) => c.found).map((c) => c.pivot), true)[0];
  if (!hit) return;
  const card = cards.find((c) => { for (let o = hit.object; o; o = o.parent) if (o === c.pivot) return true; return false; });
  if (card) {
    card.kick = 1;
    SFX.tap();
    if (card.mixer) card.mixer.setTime(0);
    if (navigator.vibrate) navigator.vibrate(30);
  }
}
ct.addEventListener('pointerdown', (e) => {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) { moved = 0; multi = false; } else { multi = true; lastDist = pdist(); }
});
ct.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  moved += Math.hypot(e.clientX - p.x, e.clientY - p.y);
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) {
    const d = pdist();
    if (lastDist > 0 && current !== null) zoomCard(current, d / lastDist);
    lastDist = d;
  }
});
const endPtr = (e) => {
  if (!ptrs.has(e.pointerId)) return;
  const single = ptrs.size === 1 && !multi;
  ptrs.delete(e.pointerId);
  if (single && moved < 12 && e.type === 'pointerup') tap(e.clientX, e.clientY);
  if (ptrs.size === 0) multi = false;
};
ct.addEventListener('pointerup', endPtr);
ct.addEventListener('pointercancel', endPtr);

/* ---------- Tombol UI ---------- */
$('btn-plus').addEventListener('click', () => current !== null && zoomCard(current, 1.2));
$('btn-minus').addEventListener('click', () => current !== null && zoomCard(current, 1 / 1.2));
$('btn-reset').addEventListener('click', () => {
  if (!confirm('Reset semua skor dan riwayat jawaban?')) return;
  state = { answered: {} };
  Object.keys(timeLeft).forEach((k) => delete timeLeft[k]);
  stopTimer();
  saveState();
  renderScore();
  setStatus();
  if (current !== null) showQuiz(current);
});
$('btn-retry').addEventListener('click', () => location.reload());
renderScore();
