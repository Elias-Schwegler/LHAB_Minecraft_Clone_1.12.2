// Mobs (#035 core, #036 AI/combat): entity system (AABB physics, lifecycle, lit-box render) + zombie.
// 1.12 spawn rule: hostile needs max(blockLight, skyLight*dayFactor) <= 7 ("light 0" is 1.18+!).
// #036: heap-A* chase on walkable columns (SPK-4 ALT, sense 35, budget 2/tick) + 1.9-style charge combat.
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
    list: [], nextUid: 1, sched: true, // sched=false used by tests for deterministic arenas
    spawn(type, x, y, z, opts) { // y = FEET level. Raw create (no rules) - shots/tests use this.
      const T = CF.MOBS[type]; if (!T) return null;
      const m = { uid: M.nextUid++, type, pos: [x, y + T.h / 2, z], vel: [0, 0, 0], hp: T.hp, onGround: false, burnT: 0, burning: false, atkCd: 0, path: null, repathT: 0 };
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

  // ============================ #036: AI (SPK-4 heap A*) + 1.12 melee ============================
  const STEP_UP = 1, MAX_FALL = 4, NODE_CAP = 1500, REPATH_CD = 20, REPATH_BUDGET = 2;
  const SWORD_DMG = { wood: 4, stone: 5, iron: 6, diamond: 7 }; // 1.12 attack damage

  function Heap() { this.f = []; this.k = []; }
  Heap.prototype = {
    push(f, k) {
      const F = this.f, K = this.k; F.push(f); K.push(k);
      let i = F.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (F[p] <= F[i]) break; let t = F[p]; F[p] = F[i]; F[i] = t; t = K[p]; K[p] = K[i]; K[i] = t; i = p; }
    },
    pop() {
      const F = this.f, K = this.k, kf = F[0], kk = K[0], lf = F.pop(), lk = K.pop();
      if (F.length) {
        F[0] = lf; K[0] = lk; let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let s = i;
          if (l < F.length && F[l] < F[s]) s = l;
          if (r < F.length && F[r] < F[s]) s = r;
          if (s === i) break;
          let t = F[s]; F[s] = F[i]; F[i] = t; t = K[s]; K[s] = K[i]; K[i] = t; i = s;
        }
      }
      return [kf, kk];
    },
  };

  // standable probe: solid below + 2 clear (real cells - heightAt is noise-only and blind to edits!)
  function standable(x, y, z) {
    const W = CF.world;
    return W.get(x, y - 1, z) && !W.get(x, y, z) && !W.get(x, y + 1, z) ? true : false;
  }
  function astar(sx, sy, sz, tx, ty, tz) { // columnar A* w/ direct cell probe: 8-dir no corner-cut,
    const W = CF.world, K = (x, z) => (x + 4096) * 8192 + (z + 4096);
    const stepUp = (cx2, cy, cz2, dx, dz) => { // best standable feet y in [cy-4..cy+1] toward goal dir
      if (dx && dz && !standable(cx2 + dx, cy, cz2) && !standable(cx2, cy, cz2 + dz) &&
        !standable(cx2 + dx, cy + 1, cz2) && !standable(cx2, cy + 1, cz2 + dz)) return -1;
      for (let ny = cy + 1; ny >= cy - 4; ny--) if (standable(cx2 + dx, ny, cz2 + dz)) return ny;
      return -1;
    };
    const h = (x, z, y) => Math.abs(x - tx) + Math.abs(z - tz) + Math.abs(y - ty) * 0.5;
    const open = new Heap(), came = new Map(), g = new Map(), ys = new Map();
    const k0 = K(sx, sz);
    g.set(k0, 0); ys.set(k0, sy); open.push(h(sx, sz, sy), k0);
    let expanded = 0;
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (open.f.length) {
      const [, ck] = open.pop();
      const cz = ck % 8192 - 4096, cx = Math.floor(ck / 8192) - 4096, cy = ys.get(ck);
      if (Math.abs(cx - tx) + Math.abs(cz - tz) <= 1 && Math.abs(cy - ty) <= 1) {
        const path = []; let k = ck;
        while (k !== undefined && k !== k0) { const pz = k % 8192 - 4096, px = Math.floor(k / 8192) - 4096; path.push({ x: px, z: pz }); k = came.get(k); }
        return path.reverse();
      }
      if (++expanded > NODE_CAP) return null;
      for (let di = 0; di < 8; di++) {
        const dx = DIRS[di][0], dz = DIRS[di][1], nx = cx + dx, nz = cz + dz;
        const ny = stepUp(cx, cy, cz, dx, dz);
        if (ny < 0) continue;
        const nk = K(nx, nz), ng = g.get(ck) + (dx && dz ? 1.41 : 1);
        if (ng < (g.get(nk) ?? Infinity)) { came.set(nk, ck); g.set(nk, ng); ys.set(nk, ny); open.push(ng + h(nx, nz, ny), nk); }
      }
    }
    return null;
  }
  CF.astar = astar; // exposed for harness + #037/#038
  CF.__standable = standable; // debug probe (tests only)

  function steer(m, tx, tz, spd) {
    const dx = tx - m.pos[0], dz = tz - m.pos[2], l = Math.hypot(dx, dz) || 1;
    m.vel[0] = dx / l * spd; m.vel[2] = dz / l * spd; m.yaw = Math.atan2(dx, dz);
  }

  function aiChase(m, T, P) {
    if (CF.mobSense === false) return; // test isolation: scheduler windows must not be invalidated by chasing
    const dx = P.pos[0] - m.pos[0], dz = P.pos[2] - m.pos[2], d = Math.hypot(dx, dz);
    const dy = Math.abs(P.pos[1] - m.pos[1]);
    if (d > 35 || dy > 12) { m.path = null; m.vel[0] = m.vel[2] = 0; return; } // MC zombie sense radius 35
    if (d < 1.35 && dy < 2.2) { // in melee reach
      m.vel[0] = m.vel[2] = 0; m.path = null;
      if (--m.atkCd <= 0) { m.atkCd = 20; if (CF.survival) CF.damage(T.dmg || 3, 'mob'); } // NORMAL difficulty
      return;
    }
    m.atkCd = 0;
    m.repathT = (m.repathT || 0) - 1;
    if ((!m.path || !m.path.length) && m.repathT <= 0 && aiBudget > 0) {
      aiBudget--; m.repathT = REPATH_CD;
      m.path = astar(Math.floor(m.pos[0]), Math.floor(m.pos[1] - T.h / 2 + 0.001), Math.floor(m.pos[2]), Math.floor(P.pos[0]), Math.floor(P.pos[1] - 0.9), Math.floor(P.pos[2]));
    }
    const wp = m.path && m.path[0];
    if (wp) {
      if (Math.hypot(wp.x + 0.5 - m.pos[0], wp.z + 0.5 - m.pos[2]) < 0.8) m.path.shift();
      else steer(m, wp.x + 0.5, wp.z + 0.5, T.speed);
    } else steer(m, P.pos[0], P.pos[2], T.speed); // no path: walk straight (wall-block covers us)
  }
  let aiBudget = REPATH_BUDGET;

  // --- player melee: 1.12 charge meter + attack-over-mining priority + knockback
  document.addEventListener('mousedown', (e) => { if (e.button === 0) CF._freshClick = true; }, true);
  CF.mobHitAt = (o, d, maxD) => {
    let best = null;
    for (const m of M.list) {
      const T = CF.MOBS[m.type], hw = T.w / 2 + 0.15, hh = T.h / 2 + 0.1;
      for (let t = 0; t < maxD; t += 0.25) {
        const px = o[0] + d[0] * t, py = o[1] + d[1] * t, pz = o[2] + d[2] * t;
        if (Math.abs(px - m.pos[0]) < hw && py > m.pos[1] - hh && py < m.pos[1] + hh && Math.abs(pz - m.pos[2]) < hw) {
          if (!best || t < best.t) best = { m, t };
          break;
        }
      }
    }
    return best;
  };
  CF.atkCdInfo = () => { // 1.12 attack-speed cooldowns (ticks to full charge): sword 12, tool 20, hand 5
    const held = CF.held && CF.held(), def = CF.ITEMS[held];
    if (def && def.tool) return def.tool.type === 'sword' ? 12 : 20;
    return 5;
  };
  CF.trySwing = (hit) => { // returns true if the swing targeted a mob (mining suppressed)
    const P = CF.player;
    if (!P || !M.list.length) return false;
    const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), cp = Math.cos(P.pitch), sp = Math.sin(P.pitch);
    const o = [P.pos[0], P.pos[1] - 0.9 + 1.62, P.pos[2]], d = [sy * cp, sp, cy * cp];
    const hm = CF.mobHitAt(o, d, 3.5);
    if (!hm) return false;
    const blockT = hit ? Math.hypot(hit.x + 0.5 - o[0], hit.y + 0.5 - o[1], hit.z + 0.5 - o[2]) : 1e9;
    if (hm.t > blockT - 0.5) return false; // block closer -> mine through
    CF.lastSwing = 0;
    if (CF._freshClick) {
      CF._freshClick = false;
      const charge = Math.min(1, (CF.atkTick || 0) / (CF.atkCdInfo ? CF.atkCdInfo() : 20)); // 1.12 charge meter
      const held = CF.held && CF.held(), def = CF.ITEMS[held];
      const base = def && def.tool && def.tool.type === 'sword' ? (SWORD_DMG[held.split('_')[0]] || 4) : 1;
      CF.lastSwing = base * (0.2 + 0.8 * charge);
      CF.atkTick = 0;
      const kx = hm.m.pos[0] - P.pos[0], kz = hm.m.pos[2] - P.pos[2], kl = Math.hypot(kx, kz) || 1;
      hm.m.vel[0] = kx / kl * 4.5; hm.m.vel[2] = kz / kl * 4.5; hm.m.vel[1] = 3.2;
      hm.m.path = null; hm.m.repathT = REPATH_CD;
      M.hurt(hm.m, CF.lastSwing, 'player');
    }
    return true; // mob occupies crosshair: suppress mining entirely
  };
  const origMineStart = CF.mineStart;
  CF.mineStart = (hit) => { if (CF.trySwing(hit)) { CF.mining = null; return; } origMineStart(hit); };

  // ============================ per-tick: physics, AI, burn, spawn ============================
  CF.mobTick = (dt = 0.05) => {
    const W = CF.world, P = CF.player;
    if (!W) return;
    CF.atkTick = (CF.atkTick || 0) + 1;
    aiBudget = REPATH_BUDGET;
    const ai0 = performance.now();
    for (const m of M.list.slice()) {
      const T = CF.MOBS[m.type];
      if (P && T.hostile) aiChase(m, T, P);
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
    if (CF.survival && M.sched !== false && P && M.hostileCount() < HOSTILE_CAP) {
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
    CF.mobAiMs = performance.now() - ai0;
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

  CF.shotScenarios['mob-chase'] = async () => {
    CF.freeCam = true;
    CF.timeOffset = 18000;
    const W = CF.world, P = CF.player;
    W.ensureAround(8, 8, 4);
    for (let i = 0; i < 60 && W.stats().queue; i++) W.tick();
    const h = W.heightAt(8, 8);
    M.clear();
    P.spawn = [8.5, h + 1, 8.5];
    P.tp(8.5, h + 1, 8.5);
    const zx = 20, zz = 8;
    const zh = W.heightAt(zx, zz);
    for (let wx2 = zx - 2; wx2 <= zx + 2; wx2++) for (let wz2 = zz - 2; wz2 <= zz + 2; wz2++) {
      if (wz2 === zz && wx2 === zx - 2) continue; // doorway faces the player
      for (let wy2 = zh + 1; wy2 <= zh + 2; wy2++) W.set(wx2, wy2, wz2, CF.IDOF['cobblestone']);
    }
    const z = M.spawn('zombie', zx + 0.5, zh + 1, zz + 0.5);
    CF.survival = true;
    CF.stats.hp = 9999; // immortal dummy so the shot never catches a death animation
    for (let t = 0; t < 420; t++) {
      CF.mobTick();
      for (let i = M.list.length - 1; i >= 0; i--) if (M.list[i] !== z) M.remove(M.list[i]);
    }
    CF.mobTick = () => {}; // FREEZE sim (mob AI + atkTick drain) but keep the game loop rendering (shots need live frames; stopGameLoop would kill them)
    for (const [tx2, tz2] of [[8, 6], [12, 8], [16, 8]]) W.set(tx2, W.heightAt(tx2, tz2) + 1, tz2, CF.IDOF['torch']);
    for (let i = 0; i < 40; i++) { W.tick(); CF.renderTick(); }
    const d = Math.hypot(P.pos[0] - z.pos[0], P.pos[2] - z.pos[2]);
    const ux = (z.pos[0] - P.pos[0]) / (d || 1), uz = (z.pos[2] - P.pos[2]) / (d || 1);
    const ccx = P.pos[0] - ux * 5, ccz = P.pos[2] - uz * 5, ccy = z.pos[1] + 0.4;
    CF.camera = { pos: [ccx, ccy, ccz], yaw: Math.atan2(z.pos[0] - ccx, z.pos[2] - ccz),
      pitch: -Math.atan2(ccy - z.pos[1], Math.hypot(z.pos[0] - ccx, z.pos[2] - ccz)) };
    CF.renderDraw(CF.camera);
    await new Promise((res) => setTimeout(res, 150));
    CF.shotExtra = { distToPlayer: +d.toFixed(2) };
    CF.renderDraw(CF.camera);
  };

  CF.shotScenarios['mob-fight'] = async () => {
    CF.freeCam = true;
    CF.timeOffset = 18000;
    const W = CF.world, P = CF.player;
    W.ensureAround(8, 8, 4);
    for (let i = 0; i < 60 && W.stats().queue; i++) W.tick();
    const h = W.heightAt(8, 8);
    M.clear(); M.sched = false; // no scheduler noise stealing the frame
    P.spawn = [8.5, h + 1, 8.5];
    P.tp(8.5, h + 1, 8.5); P.onGround = false;
    for (let t = 0; t < 60 && !P.onGround; t++) CF.playerTick();
    // clear the duel clearing so no tree steals the frame
    for (let wx2 = 4; wx2 <= 13; wx2++) for (let wz2 = 4; wz2 <= 13; wz2++) for (let wy2 = h + 1; wy2 <= h + 8; wy2++) W.set(wx2, wy2, wz2, 0);
    // torch the clearing so the night moment is readable (block light hits mobs AND terrain)
    for (const [tx2, tz2] of [[8, 5], [8, 11]]) W.set(tx2, W.heightAt(tx2, tz2) + 1, tz2, CF.IDOF['torch']);
    for (let i = 0; i < 30; i++) { W.tick(); CF.renderTick(); }
    const z = M.spawn('zombie', P.pos[0] + 4.2, W.heightAt(Math.floor(P.pos[0] + 4.2), Math.floor(P.pos[2] + 0.4)) + 1, P.pos[2] + 0.4);
    CF.survival = true;
    for (let t = 0; t < 24; t++) { CF.mobTick(); CF.onTick(); } // mid-stride approach (not yet in melee)
    CF.mobTick = () => {}; // freeze sim at the dramatic frame, keep the render loop alive for the shot
    CF.stats.hp = 12; CF.atkTick = 2; // wounded + mid-cooldown (bare hand cd=5t): the 1.12 fight moment
    CF.survRefresh && CF.survRefresh(); CF.uiRefresh && CF.uiRefresh();
    const dx = z.pos[0] - P.pos[0], dz = z.pos[2] - P.pos[2], dl = Math.hypot(dx, dz) || 1;
    const camx = P.pos[0] - dx / dl * 2.2, camz = P.pos[2] - dz / dl * 2.2, camy = z.pos[1] + 0.35;
    const hd = Math.hypot(z.pos[0] - camx, z.pos[2] - camz);
    CF.camera = { pos: [camx, camy, camz], yaw: Math.atan2(z.pos[0] - camx, z.pos[2] - camz), pitch: -Math.atan2(camy - z.pos[1], hd) };
    CF.renderDraw(CF.camera);
    await new Promise((res) => setTimeout(res, 150));
    CF.shotExtra = { hp: CF.stats.hp, atkTick: CF.atkTick, mobHp: z.hp, mobDist: +Math.hypot(P.pos[0] - z.pos[0], P.pos[2] - z.pos[2]).toFixed(2) };
    CF.renderDraw(CF.camera);
  };

  // --- test suite
  const settle = (n) => { for (let i = 0; i < n && CF.world.stats().queue; i++) CF.world.tick(); };
  CF.mobTests = async (r) => {
    const W = CF.world, P = CF.player, ID = CF.IDOF, S = CF.stats, surv0 = CF.survival, t0 = CF.timeOffset;
    M.clear(); M.sched = false; // deterministic arenas; scheduler gets its own test window
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
    // (sense OFF during this window: AI chase would otherwise pull spawns to the player, MC 1.12 sense=35)
    M.clear(); CF.survival = true; CF.timeOffset = 18000; M.sched = true; CF.mobSense = false;
    W.ensureAround(P.pos[0], P.pos[2], 4); settle(40);
    for (let t = 0; t < 400; t++) CF.mobTick();
    M.sched = false; CF.mobSense = true;
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

    // ---- #036: A* + chase + 1.12 melee (flatten arena so terrain noise can't move the goal)
    M.clear(); CF.survival = false;
    const flat = (x0, x1, z0, z1, h) => {
      W.ensureAround(x0, z0, 1); settle(20); W.ensureAround(x1, z1, 1); settle(20);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
        for (let y = 2; y <= h; y++) W.set(x, y, z, ID['stone']);
        for (let y = h + 1; y <= h + 8; y++) W.set(x, y, z, 0);
      }
    };
    const ax = 160, az = 160;
    flat(ax - 3, ax + 13, az - 3, az + 3, 70);
    const ah = 70;
    // U pocket around start (ax,az): west wall + north/south rows, east open into the corridor
    for (let wy2 = ah + 1; wy2 <= ah + 2; wy2++) {
      for (let wz2 = az - 3; wz2 <= az + 3; wz2++) W.set(ax - 3, wy2, wz2, ID['cobblestone']);
      for (let wx2 = ax - 3; wx2 <= ax + 3; wx2++) { W.set(wx2, wy2, az - 3, ID['cobblestone']); W.set(wx2, wy2, az + 3, ID['cobblestone']); }
    }
    const path = CF.astar(ax, ah + 1, az, ax + 12, ah + 1, az);
    CF.assert(r, 'mob.astar-found(len=' + (path && path.length) + ')', !!path && path.length >= 6);
    const path2 = CF.astar(ax, ah + 1, az, ax, ah + 12, az); // goal unreachable (above sealed pocket) -> exhaust/cap -> null
    CF.assert(r, 'mob.astar-cap(' + (path2 === null ? 'null' : 'len' + path2.length) + ')', path2 === null);
    for (let wx2 = ax - 3; wx2 <= ax + 3; wx2++) for (let wz2 = az - 3; wz2 <= az + 3; wz2++)
      for (let wy2 = ah + 1; wy2 <= ah + 2; wy2++) if (W.get(wx2, wy2, wz2) === ID['cobblestone']) W.set(wx2, wy2, wz2, 0);
    settle(20);

    // chase: pocketed zombie with doorway reaches near the player (A* rounding the wall)
    M.clear(); CF.survival = true; CF.timeOffset = 18000;
    const gx = 240, gz = 240;
    flat(gx - 4, gx + 24, gz - 4, gz + 4, 70);
    const gh = 70;
    P.tp(gx + 0.5, gh + 40, gz + 0.5); // drop onto plain
    P.onGround = false; // tp() keeps the stale flag (player.js contract) - must force a real fall
    for (let t = 0; t < 200 && !P.onGround; t++) CF.playerTick();
    for (let wx2 = gx - 3; wx2 <= gx + 3; wx2++) for (let wz2 = gz - 3; wz2 <= gz + 3; wz2++) {
      if (Math.abs(wx2 - gx) !== 3 && Math.abs(wz2 - gz) !== 3) continue; // ring only
      if (wx2 === gx + 3 && (wz2 === gz || wz2 === gz + 1)) continue; // door faces +X (toward mob side)
      for (let wy2 = gh + 1; wy2 <= gh + 2; wy2++) W.set(wx2, wy2, wz2, ID['cobblestone']);
    }
    const zc2 = M.spawn('zombie', gx + 20.5, gh + 1, gz + 0.5);
    for (let t = 0; t < 900; t++) {
      CF.mobTick();
      for (let z3i = M.list.length - 1; z3i >= 0; z3i--) if (M.list[z3i] !== zc2) M.remove(M.list[z3i]); // scheduler noise out
      if (zc2.dead) break;
    }
    const dChase = Math.hypot(P.pos[0] - zc2.pos[0], P.pos[2] - zc2.pos[2]);
    CF.assert(r, 'mob.chase(d=' + dChase.toFixed(1) + ',path=' + (zc2.path ? zc2.path.length : String(zc2.path)) + ',vel=' + zc2.vel[0].toFixed(2) + ',PonG=' + P.onGround + ')', zc2.hp === 20 && dChase < 3.5);
    let aiOk = CF.mobAiMs !== undefined && CF.mobAiMs < 8;
    CF.assert(r, 'mob.ai-budget(' + (CF.mobAiMs || 0).toFixed(1) + 'ms<8)', aiOk);

    // attack: contact damage -3 with 1.12 rhythm + invuln window (onTick drives hurtCd decay)
    M.clear(); // no leftover chasers may pollute the duel
    const pfx = Math.floor(P.pos[0]), pfz = Math.floor(P.pos[2]);
    flat(pfx - 4, pfx + 4, pfz - 4, pfz + 4, Math.max(40, Math.floor(P.pos[1])));
    P.tp(pfx + 0.5, Math.max(40, Math.floor(P.pos[1])) + 1.9, pfz + 0.5);
    for (let t = 0; t < 40; t++) { CF.playerTick(); CF.onTick(); } // settle landing (absorb fall dmg before the duel)
    CF.survival = true; S.hp = 20;
    const hurtLog = [];
    const odmg = CF.damage;
    CF.damage = (n, why) => { hurtLog.push(why + '(-' + n + '→' + (CF.stats.hp - n) + ')'); odmg(n, why); };
    const zc3 = M.spawn('zombie', P.pos[0] + 1.1, Math.max(40, Math.floor(P.pos[1])) + 1, P.pos[2]);
    for (let t = 0; t < 1; t++) { CF.mobTick(); CF.onTick(); }
    CF.mobTick(); CF.onTick();
    for (let t = 0; t < 8; t++) { CF.mobTick(); CF.onTick(); }
    CF.assert(r, 'mob.attack-hp(' + S.hp + ',' + hurtLog.slice(0, 4).join(' ') + ')', S.hp === 17 && CF.lastHurt === 'mob');
    CF.damage = odmg;
    for (let t = 0; t < 14; t++) { CF.mobTick(); CF.onTick(); }
    CF.assert(r, 'mob.attack-rhythm(' + S.hp + ')', S.hp <= 14);
    M.remove(zc3);
    // creative: zero mob damage
    CF.survival = false; S.hp = 20;
    const zc4 = M.spawn('zombie', P.pos[0] + 1.0, P.pos[1] - 0.9 + 1, P.pos[2]);
    for (let t = 0; t < 60; t++) CF.mobTick();
    CF.assert(r, 'mob.attack-creative(' + S.hp + ')', S.hp === 20);
    M.remove(zc4);

    // player melee: charged sword 6, spam 1.2, kill -> loot
    CF.survival = false;
    CF.inv.fill(null); CF.give('iron_sword', 1); CF.sel = 0;
    const zc5 = M.spawn('zombie', P.pos[0] + 2.2, P.pos[1] - 0.9 + 1, P.pos[2]);
    P.pitch = 0; P.yaw = Math.atan2(zc5.pos[0] - P.pos[0], zc5.pos[2] - P.pos[2]);
    CF.atkTick = 20; CF._freshClick = true;
    CF.mineStart(CF.aim());
    CF.assert(r, 'mob.hit-charge(dmg=' + CF.lastSwing + ',hp=' + zc5.hp + ')', Math.abs(CF.lastSwing - 6) < 0.01 && Math.abs(zc5.hp - 14) < 0.01);
    CF._freshClick = true;
    CF.mineStart(CF.aim());
    CF.assert(r, 'mob.hit-spam(dmg=' + CF.lastSwing + ')', Math.abs(CF.lastSwing - 1.2) < 0.01);
    for (let k = 0; k < 4 && !zc5.dead; k++) { CF.atkTick = 20; CF._freshClick = true; CF.mineStart(CF.aim()); }
    CF.assert(r, 'mob.hit-kill(dead=' + !!zc5.dead + ')', zc5.dead === true && M.list.indexOf(zc5) < 0);
    CF.inv.fill(null);
    let lootT = 0;
    for (let k = 0; k < 8; k++) {
      CF.give('iron_sword', 1); CF.sel = 0;
      const zz = M.spawn('zombie', P.pos[0] + 2.2, P.pos[1] - 0.9 + 1, P.pos[2]);
      P.yaw = Math.atan2(zz.pos[0] - P.pos[0], zz.pos[2] - P.pos[2]);
      for (let s = 0; s < 4 && !zz.dead; s++) { CF.atkTick = 20; CF._freshClick = true; CF.mineStart(CF.aim()); }
      lootT = CF.countItem('rotten_flesh');
    }
    CF.assert(r, 'mob.melee-loot(' + lootT + ')', lootT >= 1);
    CF.atkTick = 0; CF.uiRefresh();
    const bar = document.getElementById('atk');
    const half = bar && bar.style.display === 'block';
    CF.atkTick = 20; CF.uiRefresh();
    CF.assert(r, 'mob.cbt-bar(half=' + half + ',full=' + (bar && bar.style.display) + ')',
      half === true && bar.style.display === 'none');

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
    CF.survival = surv0; CF.timeOffset = t0; CF.freeCam = false; M.sched = true;
    CF.renderDraw(CF.camera || cam);
  };
})();
