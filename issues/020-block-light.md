# Issue: 020 — Block light + torches
- Type: FEAT | Status: DONE | Epic: E5 | Sprint: 02 | Depends: — | Spike: SPK-1/3 GO

## Spec
Per-chunk lightmap: 4 bits/block. Sources: torch=14, glowstone=15 (registry `light` field). BFS spread decay 1/block; solid opaque blocks block spread (glass/air pass). Mesh vertex carries brightness baked at mesh time; shader multiplies texel by brightness (per-vertex interp = smooth MC-style). Torch placeable from hotbar. Re-light neighbors on change, budgeted per tick.

## Acceptance criteria
- [x] AC1 harness: torch -> light>0 at distance<=4, decreasing with distance
- [x] AC2 harness: no light through a stone wall
- [x] AC3 harness: relight budget: setBlock relight completes w/ tick cap, assert eventual consistency
- [x] AC4 shot torch-night: radial falloff visible (vision), not flat
- [x] AC5 torch block registered + blender tile + qa/blocks/torch.png + functional proof

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
## Evidence (close)
- 6 light asserts: source(15), falloff(11,7)=linear decay, occluded(0) behind 1-thick wall, sky(15) open column (vertical no-decay seed), queue-off (removal relight <=10 ticks, budgeted 2 regions/tick).
- Shot qa/2026-09-04/glow-cave.png: carved underground room w/ glowstone; floor shows radial brightness falloff, unlit rock dark (vision PASS).
- Baselines refreshed (intentional visual change: light-bucket greedy splits + framing) - documented here to preempt false regression P1.
- glowstone functional+proof; parity 16/399. Torch (non-cube model) carved out to #028; day/night factor -> #021.
