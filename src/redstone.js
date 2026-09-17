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
  if (!meta.repeater) meta.repeater = { x: 48, y: 176, w: 16, h: 16, src: 'generated:redstone.js' };

  const K = (x, y, z) => x + ',' + y + ',' + z;
  const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const isRS = (id) => { const d = id && CF.BY_ID[id]; return !!d && (d.wire || d.rstorch || d.repeater); };
  const RTYPE = (w, x, y, z) => { const d = CF.BY_ID[w.get(x, y, z)]; return d ? (d.wire ? 'w' : d.rstorch ? 't' : d.repeater ? 'r' : 0) : 0; };
  // torch attach vectors from the saved face-code (#105 plumbing): 1 floor 2 -X 6 +X 4 -Z 8 +Z
  const SUPV = { 1: [0, -1, 0], 2: [-1, 0, 0], 6: [1, 0, 0], 4: [0, 0, -1], 8: [0, 0, 1] };
  const RDIRV = [[1, 0], [-1, 0], [0, 1], [0, -1]]; // repeater facing: 0E 1W 2S 3N (CF.dirFromYaw, bed precedent)
  function worldRS(w) { return w._rs || (w._rs = { cells: new Set(), power: new Map(), on: new Map(), pend: new Set() }); }

  CF.rsDirty = new Set(); // worlds pending a re-flood (drained by rsTick)
  CF.rsFloods = 0; // idle-cost arbiter: must ONLY grow when wires changed

  CF.rsOnSet = (w, x, y, z) => { // called by world.set when an RS block appears/vanishes
    const rs = worldRS(w), k = K(x, y, z);
    if (isRS(w.get(x, y, z))) rs.cells.add(k);
    else { rs.cells.delete(k); rs.power.delete(k); }
    CF.rsDirty.add(w);
  };
  CF.rsDue = []; // [{w,k,due}] repeater switch-ons, fReady-style (1.12 repeater = 2 game-tick delay)

  // is the PLAIN block at (x,y,z) externally powered? (powered dust touching it, or a live repeater facing it)
  function blockPowered(w, rs, power, x, y, z) {
    for (const [dx, dy, dz] of DIRS) {
      const t = RTYPE(w, x + dx, y + dy, z + dz);
      if (t === 'w' && (power.get(K(x + dx, y + dy, z + dz)) || 0) > 0) return true;
      if (t === 'r' && rs.on.has(K(x + dx, y + dy, z + dz))) {
        const [ddx, ddz] = RDIRV[(w.flatAt(x + dx, y + dy, z + dz) || 0) & 3];
        if (x + dx + ddx === x && z + dz + ddz === z) return true; // its output faces this block
      }
    }
    return false;
  }
  // SPK-8 model A + #065: pass-fixed-point (Jacobi - inverters/repeater-chains converge; cap 6).
  // Torch = source unless attach-block externally powered (inverter). Repeater = 15 source into its
  // output cell only, ON >=2 ticks after its input lights (rsDue). Dust decays 1/hop; nothing is stored.
  CF.rsFlood = (w) => {
    const rs = worldRS(w); CF.rsFloods++;
    if (!rs.cells.size) { rs.power.clear(); return; }
    let prev = new Map();
    for (let pass = 0; pass < 6; pass++) {
      const pm = new Map();
      const inj = [];
      for (const k of rs.cells) {
        const [x, y, z] = k.split(',').map(Number);
        const t = RTYPE(w, x, y, z);
        if (t === 't') { // attach block = torch cell + support vector (SUPV = torch->support, world.js pop precedent)
          const vec = SUPV[(w.flatAt(x, y, z) || 0) & 15] || SUPV[1];
          if (!blockPowered(w, rs, prev, x + vec[0], y + vec[1], z + vec[2])) { pm.set(k, 15); inj.push([k, 15]); }
        } else if (t === 'r') { // flat bits 0-3 = OUTPUT direction (input = cell behind). Passes are PURE
          if (rs.on.has(k)) { pm.set(k, 15); inj.push([k, 15]); } // only elapsed (on) repeaters conduct; bookkeeping runs after stability
        }
      }
      // spread dust from injections (torch/repeater cells inject; only wires conduct onward)
      const qk = inj.map((a) => a[0]), qp = inj.map((a) => a[1]);
      for (let head = 0; head < qk.length; head++) {
        const p = qp[head];
        if (p <= 1) continue;
        const [x, y, z] = qk[head].split(',').map(Number);
        const st = RTYPE(w, x, y, z); // DIODE: a repeater injects ONLY into its output cell (never backward)
        let outs = DIRS;
        if (st === 'r') { const [odx, odz] = RDIRV[(w.flatAt(x, y, z) || 0) & 3]; outs = [[odx, 0, odz]]; }
        for (const [dx, dy, dz] of outs) {
          if (RTYPE(w, x + dx, y + dy, z + dz) !== 'w') continue;
          const nk = K(x + dx, y + dy, z + dz);
          if (!rs.cells.has(nk)) continue;
          const np = p - 1;
          if (np > (pm.get(nk) || 0)) { pm.set(nk, np); qk.push(nk); qp.push(np); }
        }
      }
      let same = pm.size === prev.size;
      if (same) for (const [k, v] of pm) if (prev.get(k) !== v) { same = false; break; }
      prev = pm;
      if (same) break;
    }
    rs.power = prev;
    // #065 post-sweep (on the STABLE power map): schedule switch-ons (+2gt via rsDue), drop off-staters.
    for (const k of rs.cells) {
      const [x, y, z] = k.split(',').map(Number);
      if (RTYPE(w, x, y, z) !== 'r') continue;
      const [ddx, ddz] = RDIRV[(w.flatAt(x, y, z) || 0) & 3];
      if ((rs.power.get(K(x - ddx, y, z - ddz)) || 0) > 0) {
        if (!rs.on.has(k) && !rs.pend.has(k)) { rs.pend.add(k); CF.rsDue.push({ w, k, due: (CF.ticks || 0) + 2 }); }
      } else { rs.on.delete(k); rs.pend.delete(k); } // signal gone = off INSTANTLY (1.12 repeater off is immediate)
    }
  };
  CF.rsTick = () => {
    const now = CF.ticks || 0; // fire due repeater switch-ons (fReady precedent) BEFORE draining
    for (let i = CF.rsDue.length - 1; i >= 0; i--) {
      if (CF.rsDue[i].due <= now) {
        const d = CF.rsDue.splice(i, 1)[0], rs = worldRS(d.w);
        if (rs.pend.delete(d.k)) rs.on.set(d.k, now); // input may have vanished meanwhile - then stay off
        CF.rsDirty.add(d.w);
      }
    }
    if (!CF.rsDirty.size) return; // idle path: zero work, zero allocation (#064 perf AC)
    let b = 2;
    for (const w of CF.rsDirty) { if (b-- <= 0) break; CF.rsDirty.delete(w); CF.rsFlood(w); }
  };
  CF.rsPowerAt = (x, y, z) => { const rs = CF.world && CF.world._rs; return (rs && rs.power.get(K(x, y, z))) || 0; };
  CF.rsRescan = (w) => { // rebuild cell set from chunks after load (power/on-state is NEVER persisted)
    const rs = worldRS(w); rs.cells.clear(); rs.power.clear(); rs.on.clear(); rs.pend.clear();
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
    // --- #065 repeater: 2-tick delay, boost to 14-after, one-way diode ---
    {
      const H = h + 1;
      for (let i = 0; i <= 9; i++) W.set(ax + i, H - 1, az, ID['stone']); // level the floor (grass heightAt wobble)
      for (let i = 0; i <= 9; i++) { W.set(ax + i, H, az, 0); W.set(ax + i, H + 1, az, 0); }
      W.set(ax, H, az, ID['redstone_torch']); W.flatSet(ax, H, az, 1);
      W.set(ax + 1, H, az, ID['redstone_wire']); W.set(ax + 2, H, az, ID['redstone_wire']);
      W.set(ax + 3, H, az, ID['repeater']); W.flatSet(ax + 3, H, az, 0); // OUTPUT +X (input = west neighbor)
      for (let i = 4; i <= 6; i++) W.set(ax + i, H, az, ID['redstone_wire']);
      CF.rsTick(); CF.rsTick(); // flood pass 1: repeater sees input, schedules due (NOT yet on)
      const preOn = CF.rsPowerAt(ax + 4, H, az), dIn = CF.rsPowerAt(ax + 2, H, az);
      CF.ticks += 2; CF.rsTick(); // delay fires (1.12: 2 game ticks)
      const postOn = CF.rsPowerAt(ax + 4, H, az), postFar = CF.rsPowerAt(ax + 6, H, az);
      // one-way: torch on the OUTPUT side must not feed back to the input side
      W.set(ax + 6, H, az, 0); W.set(ax + 5, H, az, 0); W.set(ax + 4, H, az, 0);
      W.set(ax + 5, H, az, ID['redstone_torch']); W.flatSet(ax + 5, H, az, 1);
      CF.rsTick(); CF.rsTick(); CF.ticks += 2; CF.rsTick();
      const back = CF.rsPowerAt(ax + 2, H, az); // input-side dust: only lit by T0 (13), NOT re-lit at 14 by the reverse torch
      const diodeOk = back === 13;
      CF.assert(r, 'world.repeater-delay(in=' + dIn + ',pre=' + preOn + ',post=' + postOn + ',far=' + postFar + ',diode=' + back + ')',
        dIn === 13 && preOn === 0 && postOn === 14 && postFar === 12 && diodeOk);
      // BOOST proof: torch->dust,dust reaches the repeater input at 13; the cell AFTER the repeater is 14 again
      // (raw line would cap at 13 forever) + one more hop at 12 - the re-amplify is what a repeater IS.
      CF.assert(r, 'world.repeater-boost(postOn=' + postOn + ',postFar=' + postFar + ')', postOn === 14 && postFar === 12);
      for (let i = 0; i <= 9; i++) { W.set(ax + i, H, az, 0); W.set(ax + i, H + 1, az, 0); }
    }
    // --- #065 torch inverter: side-attached torch dies while its attach block carries dust-on-top power ---
    {
      const H = h + 1;
      for (let i = 0; i <= 8; i++) W.set(ax + i, H - 1, az, ID['stone']);
      for (let i = 0; i <= 8; i++) { W.set(ax + i, H, az, i >= 1 && i <= 7 ? ID['stone'] : 0); W.set(ax + i, H + 1, az, 0); W.set(ax + i, H + 2, az, 0); }
      W.set(ax + 1, H, az, 0); W.set(ax + 1, H, az, ID['redstone_torch']); W.flatSet(ax + 1, H, az, 6); // torch at i1, attach = i2 (vec +X)
      W.set(ax, H, az, ID['redstone_wire']); // the inverter's OUTPUT dust (west of torch)
      W.set(ax + 2, H + 1, az, ID['redstone_wire']); // INPUT dust on top of attach block C=i2
      for (let i = 3; i <= 6; i++) W.set(ax + i, H + 1, az, ID['redstone_wire']); // chain on top of platform row (i3..i7 stone)
      W.set(ax + 7, H + 1, az, ID['redstone_torch']); W.flatSet(ax + 7, H + 1, az, 1); // source powering the chain
      CF.rsTick(); CF.rsTick();
      const offOut = CF.rsPowerAt(ax, H, az), chain = CF.rsPowerAt(ax + 2, H + 1, az); // torch DEAD: output 0, input chain lit
      W.set(ax + 2, H + 1, az, 0); // cut the input at C's top face (chain i3..i6 stays lit but no longer touches C)
      CF.rsTick(); CF.rsTick();
      const onOut = CF.rsPowerAt(ax, H, az); // torch ALIVE: output dust lights at 14
      for (let i = 0; i <= 8; i++) { W.set(ax + i, H, az, 0); W.set(ax + i, H + 1, az, 0); }
      CF.assert(r, 'interact.redstone-invert(off=' + offOut + ',chain=' + chain + ',on=' + onOut + ')', offOut === 0 && chain > 0 && onOut === 14);
    }
    // --- #065 interact.repeater-facing: placement stores away-from-player output + floor rule ---
    {
      const invSave3 = CF.inv.map((s) => (s ? { name: s.name, count: s.count } : null)), selSave3 = CF.sel;
      const H = h + 1;
      W.set(ax, H - 1, az, ID['stone']); W.set(ax, H, az, 0); W.set(ax + 1, H, az, 0);
      CF.inv.fill(null); CF.sel = 0; CF.give('repeater', 2);
      CF.player.yaw = Math.PI / 2; // facing +X -> stored output = away = 1 (-X)
      const placed = CF.place({ x: ax, y: H - 1, z: az, face: [0, 1, 0] }) !== false && W.get(ax, H, az) === ID['repeater'];
      const dir = W.flatAt(ax, H, az) & 3;
      const noFloor = CF.place({ x: ax + 1, y: H + 1, z: az, face: [0, 1, 0] }) === false && !W.get(ax + 1, H + 2, az); // target has air below
      W.set(ax, H, az, 0); W.set(ax, H - 1, az, ID['stone']);
      CF.inv.fill(null); for (const s of invSave3) if (s) CF.give(s.name, s.count); CF.sel = selSave3; CF.uiRefresh && CF.uiRefresh();
      CF.assert(r, 'interact.repeater-facing(placed=' + placed + ',dir=' + dir + ',noFloor=' + noFloor + ')', placed && dir === 1 && noFloor);
    }
    // --- #065 items.repeater-craft (wiki: dust+torch+dust over two stone slabs) ---
    {
      const invSave4 = CF.inv.map((s) => (s ? { name: s.name, count: s.count } : null));
      CF.inv.fill(null);
      CF.inv[20] = { name: 'redstone', count: 1 }; CF.inv[21] = { name: 'redstone_torch', count: 1 }; CF.inv[22] = { name: 'redstone', count: 1 };
      CF.inv[23] = { name: 'stone_slab:stone', count: 1 }; CF.inv[25] = { name: 'stone_slab:stone', count: 1 };
      const res = CF.craftOnce([20, 21, 22, 23, 24, 25, 26, 27, 28]);
      CF.assert(r, 'items.repeater-craft(' + CF.countItem('repeater') + ',' + (res && res.name) + ')', CF.countItem('repeater') === 1 && res && res.name === 'repeater');
      CF.inv.fill(null); for (const s of invSave4) if (s) CF.give(s.name, s.count); CF.uiRefresh && CF.uiRefresh();
    }
    // cleanup arena on the CURRENT world (loadNow may have swapped instances)
    const Wc = CF.world;
    for (let x = ax - 2; x <= ax + 21; x++) for (let z = az - 1; z <= az + 21; z++) for (const yy of [h + 1, h + 2, h + 3]) if (Wc.get(x, yy, z) && isRS(Wc.get(x, yy, z))) Wc.set(x, yy, z, 0);
    for (let x = ax - 2; x <= ax + 12; x++) for (const yy of [h + 1, h + 2]) if (Wc.get(x, yy, az) === ID['stone'] || Wc.get(x, yy, az) === ID['dirt']) Wc.set(x, yy, az, 0);
    CF.rsTick(); CF.rsTick();
  };
})();
