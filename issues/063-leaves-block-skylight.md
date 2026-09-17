# Issue: 063 — leaves fully block skylight: pitch-black tree shade + noon zombie farms
- Type: FIX (P1, found by VIDEO-QA #062) | Status: DONE | Epic: Quality | Sprint: 05 | Depends: #062

Video frames f00/f01/f05/f06 (qa/videos/2026-09-17/basic) showed huge black regions: entire ground under tree
canopies rendered black. Root cause: relight() + BFS both gate on CF.cellOpaque, which returned true for leaves
-> sky column zeroed under canopy. 1.12: leaves have light OPACITY 0 (skylight passes at full 15). Secondary
impact (worse than visual): hostile spawn rule needs light<=7 -> zombies/pigmen spawned UNDER TREES AT NOON
(video f05 shows a mob at a tree base in full day).

## Fix
- registry.js cellOpaque: `if (v.name === 'leaves') return false;` (single choke point - both light paths +
  any consumer now agree; mesher face-culling unaffected in practice: leaves vs air still draws, leaves vs
  solid culls like glass-glass already does).
- Assert light.leaves-pass-sky (world.js lightTests): own makeWorld instance (randomTick-stream independence
  per #061 lesson), synthetic 5x5 canopy + 2-tall trunk: ground-under-canopy sky=15, leaf cell=15,
  BELOW-TRUNK=0 (log legitimately opaque), cellOpaque(leaves)=false.
- Side effects checked: passive spawn (sky>=9) works under trees again; mob burn check uses skyNibble*day ->
  correct; grass-spread skyAccess untouched (it tests blocks, not light - matches MC random-tick spread OK).

## Acceptance
- [x] assert green (242/0 full, 226/0 quick)
- [x] re-recorded video #2: canopies lit at noon - frames reviewed below

## Evidence (2026-09-17)
Video recording #2 review (post-fix): all 16 frames show lit ground under every canopy; noon passive herds
(pigs/sheep) visible on grass = spawn rule healthy; night zombie fight + damage exchange correct.
VERDICT PASS (see #062 Evidence for per-frame log). Before/after: recording #1 f00 black wedge vs #2 f00 green.
