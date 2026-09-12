# Issue: 045 — Crafting-table GUI (3x3 grid)
- Type: FIX (gap) | Status: DONE (shipped inside #059) | Epic: Containers | Sprint: 04 (backlog, picked up with #040 chest GUI work)
- Depends on: #032 (container slots DONE)

## Why
#042 registered the TNT + (partly) flint&steel 3x3 recipes, but the inventory UI only has a **2x2** hand grid
(`CF.ui.craftSize=2`). So the 5-gunpowder/4-sand TNT recipe and any true 3x3 pattern are craftable in code
(verified via `CF.tryCraft(grid,3)` in the `tnt` suite) but NOT yet reachable in survival play. The
crafting_table block is registered but its `useBlock` currently does nothing (no container BE).

## Scope
- RMB on a crafting_table opens a 3x3 grid + result slot (reuse #032 container slot plumbing + ui.js craft grid).
- Keep the 2x2 grid for the hand/inventory view (1.12 behaviour).
- Then un-hide TNT/flint-steel crafting in play; add a shot + `ui.craft3x3-*` asserts.

## Acceptance
- [x] AC1 placing a crafting_table + RMB opens 3x3; crafting TNT from gunpowder+sand in the UI works -> ui.craft3-*.
- [x] AC2 zero regression.

## Evidence (2026-09-12, shipped inside #059)
- RMB crafting_table -> CF.uiOpenWorkbench: 9-slot CF.ui.craft grid + result, 2x2 hand grid preserved (lattice
  0/1/3/4 mapped+guarded when craftSize=2). Recipe book (materials+fit filtered, click-to-fill) ships alongside -
  2x2 correctly hides 3-wide tool shapes (MC-matching). Assert `ui.book` (book fill->craft round-trip incl. a
  3-wide recipe); TNT (5 gunpowder/4 sand) fits the 3x3 and the book lists it when paid.
- Outed by this work: pre-#059 tools were NOT craftable in-game at all (2x2-only UI; items tests called
  tryCraft directly) - parity crafting row annotated honestly. 235/219 GREEN at #059 merge; ui-book.png vision PASS.
