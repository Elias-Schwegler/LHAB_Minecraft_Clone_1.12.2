// localStorage save/load, schema v1 (SPK-5): RLE edited-chunks + player + time.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const KEY = 'cf-save-1';

  function rleEncode(arr) {
    const out = [];
    let cur = arr[0], len = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === cur && len < 255) len++;
      else { out.push(cur, len); cur = arr[i]; len = 1; }
    }
    out.push(cur, len);
    return new Uint8Array(out);
  }
  function rleDecode(bytes, size) {
    const arr = new Uint8Array(size);
    let p = 0;
    for (let i = 0; i < bytes.length; i += 2) {
      const id = bytes[i], len = bytes[i + 1];
      for (let k = 0; k < len && p < size; k++) arr[p++] = id;
    }
    return arr;
  }
  CF.rleEncode = rleEncode; CF.rleDecode = rleDecode;

  const b64e = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  const b64d = (s) => { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; };

  function initEditTracking(w) {
    if (w._tracked) return;
    w._tracked = true;
    w.edited = new Set();
    const orig = w.set;
    w.set = function (x, y, z, id) {
      const r = orig(x, y, z, id);
      if (r) w.edited.add(Math.floor(x / 16) + ',' + Math.floor(z / 16));
      return r;
    };
    const origF = w.flatSet; // #053: model meta (slab/stairs/torch/bed bits) also marks a chunk edited
    if (origF) w.flatSet = function (x, y, z, fm) { origF(x, y, z, fm); w.edited.add(Math.floor(x / 16) + ',' + Math.floor(z / 16)); };
  }

  function packDim(w, besMap) { // #055 v2: per-dimension chunks/flats/bes payload
    initEditTracking(w);
    const e = { chunks: {}, flats: {} };
    const keys = [...w.edited];
    keys.sort((a, b) => {
      const [ax, az] = a.split(',').map(Number), [bx, bz] = b.split(',').map(Number);
      return Math.hypot(bx * 16, bz * 16) - Math.hypot(ax * 16, az * 16);
    });
    for (const k of keys) {
      const c = w.chunks.get(k);
      if (!c) continue;
      e.chunks[k] = b64e(rleEncode(c.arr));
      if (c.flat) {
        let any = false;
        for (let i = 0; i < c.flat.length && !any; i++) if (c.flat[i]) any = true;
        if (any) e.flats[k] = b64e(rleEncode(c.flat));
      }
    }
    e.bes = besMap || {};
    return e;
  }

  function saveNow() {
    const w = CF.world;
    if (!w) return null;
    if (CF.dims) CF.dims[CF.activeDim || 'over'] = w; // live pointer (warp/load keep dims fresh)
    const active = CF.activeDim || 'over';
    const src = CF.dims ? CF.dims : { over: w };
    const save = { v: 2, seed: w.seed, time: CF.ticks, active, dims: {} };
    let total = 0;
    for (const key of Object.keys(src)) {
      const dw = src[key];
      if (!dw) continue;
      const besMap = CF.dimBes ? CF.dimBes[key] : (key === active ? CF.blockEntities : {});
      const e = packDim(dw, besMap);
      if (key === active && CF.player) e.player = { pos: CF.player.pos.map((v) => +v.toFixed(2)), yaw: CF.player.yaw, pitch: CF.player.pitch, sel: CF.sel };
      save.dims[key] = e;
      total += Object.keys(e.chunks).length;
    }
    let warn = null;
    for (;;) {
      try { localStorage.setItem(KEY, JSON.stringify(save)); break; }
      catch (err) {
        const es = save.dims[active];
        const ks = es ? Object.keys(es.chunks) : [];
        if (!ks.length) { warn = 'quota: nothing left'; break; }
        delete es.chunks[ks[ks.length - 1]]; // evict farthest active-dim chunk
        warn = 'quota: evicted far edited chunk';
      }
    }
    CF.saveInfo = { bytes: JSON.stringify(save).length, chunks: total, warn };
    return CF.saveInfo;
  }

  function applyDim(seed, key, d) { // build/rehydrate one dimension; returns world or null
    if (!d && key === 'nether') return null;
    const dw = CF.makeWorld(key === 'nether' ? ((seed ^ 0x5EED) >>> 0) : seed, key === 'nether' ? { nether: true } : undefined); // #056: rehydrate nether with REAL nether gen
    initEditTracking(dw);
    for (const [k, b] of Object.entries((d && d.chunks) || {})) {
      const [cx, cz] = k.split(',').map(Number);
      dw.generate(cx, cz);
      const c = dw.chunks.get(k);
      if (c) { c.arr.set(rleDecode(b64d(b), c.arr.length)); dw.edited.add(k); dw.dirty.add(k); }
      if (c && d.flats && d.flats[k]) { if (!c.flat) c.flat = new Uint8Array(16 * 128 * 16); c.flat.set(rleDecode(b64d(d.flats[k]), c.flat.length)); dw.dirty.add(k); } // #053 meta bits (lazy flat!)
    }
    return dw;
  }

  function loadNow() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return false; }
    if (!raw) return false;
    loadNow._raw = String(raw).slice(0, 12);
    let save = null;
    try { save = JSON.parse(raw); } catch (e) { loadNow._rej = 'parse'; localStorage.removeItem(KEY); return false; }
    if (!save || (save.v !== 1 && save.v !== 2)) { loadNow._rej = 'ver'; localStorage.removeItem(KEY); return false; }
    loadNow._migrated = save.v === 1; // #055 v1 -> v2: one world + top-level chunks/flats/bes becomes dims.over
    let dims, active, bes;
    if (save.v === 1) {
      dims = { over: null, nether: null };
      active = 'over';
      bes = { over: save.bes || {}, nether: {} };
      const dw = applyDim(save.seed, 'over', { chunks: save.chunks, flats: save.flats });
      dims.over = dw;
      if (save.player && CF.player) { CF.player.tp(...save.player.pos); CF.player.yaw = save.player.yaw; CF.player.pitch = save.player.pitch; }
      if (CF.player) CF.sel = save.player ? save.player.sel || 0 : 0;
    } else {
      dims = { over: null, nether: null };
      active = save.active === 'nether' ? 'nether' : 'over';
      bes = { over: {}, nether: {} };
      for (const key of ['over', 'nether']) {
        const d = save.dims && save.dims[key];
        if (!d && !save.dims) continue;
        dims[key] = applyDim(save.seed, key, d);
        if (d) bes[key] = d.bes || {};
        if (d && d.player && key === active && CF.player) {
          CF.player.tp(...d.player.pos); CF.player.yaw = d.player.yaw; CF.player.pitch = d.player.pitch; CF.sel = d.player.sel || 0;
        }
      }
    }
    if (!dims.over) dims.over = applyDim(save.seed, 'over', null);
    CF.world = dims[active] || dims.over;
    CF.activeDim = dims[active] ? active : 'over';
    CF.dims = dims;
    CF.dimBes = bes;
    CF.blockEntities = bes[CF.activeDim] || (bes[CF.activeDim] = {});
    CF.renderReset && CF.renderReset();
    CF.mobs && CF.mobs.clear(); // mobs are transient (persistence = backlog #044)
    if (CF.tnts) CF.tnts.length = 0; // primed TNT not persisted either
    if (CF.itemEnts) CF.itemEnts.length = 0; // #060 dropped items are transient
    CF.ticks = save.time || 0;
    // #040: restore container BEs per dim (drop orphans whose block is gone, e.g. blown up before saving)
    for (const key of ['over', 'nether']) {
      const dw = dims[key];
      if (!dw) { bes[key] = {}; continue; }
      const kept = {};
      for (const [k, b] of Object.entries(bes[key] || {})) {
        const [bx, by, bz] = k.split(',').map(Number);
        const nm = CF.BY_ID[dw.get(bx, by, bz)];
        if (nm && ((nm.name === 'chest' && b.type === 'chest') || (nm.name === 'furnace' && b.type === 'furnace'))) kept[k] = b;
      }
      bes[key] = kept;
    }
    CF.blockEntities = bes[CF.activeDim];
    CF.loaded = true;
    return true;
  }

  CF.saveNow = saveNow;
  CF.trackWorld = initEditTracking; // #055: newly created worlds (warp nether!) must be tracked BEFORE their first edit or changes never save
  CF.loadNow = loadNow;
  if (CF.world) initEditTracking(CF.world);

  setInterval(() => { if (CF.world && CF.player && CF.ticks > 10 && !CF.autosavePaused) saveNow(); }, 10000);
  window.addEventListener('beforeunload', () => saveNow());
  if (location.search.includes('new=1')) { try { localStorage.removeItem(KEY); } catch (e) {} }
  else if (CF.world) { setTimeout(() => loadNow(), 0); } // auto-load if a save exists (fresh profiles: no-op)

  CF.persistTests = async (r) => {
    const W = CF.world;
    // RLE unit
    const sample = new Uint8Array(400); sample.fill(3); sample[100] = 1; sample[399] = 5;
    const back = rleDecode(rleEncode(sample), 400);
    CF.assert(r, 'save.rle-unit', back.every((v, i) => v === sample[i]));
    // world edit + tower, save, reload
    W.ensureAround(8, 8, 3);
    for (let i = 0; i < 20 && W.stats().queue; i++) W.tick();
    const tx = 8, tz = 8, th = W.heightAt(tx, tz);
    for (let y = th + 1; y <= th + 5; y++) W.set(tx, y, tz, CF.IDOF['cobblestone']);
    W.set(tx, th + 6, tz, CF.IDOF['stone_stairs']); W.flatSet(tx, th + 6, tz, 2); // #053: meta bits must survive the roundtrip too
    CF.player.tp(8.5, th + 1, 8.5); CF.player.yaw = 1.23; CF.player.pitch = -0.33;
    for (let i = 0; i < 40; i++) W.tick(); // spread/gravity churn
    const info = saveNow();
    CF.assert(r, 'save.size(' + info.bytes + 'B)', info.bytes < 150000 && info.chunks >= 1);
    CF.world = CF.makeWorld(999999); // world with no tower, wrong seed
    CF.renderReset && CF.renderReset();
    const ok = loadNow();
    CF.assert(r, 'save.load', ok === true);
    let tower = 0;
    for (let y = th + 1; y <= th + 5; y++) if (CF.world.get(tx, y, tz) === CF.IDOF['cobblestone']) tower++;
    CF.assert(r, 'save.edits(' + tower + ')', tower === 5);
    CF.assert(r, 'save.flat(' + CF.world.get(tx, th + 6, tz) + '/' + (CF.world.flatAt ? CF.world.flatAt(tx, th + 6, tz) : 'NA') + ')',
      CF.world.get(tx, th + 6, tz) === CF.IDOF['stone_stairs'] && CF.world.flatAt(tx, th + 6, tz) === 2);
    CF.assert(r, 'save.seed', CF.world.seed === W.seed);
    CF.assert(r, 'save.player', Math.abs(CF.player.yaw - 1.23) < 1e-6 && Math.abs(CF.player.pos[1] - (th + 1)) < 0.01);
    // corrupt save -> clean fallback
    CF.autosavePaused = true;
    localStorage.setItem('cf-save-1', '{corrupt!');
    const rawDbg = (localStorage.getItem('cf-save-1') || '').slice(0, 14);
    const bad = loadNow();
    CF.assert(r, 'save.corrupt(bad=' + bad + ',raw=' + rawDbg + ',rawIn=' + loadNow._raw + ',rej=' + (loadNow._rej || 'pass') + ')',
      bad === false && !!CF.world && CF.world.heightAt(0, 0) > 0);
    localStorage.removeItem('cf-save-1');
    CF.autosavePaused = false;
    // #055 persist v2: markers in BOTH dims survive save->load; a v1 blob auto-migrates into dims.over
    {
      CF.autosavePaused = true;
      const dw0 = CF.dims, overW = CF.world, nW = dw0 && dw0.nether;
      const ox = 12, oz = 12, oy = overW.heightAt(ox, oz);
      overW.set(ox, oy, oz, CF.IDOF['stone']);
      CF.player.tp(ox + 0.5, oy + 3, oz + 5);
      let okN = false;
      if (nW) {
        const nx = 20, nz = 20;
        nW.ensureAround(nx, nz, 1);
        for (let i = 0; i < 40 && nW.stats().queue; i++) nW.tick();
        const ny = nW.heightAt(nx, nz);
        nW.set(nx, ny, nz, CF.IDOF['gold_block']);
        CF.saveNow(); CF.loadNow();
        const nw2 = CF.dims.nether;
        if (nw2) {
          nw2.ensureAround(nx, nz, 1);
          for (let i = 0; i < 40 && nw2.stats().queue; i++) nw2.tick();
          okN = nw2.get(nx, ny, nz) === CF.IDOF['gold_block'];
        }
      }
      const okOver = CF.dims.over.get(ox, oy, oz) === CF.IDOF['stone'];
      // hand-built v1 blob migrates: over-only, player/sel/time land
      const seedV1 = CF.dims.over.seed;
      localStorage.setItem('cf-save-1', JSON.stringify({ v: 1, seed: seedV1, time: 999, player: { pos: [8.5, 80, 8.5], yaw: 0.5, pitch: -0.2, sel: 4 }, chunks: {}, bes: {} }));
      const mok = CF.loadNow();
      const migOk = mok === true && CF.loadNow._migrated === true && CF.activeDim === 'over' && CF.ticks === 999 && CF.sel === 4 && Math.abs(CF.player.yaw - 0.5) < 1e-9;
      localStorage.removeItem('cf-save-1');
      CF.autosavePaused = false;
      CF.assert(r, 'save.v2(' + okOver + ',' + okN + ',mig=' + migOk + ')', okOver && okN && migOk);
    }
  };
})();
