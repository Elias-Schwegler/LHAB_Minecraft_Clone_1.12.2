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

## Block % (tiered) — live from parity.mjs (2026-09-08 #053 close; was stale at 29 through sprint-04, brought current)
| Tier | variants total | functional | % |
|------|---------------|-----------|---|
| 1 | 125 | 43 | 34.4% |
| 2 | 163 | 13 | 8.0% |
| 3 | 111 | 0 | 0% |
| **all** | **399** | **56** | **14.0%** |

Sprint-04 additions on the #043 baseline (20): wood II (#049 +9), wool (#050 +16), storage/brick/clay
(#051 +5, mossy deferred->vines), slabs (#052 +3), stairs (#053 +3: oak 53 / stone_stairs=COBBLE 67 /
brick 108; registry.stairs-model + physics.stairs-walkup + interact.stairs-facing + items.stairs-craft +
save.flat asserts; qa/blocks/*_stairs.png + stair-run vision PASS). Table had been left stale at 29.

Counted (evidence: qa/blocks/*.png + blender tiles + functional flag + test asserts):
stone, grass, dirt, cobblestone, planks:oak, log:oak, leaves:oak, sand, gravel, glass,
obsidian, coal/iron/gold/diamond ore (t1) = 15, + glowstone (#020, qa/blocks + light asserts),
+ torch (#024, cross-model + per-face attach asserts), + furnace (#032, ui.furn-* GUI asserts +
smelt pipeline), + water + lava (#043, items.bucket-* 7 asserts + fluids.* incl. bucket-lava glow +
wood-species II (#049: planks/log/leaves birch+jungle + saplings oak/birch/jungle x3,
registry.species-variants + grass.sapling-grow-* + interact.drop-birch + world.leaves-decay-all, atlas GRID=12 regen: species tiles blender-baked)
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
[x] 1.9-style player physics + combat cooldown           <- #005 physics asserts + #036 charge-meter combat w/ per-tool cooldown (items.*+mob.* asserts: mob.cdm-* window tests, starter combat shots)
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
[x] farming v1: hoe(4 mats) till grass/dirt -> farmland(+trample revert), wheat 8-stage randomTick growth on
    farmland, harvest 1-3 grain + seeds, bread (3->1, +5 food), carrot/potato 2-4 drops  <- #054
    (items.hoe-craft/bread-craft, world.crop-grow, interact.till/harvest, physics.farmland-trample, surv.bread
    asserts + farm-scene.png vision PASS). Crop/farmland blocks functional:false (procedural tiles; Blender
    art -> #048). poisonous_potato + hydration/neighbor boost deferred.

Last auto-run: 2026-09-08 (56/399 at #053 close) - parity.mjs writes qa/parity-latest.json; this doc's table is updated MANUALLY at each merge (audit #6 F5)
