# Issue: 024 — Items, tools, crafting
- Type: FEAT | Status: DONE | Epic: E4 | Sprint: 02 | Depends: — | Spike: —

## Spec
Item registry (stick, coal, iron/gold_ingot, diamond, apple, sapling, tools) w/ Blender-baked icons in atlas. Crafting API (GUI later): 1.12 recipes: log->4 planks; 2 planks->4 sticks; 4 planks crafting_table; 3x3? 3 head+2 sticks tools wood/stone/iron/diamond (pickaxe/axe/shovel/sword); 8 cobble furnace; coal+stick->4 torch. Tool speeds wood2/stone4/iron6/diamond8/gold12 w/ class+tier gates per REFERENCE. Drop table per REFERENCE drop fields already in registry.

## Acceptance criteria
- [x] AC1 harness: recipe results exact (log->4 planks, stick x4, iron pickaxe pattern)
- [x] AC2 harness: stone w/ wooden pick = 1.125s vs hand 7.5s
- [x] AC3 harness: gold ore: iron pick -> gold_ingot; wood pick -> nothing
- [x] AC4 harness: furnace smelt iron_ore->iron_ingot 200t w/ coal (fuel 1600t/8 items)
- [x] AC5 qa/items sheet vision: icons readable at 16px

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
## Evidence (close)
- 13 item asserts green: planks x4 from log, stick x4, torch x4 (coal+stick), crafting_table,
  iron_pickaxe 3x3 pattern, stone-by-wood-pick 1.125s vs hand 7.5s (formula model), gold-ore tier gate
  (wood false/iron true), furnace smelt iron_ore->iron_ingot 200t w/ coal fuel 1600t, stack 64/consume,
  torch-light 14->13/10 propagation through #020 engine.
- Torch model: cross-quad renderer (first non-cube block in engine); qa/2026-09-04/torch-craft.png:
  night, carved room, placed torch w/ radial warm pool (vision PASS - hero shot).
- Icons: 26 blocky pixel-art icons rendered in Blender (atlas_sheet vision OK, readable at 16px).
- Honest not-counted: furnace/crafting_table functional:false until GUI interaction (#025).
- Bug found+fixed: cross-model code assigned to const (tris) -> whole chunk mesh silently failed;
  caught via SHOTERR title probe (new shot error surfacing in harness).
- #028 remains OPEN: wall-face torch attachment (floor-only for now).
