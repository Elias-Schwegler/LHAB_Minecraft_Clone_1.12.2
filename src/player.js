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
  function boxHits(px, py, pz) {
    for (let x = Math.floor(px - HW); x <= Math.floor(px + HW); x++)
      for (let y = Math.floor(py - HH + 0.001); y <= Math.floor(py + HH - 0.001); y++)
        for (let z = Math.floor(pz - HW); z <= Math.floor(pz + HW); z++)
          if (solid(x, y, z)) return true;
    return false;
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
        ny = Math.floor(ny - HH) + 1 + HH; // #046: rest on the penetrated surface (stale-y snap ratcheted +1/tick = the reported bounce)
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
  };
})();
