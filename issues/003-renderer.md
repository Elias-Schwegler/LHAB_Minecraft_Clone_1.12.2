# Issue: 003 — Chunk renderer integration
- Type: FEAT | Status: READY | Epic: E1 | Sprint: 01 | Depends: #002, #004 | Spike: SPK-1 GO

## Spec
Port SPK-1 mesher to src/render.js: greedy mesh per chunk, atlas UVs (per-face tile,
inset 0.25px to stop bleed), face shade + fog, NEAREST filtering, magenta fallback for
missing tile, incremental rebuild queue (<=2 chunks/tick), camera = player eye.
Shader compile/link errors surface in harness errors list.

## Acceptance criteria
- [ ] AC1 harness: renderer stats: meshes built > 0, triangles > 0, glError 0
- [ ] AC2 harness: dirty chunk rebuilt within 2 ticks of setBlock
- [ ] AC3 screenshot: textured terrain (nearest, no bleed), fog horizon, no magenta
- [ ] AC4 headless perf: full world (25 chunks) first-mesh < 2s
