# Issue: 049 — wood variants birch jungle
- Type: FEAT | Status: READY | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Depends: #007 asset pipeline. 1.12: birch(j)/jungle logs have PALE bark (jungle darker w/ side streaks), planks tinted, leaves colored; sapling item drops exist already for oak only (oak sapling #019).
Scope: gen.py parameterized palette (log_side/planks/leaves x birch/jungle) + 8 registry variants (log:birch/jungle, planks:birch/jungle, leaves:birch/jungle) + sapling items + SAPLING GROWTH v1: place on dirt/grass, randomTick -> 4x4 oak-style tree of that species (bone-meal later).
ACs:
- [ ] 4 new block NAMES registered variants counted: parity +8 via tool (sheets + blender tiles)
- [ ] interact.sapling-grow assert (randomTick budget loop -> log appears)
- [ ] starter-world or tree-birch shot vision PASS


## Acceptance criteria
