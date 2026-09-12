# SPK-8 — Redstone signal model + sim budget at scale (issue #057)
Date: 2026-09-12 · Verdict: **GO with MODEL A (full re-flood per change, relight-style)** · Time used: <1 iteration
Method: throwaway pure-Node bench spike/redstone-sim.mjs (Map-based sparse cells = our chunk-map cost class).
NO game-behavior changes were made (main stayed green throughout; nothing in src/ touched).

## What was measured
Three layouts, two propagation models:
- **A FULL**: zero all cell power + multi-source BFS from every torch, dust decays 15->0 per hop, repeater
  re-boosts to 15 (orientation-free simplification: halves edge count only, not cost class).
  This is exactly our light engine's relight() pattern applied to a power nibble.
- **B DIRTY-GRAPH**: on a place/remove, walk downstream zeroing, re-seed from boundary, flood.

| layout | cells | powered | A full recompute | B per-change | heap |
|---|---|---|---|---|---|
| chain-30 (doorbell) | 32 | 16 | 0.11ms | 0.17ms | 4.8MB |
| chain-200 (issue requirement) | 219 | 16 | 0.07ms | 0.016ms | 5.0MB |
| village 64x32, dense torches, 2.4k cells | 2366 | 2336 | **2.61ms** | 2.45ms (worst-case) | 9.3MB |

Idle cost: **0ms** — both models are event-driven (nothing ticks without a change), unlike our per-tick fluids.

## Conclusions
1. **Budget: A fits at every scale we care about.** Village-sized worst case is 2.6ms/event, well inside the
   16ms frame; the 20Hz sim budget (world.tick already spends ~10x this on relight during active digging)
   absorbs it trivially. B's theoretical win (0.016ms on chain-200) is irrelevant at these absolute numbers,
   and B's worst case (dense sources) == A. **Ship A; keep B as a documented escape hatch** (per-REGION
   re-flood: clear+reseed only cells within 15 of a change = trivial middle ground if a mega-build ever
   pushes A past ~4ms — the flood is O(powered neighborhood), so regions cap it naturally).
2. **Data model**: power = per-cell nibble like light (reuse the packed-byte trick: `redstone` byte parallel
   to `light`, or store on the cell object). NO persistence: redstone state is DERIVED from placed blocks
   (torches/dust/repeaters already live in chunks + edits) -> save v2 needs **zero changes**; on load/first
   look, run re-flood for the region (identical to queueRelight's role). This dodges the entire
   save-size/migration problem class (audit F-grades love this).
3. **Integration surface (for the sprint-05 FEATs)**: one function `CF.restone.recompute(x0,z0-region)`
   hooked into `world.set()` beside `queueRelight` (same covered-region discipline, same budget queue),
   dust/torch/repeater/lamp as registry blocks with `rs:{...}` flags; repeater DELAY (1.12: 1-4 game ticks)
   needs a small event queue (`[dueTick, cell]` list scanned in world.tick — fluids already prove this exact
   pattern with fReady). Update-order quirks (MC's sticky pistons, BUDs) explicitly OUT of scope: 1.12
   mechanics at our parity bar = torch/dust/repeater/lamp/piston-lite.
4. **Risk register**: (a) worst case grows with NEIGHBORHOOD size, not world size — a 10k-cell single
   circuit on one edit would extrapolate ~11ms/event: still one bad frame, not collapse; region-split fixes
   it if ever needed. (b) flood allocates `{x,y,z,p}` objects per visit — GC churn at village scale measured
   fine; flat typed-queue (our light engine style) available if profiling ever demands.

## Decision for sprint-05 (Tier-2 gate, MASTERPROMPT §5)
**GO**: redstone FEAT chain unblocked — proposed issues: dust+torch power (FEAT), repeater w/ delay queue
(FEAT), redstone lamp (FEAT), piston+door (FEAT, motion = animated blockstate, stretch goal), pressure
plate/button (FEAT, input glue). All small, event-driven, persistence-free.
