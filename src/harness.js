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
          CF.assert(r, 'atlas.decoded', ok && img.width === (window.__ATLAS_SIZE || 128) && img.height === (window.__ATLAS_SIZE || 128));
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
    { name: 'bed', run: (r) => CF.bedTests && CF.bedTests(r) },
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
    if (CF._pauseEl) CF._pauseEl.style.display = 'none'; // #060 overlay is a DOM layer - never in promo/qa frames
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
    const vk = (location.search.match(/variant=([a-z0-9_]+)/) || [])[1]; // #049: variant-aware sheets
    const W = CF.world;
    W.ensureAround(10, 10, 2);
    for (let i = 0; i < 20 && W.stats().queue; i++) W.tick();
    const reg = CF.REGISTRY[name];
    const key = vk && reg.variants[vk] ? vk : Object.keys(reg.variants)[0];
    const id = reg.variants[key].id;
    document.title = 'BS:1-' + name;
    const by = 70;
    for (let x = 7; x <= 13; x++) for (let z = 7; z <= 13; z++) for (let y = by - 2; y < by + 8; y++) W.set(x, y, z, 0);
    for (let x = 7; x <= 13; x++) for (let z = 7; z <= 13; z++) W.set(x, by, z, CF.IDOF['stone']);
    W.set(10, by + 1, 10, id);
    document.title = 'BS:2';
    for (let i = 0; i < 100; i++) CF.renderTick();
    document.title = 'BS:3';
    const camx = 13.4, camy = by + 2.6, camz = 13.4, tx = 10.5, ty = by + 1.5, tz = 10.5;
    const horiz = Math.hypot(camx - tx, camz - tz);
    CF.camera = { pos: [camx, camy, camz], yaw: Math.atan2(tx - camx, tz - camz), pitch: -Math.atan2(camy - ty, horiz) };
    CF.renderDraw(CF.camera);
    document.title = 'BS:4';
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
    const isLiq = (x, y, z) => { const b = CF.BY_ID[W_get(x, y, z)]; return !!(b && b.liquid); };
    const W_get = (x, y, z) => CF.world.get(x, y, z);
    outer: for (const [cx2, cz2] of [[40, 40], [80, 20], [20, 80], [120, 120], [60, 100], [160, 40], [40, 160], [0, 0]]) {
      W.ensureAround(cx2, cz2, 1);
      for (let i = 0; i < 10 && W.stats().queue; i++) W.tick();
      const h0 = W.heightAt(cx2, cz2);
      if ([h0 - 1, h0, h0 + 1].some((y) => isLiq(cx2, y, cz2))) continue outer; // no pools in lakes
      for (let x = cx2 - 9; x <= cx2 + 9; x++) for (let z = cz2 - 9; z <= cz2 + 9; z++) if (W.heightAt(x, z) > h0 + 1) continue outer; // flat pad incl. camera approach
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
    CF.camera = { pos: [bx + 9, Math.max(by + 7, W.heightAt(bx + 9, bz + 9) + 3), bz + 9], yaw: Math.atan2(-9, -9), pitch: -0.55 }; // #046: lift above neighbouring hill (old camera sat inside terrain, hidden by the missing-faces bug)
    CF.renderDraw(CF.camera);
    const canvasPx = CF.canvas.width, canvasPy = CF.canvas.height;
    const px = (nx, ny) => { const q = new Uint8Array(4); CF.gl.readPixels((canvasPx * nx) | 0, (canvasPy * ny) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q); return [q[0], q[1], q[2], q[3]]; };
    const cov = [];
    for (let z = bz - 5; z <= bz + 5; z++) { let row = ''; for (let x = bx - 5; x <= bx + 5; x++) { const id = W.get(x, by + 1, z); row += id === CF.IDOF['water'] ? (W.flatAt ? (W.flatAt(x, by + 1, z) & 15) || 'S' : 'W') : (id ? '.' : ' '); } cov.push(row); }
    document.title = 'FP:' + encodeURIComponent(JSON.stringify({
      spot: [bx, bz], wtris: CF.rendererStats.wtris, waterLight: W.lightAt(bx + 1, by + 1, bz + 1),
      cam: CF.camera.pos.map((v) => +v.toFixed(1)), camBlk: W.get(Math.floor(CF.camera.pos[0]), Math.floor(CF.camera.pos[1]), Math.floor(CF.camera.pos[2])),
      camLight: W.lightAt(Math.floor(CF.camera.pos[0]), Math.floor(CF.camera.pos[1]), Math.floor(CF.camera.pos[2])), midLight: W.lightAt(bx + 4, by + 4, bz + 4),
      lightGrid: (() => { const g = []; for (let z = -3; z <= 3; z++) { let row = ''; for (let x = -3; x <= 3; x++) { const l = W.lightAt(bx + x, by + 2, bz + z); row += (l >> 4).toString(16); } g.push(row); } return g; })(),
      columns: (() => { const g = []; for (let x = -3; x <= 3; x++) { const c = []; for (let y = by; y <= by + 3; y++) { const id = W.get(bx + x, y, bz); c.push(id ? (CF.BY_ID[id].name[0] + (id === CF.IDOF['water'] ? (W.flatAt(bx + x, y, bz) & 7) : '')) : '_'); } g.push(c.join('')); } return g; })(),
      scanline: (() => { const out = []; const y0 = CF.canvas.height * 0.45 | 0; for (let i = 0; i < 14; i++) { const q = new Uint8Array(4); CF.gl.readPixels((CF.canvas.width * (0.28 + i * 0.035)) | 0, y0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q); out.push(q[1]); } return out; })(),
      missTiles: [...(CF.rendererStats.missingTiles || [])],
      pixCenter: px(0.5, 0.55), pixLeft: px(0.35, 0.5), glErr: CF.rendererStats.glErr, cov,
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
  CF.shotScenarios['tile-dump'] = async () => { // #049 debug: sample GL atlas texture pixels
    CF.freeCam = true;
    const gl = CF.gl, A = window.__ATLAS_SIZE;
    for (let i = 0; i < 30 && !CF.rendererStats.ready; i++) CF.renderTick();
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, window.__ATLAS_TEX, 0);
    const px = (x, y) => Array.from(window.__ATLAS_CANVAS.getContext('2d').getImageData(x, y, 1, 1).data);
    const mw = window.__TEXMETA.water, mg = window.__TEXMETA.glass;
    document.title = 'TD:' + JSON.stringify({ water: px(mw.x + 8, mw.y + 8), glassC: px(mg.x + 8, mg.y + 8), glassRim: px(mg.x + 1, mg.y + 1), dbgq: window.__DBGQ || null });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
    await new Promise((res) => setTimeout(res, 100));
  };
  CF.shotScenarios['slab-scene'] = async () => { // #052: bottom/top/double slabs scene
    CF.freeCam = true;
    const W = CF.world, rx = 260, rz = 260;
    W.ensureAround(rx, rz, 1);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    const h0 = Math.max(W.heightAt(rx, rz), 8);
    for (let x = rx - 5; x <= rx + 5; x++) for (let z = rz - 5; z <= rz + 5; z++) {
      for (let y = h0 + 1; y <= h0 + 10; y++) W.set(x, y, z, 0);
      W.set(x, h0, z, CF.IDOF['stone']);
    }
    W.set(rx - 2, h0 + 1, rz, CF.IDOF['stone_slab:cobblestone']); // bottom cobble
    W.set(rx - 1, h0 + 1, rz, CF.IDOF['stone_slab:cobblestone']); W.flatSet(rx - 1, h0 + 1, rz, 4); // double cobble
    W.set(rx, h0 + 1, rz, CF.IDOF['wooden_slab:oak']); W.flatSet(rx, h0 + 1, rz, 2); // top-half oak
    W.set(rx + 1, h0 + 1, rz, CF.IDOF['stone_slab:stone']); W.flatSet(rx + 1, h0 + 1, rz, 4); // double stone
    for (let i = 0; i < 400 && W.dirty.size; i++) CF.renderTick();
    for (let i = 0; i < 10; i++) CF.renderTick();
    CF.camera = { pos: [rx - 1, h0 + 3.2, rz + 6], yaw: Math.atan2(rx - 0.5 - (rx - 1), rz - (rz + 6)), pitch: -0.22 };
    CF.renderDraw(CF.camera);
    { // #052 trace
      const cells = {};
      for (const dx of [-2, -1, 0, 1]) for (const dy of [0, 1]) {
        const id = W.get(rx + dx, h0 + dy, rz);
        cells[dx + ',' + dy] = [id, id ? CF.BY_ID[id].name + ':' + CF.BY_ID[id].variant : 'air', W.flatAt(rx + dx, h0 + dy, rz)];
      }
      const q = new Uint8Array(4); CF.gl.readPixels((CF.canvas.width * 0.5) | 0, (CF.canvas.height * 0.5) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q);
      CF.renderDraw({ pos: [rx - 1.5, h0 + 5, rz + 0.01], yaw: Math.PI + 0.01, pitch: -1.2 });
      const q2 = new Uint8Array(4); CF.gl.readPixels((CF.canvas.width * 0.5) | 0, (CF.canvas.height * 0.5) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q2);
      CF.renderDraw({ pos: [rx - 1.5, h0 + 8, rz + 3.99], yaw: Math.PI, pitch: -0.9 });
      const q3 = new Uint8Array(4); CF.gl.readPixels((CF.canvas.width * 0.5) | 0, (CF.canvas.height * 0.44) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q3);
      document.title = 'SS:' + JSON.stringify({ h0, mid: [q[0], q[1], q[2]], over: [q2[0], q2[1], q2[2]], overBottom: [q3[0], q3[1], q3[2]], lights: [W.lightAt(rx - 2, h0 + 1, rz + 1), W.lightAt(rx - 2, h0 + 2, rz), W.lightAt(rx - 1, h0 + 2, rz + 1)], tris: CF.rendererStats.tris });
      CF.renderDraw(CF.camera);
    }
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['stair-run'] = async () => { // #053: ascending run + all 4 facings + upside-down + slab combo
    CF.freeCam = true;
    const W = CF.world, rx = 164, rz = 164; // keep inside one chunk pair for clean culling view
    W.ensureAround(rx, rz, 1);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    const g0 = Math.max(W.heightAt(rx, rz), 8);
    for (let x = rx - 6; x <= rx + 6; x++) for (let z = rz - 6; z <= rz + 6; z++) {
      for (let y = g0; y < g0 + 12; y++) W.set(x, y, z, 0); // carve tall so no tree occludes
      W.set(x, g0 - 1, z, CF.IDOF['stone']);
    }
    for (let i = 0; i < 4; i++) { // ascending oak run toward +X, rise every 2, low edge to -Z
      const yy = g0 + (i >> 1);
      W.set(rx - 1 + i, yy, rz + 2, CF.IDOF['oak_stairs']); W.flatSet(rx - 1 + i, yy, rz + 2, 0); // facing +X
    }
    W.set(rx + 3, g0 + 2, rz + 2, CF.IDOF['stone']); // landing
    for (let i = 0; i < 4; i++) { // all 4 facings E W S N (cobble stone_stairs) front row
      W.set(rx - 2 + i, g0, rz - 3, CF.IDOF['stone_stairs']); W.flatSet(rx - 2 + i, g0, rz - 3, i);
    }
    W.set(rx - 2, g0 + 3, rz + 0, CF.IDOF['stone']); // ceiling block (bricks top buried under it = 1.12 upside-down mount)
    W.set(rx - 2, g0 + 2, rz + 0, CF.IDOF['brick_stairs']); W.flatSet(rx - 2, g0 + 2, rz + 0, 4); // upside-down brick
    // separate slab beside the far end of the ascending run (multi-box mix, doesn't cover a facing)
    W.set(rx + 4, g0 + 2, rz + 3, CF.IDOF['stone_slab:stone']);
    W.ensureLight(rx >> 4, rz >> 4);
    for (let i = 0; i < 10; i++) W.tick();
    for (let i = 0; i < 400 && W.dirty.size; i++) CF.renderTick();
    CF.camera = { pos: [rx - 4.5, g0 + 3.6, rz - 7.5], yaw: Math.atan2(4.5, 9.5), pitch: -0.3 }; // look down at tops, not the shadowed undersides
    CF.renderDraw(CF.camera);
    document.title = 'SR:' + JSON.stringify({ g0, tris: CF.rendererStats.tris, miss: [...CF.rendererStats.missingTiles || []] });
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['farm-scene'] = async () => { // #054: farmland + all crop growth stages + trampled patch
    CF.freeCam = true;
    const W = CF.world, rx = 240, rz = 240; // far from every test arena
    W.ensureAround(rx, rz, 1);
    for (let i = 0; i < 20 && W.stats().queue; i++) W.tick();
    const g0 = Math.max(W.heightAt(rx, rz), 8);
    for (let x = rx - 6; x <= rx + 6; x++) for (let z = rz - 5; z <= rz + 5; z++) {
      for (let y = g0; y < g0 + 9; y++) W.set(x, y, z, 0);
      W.set(x, g0 - 1, z, CF.IDOF['dirt']);
    }
    for (let i = 0; i < 5; i++) { // wheat stages 0,2,4,6,7 on farmland
      W.set(rx - 4 + i, g0 - 1, rz - 2, CF.IDOF['farmland']);
      W.set(rx - 4 + i, g0, rz - 2, CF.IDOF['wheat']); W.flatSet(rx - 4 + i, g0, rz - 2, [0, 2, 4, 6, 7][i]);
    }
    for (let i = 0; i < 3; i++) { // carrots 0/3/6
      W.set(rx - 2 + i, g0 - 1, rz + 1, CF.IDOF['farmland']);
      W.set(rx - 2 + i, g0, rz + 1, CF.IDOF['carrot']); W.flatSet(rx - 2 + i, g0, rz + 1, i * 3);
    }
    for (let i = 0; i < 3; i++) { // potatoes 0/3/7
      W.set(rx - 2 + i, g0 - 1, rz + 3, CF.IDOF['farmland']);
      W.set(rx - 2 + i, g0, rz + 3, CF.IDOF['potato']); W.flatSet(rx - 2 + i, g0, rz + 3, [0, 3, 7][i]);
    }
    W.set(rx + 3, g0 - 1, rz - 2, CF.IDOF['farmland']); // freshly tilled empty strip
    W.set(rx + 4, g0 - 1, rz - 2, CF.IDOF['grass']); // untrampled grass reference
    W.ensureLight(rx >> 4, rz >> 4);
    for (let i = 0; i < 8; i++) W.tick();
    for (let i = 0; i < 400 && W.dirty.size; i++) CF.renderTick();
    CF.camera = { pos: [rx - 6.5, g0 + 2.2, rz + 6.5], yaw: Math.atan2(6.5, -6.5), pitch: -0.24 };
    CF.renderDraw(CF.camera);
    document.title = 'FS:' + JSON.stringify({ g0, tris: CF.rendererStats.tris, miss: [...(CF.rendererStats.missingTiles || [])] });
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['ui-book'] = async () => { // #059: workbench GUI - 3x3 grid + recipe book, pickaxe clicked-fill
    const P = CF.player, W = CF.world;
    CF.freeCam = false;
    W.ensureAround(30, 30, 2);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    const gy = W.heightAt(30, 30);
    W.set(30, gy, 32, CF.IDOF['crafting_table']);
    P.tp(30.5, gy + 1, 30.5); P.yaw = Math.PI; P.pitch = 0;
    CF.inv.fill(null); CF.give('planks', 6); CF.give('stick', 4);
    CF.useBlock({ x: 30, y: gy, z: 32 });
    const list = CF.RECIPES.map((r, i) => i); // find pickaxe through the book list the UI builds
    const pick = list.map((i) => ({ i, r: CF.RECIPES[i] })).filter((x) => x.r.out && x.r.out.name === 'wood_pickaxe')[0];
    CF.bookFill(pick.i);
    await new Promise((x) => setTimeout(x, 400));
    document.title = 'UB:' + encodeURIComponent(JSON.stringify({ result: CF.ui.result && CF.ui.result.name, slots: document.querySelectorAll('#inv .book .r').length }));
  };
  CF.shotScenarios['far-field'] = async () => { // #058: real-tick walk 300+ blocks from spawn, then look back at the streamed edge
    CF.freeCam = false;
    const W = CF.world, P = CF.player;
    P.tp(8.5, W.heightAt(8, 8) + 2, 8.5); P.yaw = Math.PI / 4; P.pitch = -0.05;
    P.input.scripted = true; P.input.f = 1; P.input.jump = true;
    let ticks = 0;
    while (ticks < 1600 && Math.hypot(P.pos[0] - 8.5, P.pos[2] - 8.5) < 300) {
      CF.playerTick(); W.ensureAround(P.pos[0], P.pos[2], 4); W.tick(); CF.renderTick(); ticks++;
    }
    P.input.f = 0; P.input.jump = false; P.input.scripted = false;
    CF.freeCam = true; // keep the game loop's boot-intro overlay out of the final frame
    if (CF._pauseEl) CF._pauseEl.style.display = 'none'; // headless loops tick sparsely - hide explicitly
    for (let i = 0; i < 60 && W.stats().queue; i++) { W.tick(); CF.renderTick(); }
    for (let i = 0; i < 40; i++) CF.renderTick();
    CF.camera = { pos: [P.pos[0] - 5, P.pos[1] + 9, P.pos[2] - 5], yaw: Math.PI / 4 + Math.PI, pitch: -0.22 }; // float behind/above, looking back over the traversed trail
    CF.renderDraw(CF.camera);
    document.title = 'FF:' + encodeURIComponent(JSON.stringify({
      pos: P.pos.map((v) => Math.round(v)), chunks: W.stats().chunks, mapped: CF.rendererStats.mapped,
      drawn: CF.rendererStats.drawn, tris: CF.rendererStats.tris, sim: Math.round(CF.simMs || 0),
      ov: CF._pauseEl ? CF._pauseEl.style.display : 'NOEL', paused: !!CF.paused, free: !!CF.freeCam,
    }));
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['nether-warp'] = async () => { // #055 AC: stand at portal in nether, SAVE, RELOAD, same position
    const W = CF.world, P = CF.player;
    CF.freeCam = false;
    const px = 40, pz = 40;
    W.ensureAround(px, pz, 2);
    for (let i = 0; i < 60 && W.stats().queue; i++) W.tick();
    const g = W.heightAt(px, pz);
    for (let x = px - 3; x <= px + 5; x++) for (let z = pz - 2; z <= pz + 2; z++) for (let y = g; y < g + 9; y++) W.set(x, y, z, 0);
    const OBS = CF.IDOF['obsidian'];
    for (const x of [px, px + 1]) { W.set(x, g - 1, pz, OBS); W.set(x, g + 3, pz, OBS); }
    for (let y = g; y <= g + 2; y++) { W.set(px - 1, y, pz, OBS); W.set(px + 2, y, pz, OBS); }
    const invSave = CF.inv.map((s) => (s ? { name: s.name, count: s.count } : null)), selSave = CF.sel;
    CF.inv.fill(null); CF.inv[0] = { name: 'flint_and_steel', count: 1 }; CF.sel = 0;
    CF.portalTryIgnite({ x: px, y: g - 1, z: pz, face: [0, 1, 0] });
    P.tp(px + 0.5, g + 0.95, pz + 0.5);
    CF.warpArmed = true; CF.portalStepTick(); // -> nether
    for (let i = 0; i < 40 && CF.world.dirty.size; i++) { CF.world.tick(); CF.renderTick(); }
    const before = { dim: CF.activeDim, pos: P.pos.map((v) => Math.round(v * 10) / 10) };
    CF.saveNow();
    CF.loadNow();
    for (let i = 0; i < 60 && (CF.world.stats().queue || CF.world.dirty.size); i++) { CF.world.tick(); CF.renderTick(); }
    const after = { dim: CF.activeDim, pos: P.pos.map((v) => Math.round(v * 10) / 10) };
    for (let i = 0; i < 40; i++) CF.renderTick();
    CF.freeCam = true;
    let pc = null;
    const nw = CF.world;
    for (let x = 0; x < 24 && !pc; x++) for (let z = 0; z < 24 && !pc; z++) for (let y = 55; y < 100 && !pc; y++) if (nw.get(x, y, z) === CF.IDOF['portal']) pc = [x, y, z];
    if (!pc) pc = [Math.floor(P.pos[0]), Math.floor(P.pos[1] - 0.9), Math.floor(P.pos[2])]; // never throw mid-shot
    const look = [pc[0] + 1, pc[1] + 1.5, pc[2] + 0.5];
    const cpos = [look[0] + 3.5, look[1] + 1.8, look[2] + 3.5];
    const dxy = Math.hypot(look[0] - cpos[0], look[2] - cpos[2]);
    for (let t = 0; t <= 20; t++) { // carve the line-of-sight corridor (post-save; persisted state untouched)
      const cx3 = Math.round(cpos[0] + (look[0] - cpos[0]) * t / 20), cy3 = Math.round(cpos[1] + (look[1] - cpos[1]) * t / 20), cz3 = Math.round(cpos[2] + (look[2] - cpos[2]) * t / 20);
      for (let x = cx3 - 1; x <= cx3 + 1; x++) for (let y = cy3 - 1; y <= cy3 + 2; y++) for (let z = cz3 - 1; z <= cz3 + 1; z++) {
        const id = nw.get(x, y, z);
        if (id && id !== CF.IDOF['obsidian'] && id !== CF.IDOF['portal']) nw.set(x, y, z, 0);
      }
    }
    for (let i = 0; i < 80 && nw.dirty.size; i++) { nw.tick(); CF.renderTick(); }
    CF.camera = { pos: cpos, yaw: Math.atan2(look[0] - cpos[0], look[2] - cpos[2]), pitch: Math.atan2(look[1] - cpos[1], dxy) };
    CF.renderDraw(CF.camera);
    document.title = 'NW:' + encodeURIComponent(JSON.stringify({ before, after, same: JSON.stringify(before) === JSON.stringify(after), pc }));
    CF.inv.fill(null); for (const s of invSave) if (s) CF.give(s.name, s.count); CF.sel = selSave;
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['storage-wall'] = async () => { // #051: gold/iron/diamond/brick/clay row
    CF.freeCam = true;
    const W = CF.world, rx = 120, rz = 120;
    W.ensureAround(rx, rz, 1);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    const h0 = Math.max(W.heightAt(rx, rz), 8);
    for (let x = rx - 6; x <= rx + 6; x++) for (let z = rz - 6; z <= rz + 6; z++) {
      for (let y = h0 + 1; y <= h0 + 12; y++) W.set(x, y, z, 0);
      W.set(x, h0, z, CF.IDOF['stone']);
    }
    ['gold_block', 'iron_block', 'diamond_block', 'brick_block', 'clay'].forEach((n, i) => { W.set(rx - 2 + i, h0 + 1, rz, CF.IDOF[n]); });
    for (let i = 0; i < 300 && W.dirty.size; i++) CF.renderTick();
    for (let i = 0; i < 10; i++) CF.renderTick();
    CF.camera = { pos: [rx + 0.5, h0 + 2.6, rz + 5.5], yaw: Math.PI + 0.1, pitch: -0.22 };
    CF.renderDraw(CF.camera);
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['wool-wall'] = async () => { // #050: all 16 wool colors as a wall
    CF.freeCam = true;
    const W = CF.world, rx = 200, rz = 200;
    W.ensureAround(rx, rz, 1);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    const h0 = Math.max(W.heightAt(rx, rz), 8);
    for (let x = rx - 6; x <= rx + 6; x++) for (let z = rz - 6; z <= rz + 6; z++) {
      for (let y = h0 + 1; y <= h0 + 12; y++) W.set(x, y, z, 0);
      W.set(x, h0, z, CF.IDOF['stone']);
    }
    const cols = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    cols.forEach((c, i) => {
      const x = rx - 3 + (i % 4), y = h0 + 1 + ((i / 4) | 0), z = rz - 3;
      W.set(x, y, z, CF.IDOF['wool:' + c]);
    });
    for (let i = 0; i < 300 && W.dirty.size; i++) CF.renderTick();
    for (let i = 0; i < 10; i++) CF.renderTick();
    CF.camera = { pos: [rx - 1, h0 + 3.2, rz + 3.5], yaw: Math.atan2(rx - 1.5 - (rx - 1), rz - 3 - (rz + 3.5)), pitch: -0.05 };
    CF.renderDraw(CF.camera);
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['water-min'] = async () => { // #049 debug: single water source, bare surroundings, top view
    CF.freeCam = true;
    const W = CF.world, rx = 300, rz = 300;
    W.ensureAround(rx, rz, 2);
    for (let i = 0; i < 40 && W.stats().queue; i++) W.tick();
    const h0 = Math.max(W.heightAt(rx, rz), 8);
    for (let x = rx - 4; x <= rx + 4; x++) for (let z = rz - 4; z <= rz + 4; z++) {
      for (let y = h0 + 1; y <= h0 + 10; y++) W.set(x, y, z, 0);
      W.set(x, h0, z, CF.IDOF['stone']);
    }
    W.set(rx, h0 + 1, rz, CF.IDOF['water']);
    for (let i = 0; i < 300 && W.dirty.size; i++) CF.renderTick();
    for (let i = 0; i < 10; i++) CF.renderTick();
    CF.camera = { pos: [rx + 0.5, h0 + 8, rz + 0.6], yaw: Math.PI, pitch: -1.2 };
    CF.renderDraw(CF.camera);
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['bucket-demo'] = async () => { // #043: bucket icons in hotbar + source pools, seen from the corner
    CF.freeCam = true;
    const W = CF.world, rx = 44, rz = 160, py = 64;
    W.ensureAround(rx, rz, 2);
    for (let i = 0; i < 40 && W.stats().queue; i++) W.tick();
    const h0 = Math.max(W.heightAt(rx, rz), 8);
    for (let x = rx - 6; x <= rx + 6; x++) for (let z = rz - 6; z <= rz + 6; z++) {
      for (let y = h0 + 1; y <= h0 + 12; y++) W.set(x, y, z, 0); // #049: deep enough for neighboring hilltops (was +6 - pads filled with uncut terrain)
      W.set(x, h0, z, CF.IDOF['stone']);
    }
    const noW = location.search.includes('nowater'); // #049 elimination probe
    for (let x = rx - 3; x <= rx - 1; x++) for (let z = rz - 2; z <= rz; z++) { if (!noW) W.set(x, h0 + 1, z, CF.IDOF['water']); }
    for (let x = rx + 3; x <= rx + 5; x++) for (let z = rz - 2; z <= rz; z++) { W.set(x, h0 + 1, z, CF.IDOF['lava']); W.flatSet(x, h0 + 1, z, 0); } // #049: wider gap - virtual 400ms ~= 60 sim ticks made water eat the lava (correct MC, wrong demo)
    for (let x = rx - 5; x <= rx + 5; x++) for (const dz of [-4, 2]) for (let dy = 1; dy <= 2; dy++) W.set(x, h0 + dy, rz + dz, CF.IDOF['stone']); // #049 basins: 2-tall walls so pools stay pool-shaped for the camera
    for (let z = rz - 4; z <= rz + 2; z++) for (const dx of [-5, 5]) for (let dy = 1; dy <= 2; dy++) W.set(rx + dx, h0 + dy, z, CF.IDOF['stone']);
    CF.mobTick = () => {}; CF.survival = false;
    CF.inv.fill(null);
    CF.inv[0] = { name: 'bucket', count: 1 }; CF.inv[1] = { name: 'water_bucket', count: 1 }; CF.inv[2] = { name: 'lava_bucket', count: 1 };
    CF.timeOffset = 600;
    CF.camera = { pos: [rx + 9, h0 + 7, rz + 9], yaw: Math.atan2(-9, -9), pitch: -0.5 };
    if (location.search.includes('topview')) CF.camera = { pos: [rx - 2.5, h0 + 7, rz - 1.5], yaw: 0.001, pitch: -1.5 }; // #049 debug
    for (let i = 0; i < 200 && W.dirty.size; i++) CF.renderTick();
    CF.renderDraw(CF.camera);
    { const q = new Uint8Array(4); CF.gl.readPixels((CF.canvas.width * 0.5) | 0, (CF.canvas.height * 0.42) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q); const w1 = W.get(rx - 2, h0 + 1, rz - 1); document.title = 'BD:' + JSON.stringify({ px: [q[0], q[1], q[2]], cell: w1, lv: W.flatAt(rx - 2, h0 + 1, rz - 1), liq: CF.BY_ID[w1] && CF.BY_ID[w1].liquid, wtris: CF.rendererStats.wtris, dbgq: window.__DBGQ || null }); }
    await new Promise((res) => setTimeout(res, 120));
  };
  CF.shotScenarios['mob-px'] = async () => { // #046 debug/evidence: EXACT mob.px-draw test setup, visible
    CF.freeCam = true;
    const W = CF.world, M = CF.mobs, rx = 44, rz = 100, py0 = 96;
    W.ensureAround(rx, rz, 1);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    for (let x = rx - 4; x <= rx + 4; x++) for (let z = rz - 4; z <= rz + 4; z++) { W.set(x, py0, z, CF.IDOF['stone']); for (let y = py0 + 1; y <= py0 + 6; y++) W.set(x, y, z, 0); }
    W.ensureLight(rx >> 4, rz >> 4); for (let i = 0; i < 8; i++) W.tick();
    for (let i = 0; i < 400 && W.dirty.size; i++) CF.renderTick();
    M.clear(); M.sched = false; const zc = M.spawn('zombie', rx + 0.5, py0 + 1, rz - 2.5);
    for (let t = 0; t < 6; t++) M.step(zc);
    CF.camera = { pos: [rx + 0.5, py0 + 2.5, rz + 0.5], yaw: Math.PI, pitch: Math.atan2((py0 + 1.9) - (py0 + 2.5), 3.0) };
    CF.timeOffset = 6000;
    document.title = 'MPX:' + encodeURIComponent(JSON.stringify({ z: zc.pos.map((v) => +v.toFixed(2)), tris: CF.rendererStats.tris, map: CF.rendererStats.mapped }));
    CF.renderDraw(CF.camera);
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['torch-probe'] = async () => { // #105 calib: single torch, side camera like interact.torch-up
    CF.freeCam = true;
    const W = CF.world;
    W.ensureAround(78, 78, 1);
    for (let i = 0; i < 20 && W.stats().queue; i++) W.tick();
    const h = W.heightAt(78, 78) - 1;
    for (let x = 76; x <= 80; x++) for (let z = 75; z <= 83; z++) for (let y = h + 1; y < h + 8; y++) W.set(x, y, z, 0);
    W.set(78, h + 1, 78, CF.IDOF['torch']);
    W.ensureLight(78 >> 4, 78 >> 4);
    for (let i = 0; i < 8; i++) W.tick();
    for (let i = 0; i < 300 && W.dirty.size; i++) CF.renderTick();
    CF.camera = { pos: [78.5, h + 2.2, 80.0], yaw: Math.PI, pitch: -0.34 };
    CF.renderDraw(CF.camera);
    document.title = 'TP:' + JSON.stringify({ h, present: W.get(78, h + 1, 78), light: W.lightAt(78, h + 1, 78), tris: CF.rendererStats.tris });
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['place-black'] = async () => { // #106 repro: stone on untouched terrain; emulate pushQuad light sampler per face
    CF.freeCam = true;
    const W = CF.world, rx = 60, rz = 60;
    W.ensureAround(rx, rz, 2);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    for (let i = 0; i < 200 && W.dirty.size; i++) CF.renderTick();
    const gy = W.heightAt(rx, rz); // first air above natural surface
    W.set(rx, gy, rz, CF.IDOF['stone']);
    for (let i = 0; i < 10; i++) W.tick();
    for (let i = 0; i < 200 && W.dirty.size; i++) CF.renderTick();
    const out = { gy, faces: {} };
    const S = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (const [dx, dy, dz] of S) {
      // pushQuad sampler for +face: plane sits at cell max boundary -> floor lands in NEIGHBOR cell;
      // for -face (after #106 fix): plane at min boundary - 0.001 -> floor lands in neighbor too.
      const nx = rx + dx, ny = gy + dy, nz = rz + dz;
      const fx = dx > 0 ? rx + 1 - 0.001 : dx < 0 ? rx - 0.001 : rx + 0.5;
      const fy = dy > 0 ? gy + 1 - 0.001 : dy < 0 ? gy - 0.001 : gy + 0.5;
      const fz = dz > 0 ? rz + 1 - 0.001 : dz < 0 ? rz - 0.001 : rz + 0.5;
      out.faces[[dx, dy, dz]] = { nbLight: W.lightAt(nx, ny, nz), nbId: W.get(nx, ny, nz), sample: W.lightAt(Math.floor(fx), Math.floor(fy), Math.floor(fz)) };
    }
    const cam = { pos: [rx + 3.4, gy + 2.6, rz + 3.4], yaw: Math.PI / 4 + Math.PI, pitch: -0.5 };
    document.title = 'BL:' + encodeURIComponent(JSON.stringify(out));
    CF.renderDraw(cam);
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['drop-pickup'] = async () => { // #060: three thrown item billboards (block item + pure item + stairs) resting on a clean floor
    CF.freeCam = true;
    const W = CF.world, rx = 94, rz = 94;
    W.ensureAround(rx, rz, 1);
    for (let i = 0; i < 20 && W.stats().queue; i++) W.tick();
    const g0 = Math.max(W.heightAt(rx, rz), 8);
    for (let x = rx - 5; x <= rx + 5; x++) for (let z = rz - 5; z <= rz + 5; z++) {
      for (let y = g0; y < g0 + 8; y++) W.set(x, y, z, 0);
      W.set(x, g0 - 1, z, CF.IDOF['stone']);
    }
    W.ensureLight(rx >> 4, rz >> 4);
    for (let i = 0; i < 6; i++) W.tick();
    for (let i = 0; i < 300 && W.dirty.size; i++) CF.renderTick();
    for (const [n, name] of [[0, 'cobblestone'], [1, 'apple'], [2, 'stone_stairs']]) {
      CF.itemEnts.push({ name, n: 1, x: rx - 0.7 + n * 0.7, y: g0 + 2.2, z: rz, vx: 0, vy: 0, vz: 0, age: 20, ph: n * 2.1 });
    }
    for (let i = 0; i < 40; i++) CF.itemTick(); // let them fall to rest
    const restY = CF.itemEnts.map((e) => +e.y.toFixed(2));
    const cam = { pos: [rx, g0 + 0.55, rz + 3.0], yaw: Math.PI, pitch: 0.02 }; // eye-height close-up on the icons
    CF.camera = cam;
    CF.renderDraw(cam);
    document.title = 'DI:' + JSON.stringify({ restY, floorTop: g0, itris: CF.rendererStats.itris, cnt: CF.itemEnts.length });
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['face-lit-scene'] = async () => { // #106 calibration: cobble wall -X face dead-on
    CF.freeCam = true;
    const W = CF.world, rx = 148, rz = 148;
    W.ensureAround(rx, rz, 1);
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    const g0 = W.heightAt(rx, rz);
    for (let x = rx - 4; x <= rx + 4; x++) for (let z = rz - 4; z <= rz + 4; z++) {
      for (let y = g0; y < g0 + 8; y++) W.set(x, y, z, 0);
      W.set(x, g0 - 1, z, CF.IDOF['stone']);
    }
    for (let x = rx - 1; x <= rx + 1; x++) for (let z = rz - 1; z <= rz + 1; z++) W.set(x, g0, z, CF.IDOF['cobblestone']);
    W.ensureLight(rx >> 4, rz >> 4);
    for (let i = 0; i < 10; i++) W.tick();
    for (let i = 0; i < 200 && W.dirty.size; i++) CF.renderTick();
    CF.camera = { pos: [rx - 3.4, g0 + 0.65, rz], yaw: Math.PI / 2, pitch: -0.05 };
    CF.renderDraw(CF.camera);
    { // #106 diagnostics: re-draw with a dedicated probe camera (GL backbuffer may reset after compositor swap), then sample
      CF.renderDraw({ pos: [rx - 2.6, g0 + 0.55, rz], yaw: Math.PI / 2, pitch: -0.05 });
      const q = new Uint8Array(4);
      const pxs = [[0.5, 0.52], [0.5, 0.46], [0.44, 0.5], [0.56, 0.5], [0.5, 0.62]];
      const samples = pxs.map(([fx, fy]) => { CF.gl.readPixels((CF.canvas.width * fx) | 0, (CF.canvas.height * fy) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q); return [q[0], q[1], q[2]]; });
      const px1 = (fx, fy) => { CF.gl.readPixels((CF.canvas.width * fx) | 0, (CF.canvas.height * fy) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q); return [q[0], q[1], q[2]]; };
      CF.renderDraw({ pos: [rx - 3.4, g0 + 2.5, rz + 4], yaw: Math.PI / 2 + 0.6, pitch: -0.35 }); // angled from -X+Z above: floor + both wall faces visible
      const angled = { flr: px1(0.5, 0.30), wallL: px1(0.42, 0.52), wallR: px1(0.62, 0.5), sky: px1(0.5, 0.86) };
      CF.renderDraw(CF.camera);
      document.title = 'FL:' + encodeURIComponent(JSON.stringify({ g0, Lnb: W.lightAt(rx - 2, g0, rz), Labove: W.lightAt(rx, g0 + 1, rz), Lwall: W.lightAt(rx, g0, rz), tris: CF.rendererStats.tris, samples, angled }));
    }
    await new Promise((res) => setTimeout(res, 300));
  };
  CF.shotScenarios['faces-corner'] = async () => { // #046: camera at the -X/-Z corner sees faces that were never meshed
    CF.freeCam = true;
    const W = CF.world;
    W.ensureAround(10, 10, 1);
    for (let i = 0; i < 20 && W.stats().queue; i++) W.tick();
    const by = 70;
    for (let x = 7; x <= 13; x++) for (let z = 7; z <= 13; z++) for (let y = by - 2; y < by + 8; y++) W.set(x, y, z, 0);
    for (let x = 7; x <= 13; x++) for (let z = 7; z <= 13; z++) W.set(x, by - 1, z, CF.IDOF['stone']);
    W.set(10, by, 10, CF.IDOF['log']); // bark sides + ring top/bottom
    W.set(11, by, 10, CF.IDOF['grass']); // reference block
    W.ensureLight(10 >> 4, 10 >> 4); // #106: relight NOW (the old code only ran renderTick -> light queue never drained -> stale 0 = black faces)
    for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
    CF.__DBGF = []; // #106 TEMP: capture pushQuad sampler values for the probe area
    for (let i = 0; i < 400 && W.dirty.size; i++) CF.renderTick(); // drain rebuild budget (2/tick)
    for (let i = 0; i < 10; i++) CF.renderTick();
    CF.camera = { pos: [6.6, by + 1.4, 6.6], yaw: Math.atan2(10.5 - 6.6, 10.5 - 6.6), pitch: -0.25 };
    CF.renderDraw(CF.camera);
    { // #106 TEMP: neighbors of the two raised blocks + what the sampler reads
      const q = new Uint8Array(4);
      const px1 = (fx, fy) => { CF.gl.readPixels((CF.canvas.width * fx) | 0, (CF.canvas.height * fy) | 0, 1, 1, CF.gl.RGBA, CF.gl.UNSIGNED_BYTE, q); return [q[0], q[1], q[2]]; };
      document.title = 'FC:' + encodeURIComponent(JSON.stringify({
        L9: W.lightAt(9, by, 10), L11: W.lightAt(11, by, 11), L10top: W.lightAt(10, by + 1, 10), L10: W.lightAt(10, by, 10),
        blk9: W.get(9, by, 10), pxLo: px1(0.5, 0.5), pxHi: px1(0.5, 0.62), pxPlat: px1(0.5, 0.38), tris: CF.rendererStats.tris,
      }));
    }
    CF.renderDraw(CF.camera);
    await new Promise((res) => setTimeout(res, 200));
  };
})();
