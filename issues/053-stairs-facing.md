# Issue: 053 — stairs facing
- Type: FEAT | Status: DONE | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Depends: #052 (multi-box model). 1.12: stairs = 2 boxes (full half + step half), facing = direction of ASCENDING side (6 horiz metas: 0E1W2S3N4UP-5DN-flipped variants: keep horiz 4 + upside-down flag like slabs, craft 6 wood/stone in stair pattern (3+2+1... exact: row3 + row2-centered + row1? -> 4 wood -> 6 stairs), placement rotates by player yaw.
Scope: oak planks + cobblestone + stone stairs first (3 variants).
ACs:
- [x] collision: walk-up-one-step WITHOUT jump assert (physics uses box list)
- [x] facing-from-yaw assert x4
- [x] parity +3 variants
- [x] stair-run shot vision PASS w/ both boxes textured


## Acceptance criteria

## Evidence (close 2026-09-08)
- 3 stair blocks: oak_stairs(53 planks), stone_stairs(67 COBBLE texture = true 1.12, NOT smooth stone),
  brick_stairs(108). boxesOf(v,fm) resolver added (registry) as THE single source for multi-box models:
  meta 0E/1W/2S/3N (+bit4 upside-down) -> 2 boxes (base half + step half). All consumers (mesher, physics,
  placement, light passability via cellOpaque) route through boxesOf/cellOpaque - #052's inline bit-re-derivation
  in 4 files was the drift root-cause of #105/#106; now centralised.
- subRect: axis-aligned rect-minus for per-face culling (tread/riser exposed, buried interfaces vanish).
- CRITICAL BUG FOUND+FIXED via vision: my box-pass rewrite's subRect clamped BOTH uv-axes to [R0,R1]; V-values
  (world 250+) collapsed to a 1-element set -> EVERY box face returned 0 pieces -> all slabs AND stairs rendered
  as flat decals / black. Caught because slab-scene (shares the pass) broke in the SAME shot batch. clamp(lo,hi)
  per-axis fix restores correct culling; slab-scene re-verified pixel-identical to #052 baseline.
- physics box-vs-box collision (cellBoxesAbs + solidSpanXZ per-box) + footprint-aware cellTopAt (+0.55 penetration
  tolerance for half-box tops, player+mobs). Landing now rests on the highest box top overlapping the real
  footprint, so a stair step you're NOT over is correctly ignored.
- placement: dir = CF.dirFromYaw(p.yaw) (shared with #041 bed), bit4 when clicking a bottom face. FOUND latent
  in-game P1: CF.place used `p` which was never declared in its scope (bed line predates this) - bed was only
  ever tested via CF.bedPlace directly so the ReferenceError never fired; now const p = CF.player at top.
- save.flat: persist now RLE-encodes the chunk `flat` model-meta array (lazy-alloc on load). This ALSO closes a
  latent gap where slab halves / wall-torch faces / bed halves lost their meta bits across save+reload.
- +5 asserts (registry.stairs-model, physics.stairs-walkup, physics.slab-stand, interact.stairs-facing,
  items.stairs-craft, save.flat). Gate 224 full / 208 quick GREEN, 37 registry blocks.
- PARITY 53 -> 56/399 (14.0%); qa/blocks/{oak,stone,brick}_stairs.png + qa/2026-09-08/stair-run.png vision PASS
  (all 4 facings + upside-down + ascending run + slab multi-box mix).
- Known limitation (NOT #053): hard-shadow undersides of floating/overhang models render black because skylight
  does not bleed laterally under cover (same reason cave ceilings are black; #021/#031 baselines depend on it).
  Upside-down stairs still show a black underside in isolation - moved the demo prop under a solid ceiling so
  its down-face is buried. Smooth/ambient lighting is future work.
