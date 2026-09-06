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
  }

  function saveNow() {
    const w = CF.world;
    if (!w) return null;
    initEditTracking(w);
    const save = { v: 1, seed: w.seed, time: CF.ticks, player: CF.player ? {
      pos: CF.player.pos.map((v) => +v.toFixed(2)), yaw: CF.player.yaw, pitch: CF.player.pitch, sel: CF.sel } : null,
      chunks: {} };
    let bytes = 0;
    const keys = [...w.edited];
    keys.sort((a, b) => { // far chunks saved last so eviction drops them first
      const [ax, az] = a.split(',').map(Number), [bx, bz] = b.split(',').map(Number);
      return Math.hypot(bx * 16, bz * 16) - Math.hypot(ax * 16, az * 16);
    });
    for (const k of keys) {
      const c = w.chunks.get(k);
      if (!c) continue;
      const enc = rleEncode(c.arr);
      save.chunks[k] = b64e(enc);
      bytes += save.chunks[k].length;
    }
    let warn = null;
    for (;;) {
      try { localStorage.setItem(KEY, JSON.stringify(save)); break; }
      catch (e) {
        const ks = Object.keys(save.chunks);
        if (!ks.length) { warn = 'quota: nothing left'; break; }
        delete save.chunks[ks[ks.length - 1]]; // evict farthest
        warn = 'quota: evicted far edited chunk';
      }
    }
    CF.saveInfo = { bytes: JSON.stringify(save).length, chunks: Object.keys(save.chunks).length, warn };
    return CF.saveInfo;
  }

  function loadNow() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return false; }
    if (!raw) return false;
    loadNow._raw = String(raw).slice(0, 12);
    let save = null;
    try { save = JSON.parse(raw); } catch (e) { loadNow._rej = 'parse'; localStorage.removeItem(KEY); return false; }
    if (!save || save.v !== 1) { loadNow._rej = 'ver'; localStorage.removeItem(KEY); return false; }
    CF.world = CF.makeWorld(save.seed);
    CF.renderReset && CF.renderReset();
    CF.mobs && CF.mobs.clear(); // mobs are transient (persistence = backlog #044)
    if (CF.tnts) CF.tnts.length = 0; // primed TNT not persisted either
    initEditTracking(CF.world);
    for (const [k, b] of Object.entries(save.chunks || {})) {
      const [cx, cz] = k.split(',').map(Number);
      CF.world.generate(cx, cz);
      const c = CF.world.chunks.get(k);
      if (c) { c.arr.set(rleDecode(b64d(b), c.arr.length)); CF.world.edited.add(k); CF.world.dirty.add(k); }
    }
    if (save.player && CF.player) {
      CF.player.tp(...save.player.pos);
      CF.player.yaw = save.player.yaw; CF.player.pitch = save.player.pitch;
      CF.sel = save.player.sel || 0;
    }
    CF.ticks = save.time || 0;
    CF.loaded = true;
    return true;
  }

  CF.saveNow = saveNow;
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
  };
})();
