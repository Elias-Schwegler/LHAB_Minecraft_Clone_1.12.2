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
      if (CF._pauseEl) {
        const intro = !CF._everLocked; // boot hint (sim keeps running, overlay is pointer-transparent)
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
})();
