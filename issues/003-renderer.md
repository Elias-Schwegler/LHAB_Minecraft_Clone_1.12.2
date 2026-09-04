# Issue: 003 â€” Chunk renderer integration
- Type: FEAT | Status: DONE | Epic: E1 | Sprint: 01 | Depends: #002, #004 | Spike: SPK-1 GO

## Spec
Port SPK-1 mesher to src/render.js: greedy mesh per chunk, atlas UVs (per-face tile,
inset 0.25px to stop bleed), face shade + fog, NEAREST filtering, magenta fallback for
missing tile, incremental rebuild queue (<=2 chunks/tick), camera = player eye.
Shader compile/link errors surface in harness errors list.

## Acceptance criteria
- [x] AC1 harness: renderer stats: meshes built > 0, triangles > 0, glError 0
- [x] AC2 harness: dirty chunk rebuilt within 2 ticks of setBlock
- [x] AC3 screenshot: textured terrain (nearest, no bleed), fog horizon, no magenta
- [x] AC4 headless perf: full world (25 chunks) first-mesh < 2s

## Evidence (close)
- AC1 PASS: render.merged(80/81), tris(30910), glErr 0 (test.mjs GREEN, 26 asserts).
- AC2 PASS: render.dirty-fast (set->rebuilt within 2 renderTicks).
- AC3 PASS vision (qa/2026-09-04/starter-world.png seed=5): grass tiles green w/ speckle
  readable, stone/dirt cliffs exposed, trees (log+leaves blobs) mid-ground, fog horizon,
  crisp NEAREST edges, ZERO magenta. Verdict: PASS.
- AC4 PASS: full 81-chunk world meshed in 700ms deterministic virtual time (harness).
- Debug learnings -> AGENTS.md: WebGL texImage2D uploads image TOP row at v=0 (no flip) —
  UV v-mapping must match; greedy quads need per-block UV tiling + per-face orientation.