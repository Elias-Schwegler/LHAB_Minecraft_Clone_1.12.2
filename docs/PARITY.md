# PARITY — scoring (auto-checked by tools/parity.mjs; this doc is the human view)

Source of truth for enumeration: `docs/catalog.json` (184 entries, **399 distinct
variants**). Note: the master prompt estimated "~250 blocks"; our honest enumeration of
1.12.2 registered variants is 399. The 50% bar is therefore **≥200 functional variants**
(recording the discrepancy openly per §1.4 rather than shrinking the catalog to flatter).

"Functional" (§7): placeable + breakable w/ correct drops + Blender-textured +
1.12.2 behavior/interactions + light/collision correct. Proven by test.mjs assert +
shot.mjs PNG + vision verdict. `parity.mjs` counts a variant ONLY if the game registry
marks it `functional:true` AND `qa/blocks/<variant>.png` exists AND a texture tile is
Blender-sourced (`tools/tex` manifest). No self-declared counts.

## Block % (tiered) — live from parity.mjs (2026-09-06, re-verified; earlier table had drifted at 14)
| Tier | variants total | functional | % |
|------|---------------|-----------|---|
| 1 | 125 | 18 | 14.4% |
| 2 | 163 | 0 | 0% |
| 3 | 111 | 0 | 0% |
| **all** | **399** | **20** | **5.0%** |

Counted (evidence: qa/blocks/*.png + blender tiles + functional flag + test asserts):
stone, grass, dirt, cobblestone, planks:oak, log:oak, leaves:oak, sand, gravel, glass,
obsidian, coal/iron/gold/diamond ore (t1) = 15, + glowstone (#020, qa/blocks + light asserts),
+ torch (#024, cross-model + per-face attach asserts), + furnace (#032, ui.furn-* GUI asserts +
smelt pipeline), + water + lava (#043, items.bucket-* 7 asserts + fluids.* incl. bucket-lava glow +
fluid/bucket-demo shots; counted HONESTLY post-atlas-P1-fix: tiles were stride-overlapped until #043
regenerated the atlas - sheets re-shot on the fixed build 2026-09-07) = **20**.
(2026-09-04 audit: snow cube was 1.13-era -> snow_layer t2 unimplemented; functional flags now proof-bound
via parity.mjs; water/lava counted since #043 buckets)
Not counted though registered: bedrock (creative-only, §7 'breakable' fails), red_sand +
wood variants (no tiles), all Tier-2/3 families.

## Mechanic % (tiered checklists — flip to [x] ONLY with evidence link)
### Tier-1 (50% bar gate)
[ ] chunked infinite worldgen w/ biomes + ores + caves   <- #002 asserts+shot; streaming-unlimited pending
[x] block place/break/AABB collision                     <- #005/#006 interact asserts + walking.png
[ ] 1.9-style player physics + combat cooldown           <- #005 physics asserted; cooldown needs combat
[x] hotbar/inventory/drag-drop                           <- #025 (ui.open/drag/result/craft-collect asserts, ui-inventory.png)
[ ] crafting grid + recipe book + smelting                        <- grid/recipes/smelting #024 (items.planks/torch/table/iron-pickaxe/smelt asserts); recipe BOOK UI missing
[x] day/night + sky/block light engine                   <- #020 light + #021 cycle (time.* asserts, night shots)
[ ] gravity blocks (sand/gravel/concrete_powder)  <- sand+gravel done #013 asserts; concrete_powder pending
[x] water/lava flow + obsidian/cobblestone            <- #022 asserts (spread/caps/3 Java interactions) + #043 (1.12 delays water5/lava30, mover-resolves-contact, fluids.lava-slow, bucket round-trip, bucket-demo.png reaction ring)
[x] torches + spawn-by-light rules                         <- #024/#028 torch asserts + #035 light<=7 spawn + #039 caps(70/10)/per-chunk scheduler/despawn bands (mob.* asserts, mob-crowd.png)
[ ] hostile mobs (zombie/skeleton/creeper/spider/enderman) + passive w/ breeding   <- zombie+skeleton+creeper #035-#037 AND pig/cow/sheep (wander/breed/drop) #038 (mob.* asserts, mob-*.png); spider/enderman/other species -> #039+/#044
[x] health/hunger/fall damage                          <- #026 (surv.* asserts + hud-low.png)
[x] chests/furnaces                                        <- #032 furnace GUI (ui.furn-*), #040 chest 27-slot UI+quickmove+break-ejects (ui.chest-*), BE save/load fixed; block tiles procedural (not counted)
[x] wood→tools→mining tiers                              <- #006 tier gates + #024 (items.iron-pickaxe/speed-stone-wood asserts)
[x] TNT                                                  <- #042 craft/place/prime(flint&steel)/80t-fuse/power-4 explode/chain/blast-resist (tnt.* asserts, tnt-fuse.png); block functional:false (procedural tile, not Blender) + 3x3 craft GUI -> #045
[x] beds/sleep                                             <- #041 2-cell place/break, night window + monster-guard sleep, dawn-skip, spawn@head (bed.* asserts, bed-sleep.png); 16 colours -> #044
[x] survival + creative                                  <- #026 stats+HUD, F4 toggle (surv.* asserts)
[x] localStorage save/load                               <- #023 save.* asserts + tower-save.png roundtrip
[x] F3 debug                                             <- #009 asserts

### Tier-2 / Tier-3: see REFERENCE.md §tiers + backlog epics; parity.mjs prints live table.

Last auto-run: (parity.mjs appends automatically)
