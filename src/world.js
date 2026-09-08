// Chunked world: Uint8Array chunks (SPK-3), seeded noise, biomes-slim, ores, caves, trees.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const CX = 16, CH = 128, CZ = 16, SEA = 62;
  const hash = (a) => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
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
  const ID = (s) => CF.IDOF[s] || 0;

  function makeWorld(seed) {
    const n1 = makeNoise(seed), n2 = makeNoise(seed + 1), n3 = makeNoise(seed + 2), nT = makeNoise(seed + 3);
    const IDOF = CF.IDOF;
    const chunks = new Map();
    const dirty = new Set();
    const genQueue = [];
    let generated = 0;

    function colHeight(x, z) {
      return Math.max(5, Math.min(110, Math.round(SEA + (n1(x * 0.008, 0, z * 0.008) - 0.5) * 26 + (n2(x * 0.03, 5, z * 0.03) - 0.5) * 10)));
    }
    function biome(x, z) { const t = nT(x * 0.0015, 9, z * 0.0015); return t < 0.36 ? 'desert' : t > 0.66 ? 'frozen' : 'plains'; }
    function generate(cx, cz) {
      const arr = new Uint8Array(CX * CH * CZ);
      for (let lx = 0; lx < CX; lx++) for (let lz = 0; lz < CZ; lz++) {
        const x = cx * CX + lx, z = cz * CZ + lz;
        const h = colHeight(x, z), bm = biome(x, z);
        for (let y = 0; y <= h; y++) {
          let id;
          if (y === 0) id = IDOF['bedrock'];
          else if (y === h) id = bm === 'desert' ? IDOF['sand'] : IDOF['grass'];
          else if (y > h - 4) id = bm === 'desert' ? IDOF['sand'] : IDOF['dirt'];
          else id = IDOF['stone'];
          if (id === IDOF['stone'] && y > 2) {
            if (n3(x * 0.09, y * 0.12, z * 0.09) > 0.79) id = 0;
            else {
              const r = hash(x * 3411288 + y * 1337 + z * 7919 + seed);
              if (y < 12 && r < 0.0012) id = IDOF['diamond_ore'];
              else if (y < 16 && r < 0.004) id = IDOF['gold_ore'];
              else if (y < 30 && r < 0.012) id = IDOF['iron_ore'];
              else if (y < 40 && r < 0.024) id = IDOF['coal_ore'];
            }
          }
          arr[(y * CZ + lz) * CX + lx] = id;
        }
      }
      chunks.set(cx + ',' + cz, { cx, cz, arr, hmap: null });
      generated++;
      // trees (deterministic; written into this chunk only if fully inside)
      for (let lx = 2; lx < CX - 2; lx++) for (let lz = 2; lz < CZ - 2; lz++) {
        const x = cx * CX + lx, z = cz * CZ + lz;
        if (biome(x, z) !== 'plains') continue;
        if (hash(x * 6151 + z * 104729 + seed * 13) > 0.012) continue;
        const h = colHeight(x, z);
        if (arr[(h * CZ + lz) * CX + lx] !== IDOF['grass']) continue;
        const th = 4 + (hash(x + z * 31 + seed) > 0.5 ? 1 : 0);
        const sp = hash(x * 7717 + z * 12377 + seed * 3) > 0.8 ? 'birch' : 'oak'; // #049: ~20% birch (forest-ish), jungle from saplings only
        const logId = IDOF['log:' + sp], leafId = IDOF['leaves:' + sp] || IDOF['leaves'];
        for (let y = h + 1; y <= h + th; y++) arr[(y * CZ + lz) * CX + lx] = logId;
        for (let dy = th - 1; dy <= th + 1; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy > th - 1) continue;
          const yy = h + dy + 1, ax = lx + dx, az = lz + dz;
          if (yy < CH && !arr[(yy * CZ + az) * CX + ax]) arr[(yy * CZ + az) * CX + ax] = leafId;
        }
      }
      return chunks.get(cx + ',' + cz);
    }
    const key = (x) => Math.floor(x / CX), keyZ = (z) => Math.floor(z / CZ);
    function chunkAt(x, z) { return chunks.get(key(x) + ',' + keyZ(z)); }
    function get(x, y, z) {
      if (y < 0 || y >= CH) return 0;
      const c = chunkAt(x, z);
      if (!c) return 0;
      return c.arr[(y * CZ + (((z % CZ) + CZ) % CZ)) * CX + (((x % CX) + CX) % CX)];
    }
    function set(x, y, z, id) {
      if (y < 1 || y >= CH) return false;
      const c = chunkAt(x, z);
      if (!c) return false;
      const lx = ((x % CX) + CX) % CX, lz = ((z % CZ) + CZ) % CZ;
      const idx = (y * CZ + lz) * CX + lx;
      const prev = c.arr[idx];
      if (prev === id) return true;
      c.arr[idx] = id;
      queueRelight(x, z);
      const prevDef = CF.BY_ID[prev], nowDef = CF.BY_ID[id];
      if (id === 0) {
        // cross-model pop when its ATTACHED face support dies (MC torch rule, per-face) (#028)
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]]) {
          const nx = x + dx, ny = y + dy, nz = z + dz;
          const nb = get(nx, ny, nz);
          const nv = nb && CF.BY_ID[nb];
          if (!nv || !nv.cross) continue;
          const SUPV = { 1: [0, -1, 0], 2: [-1, 0, 0], 6: [1, 0, 0], 4: [0, 0, -1], 8: [0, 0, 1] };
          const v = SUPV[flatAt(nx, ny, nz)] || [0, -1, 0];
          if (CF.solidAt(get(nx + v[0], ny + v[1], nz + v[2]))) continue;
          set(nx, ny, nz, 0);
          if (CF.drops) CF.drops.push({ name: nv.name, n: 1, x: nx + 0.5, y: ny + 0.5, z: nz + 0.5 });
          if (CF.give) CF.give(nv.name, 1);
        }
      }
      if ((nowDef && nowDef.liquid) || (prevDef && prevDef.liquid)) {
        if (nowDef && nowDef.liquid) setFlat(x, y, z, 0);
        q(x, y, z);
        if (nowDef && nowDef.liquid) {
          fReady.set(x + ',' + y + ',' + z, fTick + FLUID_DELAY[nowDef.liquid]); // fresh source acts after its own delay (may have been queued as empty neighbor earlier)
          // #043 MC semantics: the MOVER resolves liquid-liquid contact (water->source=obsidian,
          // water->flow=cobble, lava->any=stone); a static neighbor must not preempt it.
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nb = get(x + dx, y, z + dz); const nbd = nb && CF.BY_ID[nb];
            if (nbd && nbd.liquid && nbd.liquid !== nowDef.liquid) {
              const otherLv = flatAt(x + dx, y, z + dz);
              const rep = nowDef.liquid === 'water' ? (otherLv === 0 ? IDOF['obsidian'] : IDOF['cobblestone']) : IDOF['stone'];
              set(x + dx, y, z + dz, rep);
              setFlat(x + dx, y, z + dz, 0);
            }
          }
        }
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) q(x + dx, y, z + dz);
        q(x, y + 1, z);
      }
      dirty.add(c.cx + ',' + c.cz);
      if (lx === 0) dirty.add((c.cx - 1) + ',' + c.cz);
      if (lx === CX - 1) dirty.add((c.cx + 1) + ',' + c.cz);
      if (lz === 0) dirty.add(c.cx + ',' + (c.cz - 1));
      if (lz === CZ - 1) dirty.add(c.cx + ',' + (c.cz + 1));
      if (id === 0) {
        for (let yy = y + 1; yy < CH; yy++) { // 1.12 update-driven gravity (#013)
          const ab = get(x, yy, z);
          if (ab === IDOF['sand'] || ab === IDOF['gravel']) fall(x, yy, z, ab);
          else if (ab) break;
        }
        if (isLog(prev)) decayLeavesNear(x, y, z); // #019: log removed -> decay check (#049 any species)
      }
      return true;
    }
    // 1.12.2: leaves persist while within 6 (Chebyshev) of any log; else decay to air.
    const isLeaves = (id) => id && CF.BY_ID[id] && CF.BY_ID[id].name === 'leaves'; // #049: any species
    const isLog = (id) => id && CF.BY_ID[id] && CF.BY_ID[id].name === 'log';
    const LOG = IDOF['log'];
    function decayLeavesNear(x0, y0, z0) {
      const logs = [];
      const R = 12; // candidate leaf range 6 + leaf->log range 6
      for (let x = x0 - R; x <= x0 + R; x++) for (let z = z0 - R; z <= z0 + R; z++) for (let y = y0 - R; y <= y0 + R; y++)
        if (isLog(get(x, y, z))) logs.push([x, y, z]);
      const toKill = [];
      for (let x = x0 - 6; x <= x0 + 6; x++) for (let z = z0 - 6; z <= z0 + 6; z++) for (let y = y0 - 6; y <= y0 + 6; y++) {
        if (!isLeaves(get(x, y, z))) continue;
        let alive = false;
        for (const [lx, ly, lz] of logs)
          if (Math.abs(lx - x) <= 6 && Math.abs(ly - y) <= 6 && Math.abs(lz - z) <= 6) { alive = true; break; }
        if (!alive) toKill.push([x, y, z]);
      }
      let n = 0;
      for (const [x, y, z] of toKill) if (isLeaves(get(x, y, z))) { set(x, y, z, 0); n++; }
      return n;
    }
    // ---- light engine (#020): packed byte = (sky<<4)|block per cell, per-chunk maps,
    // region relight (5x5 chunks) from sources + sky columns + ring seeds; queue budgeted.
    const lightQueue = new Set();
    const lightDone = new Set();
    function lightCell(c, x, y, z) {
      x = Math.floor(x); y = Math.floor(y); z = Math.floor(z); // #106: mesher samples faces at plane-0.001 (float) - without floor the %CX yields a float index -> undefined light -> black -faces
      const lx = ((x % CX) + CX) % CX, lz = ((z % CZ) + CZ) % CZ;
      return (y * CZ + lz) * CX + lx;
    }
    function lightAt(x, y, z) {
      if (y >= CH) return 0xF0;
      if (y < 0) return 0;
      const c = chunkAt(x, z);
      return c && c.light ? c.light[lightCell(c, x, y, z)] : 0;
    }
    function relight(cx0, cz0) {
      const R = 2, box = [];
      for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
        const c = chunks.get((cx0 + dx) + ',' + (cz0 + dz));
        if (c) box.push(c);
      }
      if (!box.length) return;
      // ring seed snapshot (outer perimeter cells keep old values as BFS seeds from outside light)
      const ring = [];
      for (const c of box) {
        const onRing = c.cx === cx0 - R || c.cx === cx0 + R || c.cz === cz0 - R || c.cz === cz0 + R;
        if (!onRing || !c.light) continue;
        for (let lx = 0; lx < CX; lx++) for (let lz = 0; lz < CZ; lz++) {
          for (let y = 1; y < CH; y++) {
            const l = c.light[(y * CZ + lz) * CX + lx];
            if (!l) continue;
            // #043 perf: same coverage rule as the useful scan - open-column sky and emitter light are
            // fully re-derived by the fresh passes; only under-cover bleed and stale block light matter.
            const s = l >> 4, b = l & 15;
            const above = y + 1 < CH ? c.arr[((y + 1) * CZ + lz) * CX + lx] : 0;
            const covered = above && !(CF.BY_ID[above] && CF.BY_ID[above].liquid);
            if (!(b > 1 || ((s > 1 || b > 1) && covered))) continue;
            ring.push([c.cx * 16 + lx, y, c.cz * 16 + lz, l]);
          }
        }
      }
      for (const c of box) {
        if (!c.light) c.light = new Uint8Array(CX * CH * CZ);
        else c.light.fill(0);
      }
      const qx = [], qy = [], qz = [], qs = [], qb = [];
      const pushQ = (x, y, z, s, b) => { qx.push(x); qy.push(y); qz.push(z); qs.push(s); qb.push(b); };
      // seeds: light sources + ring + sky columns (top-down no-decay while air)
      for (const c of box) {
        for (let lx = 0; lx < CX; lx++) for (let lz = 0; lz < CZ; lz++) {
          let sky = 15;
          for (let y = CH - 1; y >= 1; y--) {
            const id = c.arr[(y * CZ + lz) * CX + lx];
            const liq = id && CF.BY_ID[id] && CF.BY_ID[id].liquid;
            if (id && !liq) {
              // #105: cross/non-solid blocks (torch, sapling) must NOT block skylight, and their own
              // emission ORs with the sky nibble - the old overwrite left torch cells at 14/255 -> near-black quads.
              // #052 (restored): single slabs also pass skylight (1.12); doubles stay opaque.
              const v = CF.BY_ID[id];
              const opaque = v ? (v.solid && !(v.boxes && !(flatAt(c.cx * CX + lx, y, c.cz * CZ + lz) & 4))) : true;
              const lv = v ? v.light : 0;
              let val = 0;
              if (lv) { val = lv; pushQ(c.cx * 16 + lx, y, c.cz * 16 + lz, 0, lv); }
              if (opaque) sky = 0;
              else if (sky) val |= sky << 4;
              if (val) c.light[(y * CZ + lz) * CX + lx] = val;
            } else if (id && liq && CF.BY_ID[id].light) { // #043 TEMP-PROBE-A: liquid light source (lava) only; water passes light unchanged
              c.light[(y * CZ + lz) * CX + lx] = CF.BY_ID[id].light; pushQ(c.cx * 16 + lx, y, c.cz * 16 + lz, 0, CF.BY_ID[id].light);
            } else if (sky) {
              c.light[(y * CZ + lz) * CX + lx] |= sky << 4;
              if (liq) sky -= 1; // liquids attenuate vertical skylight slightly
            }
          }
        }
      }
      for (const [x, y, z, l] of ring) { const c = chunkAt(x, z); if (c && c.light) c.light[lightCell(c, x, y, z)] |= l; }
      for (const c of box) { // seed BFS only from cells whose light can actually spread (skip interior)
        for (let lx = 0; lx < CX; lx++) for (let lz = 0; lz < CZ; lz++) for (let y = 1; y < CH; y++) {
          const l = c.light[(y * CZ + lz) * CX + lx];
          if (!l) continue;
          const s = l >> 4, b = l & 15;
          const wx = c.cx * 16 + lx, wz = c.cz * 16 + lz;
          // #043 perf: an old value only re-seeds information the fresh passes lack: open columns are
          // re-seeded top-down, in-region emitters rescan from block data, and perimeter light arrives via
          // the ring snapshot. What is NOT re-derived is light that previously BLED under cover - so push
          // exactly those (solid-above test, one array read; the old 6x lightAt() per cell was ~5M calls).
          const above = y + 1 < CH ? c.arr[((y + 1) * CZ + lz) * CX + lx] : 0;
          const covered = above && !(CF.BY_ID[above] && CF.BY_ID[above].liquid);
          const useful = (s > 1 || b > 1) && covered;
          if (useful) pushQ(wx, y, wz, s, b);
        }
      }
      const NB = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      let head = 0;
      while (head < qx.length) {
        const x = qx[head], y = qy[head], z = qz[head], s = qs[head], b = qb[head]; head++;
        for (const [dx, dy, dz] of NB) {
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (ny < 1 || ny >= CH) continue;
          const c2 = chunkAt(nx, nz);
          if (!c2) continue; // unloaded = opaque boundary (v1)
          if (!c2.light) c2.light = new Uint8Array(CX * CH * CZ);
          const cell = lightCell(c2, nx, ny, nz);
          {
            const nid2 = c2.arr[cell];
            const v2b = nid2 && CF.BY_ID[nid2];
            // opaque stops; liquids + cross(!solid) + single slabs pass (#043/#105/#052-restored; doubles don't)
            if (v2b && v2b.solid && !(v2b.boxes && !(flatAt(nx, ny, nz) & 4))) continue;
          }
          const ns = s === 15 ? 15 : s ? (dy !== 0 ? s : s - 1) : 0; // MC rule: FULL 15 skylight NEVER decays (any dir); else vertical free-fall keeps level, horizontal -1 (fixes #031 banding: pool rows were getting sky 14 under canopy gaps)
          const nb = b ? b - 1 : 0;
          if (!ns && !nb) continue;
          const cur = c2.light[cell];
          const nval = (Math.max(cur >> 4, ns) << 4) | Math.max(cur & 15, nb);
          if (nval !== cur) { c2.light[cell] = nval; pushQ(nx, ny, nz, ns, nb); }
        }
      }
      for (const c of box) dirty.add(c.cx + ',' + c.cz);
      lightDone.add(cx0 + ',' + cz0);
    }
    function ensureLight(cx, cz) {
      const k = cx + ',' + cz;
      if (lightDone.has(k)) return;
      relight(cx, cz);
    }
    function queueRelight(x, z) {
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
      const k = cx + ',' + cz;
      if (lightQueue.size < 96) lightQueue.add(k);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) lightDone.delete((cx + dx) + ',' + (cz + dz));
    }
    function ensureAround(px, pz, radius) {
      const cx = key(px, 0), cz = keyZ(pz);
      for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
        const k = (cx + dx) + ',' + (cz + dz);
        if (!chunks.has(k) && !genQueue.includes(k)) genQueue.push(k);
      }
      genQueue.sort((a, b) => {
        const pa = a.split(','), pb = b.split(',');
        return (Math.abs(pa[0] - cx) + Math.abs(pa[1] - cz)) - (Math.abs(pb[0] - cx) + Math.abs(pb[1] - cz));
      });
    }
    // ---- fluids (#022): level per cell (0=source, 1..7=flow), queue + tick budget.
    // #043 per-liquid spread delay (1.12 block ticks: water 5, lava 30 - lava creeps, water gushes)
    const FLUID_DELAY = { water: 5, lava: 30 };
    const fReady = new Map(); // cell key -> earliest tick it may act again
    let fTick = 0;
    const fluidQueue = new Set();
    function flatIdx(x, y, z) { const lx = ((x % CX) + CX) % CX, lz = ((z % CZ) + CZ) % CZ; return (y * CZ + lz) * CX + lx; }
    function flatAt(x, y, z) { const c = chunkAt(x, z); return c && c.flat ? c.flat[flatIdx(x, y, z)] : 0; }
    function setFlat(x, y, z, v) {
      const c = chunkAt(x, z); if (!c) return;
      if (!c.flat) c.flat = new Uint8Array(CX * CH * CZ);
      c.flat[flatIdx(x, y, z)] = v;
    }
    function q(x, y, z) {
      if (fluidQueue.size >= 4096) return;
      const k = x + ',' + y + ',' + z;
      if (!fReady.has(k)) {
        const id = get(x, y, z); const def = id && CF.BY_ID[id];
        const d = def && def.liquid === 'water' ? FLUID_DELAY.water : def && def.liquid === 'lava' ? FLUID_DELAY.lava : 0;
        fReady.set(k, fTick + d);
      }
      fluidQueue.add(k);
    }
    const OBS = IDOF['obsidian'], COBB = IDOF['cobblestone'], STONE = IDOF['stone'];
    function fluidStep(x, y, z) {
      const id = get(x, y, z); const def = id && CF.BY_ID[id];
      if (!def || !def.liquid) { setFlat(x, y, z, 0); return; }
      const isW = def.liquid === 'water';
      const maxLv = isW ? 7 : 3;
      const lv = flatAt(x, y, z);
      if (lv > maxLv) return;
      const belowId = get(x, y - 1, z);
      const belowDef = belowId && CF.BY_ID[belowId];
      if (!belowId) {
        set(x, y - 1, z, id); setFlat(x, y - 1, z, lv); q(x, y - 1, z);
        return;
      }
      if (belowDef && belowDef.liquid && belowDef.liquid !== def.liquid) {
        const otherLv = flatAt(x, y - 1, z);
        const rep = isW ? (otherLv === 0 ? OBS : COBB) : STONE;
        set(x, y - 1, z, rep); setFlat(x, y - 1, z, 0); q(x, y - 1, z);
        return;
      }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const b = get(x + dx, y, z + dz);
        const bd = b && CF.BY_ID[b];
        if (!b) {
          const nlv = lv + 1;
          if (nlv <= maxLv) { set(x + dx, y, z + dz, id); setFlat(x + dx, y, z + dz, nlv); q(x + dx, y, z + dz); }
        } else if (bd && bd.liquid && bd.liquid !== def.liquid) {
          if (lv >= maxLv) continue; // #043 immobile cell (full level): contact is resolved by the MOVER (in set() or by a flowing step) - MC order-of-events fidelity
          const otherLv = flatAt(x + dx, y, z + dz);
          const rep = isW ? (otherLv === 0 ? OBS : COBB) : STONE;
          set(x + dx, y, z + dz, rep); setFlat(x + dx, y, z + dz, 0);
        }
      }
    }
    function fluidTick() {
      const t0 = performance.now();
      let n = 40;
      for (const k of fluidQueue) {
        if (performance.now() - t0 > 15) break;
        const rdy = fReady.get(k);
        if (rdy !== undefined && rdy > fTick) continue; // #043 water 5 / lava 30 tick spread delay
        if (n-- <= 0) break; // budget only counts ACTUAL steps (unready cells cost just a map lookup)
        fluidQueue.delete(k);
        fReady.delete(k);
        const [x, y, z] = k.split(',').map(Number);
        fluidStep(x, y, z);
      }
      if (fReady.size > 8192) for (const [k, v] of fReady) if (v <= fTick) fReady.delete(k); // mined cells orphan keys
      fTick++;
      fluidStat.ms = performance.now() - t0;
      fluidStat.f = fTick; // #043 debug: fluid scheduler clock
      return fluidQueue.size;
    }
    const fluidStat = { ms: 0 };

    function tick() {
      const _t = { a: performance.now() }; // #043 TEMP-PROBE phase timing
      let budget = 2;
      while (budget-- > 0 && genQueue.length) {
        const k = genQueue.shift();
        if (!chunks.has(k)) { const [cx, cz] = k.split(',').map(Number); generate(cx, cz); }
      }
      _t.b = performance.now();
      let lb = 2;
      for (const k of lightQueue) {
        if (lb-- <= 0) break;
        lightQueue.delete(k);
        const [cx, cz] = k.split(',').map(Number);
        relight(cx, cz);
      }
      _t.c = performance.now();
      fluidTick();
      _t.d = performance.now();
      randomTicks();
      _t.e = performance.now();
      fluidStat.phases = [Math.round(_t.b - _t.a), Math.round(_t.c - _t.b), Math.round(_t.d - _t.c), Math.round(_t.e - _t.d), lightQueue.size, genQueue.length];
    }
    // 1.12 random block ticks: grass spread + sand/gravel gravity (issue #014, audit F4)
    let rtA = (seed * 31 + 7) | 0;
    let spreadEv = 0;
    const rtRng = () => { rtA |= 0; rtA = (rtA + 0x6D2B79F5) | 0; let t = Math.imul(rtA ^ (rtA >>> 15), 1 | rtA); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const DIRT = IDOF['dirt'], GRASS = IDOF['grass'], SAND = IDOF['sand'], GRAVEL = IDOF['gravel'];
    function skyAccess(x, y, z) {
      for (let yy = y + 1; yy < CH; yy++) if (get(x, yy, z)) return false;
      return true;
    }
    function fall(x, y, z, id) {
      let yy = y;
      while (yy - 1 >= 1 && !get(x, yy - 1, z)) yy--;
      if (yy === y) return false;
      set(x, y, z, 0);
      set(x, yy, z, id);
      return true;
    }
    function growTree(x, y, z, sp) { // #049: place full tree via set() (cross-chunk safe)
      const logId = IDOF['log:' + sp] || IDOF['log'], leafId = IDOF['leaves:' + sp] || IDOF['leaves'];
      const th = 4 + (hash(x + z * 31 + seed) > 0.5 ? 1 : 0);
      for (let yy = y; yy < y + th; yy++) set(x, yy, z, logId);
      for (let dy = th - 2; dy <= th; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy > th - 2) continue;
        const ty = y + dy;
        if (!get(x + dx, ty, z + dz)) set(x + dx, ty, z + dz, leafId);
      }
      return th;
    }
    function growSapling(x, y, z) { // 1.12 bone-meal-ish deterministic growth; true if a tree grew
      const id = get(x, y, z);
      if (!id || !CF.BY_ID[id] || CF.BY_ID[id].name !== 'sapling') return false;
      const below = get(x, y - 1, z);
      if (!below || !['dirt', 'grass', 'farmland'].includes(CF.BY_ID[below].name)) return false;
      for (let yy = y + 1; yy < y + 7; yy++) if (get(x, yy, z)) return false; // #049: air check ABOVE the sapling cell
      set(x, y, z, 0);
      growTree(x, y, z, id === IDOF['sapling'] ? 'oak' : CF.BY_ID[id].variant);
      return true;
    }
    function randomTicks() {
      if (!chunks.size) return;
      const arr = [...chunks.keys()];
      for (let i = 0; i < 40; i++) {
        const k = arr[(rtRng() * arr.length) | 0];
        if (!k) continue;
        const [cx, cz] = k.split(',').map(Number);
        const x = cx * CX + ((rtRng() * CX) | 0), z = cz * CZ + ((rtRng() * CZ) | 0);
        const y = 1 + ((rtRng() * (CH - 1)) | 0);
        const id = get(x, y, z);
        if (!id) continue;
        if (id === GRASS) {
          if (get(x, y + 1, z) || !skyAccess(x, y + 1, z)) continue;
          for (let t = 0; t < 4; t++) {
            const dx = ((rtRng() * 5) | 0) - 2, dz = ((rtRng() * 5) | 0) - 2, dy = ((rtRng() * 3) | 0) - 1;
            if (get(x + dx, y + dy, z + dz) === DIRT && !get(x + dx, y + dy + 1, z + dz) && skyAccess(x + dx, y + dy + 1, z + dz)) {
              spreadEv++;
              set(x + dx, y + dy, z + dz, GRASS);
            }
          }
        } else if (id === SAND || id === GRAVEL) {
          fall(x, y, z, id);
        } else if (CF.BY_ID[id].name === 'sapling' && rtRng() < 0.5) {
          growSapling(x, y, z); // #049: randomTick growth (1.12 ~5%/day; amplified here for liveliness, documented)
        }
      }
    }
    function stats() { return { chunks: chunks.size, generated, queue: genQueue.length, dirty: dirty.size, spreadEv }; }    function heightAt(x, z) { const h = colHeight(x, z); return h; }
    return { get, set, tick, ensureAround, stats, generate, chunks, dirty, heightAt, biome, seed, decayLeavesNear, growSapling, lightAt, ensureLight, flatAt, flatSet: setFlat, fluidStat };
  }
  CF.makeWorld = makeWorld;
  // #021 day/night: 24000-tick cycle; daylight factor curve (moonlight floor handled in shader).
  CF.timeOfDay = () => ((CF.ticks + (CF.timeOffset || 0)) % 24000 + 24000) % 24000;
  CF.dayFactor = (t) => {
    t = (t === undefined ? CF.timeOfDay() : t) % 24000;
    if (t < 12000) return 1;                      // day
    if (t < 13800) { const x = (t - 12000) / 1800; return 1 - (1 - Math.cos(x * Math.PI)) / 2 * 1; } // dusk cos-ease 1->0
    if (t < 22800) return 0;                      // night
    const x = (t - 22800) / 1200; return (1 - Math.cos(x * Math.PI)) / 2; // dawn cos-ease 0->1
  };
  const seed = ((location.search.match(/seed=(\d+)/) || [0, 1337])[1] | 0);
  CF.world = makeWorld(seed);
  CF.makeWorld = makeWorld; // SPK-7 hook: second world instance (dimension experiment) - NOT yet used by the game
})();

