// Mobs (#035): entity system (AABB physics, lifecycle, lit-box render) + zombie.
// 1.12 spawn rule: hostile needs max(blockLight, skyLight*dayFactor) <= 7 ("light 0" is 1.18+!).
// AI/pathing/attack deliberately NOT here - SPK-4 heap A* lands in #036. Mobs are physics bodies + burn + die.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const GRAV = 32; // same as player (player.js)
  const HOSTILE_CAP = 12; // active-sim cap (MC 70 is per-player global over 128 box; #039 refines)
  const DESPAWN_DIST = 48, KILL_DIST = 64;

  // boxes are relative to FEET (y=0 at feet), sizes in blocks. Colors = CF.MOBCOLOR keys (render.js palette).
  CF.MOBS = {
    zombie: {
      w: 0.6, h: 1.95, hp: 20, speed: 2.1, hostile: true, burns: true,
      boxes: [
        { cy: 1.7, sx: 0.5, sy: 0.5, sz: 0.5, color: 'zskin' },   // head
        { cy: 0.76, sx: 0.55, sy: 1.1, sz: 0.32, color: 'zcloth' }, // body+legs
      ],
      drop: { name: 'rotten_flesh', min: 0, max: 2 }, // 1.12: 0-2 rotten flesh (rare iron/gold -> backlog)
    },
  };

  const M = CF.mobs = {
    list: [], nextUid: 1,
    spawn(type, x, y, z, opts) { // y = FEET level. Raw create (no rules) - shots/tests use this.
      const T = CF.MOBS[type]; if (!T) return null;
      const m = { uid: M.nextUid++, type, pos: [x, y + T.h / 2, z], vel: [0, 0, 0], hp: T.hp, onGround: false, burnT: 0, burning: false };
      if (opts && opts.vel) m.vel = opts.vel.slice();
      M.list.push(m);
      return m;
    },
    trySpawnAt(type, x, fy, z) { // rule-gated hostile spawn (1.12 light/distance/cap). Returns mob|null.
      const T = CF.MOBS[type]; if (!T) return null;
      if (T.hostile && M.hostileCount() >= HOSTILE_CAP) return null;
      const bx = Math.floor(x), bz = Math.floor(z);
      if (!CF.solidAt(CF.world.get(bx, fy - 1, bz))) return null;              // stand on solid
      if (CF.world.get(bx, fy, bz) || CF.world.get(bx, fy + 1, bz)) return null; // 2 air clearance
      if (T.hostile) {
        const packed = CF.world.lightAt(bx, fy, bz);
        const eff = Math.max(packed & 15, (packed >> 4) * (CF.dayFactor ? CF.dayFactor() : 1));
        if (eff > 7) return null;
      }
      if (CF.player && Math.hypot(CF.player.pos[0] - x, CF.player.pos[2] - z) < 24) return null; // 1.12 min dist
      return M.spawn(type, x, fy, z);
    },
    hostileCount() { let n = 0; for (const m of M.list) if (CF.MOBS[m.type].hostile) n++; return n; },
    rollDrop(type) {
      const d = CF.MOBS[type].drop; if (!d) return null;
      const n = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
      return n > 0 ? { name: d.name, n } : null;
    },
    hurt(m, n, src) {
      if (m.dead) return;
      m.hp -= n;
      if (m.hp <= 0) {
        m.dead = true;
        const loot = M.rollDrop(m.type);
        if (loot && src === 'player' && CF.give) CF.give(loot.name, loot.n); // Tier-1: no item entities; player kills -> inventory
        M.remove(m);
      }
    },
    remove(m) { const i = M.list.indexOf(m); if (i >= 0) M.list.splice(i, 1); },
    clear() { M.list.length = 0; },
  };

  const solid = (x, y, z) => CF.solidAt(CF.world.get(Math.floor(x), Math.floor(y), Math.floor(z)));
  function boxHits(hw, hh, px, py, pz) {
    for (let x = Math.floor(px - hw); x <= Math.floor(px + hw); x++)
      for (let y = Math.floor(py - hh + 0.001); y <= Math.floor(py + hh - 0.001); y++)
        for (let z = Math.floor(pz - hw); z <= Math.floor(pz + hw); z++)
          if (solid(x, y, z)) return true;
    return false;
  }

  // per-axis sweep, same shape as player.tick but input-free (AI is #036)
  M.step = (m, dt = 0.05) => {
    const T = CF.MOBS[m.type], hw = T.w / 2, hh = T.h / 2;
    m.vel[1] -= GRAV * dt;
    let [x, y, z] = m.pos;
    let nx = x + m.vel[0] * dt;
    if (boxHits(hw, hh, nx, y, z)) {
      const stepY = y + 0.6; // 1-block climb like the player
      if (m.onGround && !boxHits(hw, hh, nx, stepY, z)) { y = stepY; nx = x + m.vel[0] * dt * 0.75; }
      else nx = x;
    }
    x = nx;
    let nz = z + m.vel[2] * dt;
    if (boxHits(hw, hh, x, y, nz)) {
      const stepY = y + 0.6;
      if (m.onGround && !boxHits(hw, hh, x, stepY, nz)) { y = stepY; nz = z + m.vel[2] * dt * 0.75; }
      else nz = z;
    }
    z = nz;
    let ny = y + m.vel[1] * dt;
    m.onGround = false;
    if (boxHits(hw, hh, x, ny, z)) {
      if (m.vel[1] < 0) { m.onGround = true; ny = Math.floor(y - hh) + 1 + hh; }
      else ny = Math.ceil(y + hh) - 1 - hh - 0.001;
      m.vel[1] = 0;
    }
    m.pos = [x, ny, z];
    if (ny < -20) m.dead = true;
  };

  // Per-tick: physics, sun burn, despawn, and (survival only) the spawn scheduler.
  CF.mobTick = (dt = 0.05) => {
    const W = CF.world, P = CF.player;
    if (!W) return;
    for (const m of M.list.slice()) {
      const T = CF.MOBS[m.type];
      M.step(m, dt);
      if (m.dead) { M.remove(m); continue; }
      // sunlight burn (1.12: sky-exposed undead catch fire during the day)
      if (T.burns && CF.dayFactor && CF.dayFactor() > 0.6) {
        const hy = Math.floor(m.pos[1] + hh(m) - 0.1);
        const sky = W.lightAt(Math.floor(m.pos[0]), hy, Math.floor(m.pos[2])) >> 4;
        if (sky >= 10) {
          m.burning = true;
          if (++m.burnT >= 20) { m.burnT = 0; M.hurt(m, 1, 'burn'); }
        } else { m.burnT = 0; m.burning = false; }
      } else m.burning = false;
      if (m.dead) { M.remove(m); continue; }
      if (P) { // despawn far (instant beyond kill-line; survival keeps sim area tight)
        const d = Math.hypot(P.pos[0] - m.pos[0], P.pos[2] - m.pos[2]);
        if (d > KILL_DIST || (CF.survival && d > DESPAWN_DIST)) { M.remove(m); continue; }
      }
    }
    // scheduler: spawn attempts only in survival (creative stays a calm sandbox + suites stay mob-free)
    if (CF.survival && P && M.hostileCount() < HOSTILE_CAP) {
      let budget = 2;
      while (budget-- > 0) {
        const ang = Math.random() * Math.PI * 2, rr = 24 + Math.random() * 16;
        const x = Math.floor(P.pos[0] + Math.cos(ang) * rr), z = Math.floor(P.pos[2] + Math.sin(ang) * rr);
        W.ensureAround(x, z, 0);
        const fy = W.heightAt(x, z) + 1;
        if (W.get(x, fy - 1, z)) W.ensureLight(x >> 4, z >> 4);
        M.trySpawnAt('zombie', x + 0.5, fy, z + 0.5);
      }
    }
  };
  const hh = (m) => CF.MOBS[m.type].h / 2;

  // --- render feed: world-space boxes, vertex layout matches chunk stream (pos3 + uv/shade + light)
  function addBox(out, x, y, z, sx, sy, sz, col, light) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const X0 = x - hx, X1 = x + hx, Y0 = y - hy, Y1 = y + hy, Z0 = z - hz, Z1 = z + hz;
    const u = (col + 0.5) / 8;
    const face = (v, shade) => { for (const oi of [0, 1, 2, 0, 2, 3]) out.push(v[oi][0], v[oi][1], v[oi][2], u, 0.5, shade, light); };
    face([[X1, Y0, Z0], [X1, Y0, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], 0.8);
    face([[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0]], 0.6);
    face([[X0, Y1, Z0], [X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], 1.0);
    face([[X0, Y0, Z0], [X0, Y0, Z1], [X1, Y0, Z1], [X1, Y0, Z0]], 0.5);
    face([[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]], 0.8);
    face([[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y1, Z0], [X0, Y1, Z0]], 0.6);
  }
  CF.buildMobVerts = (cam) => {
    if (!M.list.length || !cam || !CF.MOBCOLOR) return null;
    const out = [], C = CF.MOBCOLOR, W = CF.world;
    for (const m of M.list) {
      if (Math.hypot(m.pos[0] - cam.pos[0], m.pos[2] - cam.pos[2]) > 64) continue;
      const packed = W.lightAt(Math.floor(m.pos[0]), Math.floor(m.pos[1]), Math.floor(m.pos[2]));
      const light = packed / 255;
      const feet = m.pos[1] - hh(m);
      for (const b of CF.MOBS[m.type].boxes)
        addBox(out, m.pos[0] + (b.cx || 0), feet + b.cy, m.pos[2] + (b.cz || 0), b.sx, b.sy, b.sz, C[b.color] || 0, light);
    }
    return out.length ? Float32Array.from(out) : null;
  };

  // --- shot scenario: two zombies facing the camera at midnight
  CF.shotScenarios = CF.shotScenarios || {};
  CF.shotScenarios['night-mobs'] = async () => {
    CF.freeCam = true;
    CF.timeOffset = 18000;
    const W = CF.world;
    W.ensureAround(8, 8, 3);
    for (let i = 0; i < 40 && W.stats().queue; i++) W.tick();
    const th = W.heightAt(0, 8);
    M.clear();
    const a = M.spawn('zombie', 0.5, th, 4.5);
    const b = M.spawn('zombie', 2.2, th, 5.2);
    for (let t = 0; t < 12; t++) { M.step(a); M.step(b); }
    for (let i = 0; i < 30 && W.stats().dirty; i++) { W.tick(); CF.renderTick(); }
    for (let i = 0; i < 40; i++) CF.renderTick();
    CF.camera = { pos: [1.2, th + 1.55, -2.5], yaw: 0.1, pitch: -0.12 };
    CF.renderDraw(CF.camera);
    await new Promise((res) => setTimeout(res, 150));
    CF.renderDraw(CF.camera);
  };

  // --- test suite
  const settle = (n) => { for (let i = 0; i < n && CF.world.stats().queue; i++) CF.world.tick(); };
  CF.mobTests = async (r) => {
    const W = CF.world, P = CF.player, ID = CF.IDOF, surv0 = CF.survival, t0 = CF.timeOffset;
    M.clear();
    CF.survival = false;

    // physics: fall & land & no-sink
    const px = 120, pz = 120;
    W.ensureAround(px, pz, 2); settle(20);
    const h = W.heightAt(px, pz);
    const m = M.spawn('zombie', px + 0.5, h + 12, pz + 0.5);
    for (let t = 0; t < 300 && !(m.onGround && t > 5); t++) M.step(m);
    CF.assert(r, 'mob.land(y=' + m.pos[1].toFixed(2) + ',h=' + h + ')', m.onGround && Math.abs(m.pos[1] - (h + 1 + 0.975)) < 1.5);
    const y0 = m.pos[1];
    for (let t = 0; t < 40; t++) M.step(m);
    CF.assert(r, 'mob.no-sink(' + (m.pos[1] - y0).toFixed(3) + ')', Math.abs(m.pos[1] - y0) < 0.01);

    // wall blocking
    const wx = Math.floor(m.pos[0]) + 2, wz = Math.floor(m.pos[2]), wy = Math.floor(m.pos[1] - 0.9);
    for (let yy = wy; yy <= wy + 2; yy++) W.set(wx, yy, wz, ID['cobblestone']);
    const x0 = m.pos[0]; m.vel[0] = 4;
    for (let t = 0; t < 40; t++) M.step(m);
    m.vel[0] = 0;
    CF.assert(r, 'mob.wall-block(dx=' + (m.pos[0] - x0).toFixed(2) + ')', m.pos[0] < wx - 0.29 && m.pos[0] > x0 - 0.05);
    for (let yy = wy; yy <= wy + 2; yy++) W.set(wx, yy, wz, 0);

    // spawn light rule: midnight open surface OK; noon NG; glowstone-lit NG; <24 from player NG
    M.clear();
    CF.timeOffset = 18000;
    const sx = 60, sz = 60;
    W.ensureAround(sx, sz, 2); settle(30); W.ensureLight(sx >> 4, sz >> 4);
    // find a genuinely open dark column (other suites grow trees/grass into the area over 24k ticks)
    let fx = -1, fz = 0, fy = 0;
    for (let tries = 0; tries < 64 && fx < 0; tries++) {
      const cx2 = sx + (tries % 8) * 2 - 7, cz2 = sz + Math.floor(tries / 8) * 2 - 7;
      const cy2 = W.heightAt(cx2, cz2) + 1;
      if (W.get(cx2, cy2 - 1, cz2) && !W.get(cx2, cy2, cz2) && !W.get(cx2, cy2 + 1, cz2)
        && (W.lightAt(cx2, cy2, cz2) & 15) < 8
        && Math.hypot(P.pos[0] - cx2, P.pos[2] - cz2) > 26) { fx = cx2; fz = cz2; fy = cy2; }
    }
    CF.assert(r, 'mob.spawn-scan-found(' + fx + ',' + fy + ')', fx >= 0);
    const sy = fy;
    CF.assert(r, 'mob.spawn-dark(sky=' + (W.lightAt(fx, sy, fz) >> 4) + ')',
      !!M.trySpawnAt('zombie', fx + 0.5, sy, fz + 0.5) === true && M.list.length === 1);
    M.clear();
    CF.timeOffset = 6000; // noon
    CF.assert(r, 'mob.no-spawn-noon(day=' + (CF.dayFactor ? CF.dayFactor().toFixed(1) : '?') + ')',
      M.trySpawnAt('zombie', fx + 0.5, sy, fz + 0.5) === null);
    CF.timeOffset = 18000;
    W.set(fx + 2, sy, fz, ID['glowstone']);
    for (let i = 0; i < 40 && (W.lightAt(fx, sy, fz) & 15) < 8; i++) W.tick();
    CF.assert(r, 'mob.no-spawn-lit(blk=' + (W.lightAt(fx, sy, fz) & 15) + ')',
      M.trySpawnAt('zombie', fx + 0.5, sy, fz + 0.5) === null);
    W.set(fx + 2, sy, fz, 0); settle(30);
    P.spawn = [P.pos[0], P.pos[1], P.pos[2]];
    const near = P.pos[0] + 6, nearZ = P.pos[2]; const nearY = W.heightAt(Math.floor(near), Math.floor(nearZ)) + 1;
    CF.assert(r, 'mob.min-dist(24-block rule)', M.trySpawnAt('zombie', near + 0.5, nearY, nearZ + 0.5) === null);

    // scheduler over 400 night ticks: spawns happen, all >=20 away, cap respected
    M.clear(); CF.survival = true; CF.timeOffset = 18000;
    W.ensureAround(P.pos[0], P.pos[2], 4); settle(40);
    for (let t = 0; t < 400; t++) CF.mobTick();
    let minD = 1e9; for (const z2 of M.list) minD = Math.min(minD, Math.hypot(P.pos[0] - z2.pos[0], P.pos[2] - z2.pos[2]));
    CF.assert(r, 'mob.spawn-night(' + M.list.length + ' spawned)', M.list.length >= 1);
    CF.assert(r, 'mob.min-dist(min=' + minD.toFixed(1) + ')', M.list.length === 0 || minD >= 20);
    CF.assert(r, 'mob.cap(' + M.list.length + '<=12)', M.list.length <= 12);

    // burn: noon sky-exposed dies; midnight survives
    M.clear(); CF.survival = false;
    const bx = Math.floor(P.pos[0]) + 8, bz = Math.floor(P.pos[2]) + 8;
    W.ensureAround(bx, bz, 1); settle(20); W.ensureLight(bx >> 4, bz >> 4);
    const by = W.heightAt(bx, bz) + 1;
    CF.timeOffset = 6000;
    const z3 = M.spawn('zombie', bx + 0.5, by, bz + 0.5);
    CF.assert(r, 'mob.burn-setup(sky=' + (W.lightAt(bx, by + 1, bz) >> 4) + ')', (W.lightAt(bx, by + 1, bz) >> 4) >= 10);
    for (let t = 0; t < 1200 && M.list.indexOf(z3) >= 0; t++) CF.mobTick();
    CF.assert(r, 'mob.burn-day(hp=' + z3.hp + ')', z3.hp <= 0 && M.list.indexOf(z3) < 0);
    CF.timeOffset = 18000;
    const z4 = M.spawn('zombie', bx + 0.5, by, bz + 0.5);
    for (let t = 0; t < 600; t++) CF.mobTick();
    CF.assert(r, 'mob.no-burn-night(hp=' + z4.hp + ')', z4.hp === 20 && M.list.indexOf(z4) >= 0);

    // player-kill drops rotten flesh (0-2 -> killed 8, expect >=1 total; removal certain)
    CF.inv.fill(null);
    for (let k = 0; k < 8; k++) { const zz = M.spawn('zombie', bx + 0.5, by, bz + 0.5); M.hurt(zz, 999, 'player'); }
    const loot = CF.countItem('rotten_flesh');
    CF.assert(r, 'mob.drop(loot=' + loot + ')', loot >= 1 && loot <= 16);
    CF.assert(r, 'mob.env-kill-no-loot', (() => { const c0 = CF.countItem('rotten_flesh'); const zz = M.spawn('zombie', bx + 0.5, by, bz + 0.5); M.hurt(zz, 999, 'burn'); return CF.countItem('rotten_flesh') === c0; })());
    M.clear();

    // render: pixel in front of camera changes with a mob there; GL clean
    for (let i = 0; i < 60 && !CF.rendererStats.ready; i++) { CF.renderTick(); await new Promise((s) => setTimeout(s, 25)); }
    CF.timeOffset = 6000; CF.freeCam = true;
    const rx = 44, rz = 44;
    W.ensureAround(rx, rz, 2); settle(30);
    for (let i = 0; i < 60; i++) CF.renderTick();
    const rh = W.heightAt(rx, rz);
    const mz = rz - 2.5; // mob stands 2.5 blocks north (yaw=PI looks -Z)
    const cam = { pos: [rx + 0.5, rh + 1.5, rz + 0.0], yaw: Math.PI, pitch: 0.15 };
    const zc = M.spawn('zombie', rx + 0.5, W.heightAt(rx, Math.floor(mz)) + 1, mz);
    CF.renderDraw(cam); const e0 = CF.readCenter();
    for (let t = 0; t < 6; t++) M.step(zc);
    CF.renderDraw(cam); const e1 = CF.readCenter();
    const delta = Math.abs(e0[0] - e1[0]) + Math.abs(e0[1] - e1[1]) + Math.abs(e0[2] - e1[2]);
    CF.assert(r, 'mob.px-draw(d=' + delta + ',b=' + e1 + ')', delta > 12 && CF.rendererStats.mtris >= 24);
    CF.assert(r, 'mob.glErr(' + CF.rendererStats.glErr + ')', CF.rendererStats.glErr === 0);
    M.clear();
    CF.survival = surv0; CF.timeOffset = t0; CF.freeCam = false;
    CF.renderDraw(CF.camera || cam);
  };
})();
