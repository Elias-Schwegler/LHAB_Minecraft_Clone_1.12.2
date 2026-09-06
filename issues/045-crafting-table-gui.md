# Issue: 045 — Crafting-table GUI (3x3 grid)
- Type: FIX (gap) | Status: DRAFT | Epic: Containers | Sprint: — (backlog, picked up with #040 chest GUI work)
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
- [ ] AC1 placing a crafting_table + RMB opens 3x3; crafting TNT from gunpowder+sand in the UI works -> ui.craft3-*.
- [ ] AC2 zero regression.
