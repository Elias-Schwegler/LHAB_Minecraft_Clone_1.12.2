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

## Block % (tiered) — live from parity.mjs (2026-09-04)
| Tier | variants total | functional | % |
|------|---------------|-----------|---|
| 1 | 125 | 14 | 11.2% |
| 2 | 163 | 0 | 0% |
| 3 | 111 | 0 | 0% |
| **all** | **399** | **14** | **3.5%** |

Counted (evidence: qa/blocks/*.png + blender tiles + functional flag + test asserts):
stone, grass, dirt, cobblestone, planks:oak, log:oak, leaves:oak, sand, gravel, glass,
obsidian, coal/iron/gold/diamond ore (t1). (2026-09-04 audit: snow cube was 1.13-era -> snow_layer t2 unimplemented; leaves de-counted pending #019; functional flags now proof-bound via parity.mjs)
Not counted though registered: bedrock (creative-only, §7 'breakable' fails), red_sand +
wood variants (no tiles), all Tier-2/3 families.

## Mechanic % (tiered checklists — flip to [x] ONLY with evidence link)
### Tier-1 (50% bar gate)
[ ] chunked infinite worldgen w/ biomes + ores + caves   <- #002 asserts+shot; streaming-unlimited pending
[x] block place/break/AABB collision                     <- #005/#006 interact asserts + walking.png
[ ] 1.9-style player physics + combat cooldown           <- #005 physics asserted; cooldown needs combat
[ ] hotbar/inventory/drag-drop                           <- hotbar select only (#006)
[ ] crafting grid + recipe book + smelting
[ ] day/night + sky/block light engine                   <- block+sky light DONE #020; day/night factor pending #021
[ ] gravity blocks (sand/gravel/concrete_powder)  <- sand+gravel done #013 asserts; concrete_powder pending
[ ] water/lava flow + obsidian/cobblestone
[ ] torches + spawn-by-light rules
[ ] hostile mobs (zombie/skeleton/creeper/spider/enderman) + passive w/ breeding
[ ] health/hunger/fall damage
[ ] chests/furnaces
[ ] wood→tools→mining tiers                              <- tier GATES done (#006); items/tools pending
[ ] TNT
[ ] beds/sleep
[ ] survival + creative
[x] localStorage save/load                               <- #023 save.* asserts + tower-save.png roundtrip
[x] F3 debug                                             <- #009 asserts

### Tier-2 / Tier-3: see REFERENCE.md §tiers + backlog epics; parity.mjs prints live table.

Last auto-run: (parity.mjs appends automatically)
