// Interaction: DDA raycast, hold-to-break with 1.12 break-time formula + tier gate,
// place with player-overlap rule, hotbar selection, drops queue.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const HAND_TIER = 0, HAND_SPEED = 1; // tool system comes later; hand for now

  CF.hotbar = ['grass', 'dirt', 'stone', 'cobblestone', 'planks', 'log', 'leaves', 'glowstone', 'glass'];
  CF.sel = 0;
  CF.drops = [];

  CF.hotId = () => {
    const h = CF.held && CF.held();
    if (!h) return 0;
    if (CF.PLANTABLE && CF.PLANTABLE[h]) { const r2 = CF.REGISTRY[CF.PLANTABLE[h]]; return r2 ? r2.variants[Object.keys(r2.variants)[0]].id : 0; } // #054: wheat_seeds plants the wheat block
    if (h.indexOf(':') > 0) { // #052: variant items ('stone_slab:cobblestone')
      const p2 = h.split(':');
      const r2 = CF.REGISTRY[p2[0]];
      if (r2 && r2.variants[p2[1]]) return r2.variants[p2[1]].id;
      return 0;
    }
    const reg = CF.REGISTRY[h];
    if (!reg) return 0;
    const k = Object.keys(reg.variants)[0];
    return reg.variants[k].id;
  };

  function raycast(o, d, maxD) {
    let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2]);
    const sx = d[0] > 0 ? 1 : -1, sy = d[1] > 0 ? 1 : -1, sz = d[2] > 0 ? 1 : -1;
    const dx = Math.abs(1 / (d[0] || 1e-9)), dy = Math.abs(1 / (d[1] || 1e-9)), dz = Math.abs(1 / (d[2] || 1e-9));
    let tx = ((sx > 0 ? x + 1 - o[0] : o[0] - x)) * dx;
    let ty = ((sy > 0 ? y + 1 - o[1] : o[1] - y)) * dy;
    let tz = ((sz > 0 ? z + 1 - o[2] : o[2] - z)) * dz;
    let t = 0, face = [0, 0, 0];
    for (let i = 0; i < 120; i++) {
      if (CF.solidAt(CF.world.get(x, y, z))) return { x, y, z, face };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += dx; face = [-sx, 0, 0]; }
      else if (ty < tz) { y += sy; t = ty; ty += dy; face = [0, -sy, 0]; }
      else { z += sz; t = tz; tz += dz; face = [0, 0, -sz]; }
      if (t > maxD) return null;
    }
    return null;
  }
  CF.raycast = raycast;

  CF.aim = () => {
    const p = CF.player;
    if (!p) return null;
    const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw), cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
    return raycast([p.pos[0], p.pos[1] - 0.9 + 1.62, p.pos[2]], [sy * cp, sp, cy * cp], 5);
  };

  function breakTime(id) {
    const v = CF.BY_ID[id];
    if (!v) return Infinity;
    return CF.breakTimeFor ? CF.breakTimeFor(v, CF.held && CF.held()) : (v.hardness < 0 ? Infinity : v.hardness * 5);
  }
  CF.breakTime = breakTime;

  CF.mining = null; // {x,y,z,progress,need}
  CF.mineStart = (hit) => {
    if (!hit) { CF.mining = null; return; }
    const id = CF.world.get(hit.x, hit.y, hit.z);
    CF.mining = { x: hit.x, y: hit.y, z: hit.z, progress: 0, need: breakTime(id) };
  };
  CF.mineTick = (dt) => {
    const m = CF.mining;
    if (!m) return null;
    if (!isFinite(m.need)) return null; // bedrock: unbreakable
    const id = CF.world.get(m.x, m.y, m.z);
    if (!id) { CF.mining = null; return null; }
    m.progress += dt;
    if (m.progress >= m.need) {
      const v = CF.BY_ID[id];
      const heldName = CF.held && CF.held();
      const tierOk = CF.canHarvest ? CF.canHarvest(v, heldName) : (HAND_TIER >= v.minTier || !v.tool);
      let dropName = v.drop;
      let dropN = v.dropN || 1; // #052: double slab yields 2; #051 dropN; (#053: stairs bit4 = upside, NOT double!)
      if (v.boxes && !v.stairs && CF.world.flatAt && (CF.world.flatAt(m.x, m.y, m.z) & 4)) dropN = 2; // 1.12: double slab -> 2 slabs
      if (v.name === 'gravel' && dropName && Math.random() < 0.1) dropName = 'flint'; // 1.12: 10% flint
      if (v.name === 'leaves') { // 1.12: oak leaves 5% sapling, 0.5% apple, else nothing (#019)
        const lr = Math.random();
        dropName = lr < 0.05 ? (v.variant === 'oak' ? 'sapling' : 'sapling:' + v.variant) : lr < 0.055 && v.variant === 'oak' ? 'apple' : null; // #049 species saplings; apples oak-only (1.12)
      }
      let cropDrops = null; // #054: crops harvest by stage (1.12). Wheat: 1-3 grain + 1-2 seeds; carrot/potato 2-4; immature -> the seed/item back
      if (v.crop) {
        const st = CF.world.flatAt ? CF.world.flatAt(m.x, m.y, m.z) & 7 : 0;
        const R = (k) => Math.floor(Math.random() * k);
        cropDrops = st >= (v.maxStage || 7)
          ? (v.name === 'wheat'
            ? [{ name: 'wheat', n: 1 + R(3) }, { name: 'wheat_seeds', n: 1 + R(2) }]
            : [{ name: v.name, n: 2 + R(3) }]) // poisonous_potato 2% chance deferred to #048
          : [{ name: v.name === 'wheat' ? 'wheat_seeds' : v.name, n: 1 }];
        for (const d of cropDrops) { d.x = m.x + 0.5; d.y = m.y + 0.5; d.z = m.z + 0.5; }
      }
      const drops = tierOk ? (cropDrops || (dropName ? [{ name: dropName, n: dropN, x: m.x + 0.5, y: m.y + 0.5, z: m.z + 0.5 }] : [])) : [];
      if (v.name === 'furnace' && CF.furnaceBreak) CF.furnaceBreak(m.x, m.y, m.z); // #032: contents to player
      if (v.name === 'chest' && CF.chestBreak) CF.chestBreak(m.x, m.y, m.z); // #040: contents to player
      if (v.name === 'bed' && CF.bedBreak) CF.bedBreak(m.x, m.y, m.z); // #041: both halves
      CF.world.set(m.x, m.y, m.z, 0);
      for (const d of drops) CF.give ? CF.give(d.name, d.n) : 0;
      CF.drops.push(...drops);
      CF.mining = null;
      return { broke: [m.x, m.y, m.z], drops, noDrop: !tierOk };
    }
    return { progress: m.progress / m.need };
  };

  CF.cellHitsPlayer = (tx, ty, tz) => { // #043 shared placement rule (place + bucket)
    const p = CF.player;
    const ox = Math.abs(p.pos[0] - (tx + 0.5)) < 0.3 + 0.5 && Math.abs(p.pos[2] - (tz + 0.5)) < 0.3 + 0.5;
    const oy = p.pos[1] - 0.9 < ty + 1 && p.pos[1] + 0.9 > ty;
    return ox && oy;
  };

  // #060 item entities: Q drops the held item as a pickup-able billboard (1.12 throw + magnet pickup).
  CF.itemEnts = [];
  CF.PLANTABLE = { wheat_seeds: 'wheat', carrot: 'carrot', potato: 'potato' }; // #054 (1.12: carrot/potato plant themselves)
  CF.dropHeld = () => {
    const s = CF.inv[CF.sel];
    if (!s || (CF.ui && CF.ui.open)) return false;
    const name = s.name;
    s.count--; if (s.count <= 0) CF.inv[CF.sel] = null;
    const P = CF.player, cy = Math.cos(P.yaw), sy = Math.sin(P.yaw);
    CF.itemEnts.push({ name, n: 1, x: P.pos[0] + cy * 0.45, y: P.pos[1] + 0.6, z: P.pos[2] + sy * 0.45,
      vx: cy * 4, vy: 2.5, vz: sy * 4, age: 0, ph: Math.random() * 6.28 });
    if (CF.itemEnts.length > 200) CF.itemEnts.splice(0, CF.itemEnts.length - 200);
    CF.uiRefresh && CF.uiRefresh();
    return true;
  };
  CF.itemTick = () => {
    const P = CF.player, W = CF.world, dt = 0.05;
    for (let i = CF.itemEnts.length - 1; i >= 0; i--) {
      const it = CF.itemEnts[i];
      if (++it.age > 6000) { CF.itemEnts.splice(i, 1); continue; } // 5-min despawn (1.12)
      it.vy = Math.max(-20, it.vy - 32 * dt); // terminal velocity: never faster than 1 cell/tick (no tunnelling)
      const nx = it.x + it.vx * dt, nz = it.z + it.vz * dt, ny = it.y + it.vy * dt;
      const hw = 0.12;
      if (CF.solidSpanXZ(ny - 0.12, ny + 0.12, nx, hw, it.z)) { it.vx = 0; } else it.x = nx;
      if (CF.solidSpanXZ(ny - 0.12, ny + 0.12, it.x, hw, nz)) { it.vz = 0; } else it.z = nz;
      if (CF.solidSpanXZ(ny - 0.12, ny + 0.12, it.x, hw, it.z)) { // vertical collision: rest on box top or bounce off ceiling
        if (it.vy < 0) {
          let top = -Infinity;
          for (let sx = Math.floor(it.x - hw); sx <= Math.floor(it.x + hw); sx++)
            for (let sz = Math.floor(it.z - hw); sz <= Math.floor(it.z + hw); sz++)
              for (let sy2 = Math.floor(ny) - 1; sy2 <= Math.floor(ny) + 1; sy2++) {
                const sp = CF.cellTopAt(sx, sy2, sz, it.x, hw, it.z);
                if (sp && sp[1] <= ny - 0.12 + 0.35 && sp[1] > top) top = sp[1];
              }
          it.y = (isFinite(top) ? top : Math.floor(ny - 0.12) + 0.12) + 0.001;
          it.vy = 0; it.vx *= 0.72; it.vz *= 0.72; // ground friction
        } else { it.vy = 0; }
      } else it.y = ny;
      if (it.age > 10 && P) { // pickup delay 0.5s, then magnet (1.12 ~1.0 radius; ours eye-to-item 1.6 lenient)
        const d = Math.hypot(it.x - P.pos[0], it.y - (P.pos[1] - 0.2), it.z - P.pos[2]);
        if (d < 1.6) {
          const left = CF.give(it.name, it.n);
          const took = it.n - left;
          if (took > 0) { it.n = left; CF.uiRefresh && CF.uiRefresh(); }
          if (it.n <= 0) CF.itemEnts.splice(i, 1);
        }
      }
    }
  };
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyQ' && !e.repeat) CF.dropHeld && CF.dropHeld(); });

  // #054 hoe: RMB on grass/dirt with empty cell above tills farmland (1.12; durability ignored Tier-1 like buckets)
  CF.useHoe = (hit) => {
    if (!hit) return false;
    const heldName = CF.held && CF.held();
    const def = heldName && CF.itemDef(heldName);
    if (!def || !def.tool || def.tool.type !== 'hoe') return false;
    const id = CF.world.get(hit.x, hit.y, hit.z);
    if (id !== CF.IDOF['grass'] && id !== CF.IDOF['dirt']) return false;
    if (CF.world.get(hit.x, hit.y + 1, hit.z)) return false;
    return CF.world.set(hit.x, hit.y, hit.z, CF.IDOF['farmland']);
  };

  CF.place = (hit) => {
    if (!hit) return false;
    const p = CF.player; // #053: was never declared here - bed/stairs yaw lines threw ReferenceError (bed tests bypassed place(), latent in-game P1)
    let tx = hit.x + hit.face[0], ty = hit.y + hit.face[1], tz = hit.z + hit.face[2];
    const id = CF.hotId();
    if (!id) return false;
    const v = CF.BY_ID[id];
    // #052 slab rule: clicking the TOP FACE of an existing same single-slab upgrades it to double (1.12)
    const hid0 = CF.world.get(hit.x, hit.y, hit.z);
    if (v.boxes && !v.stairs && hit.face[1] === 1 && hid0) {
      const hv = CF.BY_ID[hid0];
      if (hv && hv === v && CF.world.flatAt && !(CF.world.flatAt(hit.x, hit.y, hit.z) & 4)) {
        CF.world.flatSet(hit.x, hit.y, hit.z, CF.world.flatAt(hit.x, hit.y, hit.z) | 4);
        if (!CF.creative && CF.consume) CF.consume(CF.held(), 1);
        return true;
      }
    }
    if (CF.world.get(tx, ty, tz)) return false;
    if (CF.cellHitsPlayer(tx, ty, tz)) return false;
    if (v.cross) {
      // MC support rule: floor face needs solid below; side faces need solid on that side
      const f = hit.face;
      const support = f[1] === 1 ? CF.solidAt(CF.world.get(hit.x, hit.y, hit.z))
        : CF.solidAt(CF.world.get(tx - f[0], ty - f[1], tz - f[2]));
      if (!support) return false;
    }
    if (v.crop) { // #054: crops only plant ON farmland (the cell below the target)
      if (CF.world.get(tx, ty - 1, tz) !== CF.IDOF['farmland']) return false;
    }
    if (v.name === 'bed' && CF.bedPlace) return CF.bedPlace(tx, ty, tz, CF.dirFromYaw(p.yaw)); // #041 2-cell, consumes itself
    const ok = CF.world.set(tx, ty, tz, id);
    if (ok && v.crop && CF.world.flatSet) CF.world.flatSet(tx, ty, tz, 0); // #054: stage 0
    if (ok && v.cross && !v.crop && CF.world.flatSet) { // #054: crops keep their stage byte; only torches get face-attach codes
      const f = hit.face;
      const code = f[1] === 1 ? 1 : f[0] === 1 ? 2 : f[0] === -1 ? 6 : f[2] === 1 ? 4 : 8;
      CF.world.flatSet(tx, ty, tz, code);
    }
    if (ok && v.stairs && CF.world.flatSet) {
      // #053 1.12 stair meta: 0E 1W 2S 3N (+ high side = player look dir = the side you climb toward);
      // clicking a BOTTOM face flips upside (bit4) like ceiling-mounted 1.12 stairs.
      CF.world.flatSet(tx, ty, tz, (CF.dirFromYaw ? CF.dirFromYaw(p.yaw) : 0) | (hit.face[1] === -1 ? 4 : 0));
    }
    if (ok && v.boxes && !v.stairs && CF.world.flatSet) {
      // #052: bottom slab onto floor face (up) = bit0-style default(0); top slab onto ceiling face (down) = bit 2
      if (hit.face[1] === -1) CF.world.flatSet(tx, ty, tz, 2);
    }
    if (ok && !CF.creative && CF.consume) CF.consume(CF.held(), 1);
    if (ok && CF.BY_ID[id].name === 'furnace' && CF.furnacePlace) CF.furnacePlace(tx, ty, tz);
    if (ok && CF.BY_ID[id].name === 'chest' && CF.chestPlace) CF.chestPlace(tx, ty, tz);
    return ok;
  };

  // input wiring (real browser)
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mousedown', (e) => {
    if (!CF.player) return;
    if (e.button === 0) CF.mineStart(CF.aim());
    if (e.button === 2) { if (!(CF.useFlintSteel && CF.useFlintSteel(CF.aim())) && !(CF.useBlock && CF.useBlock(CF.aim())) && !(CF.useBucket && CF.useBucket(CF.aim())) && !(CF.mobFeed && CF.mobFeed()) && !(CF.useHoe && CF.useHoe(CF.aim())) && !(CF.useHeld && CF.useHeld())) CF.place(CF.aim()); }
  });
  window.addEventListener('mouseup', () => { CF.mining = null; });
  window.addEventListener('wheel', (e) => { CF.sel = (CF.sel + (e.deltaY > 0 ? 1 : -1) + CF.hotbar.length) % CF.hotbar.length; CF.uiRefresh && CF.uiRefresh(); });
  window.addEventListener('keydown', (e) => { if (e.code.startsWith('Digit')) { const n = +e.code[5]; if (n >= 1 && n <= 9) { CF.sel = n - 1; CF.uiRefresh && CF.uiRefresh(); } } });

  // continuous mining from the sim tick (1.12: holding LMB continues)
  const origTick = CF.onTick;
  CF.onTick = () => {
    if (origTick) origTick();
    if (CF.mouseDown) { if (!CF.mining) CF.mineStart(CF.aim()); CF.mineTick(0.05); }
  };
  window.addEventListener('mousedown', (e) => { if (e.button === 0) CF.mouseDown = true; });
  window.addEventListener('mouseup', () => { CF.mouseDown = false; });

  CF.interactTests = async (r) => {
    const P = CF.player, IDOF = CF.IDOF;
    // place a dirt block under cursor by direct API: aim down at ground
    P.pitch = -1.4;
    const hit = CF.aim();
    CF.assert(r, 'interact.aim-hit', !!hit && CF.solidAt(CF.world.get(hit.x, hit.y, hit.z)));
    // break it: pick a floating dirt we place first
    const h = hit.y;
    CF.world.set(hit.x, h + 1, hit.z, IDOF['dirt']);
    CF.drops.length = 0;
    CF.mineStart({ x: hit.x, y: h + 1, z: hit.z });
    let broke = null, ticks = 0;
    while (ticks < 100 && !(broke && broke.broke)) { broke = CF.mineTick(0.05); ticks++; }
    CF.assert(r, 'interact.break-time(1.12 dirt=0.75s, got ' + (ticks * 0.05).toFixed(2) + ')', broke && broke.broke && Math.abs(ticks * 0.05 - 0.75) <= 0.15);
    CF.assert(r, 'interact.drop', broke.broke && broke.drops.length === 1 && broke.drops[0].name === 'dirt');
    CF.assert(r, 'interact.air', CF.world.get(hit.x, h + 1, hit.z) === 0);
    // stone by hand: 2.25*5=11.25s > 2s of mining -> not broken, no drop
    CF.world.set(hit.x, h + 1, hit.z, IDOF['stone']);
    CF.mineStart({ x: hit.x, y: h + 1, z: hit.z });
    for (let i = 0; i < 40; i++) CF.mineTick(0.05);
    CF.assert(r, 'interact.slow-tier', CF.world.get(hit.x, h + 1, hit.z) === IDOF['stone']);
    const need = CF.breakTime(IDOF['stone']);
    CF.assert(r, 'interact.slow-time(' + need + 's)', Math.abs(need - 7.5) < 0.01);
    CF.mining = null;
    // gravel flint 10% (1.12, audit #011): statistical over 240 breaks
    CF.drops.length = 0;
    let flint = 0, total = 0;
    for (let t = 0; t < 240; t++) {
      CF.world.set(hit.x, h + 1, hit.z, IDOF['gravel']);
      CF.mineStart({ x: hit.x, y: h + 1, z: hit.z });
      for (let i = 0; i < 40; i++) {
        const res = CF.mineTick(0.05);
        if (res && res.broke) { total++; flint += res.drops.some((d) => d.name === 'flint') ? 1 : 0; break; }
      }
    }
    CF.assert(r, 'interact.gravel-flint(' + flint + '/' + total + ')', total === 240 && flint > 6 && flint < 45);
    // #019 leaves: 5% sapling (+0.5% apple), else nothing — statistical over 600 breaks
    CF.drops.length = 0;
    let sap = 0, leafTot = 0;
    for (let t = 0; t < 600; t++) {
      CF.world.set(hit.x, h + 1, hit.z, IDOF['leaves']);
      CF.mineStart({ x: hit.x, y: h + 1, z: hit.z });
      for (let i = 0; i < 10; i++) {
        const res = CF.mineTick(0.05);
        if (res && res.broke) { leafTot++; sap += res.drops.some((d) => d.name === 'sapling') ? 1 : 0; break; }
      }
    }
    CF.assert(r, 'interact.leaves-drop(' + sap + '/' + leafTot + ')', leafTot === 600 && sap > 12 && sap < 55);

    // #052: clicking a bottom slab's top face with the same slab upgrades it to double; breaking a double yields 2
    {
      const h = CF.world.heightAt(66, 66) + 1;
      CF.world.ensureAround(66, 66, 1);
      for (let i = 0; i < 20 && CF.world.stats().queue; i++) CF.world.tick();
      for (let x = 64; x <= 68; x++) for (let z = 64; z <= 68; z++) for (let y = h; y < h + 5; y++) CF.world.set(x, y, z, 0);
      CF.world.set(66, h, 66, IDOF['stone_slab:cobblestone']);
      CF.world.flatSet(66, h, 66, 0);
      const invSave = CF.inv.map((s) => (s ? { name: s.name, count: s.count } : null)), selSave = CF.sel;
      CF.inv.fill(null);
      CF.inv[0] = { name: 'stone_slab:cobblestone', count: 1 }; CF.sel = 0;
      const okU = CF.place({ x: 66, y: h, z: 66, face: [0, 1, 0] }); // aim AT the slab top face -> same-cell upgrade
      const fm = CF.world.flatAt(66, h, 66);
      CF.inv[1] = { name: 'wood_pickaxe', count: 1 }; CF.sel = 1; // stone_slab needs a pickaxe to drop (1.12)
      CF.drops.length = 0;
      CF.mineStart({ x: 66, y: h, z: 66 });
      let broke = null, ticks = 0;
      while (ticks < 400 && !(broke && broke.broke)) { broke = CF.mineTick(0.05); ticks++; }
      const got = CF.drops.reduce((n, d) => n + d.n, 0);
      CF.assert(r, 'interact.slab-place-upgrade(' + okU + ',' + fm + ',got=' + got + ')',
        okU === true && (fm & 4) === 4 && got === 2);
      CF.drops.length = 0; CF.world.set(66, h, 66, 0); CF.world.flatSet(66, h, 66, 0);
      CF.inv.fill(null); for (const s of invSave) if (s) CF.give(s.name, s.count); CF.sel = selSave; CF.uiRefresh && CF.uiRefresh(); // restore hotbar (place/bedrock tests below depend on it)
    }
    // #053: stair facing follows player yaw (4 dirs), bottom-face click flips upside, breaking yields 1
    {
      const h = CF.world.heightAt(70, 70);
      CF.world.ensureAround(70, 70, 1);
      for (let i = 0; i < 20 && CF.world.stats().queue; i++) CF.world.tick();
      for (let x = 68; x <= 72; x++) for (let z = 68; z <= 72; z++) for (let y = h; y < h + 5; y++) CF.world.set(x, y, z, 0);
      const invSave = CF.inv.map((s) => (s ? { name: s.name, count: s.count } : null)), selSave = CF.sel;
      const yawSave = CF.player.yaw;
      CF.inv.fill(null);
      CF.inv[0] = { name: 'stone_stairs', count: 8 }; CF.sel = 0;
      const yaws = [Math.PI / 2, -Math.PI / 2, 0, Math.PI], want = [0, 1, 2, 3];
      const got = [];
      for (let i = 0; i < 4; i++) {
        CF.player.yaw = yaws[i];
        CF.world.flatSet(70, h, 70, 99);
        CF.place({ x: 70, y: h - 1, z: 70, face: [0, 1, 0] }); // on top of surface block, dir from yaw
        got.push(CF.world.flatAt(70, h, 70));
        CF.world.set(70, h, 70, 0);
      }
      CF.player.yaw = Math.PI / 2;
      CF.world.set(70, h + 1, 70, IDOF['stone']); // overhead block: click its BOTTOM face -> upside-down (bit4)
      CF.place({ x: 70, y: h + 1, z: 70, face: [0, -1, 0] });
      const fmUp = CF.world.flatAt(70, h, 70);
      CF.drops.length = 0;
      CF.inv[1] = { name: 'wood_pickaxe', count: 1 }; CF.sel = 1; // stone-family needs pickaxe to drop (1.12, like #052 slab test)
      CF.mineStart({ x: 70, y: h, z: 70 });
      let broke = null, ticks = 0;
      while (ticks < 400 && !(broke && broke.broke)) { broke = CF.mineTick(0.05); ticks++; }
      const gotN = CF.drops.reduce((n, d) => n + d.n, 0);
      CF.assert(r, 'interact.stairs-facing(got=' + got + ',want=' + want + ',up=' + fmUp + ',drop=' + gotN + ')',
        got.join() === want.join() && fmUp === (0 | 4) && gotN === 1);
      CF.drops.length = 0; CF.world.set(70, h, 70, 0); CF.world.set(70, h + 1, 70, 0); CF.world.flatSet(70, h, 70, 0);
      CF.inv.fill(null); for (const s of invSave) if (s) CF.give(s.name, s.count); CF.sel = selSave; CF.player.yaw = yawSave; CF.uiRefresh && CF.uiRefresh();
    }
    // #055 portal: 1.12 frame validation (+missing-corner leniency), flint&steel ignition, light 11
    {
      const px = 56, pz = 56;
      CF.world.ensureAround(px, pz, 1);
      for (let i = 0; i < 20 && CF.world.stats().queue; i++) CF.world.tick();
      const g = CF.world.heightAt(px, pz); // air row starts at g
      for (let x = px - 2; x <= px + 4; x++) for (let z = pz - 2; z <= pz + 2; z++) {
        for (let y = g; y < g + 8; y++) CF.world.set(x, y, z, 0);
        CF.world.set(x, g - 1, z, CF.IDOF['stone']);
      }
      const OBS = CF.IDOF['obsidian'], PT = CF.IDOF['portal'];
      const frame = () => {
        for (const x of [px, px + 1]) { CF.world.set(x, g - 1, pz, OBS); CF.world.set(x, g + 3, pz, OBS); }
        for (let y = g; y <= g + 2; y++) { CF.world.set(px - 1, y, pz, OBS); CF.world.set(px + 2, y, pz, OBS); }
      };
      frame();
      const invSave = CF.inv.map((s) => (s ? { name: s.name, count: s.count } : null)), selSave = CF.sel;
      CF.inv.fill(null); CF.inv[0] = { name: 'flint_and_steel', count: 1 }; CF.sel = 0;
      const invalidBefore = CF.portalTryIgnite({ x: px + 5, y: g - 1, z: pz, face: [0, 1, 0] }); // far air, no frame
      CF.world.set(px + 2, g + 1, pz, 0); // break the pillar (missing middle, not corner)
      const invalidMid = CF.portalTryIgnite({ x: px, y: g - 1, z: pz, face: [0, 1, 0] });
      CF.world.set(px + 2, g + 1, pz, OBS); // restore
      CF.world.set(px - 1, g - 1, pz, 0); CF.world.set(px + 2, g - 1, pz, 0); CF.world.set(px - 1, g + 3, pz, 0); CF.world.set(px + 2, g + 3, pz, 0); // CORNERS EMPTY: 1.12 accepts
      const ign = CF.portalTryIgnite({ x: px, y: g - 1, z: pz, face: [0, 1, 0] });
      let cells = 0;
      for (let x = px; x <= px + 1; x++) for (let y = g; y <= g + 2; y++) if (CF.world.get(x, y, pz) === PT) cells++;
      CF.world.ensureLight(px >> 4, pz >> 4);
      for (let i = 0; i < 6 && (CF.world.stats().queue || CF.world.dirty.size); i++) { CF.world.tick(); CF.renderTick(); }
      const li = CF.world.lightAt(px, g + 1, pz);
      CF.assert(r, 'interact.portal-frame(' + invalidBefore + ',' + invalidMid + ',' + ign + ',' + cells + ',li=' + li + ')',
        invalidBefore === false && invalidMid === false && ign === true && cells === 6 && (li & 15) === 11);
      // leave the lit portal standing for game.warp below
      CF.inv.fill(null); for (const s of invSave) if (s) CF.give(s.name, s.count); CF.sel = selSave; CF.uiRefresh && CF.uiRefresh();
    }
    // #055 warp: step in -> nether instance (8:1), step back -> overworld intact (SPK-7 purity style)
    {
      const PT = CF.IDOF['portal'], P = CF.player;
      const overW = CF.world, markerY = CF.world.heightAt(56, 56) + 6;
      CF.world.set(56, markerY, 56, CF.IDOF['stone']); // fingerprint ONLY overworld should have
      const posSave = P.pos.slice();
      CF.freeCam = false;
      P.tp(56.5, markerY - 5, 56.5);
      P.tp(56.5, CF.world.heightAt(56, 56) + 0.95, 56.5); // stand inside portal base cell
      CF.warpArmed = true;
      const w1 = CF.portalStepTick(); // -> nether
      const dimOk = CF.activeDim === 'nether' && CF.world === CF.dims.nether && CF.world !== overW;
      const scaleOk = Math.abs(CF.world.heightAt(Math.floor(P.pos[0]), Math.floor(P.pos[2])) - (P.pos[1] - 0.9)) < 6; // on solid ground
      const nPortal = CF.world.get(Math.floor(P.pos[0]), Math.floor(P.pos[1] - 0.9 + 0.4), Math.floor(P.pos[2])) === PT ||
        (() => { for (let y = 4; y < 110; y++) if (CF.world.get(56, y, 56) === PT || CF.world.get(57, y, 56) === PT) return true; return false; })();
      const near = CF.warp('over', [P.pos[0], P.pos[1] - 1.2, P.pos[2]]); // pair back to the original over portal (MC linkage)
      const backOk = near && CF.activeDim === 'over' && CF.world === overW && overW.get(56, markerY, 56) === CF.IDOF['stone'];
      const dbgNP = (() => { let n = 0, first = null; const nw = CF.dims.nether; for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 4; y < 110; y++) if (nw.get(x, y, z) === PT) { n++; if (!first) first = [x, y, z]; } return n + '/' + JSON.stringify(first); })();
      const dbgOP = (() => { let n = 0; for (let y = 4; y < 110; y++) for (let x = 40; x <= 72; x++) for (let z = 40; z <= 72; z++) if (overW.get(x, y, z) === PT) n++; return n; })();
      const pairFound = dbgOP >= 6; // over portal survived the round trip (counted over the whole window, rows split 2/row)
      P.tp(posSave[0], posSave[1], posSave[2]); P.vel[0] = P.vel[1] = P.vel[2] = 0; P.prevPos = posSave.slice();
      CF.world.set(56, markerY, 56, 0);
      for (let x = 54; x <= 58; x++) for (let z = 54; z <= 58; z++) for (let y = 4; y < 80; y++) if (CF.world.get(x, y, z) === PT) CF.world.set(x, y, z, 0);
      CF.assert(r, 'game.warp(dim=' + dimOk + ',scale=' + scaleOk + ',nPortal=' + nPortal + ',back=' + backOk + ',pair=' + pairFound + ',np=' + dbgNP + ',op=' + dbgOP + ',w=' + JSON.stringify(CF.__WDBG) + ')',
        dimOk && scaleOk && nPortal && backOk && pairFound);
    }
    // #054: hoe tills grass/dirt (refuses stone/covered); crops harvest by stage
    {
      const h = CF.world.heightAt(82, 82);
      CF.world.ensureAround(82, 82, 1);
      for (let i = 0; i < 20 && CF.world.stats().queue; i++) CF.world.tick();
      const savedT = {};
      for (let x = 80; x <= 84; x++) for (let z = 80; z <= 84; z++) for (let y = h - 6; y <= h + 4; y++) {
        const k = x + ',' + y + ',' + z; if (!(k in savedT)) savedT[k] = CF.world.get(x, y, z);
        CF.world.set(x, y, z, y === h - 1 ? IDOF['dirt'] : 0); // full-depth pad floor at h-1, clear above
      }
      const gy = h - 1;
      CF.world.set(82, gy, 82, IDOF['grass']);
      const invSave = CF.inv.map((s) => (s ? { name: s.name, count: s.count } : null)), selSave = CF.sel;
      CF.inv.fill(null); CF.inv[0] = { name: 'wood_hoe', count: 1 }; CF.sel = 0;
      const tilled = CF.useHoe({ x: 82, y: gy, z: 82, face: [0, 1, 0] });
      const isFM = CF.world.get(82, gy, 82) === IDOF['farmland'];
      CF.world.set(84, gy, 84, IDOF['stone']);
      const refusedStone = CF.useHoe({ x: 84, y: gy, z: 84, face: [0, 1, 0] }); // hoe refuses stone
      CF.world.set(84, gy, 84, 0);
      CF.world.set(82, gy + 1, 82, IDOF['dirt']); // cover it
      CF.world.set(82, gy, 82, IDOF['grass']);
      const refusedCovered = CF.useHoe({ x: 82, y: gy, z: 82, face: [0, 1, 0] });
      CF.world.set(82, gy + 1, 82, 0);
      CF.inv[1] = { name: 'wheat_seeds', count: 2 }; CF.sel = 1;
      const pFail2 = CF.place({ x: 82, y: gy, z: 82, face: [0, 1, 0] }); // grass below -> refuse
      CF.world.set(82, gy, 82, IDOF['farmland']);
      const pOk = CF.place({ x: 82, y: gy, z: 82, face: [0, 1, 0] });
      const plantedHere = CF.world.get(82, gy + 1, 82) === IDOF['wheat'] && CF.world.flatAt(82, gy + 1, 82) === 0;
      CF.world.set(82, gy + 1, 82, 0);
      // mature harvest: wheat@stage7 -> 1-3 grain + 1-2 seeds; immature stage3 -> 1 seed
      CF.world.set(82, gy + 1, 82, IDOF['wheat']); CF.world.flatSet(82, gy + 1, 82, 7);
      CF.drops.length = 0;
      CF.mineStart({ x: 82, y: gy + 1, z: 82 });
      let broke = null, tks = 0;
      while (tks < 200 && !(broke && broke.broke)) { broke = CF.mineTick(0.05); tks++; }
      const dm = broke && broke.broke ? broke.drops : [];
      const grain = dm.filter((d) => d.name === 'wheat').reduce((a, d) => a + d.n, 0);
      const seed = dm.filter((d) => d.name === 'wheat_seeds').reduce((a, d) => a + d.n, 0);
      CF.world.set(82, gy + 1, 82, IDOF['wheat']); CF.world.flatSet(82, gy + 1, 82, 3);
      CF.mineStart({ x: 82, y: gy + 1, z: 82 });
      broke = null; tks = 0;
      while (tks < 200 && !(broke && broke.broke)) { broke = CF.mineTick(0.05); tks++; }
      const di = broke && broke.broke ? broke.drops : [];
      CF.assert(r, 'interact.harvest(g=' + grain + ',s=' + seed + ',imm=' + JSON.stringify(di.map((d) => d.name + d.n)) + ')',
        grain >= 1 && grain <= 3 && seed >= 1 && seed <= 2 && di.length === 1 && di[0].name === 'wheat_seeds' && di[0].n === 1);
      CF.world.set(82, gy + 1, 82, 0); CF.drops.length = 0;
      for (const k in savedT) { const [x2, y2, z2] = k.split(',').map(Number); CF.world.set(x2, y2, z2, savedT[k]); }
      CF.world.flatSet(82, gy + 1, 82, 0);
      CF.assert(r, 'interact.till(' + tilled + ',' + isFM + ',' + refusedStone + ',' + refusedCovered + ',' + pFail2 + ',' + pOk + ',' + plantedHere + ')',
        tilled === true && isFM === true && refusedCovered === false && pFail2 === false && pOk === true && plantedHere === true);
      CF.inv.fill(null); for (const s of invSave) if (s) CF.give(s.name, s.count); CF.sel = selSave; CF.uiRefresh && CF.uiRefresh();
    }
    // #105: torch flame must render at the TOP of the cross quad (readPixels y is FROM BOTTOM).
    {
      const h = CF.world.heightAt(78, 78) - 1; // top solid cell
      CF.world.ensureAround(78, 78, 1);
      for (let i = 0; i < 20 && CF.world.stats().queue; i++) CF.world.tick();
      for (let x = 76; x <= 80; x++) for (let z = 75; z <= 83; z++) for (let y = h + 1; y < h + 8; y++) CF.world.set(x, y, z, 0); // clear torch + camera corridor
      CF.world.set(78, h + 1, 78, IDOF['torch']);
      CF.world.ensureLight(78 >> 4, 78 >> 4);
      for (let i = 0; i < 8; i++) CF.world.tick();
      for (let i = 0; i < 200 && CF.world.dirty.size; i++) CF.renderTick();
      const cam = { pos: [78.5, h + 2.2, 80.0], yaw: Math.PI, pitch: -0.34 }; // 2 blocks out, aimed at torch center (y h+1.5)
      CF.renderDraw(cam);
      const q = new Uint8Array(4);
      CF.gl.readPixels((CF.canvas.width * 0.5) | 0, (CF.canvas.height * 0.62) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q); // upper torch = flame
      const upper = [q[0], q[1], q[2]];
      CF.gl.readPixels((CF.canvas.width * 0.5) | 0, (CF.canvas.height * 0.45) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q);
      const lower = [q[0], q[1], q[2]];
      const flame = (p) => p[0] > 150 && p[1] > 110 && p[2] < 220 && p[1] > p[2] + 20; // yellow-white core ok; stick (g=70) and sky (b=255) rejected
      CF.assert(r, 'interact.torch-up(up=' + upper + ',lo=' + lower + ')', flame(upper) && !flame(lower));
      CF.world.set(78, h + 1, 78, 0);
    }
    // #060: Q-drop throws a pickup-able billboard entity; 0.5s pickup delay then magnet re-gives it
    {
      const P = CF.player;
      const posSave = P.pos.slice();
      const invSave = CF.inv.map((s) => (s ? { name: s.name, count: s.count } : null)), selSave = CF.sel, freeSave = CF.freeCam;
      CF.freeCam = false;
      CF.world.ensureAround(P.pos[0], P.pos[2], 1);
      for (let i = 0; i < 20 && CF.world.stats().queue; i++) CF.world.tick();
      CF.inv.fill(null); CF.inv[0] = { name: 'cobblestone', count: 5 }; CF.sel = 0;
      const before = CF.countItem('cobblestone');
      const okD = CF.dropHeld();
      const mid = CF.countItem('cobblestone');
      const it = CF.itemEnts[CF.itemEnts.length - 1];
      const sitOn = () => P.tp(it.x, it.y + 0.9, it.z); // stay in magnet range but inside the delay window
      sitOn();
      for (let i = 0; i < 6; i++) { sitOn(); CF.itemTick(); }
      const heldEarly = CF.countItem('cobblestone');
      for (let i = 0; i < 40; i++) { sitOn(); CF.itemTick(); } // age past delay -> magnet
      const heldLate = CF.countItem('cobblestone');
      const gone = !CF.itemEnts.includes(it);
      CF.assert(r, 'interact.q-drop(ok=' + okD + ',' + before + '>' + mid + '>=' + heldEarly + '->' + heldLate + ',gone=' + gone + ')',
        okD === true && mid === before - 1 && heldEarly === mid && heldLate === before && gone);
      P.tp(posSave[0], posSave[1], posSave[2]); P.vel[0] = P.vel[1] = P.vel[2] = 0;
      CF.inv.fill(null); for (const s of invSave) if (s) CF.give(s.name, s.count); CF.sel = selSave; CF.freeCam = freeSave; CF.uiRefresh && CF.uiRefresh();
    }
    // #051: clay block yields 4 clay balls (1.12)
    {
      const h = CF.world.heightAt(74, 74) + 1;
      CF.world.set(74, h, 74, IDOF['clay']);
      const before = CF.countItem('clay_ball');
      CF.drops.length = 0;
      CF.mineStart({ x: 74, y: h, z: 74 });
      let broke = null, ticks = 0;
      while (ticks < 200 && !(broke && broke.broke)) { broke = CF.mineTick(0.05); ticks++; }
      CF.assert(r, 'interact.clay-drop4(' + (CF.countItem('clay_ball') - before) + ')', broke && broke.broke && CF.countItem('clay_ball') - before === 4);
      CF.drops.length = 0; // NOTE: no inv.fill here - the place/bedrock tests below depend on the hotbar
    }
    // #050: colored wool keeps its color in the drop
    {
      const h = CF.world.heightAt(72, 72) + 1;
      CF.world.set(72, h, 72, IDOF['wool:red']);
      CF.drops.length = 0;
      CF.mineStart({ x: 72, y: h, z: 72 });
      let broke = null, ticks = 0;
      while (ticks < 200 && !(broke && broke.broke)) { broke = CF.mineTick(0.05); ticks++; }
      CF.assert(r, 'interact.drop-wool-red(' + (broke && broke.drops.map((d) => d.name).join()) + ')',
        broke && broke.broke && broke.drops.length === 1 && broke.drops[0].name === 'wool:red');
      CF.drops.length = 0;
    }
    // #049: birch log keeps its species in the drop table
    {
      const h = CF.world.heightAt(70, 70) + 1;
      CF.world.set(70, h, 70, IDOF['log:birch']);
      CF.drops.length = 0;
      CF.mineStart({ x: 70, y: h, z: 70 });
      let broke = null, ticks = 0;
      while (ticks < 200 && !(broke && broke.broke)) { broke = CF.mineTick(0.05); ticks++; }
      CF.assert(r, 'interact.drop-birch(' + (broke && broke.drops.map((d) => d.name).join()) + ')',
        broke && broke.broke && broke.drops.length === 1 && broke.drops[0].name === 'log:birch');
      CF.drops.length = 0;
    }    CF.world.set(hit.x, h + 1, hit.z, 0);
    // bedrock unbreakable
    CF.assert(r, 'interact.bedrock', !isFinite(CF.breakTime(IDOF['bedrock'])));
    // place: aim ~2 blocks ahead (not own column!), place selected hotbar block
    CF.sel = 1; // dirt
    P.pitch = -0.5;
    const g = CF.aim();
    const placed = CF.place(g);
    const tg = [g.x + g.face[0], g.y + g.face[1], g.z + g.face[2]];
    CF.assert(r, 'interact.place', placed && CF.world.get(tg[0], tg[1], tg[2]) === IDOF['dirt']);
    CF.world.set(tg[0], tg[1], tg[2], 0);
    // place into self fails: craft synthetic hit targeting player's own feet cell
    const cx = Math.floor(P.pos[0]), cy = Math.floor(P.pos[1] - 0.45), cz = Math.floor(P.pos[2]);
    CF.world.set(cx, cy, cz, 0);
    const self = CF.place({ x: cx - 1, y: cy, z: cz, face: [1, 0, 0] });
    CF.assert(r, 'interact.no-self-place', !self && CF.world.get(cx, cy, cz) === 0);
    // #028: torch attaches to solid faces only; pops when support dies
    const wx9 = 60, wz9 = 60;
    CF.world.ensureAround(wx9, wz9, 1);
    for (let i = 0; i < 10 && CF.world.stats().queue; i++) CF.world.tick();
    const wh9 = CF.world.heightAt(wx9, wz9);
    CF.world.set(wx9, wh9 + 1, wz9, IDOF['cobblestone']);
    CF.inv[CF.sel] = { name: 'torch', count: 4 };
    const wallT = CF.place({ x: wx9, y: wh9 + 1, z: wz9, face: [0, 0, -1] });
    CF.assert(r, 'torch.on-wall', wallT && CF.world.get(wx9, wh9 + 1, wz9 - 1) === IDOF['torch']);
    const floatT = CF.place({ x: wx9 + 3, y: wh9 + 3, z: wz9, face: [1, 0, 0] });
    CF.assert(r, 'torch.no-float', !floatT && !CF.world.get(wx9 + 4, wh9 + 3, wz9));
    const n0 = CF.countItem('torch');
    CF.world.set(wx9, wh9 + 1, wz9, 0);
    CF.assert(r, 'torch.pop(g=' + CF.world.get(wx9, wh9 + 1, wz9 - 1) + ',c=' + CF.countItem('torch') + '/' + (n0 + 1) + ')', CF.world.get(wx9, wh9 + 1, wz9 - 1) === 0 && CF.countItem('torch') === n0 + 1);
  };
})();
