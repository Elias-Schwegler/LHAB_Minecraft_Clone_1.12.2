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

## Block % (tiered)
| Tier | variants total | functional | % |
|------|---------------|-----------|---|
| 1 | (parity.mjs prints) | 0 | 0% |
| 2 | | 0 | 0% |
| 3 | | 0 | 0% |
| **all** | **399** | **0** | **0%** |

## Mechanic % (tiered checklists — flip to [x] ONLY with evidence link)
### Tier-1 (50% bar gate)
[ ] chunked infinite worldgen w/ biomes + ores + caves
[ ] block place/break/AABB collision
[ ] 1.9-style player physics + combat cooldown
[ ] hotbar/inventory/drag-drop
[ ] crafting grid + recipe book + smelting
[ ] day/night + sky/block light engine
[ ] gravity blocks (sand/gravel/concrete_powder)
[ ] water/lava flow + obsidian/cobblestone
[ ] torches + spawn-by-light rules
[ ] hostile mobs (zombie/skeleton/creeper/spider/enderman) + passive w/ breeding
[ ] health/hunger/fall damage
[ ] chests/furnaces
[ ] wood→tools→mining tiers
[ ] TNT
[ ] beds/sleep
[ ] survival + creative
[ ] localStorage save/load
[ ] F3 debug

### Tier-2 / Tier-3: see REFERENCE.md §tiers + backlog epics; parity.mjs prints live table.

Last auto-run: (parity.mjs appends automatically)
