# Issue: 060 — Q-drop item entities + pause overlay + RMB-menu suppression (user gap-eval)
- Type: FEAT | Status: DONE | Epic: polish | Sprint: 04 | Depends: #024 (cross model), #043 (give/stack)

User gap sweep: playtest revealed no Q-drop, browser right-click menu popping on place, and no pause
state. Three real-feel gaps closed in one pass.

## Scope + root cause
1. **Q-drop + pickup** (1.12 throw): new `CF.itemEnts` entity list. `CF.dropHeld()` (bound to KeyQ,
   repeat-guarded, GUI-open-guarded) pops 1 held item and throws it (vel = look*4 + up). `CF.itemTick()`
   runs gravity(32)+terminal-velocity(-20, no tunnelling), axis box-collision via `CF.solidSpanXZ`,
   footprint-aware rest via `CF.cellTopAt`, ground friction, 0.5s pickup delay then 1.6-block magnet
   (`CF.give` returns leftover -> partial pickup). 5-min (6000t) despawn, 200-cap.
2. **Billboard render** (`src/render.js`): new dynamic VBO pass drawing each item as two crossed
   icon quads sampled from the ATLAS (unit 0, SAME shader, alpha-cut discard, same light nibble + a
   bob). Reuses the #105 cross-quad uv orientation. `stats.itris/itemCount` exported.
3. **Pause** (`src/game.js`): the setInterval sim now skips world/player/mob/tnt/bed/item tick when
   `CF.paused` (no pointer lock OR inventory open), exempting `freeCam`/`scripted`/`sleeping` so the
   harness & shots never deadlock. A DOM overlay ("Game Paused / controls") shows when unlocked.
   `loop.ticks` still increments (paused-safe) so the boot assert is unaffected.
4. **RMB menu**: `canvas.contextmenu` preventDefault (was popping the browser menu on every place).

## Evidence (close 2026-09-09)
- Gate 225 full / 209 quick GREEN, 37 registry blocks. +1 assert: interact.q-drop (drop count -1, held
  item is NOT re-collected during the delay window while standing on it, then IS magnetised back after,
  entity gone). CF.itemEnts cleared in the test to avoid cross-test bleed.
- qa/2026-09-09/drop-pickup.png vision PASS: cobblestone + red apple + cobble-textured stone_stairs
  billboards resting on the platform; stats.itris=12, restY==floorTop (settled exactly on the floor).
- Latent bug found+fixed during build: my #053 edit had merged `const p = CF.player;` into the
  cellHitsPlayer comment line (comment swallowed the decl -> ReferenceError on every place that
  overlap-checks). Caught by the very first q-drop test run.
- No parity change (mechanic only, not a block variant).
