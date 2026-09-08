// Player: 1.12.2 AABB physics (0.6x1.8, eye 1.62), gravity, walk/sprint/sneak/jump/step-up.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const HW = 0.3, HH = 0.9, EYE = 1.62;
  const GRAV = 32, JUMP = 8.94, WALK = 4.317, SPRINT = 5.6, SNEAK = 1.3;

  const player = {
    pos: [8.5, 80, 8.5], vel: [0, 0, 0], yaw: Math.PI / 4, pitch: -0.2,
    onGround: false, input: { f: 0, s: 0, l: 0, r: 0, jump: false, sneak: false, sprint: false },
    tp(x, y, z) { this.pos = [x, y, z]; this.vel = [0, 0, 0]; },
  };
  CF.player = player;

  const solid = (x, y, z) => CF.solidAt(CF.world.get(Math.floor(x), Math.floor(y), Math.floor(z)));
  // #052/#053 boxes-aware collision: ABSOLUTE box list for a cell (full cube, or variant boxes from
  // CF.boxesOf(flat bits) - slab halves, stair base+step). Movement tests box-vs-box, not cell spans.
  function cellBoxesAbs(fx, fy, fz) {
    const id = CF.world.get(fx, fy, fz);
    if (!id) return null;
    const v = CF.BY_ID[id];
    if (!v || !CF.solidAt(id)) return null;
    if (!v.boxes) return [[fx, fy, fz, fx + 1, fy + 1, fz + 1]];
    const fm = CF.world.flatAt ? CF.world.flatAt(fx, fy, fz) : 0;
    return CF.boxesOf(v, fm).map((b) => [fx + b[0], fy + b[1], fz + b[2], fx + b[3], fy + b[4], fz + b[5]]);
  }
  // [yLo,yHi] span of geometry in cell (x,y,z) that overlaps the footprint circle (px,hw,pz); legacy
  // full-cell min/max span when footprint omitted. null = nothing solid.
  function cellTopAt(x, y, z, px, hw, pz) {
    const bs = cellBoxesAbs(Math.floor(x), Math.floor(y), Math.floor(z));
    if (!bs) return null;
    let lo = Infinity, hi = -Infinity;
    for (const b of bs) {
      if (px !== undefined && !(b[0] < px + hw && b[3] > px - hw && b[2] < pz + hw && b[5] > pz - hw)) continue;
      lo = Math.min(lo, b[1]); hi = Math.max(hi, b[4]);
    }
    return hi === -Infinity ? null : [lo, hi];
  }
  // vertical/horizontal solid test over a box span; cell-level boxes via cellBoxesAbs
  function solidSpanXZ(lo, hi, px, hw, pz) {
    for (let x = Math.floor(px - hw); x <= Math.floor(px + hw); x++)
      for (let z = Math.floor(pz - hw); z <= Math.floor(pz + hw); z++)
        for (let y = Math.floor(lo); y <= Math.floor(hi - 0.001); y++) {
          const bs = cellBoxesAbs(x, y, z);
          if (!bs) continue;
          for (const b of bs)
            if (b[1] < hi - 1e-6 && b[4] > lo + 1e-6 && b[0] < px + hw && b[3] > px - hw && b[2] < pz + hw && b[5] > pz - hw) return true;
        }
    return false;
  }
  CF.cellTopAt = cellTopAt; CF.solidSpanXZ = solidSpanXZ; CF.cellBoxesAbs = cellBoxesAbs;
  function boxHits(px, py, pz) {
    return solidSpanXZ(py - HH + 0.001, py + HH - 0.001, px, HW, pz);
  }

  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.code] = true; if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault(); });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function readInput() {
    const i = player.input;
    if (i.scripted) return;
    i.f = keys['KeyW'] ? 1 : 0; i.s = keys['KeyS'] ? 1 : 0;
    i.l = keys['KeyA'] ? 1 : 0; i.r = keys['KeyD'] ? 1 : 0;
    i.jump = !!keys['Space']; i.sneak = !!keys['ShiftLeft']; i.sprint = !!keys['ControlLeft'];
  }

  function tick(dt = 0.05) {
    if (!CF.world) return;
    player.prevPos = player.pos.slice(); // #047: interpolation source for rAF rendering
    readInput();
    const i = player.input;
    const speed = (i.sprint && (!CF.canSprint || CF.canSprint())) ? SPRINT : i.sneak ? SNEAK : WALK;
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    let mx = fx * (i.f - i.s) + Math.cos(player.yaw) * (i.r - i.l);
    let mz = fz * (i.f - i.s) - Math.sin(player.yaw) * (i.r - i.l);
    const ml = Math.hypot(mx, mz);
    if (ml > 0) { mx = mx / ml * speed; mz = mz / ml * speed; }
    player.vel[0] = mx; player.vel[2] = mz;
    player.vel[1] -= GRAV * dt;
    if (i.jump && player.onGround) { player.vel[1] = JUMP; player.onGround = false; }

    const [p0, p1, p2] = player.pos;
    let [x, y, z] = player.pos;
    // per-axis sweep
    let nx = x + player.vel[0] * dt;
    if (boxHits(nx, y, z)) {
      const stepY = y + 0.6;
      if (player.onGround && !boxHits(nx, stepY, z)) { y = stepY; nx = x + player.vel[0] * dt * 0.75; }
      else nx = x;
    }
    x = nx;
    let nz = z + player.vel[2] * dt;
    if (boxHits(x, y, nz)) {
      const stepY = y + 0.6;
      if (player.onGround && !boxHits(x, stepY, nz)) { y = stepY; nz = z + player.vel[2] * dt * 0.75; }
      else nz = z;
    }
    z = nz;
    let ny = y + player.vel[1] * dt;
    player.onGround = false;
    if (boxHits(x, ny, z)) {
      if (player.vel[1] < 0) {
        player.onGround = true;
        // #052: rest on the highest solid TOP under the box (full cells AND slab halves), from penetrated pos
        const feet = ny - HH;
        let top = -Infinity;
        for (let sx = Math.floor(x - HW); sx <= Math.floor(x + HW); sx++)
          for (let sz = Math.floor(z - HW); sz <= Math.floor(z + HW); sz++)
            for (let sy = Math.floor(feet) - 1; sy <= Math.floor(feet) + 1; sy++) {
              const sp = cellTopAt(sx, sy, sz, x, HW, z); // #053: footprint-aware - don't rest on a stair step we're not over
              if (sp && sp[1] <= feet + 0.55 && sp[1] > top) top = sp[1]; // #053: +0.55 penetration tolerance (falls overshoot half-box tops; full-block +1 top stays excluded)
            }
        ny = (isFinite(top) ? top : Math.floor(ny - HH) + 1) + HH;
        for (let g = 0; g < 8 && boxHits(x, ny, z); g++) ny += 1; // fast falls penetrate several cells - push up until free
      }
      else ny = Math.ceil(y + HH) - 1 - HH - 0.001;
      player.vel[1] = 0;
    }
    y = ny;
    // #046: removed the old "hop noise" snap `y = Math.round((y - HH) * 1000) / 1000` -
    // with a correct landing snap it overwrote CENTER y with feet-y, burying the player.
    player.pos = [x, y, z];
    if (y < -20) player.tp(8.5, CF.world.heightAt(8, 8) + 2, 8.5); // void rescue

    if (!CF.freeCam) CF.camera = { pos: [x, y - HH + EYE, z], yaw: player.yaw, pitch: player.pitch };
  }
  player.tick = tick;
  CF.playerTick = tick;

  // Mouse look with pointer lock (real play; harness uses scripted input/yaw directly).
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement) {
      player.yaw += e.movementX * 0.0026;
      player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch - e.movementY * 0.0026));
    }
  });
  document.addEventListener('click', () => { if (CF.canvas && CF.canvas.requestPointerLock) CF.canvas.requestPointerLock(); });

  CF.playerTests = async (r) => {
    const P = CF.player;
    const h = CF.world.heightAt(8, 8);
    P.tp(8.5, h + 10, 8.5);
    P.input.scripted = true;
    P.input.f = P.input.l = P.input.r = 0; P.input.jump = false;
    for (let i = 0; i < 40; i++) tick();
    CF.assert(r, 'player.land', P.onGround && P.pos[1] > h - 1 && P.pos[1] < h + 3);
    const y0 = P.pos[1], x0 = P.pos[0], z0 = P.pos[2];
    P.input.f = 1;
    for (let i = 0; i < 60; i++) tick();
    P.input.f = 0;
    const dist = Math.hypot(P.pos[0] - x0, P.pos[2] - z0);
    CF.assert(r, 'player.move(' + dist.toFixed(1) + ')', dist > 2);
    CF.assert(r, 'player.no-sink', P.pos[1] > h - 1 && P.onGround);
    P.tp(8.5, h + 12, 8.5);
    for (let i = 0; i < 80; i++) tick();
    const hAt = CF.world.heightAt(Math.floor(P.pos[0]), Math.floor(P.pos[2]));
    CF.assert(r, 'player.gravity-fall', P.onGround && P.pos[1] >= hAt);
    CF.assert(r, 'player.camera', !!CF.camera && Math.abs(CF.camera.pos[1] - (P.pos[1] - 0.9 + 1.62)) < 0.5);
    // #018: horizontal wall blocking — build a cobble wall, walk into it, must not pass
    const wx = Math.floor(P.pos[0]) + 2, wz = Math.floor(P.pos[2]);
    const wy = Math.floor(P.pos[1] - 0.9);
    CF.world.ensureAround(wx, wz, 1);
    for (let i = 0; i < 10 && CF.world.stats().queue; i++) CF.world.tick();
    for (let yy = wy; yy <= wy + 2; yy++) for (let dz = -2; dz <= 2; dz++) CF.world.set(wx, yy, wz + dz, CF.IDOF['cobblestone']);
    P.yaw = 0; // face +Z? wall is +X away -> face +X:
    P.yaw = Math.PI / 2;
    P.input.f = 1;
    const xBefore = P.pos[0];
    for (let i = 0; i < 60; i++) tick();
    P.input.f = 0;
    CF.assert(r, 'player.wall-block(' + (P.pos[0] - xBefore).toFixed(2) + ')', P.pos[0] < wx - 0.25 && P.pos[0] > xBefore - 0.01);
    for (let yy = wy; yy <= wy + 2; yy++) for (let dz = -2; dz <= 2; dz++) CF.world.set(wx, yy, wz + dz, 0);
    // #052/#053 box-model physics on a SYNTHETIC platform (fixed coords - suite-order independent):
    // stand ON a bottom slab (+0.5), and WALK UP a stair run without any jump.
    const sx = 30, sz = 30, sy = 70; // platform top = y 70 (feet level); slab/stairs sit at cell 70
    CF.world.ensureAround(sx, sz, 1);
    for (let i = 0; i < 10 && CF.world.stats().queue; i++) CF.world.tick();
    const saved = {};
    const keep = (x2, y2, z2) => { const k = x2 + ',' + y2 + ',' + z2; if (!(k in saved)) saved[k] = CF.world.get(x2, y2, z2); };
    for (let x2 = sx - 4; x2 <= sx + 4; x2++) for (let z2 = sz - 2; z2 <= sz + 2; z2++) for (let y2 = 66; y2 <= 78; y2++) keep(x2, y2, z2);
    for (let x2 = sx - 4; x2 <= sx + 4; x2++) for (let z2 = sz - 2; z2 <= sz + 2; z2++) {
      for (let y2 = 70; y2 <= 78; y2++) CF.world.set(x2, y2, z2, 0);
      CF.world.set(x2, 69, z2, CF.IDOF['stone']);
    }
    for (let i = 0; i < 10 && CF.world.stats().queue; i++) CF.world.tick();
    for (let i = 0; i < 200 && CF.world.dirty.size; i++) CF.renderTick();
    CF.world.set(sx, sy, sz, CF.IDOF['stone_slab:cobblestone']);
    for (let i = 0; i < 10 && CF.world.stats().queue; i++) CF.world.tick();
    for (let i = 0; i < 200 && CF.world.dirty.size; i++) CF.renderTick();
    P.tp(sx + 0.5, sy + 3, sz + 0.5);
    for (let i = 0; i < 90; i++) tick();
    CF.assert(r, 'physics.slab-stand(feet=' + (P.pos[1] - 0.9).toFixed(2) + ',want=' + (sy + 0.5) + ')',
      Math.abs(P.pos[1] - 0.9 - (sy + 0.5)) < 0.02 && P.onGround);
    // course: +X-facing stairs at sx+1, landing block sx+2 (walk-on = sy+1), blocker wall sx+3
    CF.world.set(sx, sy, sz, 0);
    CF.world.set(sx + 1, sy, sz, CF.IDOF['stone_stairs']); CF.world.flatSet(sx + 1, sy, sz, 0); // step on +X half
    CF.world.set(sx + 2, sy, sz, CF.IDOF['stone']);
    for (let y2 = sy; y2 <= sy + 3; y2++) CF.world.set(sx + 3, y2, sz, CF.IDOF['stone']);
    for (let i = 0; i < 10 && CF.world.stats().queue; i++) CF.world.tick();
    for (let i = 0; i < 200 && CF.world.dirty.size; i++) CF.renderTick();
    P.tp(sx - 1.5, sy + 1.2, sz + 0.5); P.yaw = Math.PI / 2; // face +X
    P.input.jump = false; P.input.f = 1;
    for (let i = 0; i < 200; i++) tick();
    P.input.f = 0;
    CF.assert(r, 'physics.stairs-walkup(feet=' + (P.pos[1] - 0.9).toFixed(2) + ',want>=' + (sy + 0.99) + ',x=' + P.pos[0].toFixed(1) + ')',
      P.onGround && P.pos[1] - 0.9 >= sy + 0.99 && P.pos[0] > sx + 1.9 && P.pos[0] < sx + 2.7);
    for (const k in saved) { const [x2, y2, z2] = k.split(',').map(Number); CF.world.set(x2, y2, z2, saved[k]); }
    P.tp(8.5, CF.world.heightAt(8, 8) + 2, 8.5); P.yaw = 0; P.pitch = 0; // leave suites downstream on a clean column (not buried in the restored terrain)
    for (let i = 0; i < 40 && !P.onGround; i++) tick();
  };
})();
