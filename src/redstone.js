// Redstone power core (#064, SPK-8 GO design): power is a DERIVED nibble - per-world cell set + full
// re-flood on any wire change (relight pattern, model A: measured 0.07-2.6ms at village scale).
// NO persistence: state lives only in placed blocks; save/load re-derives via CF.rsRescan (like light).
// v1 rules: torch = source 15 (inverter behavior -> #065 note), dust = 6-neigh BFS decay 1/hop from 15,
// consumers read CF.rsPowerAt. Wire needs solid below (pop like crop); torch = billboard cross.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const meta = (window.__TEXMETA = window.__TEXMETA || {});
  if (!meta.redstone_wire) meta.redstone_wire = { x: 160, y: 160, w: 16, h: 16, src: 'generated:redstone.js' };
  if (!meta.redstone_torch) meta.redstone_torch = { x: 0, y: 176, w: 16, h: 16, src: 'generated:redstone.js' };
  if (!meta.item_redstone) meta.item_redstone = { x: 16, y: 176, w: 16, h: 16, src: 'generated:redstone.js' };
  if (!meta.item_redstone_torch) meta.item_redstone_torch = { x: 32, y: 176, w: 16, h: 16, src: 'generated:redstone.js' };

  const K = (x, y, z) => x + ',' + y + ',' + z;
  const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const isRS = (id) => { const d = id && CF.BY_ID[id]; return !!d && (d.wire || d.rstorch); };
  function worldRS(w) { return w._rs || (w._rs = { cells: new Set(), power: new Map() }); }

  CF.rsDirty = new Set(); // worlds pending a re-flood (drained by rsTick)
  CF.rsFloods = 0; // idle-cost arbiter: must ONLY grow when wires changed

  CF.rsOnSet = (w, x, y, z) => { // called by world.set when an RS block appears/vanishes
    const rs = worldRS(w), k = K(x, y, z);
    if (isRS(w.get(x, y, z))) rs.cells.add(k);
    else { rs.cells.delete(k); rs.power.delete(k); }
    CF.rsDirty.add(w);
  };
  CF.rsFlood = (w) => { // SPK-8 model A: clear + multi-source BFS over the cell set ONLY (idle = free)
    const rs = worldRS(w); CF.rsFloods++;
    rs.power.clear();
    if (!rs.cells.size) return;
    const qk = [], qp = [];
    for (const k of rs.cells) {
      const [x, y, z] = k.split(',').map(Number);
      if (CF.BY_ID[w.get(x, y, z)].rstorch) { rs.power.set(k, 15); qk.push(k); qp.push(15); }
    }
    let head = 0;
    while (head < qk.length) {
      const k = qk[head], p = qp[head]; head++;
      const [x, y, z] = k.split(',').map(Number);
      for (const [dx, dy, dz] of DIRS) {
        const nk = K(x + dx, y + dy, z + dz);
        if (!rs.cells.has(nk)) continue;
        const [nx, ny, nz] = nk.split(',').map(Number);
        const ndef = CF.BY_ID[w.get(nx, ny, nz)];
        if (!ndef || ndef.rstorch) continue; // torches are independent sources, never fed through
        const np = p - 1;
        if (np > (rs.power.get(nk) || 0)) { rs.power.set(nk, np); qk.push(nk); qp.push(np); }
      }
    }
  };
  CF.rsTick = () => {
    if (!CF.rsDirty.size) return; // idle path: zero work, zero allocation (#064 perf AC)
    let b = 2;
    for (const w of CF.rsDirty) { if (b-- <= 0) break; CF.rsDirty.delete(w); CF.rsFlood(w); }
  };
  CF.rsPowerAt = (x, y, z) => { const rs = CF.world && CF.world._rs; return (rs && rs.power.get(K(x, y, z))) || 0; };
  CF.rsRescan = (w) => { // rebuild cell set from chunks after load (power is NEVER persisted)
    const rs = worldRS(w); rs.cells.clear(); rs.power.clear();
    const ids = new Set();
    for (const id of [CF.IDOF['redstone_wire'], CF.IDOF['redstone_torch']]) if (id) ids.add(id);
    for (const c of w.chunks.values()) {
      let hit = false;
      for (let i = 0; i < c.arr.length; i++) if (ids.has(c.arr[i])) { hit = true;
        const i0 = i, y = (i0 / (16 * 16)) | 0, z = ((i0 / 16) | 0) % 16, x = i0 % 16;
        rs.cells.add(K(c.cx * 16 + x, y, c.cz * 16 + z)); }
      if (hit) CF.rsDirty.add(w);
    }
  };

  // ---- test suite ----
  CF.redstoneTests = async (r) => {
    const ID = CF.IDOF;
    let W = CF.world; // save.v2-style loadNow swaps instances - re-capture below the derive test
    const ax = 280, az = 280; // fresh arena (#061 prelude keeps (8,8) clean)
    W.ensureAround(ax, az, 1);
    for (let i = 0; i < 20 && W.stats().queue; i++) W.tick();
    const h = W.heightAt(ax, az);
    for (let z = az - 1; z <= az + 1; z++) for (let x = ax - 1; x <= ax + 11; x++) { W.set(x, h, z, ID['stone']); for (let y = h + 1; y <= h + 3; y++) W.set(x, y, z, 0); }
    // flood: torch -> 10 dust line: decay per hop; remove/re-place a link; idle must not flood
    W.set(ax, h + 1, az, ID['redstone_torch']);
    for (let i = 1; i <= 10; i++) W.set(ax + i, h + 1, az, ID['redstone_wire']);
    CF.rsTick(); CF.rsTick();
    const pT = CF.rsPowerAt(ax, h + 1, az), p1 = CF.rsPowerAt(ax + 1, h + 1, az), p10 = CF.rsPowerAt(ax + 10, h + 1, az);
    W.set(ax + 10, h + 1, az, 0); CF.rsTick(); CF.rsTick(); // cut the line's far end
    const p9 = CF.rsPowerAt(ax + 9, h + 1, az), p10b = CF.rsPowerAt(ax + 10, h + 1, az);
    W.set(ax + 10, h + 1, az, ID['redstone_wire']); CF.rsTick(); CF.rsTick();
    const p10c = CF.rsPowerAt(ax + 10, h + 1, az);
    const f0 = CF.rsFloods;
    for (let i = 0; i < 50; i++) { W.set(ax + 20, h + 1, az + 20, i % 2 ? ID['stone'] : 0); } // NON-rs edits
    for (let i = 0; i < 20; i++) CF.rsTick();
    const idleOk = CF.rsFloods === f0;
    W.set(ax + 20, h + 1, az + 20, 0);
    // remove the torch: whole line dies (power is derived, never stored)
    W.set(ax, h + 1, az, 0); CF.rsTick(); CF.rsTick();
    const dead = CF.rsPowerAt(ax + 5, h + 1, az);
    CF.assert(r, 'world.redstone-flood(t=' + pT + ',d1=' + p1 + ',d10=' + p10 + ',cut=' + p9 + '/' + p10b + '/' + p10c + ',idle=' + idleOk + ',dead=' + dead + ')',
      pT === 15 && p1 === 14 && p10 === 5 && p9 === 6 && p10b === 0 && p10c === 5 && idleOk && dead === 0);
    for (let i = 1; i <= 10; i++) W.set(ax + i, h + 1, az, 0); // tidy the line - later tests reuse the row
    CF.rsTick(); CF.rsTick();
    // wire pop rule: support removed below a dust -> drops like cross-blocks
    W.set(ax + 2, h + 1, az, ID['redstone_wire']);
    CF.drops.length = 0;
    W.set(ax + 2, h, az, 0); // stone out from under it
    CF.rsTick(); CF.rsTick();
    const popped = W.get(ax + 2, h + 1, az) === 0 && CF.drops.some((d) => d.name === 'redstone');
    W.set(ax + 2, h, az, ID['stone']);
    // redstone_ore vein density (own instance - no global disturbance)
    const N = CF.makeWorld(5);
    for (let cx = 0; cx <= 2; cx++) for (let cz = 0; cz <= 2; cz++) N.generate(cx, cz);
    let ore = 0;
    for (let x = 0; x < 48; x++) for (let z = 0; z < 48; z++) for (let y = 1; y < 16; y++) if (N.get(x, y, z) === ID['redstone_ore']) ore++;
    CF.assert(r, 'world.redstone-ore(veins=' + ore + ',pop=' + popped + ')', ore > 0 && popped);
    // save round-trip: power RE-DERIVES (never persisted)
    if (CF.saveNow && CF.loadNow) {
      CF.autosavePaused = true;
      W.set(ax + 4, h + 1, az, ID['redstone_torch']);
      W.set(ax + 5, h + 1, az, ID['redstone_wire']);
      CF.rsTick(); CF.rsTick();
      const before = CF.rsPowerAt(ax + 5, h + 1, az);
      const blob = JSON.stringify((function () { CF.saveNow(); try { return JSON.parse(localStorage.getItem('cf-save-1')); } catch (e) { return {}; } })());
      CF.loadNow(); // CF.world swaps to a rehydrated instance - power must RE-DERIVE there (rescan hook)
      CF.rsTick(); CF.rsTick();
      const after = CF.rsPowerAt(ax + 5, h + 1, az);
      const noPower = !/"power"/.test(blob);
      localStorage.removeItem('cf-save-1');
      CF.autosavePaused = false;
      CF.assert(r, 'save.redstone-derive(' + before + '->' + after + ',bytesClean=' + noPower + ')', before === 14 && after === 14 && noPower);
      W = CF.world; // post-load instance for everything below
    }
    // --- interact.redstone-place: dust refuses air-floor, accepts solid floor; torch places (cross) ---
    {
      const invSave = CF.inv.map((s) => (s ? { name: s.name, count: s.count } : null)), selSave = CF.sel;
      CF.inv.fill(null); CF.sel = 0; CF.give('redstone_wire', 8);
      const rej = CF.place({ x: ax + 8, y: h + 1, z: az, face: [0, 1, 0] }) === false && !W.get(ax + 8, h + 2, az); // hit the (air) cell at h+1 -> target h+2 has air below = refuse
      const onFloor = CF.place({ x: ax + 8, y: h, z: az, face: [0, 1, 0] }) !== false && W.get(ax + 8, h + 1, az) === ID['redstone_wire']; // click the stone floor -> dust at h+1
      CF.inv.fill(null); CF.give('redstone_torch', 2);
      const torch = CF.place({ x: ax + 3, y: h, z: az, face: [0, 1, 0] }) !== false && W.get(ax + 3, h + 1, az) === ID['redstone_torch'];
      W.set(ax + 8, h + 1, az, 0); W.set(ax + 3, h + 1, az, 0);
      CF.inv.fill(null); for (const s of invSave) if (s) CF.give(s.name, s.count); CF.sel = selSave; CF.uiRefresh && CF.uiRefresh();
      CF.assert(r, 'interact.redstone-place(rej=' + rej + ',floor=' + onFloor + ',torch=' + torch + ')', rej && onFloor && torch);
    }
    // --- items.redstone-craft: dust over stick -> 1 redstone torch ---
    {
      const invSave2 = CF.inv.map((s) => (s ? { name: s.name, count: s.count } : null));
      CF.inv.fill(null);
      CF.inv[21] = { name: 'redstone', count: 1 }; CF.inv[24] = { name: 'stick', count: 1 };
      const res = CF.craftOnce([20, 21, 22, 23, 24, 25, 26, 27, 28]);
      CF.assert(r, 'items.redstone-craft(' + CF.countItem('redstone_torch') + ',' + (res && res.name) + ')', CF.countItem('redstone_torch') === 1 && res && res.name === 'redstone_torch' && CF.countItem('redstone') === 0);
      CF.inv.fill(null); for (const s of invSave2) if (s) CF.give(s.name, s.count); CF.uiRefresh && CF.uiRefresh(); // leave the world's kit as found (ui.icon-live eats slot 0 downstream!)
    }
    // --- items.redstone-smelt: ore + coal -> dust (200t) ---
    {
      CF.furnacePlace(3, h + 1, 3);
      const f = CF.blockEntities['3,' + (h + 1) + ',3'];
      f.input = { name: 'redstone_ore', count: 1 }; f.fuel = { name: 'coal', count: 1 };
      for (let i = 0; i < 202; i++) CF.furnaceTick();
      CF.assert(r, 'items.redstone-smelt(' + (f.out && f.out.name + f.out.count) + ')', f.out && f.out.name === 'redstone' && f.out.count === 1);
      delete CF.blockEntities['3,' + (h + 1) + ',3'];
      W.set(3, h + 1, 3, 0);
    }
    // --- registry.redstone: fields + item wiring ---
    CF.assert(r, 'registry.redstone', (() => {
      const dw = CF.REGISTRY.redstone_wire.variants.default, dt = CF.REGISTRY.redstone_torch.variants.default,
        dor = CF.REGISTRY.redstone_ore.variants.default;
      return dw.wire === true && dw.solid === false && dw.drop === 'redstone' && dt.cross === true && dt.rstorch === true &&
        dor.tool === 'pickaxe' && dor.minTier === 3 && dor.drop === 'redstone' && dor.functional === true &&
        (window.__TEXMETA || {}).redstone_wire && (window.__TEXMETA || {}).redstone_torch &&
        CF.ITEMS.redstone.tile === 'item_redstone' && /^blender:/.test(((window.__TEXMETA || {}).redstone_ore || {}).src || '');
    })());
    // cleanup arena on the CURRENT world (loadNow may have swapped instances)
    const Wc = CF.world;
    for (let x = ax - 1; x <= ax + 21; x++) for (let z = az - 1; z <= az + 21; z++) if (isRS(Wc.get(x, h + 1, z))) Wc.set(x, h + 1, z, 0);
    CF.rsTick(); CF.rsTick();
  };
})();
