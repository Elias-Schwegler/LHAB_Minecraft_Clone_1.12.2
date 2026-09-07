# Issue: 046 — Only 3 of 6 block faces are meshed (greedy mesher emits +axis faces only)
- Type: FIX (P1-class: rendering correctness) | Status: DONE | Epic: Renderer | Sprint: 03
- Depends on: #003 | Reported by: user (2026-09-06, gameplay screenshot: log missing bark/rings on 3 sides)

## Symptom / root cause
Greedy mesher per axis builds the mask with `cur=solid at A`, `B=A+axis`, `if W.get(B) continue` and emits
the quad at plane d+1 -> ONLY faces toward +X/+Y/+Z are ever created. The -X/-Y/-Z faces of every block are
NEVER meshed. Seen as: (a) log/tree shows bark on 3 sides only, (b) WATER BANDING of #031 — the "alternating
dark rows" are the gaps between lowered top quads where the missing -side faces would have closed the volume
(visible on grass in user's photo too). depthMask experiments in #043 did not fix it (correctly - not the cause).

## Fix
Per axis run TWO mask passes: sign=+1 (as today: +a neighbour air, plane d+1, tiles[a*2]); sign=-1
(-a neighbour air, plane d, tiles[a*2+1], mirrored UV du->w-du, darker shade: sides 0.7x axis base, bottom 0.45).
Same merge buckets (per sign, key still id|light>>2). Liquid pass: same both-sided side faces so the water box
closes (NO -Y bottom: z-fights the floor and is invisible underwater - MC skips it too).

Bugs FOUND by the new deterministic back-face test (fixed here, same root class = "physics/geometry truth"):
- Landing-snap RATCHET: `ny = floor(y-HH)+1+HH` used the PRE-MOVE y - once the penetrated position passed
  the rest point, each falling tick snapped +1 block higher (mobs floated above platforms; player = the
  up/down "bounce" the user reported in #047; correct source = penetrated `ny`, plus push-up loop `while
  boxHits: ny+=1` because fast falls penetrate several cells at once). Player AND mob physics.
- `y = Math.round((y-HH)*1000)/1000` "hop-noise snap" overwrote CENTER y with FEET y -> player half-buried,
  horizontal sweeps always colliding (player.move 0.0). Removed (with a correct snap it is pure noise).
- Test/shot hygiene: mesh budget is 2 chunks/renderTick and set()-floods + relight re-fill W.dirty for a long
  time - fixed renderTick counts RACE it. Rule: `while (W.dirty.size) renderTick()` drain before pixel reads
  (render.face-back, mob.px-draw, faces-corner scenario).

## Acceptance criteria
- [x] AC1: shot qa/2026-09-07/faces-corner.png: camera at the -X/-Z corner of an isolated log on a platform -
      bark sides + platform edge skirt now VISIBLE (were holes). Vision PASS.
- [x] AC2: fluid-pool banding: side faces close the water box (needed for #031). Full closure needs the
      #043 depthMask+tile-repaint too -> verified PASS there (qa/2026-09-07/fluid-pool.png).
- [x] AC3: TEST GREEN 193 full / 182 quick, 0 errors; render.mesh-all + glErr asserts green; NEW
      render.face-back assert (delta 53>40 px between log-present/absent from the back corner - impossible
      with +axis-only meshing); mob.px-draw made deterministic (drain + capture-empty-first).
- [x] AC4: starter-world.png re-shoot: trees solid from all sides, no see-through gaps. Vision PASS.
      Parity unchanged (tiles already existed; no registry edits).
- [x] AC5 (bonus): mob-px.png - the px-draw scenario as a visible shot: zombie STANDS on the sky platform
      (was floating 2 blocks up). Vision PASS. Head/torso box gap = cosmetic, logged to #044.

## Evidence
- Branch feature/046-missing-faces -> merge on main (--no-ff), 2026-09-07.
- src/render.js buildMesh both-sign loops + plane/UV-mirror/shade; liquid both-side faces; face-back test.
- src/player.js + src/mobs.js landing snap + push-up; mobs px-draw platform recipe; harness drain+faces-corner.
- Wall-clock note: two-sided meshing ~2x buildMesh cost -> --quick gate 144s wall (was ~50s); test.mjs
  safety kill raised to 240s for all specs. Mesher perf (single-pass two-sign masks, CH trimming) -> #044.
- #031: banding root-cause = half-empty Blender water tile (rows 8-15 alpha~0) + missing side faces +
  depthMask(false) double-blend. Faces here; tile repaint + depthMask stay in #043 (together verified PASS).
