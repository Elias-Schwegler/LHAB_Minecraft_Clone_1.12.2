# SPK-7 — Nether-style dimension at scale (issue #034)
Date: 2026-09-07 · Verdict: **GO (separate world instance + hot-swap CF.world pointer)** · Time used: <1 iteration-day
Method: throwaway headless harness spike/nether-dim.cjs (worldsim pattern) + in-browser render.mesh-all label.

## Measurements (all from this session's runs)
(a) **Closure purity: PASS.** `makeWorld(seed)` instantiates twice with zero shared mutable state
    (genQueue/lightQueue/fluidQueue/chunks/dirty all per-instance; CF.IDOF etc. read-only).
    Fingerprints placed in A never appear in B and vice versa ("true/true" in spike output).
(b) **Cost: trivial.** 49 chunks gen+relight+60 ticks ≈ 50ms; 100 idle ticks ≈ 5ms with BOTH worlds alive.
    RAM: 96KB/chunk (arr+flat+light) -> ~200 loaded chunks for a nether view = ~19MB per dimension. No concern.
(c) **Swap cost = re-mesh:** renderer meshMap keys are 'cx,cz' -> collide across dimensions. `CF.renderReset()`
    exists (verified in render.js); a full re-mesh measured in-build: render.mesh-all = **1300ms for 81 chunks**
    (two-sided mesher). Dimension change therefore wants a loading moment (portal animation hides it) +
    budgeted re-mesh via renderTick (chunks come back progressively, matches worldgen-on-first-look cost).
(d) **Singleton surface:** `CF.world` is read DYNAMICALLY everywhere (no module caches a local copy):
    counts per file - interact 32, mobs 24, persist 18, items 14, render 13, player 10, bed 9, f3 9, game 7,
    tnt 5, explode/survival 2-3, harness 14. => a swap is `CF.world = wNether; CF.renderReset();` + explicit
    per-system invalidation (mobs.clear, projectiles, particles, player tp, and PERSIST: save format must gain
    a dims map - current v1 has one world + `bes` -> bump to v2 {over:{...},nether:{...}} with migration).

## Design decision (for the future Tier-2 nether FEAT, do NOT build it now)
- Two live instances: `CF.dims = { over: CF.world, nether: <makeWorld(seed^0xN)> }`; `CF.world` stays the
  active-world variable all modules already use (zero refactor!). `CF.warp(dimKey)` swaps + renderReset +
  mob/projectile wipe + player tp. Nether gen = `makeWorld(seed, genOpts)` variant flag (no skylight via a
  sky-block column, lava seas, netherrack palette) - needs a small opts hook in generate() (1-day follow-up).
- Scale 8:1 is pure coordinate math at warp time (REFERENCE 1.12: overworld x/z = nether x/z * 8).
- Beds explode / no water-placement rules = gameplay guards in interact (FEAT issue writes them).

## Risks recorded
- Portal animation must cover the 1.3s full re-mesh worst case (budgeted rebuild mitigates: only ~49 chunks
  around the player matter for first frame).
- persist v1 -> v2 migration (existing saves must load into `dims.over`).
- `render.mesh-all` asserts already prove incremental meshing is safe to restart from empty meshMap.

Shipped from this spike: ONE line - `CF.makeWorld = makeWorld;` export in world.js (game never calls it).
No FEAT may be planned against anything else; gates stayed green with the export (203/191).
