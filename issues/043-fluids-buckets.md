# Issue: 043 — Fluids polish: buckets, lava flow delay, water/lava parity + the atlas P1 found en route
- Type: FEAT+FIX | Status: DONE | Epic: E6 fluids | Sprint: 03 | Depends: #022, #046
- Closes: #031 (banding+brightness+buckets) — the last carried sprint-02 FIX.

## Scope (from tracker: "lava flow speed per spec + water banding (#031) + buckets")
1. 1.12 buckets: craft (3 iron V), stack 1, fetch liquid SOURCES only, place as new source, refuse into self.
2. Per-liquid spread delay: water 5t, lava 30t per level (1.12 block ticks) + mover-resolves-contact rule
   (placed fluid reacts immediately at set(): water->source=obsidian, water->flow=cobble, lava->water=stone;
   static max-level cells no longer preempt - fixes two #022-era order-of-events test accidents).
3. Lava block light seeding: relight SKIPPED liquids entirely -> lava glowed 0 (bucket-lava exposed it).
4. Skylight 15 never decays (#031 banding root cause #1, shipped in #046).
5. Live-painted atlas for UI icons (--cfatlas CSS var swapped after render.js paints) - hotbar icons now
   match GL (they read the pre-paint embedded PNG before).

## THE P1 FOUND ALONG THE WAY (audit-grade, shipped in this merge)
tools/tex/gen.py icon placer baked item icons at `(idx // GRID) * GRID` (8px stride) instead of `* SIZE`
(16px): every item icon row overlapped block tiles -> furnace/glass/glowstone/obsidian/crafting_table/leaves
bottom halves + all item icons wrong SINCE SPRINT 02 (#007). The game additionally stomped (32..112,48) +
(0..32,64) cells with procedural paints that it believed were free but were item-icon cells.
Fix: gen.py stride corrected + atlas regenerated (Blender, TEXGEN_OK 50 tiles, zero collisions verified) +
procedural paints moved to truly-free cells y=96/112 + water/lava runtime REPAINTS DELETED (real Blender
tiles now correct). Old "half-empty water tile" = this bug, not the camera plane.
Fidelity leftovers (furnace opening, crafting grid, glass frame, glowstone spots, water hue, clean-sheet
scenario for fluids) -> #048 (new issue).

## Acceptance criteria
- [x] AC1 buckets: items.bucket-craft/fill/no-flow/place/lava/stack1/self-place asserts (7) green.
- [x] AC2 lava delay: fluids.lava-slow (0 spread @20t, spread @65t) + fluids.spread water front reached d4
      within budget -> 1.12 contrast visible in shot bucket-demo.png (lava stayed, water gushed).
- [x] AC3 water/lava functional:true, proof-bound to fluids.*+items.bucket-* literals;
      PARITY 18/399 -> 20/399 (5.0%) via tools/parity.mjs; qa/blocks/water.png + lava.png regenerated.
- [x] AC4 (#031): banding = 3 stacked causes (missing side faces #046 + half-stride atlas + depthMask);
      fluid-pool.png now uniform (vision PASS, re-shot on final build).
- [x] AC5 lava glows: lightAt(adjacent)>=14 assert + bucket-demo cobble-ring shot (reaction visible).
- [x] AC6 full gate: TEST GREEN 203 full / 191 quick, 0 errors; relight perf ~180ms->~6ms
      (useful-reroll now O(1) array-read coverage rule; see PLAYBOOK).

## Evidence
- Branch feature/043-fluids-buckets (parts A+B) -> merge --no-ff 2026-09-07.
- qa/2026-09-07/bucket-demo.png (buckets in hotbar, pools, cobble reaction ring, green trees), fluid-pool.png,
  fluid-lava.png, starter-world.png + all 25 qa/blocks sheets re-shot on the fixed atlas - vision PASS.
- Headless reproduction harness: spike/worldsim.cjs + spike/lightprof.cjs (node-side world sim + relight
  phase timing - pattern worth reusing; symptom "browser shot hangs" == sync CPU loop, not deadlock).
