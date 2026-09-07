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
      if (v.name === 'gravel' && dropName && Math.random() < 0.1) dropName = 'flint'; // 1.12: 10% flint
      if (v.name === 'leaves') { // 1.12: oak leaves 5% sapling, 0.5% apple, else nothing (#019)
        const lr = Math.random();
        dropName = lr < 0.05 ? (v.variant === 'oak' ? 'sapling' : 'sapling:' + v.variant) : lr < 0.055 && v.variant === 'oak' ? 'apple' : null; // #049 species saplings; apples oak-only (1.12)
      }
      const drops = tierOk && dropName ? [{ name: dropName, n: v.dropN || 1, x: m.x + 0.5, y: m.y + 0.5, z: m.z + 0.5 }] : [];
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

  CF.place = (hit) => {
    if (!hit) return false;
    const tx = hit.x + hit.face[0], ty = hit.y + hit.face[1], tz = hit.z + hit.face[2];
    if (CF.world.get(tx, ty, tz)) return false;
    if (CF.cellHitsPlayer(tx, ty, tz)) return false;
    const id = CF.hotId();
    if (!id) return false;
    const v = CF.BY_ID[id];
    if (v.cross) {
      // MC support rule: floor face needs solid below; side faces need solid on that side
      const f = hit.face;
      const support = f[1] === 1 ? CF.solidAt(CF.world.get(hit.x, hit.y, hit.z))
        : CF.solidAt(CF.world.get(tx - f[0], ty - f[1], tz - f[2]));
      if (!support) return false;
    }
    if (v.name === 'bed' && CF.bedPlace) return CF.bedPlace(tx, ty, tz, CF.dirFromYaw(p.yaw)); // #041 2-cell, consumes itself
    const ok = CF.world.set(tx, ty, tz, id);
    if (ok && v.cross && CF.world.flatSet) {
      const f = hit.face;
      const code = f[1] === 1 ? 1 : f[0] === 1 ? 2 : f[0] === -1 ? 6 : f[2] === 1 ? 4 : 8;
      CF.world.flatSet(tx, ty, tz, code);
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
    if (e.button === 2) { if (!(CF.useFlintSteel && CF.useFlintSteel(CF.aim())) && !(CF.useBlock && CF.useBlock(CF.aim())) && !(CF.useBucket && CF.useBucket(CF.aim())) && !(CF.mobFeed && CF.mobFeed()) && !(CF.useHeld && CF.useHeld())) CF.place(CF.aim()); }
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
