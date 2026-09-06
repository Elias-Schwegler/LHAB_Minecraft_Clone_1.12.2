// Test + shot harness. Hash-routed: #test, #shot=NAME.
// Results go to document.title as TESTRESULT:{encodeURIComponent(JSON)} for tools/test.mjs.
(function () {
  const CF = window.CF;
  function report(result) {
    document.title = 'TESTRESULT:' + encodeURIComponent(JSON.stringify(result));
  }
  CF.assert = (results, name, cond) => { (cond ? results.pass : results.fail).push(name); };

  const SUITES = [
    { name: 'boot', run: async (r) => {
        for (let i = 0; i < 200 && !CF.ready; i++) await new Promise((res) => setTimeout(res, 50));
        CF.assert(r, 'boot.ready', CF.ready);
        CF.assert(r, 'gl.webgl2', !!(CF.gl && CF.gl.getParameter && /WebGL 2/.test(CF.gl.getParameter(CF.gl.VERSION))));
        const t0 = CF.ticks;
        await new Promise((res) => setTimeout(res, 600));
        CF.assert(r, 'loop.ticks', CF.ticks > t0 + 5);
        CF.stopGameLoop && CF.stopGameLoop(); // suites drive sim manually; frees CPU + virtual time
        CF.assert(r, 'registry.json', typeof CF.REGISTRY === 'object' && CF.REGISTRY !== null);
        if (window.__ATLAS_B64) {
          const img = new Image();
          const ok = await new Promise((res) => { img.onload = () => res(true); img.onerror = () => res(false); img.src = 'data:image/png;base64,' + window.__ATLAS_B64; });
          CF.assert(r, 'atlas.decoded', ok && img.width === 128 && img.height === 128);
        }
        if (typeof CF.registryTests === 'function') await CF.registryTests(r);
      } },
    { name: 'world', run: (r) => CF.worldTests && CF.worldTests(r) },
    { name: 'light', run: (r) => CF.lightTests && CF.lightTests(r) },
    { name: 'grass', slow: true, run: (r) => CF.grassTests && CF.grassTests(r) },
    { name: 'time', slow: true, run: (r) => CF.timeTests && CF.timeTests(r) },
    { name: 'fluids', slow: true, run: (r) => CF.fluidTests && CF.fluidTests(r) },
    { name: 'render', run: (r) => CF.rendererTests && CF.rendererTests(r) },
    { name: 'player', run: (r) => CF.playerTests && CF.playerTests(r) },
    { name: 'interact', run: (r) => CF.interactTests && CF.interactTests(r) },
    { name: 'f3', run: (r) => CF.f3Tests && CF.f3Tests(r) },
    { name: 'items', run: (r) => CF.itemTests && CF.itemTests(r) },
    { name: 'ui', run: (r) => CF.uiTests && CF.uiTests(r) },
    { name: 'survival', run: (r) => CF.survivalTests && CF.survivalTests(r) },
    { name: 'mobs', run: (r) => CF.mobTests && CF.mobTests(r) },
    { name: 'tnt', run: (r) => CF.tntTests && CF.tntTests(r) },
    { name: 'save', run: (r) => CF.persistTests && CF.persistTests(r) },
  ];

  async function runTests(spec) {
    const r = { mode: 'test', pass: [], fail: [], errors: [], times: {}, ticks: 0, registry: null };
    let chosen = SUITES;
    if (spec === 'quick') chosen = SUITES.filter((s) => !s.slow);
    else if (spec && spec !== 'all') { const want = spec.split(','); chosen = SUITES.filter((s) => want.includes(s.name)); }
    try {
      for (const s of chosen) {
        const t0 = performance.now();
        await s.run(r);
        r.times[s.name] = Math.round(performance.now() - t0);
      }
    } catch (e) {
      r.fail.push('harness.threw: ' + (e && e.stack ? String(e.stack).split('\n').slice(0, 3).join(' | ') : e.message));
    }
    r.errors = CF.errors.slice(0, 20);
    r.ticks = CF.ticks;
    r.registry = Object.keys(CF.REGISTRY || {}).length;
    r.suites = chosen.map((s) => s.name);
    report(r);
  }

  async function runShot(name) {
    CF.shotName = name;
    for (let i = 0; i < 200 && !CF.ready; i++) await new Promise((res) => setTimeout(res, 50));
    CF.shotDone = false;
    try {
      if (typeof CF.shotScenarios === 'object' && CF.shotScenarios[name]) await CF.shotScenarios[name]();
    } catch (e) { CF.errors.push('shot:' + name + ' ' + e.message); document.title = 'SHOTERR:' + encodeURIComponent(String(e.stack || e).split('\n').slice(0, 3).join(' | ')); }
    setTimeout(() => { CF.shotDone = true; }, 2500);
  }

  CF.shotScenarios = CF.shotScenarios || {};
  CF.shotScenarios['starter-world'] = async () => {
    CF.freeCam = true;
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
    CF.camera = { pos: [tx - 9, th + 10, tz - 9], yaw: Math.PI / 4, pitch: -0.35 };
    CF.renderDraw(CF.camera);
    await new Promise((r) => setTimeout(r, 300));
  };

  CF.shotScenarios['block'] = async () => {
    CF.freeCam = true;
    const name = (location.search.match(/block=([a-z0-9_]+)/) || [])[1] || 'stone';
    const W = CF.world;
    W.ensureAround(10, 10, 2);
    for (let i = 0; i < 20 && W.stats().queue; i++) W.tick();
    const reg = CF.REGISTRY[name];
    const key = Object.keys(reg.variants)[0];
    const id = reg.variants[key].id;
    const by = 70;
    for (let x = 7; x <= 13; x++) for (let z = 7; z <= 13; z++) for (let y = by - 2; y < by + 8; y++) W.set(x, y, z, 0);
    for (let x = 7; x <= 13; x++) for (let z = 7; z <= 13; z++) W.set(x, by, z, CF.IDOF['stone']);
    W.set(10, by + 1, 10, id);
    for (let i = 0; i < 100; i++) CF.renderTick();
    const camx = 13.4, camy = by + 2.6, camz = 13.4, tx = 10.5, ty = by + 1.5, tz = 10.5;
    const horiz = Math.hypot(camx - tx, camz - tz);
    CF.camera = { pos: [camx, camy, camz], yaw: Math.atan2(tx - camx, tz - camz), pitch: -Math.atan2(camy - ty, horiz) };
    CF.renderDraw(CF.camera);
    await new Promise((r) => setTimeout(r, 300));
  };
  CF.shotScenarios['walking'] = async () => {
    CF.freeCam = false;
    const W = CF.world, P = CF.player;
    W.ensureAround(8, 8, 3);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    const h = W.heightAt(8, 8);
    P.tp(8.5, h + 2, 8.5);
    P.input.scripted = true; P.input.f = 1; P.pitch = -0.30;
    for (let i = 0; i < 60; i++) CF.playerTick();
    P.input.f = 0;
    for (let i = 0; i < 30 && !CF.rendererStats.ready; i++) { CF.renderTick(); await new Promise((r) => setTimeout(r, 50)); }
    for (let i = 0; i < 40; i++) CF.renderTick();
    CF.renderDraw(CF.camera);
    await new Promise((r) => setTimeout(r, 300));
  };
  CF.shotScenarios['leaf-decay'] = async () => {
    CF.freeCam = true;
    const W = CF.world;
    W.ensureAround(0, 0, 4);
    for (let i = 0; i < 60 && W.stats().queue; i++) W.tick();
    let tx = 0, tz = 0, found = false;
    for (let r = 2; r < 60 && !found; r += 4) for (let a = 0; a < 16 && !found; a++) {
      const x = Math.round(Math.cos(a * Math.PI / 8) * r), z = Math.round(Math.sin(a * Math.PI / 8) * r);
      const h = W.heightAt(x, z);
      for (let y = h; y < h + 8; y++) if (W.get(x, y, z) === CF.IDOF['log']) { tx = x; tz = z; found = true; }
    }
    const th = W.heightAt(tx, tz);
    for (let y = th + 1; y < th + 8; y++) W.set(tx, y, tz, 0); // chop tree -> leaves decay (#019)
    for (let i = 0; i < 80; i++) CF.renderTick();
    CF.camera = { pos: [tx - 12, th + 9, tz - 12], yaw: Math.PI / 4, pitch: -0.4 };
    CF.renderDraw(CF.camera);
    await new Promise((r) => setTimeout(r, 300));
  };
  CF.shotScenarios['tower-save'] = async () => {
    CF.freeCam = true;
    const W = CF.world;
    W.ensureAround(8, 8, 3);
    for (let i = 0; i < 40 && W.stats().queue; i++) W.tick();
    const th = W.heightAt(8, 8);
    for (let y = th + 1; y <= th + 6; y++) W.set(8, y, 8, CF.IDOF['cobblestone']);
    CF.saveNow();
    CF.loadNow(); // full round-trip through localStorage before rendering
    for (let i = 0; i < 100; i++) CF.renderTick();
    CF.camera = { pos: [8 - 10, th + 8, 8 - 10], yaw: Math.PI / 4, pitch: -0.35 };
    CF.renderDraw(CF.camera);
    await new Promise((r) => setTimeout(r, 300));
  };
  CF.shotScenarios['glow-cave'] = async () => {
    CF.freeCam = true;
    const W = CF.world;
    W.ensureAround(0, 0, 4);
    for (let i = 0; i < 60 && W.stats().queue; i++) W.tick();
    const cx = 0, cz = 0, cy = W.heightAt(cx, cz) - 4;
    for (let x = cx - 4; x <= cx + 4; x++) for (let z = cz - 4; z <= cz + 4; z++) for (let y = cy - 1; y <= cy + 3; y++) W.set(x, y, z, 0);
    W.set(cx, cy, cz, CF.IDOF['glowstone']);
    for (let i = 0; i < 30; i++) { W.tick(); CF.renderTick(); }
    CF.camera = { pos: [cx + 6.5, cy + 2.2, cz + 6.5], yaw: Math.atan2(cx - cx - 6.5, cz - cz - 6.5), pitch: -0.4 };
    CF.renderDraw(CF.camera);
    await new Promise((r) => setTimeout(r, 300));
  };
  CF.shotScenarios['night-world'] = async () => {
    CF.timeOffset = 18000; // ~night; stays applied for the screenshot (interval redraws)
    await CF.shotScenarios['starter-world']();
  };
  CF.shotScenarios['night-glow'] = async () => {
    CF.freeCam = true;
    CF.timeOffset = 18000;
    const W = CF.world;
    W.ensureAround(0, 0, 4);
    for (let i = 0; i < 60 && W.stats().queue; i++) W.tick();
    const th = W.heightAt(0, 0);
    W.set(0, th + 1, 0, CF.IDOF['glowstone']);
    for (let i = 0; i < 120; i++) CF.renderTick();
    CF.camera = { pos: [0 - 9, th + 4, 0 - 9], yaw: Math.PI / 4, pitch: -0.18 };
    CF.renderDraw(CF.camera);
    await new Promise((r) => setTimeout(r, 300));
  };
  CF.shotScenarios['torch-craft'] = async () => {
    CF.freeCam = true;
    CF.timeOffset = 18000;
    const W = CF.world;
    W.ensureAround(0, 0, 3);
    for (let i = 0; i < 40 && W.stats().queue; i++) W.tick();
    // craft 4 torches from coal+stick via the real inventory API:
    CF.inv.fill(null);
    CF.inv[0] = { name: 'coal', count: 1 }; CF.inv[2] = { name: 'stick', count: 1 };
    const made = CF.craftOnce([0, 1, 2, 3]);
    CF.lastCraft = made;
    // deterministic room carve (same trick as glow-cave), torch on floor center
    const cx = 0, cz = 0, cy = W.heightAt(cx, cz) - 4;
    for (let x = cx - 4; x <= cx + 4; x++) for (let z = cz - 4; z <= cz + 4; z++) for (let y = cy - 1; y <= cy + 3; y++) W.set(x, y, z, 0);
    W.set(cx, cy, cz, CF.IDOF['torch']);
    for (let i = 0; i < 120; i++) { W.tick(); CF.renderTick(); }
    CF.camera = { pos: [cx + 6.5, cy + 2.2, cz + 6.5], yaw: Math.atan2(-6.5, -6.5), pitch: -0.4 };
    CF.renderDraw(CF.camera);
    document.title = 'TC:' + encodeURIComponent(JSON.stringify({
      cy, torch: W.get(cx, cy, cz), torchId: CF.IDOF['torch'],
      pool: [W.lightAt(cx, cy + 1, cz + 2) >> 4, W.lightAt(cx, cy + 1, cz + 2) & 15, W.lightAt(cx + 3, cy + 1, cz + 3) & 15],
      mapped: CF.rendererStats.mapped, tris: CF.rendererStats.tris, glErr: CF.rendererStats.glErr,
      made: made && made.name, craftCount: CF.countItem('torch'),
    }));
    await new Promise((r) => setTimeout(r, 300));
  };
  CF.shotScenarios['fluid-pool'] = async () => {
    CF.freeCam = true;
    const W = CF.world;
    let bx = 0, bz = 0;
    outer: for (const [cx2, cz2] of [[40, 40], [80, 20], [20, 80], [120, 120], [60, 100], [0, 0]]) {
      W.ensureAround(cx2, cz2, 1);
      for (let i = 0; i < 10 && W.stats().queue; i++) W.tick();
      for (let x = cx2 - 7; x <= cx2 + 7; x++) for (let z = cz2 - 7; z <= cz2 + 7; z++) for (let y = 1; y < 100; y++)
        if (W.get(x, y, z)) { continue outer; } // any solid at/above surface band? skip spot
      bx = cx2; bz = cz2; break;
    }
    W.ensureAround(bx, bz, 2);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    const by = W.heightAt(bx, bz);
    for (let x = bx - 5; x <= bx + 5; x++) for (let z = bz - 5; z <= bz + 5; z++) {
      for (let y = by + 1; y <= by + 4; y++) W.set(x, y, z, 0);
      W.set(x, by, z, CF.IDOF['cobblestone']);
    }
    W.set(bx, by + 1, bz, CF.IDOF['water']);
    for (let i = 0; i < 300; i++) { W.tick(); if (i % 10 === 0) CF.renderTick(); }
    for (let i = 0; i < 60; i++) CF.renderTick();
    CF.camera = { pos: [bx + 9, by + 7, bz + 9], yaw: Math.atan2(-9, -9), pitch: -0.5 };
    CF.renderDraw(CF.camera);
    const canvasPx = CF.canvas.width, canvasPy = CF.canvas.height;
    const px = (nx, ny) => { const q = new Uint8Array(4); CF.gl.readPixels((canvasPx * nx) | 0, (canvasPy * ny) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q); return [q[0], q[1], q[2], q[3]]; };
    document.title = 'FP:' + encodeURIComponent(JSON.stringify({
      spot: [bx, bz], wtris: CF.rendererStats.wtris, waterLight: W.lightAt(bx + 1, by + 1, bz + 1),
      pixCenter: px(0.5, 0.55), pixLeft: px(0.35, 0.5), glErr: CF.rendererStats.glErr,
    }));
    await new Promise((r) => setTimeout(r, 300));
  };
  CF.shotScenarios['fluid-lava'] = async () => {
    CF.freeCam = true;
    const W = CF.world;
    const bx = 80, bz = 80;
    W.ensureAround(bx, bz, 2);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    const by = W.heightAt(bx, bz);
    for (let x = bx - 6; x <= bx + 6; x++) for (let z = bz - 6; z <= bz + 6; z++) {
      for (let y = by + 1; y <= by + 8; y++) W.set(x, y, z, 0);
      W.set(x, by, z, CF.IDOF['cobblestone']);
    }
    W.set(bx + 3, by + 1, bz, CF.IDOF['lava']);
    for (let i = 0; i < 20; i++) W.tick();
    W.set(bx - 3, by + 1, bz, CF.IDOF['water']);
    for (let i = 0; i < 400; i++) { W.tick(); if (i % 10 === 0) CF.renderTick(); }
    for (let i = 0; i < 60; i++) CF.renderTick();
    CF.camera = { pos: [bx + 9, by + 6, bz + 9], yaw: Math.atan2(-9, -9), pitch: -0.42 };
    CF.renderDraw(CF.camera);
    await new Promise((r) => setTimeout(r, 300));
  };
  const h = location.hash || '';
  if (h === '#test') runTests('all');
  else if (h.startsWith('#test=')) runTests(decodeURIComponent(h.slice(6)));
  else if (h.startsWith('#shot=')) runShot(h.slice(6));
})();
