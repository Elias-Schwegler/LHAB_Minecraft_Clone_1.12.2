# Issue: 020 — Block light + torches
- Type: FEAT | Status: READY | Epic: E5 | Sprint: 02 | Depends: — | Spike: SPK-1/3 GO

## Spec
Per-chunk lightmap: 4 bits/block. Sources: torch=14, glowstone=15 (registry `light` field). BFS spread decay 1/block; solid opaque blocks block spread (glass/air pass). Mesh vertex carries brightness baked at mesh time; shader multiplies texel by brightness (per-vertex interp = smooth MC-style). Torch placeable from hotbar. Re-light neighbors on change, budgeted per tick.

## Acceptance criteria
- [ ] AC1 harness: torch -> light>0 at distance<=4, decreasing with distance
- [ ] AC2 harness: no light through a stone wall
- [ ] AC3 harness: relight budget: setBlock relight completes w/ tick cap, assert eventual consistency
- [ ] AC4 shot torch-night: radial falloff visible (vision), not flat
- [ ] AC5 torch block registered + blender tile + qa/blocks/torch.png + functional proof

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
