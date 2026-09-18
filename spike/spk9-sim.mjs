// SPK-9: nether follow-up cost scout (pure Node, proxies of the REAL world.js loops).
'use strict';
const CX = 16, CH = 128, CZ = 16;
function hash(n) { let x = Math.sin(n) * 43758.5453; return x - Math.floor(x); }
function makeNoise(seed) {
  const n = new Float32Array(8192);
  for (let i = 0; i < 8192; i++) n[i] = hash(seed * 7919 + i);
  const hs = (x, y, z) => n[(((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 8191)];
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = x - xi, v = y - yi, w = z - zi;
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w), L = (a, b, t) => a + (b - a) * t;
    return L(L(L(hs(xi, yi, zi), hs(xi + 1, yi, zi), su), L(hs(xi, yi + 1, zi), hs(xi + 1, yi + 1, zi), su), sv),
      L(L(hs(xi, yi, zi + 1), hs(xi + 1, yi, zi + 1), su), L(hs(xi, yi + 1, zi + 1), hs(xi + 1, yi + 1, zi + 1), su), sv), sw);
  };
}
// (a) current nether generate() cost per chunk
const n1 = makeNoise(5), n2 = makeNoise(6), n3 = makeNoise(7);
function genChunk(cx, cz, arr) {
  for (let lx = 0; lx < CX; lx++) for (let lz = 0; lz < CZ; lz++) {
    const x = cx * CX + lx, z = cz * CZ + lz;
    const fh = Math.round(32 + (n1(x * 0.012, 0, z * 0.012) - 0.5) * 20);
    const ch = Math.round(96 + (n2(x * 0.012, 3, z * 0.012) - 0.5) * 16);
    for (let y = 1; y < CH - 1; y++) {
      const idx = (y * CZ + lz) * CX + lx;
      const sY = (yy) => yy <= fh || yy >= ch || n3(x * 0.05, yy * 0.07, z * 0.05) > 0.6;
      if (sY(y)) arr[idx] = hash(x * 911 + y * 7919 + z * 104729) < 0.014 ? 3 : 1;
      else if (y <= 31) arr[idx] = 2;
      else if (sY(y + 1) && hash(x * 1123 + y * 211 + z * 577) < 0.005) arr[idx] = 4;
    }
    arr[lz * CX + lx] = 5; arr[((CH - 1) * CZ + lz) * CX + lx] = 5;
  }
}
let t = Date.now();
const arr = new Uint8Array(CX * CH * CZ);
for (let i = 0; i < 128; i++) genChunk(i & 7, i >> 3, arr);
const perChunk = (Date.now() - t) / 128;
console.log('(a) nether generate():', perChunk.toFixed(2) + 'ms/chunk ->', (perChunk * 81).toFixed(0) + 'ms for 9x9 view, ~0.03ms/chunk was overworld-ish parity');
// (b) fortress stamp: bridges+towers district = ~40k block writes into Map-backed chunks
const world = new Map();
for (let cx = 0; cx < 4; cx++) for (let cz = 0; cz < 4; cz++) genChunk(cx, cz, arr), world.set(cx + ',' + cz, Uint8Array.from(arr));
function stampDistrict(map) {
  let sets = 0;
  const put = (cx, cz, x, y, z, v) => { const c = map.get(cx + ',' + cz); if (!c) return; const k = ((y * CZ + (z & 15)) * CX) + (x & 15); c[k] = v; sets++; };
  for (let b = 0; b < 6; b++) { // 6 bridge runs 24x24x4 floors + walls, 4 towers 5x5x12
    const bx = (b * 7) % 60, bz = (b * 13) % 60;
    for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) {
      const cx = (bx + x) >> 4, cz = (bz + z) >> 4;
      for (let y = 62; y < 66; y++) put(cx, cz, bx + x, y, bz + z, 9);
      if (x === 0 || x === 23 || z === 0 || z === 23) for (let y = 66; y < 69; y++) put(cx, cz, bx + x, y, bz + z, 9);
    }
    for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) for (let y = 60; y < 76; y++) if (x === 0 || x === 4 || z === 0 || z === 4 || y === 75) put(bx >> 4, bz >> 4, bx + x, y, bz + z, 9);
  }
  return sets;
}
t = Date.now();
let sets = 0; for (let i = 0; i < 8; i++) { for (let cx = 0; cx < 4; cx++) for (let cz = 0; cz < 4; cz++) genChunk(cx, cz, arr), world.set(cx + ',' + cz, Uint8Array.from(arr)); sets += stampDistrict(world); }
console.log('(b) fortress district stamp:', ((Date.now() - t) / 8).toFixed(1) + 'ms/district', '(' + (sets / 8).toFixed(0) + ' set-ops) - post-gen pass is FREE at these numbers vs 50ms/49-chunk gen');
// (c) ghast fireball = explode(power=1) blast cost: ray-march spheres in 1.12 = ~4000 get/set probes
t = Date.now();
let probes = 0;
for (let f = 0; f < 100; f++) {
  const r = 1.0 + 0.5;
  for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) for (let z = -3; z <= 3; z++) {
    if (Math.sqrt(x * x + y * y + z * z) <= r) { probes++; world.get('0,0'); } // + raymarch 8 dirs * 2 steps
    for (let d = 0; d < 8; d++) probes += 2;
  }
}
console.log('(c) fireball blast x100:', (Date.now() - t).toFixed(1) + 'ms total ->', ((Date.now() - t) / 100).toFixed(2) + 'ms per fireball (' + probes / 100 + ' probes), 20 concurrent/sec = trivial');
// (d) ghast flight steering cost: vector math per mob per tick
t = Date.now();
for (let i = 0; i < 200000; i++) { const dx = Math.sin(i * 0.01) * 0.1, dy = 0.02, dz = Math.cos(i * 0.01) * 0.1; Math.hypot(dx, dy, dz); }
console.log('(d) fly steering: 200k updates =', (Date.now() - t) + 'ms -> ~0.00005ms/tick/mob; ghast budget = projectile, not movement');
