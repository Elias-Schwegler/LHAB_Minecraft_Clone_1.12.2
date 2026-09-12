// Cubeforge boot: WebGL2 canvas + fixed 20 UPS tick loop.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  CF.errors = [];
  CF.ticks = 0;
  CF.ready = false;
  const origErr = console.error;
  console.error = function () { CF.errors.push(Array.from(arguments).map(String).join(' ')); origErr.apply(console, arguments); };
  window.addEventListener('error', (e) => CF.errors.push(String(e.message)));

  function init() {
    const canvas = document.getElementById('gl');
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
    if (!gl) { CF.errors.push('WebGL2 unavailable'); document.title = 'FATAL: no webgl2'; return; }
    CF.gl = gl; CF.canvas = canvas;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // #060: RMB places blocks - never pop the browser menu
    // #060 pause overlay (pointer-lock released / inventory open = 1.12 singleplayer pause)
    const pauseEl = document.createElement('div');
    pauseEl.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;' +
      'flex-direction:column;background:rgba(0,0,0,0.45);color:#fff;font:16px monospace;z-index:9;pointer-events:none';
    pauseEl.innerHTML = '<div style="font-size:22px;margin-bottom:8px">Game Paused</div><div>click to resume &middot; WASD move &middot; mouse look</div>' +
      '<div style="margin-top:6px;opacity:0.7">LMB break &middot; RMB place &middot; Q drop &middot; E inventory &middot; F4 survival &middot; F3 debug</div>';
    (document.body || document.documentElement).appendChild(pauseEl);
    CF._pauseEl = pauseEl;
    function resize() {
      const w = canvas.clientWidth * devicePixelRatio, h = canvas.clientHeight * devicePixelRatio;
      if (canvas.width !== w | 0 || canvas.height !== h | 0) { canvas.width = w | 0; canvas.height = h | 0; }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    CF.resize = resize;
    window.addEventListener('resize', resize);
    resize();
    gl.clearColor(0.6, 0.75, 1.0, 1); // sky placeholder until SPK-1 sky pass
    CF.ready = true;
    // Fixed-timestep SIM on setInterval (deterministic, works in headless virtual time);
    // RENDER on rAF. Sim never depends on rAF firing.
    const loopId = setInterval(() => {
      const t0 = performance.now();
      // #060 PAUSE: freezes the sim when the mouse is RELEASED mid-game (after first lock) or inventory is open.
      // BOOT NEVER PAUSES (pre-#060 loop kept ticking while the overlay shows) - shot/test determinism preserved.
      // freeCam (shots/tests), scripted input (harness) and sleeping are exempt.
      const p = CF.player;
      CF.paused = !!(p && !p.input.scripted && !CF.freeCam && !CF.sleeping &&
        ((CF._everLocked && !document.pointerLockElement) || (CF.ui && CF.ui.open)));
      if (CF._pauseEl && !CF.shotName) { // #059: shot harness owns the overlay (never in QA/PNG frames)
        const intro = !CF._everLocked && !(p && p.input.scripted) && !CF.freeCam; // boot hint for REAL players only (shots/tests never show it)
        CF._pauseEl.style.display = CF.paused || intro ? 'flex' : 'none';
        if (CF._pauseEl.firstChild) CF._pauseEl.firstChild.textContent = CF.paused ? 'Game Paused' : 'Cubeforge';
      }
      if (CF.world && !CF.paused) {
        CF.world.ensureAround(p ? p.pos[0] : 0, p ? p.pos[2] : 0, 4);
        CF.world.tick();
        CF.playerTick && CF.playerTick();
        CF.mobTick && CF.mobTick(); // #035 entities (spawn scheduler is survival-gated)
        CF.tntTick && CF.tntTick(); // #042 primed TNT fuses + chain + explode
        CF.bedTick && CF.bedTick(); // #041 sleep sequence + weather/lightning/shake decay
        CF.itemTick && CF.itemTick(); // #060 dropped-item physics + pickup magnet
        CF.portalStepTick && CF.portalStepTick(); // #055 stepping into a portal warps (armed/cooldown inside)
      }
      CF.renderTick && CF.renderTick();
      CF.onTick && CF.onTick();
      if (CF.renderDraw) CF.renderDraw(CF.camera || { pos: [8, CF.world ? CF.world.heightAt(0, 0) + 26 : 90, 8], yaw: 0.7, pitch: -0.9 });
      CF.simMs = performance.now() - t0;
      CF.lastSimAt = performance.now(); // #047: rAF interpolates camera between 20Hz sim ticks
      CF.ticks++;
    }, 50);
    CF.stopGameLoop = () => { clearInterval(loopId); CF.stopDraw = true; };
    function frame() {
      if (CF.stopDraw) return;
      if (CF.renderDraw) {
        // #047 smooth camera: lerp the player's eye position from prevPos->pos by elapsed tick fraction
        if (CF.player && !CF.freeCam && !CF.sleeping && CF.player.prevPos) {
          const P = CF.player, a = Math.min(1, (performance.now() - (CF.lastSimAt || performance.now())) / 50);
          const l = (i) => P.prevPos[i] + (P.pos[i] - P.prevPos[i]) * a;
          CF.camera = { pos: [l(0), l(1) - 0.9 + 1.62, l(2)], yaw: P.yaw, pitch: P.pitch };
        }
        CF.renderDraw(CF.camera || { pos: [8, CF.world ? CF.world.heightAt(0, 0) + 26 : 90, 8], yaw: 0.7, pitch: -0.9 });
      } else {
        gl.clearColor(0.6, 0.75, 1.0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    CF.initRenderer && CF.initRenderer(gl);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // ---- #055 DIMENSIONS (SPK-7 design): CF.dims registry + CF.warp hot-swap + 1.12 portal frames ----
  // world instances are closure-pure (SPK-7a); swap = CF.world + renderReset + entity wipes + BE map swap.
  CF.dims = null; // boot() fills {over:CF.world, nether:null} once items/BE exist; loadNow keeps it fresh
  function dimBoot() {
    if (CF.dims) return;
    CF.dims = { over: CF.world, nether: null };
    CF.dimBes = { over: CF.blockEntities, nether: {} };
    CF.activeDim = 'over';
  }
  CF.dimBootHook = dimBoot;

  CF.portalFrameAt = (w, ix, iy, iz) => { // 1.12: 2 wide x 3 tall air interior, obsidian sill/cap/side pillars, corners OPTIONAL
    const OBS = CF.IDOF['obsidian'];
    for (let y = iy; y <= iy + 2; y++) if (w.get(ix, y, iz) || w.get(ix + 1, y, iz)) return false; // interior must be air
    for (const x of [ix, ix + 1]) if (w.get(x, iy - 1, iz) !== OBS || w.get(x, iy + 3, iz) !== OBS) return false; // sill + cap
    for (let y = iy; y <= iy + 2; y++) if (w.get(ix - 1, y, iz) !== OBS || w.get(ix + 2, y, iz) !== OBS) return false; // pillars
    return true;
  };
  CF.portalTryIgnite = (hit) => { // 1.12: RMB the bottom-inside obsidian (top face) with flint & steel; brute-forces the 6 candidate origins
    if (!hit || !hit.face) return false;
    const held = CF.held && CF.held();
    if (held !== 'flint_and_steel') return false;
    const w = CF.world, PT = CF.IDOF['portal'];
    const tx = hit.x + hit.face[0], ty = hit.y + hit.face[1], tz = hit.z + hit.face[2]; // the air cell clicked across
    for (const ox of [tx, tx - 1]) for (const oy of [ty, ty - 1, ty - 2]) {
      if (!CF.portalFrameAt(w, ox, oy, tz)) continue;
      for (let x = ox; x <= ox + 1; x++) for (let y = oy; y <= oy + 2; y++) w.set(x, y, tz, PT);
      w.ensureLight(tx >> 4, tz >> 4);
      return true;
    }
    return false;
  };
  function buildNetherPortal(w, sx, sz) { // 1.12 spirit: the destination portal is BUILT if absent - deterministic carve+frame
    const OBS = CF.IDOF['obsidian'], P = CF.IDOF['portal'];
    w.ensureAround(sx, sz, 2); // set() is a silent no-op on UNGENERATED chunks - generate first
    for (let i = 0; i < 80 && w.stats().queue; i++) w.tick();
    const ix = sx + 1, base = Math.max(w.heightAt(sx, sz) + 1, 5); // #056: stand the portal ON the terrain floor (was >=64 float when nether gen landed at 32..37)
    for (let x = ix - 1; x <= ix + 2; x++) for (let y = base - 1; y <= base + 3; y++) for (let z = sz - 1; z <= sz + 1; z++) if (w.get(x, y, z)) w.set(x, y, z, 0);
    for (const x of [ix, ix + 1]) { w.set(x, base - 1, sz, OBS); w.set(x, base + 3, sz, OBS); } // sill + cap
    for (let y = base; y <= base + 2; y++) { w.set(ix - 1, y, sz, OBS); w.set(ix + 2, y, sz, OBS); } // pillars
    for (let x = ix; x <= ix + 1; x++) for (let y = base; y <= base + 2; y++) w.set(x, y, sz, P);
    return [ix, base, sz];
  }
  CF.warp = (toKey, entryPos) => {
    dimBoot();
    const fromKey = CF.activeDim;
    if (toKey === fromKey || (toKey !== 'over' && toKey !== 'nether')) return false;
    let target;
    if (toKey === 'nether') {
      if (!CF.dims.nether) {
        CF.dims.nether = CF.makeWorld((CF.dims.over.seed ^ 0x5EED) >>> 0, { nether: true }); // #056 real nether gen
        CF.trackWorld && CF.trackWorld(CF.dims.nether); // #055: track BEFORE first edit (PLAYBOOK lesson re-applied)
      }
      target = CF.dims.nether;
    } else target = CF.dims.over;
    if (!target) return false;
    const P = CF.player;
    const fromPos = entryPos || P.pos.slice();
    // BE maps are per-dimension; the shared object must be SWAPPED (all consumers read CF.blockEntities live)
    CF.dimBes[fromKey] = CF.blockEntities;
    CF.dims[fromKey] = CF.world;
    CF.blockEntities = CF.dimBes[toKey] || (CF.dimBes[toKey] = {});
    CF.world = target;
    CF.renderReset && CF.renderReset();
    CF.mobs && CF.mobs.clear();
    if (CF.tnts) CF.tnts.length = 0;
    if (CF.itemEnts) CF.itemEnts.length = 0; // dropped items stay behind (documented v1)
    if (CF.projectiles) CF.projectiles.length = 0;
    // 8:1 (1.12): over->nether divides, nether->over multiplies
    const sx = toKey === 'nether' ? Math.floor(fromPos[0] / 8) : Math.floor(fromPos[0] * 8);
    const sz = toKey === 'nether' ? Math.floor(fromPos[2] / 8) : Math.floor(fromPos[2] * 8);
    target.ensureAround(sx, sz, 2);
    for (let i = 0; i < 60 && target.stats().queue; i++) target.tick();
    let stand = null;
    for (let r = 0; r <= 16 && !stand; r++) for (let dx = -r; dx <= r && !stand; dx++) for (let dz = -r; dz <= r && !stand; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      for (let y = 5; y < 110 && !stand; y++) if (target.get(sx + dx, y, sz + dz) === CF.IDOF['portal']) stand = [sx + dx, y - 1, sz + dz]; // stand on the block beneath portal base row? portals fill from sill+1: feet = portal base y
    }
    if (stand) P.tp(stand[0] + 0.5, stand[1] + 1 + 0.92, stand[2] + 0.5);
    else {
      const cell = buildNetherPortal(target, sx, sz);
      if (cell) P.tp(cell[0] + 0.5, cell[1] + 0.95, cell[2] + 0.5);
    }
    target.ensureAround(P.pos[0], P.pos[2], 4);
    for (let i = 0; i < 80 && (target.stats().queue || target.dirty.size); i++) { target.tick(); CF.renderTick(); }
    P.vel[0] = P.vel[1] = P.vel[2] = 0; P.prevPos = P.pos.slice();
    CF.activeDim = toKey;
    CF.warpArmed = false; // must leave a portal cell before the next warp fires (MC cooldown analog)
    CF.warpCount = (CF.warpCount || 0) + 1;
    return true;
  };
  CF.portalStepTick = () => { // called from the sim loop: step INTO a portal block warps (1.12 player is instant)
    dimBoot();
    const P = CF.player;
    const inCell = CF.world.get(Math.floor(P.pos[0]), Math.floor(P.pos[1] - 0.9 + 0.4), Math.floor(P.pos[2])) === CF.IDOF['portal'];
    if (!inCell) CF.warpArmed = true;
    if (inCell && CF.warpArmed !== false) CF.warp(CF.activeDim === 'over' ? 'nether' : 'over', [P.pos[0], P.pos[1] - 1.2, P.pos[2]]);
  };
})();