// Harness asserts (#002)
(function () {
  const CF = window.CF;
  CF.lightTests = async (r) => {
    const w = CF.world;
    const IDL = CF.IDOF;
    const lx = 44, lz = 44;
    let hmax = 0;
    for (let dx = -2; dx <= 10; dx++) hmax = Math.max(hmax, w.heightAt(lx + dx, lz));
    const lh = hmax + 3;
    w.ensureAround(lx, lz, 2);
    for (let i = 0; i < 20 && w.stats().queue; i++) w.tick();
    w.set(lx, lh, lz, IDL['glowstone']);
    w.ensureLight(Math.floor(lx / 16), Math.floor(lz / 16));
    const l0 = w.lightAt(lx, lh, lz) & 15;
    const l4 = w.lightAt(lx + 4, lh, lz) & 15;
    const l8 = w.lightAt(lx + 8, lh, lz) & 15;
    CF.assert(r, 'light.source(' + l0 + ')', l0 === 15);
    CF.assert(r, 'light.falloff(' + l4 + ',' + l8 + ')', l4 === 11 && l8 === 7);
    // occlusion: big stone wall between source and target
    for (let wy = lh - 4; wy <= lh + 4; wy++) for (let wz2 = lz - 5; wz2 <= lz + 5; wz2++) w.set(lx + 6, wy, wz2, IDL['stone']);
    w.set(lx, lh, lz, 0);
    w.set(lx, lh, lz, IDL['glowstone']);
    w.ensureLight(Math.floor(lx / 16), Math.floor(lz / 16));
    const behind = w.lightAt(lx + 8, lh, lz) & 15;
    CF.assert(r, 'light.occluded(' + behind + ')', behind <= 2);
    // skylight: find an open column (trees can block others)
    let skyOpen = 0;
    for (const [sx, sz] of [[lx, lz + 20], [lx + 3, lz + 23], [lx - 6, lz + 6], [lx + 9, lz - 9]]) {
      const sh = w.heightAt(sx, sz);
      let open = true;
      for (let y = sh + 1; y < 128; y++) if (w.get(sx, y, sz)) { open = false; break; }
      if (open) { skyOpen = w.lightAt(sx, sh + 1, sz) >> 4; break; }
    }
    CF.assert(r, 'light.sky(' + skyOpen + ')', skyOpen === 15);
    // AC1 (#021): fully covered cave cell = skylight 0
    const bxc = 100, bzc = 100;
    w.ensureAround(bxc, bzc, 1);
    for (let i = 0; i < 10 && w.stats().queue; i++) w.tick();
    const bhc = w.heightAt(bxc, bzc);
    for (let x = bxc - 1; x <= bxc + 1; x++) for (let z = bzc - 1; z <= bzc + 1; z++) for (let y = bhc - 3; y <= bhc + 2; y++)
      if (!(x === bxc && z === bzc && y === bhc - 2)) w.set(x, y, z, IDL['stone']);
    w.ensureLight(Math.floor(bxc / 16), Math.floor(bzc / 16));
    const caveSky = w.lightAt(bxc, bhc - 2, bzc) >> 4;
    CF.assert(r, 'light.cave-sky0(' + caveSky + ')', caveSky === 0);
    // budgeted queue: edit far away, relight happens within <=8 ticks
    const beforeLight = w.lightAt(lx, lh, lz) & 15;
    w.set(lx, lh, lz, 0);
    CF.assert(r, 'light.queue-stale(pending relight)', (w.lightAt(lx, lh, lz) & 15) > 0);
    for (let i = 0; i < 10 && (w.lightAt(lx, lh, lz) & 15) > 0; i++) w.tick();
    const afterLight = w.lightAt(lx, lh, lz) & 15;
    CF.assert(r, 'light.queue-off(' + beforeLight + '->' + afterLight + ')', afterLight === 0);
  };
  CF.worldTests = async (r) => {
    const w = CF.world;
    w.ensureAround(0, 0, 4);
    for (let i = 0; i < 60 && w.stats().queue; i++) w.tick();
    CF.assert(r, 'world.chunks', w.stats().chunks >= 40);
    const h = w.heightAt(4, 7);
    const IDOF = CF.IDOF;
    CF.assert(r, 'world.surface-solid', !!CF.BY_ID[w.get(4, h, 4)] && CF.BY_ID[w.get(4, h, 4)].solid && w.get(4, h + 1, 4) === 0);
    CF.assert(r, 'world.bedrock', w.get(0, 0, 0) === IDOF['bedrock']);
    const w2 = CF.makeWorld(w.seed);
    let same = true;
    for (const [x, z] of [[3, 5], [-9, 12], [40, -77]]) same = same && w2.heightAt(x, z) === w.heightAt(x, z);
    CF.assert(r, 'world.deterministic', same);
    const before = w.get(2, 45, 2);
    w.set(2, 45, 2, IDOF['glass']);
    CF.assert(r, 'world.set-persists', w.get(2, 45, 2) === IDOF['glass']);
    w.set(2, 45, 2, before);
    CF.assert(r, 'world.dirty-marked', w.dirty.size > 0);
    w.dirty.clear();
    w.set(0, 45, 15, IDOF['glass']); // glass: guaranteed different from underground stone
    CF.assert(r, 'world.dirty-neighbor', w.dirty.size >= 2);
    let ores = 0;
    const ch = [...w.chunks.values()];
    for (let i = 0; i < ch.length; i++) { const a = ch[i].arr; for (let k = 0; k < a.length; k += 7) { const id = a[k]; if (id === IDOF['coal_ore'] || id === IDOF['iron_ore'] || id === IDOF['gold_ore'] || id === IDOF['diamond_ore']) ores++; } }
    CF.assert(r, 'world.ores-exist', ores > 30);
    const t0 = w.stats(); w.tick(); w.tick();
    CF.assert(r, 'world.gen-budget', w.stats().generated - t0.generated <= 2);
    const ID = CF.IDOF;
    // gravity: sand pillar collapses when under-block is removed (1.12 update-driven fall)
    const gx = 30, gz = 30, gh = w.heightAt(gx, gz);
    w.set(gx, gh + 1, gz, ID['sand']);
    w.set(gx, gh + 2, gz, ID['sand']);
    w.set(gx, gh + 1, gz, 0);
    CF.assert(r, 'world.gravity-fall', w.get(gx, gh + 2, gz) === 0 && w.get(gx, gh + 1, gz) === ID['sand']);
    // #019 leaves decay: synthetic tree fully decays when all logs removed; control tree persists
    const tx = 50, tz = 50, th = w.heightAt(tx, tz);
    const build = (bx, bz) => {
      for (let y = th + 1; y <= th + 4; y++) w.set(bx, y, bz, ID['log']);
      for (let dy = 3; dy <= 5; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        w.set(bx + dx, th + dy, bz + dz, ID['leaves']);
      }
    };
    build(tx, tz);
    for (let y = th + 1; y <= th + 4; y++) w.set(tx, y, tz, 0); // chop all logs
    let leaves = 0;
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let dy = 2; dy <= 6; dy++)
      if (w.get(tx + dx, th + dy, tz + dz) === ID['leaves']) leaves++;
    CF.assert(r, 'world.leaves-decay(' + leaves + ')', leaves === 0);
    build(tx + 24, tz);
    w.set(tx - 20, w.heightAt(tx - 20, tz) + 1, tz, ID['log']);
    w.set(tx - 20, w.heightAt(tx - 20, tz) + 1, tz, 0); // unrelated chop far away
    let kept = 0;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 3; dy <= 5; dy++)
      if (w.get(tx + 24 + dx, th + dy, tz + dz) === ID['leaves']) kept++;
    CF.assert(r, 'world.leaves-persist(' + kept + ')', kept > 60);
  };
  CF.grassTests = async (r) => {
    const w = CF.world;
    const ID = CF.IDOF;
    const hs = w.heightAt(2, 2);
    for (let dx = 0; dx < 5; dx++) for (let dz = 0; dz < 5; dz++) w.set(1 + dx, hs, 1 + dz, ID['dirt']);
    for (let i = 0; i < 24000; i++) w.tick();
    let grassed = 0;
    for (let dx = 0; dx < 5; dx++) for (let dz = 0; dz < 5; dz++) if (w.get(1 + dx, hs, 1 + dz) === ID['grass']) grassed++;
    CF.assert(r, 'world.grass-spread(' + grassed + ',ev' + w.stats().spreadEv + ')', grassed >= 2);
    // #049 species growth via deterministic growSapling API + cross-species decay
    {
      const gx = 30, gz = 30;
      w.ensureAround(gx, gz, 1);
      for (let i = 0; i < 20 && w.stats().queue; i++) w.tick();
      const gy = w.heightAt(gx, gz) + 1;
      for (let x = gx - 5; x <= gx + 5; x++) for (let z = gz - 5; z <= gz + 5; z++) {
        for (let y = gy; y < gy + 9; y++) w.set(x, y, z, 0);
        w.set(x, gy - 1, z, ID['dirt']);
      }
      const species = ['oak', 'birch', 'jungle'];
      const results = {};
      species.forEach((sp, i) => {
        const x = gx + i * 3 - 3;
        w.set(x, gy, gz, ID['sapling:' + sp]);
        const grew = w.growSapling(x, gy, gz);
        const logId = sp === 'oak' ? ID['log'] : ID['log:' + sp];
        const hasLog = w.get(x, gy + 1, gz) === logId;
        let leaf = false;
        for (let dx = -2; dx <= 2 && !leaf; dx++) for (let dz = -2; dz <= 2 && !leaf; dz++) {
          const id = w.get(x + dx, gy + 4, gz + dz);
          if (id && CF.BY_ID[id].name === 'leaves' && CF.BY_ID[id].variant === sp) leaf = true;
        }
        results[sp] = grew && hasLog && leaf;
      });
      CF.assert(r, 'grass.sapling-grow-oak', results.oak === true);
      CF.assert(r, 'grass.sapling-grow-birch', results.birch === true);
      CF.assert(r, 'grass.sapling-grow-jungle', results.jungle === true);
      // remove every log of the three trees -> ALL species leaves must decay (name-based #019 rule)
      for (let x = gx - 5; x <= gx + 5; x++) for (let z = gz - 5; z <= gz + 5; z++)
        for (let y = gy; y < gy + 8; y++) if (CF.BY_ID[w.get(x, y, z)] && CF.BY_ID[w.get(x, y, z)].name === 'log') w.set(x, y, z, 0);
      let left = 0;
      for (let x = gx - 5; x <= gx + 5; x++) for (let z = gz - 5; z <= gz + 5; z++)
        for (let y = gy; y < gy + 8; y++) if (CF.BY_ID[w.get(x, y, z)] && CF.BY_ID[w.get(x, y, z)].name === 'leaves') left++;
      CF.assert(r, 'world.leaves-decay-all(' + left + ')', left === 0);
    }
  };
  CF.timeTests = async (r) => {
    const w = CF.world;
    const df = CF.dayFactor;
    CF.assert(r, 'time.day', df(1000) === 1);
    CF.assert(r, 'time.night', df(18000) === 0);
    CF.assert(r, 'time.dusk-monotonic', (() => { let p = 1; for (let t = 12000; t <= 13800; t += 180) { const v = df(t); if (v > p + 1e-9) return false; p = v; } return df(13800) <= 0.001; })());
    CF.assert(r, 'time.dawn-monotonic', (() => { let p = 0; for (let t = 22800; t <= 24000; t += 120) { const v = df(t); if (v < p - 1e-9) return false; p = v; } return df(24000) === 1; })());
    let ok2 = true;
    try { for (let i = 0; i < 48000; i++) w.tick(); } catch (e) { ok2 = false; }
    CF.assert(r, 'time.2days-no-crash', ok2 && CF.dayFactor(18000) === 0);
  };
  CF.fluidTests = async (r) => {
    const w = CF.world;
    const ID = CF.IDOF;
    const W2 = w;
    const fx = 140, fz = 140;
    W2.ensureAround(fx, fz, 2);
    for (let i = 0; i < 30 && W2.stats().queue; i++) W2.tick();
    const fh = W2.heightAt(fx, fz);
    for (let x = fx - 8; x <= fx + 8; x++) for (let z = fz - 8; z <= fz + 8; z++)
      for (let y = fh + 1; y <= fh + 6; y++) W2.set(x, y, z, 0);
    for (let x = fx - 8; x <= fx + 8; x++) for (let z = fz - 8; z <= fz + 8; z++) W2.set(x, fh, z, ID['stone']);
    W2.set(fx, fh + 1, fz, ID['water']);
    for (let i = 0; i < 200; i++) W2.tick();
    const lv4 = W2.flatAt(fx + 4, fh + 1, fz);
    const far = W2.get(fx + 8, fh + 1, fz);
    CF.assert(r, 'fluids.spread(id=' + ID['water'] + '/g=' + W2.get(fx, fh + 1, fz) + ',liq=' + (CF.BY_ID[W2.get(fx, fh + 1, fz)] && CF.BY_ID[W2.get(fx, fh + 1, fz)].liquid) + ',src=' + W2.flatAt(fx, fh + 1, fz) + ',d4=' + lv4 + ',d1=' + W2.flatAt(fx + 1, fh + 1, fz) + ',far=' + far + ')',
      W2.get(fx, fh + 1, fz) === ID['water'] && W2.flatAt(fx, fh + 1, fz) === 0 && lv4 === 4 && far !== ID['water']);
    // water -> lava source = obsidian (Java)
    const ox = 160, oz = 160;
    W2.ensureAround(ox, oz, 2);
    for (let i = 0; i < 20 && W2.stats().queue; i++) W2.tick();
    const oh = W2.heightAt(ox, oz);
    for (let x = ox - 6; x <= ox + 6; x++) for (let z = oz - 6; z <= oz + 6; z++) {
      for (let y = oh + 1; y <= oh + 6; y++) W2.set(x, y, z, 0);
      W2.set(x, oh, z, ID['stone']);
    }
    W2.set(ox, oh + 1, oz, ID['water']);
    W2.set(ox + 2, oh + 1, oz, ID['lava']); // #043: not adjacent - WATER must flow into the lava source (mover resolves) for obsidian (MC: two static adjacent sources do NOT react)
    for (let i = 0; i < 60; i++) W2.tick();
    CF.assert(r, 'fluids.obsidian(' + W2.get(ox + 2, oh + 1, oz) + '/' + ID['obsidian'] + ')', W2.get(ox + 2, oh + 1, oz) === ID['obsidian']);
    // water -> flowing lava = cobblestone; lava -> water = stone
    const px = 180, pz = 180;
    W2.ensureAround(px, pz, 2);
    for (let i = 0; i < 20 && W2.stats().queue; i++) W2.tick();
    const ph = W2.heightAt(px, pz);
    for (let x = px - 7; x <= px + 7; x++) for (let z = pz - 7; z <= pz + 7; z++) {
      for (let y = ph + 1; y <= ph + 6; y++) W2.set(x, y, z, 0);
      W2.set(x, ph, z, ID['stone']);
    }
    W2.set(px + 5, ph + 1, pz, ID['lava']); // flowing lava spreads toward px
    for (let i = 0; i < 70; i++) W2.tick(); // #043 lava creeps at 30t/level: give it a lv1-2 front before water arrives
    W2.set(px - 5, ph + 1, pz, ID['water']); // water front meets lava front
    for (let i = 0; i < 150; i++) W2.tick();
    let solidified = 0;
    for (let x = px - 3; x <= px + 3; x++) {
      const b = W2.get(x, ph + 1, pz);
      if (b === ID['cobblestone'] || b === ID['stone']) solidified++;
    }
    CF.assert(r, 'fluids.solidify(' + solidified + ')', solidified >= 1);
    // pure lava->water: immobile lv7 water cell (bucket-placed) + adjacent lava flow -> stone
    W2.set(px - 5, ph + 2, pz + 6, ID['water']);
    W2.flatSet(px - 5, ph + 2, pz + 6, 7); // max level: cannot spread, just sits
    W2.set(px - 3, ph + 2, pz + 6, ID['lava']);
    for (let i = 0; i < 130; i++) W2.tick(); // #043: lava acts every 30 ticks - 3 steps before it touches the lv7 cell
    CF.assert(r, 'fluids.stone-lava-into-water(' + W2.get(px - 5, ph + 2, pz + 6) + ',src=' + W2.get(px - 3, ph + 2, pz + 6) + ',gap=' + W2.get(px - 4, ph + 2, pz + 6) + ',ft=' + W2.fluidStat.f + ')', W2.get(px - 5, ph + 2, pz + 6) === ID['stone']);
    // #043 AC: 1.12 spread delay - water gushes within ~2 ticks/level, lava creeps (30t/level)
    const lx = 200, lz = 200;
    W2.ensureAround(lx, lz, 1);
    for (let i = 0; i < 20 && W2.stats().queue; i++) W2.tick();
    const lh = W2.heightAt(lx, lz);
    for (let x = lx - 3; x <= lx + 3; x++) for (let z = lz - 3; z <= lz + 3; z++) {
      for (let y = lh + 1; y <= lh + 4; y++) W2.set(x, y, z, 0);
      W2.set(x, lh, z, ID['stone']);
    }
    W2.set(lx, lh + 1, lz, ID['lava']);
    for (let i = 0; i < 20; i++) W2.tick();
    const lavaEarly = W2.get(lx + 1, lh + 1, lz);
    for (let i = 0; i < 45; i++) W2.tick();
    const lavaLate = (W2.get(lx + 1, lh + 1, lz) || W2.get(lx - 1, lh + 1, lz) || W2.get(lx, lh + 1, lz + 1) || W2.get(lx, lh + 1, lz - 1));
    CF.assert(r, 'fluids.lava-slow(e0=' + lavaEarly + ',lt=' + lavaLate + ')', lavaEarly !== ID['lava'] && lavaLate === ID['lava']);
    CF.assert(r, 'fluids.budget', W2.fluidStat.ms < 30);
  };
})();
