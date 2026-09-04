# Issue: 002 — Chunked worldgen core
- Type: FEAT | Status: IN_PROGRESS | Epic: E2 | Sprint: 01 | Depends: #001 | Spike: SPK-3 GO

## Spec
Infinite world seeded from `seed`: 16x128x16 chunks, `Uint8Array` blocks (SPK-3 rule),
lazy-generate around player (radius 4, <=2 chunks/tick), get/setBlock, dirty-chunk
marking incl. neighbors on cross-boundary edits. Terrain: value-noise height 62±30;
layers grass/dirt x3/stone, bedrock y0; 3D-noise caves; depth-gated ores
(coal<40, iron<30, gold<16, diamond<12); temperature-noise biomes (plains=grass,
desert=sand, cold=snow top); oak trees on grass columns (log+leaves).
1.12.2 parity: layer/ore-depth behavior per docs/REFERENCE.md (biomes subset OK).

## Acceptance criteria
- [ ] AC1 harness: getBlock solid at surface, air above, bedrock at y0; deterministic w/ seed
- [ ] AC2 harness: setBlock persists; cross-chunk edit dirties neighbor
- [ ] AC3 harness: <=2 chunk gens per tick; 25+ chunks alive at radius 4
- [ ] AC4 screenshot: terrain silhouette w/ grass tops, trees visible
- [ ] AC5 ores exist (sampled stats >0 below thresholds)

## Test plan / Risk
worldTests asserts; scenario `starter-world`; SPK-3 budget GO.
