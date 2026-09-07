# Issue: 049 — wood variants birch jungle
- Type: FEAT | Status: DONE | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Depends: #007 asset pipeline. 1.12: birch(j)/jungle logs have PALE bark (jungle darker w/ side streaks), planks tinted, leaves colored; sapling item drops exist already for oak only (oak sapling #019).
Scope: gen.py parameterized palette (log_side/planks/leaves x birch/jungle) + 8 registry variants (log:birch/jungle, planks:birch/jungle, leaves:birch/jungle) + sapling items + SAPLING GROWTH v1: place on dirt/grass, randomTick -> 4x4 oak-style tree of that species (bone-meal later).
ACs:
- [x] 4 new block NAMES registered variants counted: parity +8 via tool (sheets + blender tiles)
- [x] grass.sapling-grow assert (randomTick budget loop -> log appears)
- [x] bucket-demo or tree-birch shot vision PASS


## Acceptance criteria

## Evidence (close 2026-09-07)
- +9 countable variants via tool: planks/log/leaves {birch,jungle} (6, t1) + sapling {oak,birch,jungle} (3, t2). PARITY 20 -> 29/399 (7.3%).
  (issue estimated +8 - honestly +9, sapling blocks count in catalog t2.)
- gen.py: species palette builders + GRID 8->12 (192px atlas; 61 tiles, zero manifest collisions) + icon pass
  switched to numpy pixel-composite (Cycles icon renders flattened ALPHA -> torch/sapling black boxes).
- NEW asserts x7: registry.species-variants, grass.sapling-grow-{oak,birch,jungle} (deterministic
  world.growSapling API, also future bone-meal hook), world.leaves-decay-all, items.bucket-*, interact.drop-birch.
  Gate 209 full / 193 quick GREEN 0 errors.
- BUGS FOUND & FIXED en route (user-visible): (1) liquid+torch UVs NaN via const-A shadowing (atlas resize
  exposed it - green-black water since #043!!) -> ASZ rename; (2) torch cross texture FLIPPED since #024;
  (3) floor faces under crosses culled -> black holes -> solidness-aware culling; (4) water tile alpha
  flattened by Cycles -> runtime restore (45,106,191 a=170) + glass hollow.
- Shots (vision PASS): qa/blocks/*.png x34 incl. log-birch (white bark!), sapling-*; bucket-demo.png
  (translucent blue pool + obsidian reaction + birch trunks horizon); torch-check2.png (flame up, no hole).
- Follow-ups -> #048: water/glass alpha restore should move back into gen.py properly; sapling sprites
  simplified vs 1.12; birch/jungle leaves tint tuning.
