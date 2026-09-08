# Issue: 105 — torch cross quad: upside-down, near-black, wrong chunk (user report)
- Type: FIX | Status: DONE | Epic: user report | Sprint: 04 | Depends: -

User (playing build @ #052): "torches render upside down". Three distinct defects hid behind one symptom.

## Root causes (all fixed)
1. `src/render.js` cross pass (torch/sapling, since #024): vertex positions used CHUNK-LOCAL x,z while
   the renderer applies no per-chunk model matrix (greedy path adds off[] via coord(); box path builds
   absolute). Torches outside chunk (0,0) drew near world origin - invisible/misplaced everywhere else.
   -> positions now absolute (wx/wz).
2. `src/world.js` relight sky-column seed: ANY non-liquid id killed the sky column AND OVERWROTE its
   cell with the raw emitter value (`c.light = lv`). Torch cell = 14 not (15<<4)|14 -> cross quad
   br = 14/255 = 0.055 -> torch renders near-BLACK (this is why night-mobs shots never really showed
   a glowing torch flame - the br formula predates packed-sky storage).
   -> non-solid blocks (cross/single-slab) no longer stop skylight; emission ORs with the sky nibble.
3. UV orientation verified correct as of this fix (flame at PNG-top -> quad-top); pixel arbiter assert
   added: interact.torch-up (reads flame-yellow upper vs stick-brown lower through real GL frame).

## Evidence (close 2026-09-08)
- Gate 218 full / 202 quick GREEN 0 errors.
- qa/2026-09-08/torch-probe.png vision PASS: torch at correct world pos, flame up, stick down, walls lit.
- interact.torch-up + render.face-lit asserts are the permanent pixel arbiters.
- Follow-ups -> #048: torch flame tile is chunky numpy-bake vs 1.12 16px art.
