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
    setInterval(() => {
      if (CF.world) {
        const p = CF.player;
        CF.world.ensureAround(p ? p.pos[0] : 0, p ? p.pos[2] : 0, 4);
        CF.world.tick();
        CF.playerTick && CF.playerTick();
      }
      CF.renderTick && CF.renderTick();
      CF.onTick && CF.onTick();
      if (CF.renderDraw) CF.renderDraw(CF.camera || { pos: [8, CF.world ? CF.world.heightAt(0, 0) + 26 : 90, 8], yaw: 0.7, pitch: -0.9 });
      CF.ticks++;
    }, 50);
    function frame() {
      if (CF.renderDraw) {
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
