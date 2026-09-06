# Issue: 040 — Chest block + 27-slot container UI (+ BE persistence!)
- Type: FEAT | Status: DONE | Epic: docs/backlog/epics.md (Containers) | Sprint: 03
- Depends on: #032 (container slot plumbing DONE) | Time-box: 1d

## 1.12.2 Reference spec
- Chest: id 54, hardness 2.5, axe, drops itself. RMB opens a 27-slot container; items move via click
  pick/place/merge/swap (same rules as inventory); Shift-click quickmoves chest<->inventory both ways;
  breaking the chest ejects ALL contents to the player (no item entities Tier-1 -> direct give, documented).
- Block entities must survive save/load (chests + furnaces).
- Deviations: no chest facing (front texture on all sides; MC rotates via metadata) -> #044; no LID-OPEN
  animation/sound; double-chest merging not implemented; procedural tile => NOT parity-counted (honest).

## Acceptance criteria
- [x] AC1 RMB chest opens 27-slot grid (furnace panel hidden); click store/merge/take -> ui.chest-open/store/take
- [x] AC2 shift-click quickmove both directions -> ui.chest-quickmove
- [x] AC3 chest + contents survive save->grief->load roundtrip; orphaned BEs dropped -> ui.chest-persist(+orphan)
- [x] AC4 breaking returns all contents -> ui.chest-break
- [x] AC5 FURNACE contents also persist now (latent bug pre-#040: BEs were never saved at all - fixed by bes field)
- [x] AC6 shot ui-chest.png: chest panel with items, no magenta -> vision below
- [x] AC7 zero regression: full 175 -> 182 green (+7), parity stays 18/399 (chest listed uncounted - honest)

## Evidence (closed 2026-09-06)
- Gate: full **182/182 GREEN** (+7 ui.chest-*), 0 errors; parity **18/399** (chest functional:false, procedural
  tile - parity tool explicitly reports "registered but not counted").
- registry.js: chest id 54 (procedural tiles chest_side/chest_top registered in __TEXMETA at load in items.js;
  drawn into FREE atlas cells (64,48)/(80,48) in render init -> existing tiles/UVs untouched).
- items.js: chestPlace/chestBreak/containerBreak. ui.js: 'cs' slot kind in slotGet/Set/place, chest quickmove
  (both directions, checked BEFORE generic inv quickmove - caught by test), 27-slot panel, per-type panel gates
  (furnace-only fields no longer render for chests). interact.js: place->chestPlace, break->chestBreak.
- **persist.js latent bug fixed**: save never included CF.blockEntities -> furnace/chest contents were LOST on
  every reload (#032 shipped BEs without wiring them into save v1). Added `bes` to the save (backward
  compatible: old saves -> {}), restored on load with orphan filtering (block must still be the container).
- Test-logic bugs caught by red runs (honest): (1) my test flow placed dirt OVER cobble expecting a merge
  (correct engine behaviour = swap; test fixed); (2) chest quickmove branch sat AFTER the generic inv
  quickmove branch which swallowed the click first (reordered).
- Shot qa/2026-09-06/ui-chest.png VISION PASS: labelled "Chest" panel, 27-slot grid with cobble42/dirt17/
  coal5/iron3/log8 rendered w/ correct icons+counts, Main shows apple4, furnace panel hidden, chest block
  visible in-world right, hotbar/inventory intact, no magenta.
- Follow-ups -> #044: chest facing (metadata rotation), lid-open anim, double chests, item entities for drops.
