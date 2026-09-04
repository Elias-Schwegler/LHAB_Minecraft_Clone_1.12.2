# SPK-6 — Headless screenshot + test harness
Verdict: **GO**
Date: 2026-09-04. Promoted: the harness itself (src/harness.js, tools/test.mjs,
tools/shot.mjs, tools/lib.mjs — already on main via bootstrap).

## Experiment / Evidence
- `node tools/test.mjs` -> TEST GREEN (pass: boot.ready, gl.webgl2, loop.ticks,
  registry.json, atlas.decoded; 0 console errors captured via window.onerror hook).
- `node tools/shot.mjs scaffold-smoke` -> valid PNG; read by vision model (verified
  sky-blue WebGL clear render) — the full loop "screenshot -> agent vision check"
  is operational.
- WebGL2 confirmed in headless via readPixels (0,255,0,255); SPK-1 screenshot proved
  textured/lit rendering flows through the pipeline.

## Key learnings baked in
1. `--virtual-time-budget` fast-forwards `setInterval`/`setTimeout` timers but NOT
   requestAnimationFrame — hence: game sim MUST be setInterval-driven; render-only on rAF.
2. Test results cross the process boundary via document.title
   (`TESTRESULT:` + encodeURIComponent(JSON)); dump-dom captures it.
3. Edge may exit non-zero after --dump-dom; tools capture stdout regardless.
4. Screenshot needs preserveDrawingBuffer:true on the context (done in game.js).
5. Headless software-GL => never gate on headless FPS; gate on JS budgets + visuals.
