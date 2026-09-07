// Mobs (#035 core, #036 AI/combat): entity system (AABB physics, lifecycle, lit-box render) + zombie.
// 1.12 spawn rule: hostile needs max(blockLight, skyLight*dayFactor) <= 7 ("light 0" is 1.18+!).
// #036: heap-A* chase on walkable columns (SPK-4 ALT, sense 35, budget 2/tick) + 1.9-style charge combat.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const GRAV = 32; // same as player (player.js)
  // #039 1.12.2 spawn caps (global, MONSTER/CREATURE categories) + distance bands. Attempt budget throttles
  // the monster cap to a perf-safe trickle given our small load radius.
  const CFG = CF.spawnRules = { monsterCap: 70, creatureCap: 10, ambientCap: 15, min: 24, max: 128, despawnMin: 32, despawnAge: 600, chunkBudget: 6 };

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
    skeleton: { // 1.12.2: bow mob, keeps 4-15 blocks, followRange 20, burns
      w: 0.6, h: 1.95, hp: 20, speed: 2.4, hostile: true, burns: true, ranged: true,
      shootCd: 40, keepMin: 4, keepMax: 15, follow: 20,
      boxes: [
        { cy: 1.7, sx: 0.5, sy: 0.5, sz: 0.5, color: 'skel' },   // skull
        { cy: 0.76, sx: 0.5, sy: 1.1, sz: 0.3, color: 'skelDark' }, // ribs/legs
      ],
      drop: { name: 'bone', min: 0, max: 2, extra: { name: 'arrow', min: 0, max: 2 } }, // bow rare -> #044
    },
    creeper: { // 1.12.2: silent, 30t fuse when <=3 blocks, power-3 explosion, no drop on detonate
      w: 0.6, h: 1.7, hp: 20, speed: 2.4, hostile: true, burns: false, creeper: true, fuse: 30,
      boxes: [
        { cy: 1.45, sx: 0.5, sy: 0.5, sz: 0.5, color: 'cree' },  // head
        { cy: 0.68, sx: 0.55, sy: 0.95, sz: 0.35, color: 'creeDark' }, // body
        { cy: 0.2, sx: 0.5, sy: 0.4, sz: 0.5, color: 'cree' },   // legs
      ],
      drop: { name: 'gunpowder', min: 0, max: 2 }, // only when killed by player; detonation = no drop
    },
    // ---- #038 passives (1.12.2: wander + flee when hurt + breed w/ food; babies grow in 6000t)
    pig: { w: 0.9, h: 0.9, hp: 10, speed: 1.1, passive: true, breed: { food: 'carrot' },
      boxes: [
        { cy: 0.5, sx: 0.62, sy: 0.5, sz: 0.8, color: 'pig' },   // body
        { cy: 0.5, cz: -0.5, sx: 0.5, sy: 0.5, sz: 0.4, color: 'pig' }, // head
        { cy: 0.15, sx: 0.5, sy: 0.32, sz: 0.6, color: 'pig' },   // leg block
      ],
      drop: { name: 'raw_porkchop', min: 1, max: 3 }, // saddle/looting -> #044
    },
    cow: { w: 0.9, h: 1.4, hp: 10, speed: 0.9, passive: true, breed: { food: 'wheat' },
      boxes: [
        { cy: 0.95, sx: 0.64, sy: 0.66, sz: 1.0, color: 'cow' },   // body
        { cy: 1.05, cz: -0.62, sx: 0.5, sy: 0.55, sz: 0.48, color: 'cow' }, // head
        { cy: 0.3, sx: 0.56, sy: 0.6, sz: 0.44, color: 'cow' },    // legs block
      ],
      drop: { name: 'raw_beef', min: 1, max: 3, extra: { name: 'leather', min: 0, max: 2 } },
    },
    sheep: { w: 0.9, h: 1.3, hp: 8, speed: 1.0, passive: true, breed: { food: 'wheat' },
      boxes: [
        { cy: 0.85, sx: 0.72, sy: 0.78, sz: 1.0, color: 'sheep' }, // wool body
        { cy: 1.0, cz: -0.62, sx: 0.42, sy: 0.48, sz: 0.44, color: 'zcloth' }, // face
        { cy: 0.28, sx: 0.5, sy: 0.56, sz: 0.4, color: 'zdark' },  // legs block
      ],
      drop: { name: 'wool', min: 1, max: 1, extra: { name: 'mutton', min: 1, max: 2 } }, // shearing -> #044
    },
  };

  const M = CF.mobs = {
    list: [], nextUid: 1, sched: true, // sched=false used by tests for deterministic arenas
    spawn(type, x, y, z, opts) { // y = FEET level. Raw create (no rules) - shots/tests use this.
      const T = CF.MOBS[type]; if (!T) return null;
      const m = { uid: M.nextUid++, type, pos: [x, y + T.h / 2, z], vel: [0, 0, 0], hp: T.hp, onGround: false, burnT: 0, burning: false, atkCd: 0, path: null, repathT: 0, fuse: 0, shootCd: 0, swell: 0, baby: !!(opts && opts.baby), age: (opts && opts.baby) ? 0 : 6000, love: 0, growCd: 0, wanderT: 0, fleeT: 0 };
      if (opts && opts.vel) m.vel = opts.vel.slice();
      M.list.push(m);
      return m;
    },
    trySpawnAt(type, x, fy, z, opts) { // rule-gated spawn (1.12 light/grass/distance/cap). Returns mob|null.
      const T = CF.MOBS[type]; if (!T) return null;
      const freeSpot = !(opts && opts.ignoreDist);
      if (T.hostile && M.hostileCount() >= CFG.monsterCap) return null;
      if (T.passive && M.passiveCount() >= CFG.creatureCap) return null;
      const bx = Math.floor(x), bz = Math.floor(z);
      if (!CF.solidAt(CF.world.get(bx, fy - 1, bz))) return null;              // stand on solid
      if (CF.world.get(bx, fy, bz) || CF.world.get(bx, fy + 1, bz)) return null; // 2 air clearance
      const packed = CF.world.lightAt(bx, fy, bz);
      const blk = packed & 15, sky = (packed >> 4) * (CF.dayFactor ? CF.dayFactor() : 1);
      if (T.hostile) {
        if (Math.max(blk, sky) > 7) return null; // 1.12: dark (light<=7)
      } else if (T.passive) {
        // 1.12 passive: on grass_block, daylight (sky light 9+), not deep dark
        if (CF.BY_ID[CF.world.get(bx, fy - 1, bz)] && CF.BY_ID[CF.world.get(bx, fy - 1, bz)].name !== 'grass') return null;
        if (sky < 9) return null;
      }
      if (freeSpot && CF.player && Math.hypot(CF.player.pos[0] - x, CF.player.pos[2] - z) < 24) return null; // 1.12 min dist
      return M.spawn(type, x, fy, z, opts);
    },
    hostileCount() { let n = 0; for (const m of M.list) if (CF.MOBS[m.type].hostile) n++; return n; },
    passiveCount() { let n = 0; for (const m of M.list) if (CF.MOBS[m.type].passive) n++; return n; },
    rollDrop(type) {
      const T = CF.MOBS[type]; const d = T.drop; if (!d) return [];
      const out = [];
      const n = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
      if (n > 0) out.push({ name: d.name, n });
      if (d.extra) { const en = d.extra.min + Math.floor(Math.random() * (d.extra.max - d.extra.min + 1)); if (en > 0) out.push({ name: d.extra.name, n: en }); }
      return out;
    },
    hurt(m, n, src) {
      if (m.dead) return;
      m.hp -= n;
      if (CF.MOBS[m.type].passive && !m.dead) m.fleeT = 100; // passives flee when struck (1.12)
      if (m.hp <= 0) {
        m.dead = true;
        if (src === 'player' && !m.baby && CF.give) for (const loot of M.rollDrop(m.type)) CF.give(loot.name, loot.n); // Tier-1: no item entities; player kills -> inventory; babies drop nothing
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
      if (m.vel[1] < 0) {
        m.onGround = true;
        ny = Math.floor(ny - hh) + 1 + hh; // #046: rest on the penetrated surface (stale-y snap ratcheted mobs +1 block/tick)
        for (let g = 0; g < 8 && boxHits(hw, hh, x, ny, z); g++) ny += 1; // push up out of deep penetration
      }
      else ny = Math.ceil(y + hh) - 1 - hh - 0.001;
      m.vel[1] = 0;
    }
    m.pos = [x, ny, z];
    if (ny < -20) m.dead = true;
  };

  // ============================ #036: AI (SPK-4 heap A*) + 1.12 melee ============================
  const STEP_UP = 1, MAX_FALL = 4, NODE_CAP = 1500, REPATH_CD = 20, REPATH_BUDGET = 2;
  const BREED_GROW = 6000, BREED_CD = 6000, PASSIVE_CAP = 10; // 1.12: baby grow + breeding cooldown 5min; passive cap 10
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

  function losClear(m, T, P) { // sample the eye-line; false if a solid blocks it (creeper/skeleton trigger)
    const a = [m.pos[0], m.pos[1] + T.h * 0.2, m.pos[2]], b = [P.pos[0], P.pos[1], P.pos[2]];
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    for (let i = 1; i < n; i++) { const t = i / n; if (CF.solidAt(CF.world.get(Math.floor(a[0] + (b[0] - a[0]) * t), Math.floor(a[1] + (b[1] - a[1]) * t), Math.floor(a[2] + (b[2] - a[2]) * t)))) return false; }
    return true;
  }
  function pathToward(m, T, P) {
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
  function aiChase(m, T, P) {
    if (CF.mobSense === false) return; // test isolation: scheduler windows must not be invalidated by chasing
    const dx = P.pos[0] - m.pos[0], dz = P.pos[2] - m.pos[2], d = Math.hypot(dx, dz);
    const dy = Math.abs(P.pos[1] - m.pos[1]);
    const sense = T.follow || 35; // zombie MC sense 35; skeleton followRange 20
    if (d > sense || dy > 12) { m.path = null; m.vel[0] = m.vel[2] = 0; m.swell = 0; m.fuse = 0; return; } // lost target -> fuse aborts

    if (T.creeper) {
      if (d <= 3 && dy <= 2.5 && losClear(m, T, P)) { // begin/advance fuse; swell drives the flash+grow render
        m.vel[0] = m.vel[2] = 0; m.path = null;
        if (m.fuse++ >= T.fuse) { M.explode(m); return; }
        m.swell = m.fuse / T.fuse;
        return;
      }
      if (m.fuse) { m.fuse = 0; m.swell = 0; } // lost target -> abort (1.12: LOS break resets)
      pathToward(m, T, P); // silent approach
      return;
    }

    if (T.ranged) {
      const clear = losClear(m, T, P);
      if (d < T.keepMin) { steer(m, P.pos[0] - dx / (d || 1) * 6, P.pos[2] - dz / (d || 1) * 6, T.speed); m.path = null; } // back off
      else if (d <= T.keepMax && clear) {
        m.vel[0] = m.vel[2] = 0; m.path = null;
        if (--m.shootCd <= 0) { m.shootCd = T.shootCd; fireArrow(m, T, P); }
      } else pathToward(m, T, P);
      return;
    }

    if (d < 1.35 && dy < 2.2) { // melee reach
      m.vel[0] = m.vel[2] = 0; m.path = null;
      if (--m.atkCd <= 0) { m.atkCd = 20; if (CF.survival) CF.damage(T.dmg || 3, 'mob'); } // NORMAL difficulty
      return;
    }
    m.atkCd = 0;
    pathToward(m, T, P);
  }
  // creeper detonation: explode + remove (no loot - it blew itself up)
  M.explode = (m) => { const T = CF.MOBS[m.type]; m.dead = true; if (CF.explode) CF.explode(m.pos[0], m.pos[1], m.pos[2], T.power || 3); M.remove(m); };

  // --- #038 passive AI: idle wander + flee-when-hurt + grow up; breeding handled in M.breedScan
  function aiPassive(m, T, P) {
    if (m.baby && ++m.age >= BREED_GROW) m.baby = false;
    if (m.love > 0) m.love--;
    if (m.growCd > 0) m.growCd--;
    if (CF.mobSense === false) return;
    if (m.fleeT > 0 && P) { // run directly away from the player
      m.fleeT--; const dx = m.pos[0] - P.pos[0], dz = m.pos[2] - P.pos[2], l = Math.hypot(dx, dz) || 1;
      steer(m, m.pos[0] + dx / l * 6, m.pos[2] + dz / l * 6, T.speed * 1.6); m.path = null; return;
    }
    if (m.wanderT-- <= 0) { // pick a fresh stroll direction (1.12 RandomStroll)
      const a = Math.random() * Math.PI * 2; m.wdx = Math.cos(a); m.wdz = Math.sin(a); m.wanderT = 40 + Math.floor(Math.random() * 80);
    }
    steer(m, m.pos[0] + m.wdx * 4, m.pos[2] + m.wdz * 4, T.speed);
  }
  M.breedScan = () => {
    const ready = (m) => CF.MOBS[m.type].breed && !m.baby && m.love > 0 && m.growCd <= 0;
    for (const a of M.list.slice()) {
      if (!ready(a)) continue;
      for (const b of M.list) {
        if (b !== a && b.type === a.type && ready(b) && Math.hypot(a.pos[0] - b.pos[0], a.pos[2] - b.pos[2]) < 6 && Math.abs(a.pos[1] - b.pos[1]) < 3) {
          a.love = b.love = 0; a.growCd = b.growCd = BREED_CD;
          const fy = Math.max(0, Math.floor((a.pos[1] + b.pos[1]) / 2 - CF.MOBS[a.type].h / 2));
          M.spawn(a.type, (a.pos[0] + b.pos[0]) / 2, fy, (a.pos[2] + b.pos[2]) / 2, { baby: true });
          break;
        }
      }
    }
  };
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
  CF.mobFeed = () => { // 1.12: RMB a passive adult with its breed food -> love (feeds from inventory)
    const P = CF.player; if (!P || !M.list.length) return false;
    const held = CF.held && CF.held(); if (!held) return false;
    const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), cp = Math.cos(P.pitch), sp = Math.sin(P.pitch);
    const hm = CF.mobHitAt([P.pos[0], P.pos[1] - 0.9 + 1.62, P.pos[2]], [sy * cp, sp, cy * cp], 4);
    if (!hm) return false;
    const m = hm.m, T = CF.MOBS[m.type];
    if (!T.breed || m.baby || m.growCd > 0 || T.breed.food !== held) return false;
    if (CF.consume && !CF.consume(held, 1)) return false;
    m.love = 60; // 3s love window; M.breedScan pairs two ready adults
    return true;
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

  // --- arrow projectiles (skeleton). Ballistic w/ predictive aim so they actually threaten.
  const ARROW_G = 20, ARROW_SPD = 24;
  CF.projectiles = [];
  function fireArrow(m, T, P) {
    const ox = m.pos[0], oy = m.pos[1] + T.h * 0.25, oz = m.pos[2];
    const dx = P.pos[0] - ox, dz = P.pos[2] - oz, dh = Math.hypot(dx, dz) || 1;
    const t = Math.max(0.15, dh / ARROW_SPD);
    const spread = 0.6; // 1.12 skeleton inaccuracy (normal) -> slight random offset
    const tx = P.pos[0] + (Math.random() - 0.5) * spread, tz = P.pos[2] + (Math.random() - 0.5) * spread;
    const tdx = tx - ox, tdz = tz - oz, tdh = Math.hypot(tdx, tdz) || 1;
    const dist = Math.hypot(dx, dz, P.pos[1] - oy);
    CF.arrowFired = (CF.arrowFired || 0) + 1;
    CF.projectiles.push({
      pos: [ox, oy, oz],
      vel: [tdx / tdh * ARROW_SPD, (P.pos[1] - oy) / t + 0.5 * ARROW_G * t, tdz / tdh * ARROW_SPD], // 1.12: closer = harder (1..5)
      dmg: Math.max(1, Math.min(5, Math.round(5 - dist / 5))), life: 0,
    });
  }
  function projectileTick(dt) {
    const W = CF.world, P = CF.player;
    for (let i = CF.projectiles.length - 1; i >= 0; i--) {
      const a = CF.projectiles[i];
      a.vel[1] -= ARROW_G * dt;
      a.pos[0] += a.vel[0] * dt; a.pos[1] += a.vel[1] * dt; a.pos[2] += a.vel[2] * dt;
      a.life++;
      let gone = a.life > 300 || a.pos[1] < -10;
      if (!gone && CF.solidAt(W.get(Math.floor(a.pos[0]), Math.floor(a.pos[1]), Math.floor(a.pos[2])))) gone = true; // hit block
      if (!gone && P && CF.survival && Math.abs(a.pos[0] - P.pos[0]) < 0.5 && Math.abs(a.pos[2] - P.pos[2]) < 0.5 && a.pos[1] > P.pos[1] - 1 && a.pos[1] < P.pos[1] + 1) {
        CF.damage(a.dmg, 'arrow'); gone = true;
      }
      if (gone) CF.projectiles.splice(i, 1);
    }
  }

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
      else if (T.passive) aiPassive(m, T, P);
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
      // #039 1.12 despawn bands (hostiles only; animals persist): >128 instant, 32..128 random once aged past 30s
      if (P && T.hostile) {
        const d = Math.hypot(P.pos[0] - m.pos[0], P.pos[2] - m.pos[2]);
        if (d > CFG.max) { M.remove(m); continue; }
        if (d > CFG.despawnMin) m.age2 = (m.age2 || 0) + 1; else m.age2 = 0;
        if (m.age2 > CFG.despawnAge && Math.random() < 1 / 20 / (d - CFG.despawnMin + 1)) { M.remove(m); continue; } // MC: 1/(dist-31) chance/t after 600t
      }
    }
    // ================= #039 per-chunk scheduler (1.12 spawnStructure-style) =================
    // Scan every loaded chunk in the [min..max] player shell; a small ATTEMPT budget per tick keeps it cheap
    // (chunk distance test is free). Light/type/distance rules live in trySpawnAt; caps are MC category ceilings.
    if (CF.survival && M.sched !== false && P) {
      let attempts = CFG.chunkBudget; // attempts (not chunk visits) per tick
      for (const [k] of W.chunks) {
        if (attempts <= 0) break;
        const [ccx, ccz] = k.split(',').map(Number);
        const cx = ccx * 16 + 8, cz = ccz * 16 + 8;
        const d = Math.hypot(cx - P.pos[0], cz - P.pos[2]);
        if (d < CFG.min - 8 || d > CFG.max) continue; // chunk roughly in the spawn shell
        const ch = W.chunks.get(k);
        if (ch && !ch.light) W.ensureLight(ccx, ccz); // relight once, never per-tick
        const x = (ccx * 16 + Math.floor(Math.random() * 16)), z = (ccz * 16 + Math.floor(Math.random() * 16));
        const fy = W.heightAt(x, z) + 1;
        const dayOk = CF.dayFactor && CF.dayFactor() > 0.7;
        let type = null;
        if (M.hostileCount() < CFG.monsterCap) { const r = Math.random(); type = r < 0.5 ? 'zombie' : r < 0.8 ? 'skeleton' : 'creeper'; }
        if (type && M.trySpawnAt(type, x + 0.5, fy, z + 0.5)) { attempts--; continue; }
        if (dayOk && M.passiveCount() < CFG.creatureCap && Math.random() < 0.1) {
          const r = Math.random(), pt = r < 0.34 ? 'pig' : r < 0.67 ? 'cow' : 'sheep';
          if (M.trySpawnAt(pt, x + 0.5, fy, z + 0.5)) attempts--;
        }
      }
    }
    M.breedScan();
    projectileTick(dt);
    CF.mobAiMs = performance.now() - ai0;
  };
  const hh = (m) => CF.MOBS[m.type].h / 2;

  // --- render feed: world-space boxes, vertex layout matches chunk stream (pos3 + uv/shade + light)
  function addBox(out, x, y, z, sx, sy, sz, col, light) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const X0 = x - hx, X1 = x + hx, Y0 = y - hy, Y1 = y + hy, Z0 = z - hz, Z1 = z + hz;
    const u = (col + 0.5) / 16;
    const face = (v, shade) => { for (const oi of [0, 1, 2, 0, 2, 3]) out.push(v[oi][0], v[oi][1], v[oi][2], u, 0.5, shade, light); };
    face([[X1, Y0, Z0], [X1, Y0, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], 0.8);
    face([[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0]], 0.6);
    face([[X0, Y1, Z0], [X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], 1.0);
    face([[X0, Y0, Z0], [X0, Y0, Z1], [X1, Y0, Z1], [X1, Y0, Z0]], 0.5);
    face([[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]], 0.8);
    face([[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y1, Z0], [X0, Y1, Z0]], 0.6);
  }
  CF.buildMobVerts = (cam) => {
    if ((!M.list.length && !CF.projectiles.length) || !cam || !CF.MOBCOLOR) return null;
    const out = [], C = CF.MOBCOLOR, W = CF.world;
    for (const m of M.list) {
      if (Math.hypot(m.pos[0] - cam.pos[0], m.pos[2] - cam.pos[2]) > 64) continue;
      const packed = W.lightAt(Math.floor(m.pos[0]), Math.floor(m.pos[1]), Math.floor(m.pos[2]));
      let light = packed / 255;
      const swell = m.swell || 0;
      const feet = m.pos[1] - hh(m) * (m.baby ? 0.5 : 1);
      const burn = m.burning && ((CF.ticks + m.uid) & 1); // hurt/burn flash: flicker bright each frame-parity
      const g = (1 + swell * 0.35) * (m.baby ? 0.5 : 1); // babies render at half scale (1.12)
      for (const b of CF.MOBS[m.type].boxes) {
        let col = C[b.color] || 0;
        if (swell > 0.6 && (CF.ticks & 1)) col = C.creeFlash; // creeper pre-blast white flash
        if (burn) light = Math.max(light, 0.9); // on-fire mobs glow
        addBox(out, m.pos[0] + (b.cx || 0) * g, feet + b.cy * g, m.pos[2] + (b.cz || 0) * g, b.sx * g, b.sy * g, b.sz * g, col, light);
      }
    }
    // arrows: thin box aligned to velocity
    for (const a of CF.projectiles) {
      if (Math.hypot(a.pos[0] - cam.pos[0], a.pos[2] - cam.pos[2]) > 64) continue;
      const packed = W.lightAt(Math.floor(a.pos[0]), Math.floor(a.pos[1]), Math.floor(a.pos[2]));
      const vl = Math.hypot(a.vel[0], a.vel[1], a.vel[2]) || 1, ux = a.vel[0] / vl, uy = a.vel[1] / vl, uz = a.vel[2] / vl;
      addBoxOriented(out, a.pos[0], a.pos[1], a.pos[2], ux, uy, uz, 0.5, 0.06, C.arrow || 13, packed / 255);
    }
    // #042 primed TNT: red block, flashes white near detonation
    if (CF.tnts) for (const t of CF.tnts) {
      if (Math.hypot(t.pos[0] - cam.pos[0], t.pos[2] - cam.pos[2]) > 64) continue;
      const flash = t.fuse < 20 && (CF.ticks & 1);
      const s = 1 + Math.max(0, 0.25 - t.fuse / CF.FUSE * 0.25); // swell just before boom
      addBox(out, t.pos[0], t.pos[1], t.pos[2], 0.9 * s, 0.9 * s, 0.9 * s, flash ? C.white : (C.tnt != null ? C.tnt : 15), (CF.world.lightAt(Math.floor(t.pos[0]), Math.floor(t.pos[1]), Math.floor(t.pos[2])) / 255) || 0.6);
    }
    return out.length ? Float32Array.from(out) : null;
  };
  // axis-aligned-ish thin box stretched along a unit dir (good enough for a flying arrow)
  function addBoxOriented(out, x, y, z, ux, uy, uz, len, r, col, light) {
    const hx = Math.max(r, Math.abs(ux) * len / 2), hy = Math.max(r, Math.abs(uy) * len / 2), hz = Math.max(r, Math.abs(uz) * len / 2);
    addBox(out, x, y, z, hx * 2, hy * 2, hz * 2, col, light);
  }

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

  // #037 scenario: skeleton with an arrow in flight at night (torch-lit clearing)
  CF.shotScenarios['mob-skel'] = async () => {
    CF.freeCam = true; CF.timeOffset = 18000;
    const W = CF.world, P = CF.player;
    W.ensureAround(8, 8, 4); for (let i = 0; i < 60 && W.stats().queue; i++) W.tick();
    const h = W.heightAt(8, 8);
    M.clear(); M.sched = false; CF.projectiles.length = 0;
    for (let bx = 4; bx <= 20; bx++) for (let bz = 4; bz <= 12; bz++) for (let by = h + 1; by <= h + 8; by++) W.set(bx, by, bz, 0); // clearing
    for (const [tx, tz] of [[8, 6], [8, 10]]) W.set(tx, W.heightAt(tx, tz) + 1, tz, CF.IDOF['torch']);
    P.spawn = [8.5, h + 1, 8.5]; P.tp(8.5, h + 1, 8.5); P.onGround = false;
    for (let t = 0; t < 60 && !P.onGround; t++) CF.playerTick();
    const sk = M.spawn('skeleton', 13.5, W.heightAt(13, 8) + 1, 8.5);
    CF.survival = true; CF.stats.hp = 9999;
    for (let i = 0; i < 30; i++) { W.tick(); CF.renderTick(); }
    for (let t = 0; t < 45; t++) { CF.mobTick(); CF.onTick(); } // skeleton fires at least once
    CF.mobTick = () => {}; CF.mobSense = false;
    CF.projectiles.push({ pos: [11.5, P.pos[1] + 0.2, 8.4], vel: [-22, -0.5, 0], dmg: 3, life: 2 }); // guarantee a visible arrow mid-flight
    CF.camera = { pos: [P.pos[0] - 1.5, P.pos[1] + 0.6, P.pos[2]], yaw: Math.atan2(sk.pos[0] - (P.pos[0] - 1.5), sk.pos[2] - P.pos[2]), pitch: -0.03 };
    CF.renderDraw(CF.camera); await new Promise((r) => setTimeout(r, 150));
    CF.shotExtra = { fired: CF.arrowFired, proj: CF.projectiles.length, skelHp: sk.hp };
    CF.renderDraw(CF.camera);
  };

  // #037 scenario: creeper mid-fuse (white flashing, swelling) about to blow next to the player
  CF.shotScenarios['mob-creeper'] = async () => {
    CF.freeCam = true; CF.timeOffset = 18000;
    const W = CF.world, P = CF.player;
    W.ensureAround(8, 8, 4); for (let i = 0; i < 60 && W.stats().queue; i++) W.tick();
    const h = W.heightAt(8, 8);
    M.clear(); M.sched = false;
    for (let bx = 4; bx <= 16; bx++) for (let bz = 4; bz <= 12; bz++) for (let by = h + 1; by <= h + 8; by++) W.set(bx, by, bz, 0);
    for (const [tx, tz] of [[6, 8], [13, 8]]) W.set(tx, W.heightAt(tx, tz) + 1, tz, CF.IDOF['torch']);
    P.spawn = [8.5, h + 1, 8.5]; P.tp(8.5, h + 1, 8.5); P.onGround = false;
    for (let t = 0; t < 60 && !P.onGround; t++) CF.playerTick();
    const cr = M.spawn('creeper', P.pos[0] + 2.4, P.pos[1] - 0.9 + 1, P.pos[2]);
    CF.survival = true; CF.stats.hp = 9999;
    for (let i = 0; i < 30; i++) { W.tick(); CF.renderTick(); }
    for (let t = 0; t < 22; t++) { CF.mobTick(); } // fuse at ~22/30, swelling + flashing
    CF.mobTick = () => {}; CF.mobSense = false; CF.stats.hp = 9999;
    CF.survRefresh && CF.survRefresh(); CF.uiRefresh && CF.uiRefresh();
    const dx = cr.pos[0] - P.pos[0], dz = cr.pos[2] - P.pos[2], dl = Math.hypot(dx, dz) || 1;
    const camx = P.pos[0] - dx / dl * 3, camz = P.pos[2] - dz / dl * 3, camy = cr.pos[1] + 0.3;
    CF.camera = { pos: [camx, camy, camz], yaw: Math.atan2(cr.pos[0] - camx, cr.pos[2] - camz), pitch: -Math.atan2(camy - cr.pos[1], Math.hypot(cr.pos[0] - camx, cr.pos[2] - camz)) };
    CF.renderDraw(CF.camera); await new Promise((r) => setTimeout(r, 150));
    CF.shotExtra = { fuse: cr.fuse, swell: +cr.swell.toFixed(2) };
    CF.renderDraw(CF.camera);
  };

  // #038 scenario: a peaceful farm pen - pig, cow, sheep + a baby - grazing on grass in daylight
  CF.shotScenarios['mob-farm'] = async () => {
    CF.freeCam = true; CF.timeOffset = 600; // bright day
    const W = CF.world, P = CF.player;
    const fx = 260, fz = 100;
    W.ensureAround(fx, fz, 2); for (let i = 0; i < 40 && W.stats().queue; i++) W.tick();
    M.clear(); M.sched = false; CF.projectiles.length = 0; CF.survival = false; CF.mobSense = false;
    for (let bx = fx - 6; bx <= fx + 6; bx++) for (let bz = fz - 6; bz <= fz + 6; bz++) { W.set(bx, 100, bz, CF.IDOF['grass']); for (let by = 101; by <= 109; by++) W.set(bx, by, bz, 0); }
    for (let i = 0; i < 10; i++) W.tick(); W.ensureLight(fx >> 4, fz >> 4); for (let i = 0; i < 10; i++) W.tick();
    M.spawn('pig', fx - 2.5, 101, fz);
    M.spawn('cow', fx + 0.5, 101, fz);
    M.spawn('sheep', fx + 3.5, 101, fz);
    M.spawn('pig', fx - 0.5, 101, fz + 2.5, { baby: true });
    for (let s = 0; s < 6; s++) M.list.forEach((mm) => M.step(mm)); // settle all onto the floor
    CF.mobTick = () => {};
    for (let i = 0; i < 40; i++) CF.renderTick();
    const cx = fx, cz = fz - 7;
    CF.camera = { pos: [cx, 103.2, cz], yaw: 0, pitch: -0.14 };
    CF.renderDraw(CF.camera); await new Promise((res) => setTimeout(res, 150));
    CF.shotExtra = { animals: M.list.length };
    CF.renderDraw(CF.camera);
  };

  // #039 scenario: the night is dangerous - run the real per-chunk scheduler and show a crowd of hostiles
  CF.shotScenarios['mob-crowd'] = async () => {
    CF.freeCam = true; CF.timeOffset = 18000;
    const W = CF.world, P = CF.player;
    W.ensureAround(8, 8, 5); for (let i = 0; i < 120 && W.stats().queue; i++) W.tick();
    const h = W.heightAt(8, 8);
    M.clear(); M.sched = true; CF.mobSense = false; CF.survival = true; P.spawn = [8.5, h + 1, 8.5];
    P.tp(8.5, h + 1, 8.5); P.onGround = false; for (let t = 0; t < 60 && !P.onGround; t++) CF.playerTick();
    CF.stats.hp = 9999;
    for (let t = 0; t < 400; t++) CF.mobTick();
    M.sched = false; CF.mobTick = () => {}; // freeze the crowd
    for (let i = 0; i < 60; i++) CF.renderTick();
    const mobs = M.list.slice(0, 4);
    CF.camera = { pos: [8.5, h + 3, 8.5 - 6], yaw: 0.15, pitch: -0.12 };
    CF.renderDraw(CF.camera); await new Promise((res) => setTimeout(res, 150));
    CF.shotExtra = { hostiles: M.list.length, near: mobs.length };
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

    // #039 per-chunk scheduler over 400 night ticks: spawns happen, all in 24..128 band, cap = MC 70
    // (sense OFF during this window: AI chase would otherwise pull spawns to the player, MC 1.12 sense=35)
    M.clear(); CF.survival = true; CF.timeOffset = 18000; M.sched = true; CF.mobSense = false;
    W.ensureAround(P.pos[0], P.pos[2], 5); settle(60);
    for (let t = 0; t < 400; t++) CF.mobTick();
    M.sched = false; CF.mobSense = true;
    let minD = 1e9, maxD = 0; for (const z2 of M.list) { const dd = Math.hypot(P.pos[0] - z2.pos[0], P.pos[2] - z2.pos[2]); minD = Math.min(minD, dd); maxD = Math.max(maxD, dd); }
    CF.assert(r, 'mob.spawn-night(' + M.list.length + ' spawned)', M.list.length >= 1);
    CF.assert(r, 'mob.min-dist(min=' + minD.toFixed(1) + '>=20)', M.list.length === 0 || minD >= 20);
    CF.assert(r, 'mob.max-dist(max=' + maxD.toFixed(1) + '<=128)', maxD <= 132); // band 24..128 (slack for post-spawn settling)
    CF.assert(r, 'mob.cap(' + M.list.length + '<=' + CFG.monsterCap + ')', M.list.length <= CFG.monsterCap);
    // #039 despawn: teleport a lone hostile far (over max) -> next tick removes it; within band it survives
    M.clear(); const far = M.spawn('zombie', P.pos[0] + 200, Math.max(40, W.heightAt(Math.floor(P.pos[0]) + 200, Math.floor(P.pos[2])) + 1), P.pos[2]);
    CF.mobTick();
    CF.assert(r, 'mob.despawn-instant(>128)', M.list.indexOf(far) < 0);
    const nearKeep = M.spawn('zombie', P.pos[0] + 10, Math.max(40, W.heightAt(Math.floor(P.pos[0]) + 10, Math.floor(P.pos[2])) + 1), P.pos[2]);
    for (let t = 0; t < 50; t++) CF.mobTick();
    CF.assert(r, 'mob.despawn-stays-in-band', M.list.indexOf(nearKeep) >= 0);
    M.clear();

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

    // ================= #037: skeleton ranged + creeper fuse + explosion =================
    CF.survival = false; M.clear(); CF.projectiles.length = 0;
    // --- explosion crater (synthetic stone blob in the sky, deterministic, mob-independent)
    const ex = 304, ey = 100, ez = 304;
    W.ensureAround(ex, ez, 2); settle(30);
    for (let bx = ex - 6; bx <= ex + 6; bx++) for (let by = ey - 6; by <= ey + 6; by++) for (let bz = ez - 6; bz <= ez + 6; bz++) W.set(bx, by, bz, ID['stone']);
    W.set(ex + 1, ey, ez, ID['obsidian']); // must survive (blastRes 1200)
    let before = 0; for (let bx = ex - 6; bx <= ex + 6; bx++) for (let by = ey - 6; by <= ey + 6; by++) for (let bz = ez - 6; bz <= ez + 6; bz++) if (W.get(bx, by, bz)) before++;
    const rex = CF.explode(ex, ey, ez, 3);
    CF.assert(r, 'mob.explode-crater(' + rex.destroyed + '/' + before + ')', rex.destroyed > 30 && W.get(ex, ey, ez) === 0);
    CF.assert(r, 'mob.explode-obsidian', W.get(ex + 1, ey, ez) === ID['obsidian']);
    for (let bx = ex - 6; bx <= ex + 6; bx++) for (let by = ey - 6; by <= ey + 6; by++) for (let bz = ez - 6; bz <= ez + 6; bz++) W.set(bx, by, bz, 0);

    // --- skeleton: shoots arrows when in 4..15 range with LOS; burns at noon
    // clear vegetation along the LOS corridors so terrain can't block sight (deterministic)
    const clearLOS = (x0, z0, x1, z1, y) => {
      for (let s = 0; s <= 10; s++) { const bx = Math.round(x0 + (x1 - x0) * s / 10), bz = Math.round(z0 + (z1 - z0) * s / 10); for (let by = y; by <= y + 3; by++) if (W.get(bx, by, bz) !== ID['stone']) W.set(bx, by, bz, 0); }
    };
    CF.survival = true; CF.timeOffset = 6000;
    const skx = 200, skz = 200;
    W.ensureAround(skx, skz, 2); settle(30); W.ensureLight(skx >> 4, skz >> 4);
    M.clear(); const skh = W.heightAt(skx, skz);
    P.tp(skx + 0.5, skh + 20, skz + 0.5); P.onGround = false;
    for (let t = 0; t < 200 && !P.onGround; t++) CF.playerTick();
    S.hp = 20;
    clearLOS(skx + 0.5, skz + 0.5, skx + 8.5, skz + 0.5, skh + 1); // open the shot corridor
    M.spawn('skeleton', skx + 8.5, skh + 1, skz + 0.5);
    CF.arrowFired = 0;
    for (let t = 0; t < 80 && CF.arrowFired < 1; t++) { CF.mobTick(); CF.onTick(); }
    CF.assert(r, 'mob.skel-shoot(fired=' + CF.arrowFired + ')', CF.arrowFired >= 1);
    // arrow block hit: aim one into a wall, tick, must be consumed by geometry
    for (let yy = Math.floor(P.pos[1]) - 1; yy <= Math.floor(P.pos[1]) + 2; yy++) W.set(Math.floor(P.pos[0]) + 2, yy, Math.floor(P.pos[2]), ID['stone']);
    CF.projectiles.push({ pos: [P.pos[0] + 0.6, P.pos[1], P.pos[2]], vel: [30, 0, 0], dmg: 2, life: 0 });
    const beforeProj = CF.projectiles.length;
    for (let t = 0; t < 20 && CF.projectiles.length >= beforeProj; t++) CF.mobTick();
    CF.assert(r, 'mob.arrow-block-hit', CF.projectiles.length < beforeProj);
    for (let yy = Math.floor(P.pos[1]) - 1; yy <= Math.floor(P.pos[1]) + 2; yy++) W.set(Math.floor(P.pos[0]) + 2, yy, Math.floor(P.pos[2]), 0);
    // skeleton burns at noon (open sky) like the zombie
    M.clear(); CF.mobSense = false; // isolate burn from its shooting/chasing
    const sk2 = M.spawn('skeleton', skx + 0.5, skh + 1, skz + 0.5);
    for (let t = 0; t < 600 && M.list.indexOf(sk2) >= 0; t++) CF.mobTick();
    CF.assert(r, 'mob.skel-burn(hp=' + sk2.hp + ')', sk2.hp <= 0);
    CF.mobSense = true;

    // --- creeper: fuses then detonates when close; aborts if you escape; never burns.
    // Synthetic sky platform so terrain/holes can't desync the duel (player not ticked, just mobs).
    CF.survival = true; CF.timeOffset = 18000; M.clear();
    const cxp = 140, czp = 100;
    W.ensureAround(cxp, czp, 1); settle(20);
    for (let bx = cxp - 4; bx <= cxp + 4; bx++) for (let bz = czp - 4; bz <= czp + 4; bz++) { W.set(bx, 100, bz, ID['stone']); for (let by = 101; by <= 107; by++) W.set(bx, by, bz, 0); }
    const duel = () => { for (let bx = cxp - 4; bx <= cxp + 4; bx++) for (let bz = czp - 4; bz <= czp + 4; bz++) { W.set(bx, 100, bz, ID['stone']); for (let by = 101; by <= 107; by++) W.set(bx, by, bz, 0); } P.vel[0] = P.vel[1] = P.vel[2] = 0; P.onGround = true; P.tp(cxp + 0.5, 100 + 1 + 0.9, czp + 0.5); S.hp = 100; };
    duel();
    const cr = M.spawn('creeper', P.pos[0] + 2.4, 101, P.pos[2]);
    let sawSwell = false;
    for (let t = 0; t < 60 && M.list.indexOf(cr) >= 0; t++) { CF.mobTick(); if (cr.swell > 0) sawSwell = true; }
    CF.assert(r, 'mob.creeper-boom(swel=' + sawSwell + ',gone=' + (M.list.indexOf(cr) < 0) + ',f=' + cr.fuse + ',d=' + Math.hypot(P.pos[0] - cr.pos[0], P.pos[2] - cr.pos[2]).toFixed(1) + ')', sawSwell === true && M.list.indexOf(cr) < 0);
    // abort: start fuse, teleport player far -> fuse resets, creeper survives
    M.clear(); duel();
    const cr2 = M.spawn('creeper', P.pos[0] + 2.2, 101, P.pos[2]);
    for (let t = 0; t < 10; t++) CF.mobTick();
    P.tp(cxp + 40.5, 101.9, czp + 0.5);
    const fused = cr2.fuse;
    for (let t = 0; t < 60; t++) CF.mobTick();
    CF.assert(r, 'mob.creeper-abort(f=' + fused + '->' + cr2.fuse + ',alive=' + (M.list.indexOf(cr2) >= 0) + ')', fused > 0 && cr2.fuse === 0 && M.list.indexOf(cr2) >= 0);
    // creeper never burns in daylight (burns:false)
    M.clear(); CF.timeOffset = 6000; CF.survival = false;
    const cr3 = M.spawn('creeper', cxp + 0.5, 101, czp + 0.5);
    for (let t = 0; t < 400; t++) CF.mobTick();
    CF.assert(r, 'mob.creeper-no-burn(hp=' + cr3.hp + ')', cr3.hp === 20 && cr3.burning === false);
    M.clear(); CF.projectiles.length = 0;

    // ================= #038: passives - drops, breed (feed+love+baby+grow), wander/flee, spawn rule =================
    CF.survival = false; CF.mobSense = true; M.clear();
    const pgx = 260, pgz = 100;
    W.ensureAround(pgx, pgz, 2); settle(30); W.ensureLight(pgx >> 4, pgz >> 4);
    const plat = () => { for (let bx = pgx - 5; bx <= pgx + 5; bx++) for (let bz = pgz - 5; bz <= pgz + 5; bz++) { W.set(bx, 100, bz, ID['grass']); for (let by = 101; by <= 108; by++) W.set(bx, by, bz, 0); } W.ensureLight(pgx >> 4, pgz >> 4); for (let i = 0; i < 8; i++) W.tick(); P.vel = [0, 0, 0]; P.onGround = true; P.tp(pgx + 0.5, 101.9, pgz + 0.5); };
    plat();
    // drops per species (player-killed)
    CF.inv.fill(null);
    const pk = M.spawn('pig', pgx + 2.5, 101, pgz); M.hurt(pk, 999, 'player');
    CF.assert(r, 'mob.passive-pig-drop(' + CF.countItem('raw_porkchop') + ')', CF.countItem('raw_porkchop') >= 1 && CF.countItem('raw_porkchop') <= 3);
    CF.inv.fill(null); const sh = M.spawn('sheep', pgx + 2.5, 101, pgz); M.hurt(sh, 999, 'player');
    CF.assert(r, 'mob.passive-sheep-drop(wool=' + CF.countItem('wool') + ',mutton=' + CF.countItem('mutton') + ')', CF.countItem('wool') === 1 && CF.countItem('mutton') >= 1);
    CF.inv.fill(null); const cw = M.spawn('cow', pgx + 2.5, 101, pgz); M.hurt(cw, 999, 'player');
    CF.assert(r, 'mob.passive-cow-drop(beef=' + CF.countItem('raw_beef') + ',leather=' + CF.countItem('leather') + ')', CF.countItem('raw_beef') >= 1);
    // baby drops nothing (1.12)
    CF.inv.fill(null); const bab = M.spawn('pig', pgx + 2.5, 101, pgz, { baby: true }); M.hurt(bab, 999, 'player');
    CF.assert(r, 'mob.passive-baby-nodrop(' + CF.countItem('raw_porkchop') + ')', CF.countItem('raw_porkchop') === 0);

    // breeding: mobFeed (aim+carrot->love) then two love adults pair -> baby + parent cooldown
    plat(); CF.survival = true; M.clear();
    CF.inv.fill(null); CF.give('wheat', 1); CF.sel = 0;
    const fc = M.spawn('cow', pgx + 3.0, 101, pgz + 0.5);
    P.yaw = Math.atan2(fc.pos[0] - P.pos[0], fc.pos[2] - P.pos[2]); P.pitch = -0.05;
    const fed = CF.mobFeed();
    CF.assert(r, 'mob.breed-feed(fed=' + fed + ',love=' + fc.love + ',wheat=' + CF.countItem('wheat') + ')', fed === true && fc.love > 0 && CF.countItem('wheat') === 0);
    // second ready adult nearby -> breedScan spawns a baby and sets both growCd
    const fc2 = M.spawn('cow', pgx + 4.0, 101, pgz + 0.5); fc2.love = 60;
    const beforeN = M.list.length; CF.mobTick(); // runs breedScan
    const baby = M.list.find((mm) => mm.baby);
    CF.assert(r, 'mob.breed-baby(n=' + M.list.length + '/' + beforeN + ',cd=' + fc2.growCd + ')', M.list.length === beforeN + 1 && !!baby && baby.type === 'cow' && fc2.growCd === 6000);
    // cooldown blocks immediate re-breed; baby grows after 6000t
    const fc3 = M.spawn('cow', pgx + 4.5, 101, pgz + 0.5); fc3.love = 60; // fc2 is on growCd
    const beforeB = M.list.length; CF.mobTick();
    CF.assert(r, 'mob.breed-cooldown', M.list.length === beforeB);
    baby.age = 5999; CF.mobTick();
    CF.assert(r, 'mob.baby-grow', baby.baby === false);

    // wander (mobSense on, no flee) moves the animal; flee drives it away from the player
    plat(); CF.survival = false; M.clear();
    const pw = M.spawn('pig', pgx + 0.5, 101, pgz + 0.5);
    let moved = 0; for (let t = 0; t < 200; t++) { CF.mobTick(); }
    moved = Math.hypot(pw.pos[0] - (pgx + 0.5), pw.pos[2] - (pgz + 0.5));
    CF.assert(r, 'mob.passive-wander(d=' + moved.toFixed(1) + ')', moved > 0.5);
    const pf = M.spawn('pig', P.pos[0] + 2, 101, P.pos[2]); pf.fleeT = 200;
    const f0 = Math.hypot(pf.pos[0] - P.pos[0], pf.pos[2] - P.pos[2]);
    for (let t = 0; t < 40; t++) CF.mobTick();
    const f1 = Math.hypot(pf.pos[0] - P.pos[0], pf.pos[2] - P.pos[2]);
    CF.assert(r, 'mob.passive-flee(' + f0.toFixed(1) + '->' + f1.toFixed(1) + ')', f1 > f0);

    // passive spawn rule: grass + daylight OK; night no; non-grass no; persistent (no despawn)
    CF.survival = true; CF.timeOffset = 0; M.clear(); plat();
    CF.assert(r, 'mob.passive-spawn-day(sky=' + (W.lightAt(pgx + 4, 101, pgz) >> 4) + ')', !!M.trySpawnAt('pig', pgx + 4.5, 101, pgz, { ignoreDist: true }));
    CF.timeOffset = 18000; M.clear();
    CF.assert(r, 'mob.passive-no-spawn-night', !M.trySpawnAt('pig', pgx + 4.5, 101, pgz, { ignoreDist: true }));
    CF.timeOffset = 0; W.set(pgx + 4, 100, pgz, ID['stone']); for (let i = 0; i < 4; i++) W.tick(); M.clear();
    CF.assert(r, 'mob.passive-no-spawn-nongrass', !M.trySpawnAt('pig', pgx + 4.5, 101, pgz, { ignoreDist: true })); W.set(pgx + 4, 100, pgz, ID['grass']);
    // passive persists while far from the player (1.12 animals don't despawn)
    M.clear(); const keep = M.spawn('pig', pgx + 0.5, 101, pgz + 0.5); for (let t = 0; t < 30; t++) CF.mobTick();
    CF.assert(r, 'mob.passive-persist', M.list.indexOf(keep) >= 0);

    M.clear(); CF.projectiles.length = 0;
    CF.survival = surv0; CF.timeOffset = t0; CF.mobSense = true;

    // render: pixel in front of camera changes with a mob there; GL clean
    for (let i = 0; i < 60 && !CF.rendererStats.ready; i++) { CF.renderTick(); await new Promise((s) => setTimeout(s, 25)); }
    CF.timeOffset = 6000; CF.freeCam = true;
    // deterministic sky platform (grass-sim vegetation elsewhere must never occlude this sightline)
    const rx = 44, rz = 100, py0 = 96;
    W.ensureAround(rx, rz, 1); settle(30);
    for (let x = rx - 4; x <= rx + 4; x++) for (let z = rz - 4; z <= rz + 4; z++) { W.set(x, py0, z, ID['stone']); for (let y = py0 + 1; y <= py0 + 6; y++) W.set(x, y, z, 0); }
    W.ensureLight(rx >> 4, rz >> 4); for (let i = 0; i < 8; i++) W.tick();
    // drain render rebuild queue (2 chunks/tick budget + relight churn from the 486 sets;
    // a fixed renderTick count raced the budget once the #046 two-sided mesher doubled load)
    for (let i = 0; i < 400 && W.dirty.size; i++) CF.renderTick();
    for (let i = 0; i < 10; i++) CF.renderTick();
    const mzh = py0, rh = py0;
    const mz = rz - 2.5; // mob stands 2.5 blocks north (yaw=PI looks -Z)
    const camy = py0 + 2.5;
    const cam = { pos: [rx + 0.5, camy, rz + 0.5], yaw: Math.PI, pitch: Math.atan2((py0 + 1.9) - camy, 3.0) };
    // capture EMPTY frame first, THEN spawn (was: mob present in both captures -> delta only
    // nonzero by luck when a tree happened to hide it in e0; flaky)
    CF.renderDraw(cam); const e0 = CF.readCenter();
    const zc = M.spawn('zombie', rx + 0.5, mzh + 1, mz);
    for (let t = 0; t < 6; t++) M.step(zc);
    CF.renderDraw(cam); const e1 = CF.readCenter();
    const delta = Math.abs(e0[0] - e1[0]) + Math.abs(e0[1] - e1[1]) + Math.abs(e0[2] - e1[2]);
    CF.assert(r, 'mob.px-draw(d=' + delta + ',n=' + M.list.length + ',z=' + zc.pos.map((v) => Math.round(v)) + ',cm=' + cam.pos.map((v) => Math.round(v)) + ',mt=' + CF.rendererStats.mtris + ',mzh=' + mzh + ',rh=' + rh + ',P=' + W.get(rx, py0, rz) + ',H=' + W.heightAt(rx, rz) + ',A=' + W.get(rx, py0 + 1, rz - 2) + ',q=' + W.dirty.size + ',map=' + CF.rendererStats.mapped + '/' + W.chunks.size + ',b=' + e1 + ')', delta > 12 && CF.rendererStats.mtris >= 24);
    CF.assert(r, 'mob.glErr(' + CF.rendererStats.glErr + ')', CF.rendererStats.glErr === 0);
    M.clear();
    CF.survival = surv0; CF.timeOffset = t0; CF.freeCam = false; M.sched = true;
    CF.renderDraw(CF.camera || cam);
  };
})();
