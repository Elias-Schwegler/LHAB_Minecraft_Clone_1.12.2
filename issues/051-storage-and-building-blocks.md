# Issue: 051 — storage and building blocks
- Type: FEAT | Status: DONE (mossy_cobblestone cut - needs vines, see note) | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

1.12: gold_block(9 ingots <-> 1), iron_block, diamond_block, brick_block(4 brick items? NO: bricks x4 craft + clay->brick SMELT chain), mossy_cobblestone (craft w/ vine OR cobble+vines; here: recipe only + creeper-skip), lapis_block/ore deferred (needs dye).
Scope: 5 block variants + 9x3 craft recipes + 1x9 shapeless uncompact + smelting clay->brick item (clay_block EXISTS? if not add: 4 clay items drop w/ silk-skip -> standard: 4 clay per block, add clay_block drop count), bricks craft 2x2.
ACs:
- [x] parity +5 (sheets/tiles/flags)
- [x] items.storage-compact/uncompact asserts (9<->1 round trip x3)
- [x] items.brick-smelt assert (clay ball->brick, furnace pipeline reused)
- [x] vision: storage-block wall shot PASS


## Acceptance criteria

## Evidence (close 2026-09-07)
- +5 variants counted: gold_block, iron_block, diamond_block, brick_block, clay. PARITY 45 -> 50/399 (12.5%) via tool.
- asserts: registry.storage, items.storage-9x1 (9 ingots <-> 1 block, all 3 metals via RECIPES), items.smelt
  extended (clay_ball -> brick SMELT map), interact.clay-drop4 (dropN:4 honored in interact.mine).
- qa/blocks/*.png x55 (incl. 5 new sheets) + storage-wall.png vision PASS: clay/brick/diamond/iron/gold row,
  distinct tones + textures.
- CUT (honest): mossy_cobblestone deferred - 1.12 sources are vine+craft or creeper; VINES not implemented.
  Fold into a future vines/swamp issue (sprint 05 candidate).
- LESSON: drop-test blocks in interactTests run BEFORE the place/bedrock tests (anchor placement) - NEVER
  inv.fill(null) mid-suite there; assert deltas instead (clay test counts before/after).
