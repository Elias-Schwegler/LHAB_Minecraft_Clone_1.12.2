// TNT (#042): craft, place, prime with flint & steel, 80-tick fuse, chain reaction, power-4 explosion.
// Reuses CF.explode (src/explode.js, #037). Block tile is runtime-drawn (functional:false -> not parity-counted).
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const meta = (window.__TEXMETA = window.__TEXMETA || {});
  if (!meta.tnt_side) meta.tnt_side = { x: 16, y: 160, w: 16, h: 16, src: 'generated:tnt.js' }; // free atlas cell (post stride-fix layout)
  if (!meta.tnt_top) meta.tnt_top = { x: 32, y: 160, w: 16, h: 16, src: 'generated:tnt.js' };

  CF.FUSE = 80; // 1.12.2: tnt fuse = 4s = 80 game ticks
  CF.tnts = CF.tnts || [];
  CF.primeTNT = (x, y, z, fuse) => { // turn a placed TNT block into a primed entity (returns bool)
    if (CF.world.get(x, y, z) !== CF.IDOF['tnt']) return false;
    CF.world.set(x, y, z, 0);
    CF.tnts.push({ pos: [x + 0.5, y + 0.5, z + 0.5], fuse: fuse == null ? CF.FUSE : fuse });
    return true;
  };
  CF.tntTick = () => {
    for (let i = CF.tnts.length - 1; i >= 0; i--) {
      const t = CF.tnts[i];
      if (--t.fuse > 0) continue;
      CF.tnts.splice(i, 1);
      const power = 4; // 1.12.2 tnt explosion power
      if (CF.explode) CF.explode(t.pos[0], t.pos[1], t.pos[2], power);
      // chain reaction (1.12): nearby un-primed TNT blocks caught by the blast get primed
      const bx = Math.floor(t.pos[0]), by = Math.floor(t.pos[1]), bz = Math.floor(t.pos[2]), R = Math.ceil(power * 1.5);
      for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) {
        if (dx * dx + dy * dy + dz * dz > R * R) continue;
        if (CF.world.get(bx + dx, by + dy, bz + dz) === CF.IDOF['tnt']) CF.primeTNT(bx + dx, by + dy, bz + dz, 10 + Math.floor(Math.random() * 15));
      }
    }
  };
  CF.useFlintSteel = (hit) => { // RMB a placed TNT block while holding flint & steel -> prime
    if (!hit) return false;
    const held = CF.held && CF.held();
    if (held !== 'flint_and_steel') return false;
    if (CF.portalTryIgnite && CF.portalTryIgnite(hit)) return true; // #055 igniting an obsidian frame beats TNT (no obsidian->TNT ambiguity)
    return CF.primeTNT(hit.x, hit.y, hit.z);
  };

  // --- shot: primed, flashing TNT among a cluster (frozen mid-fuse)
  CF.shotScenarios = CF.shotScenarios || {};
  CF.shotScenarios['tnt-fuse'] = async () => {
    CF.freeCam = true; CF.timeOffset = 600;
    const W = CF.world;
    const bx = 280, by = 100, bz = 100;
    W.ensureAround(bx, bz, 1); for (let i = 0; i < 40 && W.stats().queue; i++) W.tick();
    for (let x = bx - 5; x <= bx + 5; x++) for (let z = bz - 5; z <= bz + 5; z++) for (let y = by - 3; y <= by; y++) W.set(x, y, z, W.get(x, y, z) === CF.IDOF['bedrock'] ? CF.IDOF['bedrock'] : (y === by ? CF.IDOF['stone'] : (CF.IDOF['dirt'])));
    for (let i = 0; i < 10; i++) W.tick();
    CF.tnts.length = 0;
    W.set(bx + 1, by + 1, bz, CF.IDOF['tnt']); W.set(bx + 2, by + 1, bz, CF.IDOF['tnt']);
    CF.primeTNT(bx, by + 1, bz, 14); // mid-fuse -> flashing
    CF.tntTick = () => {};
    for (let i = 0; i < 40; i++) CF.renderTick();
    CF.camera = { pos: [bx - 4, by + 3.2, bz], yaw: Math.PI / 2, pitch: -0.12 };
    CF.ticks |= 1; // force the white-flash parity frame (render flashes primed TNT on odd ticks)
    CF.renderDraw(CF.camera); await new Promise((res) => setTimeout(res, 150));
    CF.ticks |= 1;
    CF.shotExtra = { tnts: CF.tnts.length, fuse: CF.tnts[0] && CF.tnts[0].fuse };
    CF.renderDraw(CF.camera);
  };

  // --- test suite
  CF.tntTests = async (r) => {
    const W = CF.world, ID = CF.IDOF;
    CF.survival = false;
    // craft recipes (3x3 tnt needs the tryCraft path; the 2x2 hand grid can't reach it -> crafting-table GUI is a gap)
    const gun = { name: 'gunpowder' }, sand = { name: 'sand' };
    const tc = CF.tryCraft([gun, sand, gun, sand, gun, sand, gun, sand, gun], 3);
    CF.assert(r, 'tnt.craft(' + (tc && tc.out.name) + ')', tc && tc.out.name === 'tnt');
    const fs = CF.tryCraft([{ name: 'iron_ingot' }, null, { name: 'flint' }, null], 2);
    CF.assert(r, 'tnt.flintsteel(' + (fs && fs.out.name) + ')', fs && fs.out.name === 'flint_and_steel');

    // place + prime via flint&steel + fuse + crater
    const bx = 280, by = 100, bz = 100;
    W.ensureAround(bx, bz, 1); for (let i = 0; i < 20 && W.stats().queue; i++) W.tick();
    for (let x = bx - 4; x <= bx + 4; x++) for (let z = bz - 4; z <= bz + 4; z++) for (let y = by - 3; y <= by; y++) W.set(x, y, z, ID['stone']);
    CF.tnts.length = 0;
    W.set(bx, by + 1, bz, ID['tnt']);
    CF.inv.fill(null); CF.give('flint_and_steel', 1); CF.sel = 0;
    const primed = CF.useFlintSteel({ x: bx, y: by + 1, z: bz });
    CF.assert(r, 'tnt.prime(' + primed + ',block=' + W.get(bx, by + 1, bz) + ')', primed === true && CF.tnts.length === 1 && W.get(bx, by + 1, bz) === 0);
    for (let i = 0; i < CF.FUSE + 2; i++) CF.tntTick();
    let crater = 0; for (let x = bx - 3; x <= bx + 3; x++) for (let z = bz - 3; z <= bz + 3; z++) if (W.get(x, by, z) === 0) crater++;
    CF.assert(r, 'tnt.boom(crater=' + crater + ',tnts=' + CF.tnts.length + ')', CF.tnts.length === 0 && crater > 6);

    // chain: two tnt 2 apart; prime one -> other no longer survives as an intact block (primed-then-boomed)
    for (let x = bx - 4; x <= bx + 4; x++) for (let z = bz - 4; z <= bz + 4; z++) for (let y = by - 3; y <= by + 1; y++) W.set(x, y, z, ID['stone']);
    W.set(bx, by + 1, bz, ID['tnt']); W.set(bx + 2, by + 1, bz, ID['tnt']);
    CF.tnts.length = 0; CF.primeTNT(bx, by + 1, bz, 5);
    for (let i = 0; i < CF.FUSE + 40; i++) CF.tntTick();
    CF.assert(r, 'tnt.chain(left=' + W.get(bx + 2, by + 1, bz) + ',tnts=' + CF.tnts.length + ')', W.get(bx, by + 1, bz) === 0 && W.get(bx + 2, by + 1, bz) === 0 && CF.tnts.length === 0);
    // bedrock resists (blastRes 1200): a tnt sitting on bedrock leaves the bedrock intact
    for (let x = bx - 4; x <= bx + 4; x++) for (let z = bz - 4; z <= bz + 4; z++) for (let y = by - 3; y <= by; y++) W.set(x, y, z, ID['stone']);
    W.set(bx, by, bz, ID['bedrock']); W.set(bx, by + 1, bz, ID['tnt']); CF.tnts.length = 0;
    CF.primeTNT(bx, by + 1, bz, 3); for (let i = 0; i < CF.FUSE + 5; i++) CF.tntTick();
    CF.assert(r, 'tnt.bedrock-survives', W.get(bx, by, bz) === ID['bedrock']);
    for (let x = bx - 4; x <= bx + 4; x++) for (let z = bz - 4; z <= bz + 4; z++) for (let y = by - 3; y <= by + 2; y++) W.set(x, y, z, 0);
    CF.tnts.length = 0;
  };
})();
