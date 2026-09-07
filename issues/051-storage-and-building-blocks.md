# Issue: 051 — storage and building blocks
- Type: FEAT | Status: READY | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

1.12: gold_block(9 ingots <-> 1), iron_block, diamond_block, brick_block(4 brick items? NO: bricks x4 craft + clay->brick SMELT chain), mossy_cobblestone (craft w/ vine OR cobble+vines; here: recipe only + creeper-skip), lapis_block/ore deferred (needs dye).
Scope: 5 block variants + 9x3 craft recipes + 1x9 shapeless uncompact + smelting clay->brick item (clay_block EXISTS? if not add: 4 clay items drop w/ silk-skip -> standard: 4 clay per block, add clay_block drop count), bricks craft 2x2.
ACs:
- [ ] parity +5 (sheets/tiles/flags)
- [ ] items.storage-compact/uncompact asserts (9<->1 round trip x3)
- [ ] items.brick-smelt assert (clay ball->brick, furnace pipeline reused)
- [ ] vision: storage-block wall shot PASS


## Acceptance criteria
