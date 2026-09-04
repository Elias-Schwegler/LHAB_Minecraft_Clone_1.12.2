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
      c.arr[idx] = id;
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
    function tick() {
      let budget = 2;
      while (budget-- > 0 && genQueue.length) {
        const k = genQueue.shift();
        if (!chunks.has(k)) { const [cx, cz] = k.split(',').map(Number); generate(cx, cz); }
      }
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
    function stats() { return { chunks: chunks.size, generated, queue: genQueue.length, dirty: dirty.size, spreadEv }; }
    function heightAt(x, z) { const h = colHeight(x, z); return h; }
    return { get, set, tick, ensureAround, stats, generate, chunks, dirty, heightAt, biome, seed, decayLeavesNear };
  }
  CF.makeWorld = makeWorld;
  const seed = ((location.search.match(/seed=(\d+)/) || [0, 1337])[1] | 0);
  CF.world = makeWorld(seed);
})();

// Harness asserts (#002)
(function () {
  const CF = window.CF;
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
    w.set(0, 45, 15, IDOF['stone']);
    CF.assert(r, 'world.dirty-neighbor', w.dirty.size >= 2);
    let ores = 0;
    const ch = [...w.chunks.values()];
    for (let i = 0; i < ch.length; i++) { const a = ch[i].arr; for (let k = 0; k < a.length; k += 7) { const id = a[k]; if (id === IDOF['coal_ore'] || id === IDOF['iron_ore'] || id === IDOF['gold_ore'] || id === IDOF['diamond_ore']) ores++; } }
    CF.assert(r, 'world.ores-exist', ores > 30);
    const t0 = w.stats(); w.tick(); w.tick();
    CF.assert(r, 'world.gen-budget', w.stats().generated - t0.generated <= 2);
    // #013/audit-F4 mechanics: grass spread + gravity fall
    const ID = CF.IDOF;
    const hs = w.heightAt(2, 2);
    for (let dx = 0; dx < 5; dx++) for (let dz = 0; dz < 5; dz++) w.set(1 + dx, hs, 1 + dz, ID['dirt']);
    for (let i = 0; i < 24000; i++) w.tick();
    let grassed = 0;
    for (let dx = 0; dx < 5; dx++) for (let dz = 0; dz < 5; dz++) if (w.get(1 + dx, hs, 1 + dz) === ID['grass']) grassed++;
    CF.assert(r, 'world.grass-spread(' + grassed + ',ev' + w.stats().spreadEv + ')', grassed >= 2);
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
})();
