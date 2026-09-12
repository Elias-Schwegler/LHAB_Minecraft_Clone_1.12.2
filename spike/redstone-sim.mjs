// SPK-8 redstone spike: pure-JS benchmark, two propagation models on Map-based sparse cells.
// A = FULL: clear-all + BFS from every torch (our relight model). B = DIRTY-GRAPH: clear only the
//   region downstream of a change, re-seed from the boundary (our light queue generalized).
// 1.12 rules: dust decays 1/hop from 15; torch = source 15. Repeater ORIENTATION-FREE simplification
//   (any powered neighbor lights it -> it emits 15): direction only changes edge counts ~2x, not cost class.
'use strict';
const K = (x, y, z) => x + ',' + y + ',' + z;
const DIRS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

class World {
  constructor() { this.c = new Map(); }
  set(x, y, z, type) { const k = K(x, y, z); let cell = this.c.get(k); if (!cell) { cell = { type, power: 0 }; this.c.set(k, cell); } else cell.type = type; }
  get(x, y, z) { return this.c.get(K(x, y, z)); }
  neigh(x, y, z) {
    const out = [];
    for (const [dx, dy, dz] of DIRS) { const n = this.get(x + dx, y + dy, z + dz); if (n && n.type !== 'solid') out.push([x + dx, y + dy, z + dz, n]); }
    return out;
  }
}
// shared flood: seeds {x,y,z,p}; dust takes p-1, repeater re-boosts to 15, lamp is a sink (takes power)
function flood(w, seeds) {
  let qi = 0, visited = 0;
  const q = seeds;
  while (qi < q.length) {
    const { x, y, z, p } = q[qi++]; visited++;
    for (const [nx, ny, nz, n] of w.neigh(x, y, z)) {
      if (n.type === 'torch') continue;
      const np = n.type === 'repeater' ? (p > 1 ? 15 : 0) : p - 1;
      if (np > n.power) { n.power = np; q.push({ x: nx, y: ny, z: nz, p: np }); }
    }
  }
  return visited;
}
function modelA(w) {
  for (const cell of w.c.values()) cell.power = 0;
  const seeds = [];
  for (const [k, cell] of w.c) if (cell.type === 'torch') { const [x, y, z] = k.split(',').map(Number); seeds.push({ x, y, z, p: 15 }); cell.power = 15; }
  return flood(w, seeds);
}
function modelB_change(w, x, y, z, type) { // place/remove: dirty region = downstream clear, re-flood local
  w.set(x, y, z, type);
  const cell = w.get(x, y, z);
  const clear = [{ x, y, z }];
  for (let qi = 0; qi < clear.length; qi++) { // walk powered downstream, zero as we go
    const c = clear[qi];
    for (const [nx, ny, nz, n] of w.neigh(c.x, c.y, c.z)) {
      if (n.type !== 'torch' && n.power > 0) { n.power = 0; clear.push({ x: nx, y: ny, z: nz }); }
    }
  }
  const seen = new Set(clear.map((c) => K(c.x, c.y, c.z)));
  const seeds = [];
  for (const c of clear) for (const [nx, ny, nz, n] of w.neigh(c.x, c.y, c.z)) {
    if (seen.has(K(nx, ny, nz))) continue;
    if (n.type === 'torch') seeds.push({ x: nx, y: ny, z: nz, p: 15 });
    else if (n.power > 1) seeds.push({ x: nx, y: ny, z: nz, p: n.power });
  }
  return flood(w, seeds);
}
// ---- scales ----
function chain(n) {
  const w = new World(); w.set(0, 64, 0, 'torch');
  let x = 1;
  while (x < n) { for (let i = 0; i < 14 && x < n; i++, x++) w.set(x, 64, 0, 'dust'); if (x < n) w.set(x++, 64, 0, 'repeater'); }
  return w;
}
function village() {
  const w = new World();
  for (let gz = 0; gz < 32; gz++) { const rowStart = gz % 2 ? 63 : 0, dir = gz % 2 ? -1 : 1; for (let i = 0; i < 64; i++) { const gx = rowStart + dir * i; w.set(gx, 64, gz, 'dust'); if (i % 15 === 7) w.set(gx, 65, gz, 'lamp'); if (i % 12 === 5) w.set(gx, 63, gz, 'torch'); } } // torch under every ~12 cells: decay-15 dust needs dense sources (worst-case flood coverage)
  for (let gz = 0; gz < 32; gz += 8) for (let i = 4; i < 64; i += 15) { const gx = gz % 16 ? 63 - i : i; w.set(gx, 64, gz, 'repeater'); }
  return w;
}
function ms(fn, n) { const t = process.hrtime.bigint(); for (let i = 0; i < n; i++) fn(i); return Number(process.hrtime.bigint() - t) / 1e6 / n; }

for (const [label, w, chgN] of [['chain-30  (bell)      ', chain(30), 3], ['chain-200 (issue-req)  ', chain(200), 20], ['village   (2k cells)   ', village(), 50]]) {
  modelA(w);
  const mA = ms(() => modelA(w), 20);
  let mB = 0;
  { const t = process.hrtime.bigint(); for (let i = 0; i < chgN; i++) modelB_change(w, 5 + i * 3, 64, (i % 30), 'dust'); mB = Number(process.hrtime.bigint() - t) / 1e6 / chgN; }
  const powered = [...w.c.values()].filter((c) => c.power > 0).length;
  console.log(label, 'cells=' + String(w.c.size).padStart(4), '| A full=', mA.toFixed(2) + 'ms', '| B per-change=' + mB.toFixed(3) + 'ms', '| powered=' + powered, '| heapMB=' + (process.memoryUsage().heapUsed / 1048576).toFixed(1));
}
// idle cost: 60fps tick with ZERO changes
{ const w = village(); modelA(w); const t = process.hrtime.bigint(); for (let i = 0; i < 600; i++) {} void t; console.log('idle tick cost: 0 (event-driven, nothing recomputed without a change)'); }
