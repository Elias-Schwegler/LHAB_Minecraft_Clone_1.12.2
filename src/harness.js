// Test + shot harness. Hash-routed: #test, #shot=NAME.
// Results go to document.title as TESTRESULT:{encodeURIComponent(JSON)} for tools/test.mjs.
(function () {
  const CF = window.CF;
  function report(result) {
    document.title = 'TESTRESULT:' + encodeURIComponent(JSON.stringify(result));
  }
  CF.assert = (results, name, cond) => { (cond ? results.pass : results.fail).push(name); };

  async function runTests() {
    const r = { mode: 'test', pass: [], fail: [], errors: [], ticks: 0, registry: null };
    try {
      for (let i = 0; i < 200 && !CF.ready; i++) await new Promise((res) => setTimeout(res, 50));
      CF.assert(r, 'boot.ready', CF.ready);
      CF.assert(r, 'gl.webgl2', !!(CF.gl && CF.gl.getParameter && /WebGL 2/.test(CF.gl.getParameter(CF.gl.VERSION))));
      const t0 = CF.ticks;
      await new Promise((res) => setTimeout(res, 600));
      CF.assert(r, 'loop.ticks', CF.ticks > t0 + 5);
      CF.assert(r, 'registry.json', typeof CF.REGISTRY === 'object' && CF.REGISTRY !== null);
      if (window.__ATLAS_B64) {
        const img = new Image();
        const ok = await new Promise((res) => { img.onload = () => res(true); img.onerror = () => res(false); img.src = 'data:image/png;base64,' + window.__ATLAS_B64; });
        CF.assert(r, 'atlas.decoded', ok && img.width === 128 && img.height === 128);
      }
      if (typeof CF.registryTests === 'function') await CF.registryTests(r);
      if (typeof CF.worldTests === 'function') await CF.worldTests(r);
      if (typeof CF.rendererTests === 'function') await CF.rendererTests(r);
      if (typeof CF.playerTests === 'function') await CF.playerTests(r);
    } catch (e) {
      r.fail.push('harness.threw: ' + e.message);
    }
    r.errors = CF.errors.slice(0, 20);
    r.ticks = CF.ticks;
    r.registry = Object.keys(CF.REGISTRY || {}).length;
    report(r);
  }

  async function runShot(name) {
    CF.shotName = name;
    for (let i = 0; i < 200 && !CF.ready; i++) await new Promise((res) => setTimeout(res, 50));
    CF.shotDone = false;
    try {
      if (typeof CF.shotScenarios === 'object' && CF.shotScenarios[name]) await CF.shotScenarios[name]();
    } catch (e) { CF.errors.push('shot:' + name + ' ' + e.message); }
    setTimeout(() => { CF.shotDone = true; }, 2500);
  }

  CF.shotScenarios = {};
  CF.shotScenarios['starter-world'] = async () => {
    const W = CF.world;
    W.ensureAround(0, 0, 4);
    for (let i = 0; i < 60 && W.stats().queue; i++) W.tick();
    for (let i = 0; i < 120 && !CF.rendererStats.ready; i++) { CF.renderTick(); await new Promise((r) => setTimeout(r, 50)); }
    for (let i = 0; i < 120; i++) CF.renderTick();
    // find a tree (log block) near spawn to frame it
    let tx = 0, tz = 0, found = false;
    for (let r = 2; r < 120 && !found; r += 4) for (let a = 0; a < 16 && !found; a++) {
      const x = Math.round(Math.cos(a * Math.PI / 8) * r), z = Math.round(Math.sin(a * Math.PI / 8) * r);
      W.ensureAround(x, z, 1);
      for (let i = 0; i < 8 && W.stats().queue; i++) W.tick();
      const h = W.heightAt(x, z);
      for (let y = h; y < h + 8; y++) if (W.get(x, y, z) === CF.IDOF['log']) { tx = x; tz = z; found = true; }
    }
    const th = W.heightAt(tx, tz);
    for (let i = 0; i < 30 && W.stats().queue; i++) CF.renderTick();
    CF.camera = { pos: [tx - 6, th + 7, tz - 6], yaw: Math.PI / 4, pitch: -0.15 };
    CF.renderDraw(CF.camera);
    await new Promise((r) => setTimeout(r, 300));
  };

  const h = location.hash || '';
  if (h === '#test') runTests();
  else if (h.startsWith('#shot=')) runShot(h.slice(6));
})();
