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
        for (let y = h + 1; y <= h + th; y++) arr[(y * CZ + lz) * CX + lx] = IDOF['log'];
        for (let dy = th - 1; dy <= th + 1; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy > th - 1) continue;
          const yy = h + dy + 1, ax = lx + dx, az = lz + dz;
          if (yy < CH && !arr[(yy * CZ + az) * CX + ax]) arr[(yy * CZ + az) * CX + ax] = IDOF['leaves'];
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
        if (prev === IDOF['log']) decayLeavesNear(x, y, z); // #019: log removed -> decay check
      }
      return true;
    }
    // 1.12.2: leaves persist while within 6 (Chebyshev) of any log; else decay to air.
    const LEAF = IDOF['leaves'], LOG = IDOF['log'];
    function decayLeavesNear(x0, y0, z0) {
      const logs = [];
      const R = 12; // candidate leaf range 6 + leaf->log range 6
      for (let x = x0 - R; x <= x0 + R; x++) for (let z = z0 - R; z <= z0 + R; z++) for (let y = y0 - R; y <= y0 + R; y++)
        if (get(x, y, z) === LOG) logs.push([x, y, z]);
      const toKill = [];
      for (let x = x0 - 6; x <= x0 + 6; x++) for (let z = z0 - 6; z <= z0 + 6; z++) for (let y = y0 - 6; y <= y0 + 6; y++) {
        if (get(x, y, z) !== LEAF) continue;
        let alive = false;
        for (const [lx, ly, lz] of logs)
          if (Math.abs(lx - x) <= 6 && Math.abs(ly - y) <= 6 && Math.abs(lz - z) <= 6) { alive = true; break; }
        if (!alive) toKill.push([x, y, z]);
      }
      let n = 0;
      for (const [x, y, z] of toKill) if (get(x, y, z) === LEAF) { set(x, y, z, 0); n++; }
      return n;
    }
    // ---- light engine (#020): packed byte = (sky<<4)|block per cell, per-chunk maps,
    // region relight (5x5 chunks) from sources + sky columns + ring seeds; queue budgeted.
    const lightQueue = new Set();
    const lightDone = new Set();
    function lightCell(c, x, y, z) {
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
            if (l) ring.push([c.cx * 16 + lx, y, c.cz * 16 + lz, l]);
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
              const lv = CF.BY_ID[id] ? CF.BY_ID[id].light : 0;
              if (lv) { c.light[(y * CZ + lz) * CX + lx] = lv; pushQ(c.cx * 16 + lx, y, c.cz * 16 + lz, 0, lv); }
              sky = 0;
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
          let useful = false;
          for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
            const nb = lightAt(wx + dx, y + dy, wz + dz);
            if ((s > 0 && (s === 15 ? 15 : dy !== 0 ? s : s - 1) > (nb >> 4)) || (b > 1 && b - 1 > (nb & 15))) { useful = true; break; }
          }
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
          if (c2.arr[cell] && !(CF.BY_ID[c2.arr[cell]] && CF.BY_ID[c2.arr[cell]].liquid)) continue; // opaque stops; liquids pass
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
    const fluidQueue = new Set();
    function flatIdx(x, y, z) { const lx = ((x % CX) + CX) % CX, lz = ((z % CZ) + CZ) % CZ; return (y * CZ + lz) * CX + lx; }
    function flatAt(x, y, z) { const c = chunkAt(x, z); return c && c.flat ? c.flat[flatIdx(x, y, z)] : 0; }
    function setFlat(x, y, z, v) {
      const c = chunkAt(x, z); if (!c) return;
      if (!c.flat) c.flat = new Uint8Array(CX * CH * CZ);
      c.flat[flatIdx(x, y, z)] = v;
    }
    function q(x, y, z) { if (fluidQueue.size < 4096) fluidQueue.add(x + ',' + y + ',' + z); }
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
        if (n-- <= 0 || performance.now() - t0 > 15) break;
        fluidQueue.delete(k);
        const [x, y, z] = k.split(',').map(Number);
        fluidStep(x, y, z);
      }
      fluidStat.ms = performance.now() - t0;
      return fluidQueue.size;
    }
    const fluidStat = { ms: 0 };

    function tick() {
      let budget = 2;
      while (budget-- > 0 && genQueue.length) {
        const k = genQueue.shift();
        if (!chunks.has(k)) { const [cx, cz] = k.split(',').map(Number); generate(cx, cz); }
      }
      let lb = 2;
      for (const k of lightQueue) {
        if (lb-- <= 0) break;
        lightQueue.delete(k);
        const [cx, cz] = k.split(',').map(Number);
        relight(cx, cz);
      }
      fluidTick();
      randomTicks();
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
        }
      }
    }
    function stats() { return { chunks: chunks.size, generated, queue: genQueue.length, dirty: dirty.size, spreadEv }; }    function heightAt(x, z) { const h = colHeight(x, z); return h; }
    return { get, set, tick, ensureAround, stats, generate, chunks, dirty, heightAt, biome, seed, decayLeavesNear, lightAt, ensureLight, flatAt, flatSet: setFlat, fluidStat };
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
    W2.set(ox, oh + 1, oz, ID['water']); // water placed first: its flow resolves before lava's
    W2.set(ox + 1, oh + 1, oz, ID['lava']);
    for (let i = 0; i < 60; i++) W2.tick();
    CF.assert(r, 'fluids.obsidian(' + W2.get(ox + 1, oh + 1, oz) + '/' + ID['obsidian'] + ')', W2.get(ox + 1, oh + 1, oz) === ID['obsidian']);
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
    for (let i = 0; i < 20; i++) W2.tick();
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
    for (let i = 0; i < 60; i++) W2.tick();
    CF.assert(r, 'fluids.stone-lava-into-water(' + W2.get(px - 5, ph + 2, pz + 6) + ')', W2.get(px - 5, ph + 2, pz + 6) === ID['stone']);
    CF.assert(r, 'fluids.budget', W2.fluidStat.ms < 30);
  };
})();
