# Issue: 022 — Water/lava flow + interactions
- Type: FEAT | Status: DONE | Epic: E6 | Sprint: 02 | Depends: #020 | Spike: SPK-3 GO

## Spec
Water/lava with level meta 0-7 (source=0, flow distance). Water: spreads 7, level+1 per step, falls reset; lava: distance 3 overworld, flows slower (every 4 ticks, random-ish). Dirty-region queue (SPK-3). RESOLVED (corrected during impl): water INTO lava SOURCE -> obsidian; water INTO flowing lava -> cobblestone; lava INTO water (any) -> stone. (Java-verified: obsidian/cobble/stone generators.) Water rendered translucent (separate blend pass, later z-sort note in AGENTS).

## Acceptance criteria
- [x] AC1 harness: source on flat ground -> exactly distance-7 spread, then stops
- [x] AC2 harness: water into lava source -> cobblestone assert
- [x] AC3 harness: 16^3 flood region tick cost < 30ms
- [ ] AC4 -> #031 (mechanics shot OK; banding visual carved) shot pool: water surface translucent, no z-fight (vision)

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
## Evidence (close - mechanics; visual carve-out #031)
- 4 fluid asserts green in gate (94 total): spread (source lv0, d4=lv4, capped at 7 - nothing at d8);
  obsidian (water directly into untouched lava source); solidify >=1 at flow-front collision;
  stone (lava into immobile lv7 water). fluidTick budget <30ms measured.
- Light propagates through liquids (attenuated) - pool floor lit, verified via readPixels probe [3,48,99].
- Shots: fluid-pool.png (flowing terraced translucent pool), fluid-lava.png (water+lava front with
  solidified stone, glowing lava) - vision PASS for mechanics; banding artifact on water surface
  (alternating dark rows, cause unresolved after 3 hypotheses) + lava tile too dark -> FIX #031.
- Honest counting: water/lava stay functional:false (not breakable w/o buckets) -> count with buckets (#031).
- Bugs fixed en route: liquid cells leaked into opaque greedy pass; liquid quad built from 2 diagonal
  corners (degenerate slivers); alpha compositing now premultiplied (blendFuncSeparate ONE,1-OSA).
