# Issue: 024 — Items, tools, crafting
- Type: FEAT | Status: READY | Epic: E4 | Sprint: 02 | Depends: — | Spike: —

## Spec
Item registry (stick, coal, iron/gold_ingot, diamond, apple, sapling, tools) w/ Blender-baked icons in atlas. Crafting API (GUI later): 1.12 recipes: log->4 planks; 2 planks->4 sticks; 4 planks crafting_table; 3x3? 3 head+2 sticks tools wood/stone/iron/diamond (pickaxe/axe/shovel/sword); 8 cobble furnace; coal+stick->4 torch. Tool speeds wood2/stone4/iron6/diamond8/gold12 w/ class+tier gates per REFERENCE. Drop table per REFERENCE drop fields already in registry.

## Acceptance criteria
- [ ] AC1 harness: recipe results exact (log->4 planks, stick x4, iron pickaxe pattern)
- [ ] AC2 harness: stone w/ wooden pick = 1.125s vs hand 7.5s
- [ ] AC3 harness: gold ore: iron pick -> gold_ingot; wood pick -> nothing
- [ ] AC4 harness: furnace smelt iron_ore->iron_ingot 200t w/ coal (fuel 1600t/8 items)
- [ ] AC5 qa/items sheet vision: icons readable at 16px

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
